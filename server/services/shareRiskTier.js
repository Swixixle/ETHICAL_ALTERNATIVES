/**
 * Server-side social-export risk tier for share gating.
 * All decisions use investigation fields only — never trust client-supplied tier.
 *
 * @see ../../docs/SHARE_RISK_TIER_METHODOLOGY.md
 */

const HIGH_RISK_KEYWORDS = [
  'child labor',
  'child labour',
  'human trafficking',
  'sex trafficking',
  'forced labor',
  'forced labour',
  'fraud',
  'criminal',
  'indicted',
  'convicted',
  'bribery',
  'corruption',
  'cartel',
  'money laundering',
  'felony',
  'pleaded guilty',
  'rico',
];

/** Verdict tags that alone justify high tier for short-form viral export. */
const HIGH_RISK_VERDICT_TAGS = new Set([
  'child_labor',
  'forced_labor_risk',
  'human_trafficking',
  'rico_conviction',
  'criminal_charges',
  'sanctions_violations',
  'bribery',
]);

const CATEGORY_KEYS = ['tax', 'legal', 'labor', 'environmental', 'political', 'product_health'];

/**
 * @param {unknown} inv
 */
function collectLowerText(inv) {
  if (!inv || typeof inv !== 'object') return '';
  /** @type {unknown[]} */
  const parts = [
    inv.executive_summary,
    inv.investigation_summary,
    inv.labor_summary,
    inv.legal_summary,
    inv.tax_summary,
    inv.environmental_summary,
    inv.political_summary,
    typeof inv.product_health === 'string' ? inv.product_health : null,
  ];
  if (Array.isArray(inv.verdict_tags)) {
    parts.push(inv.verdict_tags.join(' '));
  }
  if (Array.isArray(inv.timeline)) {
    for (const e of inv.timeline) {
      if (e && typeof e === 'object' && typeof e.event === 'string') parts.push(e.event);
    }
  }
  return parts
    .filter((x) => typeof x === 'string' && x.trim())
    .join(' ')
    .toLowerCase();
}

/**
 * @param {unknown} inv
 */
function hasHighRiskKeyword(inv) {
  const blob = collectLowerText(inv);
  return HIGH_RISK_KEYWORDS.some((kw) => blob.includes(kw));
}

/**
 * @param {unknown} inv
 */
function hasHighRiskVerdictTag(inv) {
  const tags = Array.isArray(inv?.verdict_tags) ? inv.verdict_tags : [];
  return tags.some((t) => HIGH_RISK_VERDICT_TAGS.has(String(t).toLowerCase()));
}

/**
 * Count categories flagged as weak corroboration or “alleged” evidence only.
 * @param {unknown} inv
 */
function weakCorroborationCount(inv) {
  if (!inv || typeof inv !== 'object') return 0;
  let n = 0;
  for (const c of CATEGORY_KEYS) {
    const g = inv[`${c}_evidence_grade`];
    const level =
      g && typeof g === 'object' && typeof g.level === 'string' ? String(g.level).toLowerCase() : '';
    const flag = inv[`${c}_corroboration_flag`] === true;
    if (flag || level === 'alleged') n += 1;
  }
  return n;
}

/**
 * @param {unknown} inv
 * @returns {number | null} 0–100 scale or null if unknown
 */
function overallConfidencePct(inv) {
  if (!inv || typeof inv !== 'object') return null;
  const raw = inv.overall_investigation_confidence;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw > 1 && raw <= 100 ? raw : raw <= 1 ? raw * 100 : null;
  }
  return null;
}

/**
 * @param {unknown} inv
 * @returns {'low' | 'medium' | 'high'}
 */
export function assignShareRiskTier(inv) {
  const concern = String(inv?.overall_concern_level ?? '')
    .trim()
    .toLowerCase();
  const confidence = overallConfidencePct(inv);
  const severeConcern =
    concern === 'significant' || concern === 'high' || concern === 'critical';
  const weak = weakCorroborationCount(inv);

  if (hasHighRiskKeyword(inv) || hasHighRiskVerdictTag(inv)) {
    return 'high';
  }

  if (severeConcern && confidence != null && confidence < 60) {
    return 'high';
  }

  if (weak >= 3) {
    return 'high';
  }

  if (severeConcern || (confidence != null && confidence < 55) || weak >= 1) {
    return 'medium';
  }

  return 'low';
}
