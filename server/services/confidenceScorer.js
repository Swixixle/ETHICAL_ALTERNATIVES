/**
 * Three-track confidence scorer.
 * Used by both vision corroboration and Layer C corroboration.
 *
 * Inputs vary by call site — pass whatever tracks are available.
 * Missing tracks are skipped, weights are redistributed proportionally.
 */

const WEIGHTS = {
  documentary: 0.5,
  model: 0.3,
  crossref: 0.2,
};

const CLAMP_MIN = 0.15;
const CLAMP_MAX = 0.97;

/**
 * Track 1 — Documentary anchor score
 *
 * @param {object} params
 * @param {number} [params.sourceCount] — total verified sources
 * @param {boolean} [params.hasCourtRecord] — court or regulatory filing present
 * @param {boolean} [params.hasDBProfile] — incumbent_profiles entry exists
 * @returns {number} 0.0–1.0
 */
export function scoreDocumentary({ sourceCount = 0, hasCourtRecord = false, hasDBProfile = false }) {
  let score;
  if (sourceCount === 0) score = 0.3;
  else if (sourceCount <= 2) score = 0.55;
  else if (sourceCount <= 5) score = 0.72;
  else if (sourceCount <= 10) score = 0.85;
  else score = 0.93;

  if (hasCourtRecord) score = Math.min(score + 0.08, CLAMP_MAX);
  if (hasDBProfile) score = Math.min(score + 0.05, CLAMP_MAX);

  return score;
}

/**
 * Track 2 — Model agreement gate score (vision identification)
 *
 * @param {object} params
 * @param {string|null} [params.claudeBrand] — brand Claude identified
 * @param {number} [params.claudeConfidence] — 0.0–1.0
 * @param {string|null} [params.geminiBrand] — brand Gemini identified (null if failed)
 * @param {number|null} [params.geminiConfidence]
 * @param {boolean} [params.geminiRan] — did Gemini actually run?
 * @param {number} [params.agreementScore] — from normalizeBrandName comparison
 * @returns {number} 0.0–1.0
 */
export function scoreModelAgreementVision({
  claudeBrand,
  claudeConfidence,
  geminiBrand,
  geminiConfidence,
  geminiRan,
  agreementScore,
}) {
  if (!geminiRan || geminiConfidence === null) return 0.45; // single model

  if (!geminiBrand) return 0.5; // Gemini ran but found nothing

  if (agreementScore >= 0.65) {
    const bothHigh = claudeConfidence >= 0.8 && geminiConfidence >= 0.8;
    return bothHigh ? 0.9 : 0.72;
  }

  return 0.25; // Disagreement
}

/**
 * Track 2 — Model agreement gate score (Layer C text claims)
 *
 * @param {object} params
 * @param {number} params.claudeInferenceConfidence — 0.0–1.0
 * @param {boolean|null} params.perplexityCorroborated
 * @param {number|null} params.perplexityConfidence
 * @param {boolean} params.perplexityRan
 * @returns {number} 0.0–1.0
 */
export function scoreModelAgreementText({
  claudeInferenceConfidence,
  perplexityCorroborated,
  perplexityConfidence,
  perplexityRan,
}) {
  if (!perplexityRan || perplexityConfidence === null) return 0.45;

  if (perplexityCorroborated === true) {
    const bothHigh = claudeInferenceConfidence >= 0.75 && perplexityConfidence >= 0.75;
    return bothHigh ? 0.9 : 0.72;
  }

  if (perplexityCorroborated === false) return 0.25;

  return 0.45; // inconclusive
}

/**
 * Track 3 — Cross-reference adjustment (vision)
 *
 * @param {object} params
 * @param {boolean} [params.photoMatchesDocumentedBrand]
 * @param {string} [params.identificationMethod] — 'direct_logo' | 'text_label' | 'scene_context' etc.
 * @param {boolean} [params.contradictsDocs]
 * @param {boolean} [params.noDocumentarySupport]
 * @returns {number} adjustment — can be negative
 */
export function crossRefAdjustmentVision({
  photoMatchesDocumentedBrand = false,
  identificationMethod = 'unknown',
  contradictsDocs = false,
  noDocumentarySupport = false,
}) {
  let adj = 0;

  if (photoMatchesDocumentedBrand) adj += 0.15;
  if (identificationMethod === 'direct_logo') adj += 0.08;
  if (contradictsDocs) adj -= 0.25;
  if (noDocumentarySupport) adj -= 0.1;

  return adj;
}

/**
 * Track 3 — Cross-reference adjustment (Layer C text)
 *
 * @param {object} params
 * @param {boolean} [params.matchesKnownViolationType]
 * @param {boolean} [params.hasZeroDocumentarySupport]
 * @returns {number} adjustment
 */
export function crossRefAdjustmentText({
  matchesKnownViolationType = false,
  hasZeroDocumentarySupport = false,
}) {
  let adj = 0;
  if (matchesKnownViolationType) adj += 0.12;
  if (hasZeroDocumentarySupport) adj -= 0.2;
  return adj;
}

/**
 * Final combiner — takes all three track scores and produces final confidence.
 * Redistributes weights proportionally if a track is unavailable.
 *
 * @param {object} tracks
 * @param {number|null} [tracks.documentary]
 * @param {number|null} [tracks.model]
 * @param {number|null} [tracks.crossref] — this is already the adjustment, not a 0-1 score
 * @returns {object} { final, breakdown }
 */
export function combineConfidenceTracks({ documentary, model, crossref }) {
  const available = {};
  let totalWeight = 0;

  if (documentary !== null && documentary !== undefined) {
    available.documentary = { score: documentary, weight: WEIGHTS.documentary };
    totalWeight += WEIGHTS.documentary;
  }
  if (model !== null && model !== undefined) {
    available.model = { score: model, weight: WEIGHTS.model };
    totalWeight += WEIGHTS.model;
  }

  if (totalWeight === 0) {
    return {
      final: 0.3,
      breakdown: { documentary, model, crossref, note: 'no tracks available' },
    };
  }

  let combined = 0;
  for (const track of Object.values(available)) {
    combined += track.score * (track.weight / totalWeight);
  }

  if (crossref !== null && crossref !== undefined) {
    combined += crossref * WEIGHTS.crossref;
  }

  const final = Math.min(Math.max(combined, CLAMP_MIN), CLAMP_MAX);

  return {
    final: Math.round(final * 100) / 100,
    breakdown: {
      documentary: documentary !== null && documentary !== undefined ? Math.round(documentary * 100) : null,
      model: model !== null && model !== undefined ? Math.round(model * 100) : null,
      crossref_adjustment: crossref !== null && crossref !== undefined ? Math.round(crossref * 100) : null,
      final_pct: Math.round(final * 100),
    },
  };
}
