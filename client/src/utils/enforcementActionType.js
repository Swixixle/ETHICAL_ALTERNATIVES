/**
 * Canonical enforcement / record classification for profile incidents.
 * Kept isomorphic (server imports this module) so API and UI stay aligned.
 */

/** @typedef {'disposition' | 'regulator_action' | 'recall' | 'civil_allegation' | 'contextual'} ActionType */

export const ACTION_TYPES = /** @type {const} */ ([
  'disposition',
  'regulator_action',
  'recall',
  'civil_allegation',
  'contextual',
]);

/** Prefer higher rank when collapsing duplicate sources for the same matter. */
export const ACTION_TYPE_RANK = {
  disposition: 4,
  recall: 3,
  regulator_action: 2,
  civil_allegation: 1,
  contextual: 0,
};

/** @type {Record<string, ActionType>} */
const LEGACY_OUTCOME = {
  settlement: 'disposition',
  consent_decree: 'disposition',
  conviction: 'disposition',
  fine: 'disposition',
  penalty: 'disposition',
  judgment: 'disposition',
  guilty_plea: 'disposition',
  guilty: 'disposition',
  recall: 'recall',
  ongoing: 'regulator_action',
  investigation: 'regulator_action',
  alleged: 'civil_allegation',
  litigation: 'civil_allegation',
};

/**
 * @param {unknown} v
 * @returns {ActionType | null}
 */
export function normalizeActionType(v) {
  if (v == null) return null;
  const s = String(v)
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  if (ACTION_TYPES.includes(/** @type {*} */ (s))) return /** @type {ActionType} */ (s);
  if (LEGACY_OUTCOME[s]) return LEGACY_OUTCOME[s];
  return null;
}

/**
 * @param {Record<string, unknown>} inc
 * @param {string} [categoryKey]
 * @returns {ActionType}
 */
function inferActionType(inc, categoryKey = '') {
  const url = String(inc.source_url || '').toLowerCase();
  const desc = String(inc.description || '').toLowerCase();
  const outcome = String(inc.outcome || '').toLowerCase();
  const agency = String(inc.agency_or_court || inc.jurisdiction || '').toLowerCase();
  const blob = `${desc} ${outcome} ${agency}`;
  const cat = String(categoryKey || '').toLowerCase();

  if (/\brecall\b|voluntary recall|product recall|class i\b|class ii\b|safety notice|market withdrawal/.test(blob)) {
    return 'recall';
  }
  if (/fda\.gov|cpsc\.gov|recalls?\.gov|nhtsa\.gov|saferproducts/.test(url) && cat === 'product_safety') {
    return 'recall';
  }
  if (/fda\.gov|cpsc\.gov|recalls?\.gov/.test(url) && /\brecall\b|warning|safety|violation|enforcement/.test(blob)) {
    return 'recall';
  }

  if (
    /\bclass action\b|\bplaintiff\b|prop\.?\s*65|\bprop\s65\b|complaint filed|lawsuit filed|\bmdl\b|multi[- ]district|unresolved (?:litigation|claims?)|credibly alleged(?!.*settled)/.test(
      blob
    )
  ) {
    return 'civil_allegation';
  }

  if (
    /\bnotice of violation\b|\bnov\b|stop[- ]sale|stop sale|ongoing investigation|under investigation|inspection (?:found|revealed)|administrative complaint(?!.*settled)|intent to fine|proposed penalty|warning letter(?!.*closed)/.test(
      blob
    )
  ) {
    return 'regulator_action';
  }
  if (outcome === 'ongoing' && !/settlement|settled|resolved|decree|judgment/.test(blob)) {
    return 'regulator_action';
  }

  if (
    /\bsettlement\b|consent decree|pleaded guilty|guilty plea|\bconviction\b|criminal penalty|civil penalty|agreed to pay|final judgment|stipulated order|resolved enforcement/.test(blob)
  ) {
    return 'disposition';
  }
  if (/settlement|consent_decree|conviction|fine|penalty|judgment/.test(outcome) && outcome !== 'ongoing') {
    return 'disposition';
  }
  if (inc.amount_usd != null && Number.isFinite(Number(inc.amount_usd)) && Number(inc.amount_usd) > 0) {
    if (/\.gov(\/|$)|justice\.gov|uscourts\.gov|fda\.gov|cpsc\.gov|ftc\.gov|sec\.gov|epa\.gov|dol\.gov/.test(url)) {
      return 'disposition';
    }
  }

  if (
    /\besg\b|sustainability report|net zero|carbon neutral|appointed (?:as )?(?:ceo|cfo)|named chief executive|executive transition|press release.*expansion|self[- ]reported/.test(
      blob
    )
  ) {
    return 'contextual';
  }

  const newsHost =
    /reuters\.com|apnews\.com|bloomberg\.com|wsj\.com|nytimes\.com|theguardian\.com|propublica\.org|forbes\.com|cnbc\.com/.test(
      url
    );
  if (
    newsHost &&
    !/settlement|fine|penalt|enforcement|lawsuit|litigation|complaint|violation|recall|investigation|decree|order|penalty|alleged/.test(
      blob
    )
  ) {
    return 'contextual';
  }

  if (/\.gov(\/|$)|uscourts\.gov|federalregister\.gov/.test(url)) {
    if (/pending enforcement|proposed (?:fine|penalty)|notice of intent(?!.*withdrawn)/i.test(blob)) {
      return 'regulator_action';
    }
    return 'disposition';
  }

  if (agency && /enforcement|violation|penalt|order|decree|investigation/.test(blob)) {
    return 'regulator_action';
  }

  return 'contextual';
}

/**
 * @param {unknown} inc
 * @param {string} [categoryKey]
 * @returns {{ action_type: ActionType }}
 */
export function resolveIncidentActionType(inc, categoryKey = '') {
  if (!inc || typeof inc !== 'object') {
    return { action_type: /** @type {ActionType} */ ('contextual') };
  }
  const o = /** @type {Record<string, unknown>} */ (inc);
  const fromStored =
    normalizeActionType(o.action_type) ||
    normalizeActionType(o.disposition_type) ||
    normalizeActionType(o.record_type);
  const action_type = fromStored || inferActionType(o, categoryKey);
  return { action_type };
}

/**
 * @param {Record<string, number>} counts
 */
export function formatActionTypeBreakdown(counts) {
  const parts = [];
  const d = counts.disposition || 0;
  const r = counts.regulator_action || 0;
  const c = counts.recall || 0;
  const l = counts.civil_allegation || 0;
  if (d) parts.push(`${d} disposition${d === 1 ? '' : 's'}`);
  if (r) parts.push(`${r} regulator action${r === 1 ? '' : 's'}`);
  if (c) parts.push(`${c} recall${c === 1 ? '' : 's'}`);
  if (l) parts.push(`${l} civil allegation${l === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

/**
 * @param {ActionType | string | undefined} actionType
 */
export function actionTypeMatterRank(actionType) {
  const k = String(actionType || '');
  return ACTION_TYPE_RANK[/** @type {ActionType} */ (k)] ?? 0;
}
