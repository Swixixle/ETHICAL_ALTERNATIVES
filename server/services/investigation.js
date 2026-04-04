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

const CATEGORY_HINTS = {
  fast_food: 'fast food chain',
  coffee: 'national coffee chain',
  clothing: 'fast fashion or retail clothing chain',
  outdoor: 'outdoor apparel and gear retailer',
  big_box: 'big box retailer',
  grocery: 'national grocery chain',
  pharmacy: 'national pharmacy chain',
  tech_platform: 'social media or technology platform',
  search: 'search engine and advertising platform',
  oil_gas: 'fossil fuel company',
  tobacco: 'tobacco company',
  streaming: 'media streaming platform',
  auto: 'automotive manufacturer',
  electronics: 'consumer electronics manufacturer',
  food_processing: 'industrial food processing company',
  agribusiness: 'agricultural conglomerate',
  financial: 'large financial institution',
  default: 'large multinational corporation',
};

/** Vision `identification.category` → CATEGORY_HINTS key */
const VISION_CATEGORY_TO_HINT = {
  coffee: 'coffee',
  clothing: 'clothing',
  food: 'fast_food',
  electronics: 'electronics',
  tobacco: 'tobacco',
  home_goods: 'big_box',
  personal_care: 'pharmacy',
  books: 'default',
  tools: 'default',
  other: 'default',
};

function resolveCategoryHint(productCategory) {
  const key = typeof productCategory === 'string' ? productCategory.toLowerCase().trim() : '';
  const hintKey = VISION_CATEGORY_TO_HINT[key] || 'default';
  return CATEGORY_HINTS[hintKey] || CATEGORY_HINTS.default;
}

function normalizeCommunityImpact(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const displacementRaw = raw.displacement_effect && typeof raw.displacement_effect === 'object'
    ? raw.displacement_effect
    : null;
  const displacement_effect = displacementRaw
    ? {
        summary: typeof displacementRaw.summary === 'string' ? displacementRaw.summary : null,
        specifics: Array.isArray(displacementRaw.specifics) ? displacementRaw.specifics.map(String) : null,
      }
    : null;

  const priceRaw = raw.price_illusion && typeof raw.price_illusion === 'object' ? raw.price_illusion : null;
  const price_illusion = priceRaw
    ? {
        summary: typeof priceRaw.summary === 'string' ? priceRaw.summary : null,
        mechanisms: Array.isArray(priceRaw.mechanisms) ? priceRaw.mechanisms.map(String) : null,
      }
    : null;

  const taxRaw = raw.tax_math && typeof raw.tax_math === 'object' ? raw.tax_math : null;
  const tax_math = taxRaw
    ? {
        summary: typeof taxRaw.summary === 'string' ? taxRaw.summary : null,
        who_pays: typeof taxRaw.who_pays === 'string' ? taxRaw.who_pays : null,
        what_disappears: typeof taxRaw.what_disappears === 'string' ? taxRaw.what_disappears : null,
      }
    : null;

  const wvRaw = raw.wealth_velocity && typeof raw.wealth_velocity === 'object' ? raw.wealth_velocity : null;
  const wealth_velocity = wvRaw
    ? {
        summary: typeof wvRaw.summary === 'string' ? wvRaw.summary : null,
      }
    : null;

  const the_real_math = typeof raw.the_real_math === 'string' ? raw.the_real_math : null;
  const category_label =
    typeof raw.category_label === 'string' && raw.category_label.trim() ? raw.category_label.trim() : null;

  let de = displacement_effect;
  if (de && !de.summary && !(de.specifics && de.specifics.length)) de = null;

  let pe = price_illusion;
  if (pe && !pe.summary && !(pe.mechanisms && pe.mechanisms.length)) pe = null;

  let tm = tax_math;
  if (tm && !tm.summary && !tm.who_pays && !tm.what_disappears) tm = null;

  let wv = wealth_velocity;
  if (wv && !wv.summary) wv = null;

  const trm = the_real_math && the_real_math.trim() ? the_real_math : null;

  const out = {
    category_label,
    displacement_effect: de,
    price_illusion: pe,
    tax_math: tm,
    wealth_velocity: wv,
    the_real_math: trm,
  };

  const hasAny =
    out.category_label ||
    out.displacement_effect ||
    out.price_illusion ||
    out.tax_math ||
    out.wealth_velocity ||
    out.the_real_math;

  return hasAny ? out : null;
}

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
    community_impact: normalizeCommunityImpact(parsed?.community_impact),
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

function buildResearchPrompt(brandName, corporateParent, healthFlag, productCategory) {
  const query = `${brandName || ''} ${corporateParent || ''} legal violations lawsuit settlement tax OSHA EPA lobbying political donations`
    .trim()
    .replace(/\s+/g, ' ');

  const categoryHint = resolveCategoryHint(productCategory);

  return `You are a neutral research assistant. Use web search when available to verify the public record.

Company / brand: ${brandName || 'unknown'}
Corporate parent: ${corporateParent || 'unknown'}

Prioritize queries like: ${query}

This is a ${categoryHint}. Tailor the community_impact section specifically to the documented patterns for this type of business.

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
  "community_impact": {
    "category_label": string,
    "displacement_effect": {
      "summary": string,
      "specifics": string[]
    },
    "price_illusion": {
      "summary": string,
      "mechanisms": string[]
    },
    "tax_math": {
      "summary": string,
      "who_pays": string,
      "what_disappears": string
    },
    "wealth_velocity": {
      "summary": string
    },
    "the_real_math": string
  },
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

Also return a "community_impact" object.

This is NOT about this specific company's documented record.
It is about what this CATEGORY of business does to communities at scale.
Never name the specific company. Speak in category terms:
"fast food chains", "big box retailers", "social media platforms", etc.

community_impact fields:
- category_label: short label (e.g. "Fast Food Chain", "Big Box Retailer").
- displacement_effect: summary (2-3 sentences) + specifics (3-5 short bullet strings; patterns for this category).
- price_illusion: summary + mechanisms (3-4 plain-language pricing mechanism strings).
- tax_math: summary + who_pays (1-2 sentences on who bears shifted burden) + what_disappears (1-2 sentences on underfunded public goods).
- wealth_velocity: summary (2-3 sentences; local vs chain money flow, velocity, absentee ownership).
- the_real_math: one short paragraph synthesizing community-level math if spending shifts; plain, not moralistic; end with reflection not guilt.

community_impact rules:
- NEVER name specific companies in community_impact. Category language only.
- Plain language. Smart reader, not an economist.
- Use "typically", "research suggests", "economic studies show" where appropriate.
- Keep each section tight (sidebar, not a report). Explanatory, not accusatory.

Rules:
- Neutral tone. Cite primary sources as URLs in the *_sources arrays.
- If insufficient evidence, use null summaries and "unknown" concern level.
- verdict_tags: snake_case e.g. tax_avoidance, labor_violations, bribery, clean_record.
${healthFlag ? '- product_health must summarize documented health implications for this product category, with sources.' : '- Set product_health and product_health_sources to null and [].'}

Do not include profile_type or last_updated in the JSON.`;
}

async function realtimeInvestigation(brandName, corporateParent, healthFlag, productCategory) {
  const userPrompt = buildResearchPrompt(brandName, corporateParent, healthFlag, productCategory);

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
 * @param {{ healthFlag?: boolean; productCategory?: string }} [options]
 */
export async function getInvestigationProfile(brandName, corporateParent, options = {}) {
  const healthFlag = Boolean(options.healthFlag);
  const productCategory = options.productCategory;
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

  return realtimeInvestigation(brandName, corporateParent, healthFlag, productCategory);
}
