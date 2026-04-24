import { brandSlug, resolveIncumbentSlug } from './investigation.js';

/** @typedef {'red_erratic' | 'green_steady' | 'yellow_flicker'} SceneTier */

const SEVERE_CONCERN = new Set(['significant', 'high', 'critical']);

/**
 * @param {unknown} pj
 * @returns {Record<string, unknown> | null}
 */
function parseProfileJson(pj) {
  if (pj && typeof pj === 'object' && !Array.isArray(pj)) return pj;
  if (typeof pj === 'string') {
    try {
      const o = JSON.parse(pj);
      return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * @param {Record<string, unknown> | null} pj
 */
function cleanCardFromProfileJson(pj) {
  if (!pj) return false;
  if (pj.clean_card === true) return true;
  const prof = pj.profile;
  if (prof && typeof prof === 'object' && prof.clean_card === true) return true;
  return false;
}

/**
 * @param {import('pg').QueryResultRow} row
 * @param {Record<string, unknown> | null} pj
 * @returns {string[]}
 */
function mergedVerdictTags(row, pj) {
  /** @type {string[]} */
  const out = [];
  const push = (t) => {
    const s = String(t).trim();
    if (s) out.push(s);
  };
  if (Array.isArray(row.verdict_tags)) {
    for (const t of row.verdict_tags) push(t);
  }
  if (pj && Array.isArray(pj.verdict_tags)) {
    for (const t of pj.verdict_tags) push(t);
  }
  const prof = pj?.profile;
  if (prof && typeof prof === 'object' && Array.isArray(prof.verdict_tags)) {
    for (const t of prof.verdict_tags) push(t);
  }
  const seen = new Map();
  for (const t of out) {
    const k = t.toLowerCase();
    if (!seen.has(k)) seen.set(k, t);
  }
  return [...seen.values()];
}

/**
 * @param {string[]} tagsLower
 * @returns {boolean}
 */
function hasStrongLaborOrEnvironmentalSignal(tagsLower) {
  return tagsLower.some((t) => {
    if (t.includes('wage_theft') || t.includes('wage-theft')) return true;
    if (t.includes('labor_violat') || t.includes('child_labor') || t.includes('forced_labor'))
      return true;
    if (t.includes('union_suppression') || t.includes('osha')) return true;
    if (t.startsWith('dol_') || t.includes('dol_settlement')) return true;
    if (t.includes('immigrant_worker') && t.includes('wage')) return true;
    if (t.includes('environmental_violat') || t.includes('pollution') || t.includes('epa_'))
      return true;
    if (t.includes('deforestation') || t.includes('toxic') || t.includes('spill')) return true;
    return false;
  });
}

/**
 * @param {Record<string, unknown> | null} pj
 * @param {string} concern */
function concernFlagsLaborOrEnv(pj, concern) {
  if (!pj || typeof pj.concern_flags !== 'object' || pj.concern_flags === null) return false;
  const f = /** @type {Record<string, unknown>} */ (pj.concern_flags);
  const labor = f.labor === true;
  const env = f.environmental === true;
  if (!labor && !env) return false;
  return ['moderate', 'significant', 'high', 'critical', 'low', 'unknown'].includes(concern);
}

/**
 * Map Black Book fields to MTO overlay tier (corporate accountability only).
 *
 * @param {{
 *   overallConcern: string;
 *   verdictTagsLower: string[];
 *   cleanCard: boolean;
 *   concernFlagsSignal: boolean;
 * }} args
 * @returns {SceneTier}
 */
export function computeSceneTier(args) {
  const concern = args.overallConcern || 'unknown';
  const tags = args.verdictTagsLower;
  const strongIssues = hasStrongLaborOrEnvironmentalSignal(tags) || args.concernFlagsSignal;

  if (SEVERE_CONCERN.has(concern)) {
    return 'red_erratic';
  }
  if (strongIssues && concern !== 'clean' && concern !== 'minor' && !args.cleanCard) {
    return 'red_erratic';
  }

  if (concern === 'clean' || args.cleanCard) {
    return 'green_steady';
  }
  if (concern === 'minor' && !strongIssues) {
    return 'green_steady';
  }

  return 'yellow_flicker';
}

/**
 * @param {import('pg').QueryResultRow} row
 */
export function sceneTierFromIncumbentRow(row) {
  const pj = parseProfileJson(row.profile_json);
  const fromPj =
    pj && typeof pj.overall_concern_level === 'string' ? String(pj.overall_concern_level) : '';
  const fromCol = row.overall_concern_level != null ? String(row.overall_concern_level) : '';
  const overallConcern = String(fromPj || fromCol || 'unknown')
    .trim()
    .toLowerCase();

  const tagList = mergedVerdictTags(row, pj);
  const verdictTagsLower = tagList.map((t) => t.toLowerCase());
  const cleanCard = cleanCardFromProfileJson(pj);
  const concernFlagsSignal = concernFlagsLaborOrEnv(pj, overallConcern);

  const scene_tier = computeSceneTier({
    overallConcern,
    verdictTagsLower,
    cleanCard,
    concernFlagsSignal,
  });

  return {
    scene_tier,
    overall_concern_level: overallConcern,
    verdict_tags: tagList,
    clean_card: cleanCard,
  };
}

/**
 * @param {import('pg').Pool | null} pool
 * @param {string} brandName
 * @param {string | null} [corporateParent]
 */
export async function lookupSceneForBrand(pool, brandName, corporateParent = null) {
  const input = String(brandName || '').trim();
  if (!input) {
    return {
      input: '',
      matched: false,
      brand_slug: null,
      brand_name: null,
      scene_tier: null,
      overall_concern_level: null,
      verdict_tags: [],
    };
  }

  const resolved =
    resolveIncumbentSlug(brandName, corporateParent) || brandSlug(brandName || corporateParent);
  if (!pool) {
    return {
      input,
      matched: false,
      resolved_slug: resolved || null,
      brand_slug: null,
      brand_name: null,
      scene_tier: null,
      overall_concern_level: null,
      verdict_tags: [],
      error: 'database_unavailable',
    };
  }

  try {
    const { rows } = await pool.query(
      `SELECT brand_slug, brand_name, parent_company, overall_concern_level, verdict_tags, profile_json
       FROM incumbent_profiles
       WHERE LOWER(brand_slug) = LOWER($1)
       LIMIT 1`,
      [resolved]
    );
    const row = rows[0];
    if (!row) {
      return {
        input,
        matched: false,
        resolved_slug: resolved,
        brand_slug: null,
        brand_name: null,
        scene_tier: null,
        overall_concern_level: null,
        verdict_tags: [],
      };
    }

    const meta = sceneTierFromIncumbentRow(row);
    return {
      input,
      matched: true,
      resolved_slug: resolved,
      brand_slug: row.brand_slug != null ? String(row.brand_slug) : resolved,
      brand_name: row.brand_name != null ? String(row.brand_name) : input,
      parent_company: row.parent_company != null ? String(row.parent_company) : null,
      scene_tier: meta.scene_tier,
      overall_concern_level: meta.overall_concern_level,
      verdict_tags: meta.verdict_tags,
      clean_card: meta.clean_card,
    };
  } catch (e) {
    console.error('[sceneLookup]', e?.message || e);
    return {
      input,
      matched: false,
      resolved_slug: resolved,
      brand_slug: null,
      brand_name: null,
      scene_tier: null,
      overall_concern_level: null,
      verdict_tags: [],
      error: 'lookup_failed',
    };
  }
}
