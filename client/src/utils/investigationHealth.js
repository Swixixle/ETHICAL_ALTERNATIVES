/**
 * When to show health-ingredient risk messaging (banner, DIY health links, etc.).
 * Avoids generic “product health” copy when legal, labor, or environmental findings dominate.
 */

/** @param {unknown} raw */
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
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const vals = Object.values(/** @type {Record<string, unknown>} */ (raw));
    if (vals.length && vals.every((v) => v != null && typeof v === 'object' && !Array.isArray(v))) {
      return vals;
    }
  }
  return [];
}

const SEVERITY_RANK = /** @type {Record<string, number>} */ ({
  low: 0,
  moderate: 1,
  high: 2,
  critical: 3,
});

/** Deep category (server) → pillar for dominance checks */
const CATEGORY_PILLAR = /** @type {Record<string, string>} */ ({
  product_safety: 'health',
  supply_chain: 'health',
  labor_and_wage: 'labor',
  environmental: 'environmental',
  regulatory_and_legal: 'legal',
  antitrust_and_market_power: 'legal',
  financial_misconduct: 'legal',
  data_and_privacy: 'legal',
  institutional_enablement: 'political',
  subsidies_and_bailouts: 'tax',
  discrimination_and_civil_rights: 'labor',
  executive_and_governance: 'governance',
  corporate_structure: 'governance',
});

/** Same ordering as ProofBlock — higher score = stronger / more serious evidence tier. */
const EVIDENCE_CONCERN_RANK = /** @type {Record<string, number>} */ ({
  established: 1,
  strong: 2,
  moderate: 3,
  limited: 4,
  alleged: 5,
});

/**
 * @param {Record<string, unknown> | null | undefined} inv
 * @param {string[]} sectionKeys — e.g. ['legal','labor']
 */
function maxEvidenceConcernForSections(inv, sectionKeys) {
  if (!inv || typeof inv !== 'object') return 0;
  let best = 0;
  for (const sec of sectionKeys) {
    const g = inv[`${sec}_evidence_grade`];
    if (!g || typeof g !== 'object') continue;
    const raw = typeof g.level === 'string' ? g.level.toLowerCase() : '';
    const score = EVIDENCE_CONCERN_RANK[raw] || 0;
    if (score > best) best = score;
  }
  return best;
}

/**
 * @param {Record<string, unknown>[]} cats
 * @returns {Record<string, number>}
 */
function pillarSeverityFromDeepCategories(cats) {
  /** @type {Record<string, number>} */
  const pillarMax = {};
  for (const dc of cats) {
    if (!dc || typeof dc !== 'object') continue;
    const cat = typeof dc.category === 'string' ? dc.category : '';
    const pillar = CATEGORY_PILLAR[cat];
    if (!pillar) continue;
    const dot =
      typeof dc.severity_dot === 'string' ? dc.severity_dot.toLowerCase().trim() : 'low';
    const rank = SEVERITY_RANK[dot] ?? 0;
    pillarMax[pillar] = Math.max(pillarMax[pillar] ?? 0, rank);
  }
  return pillarMax;
}

const EXPLICIT_HEALTH_RE =
  /\b(health|product_safety|pfas|toxic|chemical|recall|contamination|ingredient|food\s*safety)\b/i;

/**
 * @param {Record<string, unknown> | null | undefined} investigation
 */
function explicitHealthSignalsInTags(investigation) {
  if (!investigation) return false;
  const verdict = Array.isArray(investigation.verdict_tags)
    ? investigation.verdict_tags.map(String)
    : [];
  const flags = Array.isArray(investigation.concern_flags)
    ? investigation.concern_flags.map(String)
    : [];
  const blob = [...verdict, ...flags].join(' ').toLowerCase();
  return EXPLICIT_HEALTH_RE.test(blob);
}

/**
 * True when health / ingredient callouts should appear (banner, DIY health column, etc.).
 * @param {Record<string, unknown> | null | undefined} investigation
 */
export function shouldShowPrimaryHealthRiskMessaging(investigation) {
  if (!investigation) return false;

  const cats = normalizeDeepResearchCategories(investigation.deep_research_categories);
  if (cats.length > 0) {
    const pillarMax = pillarSeverityFromDeepCategories(cats);
    const healthR = pillarMax.health ?? 0;
    const otherEntries = Object.entries(pillarMax).filter(([k]) => k !== 'health');
    const maxOther = otherEntries.length ? Math.max(...otherEntries.map(([, v]) => v)) : 0;

    if (healthR === 0 && maxOther === 0) {
      /* fall through to evidence grades / tags */
    } else {
      if (healthR < maxOther) return false;
      if (healthR > maxOther) return true;
      const peak = healthR;
      const pillarsAtPeak = Object.entries(pillarMax)
        .filter(([, v]) => v === peak && peak > 0)
        .map(([k]) => k);
      if (pillarsAtPeak.length === 1 && pillarsAtPeak[0] === 'health') return true;
      return false;
    }
  }

  if (explicitHealthSignalsInTags(investigation)) {
    const healthEv = maxEvidenceConcernForSections(investigation, ['product_health']);
    const otherEv = maxEvidenceConcernForSections(investigation, [
      'legal',
      'labor',
      'environmental',
      'political',
      'tax',
    ]);
    if (otherEv > healthEv) return false;
    return true;
  }

  const ph = investigation.product_health;
  if (typeof ph !== 'string' || !ph.trim()) return false;
  const healthEv = maxEvidenceConcernForSections(investigation, ['product_health']);
  const otherEv = maxEvidenceConcernForSections(investigation, [
    'legal',
    'labor',
    'environmental',
    'political',
    'tax',
  ]);
  if (otherEv > healthEv) return false;
  return true;
}

/**
 * @deprecated Prefer {@link shouldShowPrimaryHealthRiskMessaging}; kept for incremental migration.
 */
export function hasDocumentedHealthConcerns(investigation) {
  return shouldShowPrimaryHealthRiskMessaging(investigation);
}
