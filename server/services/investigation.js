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

/** Vision food / café categories — realtime prompt adds notable_mentions for these only. */
function shouldIncludeNotableMentions(productCategory) {
  const k = typeof productCategory === 'string' ? productCategory.toLowerCase().trim() : '';
  return k === 'food' || k === 'coffee';
}

/** @param {unknown} raw */
function normalizeNotableMentions(raw) {
  if (raw == null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const awardsList = Array.isArray(raw.awards)
    ? raw.awards.map(String).filter((s) => s.trim())
    : [];
  const pressList = Array.isArray(raw.press)
    ? raw.press.map(String).filter((s) => s.trim())
    : [];
  const known_for =
    typeof raw.known_for === 'string' && raw.known_for.trim() ? raw.known_for.trim() : null;
  const awards = awardsList.length ? awardsList : null;
  const press = pressList.length ? pressList : null;
  if (!awards && !press && !known_for) return null;
  return { awards, press, known_for };
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

const EVIDENCE_LEVELS = new Set(['established', 'strong', 'moderate', 'limited', 'alleged']);

/** @param {unknown} raw */
function normalizeEvidenceGrade(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const levelRaw = typeof raw.level === 'string' ? raw.level.trim().toLowerCase() : '';
  const level = EVIDENCE_LEVELS.has(levelRaw) ? levelRaw : 'limited';
  const source_types = Array.isArray(raw.source_types) ? raw.source_types.map(String) : [];
  const note = typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : null;
  return { level, source_types, note };
}

/** @param {unknown} raw */
function normalizeCostAbsorption(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const row = (x) =>
    x && typeof x === 'object'
      ? {
          group: typeof x.group === 'string' ? x.group : '',
          how: typeof x.how === 'string' ? x.how : '',
        }
      : null;
  const who_benefited = Array.isArray(raw.who_benefited)
    ? raw.who_benefited.map(row).filter((x) => x && (x.group || x.how))
    : [];
  const who_paid = Array.isArray(raw.who_paid)
    ? raw.who_paid.map(row).filter((x) => x && (x.group || x.how))
    : [];
  const the_gap = typeof raw.the_gap === 'string' && raw.the_gap.trim() ? raw.the_gap.trim() : null;
  if (!who_benefited.length && !who_paid.length && !the_gap) return null;
  return { who_benefited, who_paid, the_gap };
}

/** Newspaper-style headline; max 15 words; null if empty. */
function normalizeGeneratedHeadline(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const words = s.replace(/\s+/g, ' ').split(' ');
  const cap = 15;
  if (words.length > cap) return words.slice(0, cap).join(' ');
  return s;
}

/** True when profile_json uses nested { tax: { summary, flags, sources }, ... } (v3 exports). */
function isNestedV3ProfileShape(parsed) {
  return Boolean(
    parsed &&
      typeof parsed === 'object' &&
      parsed.tax &&
      typeof parsed.tax === 'object' &&
      'summary' in parsed.tax
  );
}

function tripletFromSection(sec) {
  if (!sec || typeof sec !== 'object') {
    return { summary: null, flags: [], sources: [] };
  }
  return {
    summary: typeof sec.summary === 'string' ? sec.summary : null,
    flags: Array.isArray(sec.flags) ? sec.flags.map(String) : [],
    sources: Array.isArray(sec.sources) ? sec.sources.map(String) : [],
  };
}

/**
 * Flatten v3 nested section objects into the shape {@link normalizeInvestigation} expects.
 * @param {Record<string, unknown>} parsed
 */
function flattenNestedProfileJson(parsed) {
  if (!isNestedV3ProfileShape(parsed)) return parsed;
  const tax = tripletFromSection(parsed.tax);
  const legal = tripletFromSection(parsed.legal);
  const labor = tripletFromSection(parsed.labor);
  const env = tripletFromSection(parsed.environmental);
  const pol = tripletFromSection(parsed.political);
  const exec = tripletFromSection(parsed.executives);
  const rootExecSummary =
    typeof parsed.executive_summary === 'string' && parsed.executive_summary.trim()
      ? parsed.executive_summary.trim()
      : null;
  return {
    brand: parsed.brand_name || parsed.brand || 'Unknown',
    parent: parsed.parent_company || parsed.ultimate_parent || parsed.parent || null,
    subsidiaries: Array.isArray(parsed.subsidiaries) ? parsed.subsidiaries.map(String) : [],
    generated_headline: parsed.generated_headline ?? null,
    executive_summary: rootExecSummary || exec.summary,
    tax_summary: tax.summary,
    tax_flags: tax.flags,
    tax_sources: tax.sources,
    legal_summary: legal.summary,
    legal_flags: legal.flags,
    legal_sources: legal.sources,
    labor_summary: labor.summary,
    labor_flags: labor.flags,
    labor_sources: labor.sources,
    environmental_summary: env.summary,
    environmental_flags: env.flags,
    environmental_sources: env.sources,
    political_summary: pol.summary,
    political_sources: pol.sources,
    executive_sources: exec.sources,
    product_health:
      typeof parsed.product_health === 'string' && parsed.product_health.trim()
        ? parsed.product_health.trim()
        : null,
    product_health_sources: Array.isArray(parsed.product_health_sources)
      ? parsed.product_health_sources.map(String)
      : [],
    tax_evidence_grade: parsed.tax_evidence_grade,
    legal_evidence_grade: parsed.legal_evidence_grade,
    labor_evidence_grade: parsed.labor_evidence_grade,
    environmental_evidence_grade: parsed.environmental_evidence_grade,
    political_evidence_grade: parsed.political_evidence_grade,
    product_health_evidence_grade: parsed.product_health_evidence_grade,
    timeline: parsed.timeline,
    community_impact: parsed.community_impact,
    cost_absorption: parsed.cost_absorption,
    overall_concern_level: parsed.overall_concern_level,
    verdict_tags: Array.isArray(parsed.verdict_tags) ? parsed.verdict_tags.map(String) : [],
    clean_card: parsed.clean_card,
    connections: parsed.connections,
    allegations: parsed.allegations,
    health_record: parsed.health_record,
    alternatives: parsed.alternatives,
  };
}

const DEFAULT_ALLEGATIONS_DISCLAIMER =
  'The following are allegations and unproven claims. They are documented in credible sources but have not been adjudicated.';

const HEALTH_RECORD_SEVERITIES = new Set(['minimal', 'low', 'moderate', 'high', 'critical']);

/** @param {unknown} raw */
function normalizeConnectionsBlock(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const summary = typeof raw.summary === 'string' && raw.summary.trim() ? raw.summary.trim() : null;
  const flags = Array.isArray(raw.flags) ? raw.flags.map(String) : [];
  const sources = Array.isArray(raw.sources) ? raw.sources.map(String) : [];
  if (!summary && !flags.length && !sources.length) return null;
  return { summary, flags, sources };
}

/** @param {unknown} raw */
function normalizeAllegationsBlock(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const summary = typeof raw.summary === 'string' && raw.summary.trim() ? raw.summary.trim() : null;
  const disclaimer =
    typeof raw.disclaimer === 'string' && raw.disclaimer.trim()
      ? raw.disclaimer.trim()
      : DEFAULT_ALLEGATIONS_DISCLAIMER;
  const flags = Array.isArray(raw.flags) ? raw.flags.map(String) : [];
  const sources = Array.isArray(raw.sources) ? raw.sources.map(String) : [];
  if (!summary && !flags.length && !sources.length) return null;
  return { disclaimer, summary, flags, sources };
}

function inferHealthSeverityFromConcern(overall) {
  const o = String(overall || '').toLowerCase();
  if (o === 'significant') return 'high';
  if (o === 'moderate') return 'moderate';
  if (o === 'minor') return 'low';
  if (o === 'clean') return 'minimal';
  return 'moderate';
}

/** @param {unknown} raw @param {unknown} overallConcern */
function normalizeHealthRecordBlock(raw, overallConcern) {
  if (!raw || typeof raw !== 'object') return null;
  const summary = typeof raw.summary === 'string' && raw.summary.trim() ? raw.summary.trim() : null;
  const flags = Array.isArray(raw.flags) ? raw.flags.map(String) : [];
  const sources = Array.isArray(raw.sources) ? raw.sources.map(String) : [];
  let severity = typeof raw.severity === 'string' ? raw.severity.trim().toLowerCase() : '';
  if (!HEALTH_RECORD_SEVERITIES.has(severity)) severity = inferHealthSeverityFromConcern(overallConcern);
  const studies = Array.isArray(raw.studies)
    ? raw.studies
        .map((s) => {
          if (s && typeof s === 'object') {
            const title = typeof s.title === 'string' ? s.title : '';
            const url = typeof s.url === 'string' ? s.url : '';
            return title || url ? { title, url } : null;
          }
          if (typeof s === 'string' && s.trim()) return { title: '', url: s.trim() };
          return null;
        })
        .filter(Boolean)
    : [];
  if (!summary && !flags.length && !sources.length && !studies.length) return null;
  return { summary, severity, flags, sources, studies };
}

/** @param {unknown} raw */
function normalizeAlternativesBlock(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const cheaper = Array.isArray(raw.cheaper) ? raw.cheaper.map(String) : [];
  const healthier = Array.isArray(raw.healthier) ? raw.healthier.map(String) : [];
  const diy = Array.isArray(raw.diy) ? raw.diy.map(String) : [];
  if (!cheaper.length && !healthier.length && !diy.length) return null;
  return { cheaper, healthier, diy };
}

function normalizeInvestigation(parsed, brandName, corporateParent, healthFlag) {
  const brand = typeof parsed?.brand === 'string' ? parsed.brand : brandName || 'Unknown';
  const parent =
    parsed?.parent === undefined || parsed?.parent === ''
      ? corporateParent || null
      : parsed.parent;

  const emptyArr = () => [];
  const rawConcern =
    typeof parsed?.overall_concern_level === 'string'
      ? parsed.overall_concern_level.trim().toLowerCase()
      : '';
  const ALLOWED_CONCERN = new Set(['significant', 'moderate', 'minor', 'clean', 'unknown']);
  let overall = ALLOWED_CONCERN.has(rawConcern) ? rawConcern : 'moderate';
  const concernWasIndeterminate = !ALLOWED_CONCERN.has(rawConcern);

  let executiveSummaryBase =
    typeof parsed?.executive_summary === 'string' && parsed.executive_summary.trim()
      ? parsed.executive_summary.trim()
      : null;
  const preliminaryNote =
    'Preliminary assessment: the concern meter defaults to moderate when the record is thin, ambiguous, or still being retrieved — verify every claim against primary public sources.';
  const executive_summary = concernWasIndeterminate
    ? executiveSummaryBase
      ? `${executiveSummaryBase}\n\n— ${preliminaryNote}`
      : preliminaryNote
    : executiveSummaryBase;

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
    subsidiaries: Array.isArray(parsed?.subsidiaries)
      ? parsed.subsidiaries.map(String)
      : Array.isArray(parsed?.subsidaries)
        ? parsed.subsidaries.map(String)
        : emptyArr(),
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

    tax_evidence_grade: normalizeEvidenceGrade(parsed?.tax_evidence_grade),
    legal_evidence_grade: normalizeEvidenceGrade(parsed?.legal_evidence_grade),
    labor_evidence_grade: normalizeEvidenceGrade(parsed?.labor_evidence_grade),
    environmental_evidence_grade: normalizeEvidenceGrade(parsed?.environmental_evidence_grade),
    political_evidence_grade: normalizeEvidenceGrade(parsed?.political_evidence_grade),
    product_health_evidence_grade: normalizeEvidenceGrade(parsed?.product_health_evidence_grade),

    executive_summary,
    executive_sources: Array.isArray(parsed?.executive_sources)
      ? parsed.executive_sources.map(String)
      : emptyArr(),

    overall_concern_level: overall,
    verdict_tags: Array.isArray(parsed?.verdict_tags) ? parsed.verdict_tags.map(String) : emptyArr(),
    clean_card: Boolean(parsed?.clean_card),
    generated_headline: normalizeGeneratedHeadline(parsed?.generated_headline),
    community_impact: normalizeCommunityImpact(parsed?.community_impact),
    cost_absorption: normalizeCostAbsorption(parsed?.cost_absorption),
    notable_mentions: normalizeNotableMentions(parsed?.notable_mentions),

    connections: normalizeConnectionsBlock(parsed?.connections),
    allegations: normalizeAllegationsBlock(parsed?.allegations),
    health_record: normalizeHealthRecordBlock(parsed?.health_record, parsed?.overall_concern_level),
    alternatives: normalizeAlternativesBlock(parsed?.alternatives),
  };

  if (!healthFlag) {
    inv.product_health = null;
    inv.product_health_sources = [];
    inv.product_health_evidence_grade = null;
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

/**
 * Last-resort realtime-shaped profile: full card shape with "Research pending" sections (never empty / broken).
 * @param {string} reason — short internal reason for logging
 */
function buildRealtimeEmergencyProfile(brandName, corporateParent, healthFlag, productCategory, reason) {
  const safeReason = String(reason || 'research incomplete').slice(0, 200);
  const label = typeof brandName === 'string' && brandName.trim() ? brandName.trim() : 'This brand';
  const inv = normalizeInvestigation(
    {
      brand: brandName || 'Unknown',
      parent: corporateParent ?? null,
      subsidiaries: [],
      overall_concern_level: 'moderate',
      verdict_tags: [],
      executive_summary: `Realtime research for ${label} encountered an issue (${safeReason}). The brand is identified but its full public record could not be retrieved in this session. Try tapping again.`,
      generated_headline: `${label} — Public Record Under Review`,
      timeline: [],
      tax_summary: 'Research pending.',
      tax_flags: [],
      tax_sources: [],
      legal_summary: 'Research pending.',
      legal_flags: [],
      legal_sources: [],
      labor_summary: 'Research pending.',
      labor_flags: [],
      labor_sources: [],
      environmental_summary: 'Research pending.',
      environmental_flags: [],
      environmental_sources: [],
      political_summary: 'Research pending.',
      political_sources: [],
      executive_sources: [],
      product_health: healthFlag ? 'Research pending.' : null,
      product_health_sources: [],
    },
    brandName,
    corporateParent,
    healthFlag
  );
  return finalizeInvestigation(inv, 'realtime_search');
}

/** @deprecated Prefer full realtime path; still returns realtime_search shape for compatibility */
export function buildLimited(brandName, corporateParent, healthFlag) {
  return buildRealtimeEmergencyProfile(
    brandName,
    corporateParent,
    healthFlag,
    'other',
    'legacy limited stub'
  );
}

function buildResearchPrompt(brandName, corporateParent, healthFlag, productCategory) {
  const primary = [brandName, corporateParent].filter(Boolean).join(' / ') || 'unknown entity';
  const query = `${brandName || ''} ${corporateParent || ''} news reviews complaints lawsuit registration owner BBB OSHA EPA`
    .trim()
    .replace(/\s+/g, ' ');

  const categoryHint = resolveCategoryHint(productCategory);

  return `You are a neutral research assistant. Use web search aggressively for every request.

Research the public record for ${primary}. This could be a large corporation, a small local business, an independent brand, or anything in between — anywhere in the world. Search for whatever exists: business registration, news coverage, reviews, complaints, legal records, labor practices, environmental mentions, ownership structure, trademarks, and social/local press.

If very little exists, say so honestly in the summaries and return what you found. If nothing substantive exists at all, return a profile that treats the absence of indexed public record as a finding in itself (moderate concern level, clear language, empty or minimal timeline — do not invent events).

Distinct entity hints from the tap:
- Brand / label: ${brandName || 'unknown'}
- Corporate parent (if any): ${corporateParent || 'unknown'}

Example search directions (adapt liberally): ${query}

This is broadly a ${categoryHint}. Tailor the community_impact section to the documented patterns for this type of business at scale (category language only there — never name this specific brand inside community_impact).

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
  "tax_evidence_grade": { "level": "established"|"strong"|"moderate"|"limited"|"alleged", "source_types": string[], "note": string | null },
  "legal_evidence_grade": { "level": "...", "source_types": string[], "note": string | null },
  "labor_evidence_grade": { "level": "...", "source_types": string[], "note": string | null },
  "environmental_evidence_grade": { "level": "...", "source_types": string[], "note": string | null },
  "political_evidence_grade": { "level": "...", "source_types": string[], "note": string | null },
  "product_health_evidence_grade": { "level": "...", "source_types": string[], "note": string | null } | null,
  "executive_summary": string | null,
  "executive_sources": string[],
  "overall_concern_level": "significant" | "moderate" | "minor" | "clean",
  "verdict_tags": string[],
  "generated_headline": string | null,
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
  ],
  "cost_absorption": {
    "who_benefited": [{ "group": string, "how": string }],
    "who_paid": [{ "group": string, "how": string }],
    "the_gap": string
  }
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
- For obscure or hyper-local brands, an empty timeline [] is acceptable.
- For well-known companies with dense records, prefer at least 3–5 sourced events when they exist.
- Maximum 30 events.
- Order by year ascending. If only year is known, month may be null.
- critical = criminal conviction, >$1B settlement, deaths
- significant = major settlement, regulatory action, documented pattern
- moderate = minor settlement, citation
- minor = investigation opened, allegation filed

generated_headline:
- At most 15 words. A short, punchy NEWSPAPER headline summarizing the single most significant finding or defining characteristic of THIS company's documented public record — as a front-page editor would write after reading the investigation.
- Must reflect what the record reveals, NOT a description of a product, package, or photo. Never restate the user's tap or object label.
- You MAY name the company when it sharpens the story (e.g. notable legal case, labor pattern).
- If overall_concern_level is "clean" or clean_card is true, use a celebratory headline (the company's positive or distinctive record).
- If concern is significant or moderate, lead with the most notable documented issue specifically (settlements, enforcement, pattern).
- Style: ALL CAPS or Title Case — editorial judgment. Omit if there is genuinely no substantive record to summarize (use null).

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

Evidence grading — include tax_evidence_grade, legal_evidence_grade, labor_evidence_grade, environmental_evidence_grade, political_evidence_grade, and product_health_evidence_grade (null when product_health is null). Each object:
{
  "level": "established" | "strong" | "moderate" | "limited" | "alleged",
  "source_types": ["court_ruling", "regulatory_action", "peer_reviewed_research", "investigative_journalism", "company_self_reporting", "government_database", "unresolved_allegation", ...],
  "note": string | null
}
Definitions:
- established: Court ruling, criminal conviction, or regulatory finding with no successful appeal. This happened.
- strong: Multiple independent credible sources, documented evidence, strong consensus.
- moderate: Credible reporting or documentation with some dispute or ambiguity.
- limited: Single source, older data, or incomplete documentation.
- alleged: Filed allegation or claim not yet resolved.
Always be honest about the grade. A settlement without admission of guilt should be "strong" not "established." An OSHA citation that was contested should be "moderate."

Cost absorption synthesis — include "cost_absorption" object:
{
  "who_benefited": [{ "group": string, "how": string }],
  "who_paid": [{ "group": string, "how": string }],
  "the_gap": string
}
who_benefited: executives, shareholders, franchise owners, investors, etc.
who_paid: workers, local communities, taxpayers, suppliers, competitors, environment, future generations.
the_gap: one sentence connecting the two — what transferred from one group to the other.
Keep each item to 1–2 sentences. Be specific where the record supports it.

Rules:
- Neutral tone. Cite primary sources as URLs in the *_sources arrays.
- If insufficient evidence, use null summaries, empty flags, and overall_concern_level "moderate" (never "unknown").
- verdict_tags: snake_case e.g. tax_avoidance, labor_violations, bribery, clean_record.
- generated_headline: follow the headline rules above; null only when there is no substantive record to summarize.
${healthFlag ? '- product_health must summarize documented health implications for this product category, with sources.' : '- Set product_health and product_health_sources to null and [].'}
${
  shouldIncludeNotableMentions(productCategory)
    ? `

If this is a restaurant, food business, or hospitality venue (or the tapped subject is clearly one), also return:
"notable_mentions": {
  "awards": string[] | null,
  "press": string[] | null,
  "known_for": string | null
}
where awards covers Michelin stars, James Beard nominations, and recognized local awards; press covers notable reviews or press mentions; known_for is one sentence on what the place is known for. Use null for each field when unknown. If the subject is not a restaurant or food venue, set notable_mentions to null.`
    : ''
}

Do not include profile_type or last_updated in the JSON.`;
}

/**
 * Model sometimes wraps JSON in prose; ask for a strict extract.
 * @param {string} brandName
 * @param {string} contaminated
 */
async function repairInvestigationJson(brandName, contaminated) {
  const slice = String(contaminated || '').slice(0, 14_000);
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 6000,
    messages: [
      {
        role: 'user',
        content: `Extract ONE valid JSON object for a corporate investigation of "${brandName}" from the text below. The JSON must match the investigation schema (brand, parent, subsidiaries, summaries, flags, sources, overall_concern_level, verdict_tags, timeline, community_impact, generated_headline, product_health fields, and notable_mentions when present for restaurants). Output ONLY the JSON — no markdown, no commentary. If a value is missing use null or [].

--- begin ---
${slice}
--- end ---`,
      },
    ],
  });
  return parseInvestigationJson(extractText(msg));
}

/**
 * Multi-turn Claude call: web search often yields `pause_turn`; client `tool_use` needs tool_result replies.
 * Loops until `end_turn` (or `max_tokens`), logging each step for Render.
 * @param {string} userPrompt
 * @param {object[] | null} tools
 */
async function runInvestigationAnthropicTurn(userPrompt, tools) {
  const userMessage = { role: 'user', content: userPrompt };
  let messages = [userMessage];
  let citationUrls = [];
  const maxSteps = 24;
  let lastResponse = null;

  for (let step = 0; step < maxSteps; step++) {
    console.log(
      `[investigation] realtime: anthropic step ${step + 1}/${maxSteps} (messages=${messages.length})`
    );

    const params = {
      model: MODEL,
      max_tokens: 6000,
      messages,
    };
    if (tools?.length) params.tools = tools;

    lastResponse = await client.messages.create(params);
    citationUrls = [...citationUrls, ...collectCitationUrls(lastResponse)];

    const blockTypes = (lastResponse.content || []).map((b) => b.type).join(', ');
    console.log(
      `[investigation] realtime: step ${step + 1} done stop_reason=${lastResponse.stop_reason} blocks=[${blockTypes}]`
    );

    const sr = lastResponse.stop_reason;
    if (sr === 'end_turn' || sr === 'max_tokens') {
      console.log(`[investigation] realtime: conversation end (${sr})`);
      break;
    }

    if (sr === 'pause_turn') {
      messages.push({ role: 'assistant', content: lastResponse.content });
      continue;
    }

    if (sr === 'tool_use') {
      messages.push({ role: 'assistant', content: lastResponse.content });
      const toolResults = [];
      for (const block of lastResponse.content || []) {
        if (block.type === 'tool_use') {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content:
              'No local execution — rely on web search and prior context. Produce the final investigation JSON in one object.',
          });
        }
      }
      if (toolResults.length) {
        messages.push({ role: 'user', content: toolResults });
      } else {
        messages.push({
          role: 'user',
          content: 'Continue and return the investigation as a single JSON object per the schema.',
        });
      }
      continue;
    }

    console.warn(`[investigation] realtime: unhandled stop_reason=${sr} — exiting loop`);
    break;
  }

  return { message: lastResponse, citationUrls };
}

function nonEmptySummaryField(val) {
  if (val == null) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (typeof val === 'object' && typeof val.summary === 'string') return val.summary.trim().length > 0;
  return false;
}

/** True when tax/legal summaries or overall_concern_level are missing (matches schema legal_summary / tax_summary). */
function realtimeParsedIsIncomplete(parsed) {
  if (!parsed || typeof parsed !== 'object') return true;
  const legal = parsed.legal_summary ?? (parsed.legal && parsed.legal.summary);
  const tax = parsed.tax_summary ?? (parsed.tax && parsed.tax.summary);
  const hasLegal = nonEmptySummaryField(legal);
  const hasTax = nonEmptySummaryField(tax);
  const concern = parsed.overall_concern_level;
  const hasConcern = typeof concern === 'string' && concern.trim().length > 0;
  return !hasLegal || !hasTax || !hasConcern;
}

function mergeRealtimeParsed(primary, secondary) {
  if (!primary) return secondary;
  if (!secondary) return primary;
  const out = { ...primary, ...secondary };
  if (!nonEmptySummaryField(primary.tax_summary) && nonEmptySummaryField(secondary.tax_summary)) {
    out.tax_summary = secondary.tax_summary;
  }
  if (!nonEmptySummaryField(primary.legal_summary) && nonEmptySummaryField(secondary.legal_summary)) {
    out.legal_summary = secondary.legal_summary;
  }
  if (
    !(typeof primary.overall_concern_level === 'string' && primary.overall_concern_level.trim()) &&
    typeof secondary.overall_concern_level === 'string' &&
    secondary.overall_concern_level.trim()
  ) {
    out.overall_concern_level = secondary.overall_concern_level;
  }
  return out;
}

/** @param {unknown} msg — Anthropic Messages API response message */
async function extractParsedFromAssistantMessage(msg, brandLabel) {
  console.log('[investigation] realtime: extracting assistant text for JSON parse');
  const text = extractText(msg);
  console.log(
    `[investigation] realtime: text length=${text?.length ?? 0} preview=${String(text).slice(0, 160).replace(/\s+/g, ' ')}`
  );

  let parsed = parseInvestigationJson(text);
  console.log(`[investigation] realtime: parseInvestigationJson ${parsed ? 'success' : 'miss'}`);

  if (!parsed && text?.trim()) {
    try {
      console.log('[investigation] realtime: repairInvestigationJson…');
      parsed = await repairInvestigationJson(brandLabel, text);
      console.log(`[investigation] realtime: repair ${parsed ? 'success' : 'still null'}`);
    } catch (e) {
      console.warn('[investigation] realtime: repair failed:', e?.message || e);
    }
  }

  return { text, parsed };
}

/** Parse-fallback shape when the model returns no JSON — not the same as API-failure emergency profile. */
function buildUnparseableRealtimeStub(brandName, corporateParent, healthFlag, text) {
  const label = brandName || corporateParent || 'This entity';
  const tail = text?.trim()
    ? `\n\n— Raw assistant output (trimmed):\n${String(text).trim().slice(0, 2800)}`
    : '';
  return {
    brand: brandName || label,
    parent: corporateParent ?? null,
    subsidiaries: [],
    overall_concern_level: 'moderate',
    verdict_tags: ['sparse_public_record'],
    executive_summary: `Realtime research finished, but we could not obtain structured JSON for "${label}". Try again or verify primary sources.${tail}`,
    generated_headline: `${label} — Public Record Scan`,
    timeline: [],
    tax_summary:
      'No structured tax section was captured from the model output in this session — retry for a full tax summary.',
    tax_flags: [],
    tax_sources: [],
    legal_summary:
      'No structured legal section was captured from the model output in this session — retry for a full legal summary.',
    legal_flags: [],
    legal_sources: [],
    labor_summary: null,
    labor_flags: [],
    labor_sources: [],
    environmental_summary: null,
    environmental_flags: [],
    environmental_sources: [],
    political_summary: null,
    political_sources: [],
    executive_sources: [],
    product_health: healthFlag
      ? 'No structured product_health in this response — retry or check labeling and local sources.'
      : null,
    product_health_sources: [],
  };
}

async function realtimeInvestigation(brandName, corporateParent, healthFlag, productCategory) {
  console.log(
    `[investigation] realtimeInvestigation start brand=${brandName || '∅'} parent=${corporateParent || '∅'} category=${productCategory || '∅'}`
  );

  const userPrompt = buildResearchPrompt(brandName, corporateParent, healthFlag, productCategory);

  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }];

  const finalizeFromParsed = (parsed, citationUrls) => {
    mergeSourcesWithCitations(parsed, citationUrls);
    const inv = normalizeInvestigation(parsed, brandName, corporateParent, healthFlag);
    return finalizeInvestigation(inv, 'realtime_search');
  };

  const brandLabel = brandName || corporateParent || 'Brand';

  let msg;
  let citationUrls = [];

  try {
    ({ message: msg, citationUrls } = await runInvestigationAnthropicTurn(userPrompt, tools));
  } catch (e) {
    console.warn('[investigation] realtime: web search path threw, retrying without tools:', e?.message || e);
    try {
      const fallbackPrompt = `${userPrompt}

If web search is unavailable, use only well-established public knowledge. Use overall_concern_level "moderate" when evidence is thin; explain gaps in executive_summary. Still output valid JSON.`;
      ({ message: msg, citationUrls } = await runInvestigationAnthropicTurn(fallbackPrompt, null));
    } catch (e2) {
      console.error('[investigation] realtime: investigation request failed after retry', e2);
      return buildRealtimeEmergencyProfile(
        brandName,
        corporateParent,
        healthFlag,
        productCategory,
        e2?.message || 'API error'
      );
    }
  }

  let { text, parsed } = await extractParsedFromAssistantMessage(msg, brandLabel);

  if (!parsed || realtimeParsedIsIncomplete(parsed)) {
    const reason = !parsed ? 'no parseable JSON' : 'incomplete legal/tax/concern fields';
    console.log(`[investigation] realtime: ${reason} — running one completion turn with full-schema prompt`);
    const labelForPrompt = brandName || corporateParent || 'this brand';
    const completionPrompt = `Your previous response was incomplete. Please provide the full investigation JSON for ${labelForPrompt} including all seven sections (tax, legal, labor, environmental, political, product_health, executive) with substantive tax_summary and legal_summary strings, overall_concern_level set, and remaining sections as required by the schema.${
      shouldIncludeNotableMentions(productCategory)
        ? ' For a restaurant or food venue, include notable_mentions (awards, press, known_for) when known.'
        : ''
    } Return ONLY valid JSON — no markdown fences, no commentary.`;

    try {
      const second = await runInvestigationAnthropicTurn(completionPrompt, tools);
      citationUrls = [...citationUrls, ...second.citationUrls];
      const secondExtract = await extractParsedFromAssistantMessage(second.message, brandLabel);
      if (secondExtract.parsed) {
        parsed = mergeRealtimeParsed(parsed, secondExtract.parsed);
      }
      if (!text && secondExtract.text) text = secondExtract.text;
    } catch (e) {
      console.error('[investigation] realtime: completion Anthropic turn threw', e);
      return buildRealtimeEmergencyProfile(
        brandName,
        corporateParent,
        healthFlag,
        productCategory,
        e?.message || 'API error on completion turn'
      );
    }
  }

  if (!parsed) {
    console.log(
      '[investigation] realtime: still no parseable JSON after completion turn — using thin stub (API did not throw)'
    );
    parsed = buildUnparseableRealtimeStub(brandName, corporateParent, healthFlag, text);
  }

  console.log('[investigation] realtime: finalize + return');
  return finalizeFromParsed(parsed, citationUrls);
}

/** Structured completion log for debugging thin / missing profiles. */
function logInvestigationProfileEnd(route, profile) {
  if (!profile) {
    console.log('[investigation] getInvestigationProfile:end', { route, profile: null });
    return;
  }
  const tl = Array.isArray(profile.timeline) ? profile.timeline.length : 0;
  console.log('[investigation] getInvestigationProfile:end', {
    route,
    overall_concern_level: profile.overall_concern_level ?? null,
    timeline_entries: tl,
  });
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
    console.log('[investigation] getInvestigationProfile:start', {
      brandName,
      corporateParent,
      decision: 'no_primary_brand',
    });
    return null;
  }

  const slug = resolveIncumbentSlug(brandName, corporateParent);
  console.log('[investigation] getInvestigationProfile:start', {
    brandName,
    corporateParent,
    slug,
    db_pool: Boolean(pool),
  });

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
        console.log('[investigation] getInvestigationProfile:route', { slug, source: 'database' });
        let inv;
        if (row.profile_json) {
          let data =
            typeof row.profile_json === 'string' ? JSON.parse(row.profile_json) : row.profile_json;
          data = flattenNestedProfileJson(data);
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
        logInvestigationProfileEnd('database', finalized);
        return finalized;
      }
    } catch (e) {
      console.error('incumbent_profiles query', e);
    }
  }

  console.log('[investigation] getInvestigationProfile:route', {
    slug,
    source: 'realtime',
    reason: pool ? 'no_db_row' : 'no_db_pool',
  });

  try {
    const rt = await realtimeInvestigation(brandName, corporateParent, healthFlag, productCategory);
    logInvestigationProfileEnd('realtime', rt);
    return rt;
  } catch (e) {
    console.error('getInvestigationProfile realtime failed', e);
    const emergency = buildRealtimeEmergencyProfile(
      brandName,
      corporateParent,
      healthFlag,
      productCategory,
      e?.message || 'unexpected error'
    );
    logInvestigationProfileEnd('realtime_emergency', emergency);
    return emergency;
  }
}
