/**
 * Layer C text corroboration (Perplexity) + three-track confidence scoring.
 */

import {
  scoreDocumentary,
  scoreModelAgreementText,
  crossRefAdjustmentText,
  combineConfidenceTracks,
} from './confidenceScorer.js';
import { recordProviderFailure, recordProviderSuccess } from './aiProvider.js';

const CORROBORATION_MODEL =
  process.env.PERPLEXITY_CORROBORATION_MODEL ||
  process.env.PERPLEXITY_MODEL ||
  'sonar';
const TIMEOUT_MS = Math.min(Math.max(Number(process.env.PERPLEXITY_CORROBORATION_TIMEOUT_MS) || 12_000, 4000), 45_000);

/** Categories that exist in normalized investigations (no executive_finding in schema). */
const LAYER_C_CATEGORIES = [
  { key: 'tax', summaryKey: 'tax_summary', gradeKey: 'tax_evidence_grade', sourcesKey: 'tax_sources' },
  { key: 'legal', summaryKey: 'legal_summary', gradeKey: 'legal_evidence_grade', sourcesKey: 'legal_sources' },
  { key: 'labor', summaryKey: 'labor_summary', gradeKey: 'labor_evidence_grade', sourcesKey: 'labor_sources' },
  {
    key: 'environmental',
    summaryKey: 'environmental_summary',
    gradeKey: 'environmental_evidence_grade',
    sourcesKey: 'environmental_sources',
  },
  {
    key: 'political',
    summaryKey: 'political_summary',
    gradeKey: 'political_evidence_grade',
    sourcesKey: 'political_sources',
  },
  {
    key: 'product_health',
    summaryKey: 'product_health',
    gradeKey: 'product_health_evidence_grade',
    sourcesKey: 'product_health_sources',
  },
];

const LAYER_C_LEVELS = new Set(['limited', 'alleged']);
const LEGACY_STRING_GRADES = new Set(['inferred', 'low', 'pattern']);
const WEAK_SIGNAL = /inferred|pattern|\bthin\b|\bweak\b/i;

/**
 * @param {unknown} grade — normalized { level, source_types, note } or legacy string
 */
function isLayerCEvidenceGrade(grade) {
  if (grade == null) return false;
  if (typeof grade === 'string') return LEGACY_STRING_GRADES.has(grade.trim().toLowerCase());
  if (typeof grade !== 'object') return false;
  const level = typeof grade.level === 'string' ? grade.level.trim().toLowerCase() : '';
  if (LAYER_C_LEVELS.has(level)) return true;
  if (level === 'moderate') {
    const st = Array.isArray(grade.source_types) ? grade.source_types.join(' ').toLowerCase() : '';
    const note = typeof grade.note === 'string' ? grade.note.toLowerCase() : '';
    return WEAK_SIGNAL.test(st) || WEAK_SIGNAL.test(note);
  }
  return LEGACY_STRING_GRADES.has(level);
}

/**
 * @param {Record<string, unknown>} investigation
 */
export function extractLayerCClaims(investigation) {
  if (!investigation || typeof investigation !== 'object') return [];
  const brand = typeof investigation.brand === 'string' ? investigation.brand : '';
  const parent = investigation.parent != null ? String(investigation.parent) : '';

  return LAYER_C_CATEGORIES.flatMap((cat) => {
    const finding = investigation[`${cat.key}_finding`];
    if (finding == null || !String(finding).trim()) return [];

    const grade = investigation[cat.gradeKey];
    if (!isLayerCEvidenceGrade(grade)) return [];

    if (cat.key === 'product_health') {
      const ph = investigation.product_health;
      if (ph == null || ph === '') return [];
    }

    const summary = investigation[cat.summaryKey];
    const sources = investigation[cat.sourcesKey];
    const gradeLabel =
      typeof grade === 'string'
        ? grade
        : grade && typeof grade === 'object' && typeof grade.level === 'string'
          ? grade.level
          : 'unknown';

    return [
      {
        category: cat.key,
        finding: String(finding).trim(),
        summary: summary == null ? null : String(summary),
        evidence_grade: gradeLabel,
        sources: Array.isArray(sources) ? sources.map(String) : [],
        brand,
        parent,
      },
    ];
  });
}

/**
 * @param {string} text
 */
function parseJsonFromModel(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  let slice = t;
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) slice = fence[1].trim();
  try {
    const o = JSON.parse(slice);
    return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown>} claim
 */
async function checkClaim(claim) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) {
    return {
      corroborated: null,
      confidence: null,
      public_sources_found: null,
      source_count: 0,
      has_regulatory_record: false,
      matches_known_violation_type: false,
      explanation: 'PERPLEXITY_API_KEY not set.',
      checked: false,
    };
  }

  const companyLine = claim.parent
    ? `${claim.brand} (parent: ${claim.parent})`
    : String(claim.brand || 'Unknown');

  const prompt = `You are a factual verification assistant.
Determine whether the following claim about a company can be corroborated by public record.

Company: ${companyLine}
Category: ${claim.category}
Claim: ${claim.finding}

Respond in JSON only.

{
  "corroborated": true | false,
  "confidence": 0.0 to 1.0,
  "public_sources_found": true | false,
  "source_count": number of distinct public sources found,
  "has_regulatory_record": true | false,
  "matches_known_violation_type": true | false,
  "explanation": "one sentence max"
}

Only report what public sources show. Do not speculate.`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CORROBORATION_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.1,
      }),
      signal: ac.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Perplexity HTTP ${res.status} ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error('Empty response');

    recordProviderSuccess('perplexity');
    const parsed = parseJsonFromModel(raw);
    if (!parsed) {
      return {
        corroborated: false,
        confidence: 0.35,
        public_sources_found: false,
        source_count: 0,
        has_regulatory_record: false,
        matches_known_violation_type: false,
        explanation: 'Could not parse verification response.',
        checked: true,
      };
    }

    const srcCount = Math.max(0, Math.floor(Number(parsed.source_count) || 0));

    return {
      corroborated: parsed.corroborated ?? false,
      confidence:
        typeof parsed.confidence === 'number' ? Math.min(Math.max(parsed.confidence, 0), 1) : 0.3,
      public_sources_found: Boolean(parsed.public_sources_found),
      source_count: srcCount,
      has_regulatory_record: Boolean(parsed.has_regulatory_record),
      matches_known_violation_type: Boolean(parsed.matches_known_violation_type),
      explanation:
        typeof parsed.explanation === 'string' && parsed.explanation.trim()
          ? parsed.explanation.trim().slice(0, 500)
          : 'Could not verify from public record.',
      checked: true,
    };
  } catch (err) {
    recordProviderFailure('perplexity');
    console.warn(`[corroboration] check failed:`, err?.message || err);
    return {
      corroborated: null,
      confidence: null,
      public_sources_found: null,
      source_count: 0,
      has_regulatory_record: false,
      matches_known_violation_type: false,
      explanation: ac.signal.aborted ? 'Corroboration check timed out.' : 'Corroboration check unavailable.',
      checked: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {Record<string, unknown>} inv
 * @param {Record<string, unknown>} target
 */
export function mergeLayerCCorroborationIntoProfileJson(inv, target) {
  if (!inv || !target || typeof inv !== 'object' || typeof target !== 'object') return;

  const topKeys = ['overall_investigation_confidence', 'corroboration_ran', 'corroboration_count'];
  for (const k of topKeys) {
    if (Object.prototype.hasOwnProperty.call(inv, k)) target[k] = inv[k];
  }
  for (const cat of LAYER_C_CATEGORIES) {
    const c = cat.key;
    for (const suf of ['_corroboration', '_final_confidence', '_confidence_breakdown', '_corroboration_flag']) {
      const k = `${c}${suf}`;
      if (Object.prototype.hasOwnProperty.call(inv, k)) target[k] = inv[k];
    }
    const gk = `${c}_evidence_grade`;
    if (Object.prototype.hasOwnProperty.call(inv, gk)) target[gk] = inv[gk];
  }
}

/**
 * @param {Record<string, unknown>} investigation
 */
export async function corroborateLayerC(investigation) {
  if (!investigation || typeof investigation !== 'object') return investigation;

  if (!process.env.PERPLEXITY_API_KEY) {
    console.warn('[corroboration] PERPLEXITY_API_KEY not set — skipping');
    investigation.corroboration_ran = false;
    investigation.corroboration_skipped_reason = 'no_api_key';
    return investigation;
  }

  const claims = extractLayerCClaims(investigation);
  if (claims.length === 0) {
    investigation.corroboration_ran = false;
    investigation.corroboration_claims_checked = 0;
    return investigation;
  }

  console.log(`[corroboration] checking ${claims.length} Layer C claim(s) for ${investigation.brand || '∅'}`);

  const results = await Promise.all(
    claims.map(async (claim) => ({
      category: claim.category,
      claim,
      result: await checkClaim(claim),
    }))
  );

  for (const { category, claim, result } of results) {
    const existingSources = claim.sources?.length ?? 0;
    const perplexitySources = result.source_count ?? 0;
    const totalSources = existingSources + perplexitySources;

    const docScore = scoreDocumentary({
      sourceCount: totalSources,
      hasCourtRecord: result.has_regulatory_record,
      hasDBProfile: existingSources > 0,
    });

    const claudeInferenceConfidence = 0.65;

    const modelScore = scoreModelAgreementText({
      claudeInferenceConfidence,
      perplexityCorroborated: result.corroborated,
      perplexityConfidence: result.confidence,
      perplexityRan: result.checked && result.confidence !== null,
    });

    const crossrefAdj = crossRefAdjustmentText({
      matchesKnownViolationType: result.matches_known_violation_type,
      hasZeroDocumentarySupport: totalSources === 0,
    });

    const { final, breakdown } = combineConfidenceTracks({
      documentary: docScore,
      model: modelScore,
      crossref: crossrefAdj,
    });

    investigation[`${category}_corroboration`] = {
      ...result,
      confidence_breakdown: breakdown,
      final_confidence: final,
    };
    investigation[`${category}_final_confidence`] = final;
    investigation[`${category}_confidence_breakdown`] = breakdown;

    if (result.checked && final < 0.45) {
      const gk = `${category}_evidence_grade`;
      const prev = investigation[gk];
      const source_types = Array.isArray(prev?.source_types) ? [...prev.source_types.map(String)] : [];
      if (!source_types.includes('unverified_layer_c')) source_types.push('unverified_layer_c');
      investigation[gk] = {
        level: 'alleged',
        source_types,
        note:
          typeof prev?.note === 'string' && prev.note.trim()
            ? `${prev.note.trim()} — Final corroboration score below threshold after second pass.`
            : 'Final corroboration score below threshold; treat as unverified.',
      };
      investigation[`${category}_corroboration_flag`] = true;
    }
  }

  const categoryScores = results
    .map((r) => investigation[`${r.category}_final_confidence`])
    .filter((s) => s !== undefined && typeof s === 'number');

  investigation.overall_investigation_confidence =
    categoryScores.length > 0
      ? Math.round((categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length) * 100)
      : null;

  investigation.corroboration_ran = true;
  investigation.corroboration_count = claims.length;

  return investigation;
}
