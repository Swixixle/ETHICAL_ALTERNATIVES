import {
  scoreDocumentary,
  scoreModelAgreementVision,
  crossRefAdjustmentVision,
  combineConfidenceTracks,
} from './confidenceScorer.js';

const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.0-flash';
const TIMEOUT_MS = 15_000;
const AGREEMENT_THRESHOLD = 0.65;

export function normalizeBrandName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|co|company|group|holdings|plc)\b\.?/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function scoreAgreement(brandA, brandB) {
  const a = normalizeBrandName(brandA);
  const b = normalizeBrandName(brandB);
  if (!a || !b) return 0.0;
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.85;
  const wordsA = new Set(a.split(' '));
  const wordsB = new Set(b.split(' '));
  const intersection = [...wordsA].filter((w) => wordsB.has(w) && w.length > 2);
  const union = new Set([...wordsA, ...wordsB]);
  if (union.size === 0) return 0;
  return intersection.length / union.size;
}

/**
 * @param {string} imageBase64
 * @param {string} [mimeType]
 * @param {{ x?: number; y?: number } | null} [tapContext] — normalized 0–1 coordinates (same as vision.js tap)
 */
async function askGemini(imageBase64, mimeType, tapContext) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return {
      brand_identified: null,
      brand: null,
      confidence: null,
      method: null,
      reasoning: null,
      model: GEMINI_VISION_MODEL,
      checked: false,
      error: 'GEMINI_API_KEY not set',
    };
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: GEMINI_VISION_MODEL });

  const ctx =
    tapContext &&
    Number.isFinite(Number(tapContext.x)) &&
    Number.isFinite(Number(tapContext.y))
      ? `User tapped near x=${Math.round(Number(tapContext.x) * 100)}%, y=${Math.round(Number(tapContext.y) * 100)}% of the image (relative). Focus on that area.`
      : '';

  const prompt = `You are a brand identification assistant.
${ctx}

Identify the brand visible in or near that area.

Respond in JSON only. No prose outside the JSON.

{
  "brand_identified": true | false,
  "brand": "exact brand name or null",
  "parent_company": "corporate parent if known or null",
  "confidence": 0.0 to 1.0,
  "method": "direct_logo | text_label | product_shape | scene_context | unknown",
  "reasoning": "one sentence — what visual signal led to this"
}`;

  const run = model.generateContent([
    { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } },
    { text: prompt },
  ]);

  const timeout = new Promise((_, rej) => {
    setTimeout(() => rej(new Error('Gemini vision corroboration timeout')), TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([run, timeout]);
    const raw = result?.response?.text?.()?.trim();
    if (!raw) throw new Error('Empty response from Gemini');

    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      brand_identified: parsed.brand_identified ?? false,
      brand: parsed.brand ?? null,
      parent_company: parsed.parent_company ?? null,
      confidence:
        typeof parsed.confidence === 'number' ? Math.min(Math.max(parsed.confidence, 0), 1) : 0.3,
      method: parsed.method ?? 'unknown',
      reasoning: parsed.reasoning ?? null,
      model: GEMINI_VISION_MODEL,
      checked: true,
    };
  } catch (err) {
    console.warn('[visionCorroboration] Gemini failed:', err?.message || err);
    return {
      brand_identified: null,
      brand: null,
      confidence: null,
      method: null,
      reasoning: null,
      model: GEMINI_VISION_MODEL,
      checked: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * @param {Record<string, unknown>} claudeResult — from vision.js (identifyObject)
 * @param {string} imageBase64
 * @param {string} [mimeType]
 * @param {{ x?: number; y?: number } | null} [tapContext]
 * @param {Record<string, unknown> | null} [dbProfile] — optional incumbent row shape: source_count, has_court_record, brand_slug, brand_name
 */
export async function corroborateVisionIdentification(
  claudeResult,
  imageBase64,
  mimeType,
  tapContext,
  dbProfile = null
) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[visionCorroboration] GEMINI_API_KEY not set — skipping');
    return { ...claudeResult, identification_status: 'unchecked', corroboration_ran: false };
  }

  const claudeBrand =
    typeof claudeResult?.brand === 'string' && claudeResult.brand.trim()
      ? claudeResult.brand.trim()
      : null;
  console.log(`[visionCorroboration] checking "${claudeBrand || claudeResult?.object || 'unknown'}"`);

  const geminiResult = await askGemini(imageBase64, mimeType, tapContext);

  const sourceCount =
    typeof dbProfile?.source_count === 'number'
      ? dbProfile.source_count
      : typeof dbProfile?.primary_sources === 'object' && Array.isArray(dbProfile.primary_sources)
        ? dbProfile.primary_sources.length
        : 0;
  const hasCourtRecord = Boolean(dbProfile?.has_court_record);
  const hasDBProfile = Boolean(dbProfile);

  const docScore = scoreDocumentary({ sourceCount, hasCourtRecord, hasDBProfile });

  const agreementScore =
    geminiResult.checked && geminiResult.brand
      ? scoreAgreement(claudeBrand || String(claudeResult?.object || ''), geminiResult.brand)
      : 0;

  const claudeConf = Number(claudeResult?.confidence);
  const claudeConfidenceNum = Number.isFinite(claudeConf) ? Math.min(Math.max(claudeConf, 0), 1) : 0.5;

  const modelScore = scoreModelAgreementVision({
    claudeBrand,
    claudeConfidence: claudeConfidenceNum,
    geminiBrand: geminiResult.brand,
    geminiConfidence: geminiResult.confidence,
    geminiRan: geminiResult.checked,
    agreementScore,
  });

  const slugForMatch =
    typeof dbProfile?.brand_slug === 'string'
      ? dbProfile.brand_slug.replace(/-/g, ' ')
      : typeof dbProfile?.brand_name === 'string'
        ? dbProfile.brand_name
        : '';
  const photoMatchesDoc =
    hasDBProfile &&
    agreementScore >= AGREEMENT_THRESHOLD &&
    slugForMatch &&
    normalizeBrandName(claudeBrand || String(claudeResult?.object || '')) === normalizeBrandName(slugForMatch);

  const idMethod = String(claudeResult?.identification_method || claudeResult?.method || 'unknown');

  const crossrefAdj = crossRefAdjustmentVision({
    photoMatchesDocumentedBrand: photoMatchesDoc,
    identificationMethod: idMethod,
    contradictsDocs: hasDBProfile && agreementScore < 0.3,
    noDocumentarySupport: !hasDBProfile,
  });

  const { final, breakdown } = combineConfidenceTracks({
    documentary: docScore,
    model: modelScore,
    crossref: crossrefAdj,
  });

  let status;
  if (!geminiResult.checked) {
    status = 'unchecked';
  } else if (!geminiResult.brand_identified) {
    status = 'contested';
  } else if (agreementScore >= AGREEMENT_THRESHOLD) {
    status = 'confirmed';
  } else {
    status = 'contested';
  }

  return {
    ...claudeResult,
    final_brand: claudeBrand || claudeResult?.brand,
    final_confidence: final,
    identification_status: status,
    agreement_score: Math.round(agreementScore * 100),
    confidence_breakdown: breakdown,
    corroboration_ran: geminiResult.checked,
    gemini_result: geminiResult,
    corroboration_note: buildNote(status, claudeBrand, geminiResult, agreementScore, breakdown),
  };
}

/**
 * @param {string} status
 * @param {string|null} claudeBrand
 * @param {Record<string, unknown>} geminiResult
 * @param {number} agreementScore
 * @param {Record<string, unknown>} breakdown
 */
function buildNote(status, claudeBrand, geminiResult, agreementScore, breakdown) {
  if (status === 'confirmed') {
    return (
      `Gemini independently identified: ${geminiResult.brand}. ` +
      `Agreement: ${Math.round(agreementScore * 100)}%. ` +
      `Documentary: ${breakdown.documentary ?? 'n/a'}%. ` +
      `Final confidence: ${breakdown.final_pct}%.`
    );
  }
  if (status === 'contested') {
    return (
      `Claude identified: ${claudeBrand ?? '—'}. ` +
      `Gemini identified: ${geminiResult.brand ?? 'nothing'}. ` +
      `Agreement: ${Math.round(agreementScore * 100)}%. ` +
      `Treat identification as provisional. Final confidence: ${breakdown.final_pct}%.`
    );
  }
  return 'Corroboration check did not complete. Using Claude identification only.';
}
