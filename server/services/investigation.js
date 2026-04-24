import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { relationalRowToParsed } from '../db/mapIncumbentProfile.js';
import { pool } from '../db/pool.js';
import { getPressOutletsForSlug } from './pressOutletsCatalog.js';
import { attachProportionalityToInvestigation } from './proportionality.js';
import {
  recordProviderFailure,
  recordProviderSuccess,
  resolveInvestigationRoute,
  runClaudeInvestigationVerify,
  runGeminiInvestigationDraft,
  runInvestigationTextFallbackChain,
} from './aiProvider.js';
import { corroborateLayerC, mergeLayerCCorroborationIntoProfileJson } from './corroboration.js';
import { assignShareRiskTier } from './shareRiskTier.js';
import { kickPerimeterCheckForInvestigation } from './perimeterCache.js';
import { investigationCache } from './cacheStore.js';
import {
  applyDeepResearchToInvestigation,
  buildDeepResearchCategoriesForClient,
  extractDeepResearchFromProfileJson,
  mergeLiveInvestigationDelta,
} from './deepResearchMerge.js';

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

/** Hyphenated slug tail: `chevron-corporation` → canonical row slug. Applied repeatedly until stable. */
const LEGAL_ENTITY_SLUG_SUFFIX_RE =
  /-(corporation|companies|company|corp|incorporated|inc|ltd|limited|llc|plc|lp|group|holdings|international|global|enterprises|partners|solutions|stores)$/i;

/**
 * Vision / legal-name slug variants → incumbent_profiles.brand_slug (after brandSlug(), suffix strips).
 * Keep in sync with deep-research roster; logged fuzzy matches supplement this.
 */
const SLUG_CANONICAL_MAP = /** @type {Record<string, string>} */ ({
  unitedhealthcare: 'unitedhealth',
  'unitedhealth-group': 'unitedhealth',
  'united-health-group': 'unitedhealth',
  unitedhealthgroup: 'unitedhealth',
  'chevron-corporation': 'chevron',
  'kraft-heinz-company': 'kraft-heinz',
  'the-kraft-heinz-company': 'kraft-heinz',
  'mcdonalds-corporation': 'mcdonalds',
  'walmart-inc': 'walmart',
  'walmart-stores': 'walmart',
  'amazon-com': 'amazon',
  'apple-inc': 'apple',
  'alphabet-inc': 'google',
  'meta-platforms': 'meta',
  'meta-platforms-inc': 'meta',
  'philip-morris-international': 'philip-morris',
  'altria-group': 'altria',
  'tyson-foods-inc': 'tyson-foods',
});

function applySlugCanonical(s) {
  if (!s) return s;
  return SLUG_CANONICAL_MAP[s] || s;
}

/**
 * Repeatedly strip legal suffixes and apply JSON + canonical maps until stable.
 * @param {string} primary
 * @param {Record<string, string>} jsonAliases
 */
function normalizeSlugWithSuffixStrips(primary, jsonAliases) {
  let s = primary;
  for (let i = 0; i < 12; i++) {
    if (jsonAliases[s]) return jsonAliases[s];
    const canon = applySlugCanonical(s);
    if (canon !== s) {
      s = canon;
      continue;
    }
    const next = s.replace(LEGAL_ENTITY_SLUG_SUFFIX_RE, '');
    if (next !== s && next.length >= 2) {
      s = next;
      continue;
    }
    break;
  }
  if (jsonAliases[s]) return jsonAliases[s];
  return applySlugCanonical(s);
}

/**
 * @param {string | null | undefined} brandName
 * @param {string | null | undefined} corporateParent
 */
function firstWordSlugFromLabels(brandName, corporateParent) {
  const raw = String(brandName || corporateParent || '').trim();
  if (!raw) return '';
  const first = raw.split(/[\s/]+/)[0] || '';
  return brandSlug(first);
}

/** @param {string} a @param {string} b */
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  /** @type {number[]} */
  let prev = new Array(n + 1);
  /** @type {number[]} */
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

/** @param {string} candidate @param {string} rowSlug */
function slugSimilarityScore(candidate, rowSlug) {
  const a = String(candidate || '').toLowerCase();
  const b = String(rowSlug || '').toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 1;
  const dist = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen ? 1 - dist / maxLen : 0;
}

/**
 * When exact slug misses, find a row: prefix match, then ILIKE on first word, then similarity tie-break.
 * @param {string | null | undefined} brandName
 * @param {string | null | undefined} corporateParent
 * @param {string} candidateSlug — slug we already tried (from resolveIncumbentSlug)
 * @returns {Promise<import('pg').QueryResultRow | null>}
 */
async function fetchIncumbentRowFuzzyMatch(brandName, corporateParent, candidateSlug) {
  if (!pool || !candidateSlug || candidateSlug.length < 3) return null;

  try {
    const prefixRes = await pool.query(
      `SELECT *
       FROM incumbent_profiles
       WHERE $1::text LIKE brand_slug || '%'
         AND length(brand_slug) >= 4
       ORDER BY length(brand_slug) DESC
       LIMIT 8`,
      [candidateSlug]
    );
    if (prefixRes.rows.length === 1) {
      const chosen = prefixRes.rows[0];
      console.log('[investigation] fuzzy_slug_match', {
        kind: 'candidate_starts_with_row_slug',
        candidate: candidateSlug,
        chosen: chosen.brand_slug,
        pool: 1,
      });
      return chosen;
    }
    if (prefixRes.rows.length > 1) {
      let best = prefixRes.rows[0];
      let bestScore = slugSimilarityScore(candidateSlug, best.brand_slug);
      for (let i = 1; i < prefixRes.rows.length; i++) {
        const r = prefixRes.rows[i];
        const sc = slugSimilarityScore(candidateSlug, r.brand_slug);
        if (sc > bestScore || (sc === bestScore && String(r.brand_slug).length > String(best.brand_slug).length)) {
          bestScore = sc;
          best = r;
        }
      }
      console.log('[investigation] fuzzy_slug_match', {
        kind: 'candidate_starts_with_row_slug',
        candidate: candidateSlug,
        chosen: best.brand_slug,
        score: Number(bestScore.toFixed(4)),
        pool: prefixRes.rows.length,
        alternates: prefixRes.rows.map((r) => r.brand_slug),
      });
      return best;
    }

    let fw = firstWordSlugFromLabels(brandName, corporateParent);
    if (fw.length < 4 && corporateParent && brandName) {
      fw = firstWordSlugFromLabels(corporateParent, null);
    }
    if (fw.length < 3) return null;

    const ilikeRes = await pool.query(
      `SELECT *
       FROM incumbent_profiles
       WHERE brand_slug ILIKE $1
         AND length(brand_slug) >= 4
       LIMIT 24`,
      [`%${fw}%`]
    );
    if (ilikeRes.rows.length === 0) return null;
    if (ilikeRes.rows.length === 1) {
      const chosen = ilikeRes.rows[0];
      console.log('[investigation] fuzzy_slug_match', {
        kind: 'ilike_first_word',
        candidate: candidateSlug,
        firstWord: fw,
        chosen: chosen.brand_slug,
        pool: 1,
      });
      return chosen;
    }
    let best = ilikeRes.rows[0];
    let bestScore = slugSimilarityScore(candidateSlug, best.brand_slug);
    for (let i = 1; i < ilikeRes.rows.length; i++) {
      const r = ilikeRes.rows[i];
      const sc = slugSimilarityScore(candidateSlug, r.brand_slug);
      if (sc > bestScore) {
        bestScore = sc;
        best = r;
      }
    }
    console.log('[investigation] fuzzy_slug_match', {
      kind: 'ilike_first_word',
      candidate: candidateSlug,
      firstWord: fw,
      chosen: best.brand_slug,
      score: Number(bestScore.toFixed(4)),
      pool: ilikeRes.rows.length,
      alternates: ilikeRes.rows.map((r) => r.brand_slug),
    });
    return best;
  } catch (e) {
    console.error('[investigation] fuzzy_slug_match_error', e?.message || e);
    return null;
  }
}

/**
 * Maps vision/OCR brand strings to incumbent_profiles.brand_slug via server/db/brand_aliases.json.
 * Tries `brandName` first, then `corporateParent`.
 *
 * When only `corporateParent` is set (e.g. "Chevron Corporation") the raw slug is `chevron-corporation`,
 * which often has no DB row — canonical rows use `chevron`. Strip common legal suffix segments after aliases.
 */
export function resolveIncumbentSlug(brandName, corporateParent) {
  const map = loadBrandAliases();
  const apply = (raw) => {
    if (raw == null || raw === '') return null;
    const s = brandSlug(raw);
    return map[s] || null;
  };
  const fromAlias = apply(brandName) || apply(corporateParent);
  if (fromAlias) return fromAlias;

  const primary = brandSlug(brandName || corporateParent);
  if (!primary) return '';
  if (map[primary]) return map[primary];

  return normalizeSlugWithSuffixStrips(primary, map);
}

/**
 * True when `slug` appears in brand_aliases (key or canonical value) or exists in incumbent_profiles.
 * @param {string | null | undefined} slug
 */
export async function isIncumbentSlugKnown(slug) {
  const s = slug != null && String(slug).trim() ? String(slug).trim() : '';
  if (!s) return false;
  const map = loadBrandAliases();
  if (Object.prototype.hasOwnProperty.call(map, s)) return true;
  for (const v of Object.values(map)) {
    if (v === s) return true;
  }
  if (!pool) return false;
  try {
    const { rows } = await pool.query(
      'SELECT 1 FROM incumbent_profiles WHERE brand_slug = $1 LIMIT 1',
      [s]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
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
    tax_finding: parsed.tax_finding,
    legal_finding: parsed.legal_finding,
    labor_finding: parsed.labor_finding,
    environmental_finding: parsed.environmental_finding,
    political_finding: parsed.political_finding,
    product_health_finding: parsed.product_health_finding,
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
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    lat: parsed.lat,
    lng: parsed.lng,
    tax_violation_type: parsed.tax_violation_type,
    tax_charge_status: parsed.tax_charge_status,
    tax_amount_involved: parsed.tax_amount_involved,
    legal_violation_type: parsed.legal_violation_type,
    legal_charge_status: parsed.legal_charge_status,
    legal_amount_involved: parsed.legal_amount_involved,
    labor_violation_type: parsed.labor_violation_type,
    labor_charge_status: parsed.labor_charge_status,
    labor_amount_involved: parsed.labor_amount_involved,
    environmental_violation_type: parsed.environmental_violation_type,
    environmental_charge_status: parsed.environmental_charge_status,
    environmental_amount_involved: parsed.environmental_amount_involved,
    political_violation_type: parsed.political_violation_type,
    political_charge_status: parsed.political_charge_status,
    political_amount_involved: parsed.political_amount_involved,
    product_health_violation_type: parsed.product_health_violation_type,
    product_health_charge_status: parsed.product_health_charge_status,
    product_health_amount_involved: parsed.product_health_amount_involved,

    concern_flags: parsed.concern_flags,
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

/** @param {unknown} raw */
function normalizePressOutletsFromParsed(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const o of raw) {
    if (!o || typeof o !== 'object') continue;
    const name = String(o.name || '').trim();
    let handle = String(o.handle || '').trim();
    if (handle && !handle.startsWith('@')) handle = `@${handle.replace(/^@+/, '')}`;
    const beat = String(o.beat || '').trim();
    if (!name || !handle || seen.has(handle)) continue;
    seen.add(handle);
    out.push({ name, handle, beat });
  }
  return out;
}

/** @param {unknown} raw */
function normalizeCategoryFinding(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s || null;
}

function normalizeInvestigation(parsed, brandName, corporateParent, healthFlag) {
  const brand = typeof parsed?.brand === 'string' ? parsed.brand : brandName || 'Unknown';
  const parent =
    parsed?.parent === undefined || parsed?.parent === ''
      ? corporateParent || null
      : parsed.parent;

  /** Category axes from profile JSON (`concern_flags: { labor: true, ... }`) merged into API concern_flags in finalize. */
  const concern_axis_booleans = (() => {
    const c = parsed?.concern_flags;
    if (!c || typeof c !== 'object' || Array.isArray(c)) return [];
    return Object.entries(c)
      .filter(([, v]) => v === true)
      .map(([k]) => String(k));
  })();

  const emptyArr = () => [];
  const rawConcern =
    typeof parsed?.overall_concern_level === 'string'
      ? parsed.overall_concern_level.trim().toLowerCase()
      : '';
  const ALLOWED_CONCERN = new Set([
    'critical',
    'high',
    'significant',
    'moderate',
    'low',
    'minor',
    'clean',
    'unknown',
  ]);
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
    tax_finding: normalizeCategoryFinding(parsed?.tax_finding),

    legal_summary: parsed?.legal_summary ?? null,
    legal_flags: Array.isArray(parsed?.legal_flags) ? parsed.legal_flags.map(String) : emptyArr(),
    legal_sources: Array.isArray(parsed?.legal_sources) ? parsed.legal_sources.map(String) : emptyArr(),
    legal_finding: normalizeCategoryFinding(parsed?.legal_finding),

    labor_summary: parsed?.labor_summary ?? null,
    labor_flags: Array.isArray(parsed?.labor_flags) ? parsed.labor_flags.map(String) : emptyArr(),
    labor_sources: Array.isArray(parsed?.labor_sources) ? parsed.labor_sources.map(String) : emptyArr(),
    labor_finding: normalizeCategoryFinding(parsed?.labor_finding),

    environmental_summary: parsed?.environmental_summary ?? null,
    environmental_flags: Array.isArray(parsed?.environmental_flags)
      ? parsed.environmental_flags.map(String)
      : emptyArr(),
    environmental_sources: Array.isArray(parsed?.environmental_sources)
      ? parsed.environmental_sources.map(String)
      : emptyArr(),
    environmental_finding: normalizeCategoryFinding(parsed?.environmental_finding),

    political_summary: parsed?.political_summary ?? null,
    political_sources: Array.isArray(parsed?.political_sources)
      ? parsed.political_sources.map(String)
      : emptyArr(),
    political_finding: normalizeCategoryFinding(parsed?.political_finding),

    product_health: healthFlag
      ? parsed?.product_health != null && parsed.product_health !== ''
        ? String(parsed.product_health)
        : null
      : null,
    product_health_sources: Array.isArray(parsed?.product_health_sources)
      ? parsed.product_health_sources.map(String)
      : emptyArr(),
    product_health_finding: healthFlag
      ? normalizeCategoryFinding(parsed?.product_health_finding)
      : null,

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

    press_outlets: normalizePressOutletsFromParsed(parsed?.press_outlets),

    concern_axis_booleans,

    is_stub_investigation: parsed?.is_stub_investigation ?? false,
  };

  attachProportionalityToInvestigation(inv, parsed, healthFlag);

  if (!healthFlag) {
    inv.product_health = null;
    inv.product_health_sources = [];
    inv.product_health_evidence_grade = null;
    inv.product_health_finding = null;
    inv.product_health_proportionality_packet = null;
    inv.product_health_applicable_statutes = [];
    inv.product_health_proportionality = null;
    inv.product_health_violation_type = null;
    inv.product_health_charge_status = null;
    inv.product_health_amount_involved = null;
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
  const brand_slug = resolveIncumbentSlug(inv.brand, inv.parent);
  let press_outlets = Array.isArray(inv.press_outlets) ? inv.press_outlets : [];
  if (!press_outlets.length) {
    press_outlets = getPressOutletsForSlug(brand_slug);
  }
  const axes = Array.isArray(inv.concern_axis_booleans) ? inv.concern_axis_booleans.map(String) : [];
  const mergedConcern = [...new Set([...deriveConcernFlags(inv), ...axes])];
  const { concern_axis_booleans: _omitAxes, ...invRest } = inv;
  const base = {
    ...invRest,
    brand_slug,
    press_outlets,
    concern_flags: mergedConcern,
    profile_type: profileType,
    last_updated: new Date().toISOString().slice(0, 10),
  };
  return {
    ...base,
    share_risk_tier: assignShareRiskTier(base),
  };
}

/**
 * Last-resort realtime-shaped profile: full card shape with "Research pending" sections (never empty / broken).
 * @param {string} reason — short internal reason for logging
 * @param {boolean} [markLiveFailed=true] — set live_investigation_failed when APIs could not produce live research
 */
function buildRealtimeEmergencyProfile(
  brandName,
  corporateParent,
  healthFlag,
  _productCategory,
  reason,
  markLiveFailed = true
) {
  const safeReason = String(reason || 'research incomplete').slice(0, 200);
  const label = typeof brandName === 'string' && brandName.trim() ? brandName.trim() : 'This brand';
  const inv = normalizeInvestigation(
    {
      brand: brandName || 'Unknown',
      parent: corporateParent ?? null,
      subsidiaries: [],
      is_stub_investigation: true,
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
  const finalized = finalizeInvestigation(inv, 'realtime_search');
  return markLiveFailed ? { ...finalized, live_investigation_failed: true } : finalized;
}

/** @deprecated Prefer full realtime path; still returns realtime_search shape for compatibility */
export function buildLimited(brandName, corporateParent, healthFlag) {
  return buildRealtimeEmergencyProfile(
    brandName,
    corporateParent,
    healthFlag,
    'other',
    'legacy limited stub',
    false
  );
}

/**
 * @param {import('pg').QueryResultRow} row
 */
function incumbentRowToInvestigation(row, brandName, corporateParent, healthFlag) {
  let inv;
  /** @type {Record<string, unknown> | null} */
  let deepResearch = null;
  if (row.profile_json) {
    let data =
      typeof row.profile_json === 'string' ? JSON.parse(row.profile_json) : row.profile_json;
    deepResearch = extractDeepResearchFromProfileJson(data);
    data = flattenNestedProfileJson(data);
    inv = normalizeInvestigation(data, brandName, corporateParent, healthFlag);
  } else {
    const parsed = relationalRowToParsed(row);
    inv = normalizeInvestigation(parsed, brandName, corporateParent, healthFlag);
  }
  let finalized = finalizeInvestigation(inv, 'database');
  if (
    deepResearch &&
    Array.isArray(deepResearch.per_category) &&
    deepResearch.per_category.length > 0
  ) {
    applyDeepResearchToInvestigation(finalized, deepResearch, healthFlag);
    finalized = finalizeInvestigation(
      { ...finalized, concern_axis_booleans: inv.concern_axis_booleans || [] },
      'database'
    );
  }
  if (typeof deepResearch?.generated_at === 'string' && deepResearch.generated_at.trim()) {
    finalized.last_deep_researched = deepResearch.generated_at.trim();
  }
  const lr = row.last_researched;
  finalized.last_updated =
    lr instanceof Date ? lr.toISOString().slice(0, 10) : lr ? String(lr).slice(0, 10) : finalized.last_updated;
  if (!healthFlag) {
    finalized.product_health = null;
    finalized.product_health_sources = [];
  }
  return finalized;
}

/**
 * When live investigation fails, serve incumbent_profiles row for the resolved slug with a degraded banner.
 * @param {string | null | undefined} reason
 */
async function fetchDegradedCachedInvestigation(brandName, corporateParent, healthFlag, reason) {
  if (!pool) return null;
  const slug = resolveIncumbentSlug(brandName, corporateParent);
  try {
    const { rows } = await pool.query(
      `SELECT *
       FROM incumbent_profiles
       WHERE brand_slug = $1
       LIMIT 1`,
      [slug]
    );
    const row = rows[0];
    if (!row) return null;
    const inv = incumbentRowToInvestigation(row, brandName, corporateParent, healthFlag);
    const tail =
      typeof reason === 'string' && reason.trim()
        ? ` (${String(reason).slice(0, 160)})`
        : '';
    const degraded = {
      ...inv,
      service_degraded: true,
      degraded_message: `Live research was unavailable${tail}. Showing the indexed public record on file for this brand.`,
    };
    kickPerimeterCheckForInvestigation(degraded);
    return degraded;
  } catch (e) {
    console.warn('[investigation] degraded cache lookup failed', e?.message || e);
    return null;
  }
}

async function realtimeEmergencyOrDegraded(brandName, corporateParent, healthFlag, productCategory, reason) {
  const cached = await fetchDegradedCachedInvestigation(brandName, corporateParent, healthFlag, reason);
  if (cached) {
    return wrapRealtimeInvestigationResult(cached, null);
  }
  return wrapRealtimeInvestigationResult(
    buildRealtimeEmergencyProfile(brandName, corporateParent, healthFlag, productCategory, reason),
    null
  );
}

/**
 * @param {{ recentNewsOnly?: boolean }} [promptOptions] — when recentNewsOnly, restrict web search to ~last 30 days (delta pass)
 */
export function buildResearchPrompt(brandName, corporateParent, healthFlag, productCategory, promptOptions = {}) {
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
  "tax_finding": string | null,
  "tax_flags": string[],
  "tax_sources": string[],
  "legal_summary": string | null,
  "legal_finding": string | null,
  "legal_flags": string[],
  "legal_sources": string[],
  "labor_summary": string | null,
  "labor_finding": string | null,
  "labor_flags": string[],
  "labor_sources": string[],
  "environmental_summary": string | null,
  "environmental_finding": string | null,
  "environmental_flags": string[],
  "environmental_sources": string[],
  "political_summary": string | null,
  "political_finding": string | null,
  "political_sources": string[],
  "product_health": string | null,
  "product_health_finding": string | null,
  "product_health_sources": string[],
  "tax_evidence_grade": { "level": "established"|"strong"|"moderate"|"limited"|"alleged", "source_types": string[], "note": string | null },
  "legal_evidence_grade": { "level": "...", "source_types": string[], "note": string | null },
  "labor_evidence_grade": { "level": "...", "source_types": string[], "note": string | null },
  "environmental_evidence_grade": { "level": "...", "source_types": string[], "note": string | null },
  "political_evidence_grade": { "level": "...", "source_types": string[], "note": string | null },
  "product_health_evidence_grade": { "level": "...", "source_types": string[], "note": string | null } | null,
  "executive_summary": string | null,
  "executive_sources": string[],
  "overall_concern_level": "critical" | "high" | "significant" | "moderate" | "low" | "minor" | "clean" | "unknown",
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

Per-category one-line findings — include tax_finding, legal_finding, labor_finding, environmental_finding, political_finding, and product_health_finding (omit or null when product_health is null). Each is one sentence, maximum 15 words, stating the single most consequential documented fact about this company in that category. No hedging language. No phrasing like "allegations of." State what the record shows. If nothing credible exists in that category, use null.

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
${healthFlag ? '- product_health must summarize documented health implications for this product category, with sources.' : '- Set product_health, product_health_finding, and product_health_sources to null and [].'}
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

Do not include profile_type or last_updated in the JSON.${
    promptOptions.recentNewsOnly
      ? `

CRITICAL — Recent delta only: Only find news and regulatory actions from the last 30 days (relative to today). Do not repeat or summarize historical enforcement, old settlements, or long-running cases that would already appear in a full public-record profile. If nothing material appeared in the last 30 days, say so clearly in each section and keep summaries minimal. For timeline: include only events from the last 30 days, or use an empty array.

Never state a specific calendar end date or year for the "30-day window" (e.g. do not write "window ending April 15, 2025"). If you mention recency, say only that findings are from roughly the last 30 days — the product will stamp authoritative dates.`
      : ''
  }`;
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
        content: `Extract ONE valid JSON object for a corporate investigation of "${brandName}" from the text below. The JSON must match the investigation schema (brand, parent, subsidiaries, summaries, tax_finding/legal_finding/labor_finding/environmental_finding/political_finding/product_health_finding, flags, sources, evidence grades, overall_concern_level, verdict_tags, timeline, community_impact, generated_headline, product_health fields, and notable_mentions when present for restaurants). Output ONLY the JSON — no markdown, no commentary. If a value is missing use null or [].

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

    if (lastResponse.usage) {
      const u = lastResponse.usage;
      console.log(
        `[investigation] tokens step=${step + 1} input=${u.input_tokens ?? 0} output=${u.output_tokens ?? 0} cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0}`
      );
    }

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

  if (lastResponse?.usage) {
    const u = lastResponse.usage;
    const inputCost = ((u.input_tokens ?? 0) / 1_000_000) * 3.0;
    const outputCost = ((u.output_tokens ?? 0) / 1_000_000) * 15.0;
    console.log(
      `[investigation] cost_estimate step_final input_tokens=${u.input_tokens ?? 0} output_tokens=${u.output_tokens ?? 0} est_usd=$${(inputCost + outputCost).toFixed(4)}`
    );
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
    _unparseable: true,
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

async function extractParsedFromPlainText(text, brandLabel) {
  let parsed = parseInvestigationJson(text);
  if (!parsed && text?.trim()) {
    try {
      parsed = await repairInvestigationJson(brandLabel, text);
    } catch (err) {
      console.warn('[investigation] realtime: plain-text repair failed:', err?.message || err);
    }
  }
  return parsed;
}

/**
 * @param {Record<string, unknown>} parsed
 * @param {string[]} citationUrls
 * @param {string | null | undefined} investigationProvider — claude_web | gemini | gemini+claude_verify | perplexity | gemini (fallback)
 */
async function finalizeRealtimeFromParsed(
  parsed,
  citationUrls,
  brandName,
  corporateParent,
  healthFlag,
  investigationProvider
) {
  console.log('[investigation] realtime: finalize + return');
  mergeSourcesWithCitations(parsed, citationUrls);
  const inv = normalizeInvestigation(parsed, brandName, corporateParent, healthFlag);
  const investigation = finalizeInvestigation(inv, 'realtime_search');
  const provider = investigationProvider || 'claude';
  investigation.investigation_provider = provider;
  if (provider === 'claude' || provider === 'claude_web') {
    recordProviderSuccess('claude');
  } else if (provider === 'perplexity') {
    recordProviderSuccess('perplexity');
  } else if (provider === 'gemini') {
    recordProviderSuccess('gemini');
  } else if (provider === 'gemini+claude_verify') {
    recordProviderSuccess('gemini');
    recordProviderSuccess('claude');
  }

  try {
    await corroborateLayerC(investigation);
  } catch (e) {
    console.warn('[corroboration] pipeline error (non-fatal):', e?.message || e);
    investigation.corroboration_ran = false;
    investigation.corroboration_skipped_reason = 'pipeline_error';
  }

  const slugForDb = investigation.brand_slug;
  const parentCo = investigation.parent ?? null;
  const profileJsonForDb = {
    ...parsed,
    brand_slug: slugForDb,
    brand_name: investigation.brand,
    parent_company: parentCo,
    ultimate_parent:
      typeof parsed.ultimate_parent === 'string' && parsed.ultimate_parent.trim()
        ? parsed.ultimate_parent.trim()
        : parentCo != null
          ? String(parentCo)
          : null,
    profile_type: 'database',
  };
  mergeLayerCCorroborationIntoProfileJson(investigation, profileJsonForDb);

  const isStub = Boolean(
    parsed?._stub === true ||
      parsed?._emergency === true ||
      parsed?._unparseable === true ||
      (typeof parsed?.executive_summary === 'string' && parsed.executive_summary.length < 120) ||
      (!parsed?.legal_summary && !parsed?.tax_summary)
  );
  investigation.is_stub_investigation = isStub || Boolean(investigation.is_stub_investigation);

  return wrapRealtimeInvestigationResult(investigation, profileJsonForDb);
}

async function realtimeInvestigation(brandName, corporateParent, healthFlag, productCategory, promptOptions = {}) {
  const recentOnly = Boolean(promptOptions.recentNewsOnly);
  let costRoute = resolveInvestigationRoute(brandName, corporateParent);
  if (recentOnly && costRoute !== 'claude_web') {
    costRoute = 'claude_web';
    console.log('[investigation] realtime: recentNewsOnly forces cost_route=claude_web');
  }
  console.log(
    `[investigation] realtimeInvestigation start brand=${brandName || '\u2205'} parent=${corporateParent || '\u2205'} category=${productCategory || '\u2205'} recentOnly=${recentOnly} cost_route=${costRoute}`
  );

  const cacheKey = `inv:${(brandName || '').toLowerCase().trim()}:${(corporateParent || '').toLowerCase().trim()}`;
  if (!recentOnly) {
    const cached = investigationCache.get(cacheKey);
    if (cached) {
      console.log(`[investigation] cache hit: ${cacheKey}`);
      return cached;
    }
  }

  const userPrompt = buildResearchPrompt(brandName, corporateParent, healthFlag, productCategory, promptOptions);

  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }];

  const brandLabel = brandName || corporateParent || 'Brand';

  let msg;
  let citationUrls = [];
  /** @type {'claude_web' | 'gemini' | 'gemini+claude_verify'} */
  let primaryProvider = 'claude_web';

  async function runClaudeWebWithRetry() {
    try {
      ({ message: msg, citationUrls } = await runInvestigationAnthropicTurn(userPrompt, tools));
    } catch (e) {
      console.warn('[investigation] realtime: web search path threw, retrying without tools:', e?.message || e);
      const fallbackPrompt = `${userPrompt}

If web search is unavailable, use only well-established public knowledge. Use overall_concern_level "moderate" when evidence is thin; explain gaps in executive_summary. Still output valid JSON.`;
      ({ message: msg, citationUrls } = await runInvestigationAnthropicTurn(fallbackPrompt, null));
    }
    primaryProvider = 'claude_web';
  }

  try {
    if (costRoute === 'claude_web') {
      await runClaudeWebWithRetry();
    } else if (costRoute === 'gemini_only') {
      if (!process.env.GEMINI_API_KEY) {
        console.warn('[investigation] realtime: gemini_only route but GEMINI_API_KEY missing - Claude web');
        await runClaudeWebWithRetry();
      } else {
        try {
          const textGem = await runGeminiInvestigationDraft(userPrompt);
          msg = { role: 'assistant', content: [{ type: 'text', text: textGem }] };
          citationUrls = [];
          primaryProvider = 'gemini';
        } catch (ge) {
          console.warn('[investigation] realtime: Gemini draft failed - Claude web', ge?.message || ge);
          await runClaudeWebWithRetry();
        }
      }
    } else {
      if (!process.env.GEMINI_API_KEY || !process.env.ANTHROPIC_API_KEY) {
        console.warn('[investigation] realtime: gemini_claude_verify route missing keys - Claude web');
        await runClaudeWebWithRetry();
      } else {
        try {
          const draft = await runGeminiInvestigationDraft(userPrompt);
          const verified = await runClaudeInvestigationVerify(brandLabel, draft);
          msg = { role: 'assistant', content: [{ type: 'text', text: verified }] };
          citationUrls = [];
          primaryProvider = 'gemini+claude_verify';
        } catch (e) {
          console.warn('[investigation] realtime: Gemini+verify failed - Claude web', e?.message || e);
          await runClaudeWebWithRetry();
        }
      }
    }
  } catch (e2) {
    console.error('[investigation] realtime: primary investigation path failed', e2);
    recordProviderFailure('claude');
    const fb = await runInvestigationTextFallbackChain(userPrompt);
    if (fb) {
      const p = await extractParsedFromPlainText(fb.text, brandLabel);
      if (p) {
        return await finalizeRealtimeFromParsed(
          p,
          citationUrls,
          brandName,
          corporateParent,
          healthFlag,
          fb.provider
        );
      }
    }
    return realtimeEmergencyOrDegraded(
      brandName,
      corporateParent,
      healthFlag,
      productCategory,
      e2?.message || 'API error'
    );
  }

  let { text, parsed } = await extractParsedFromAssistantMessage(msg, brandLabel);


  if (!parsed || realtimeParsedIsIncomplete(parsed)) {
    const reason = !parsed ? 'no parseable JSON' : 'incomplete legal/tax/concern fields';
    console.log(
      `[investigation] realtime: ${reason} — gap-fill via text fallback chain (Perplexity/Gemini); Claude JSON repair only if still incomplete/unparseable`
    );

    const fb = await runInvestigationTextFallbackChain(userPrompt);
    if (fb) {
      let gapParsed = parseInvestigationJson(fb.text);
      if (gapParsed) {
        parsed = mergeRealtimeParsed(parsed, gapParsed);
      }
      if ((!parsed || realtimeParsedIsIncomplete(parsed)) && fb.text?.trim()) {
        try {
          console.log('[investigation] realtime: gap-fill still incomplete — Claude repairInvestigationJson');
          const repaired = await repairInvestigationJson(brandLabel, fb.text);
          if (repaired) {
            parsed = mergeRealtimeParsed(parsed, repaired);
          }
        } catch (e) {
          console.warn('[investigation] realtime: Claude JSON repair (gap-fill) failed:', e?.message || e);
        }
      }
      if ((!parsed || realtimeParsedIsIncomplete(parsed)) && text?.trim() && fb.text?.trim()) {
        try {
          const combined = `${String(text).trim()}\n\n---\n\n${String(fb.text).trim()}`;
          console.log('[investigation] realtime: Claude repairInvestigationJson on combined first-pass + gap-fill text');
          const repaired = await repairInvestigationJson(brandLabel, combined);
          if (repaired) {
            parsed = mergeRealtimeParsed(parsed, repaired);
          }
        } catch (e) {
          console.warn('[investigation] realtime: Claude JSON repair (combined) failed:', e?.message || e);
        }
      }
      if (!text && fb.text?.trim()) text = fb.text;
    }
  }

  if (!parsed || realtimeParsedIsIncomplete(parsed)) {
    const fb = await runInvestigationTextFallbackChain(userPrompt);
    if (fb) {
      const p = await extractParsedFromPlainText(fb.text, brandLabel);
      if (p) {
        parsed = mergeRealtimeParsed(parsed, p);
      }
    }
  }

  if (!parsed) {
    console.log(
      '[investigation] realtime: still no parseable JSON after fallback — using thin stub (API did not throw)'
    );
    parsed = buildUnparseableRealtimeStub(brandName, corporateParent, healthFlag, text);
  }

  const result = await finalizeRealtimeFromParsed(
    parsed,
    citationUrls,
    brandName,
    corporateParent,
    healthFlag,
    primaryProvider
  );
  if (!recentOnly && result && !result.investigation?.is_stub_investigation) {
    investigationCache.set(cacheKey, result);
    console.log(`[investigation] cache set: ${cacheKey} size=${investigationCache.size}`);
  }
  return result;
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

/** Mirrors PostgreSQL `length(profile_json::text)` closely enough for stub detection (see STUB_PROFILE_JSON_MAX_CHARS). */
function incumbentProfileJsonCharLength(profileJson) {
  if (profileJson == null) return 0;
  if (typeof profileJson === 'string') return profileJson.length;
  try {
    return JSON.stringify(profileJson).length;
  } catch {
    return 0;
  }
}

const STUB_PROFILE_JSON_MAX_CHARS = 5000;

/** URLs to persist on stub upgrade (nested v3 sections + flat realtime schema). */
function collectPrimarySourcesForStorage(rec) {
  if (!rec || typeof rec !== 'object') return [];
  const urls = [];
  const nestedKeys = [
    'tax',
    'legal',
    'labor',
    'environmental',
    'political',
    'executives',
    'connections',
    'allegations',
    'health_record',
  ];
  for (const k of nestedKeys) {
    const block = rec[k];
    if (block && typeof block === 'object' && Array.isArray(block.sources)) {
      urls.push(...block.sources.map(String));
    }
  }
  const flatKeys = [
    'tax_sources',
    'legal_sources',
    'labor_sources',
    'environmental_sources',
    'political_sources',
    'executive_sources',
    'product_health_sources',
  ];
  for (const k of flatKeys) {
    if (Array.isArray(rec[k])) urls.push(...rec[k].map(String));
  }
  if (Array.isArray(rec.primary_sources)) urls.push(...rec.primary_sources.map(String));
  return [...new Set(urls.filter(Boolean))];
}

/**
 * Persist live investigation output over a thin DB row (organic cache warming).
 * @param {string} slug
 * @param {Record<string, unknown>} profileJsonForDb
 * @param {Record<string, unknown>} investigation
 */
async function upsertIncumbentAfterStubUpgrade(slug, profileJsonForDb, investigation) {
  if (!pool) return;
  const verdict_tags = Array.isArray(investigation.verdict_tags)
    ? investigation.verdict_tags.map(String)
    : [];
  const overall =
    typeof investigation.overall_concern_level === 'string'
      ? investigation.overall_concern_level
      : null;
  const summary =
    typeof investigation.executive_summary === 'string' ? investigation.executive_summary : null;
  const primary = collectPrimarySourcesForStorage(profileJsonForDb);
  const brand_name =
    (typeof investigation.brand === 'string' && investigation.brand.trim()) ||
    (typeof profileJsonForDb.brand_name === 'string' && profileJsonForDb.brand_name.trim()) ||
    slug;
  const parent =
    investigation.parent != null
      ? investigation.parent
      : profileJsonForDb.parent_company ?? profileJsonForDb.parent ?? null;
  const ultimate =
    typeof profileJsonForDb.ultimate_parent === 'string'
      ? profileJsonForDb.ultimate_parent
      : parent != null
        ? String(parent)
        : null;
  const subs = Array.isArray(investigation.subsidiaries)
    ? investigation.subsidiaries.map(String)
    : Array.isArray(profileJsonForDb.subsidiaries)
      ? profileJsonForDb.subsidiaries.map(String)
      : null;

  await pool.query(
    `UPDATE incumbent_profiles SET
       brand_name = COALESCE($2, brand_name),
       parent_company = $3,
       ultimate_parent = $4,
       known_subsidiaries = $5,
       profile_json = $6::jsonb,
       verdict_tags = $7,
       overall_concern_level = $8,
       investigation_summary = $9,
       primary_sources = $10,
       last_researched = CURRENT_DATE,
       research_confidence = $11,
       updated_at = NOW(),
       profile_type = 'database'
     WHERE brand_slug = $1`,
    [
      slug,
      brand_name,
      parent != null ? String(parent) : null,
      ultimate,
      subs,
      JSON.stringify(profileJsonForDb),
      verdict_tags,
      overall,
      summary,
      primary,
      'high',
    ]
  );
}

function wrapRealtimeInvestigationResult(investigation, profileJsonForDb) {
  return { investigation, profileJsonForDb: profileJsonForDb ?? null };
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
  const rawVisionSlug = brandSlug(brandName || corporateParent);
  const investigationCacheKey = `inv:${(brandName || '').toLowerCase().trim()}:${(corporateParent || '').toLowerCase().trim()}`;
  console.log('[investigation] getInvestigationProfile:start', {
    brandName,
    corporateParent,
    slug,
    rawVisionSlug,
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
      let row = rows[0];
      if (!row && slug) {
        const strippedSlug = slug.replace(LEGAL_ENTITY_SLUG_SUFFIX_RE, '');
        if (strippedSlug !== slug && strippedSlug.length >= 2) {
          const { rows: altRows } = await pool.query(
            `SELECT *
             FROM incumbent_profiles
             WHERE brand_slug = $1
             LIMIT 1`,
            [strippedSlug]
          );
          row = altRows[0];
        }
      }
      if (!row) {
        const fuzzyCandidate = [slug, rawVisionSlug]
          .filter((s) => typeof s === 'string' && s.length >= 3)
          .sort((a, b) => b.length - a.length)[0];
        if (fuzzyCandidate) {
          row = await fetchIncumbentRowFuzzyMatch(brandName, corporateParent, fuzzyCandidate);
        }
      }
      if (row) {
        const profileJsonChars = incumbentProfileJsonCharLength(row.profile_json);
        const drForStubGate = extractDeepResearchFromProfileJson(row.profile_json);
        const hasStoredDeepResearch = Boolean(drForStubGate?.per_category?.length);
        if (profileJsonChars < STUB_PROFILE_JSON_MAX_CHARS && !hasStoredDeepResearch) {
          console.log('[STUB UPGRADE]', slug);
          try {
            const rt = await realtimeInvestigation(
              brandName,
              corporateParent,
              healthFlag,
              productCategory
            );
            const upgraded = rt.investigation ?? rt;
            let stubPersisted = false;
            if (rt.profileJsonForDb && pool) {
              try {
                await upsertIncumbentAfterStubUpgrade(slug, rt.profileJsonForDb, upgraded);
                stubPersisted = true;
              } catch (upErr) {
                console.error('[STUB UPGRADE] upsert failed', slug, upErr);
              }
            }
            if (!healthFlag) {
              upgraded.product_health = null;
              upgraded.product_health_sources = [];
            }
            const today = new Date().toISOString().slice(0, 10);
            const out = stubPersisted
              ? { ...upgraded, profile_type: 'database', last_updated: today, data_source: 'live_only' }
              : { ...upgraded, data_source: 'live_only' };
            kickPerimeterCheckForInvestigation(out);
            logInvestigationProfileEnd(stubPersisted ? 'database_stub_upgrade' : 'stub_upgrade_realtime_only', out);
            return out;
          } catch (e) {
            console.error('[STUB UPGRADE] realtime failed', slug, e);
            /* fall through: return thin DB row */
          }
        }

        console.log('[investigation] getInvestigationProfile:route', { slug, source: 'database' });
        let out = incumbentRowToInvestigation(row, brandName, corporateParent, healthFlag);
        const dr = extractDeepResearchFromProfileJson(row.profile_json);
        const hasDeepCategories = Boolean(dr?.per_category?.length);
        /** Default OFF: deep profiles are served from Postgres only (no extra Claude on every /tap). Set INVESTIGATION_LIVE_NEWS_MERGE=1 to re-enable the ~30d live news delta pass. */
        const allowLiveNewsMerge = process.env.INVESTIGATION_LIVE_NEWS_MERGE === '1';

        /**
         * @param {string} [dataSource]
         */
        const applyStoredDeepResearchOnly = (dataSource) => {
          out = finalizeInvestigation(
            { ...out, concern_axis_booleans: out.concern_axis_booleans || [] },
            'database'
          );
          if (dr && Array.isArray(dr.per_category) && dr.per_category.length > 0) {
            out.deep_research_categories = buildDeepResearchCategoriesForClient(dr);
          }
          const lr = row.last_researched;
          out.last_updated =
            lr instanceof Date
              ? lr.toISOString().slice(0, 10)
              : lr
                ? String(lr).slice(0, 10)
                : out.last_updated;
          if (typeof dr?.generated_at === 'string' && dr.generated_at.trim()) {
            out.last_deep_researched = dr.generated_at.trim();
          }
          out.data_source = dataSource;
        };

        if (hasDeepCategories) {
          if (allowLiveNewsMerge) {
            const lr = row.last_researched;
            try {
              const rt = await realtimeInvestigation(brandName, corporateParent, healthFlag, productCategory, {
                recentNewsOnly: true,
              });
              const live = rt.investigation ?? rt;
              mergeLiveInvestigationDelta(out, live, healthFlag);
              out = finalizeInvestigation(
                { ...out, concern_axis_booleans: out.concern_axis_booleans || [] },
                'database'
              );
              if (dr && Array.isArray(dr.per_category) && dr.per_category.length > 0) {
                out.deep_research_categories = buildDeepResearchCategoriesForClient(dr);
              }
              out.last_updated =
                lr instanceof Date
                  ? lr.toISOString().slice(0, 10)
                  : lr
                    ? String(lr).slice(0, 10)
                    : out.last_updated;
              if (typeof dr?.generated_at === 'string' && dr.generated_at.trim()) {
                out.last_deep_researched = dr.generated_at.trim();
              }
              out.data_source = 'deep_research+live';
            } catch (e) {
              console.error('[investigation] deep profile: recent-news pass failed', slug, e);
              applyStoredDeepResearchOnly('database_deep_research');
              out = {
                ...out,
                live_investigation_failed: true,
              };
            }
          } else {
            applyStoredDeepResearchOnly('database_deep_research');
            console.log('[investigation] using stored deep_research only (INVESTIGATION_LIVE_NEWS_MERGE is not 1)', {
              slug,
            });
          }
        } else {
          out = { ...out, data_source: 'database' };
        }

        kickPerimeterCheckForInvestigation(out);
        const endLabel =
          hasDeepCategories && out.data_source === 'deep_research+live'
            ? 'database_deep_plus_live'
            : hasDeepCategories && (out.data_source === 'database_deep_research' || out.live_investigation_failed)
              ? 'database_deep_research'
              : 'database';
        logInvestigationProfileEnd(endLabel, out);
        if (out && !out.is_stub_investigation && out.data_source !== 'deep_research+live') {
          investigationCache.set(investigationCacheKey, out);
        }
        return out;
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
    const inv = { ...(rt.investigation ?? rt), data_source: 'live_only' };
    logInvestigationProfileEnd('realtime', inv);
    return inv;
  } catch (e) {
    console.error('getInvestigationProfile realtime failed', e);
    const degraded = await fetchDegradedCachedInvestigation(
      brandName,
      corporateParent,
      healthFlag,
      e?.message || 'unexpected error'
    );
    if (degraded) {
      logInvestigationProfileEnd('realtime_degraded_cache', degraded);
      return degraded;
    }
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

/**
 * DB-only investigation snapshot for permalinks (no live or delta investigation calls).
 * @param {string} brandSlug
 * @param {{ healthFlag?: boolean }} [options]
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function getStoredInvestigationBySlug(brandSlug, options = {}) {
  if (!pool) return null;
  let slug = String(brandSlug || '').trim();
  try {
    slug = decodeURIComponent(slug);
  } catch {
    /* keep raw */
  }
  slug = slug.toLowerCase();
  if (!slug) return null;
  const healthFlag = Boolean(options.healthFlag);
  try {
    const { rows } = await pool.query(
      `SELECT *
       FROM incumbent_profiles
       WHERE brand_slug = $1
       LIMIT 1`,
      [slug]
    );
    const row = rows[0];
    if (!row) return null;
    const brandName = row.brand_name != null ? String(row.brand_name) : slug;
    const parent = row.parent_company != null ? String(row.parent_company) : null;
    const inv = incumbentRowToInvestigation(row, brandName, parent, healthFlag);
    return { ...inv, permalink_source: 'database' };
  } catch (e) {
    console.error('[investigation] getStoredInvestigationBySlug failed', e?.message || e);
    return null;
  }
}
