/**
 * Cross-category incident counts aligned with GET /api/profiles/:slug/export dedupe.
 */

import { dedupeIndexedMatters, dedupeTimelineEvents } from './enforcementDisplay.js';
import { resolveIncidentActionType } from './enforcementActionType.js';

/**
 * @param {Record<string, unknown>} raw
 * @param {string} categoryKey
 */
function enrichPlacement(raw, categoryKey) {
  if (!raw || typeof raw !== 'object') return /** @type {Record<string, unknown>} */ ({});
  const o = /** @type {Record<string, unknown>} */ ({ ...raw });
  const { action_type } = resolveIncidentActionType(o, categoryKey);
  o.action_type = action_type;
  return o;
}

/**
 * Same placement walk as profileIncidentExport (deep_research.per_category, else client categories, else rollup).
 *
 * @param {Record<string, unknown> | null | undefined} profileLike — profile_json or merged investigation
 * @returns {{ categoryKey: string; raw: Record<string, unknown> }[]}
 */
export function collectIncidentPlacementsFromProfile(profileLike) {
  /** @type {{ categoryKey: string; raw: Record<string, unknown> }[]} */
  const placements = [];
  if (!profileLike || typeof profileLike !== 'object') return placements;

  const dr =
    'deep_research' in profileLike && profileLike.deep_research && typeof profileLike.deep_research === 'object'
      ? /** @type {Record<string, unknown>} */ (profileLike.deep_research)
      : null;

  const per = dr && Array.isArray(dr.per_category) ? dr.per_category : null;

  if (per && per.length) {
    for (const cat of per) {
      if (!cat || typeof cat !== 'object') continue;
      const c = /** @type {Record<string, unknown>} */ (cat);
      const categoryKey = typeof c.category === 'string' ? c.category : '';
      const incidents = Array.isArray(c.incidents) ? c.incidents : [];
      for (const raw of incidents) {
        if (!raw || typeof raw !== 'object') continue;
        placements.push({
          categoryKey: categoryKey || 'unknown',
          raw: /** @type {Record<string, unknown>} */ (raw),
        });
      }
    }
  } else {
    const cats = Array.isArray(profileLike.deep_research_categories)
      ? profileLike.deep_research_categories
      : [];
    for (const cat of cats) {
      if (!cat || typeof cat !== 'object') continue;
      const c = /** @type {Record<string, unknown>} */ (cat);
      const categoryKey = typeof c.category === 'string' ? c.category : '';
      const incidents = Array.isArray(c.incidents) ? c.incidents : [];
      for (const raw of incidents) {
        if (!raw || typeof raw !== 'object') continue;
        placements.push({
          categoryKey: categoryKey || 'unknown',
          raw: /** @type {Record<string, unknown>} */ (raw),
        });
      }
    }
  }

  const topIncidents = dr && Array.isArray(dr.incidents) ? dr.incidents : [];
  if (!placements.length && topIncidents.length) {
    for (const raw of topIncidents) {
      if (!raw || typeof raw !== 'object') continue;
      placements.push({
        categoryKey: 'rollup',
        raw: /** @type {Record<string, unknown>} */ (raw),
      });
    }
  }

  return placements;
}

/**
 * Dedupe map used for export + counts (matter blocks = unique_incident_count in export).
 *
 * @param {{ categoryKey: string; raw: Record<string, unknown> }[]} placements
 */
export function buildMatterAccumulationFromPlacements(placements) {
  const enrichedList = placements.map((p) => enrichPlacement(p.raw, p.categoryKey));
  const { groups } = dedupeIndexedMatters(enrichedList);

  /** @type {Map<object, string>} */
  const refToGroupKey = new Map();
  /** @type {Map<string, { key: string; canonical: object; alternates: object[] }>} */
  const groupByKey = new Map();
  for (const g of groups) {
    groupByKey.set(g.key, g);
    refToGroupKey.set(g.canonical, g.key);
    for (const a of g.alternates) refToGroupKey.set(a, g.key);
  }

  /** @type {Map<string, { categories: Set<string>; canonical: object; alternates: object[]; placement_count: number }>} */
  const matterAccum = new Map();

  for (let i = 0; i < placements.length; i++) {
    const e = enrichedList[i];
    const cat = placements[i].categoryKey;
    const gk = refToGroupKey.get(e);

    if (gk) {
      const g = groupByKey.get(gk);
      if (!g) continue;
      const internalKey = `g:${gk}`;
      let block = matterAccum.get(internalKey);
      if (!block) {
        block = {
          categories: new Set(),
          canonical: g.canonical,
          alternates: g.alternates,
          placement_count: 0,
        };
        matterAccum.set(internalKey, block);
      }
      block.categories.add(cat);
      block.placement_count += 1;
    } else {
      const internalKey = `c:${i}`;
      matterAccum.set(internalKey, {
        categories: new Set([cat]),
        canonical: e,
        alternates: [],
        placement_count: 1,
      });
    }
  }

  return { matterAccum, enrichedList, refToGroupKey, groupByKey };
}

/**
 * @param {Record<string, unknown> | null | undefined} profileLike
 * @returns {{ unique_incident_count: number; category_placement_count: number; additional_placement_count: number }}
 */
export function computeIncidentIndexCounts(profileLike) {
  const placements = collectIncidentPlacementsFromProfile(profileLike);
  const category_placement_count = placements.length;
  if (!category_placement_count) {
    return {
      unique_incident_count: 0,
      category_placement_count: 0,
      additional_placement_count: 0,
    };
  }
  const { matterAccum } = buildMatterAccumulationFromPlacements(placements);
  const unique_incident_count = matterAccum.size;
  return {
    unique_incident_count,
    category_placement_count,
    additional_placement_count: Math.max(0, category_placement_count - unique_incident_count),
  };
}

/**
 * Card provenance: Tier-1 canonical (non-contextual) matter blocks vs placement rows; timeline fallback when no deep rows.
 *
 * @param {Record<string, unknown> | null | undefined} profileLike
 * @returns {{ verifiedEnforcementMatters: number; additionalItems: number }}
 */
export function computeIncidentProvenanceCounts(profileLike) {
  const placements = collectIncidentPlacementsFromProfile(profileLike);
  const category_placement_count = placements.length;

  if (category_placement_count > 0) {
    const { matterAccum } = buildMatterAccumulationFromPlacements(placements);
    let tier1Canonical = 0;
    for (const [, block] of matterAccum) {
      const c = block.canonical;
      const at =
        c && typeof c === 'object' ? String(/** @type {Record<string, unknown>} */ (c).action_type || '') : '';
      if (at !== 'contextual') tier1Canonical += 1;
    }
    return {
      verifiedEnforcementMatters: tier1Canonical,
      additionalItems: Math.max(0, category_placement_count - tier1Canonical),
    };
  }

  const tl = Array.isArray(profileLike?.timeline) ? dedupeTimelineEvents(profileLike.timeline) : [];
  return {
    verifiedEnforcementMatters: tl.length,
    additionalItems: 0,
  };
}
