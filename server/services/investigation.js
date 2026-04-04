import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { relationalRowToParsed } from '../db/mapIncumbentProfile.js';
import { pool } from '../db/pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {Record<string, string> | null} */
let brandAliasesCache = null;

function loadBrandAliases() {
  if (brandAliasesCache) return brandAliasesCache;
  try {
    const p = join(__dirname, '../db/brand_aliases.json');
    brandAliasesCache = JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    brandAliasesCache = {};
  }
  return brandAliasesCache;
}

const client = new Anthropic();

const MODEL = process.env.ANTHROPIC_INVESTIGATION_MODEL || 'claude-sonnet-4-6';

export function brandSlug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Maps vision/OCR brand strings to incumbent_profiles.brand_slug via server/db/brand_aliases.json.
 * Tries `brandName` first, then `corporateParent`.
 */
export function resolveIncumbentSlug(brandName, corporateParent) {
  const map = loadBrandAliases();
  const apply = (raw) => {
    if (raw == null || raw === '') return null;
    const s = brandSlug(raw);
    return map[s] || null;
  };
  return apply(brandName) || apply(corporateParent) || brandSlug(brandName || corporateParent);
}

function extractText(message) {
  const parts = [];
  for (const block of message.content || []) {
    if (block.type === 'text' && block.text) parts.push(block.text);
  }
  return parts.join('\n').trim();
}

function collectCitationUrls(message) {
  const urls = [];
  for (const block of message.content || []) {
    if (block.type === 'text' && Array.isArray(block.citations)) {
      for (const c of block.citations) {
        if (c?.url) urls.push(c.url);
      }
    }
  }
  return [...new Set(urls)];
}

function parseInvestigationJson(text) {
  const trimmed = text?.trim?.() || '';
  let slice = trimmed;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) slice = fence[1].trim();
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

function mergeSourcesWithCitations(parsed, citationUrls) {
  if (!parsed || !citationUrls.length) return;
  const buckets = ['tax', 'legal', 'labor', 'environmental', 'political', 'product_health', 'executive'];
  for (const b of buckets) {
    const key = `${b}_sources`;
    if (!Array.isArray(parsed[key])) parsed[key] = [];
    const before = parsed[key].length;
    if (before < 2) {
      parsed[key].push(...citationUrls.slice(0, Math.max(0, 3 - before)));
      parsed[key] = [...new Set(parsed[key])];
    }
  }
}

const CONCERN_LEVELS = new Set(['significant', 'moderate', 'minor', 'clean', 'unknown']);

function normalizeInvestigation(parsed, brandName, corporateParent, healthFlag) {
  const brand = typeof parsed?.brand === 'string' ? parsed.brand : brandName || 'Unknown';
  const parent =
    parsed?.parent === undefined || parsed?.parent === ''
      ? corporateParent || null
      : parsed.parent;

  const emptyArr = () => [];
  const overall = CONCERN_LEVELS.has(parsed?.overall_concern_level)
    ? parsed.overall_concern_level
    : 'unknown';

  let timeline = Array.isArray(parsed?.timeline)
    ? parsed.timeline
        .filter((e) => e && Number.isInteger(e.year))
        .map((e) => ({
          year: e.year,
          month: e.month != null && Number.isInteger(e.month) ? e.month : null,
          event: typeof e.event === 'string' ? e.event : '',
          category: typeof e.category === 'string' ? e.category : '',
          severity: typeof e.severity === 'string' ? e.severity : 'moderate',
          source_url: typeof e.source_url === 'string' ? e.source_url : '',
        }))
        .sort((a, b) => a.year - b.year || (a.month || 0) - (b.month || 0))
    : [];

  const inv = {
    brand,
    parent: parent ?? null,
    subsidiaries: Array.isArray(parsed?.subsidiaries) ? parsed.subsidiaries.map(String) : emptyArr(),
    timeline,

    tax_summary: parsed?.tax_summary ?? null,
    tax_flags: Array.isArray(parsed?.tax_flags) ? parsed.tax_flags.map(String) : emptyArr(),
    tax_sources: Array.isArray(parsed?.tax_sources) ? parsed.tax_sources.map(String) : emptyArr(),

    legal_summary: parsed?.legal_summary ?? null,
    legal_flags: Array.isArray(parsed?.legal_flags) ? parsed.legal_flags.map(String) : emptyArr(),
    legal_sources: Array.isArray(parsed?.legal_sources) ? parsed.legal_sources.map(String) : emptyArr(),

    labor_summary: parsed?.labor_summary ?? null,
    labor_flags: Array.isArray(parsed?.labor_flags) ? parsed.labor_flags.map(String) : emptyArr(),
    labor_sources: Array.isArray(parsed?.labor_sources) ? parsed.labor_sources.map(String) : emptyArr(),

    environmental_summary: parsed?.environmental_summary ?? null,
    environmental_flags: Array.isArray(parsed?.environmental_flags)
      ? parsed.environmental_flags.map(String)
      : emptyArr(),
    environmental_sources: Array.isArray(parsed?.environmental_sources)
      ? parsed.environmental_sources.map(String)
      : emptyArr(),

    political_summary: parsed?.political_summary ?? null,
    political_sources: Array.isArray(parsed?.political_sources)
      ? parsed.political_sources.map(String)
      : emptyArr(),

    product_health: healthFlag
      ? parsed?.product_health != null && parsed.product_health !== ''
        ? String(parsed.product_health)
        : null
      : null,
    product_health_sources: Array.isArray(parsed?.product_health_sources)
      ? parsed.product_health_sources.map(String)
      : emptyArr(),

    executive_summary: parsed?.executive_summary ?? null,
    executive_sources: Array.isArray(parsed?.executive_sources)
      ? parsed.executive_sources.map(String)
      : emptyArr(),

    overall_concern_level: overall,
    verdict_tags: Array.isArray(parsed?.verdict_tags) ? parsed.verdict_tags.map(String) : emptyArr(),
    clean_card: Boolean(parsed?.clean_card),
  };

  if (!healthFlag) {
    inv.product_health = null;
    inv.product_health_sources = [];
  }

  return inv;
}

function deriveConcernFlags(inv) {
  const out = new Set();
  (inv.verdict_tags || []).forEach((t) => out.add(String(t)));
  for (const k of ['tax_flags', 'legal_flags', 'labor_flags', 'environmental_flags']) {
    (inv[k] || []).forEach((t) => out.add(String(t)));
  }
  return [...out];
}

function finalizeInvestigation(inv, profileType) {
  return {
    ...inv,
    concern_flags: deriveConcernFlags(inv),
    profile_type: profileType,
    last_updated: new Date().toISOString().slice(0, 10),
  };
}

export function buildLimited(brandName, corporateParent, healthFlag) {
  const inv = normalizeInvestigation(
    {
      brand: brandName || 'Unknown',
      parent: corporateParent,
      overall_concern_level: 'unknown',
      verdict_tags: [],
      product_health: healthFlag ? 'No structured investigation available yet for this item.' : null,
      product_health_sources: [],
    },
    brandName,
    corporateParent,
    healthFlag
  );
  return finalizeInvestigation(inv, 'limited');
}

function buildResearchPrompt(brandName, corporateParent, healthFlag) {
  const query = `${brandName || ''} ${corporateParent || ''} legal violations lawsuit settlement tax OSHA EPA lobbying political donations`
    .trim()
    .replace(/\s+/g, ' ');

  return `You are a neutral research assistant. Use web search when available to verify the public record.

Company / brand: ${brandName || 'unknown'}
Corporate parent: ${corporateParent || 'unknown'}

Prioritize queries like: ${query}

Return ONLY valid JSON (no markdown). Shape:
{
  "brand": string,
  "parent": string | null,
  "subsidiaries": string[],
  "tax_summary": string | null,
  "tax_flags": string[],
  "tax_sources": string[],
  "legal_summary": string | null,
  "legal_flags": string[],
  "legal_sources": string[],
  "labor_summary": string | null,
  "labor_flags": string[],
  "labor_sources": string[],
  "environmental_summary": string | null,
  "environmental_flags": string[],
  "environmental_sources": string[],
  "political_summary": string | null,
  "political_sources": string[],
  "product_health": string | null,
  "product_health_sources": string[],
  "executive_summary": string | null,
  "executive_sources": string[],
  "overall_concern_level": "significant" | "moderate" | "minor" | "clean" | "unknown",
  "verdict_tags": string[],
  "timeline": [
    {
      "year": number,
      "month": number | null,
      "event": string,
      "category": "legal" | "labor" | "tax" | "environmental" | "political" | "product" | "executive",
      "severity": "critical" | "significant" | "moderate" | "minor",
      "source_url": string
    }
  ]
}

Also return a "timeline" array with all documented events in the corporate
record listed in chronological order (oldest first).

Each timeline event:
{
  "year": number (required — the year the event occurred),
  "month": number | null (1-12 if known),
  "event": string (1-2 sentences, specific: include dollar amounts, case names, outcomes),
  "category": "legal" | "labor" | "tax" | "environmental" | "political" | "product" | "executive",
  "severity": "critical" | "significant" | "moderate" | "minor",
  "source_url": string (primary source URL — DOJ, FTC, NLRB, EPA, court, established news)
}

Timeline rules:
- Only include documented, sourced events. Never fabricate.
- Minimum 5 events for well-known companies.
- Maximum 30 events.
- Order by year ascending. If only year is known, month may be null.
- critical = criminal conviction, >$1B settlement, deaths
- significant = major settlement, regulatory action, documented pattern
- moderate = minor settlement, citation
- minor = investigation opened, allegation filed

Rules:
- Neutral tone. Cite primary sources as URLs in the *_sources arrays.
- If insufficient evidence, use null summaries and "unknown" concern level.
- verdict_tags: snake_case e.g. tax_avoidance, labor_violations, bribery, clean_record.
${healthFlag ? '- product_health must summarize documented health implications for this product category, with sources.' : '- Set product_health and product_health_sources to null and [].'}

Do not include profile_type or last_updated in the JSON.`;
}

async function realtimeInvestigation(brandName, corporateParent, healthFlag) {
  const userPrompt = buildResearchPrompt(brandName, corporateParent, healthFlag);

  const tools = [
    {
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: 6,
    },
  ];

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 6000,
      messages: [{ role: 'user', content: userPrompt }],
      tools,
    });

    const text = extractText(msg);
    const citations = collectCitationUrls(msg);
    let parsed = parseInvestigationJson(text);
    if (!parsed) {
      return buildLimited(brandName, corporateParent, healthFlag);
    }
    mergeSourcesWithCitations(parsed, citations);
    const inv = normalizeInvestigation(parsed, brandName, corporateParent, healthFlag);
    return finalizeInvestigation(inv, 'realtime_search');
  } catch (e) {
    console.warn('Investigation web search path failed, retrying without tools:', e?.message || e);
    try {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `${userPrompt}

If web search is unavailable, use only well-established public knowledge and clearly mark gaps with "unknown".`,
          },
        ],
      });
      const text = extractText(msg);
      let parsed = parseInvestigationJson(text);
      if (!parsed) return buildLimited(brandName, corporateParent, healthFlag);
      const inv = normalizeInvestigation(parsed, brandName, corporateParent, healthFlag);
      return finalizeInvestigation(inv, 'realtime_search');
    } catch (e2) {
      console.error('Investigation fallback failed', e2);
      return buildLimited(brandName, corporateParent, healthFlag);
    }
  }
}

/**
 * @param {string | null} brandName
 * @param {string | null} corporateParent
 * @param {{ healthFlag?: boolean }} [options]
 */
export async function getInvestigationProfile(brandName, corporateParent, options = {}) {
  const healthFlag = Boolean(options.healthFlag);
  const primaryBrand = brandName || corporateParent;

  if (!primaryBrand) {
    return null;
  }

  const slug = resolveIncumbentSlug(brandName, corporateParent);

  if (pool) {
    try {
      const { rows } = await pool.query(
        `SELECT *
         FROM incumbent_profiles
         WHERE brand_slug = $1
         LIMIT 1`,
        [slug]
      );
      const row = rows[0];
      if (row) {
        let inv;
        if (row.profile_json) {
          const data =
            typeof row.profile_json === 'string' ? JSON.parse(row.profile_json) : row.profile_json;
          inv = normalizeInvestigation(data, brandName, corporateParent, healthFlag);
        } else {
          const parsed = relationalRowToParsed(row);
          inv = normalizeInvestigation(parsed, brandName, corporateParent, healthFlag);
        }
        const finalized = finalizeInvestigation(inv, 'database');
        const lr = row.last_researched;
        finalized.last_updated =
          lr instanceof Date ? lr.toISOString().slice(0, 10) : lr ? String(lr).slice(0, 10) : finalized.last_updated;
        if (!healthFlag) {
          finalized.product_health = null;
          finalized.product_health_sources = [];
        }
        return finalized;
      }
    } catch (e) {
      console.error('incumbent_profiles query', e);
    }
  }

  return realtimeInvestigation(brandName, corporateParent, healthFlag);
}
