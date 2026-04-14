/**
 * Structured incident export for researchers (not the signed receipt).
 */

import { createHash } from 'node:crypto';
import {
  normalizeActionType,
  resolveIncidentActionType,
} from '../../client/src/utils/enforcementActionType.js';
import { dedupeIndexedMatters } from '../../client/src/utils/enforcementDisplay.js';
import { extractDeepResearchFromProfileJson } from './deepResearchMerge.js';

/**
 * @param {Record<string, unknown> | null | undefined} raw
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
 * @param {string} prefix
 * @param {string} material
 */
function stableIncidentId(prefix, material) {
  const h = createHash('sha256').update(material).digest('hex').slice(0, 24);
  return `${prefix}_${h}`;
}

/**
 * @param {string} url
 * @param {Record<string, unknown> | null} inc
 */
function sourceTriple(url, inc) {
  let domain = '';
  try {
    domain = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    domain = '';
  }
  const label =
    (inc && typeof inc.agency_or_court === 'string' && inc.agency_or_court.trim()) ||
 (inc && typeof inc.jurisdiction === 'string' && inc.jurisdiction.trim()) ||
    domain ||
    'Source';
  return { url, domain, label };
}

/**
 * @param {string | null | undefined} desc
 */
function titleFromDescription(desc) {
  const t = typeof desc === 'string' ? desc.trim().replace(/\s+/g, ' ') : '';
  if (!t) return '';
  return t.length > 220 ? `${t.slice(0, 217)}…` : t;
}

/**
 * @param {Record<string, unknown>} profileJson — incumbent_profiles.profile_json
 * @param {{ brand_slug: string; brand_name?: string | null }} meta
 */
export function buildStructuredIncidentExport(profileJson, meta) {
  const brand_slug = meta.brand_slug;
  const brand_name =
    (meta.brand_name && String(meta.brand_name).trim()) ||
    (profileJson && typeof profileJson === 'object' && typeof profileJson.brand_name === 'string'
      ? profileJson.brand_name.trim()
      : brand_slug);

  const dr = extractDeepResearchFromProfileJson(profileJson);
  const perCategory = dr && Array.isArray(dr.per_category) ? dr.per_category : [];

  /** @type {{ categoryKey: string; raw: Record<string, unknown> }[]} */
  const placements = [];

  for (const cat of perCategory) {
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

  const category_placement_count = placements.length;

  if (!placements.length) {
    return {
      schema_version: '1.0',
      brand_slug,
      brand_name,
      unique_incident_count: 0,
      category_placement_count: 0,
      generated_at: new Date().toISOString(),
      incidents: [],
    };
  }

  const enrichedList = placements.map((p) => enrichPlacement(p.raw, p.categoryKey));
  const { groups } = dedupeIndexedMatters(enrichedList);

  /** @type {Map<object, string>} */
  const refToGroupKey = new Map();
  const groupByKey = new Map();
  for (const g of groups) {
    groupByKey.set(g.key, g);
    refToGroupKey.set(g.canonical, g.key);
    for (const a of g.alternates) refToGroupKey.set(a, g.key);
  }

  /** @type {Map<string, { categories: Set<string>; canonical: object; alternates: object[]; placement_count: number; sourcesMap: Map<string, { url: string; domain: string; label: string }> }>} */
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
          sourcesMap: new Map(),
        };
        matterAccum.set(internalKey, block);
      }
      block.categories.add(cat);
      block.placement_count += 1;
      for (const inc of [g.canonical, ...g.alternates]) {
        if (!inc || typeof inc !== 'object') continue;
        const u = /** @type {Record<string, unknown>} */ (inc).source_url;
        if (typeof u === 'string' && u.startsWith('http')) {
          const ent = sourceTriple(u.trim(), /** @type {Record<string, unknown>} */ (inc));
          if (!block.sourcesMap.has(ent.url)) block.sourcesMap.set(ent.url, ent);
        }
      }
    } else {
      const internalKey = `c:${i}`;
      const block = {
        categories: new Set([cat]),
        canonical: e,
        alternates: [],
        placement_count: 1,
        sourcesMap: new Map(),
      };
      const u = e.source_url;
      if (typeof u === 'string' && u.startsWith('http')) {
        const ent = sourceTriple(u.trim(), e);
        block.sourcesMap.set(ent.url, ent);
      }
      matterAccum.set(internalKey, block);
    }
  }

  const incidents = [];
  for (const [internalKey, block] of matterAccum) {
    const c = block.canonical;
    if (!c || typeof c !== 'object') continue;
    const co = /** @type {Record<string, unknown>} */ (c);
    const actionRaw = co.action_type;
    const actionResolved =
      typeof actionRaw === 'string' && actionRaw.trim()
        ? actionRaw.trim()
        : /** @type {string} */ (resolveIncidentActionType(co, [...block.categories][0] || '').action_type);
    const action_type = normalizeActionType(actionResolved) || 'contextual';

    const incident_id = internalKey.startsWith('c:')
      ? stableIncidentId(
          'ctx',
          `${brand_slug}|${internalKey}|${[...block.categories].join(',')}|${co.date}|${co.source_url}|${co.description}`
        )
      : stableIncidentId('mat', internalKey.slice(2));

    const amt = co.amount_usd;
    const amount_usd =
      amt != null && Number.isFinite(Number(amt)) ? Number(amt) : null;

    const jurisdiction =
      (typeof co.jurisdiction === 'string' && co.jurisdiction.trim()) ||
      (typeof co.agency_or_court === 'string' && co.agency_or_court.trim()) ||
      null;

    const desc = typeof co.description === 'string' ? co.description : '';
    const title = titleFromDescription(desc) || titleFromDescription(String(co.outcome || ''));

    const alternatesLen = Array.isArray(block.alternates) ? block.alternates.length : 0;
    /** Tier-1 deduped matters vs contextual / non-bucket rows (see enforcementDisplay dedupeIndexedMatters). */
    const canonical = internalKey.startsWith('g:');

    incidents.push({
      incident_id,
      title,
      date: co.date != null ? String(co.date) : '',
      categories: [...block.categories].sort((a, b) => a.localeCompare(b)),
      action_type,
      amount_usd,
      jurisdiction,
      sources: [...block.sourcesMap.values()],
      canonical,
      alternate_source_count: alternatesLen,
      category_placement_count: block.placement_count,
    });
  }

  incidents.sort((a, b) => {
    const ta = Date.parse(String(a.date).slice(0, 10)) || 0;
    const tb = Date.parse(String(b.date).slice(0, 10)) || 0;
    return tb - ta;
  });

  return {
    schema_version: '1.0',
    brand_slug,
    brand_name,
    unique_incident_count: incidents.length,
    category_placement_count,
    generated_at: new Date().toISOString(),
    incidents,
  };
}
