/**
 * Render-time aggregation: dedupe enforcement matters, tier classification, counts.
 * Does not modify stored profile data.
 */

import {
  resolveIncidentActionType,
  actionTypeMatterRank,
  formatActionTypeBreakdown,
} from './enforcementActionType.js';

/** @typedef {Record<string, unknown>} RawIncident */

const HARD_OUTCOME =
  /settlement|penalt|fine|convict|consent|decre|complaint|enforcement|judgment|guilty|plea|violation|adjudicat|sanction|lawsuit|litigation|doj|d\.c\.|district court|sec\b|ftc|epa|osha|nlrb|civil|criminal|order issued/i;

function isTier2NewsHost(host) {
  const h = String(host || '').toLowerCase();
  return /(^|\.)reuters\.com$|(^|\.)apnews\.com$|(^|\.)bloomberg\.com$|(^|\.)wsj\.com$|(^|\.)nytimes\.com$|(^|\.)theguardian\.com$|(^|\.)propublica\.org$|(^|\.)forbes\.com$|(^|\.)cnbc\.com$/i.test(
    h
  );
}

/**
 * Higher score = preferred canonical source for the same matter.
 * @param {string} url
 */
export function sourceAuthorityScore(url) {
  const u = String(url || '').toLowerCase();
  if (!u.startsWith('http')) return 0;
  try {
    const host = new URL(u).hostname.replace(/^www\./, '');
    if (/\.gov$/.test(host) || host.endsWith('.mil')) {
      if (/justice\.gov|uscourts\.gov|federalregister\.gov|epa\.gov|sec\.gov|treasury\.gov|dol\.gov|ftc\.gov|hhs\.gov|fda\.gov|irs\.gov/.test(host)) {
        return 120;
      }
      return 100;
    }
    if (/europa\.eu|gov\.uk/.test(host)) return 95;
    if (isTier2NewsHost(host)) return 45;
    return 20;
  } catch {
    return 10;
  }
}

/** @param {string | undefined | null} s */
function normalizeJurisdiction(s) {
  const t = String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return t || '—';
}

/**
 * @param {string | undefined | null} s
 * @returns {string}
 */
export function normalizeIncidentDateKey(s) {
  const t = String(s || '').trim();
  if (!t) return '';
  const m = t.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (m) {
    const y = m[1];
    const mo = m[2] || '01';
    const d = m[3] || '01';
    return `${y}-${mo}-${d}`;
  }
  const yOnly = t.match(/^(\d{4})$/);
  if (yOnly) return `${yOnly[1]}-01-01`;
  return t.slice(0, 32).toLowerCase();
}

/**
 * @param {unknown} a
 * @param {unknown} b
 */
function amountsInSameMatterBucket(a, b) {
  const na = a != null && Number.isFinite(Number(a)) ? Number(a) : null;
  const nb = b != null && Number.isFinite(Number(b)) ? Number(b) : null;
  if (na == null && nb == null) return true;
  if (na == null || nb == null) return false;
  const hi = Math.max(Math.abs(na), Math.abs(nb), 1);
  const diff = Math.abs(na - nb);
  return diff <= Math.max(hi * 0.12, 5000);
}

/**
 * Tier 1 — hard public record (enforcement / formal regulatory / court-adjacent with agency).
 * @param {RawIncident} inc
 */
export function isTier1HardRecord(inc) {
  if (!inc || typeof inc !== 'object') return false;
  const url = String(inc.source_url || '');
  if (!/^https?:\/\//i.test(url)) return false;
  if (!String(inc.date || '').trim()) return false;
  const agency = String(inc.agency_or_court || inc.jurisdiction || '').trim();
  const out = String(inc.outcome || '');
  const gov = /\.gov(\/|$)/i.test(url) || /uscourts\.gov|federalregister\.gov/i.test(url);
  const hard = HARD_OUTCOME.test(out) || HARD_OUTCOME.test(String(inc.description || ''));
  const amt = inc.amount_usd != null && Number.isFinite(Number(inc.amount_usd)) && Number(inc.amount_usd) > 0;
  if (gov && (hard || agency)) return true;
  if (agency && hard) return true;
  if (hard && amt) return true;
  if (gov && amt) return true;
  return false;
}

/**
 * Tier 2 — contextual reporting (still sourced, not formal enforcement record).
 * @param {RawIncident} inc
 */
export function isTier2Contextual(inc) {
  if (!inc || typeof inc !== 'object') return false;
  if (isTier1HardRecord(inc)) return false;
  const url = String(inc.source_url || '');
  if (!/^https?:\/\//i.test(url)) return false;
  if (!String(inc.date || '').trim() && !String(inc.description || '').trim()) return false;
  return true;
}

/**
 * @param {RawIncident} inc
 * @param {string} categoryKey
 * @returns {RawIncident | null}
 */
function enrichIncident(inc, categoryKey) {
  if (!inc || typeof inc !== 'object') return null;
  const base = /** @type {RawIncident} */ ({ .../** @type {Record<string, unknown>} */ (inc) });
  const { action_type } = resolveIncidentActionType(base, categoryKey);
  base.action_type = action_type;
  return base;
}

/**
 * Dedupe non-contextual matters (disposition, regulator_action, recall, civil_allegation).
 * @param {RawIncident[]} enrichedIncidents — must include `action_type`
 */
export function dedupeIndexedMatters(enrichedIncidents) {
  const nonContextual = (Array.isArray(enrichedIncidents) ? enrichedIncidents : []).filter(
    (x) => x && typeof x === 'object' && String(/** @type {RawIncident} */ (x).action_type) !== 'contextual'
  );

  /** @type {RawIncident[][]} */
  const matterBuckets = [];

  for (const inc of nonContextual) {
    const o = /** @type {RawIncident} */ (inc);
    const dateKey = normalizeIncidentDateKey(/** @type {string} */ (o.date));
    const jur = normalizeJurisdiction(
      /** @type {string} */ (o.jurisdiction || o.agency_or_court || '')
    );
    const amt = o.amount_usd != null && Number.isFinite(Number(o.amount_usd)) ? Number(o.amount_usd) : null;

    let placed = false;
    for (const g of matterBuckets) {
      const first = g[0];
      const d0 = normalizeIncidentDateKey(/** @type {string} */ (first.date));
      const j0 = normalizeJurisdiction(
        /** @type {string} */ (first.jurisdiction || first.agency_or_court || '')
      );
      if (d0 !== dateKey || j0 !== jur) continue;
      const firstAmt =
        first.amount_usd != null && Number.isFinite(Number(first.amount_usd)) ? Number(first.amount_usd) : null;
      if (amountsInSameMatterBucket(firstAmt, amt)) {
        g.push(o);
        placed = true;
        break;
      }
    }
    if (!placed) matterBuckets.push([o]);
  }

  const groups = [];
  for (const arr of matterBuckets) {
    if (!arr.length) continue;
    const sorted = [...arr].sort((a, b) => {
      const ra = actionTypeMatterRank(String(a.action_type || ''));
      const rb = actionTypeMatterRank(String(b.action_type || ''));
      if (rb !== ra) return rb - ra;
      const sa = sourceAuthorityScore(String(a.source_url || ''));
      const sb = sourceAuthorityScore(String(b.source_url || ''));
      if (sb !== sa) return sb - sa;
      const na = Number(a.amount_usd) || 0;
      const nb = Number(b.amount_usd) || 0;
      return nb - na;
    });
    const canonical = sorted[0];
    const alternates = sorted.slice(1);
    const amounts = sorted
      .map((x) => (x.amount_usd != null && Number.isFinite(Number(x.amount_usd)) ? Number(x.amount_usd) : null))
      .filter((n) => n != null);
    const uniqAmt = [...new Set(amounts)];
    let amountDiscrepancyNote = null;
    if (uniqAmt.length > 1) {
      const hi = Math.max(.../** @type {number[]} */ (uniqAmt));
      const lo = Math.min(.../** @type {number[]} */ (uniqAmt));
      if (hi > lo && (hi - lo) / hi > 0.03) {
        const fmt = (n) =>
          new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
        amountDiscrepancyNote = `Sources disagree on amount (${uniqAmt.map(fmt).join(' vs ')}). Canonical row uses the higher-authority source.`;
      }
    }
    const key = `${normalizeIncidentDateKey(String(canonical.date))}|${normalizeJurisdiction(String(canonical.jurisdiction || canonical.agency_or_court || ''))}|${canonical.amount_usd ?? 'null'}|${String(canonical.action_type || '')}`;
    groups.push({ key, canonical, alternates, amountDiscrepancyNote });
  }

  groups.sort((a, b) => {
    const ta = Date.parse(String(a.canonical.date || '').slice(0, 10)) || 0;
    const tb = Date.parse(String(b.canonical.date || '').slice(0, 10)) || 0;
    return tb - ta;
  });

  return { groups };
}

/**
 * @param {unknown} raw
 */
function normalizeDeepResearchCategories(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.filter((x) => x != null && typeof x === 'object');
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.filter((x) => x != null && typeof x === 'object') : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Per deep-research category: deduped matter groups, contextual rows, display count (non-contextual matters only).
 * @param {Record<string, unknown>} dc
 */
export function prepareDeepCategoryForDisplay(dc) {
  if (!dc || typeof dc !== 'object') {
    return {
      tier1Groups: [],
      tier2Incidents: [],
      display_total_found: 0,
      action_type_breakdown: /** @type {Record<string, number>} */ ({}),
      action_type_subtitle: '',
    };
  }
  const categoryKey = typeof dc.category === 'string' ? dc.category : '';
  const incidents = Array.isArray(dc.incidents) ? dc.incidents : [];
  const enriched = incidents
    .map((x) => (x && typeof x === 'object' ? enrichIncident(/** @type {RawIncident} */ (x), categoryKey) : null))
    .filter(Boolean);

  const { groups } = dedupeIndexedMatters(enriched);
  const tier2Incidents = enriched.filter((x) => String(x.action_type) === 'contextual');

  /** @type {Record<string, number>} */
  const action_type_breakdown = {};
  for (const g of groups) {
    const t = String(g.canonical.action_type || 'disposition');
    action_type_breakdown[t] = (action_type_breakdown[t] || 0) + 1;
  }

  return {
    tier1Groups: groups,
    tier2Incidents,
    display_total_found: groups.length,
    action_type_breakdown,
    action_type_subtitle: formatActionTypeBreakdown(action_type_breakdown),
  };
}

/**
 * Sum of deduplicated indexed matters across all deep categories on an investigation.
 * @param {Record<string, unknown> | null | undefined} investigation
 */
export function countTier1UniqueMattersAcrossInvestigation(investigation) {
  if (!investigation || typeof investigation !== 'object') return 0;
  const cats = normalizeDeepResearchCategories(investigation.deep_research_categories);
  let n = 0;
  for (const dc of cats) {
    n += prepareDeepCategoryForDisplay(/** @type {Record<string, unknown>} */ (dc)).display_total_found;
  }
  return n;
}

/**
 * True if deep research lists ongoing regulatory / recall / civil matters (for live-perimeter copy).
 * @param {Record<string, unknown> | null | undefined} investigation
 */
export function investigationHasIndexedActiveMatters(investigation) {
  if (!investigation || typeof investigation !== 'object') return false;
  const cats = normalizeDeepResearchCategories(investigation.deep_research_categories);
  for (const dc of cats) {
    if (!dc || typeof dc !== 'object') continue;
    const ck = typeof /** @type {Record<string, unknown>} */ (dc).category === 'string' ? /** @type {Record<string, unknown>} */ (dc).category : '';
    const incs = Array.isArray(/** @type {Record<string, unknown>} */ (dc).incidents)
      ? /** @type {Record<string, unknown>} */ (dc).incidents
      : [];
    for (const inc of incs) {
      const { action_type } = resolveIncidentActionType(inc, ck);
      if (action_type === 'regulator_action' || action_type === 'recall' || action_type === 'civil_allegation') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Timeline: collapse same calendar year + similar lede + same source host where obvious duplicates.
 * @param {unknown[]} events
 */
export function dedupeTimelineEvents(events) {
  if (!Array.isArray(events)) return [];
  const seen = new Set();
  const out = [];
  for (const e of events) {
    if (!e || typeof e !== 'object') continue;
    const year = Number(e.year);
    if (!Number.isFinite(year)) continue;
    const ev = typeof e.event === 'string' ? e.event : '';
    const slug = ev
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 96);
    let host = '';
    try {
      const u = typeof e.source_url === 'string' ? e.source_url : '';
      if (u) host = new URL(u).hostname;
    } catch {
      host = '';
    }
    const key = `${year}|${slug}|${host}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}
