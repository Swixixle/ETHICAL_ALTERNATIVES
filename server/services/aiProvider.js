/**
 * Tiered AI provider helpers + health metrics for vision/investigation fallbacks.
 * Vision: Claude (vision.js) → Gemini. Investigation: Claude → Perplexity → Gemini.
 */

const PROVIDERS = ['claude', 'perplexity', 'gemini'];

/** @type {Record<string, { lastSuccess: string | null; lastFailure: string | null; failureCount: number }>} */
const providerHealth = Object.fromEntries(
  PROVIDERS.map((p) => [p, { lastSuccess: null, lastFailure: null, failureCount: 0 }])
);

/**
 * @param {'claude' | 'perplexity' | 'gemini'} provider
 */
export function recordProviderSuccess(provider) {
  if (!providerHealth[provider]) return;
  providerHealth[provider].lastSuccess = new Date().toISOString();
  providerHealth[provider].failureCount = 0;
}

/**
 * @param {'claude' | 'perplexity' | 'gemini'} provider
 */
export function recordProviderFailure(provider) {
  if (!providerHealth[provider]) return;
  providerHealth[provider].lastFailure = new Date().toISOString();
  providerHealth[provider].failureCount += 1;
}

export function getProviderHealthSnapshot() {
  const configured = {
    claude: Boolean(process.env.ANTHROPIC_API_KEY),
    perplexity: Boolean(process.env.PERPLEXITY_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
  };
  return { providers: { ...providerHealth }, keys_configured: configured };
}

const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.0-flash-lite';
const GEMINI_TEXT_MODEL = process.env.GEMINI_INVESTIGATION_MODEL || process.env.GEMINI_TEXT_MODEL || 'gemini-2.0-flash-lite';
const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || 'sonar';

/**
 * Two-image vision call (full scene + crop), same prompt as Claude vision path.
 * @param {string} imageBase64Full
 * @param {string} imageBase64Crop
 * @param {string} promptText
 * @returns {Promise<string>} raw assistant text
 */
export async function geminiVisionCompletion(imageBase64Full, imageBase64Crop, promptText) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: GEMINI_VISION_MODEL });

  const result = await model.generateContent([
    { inlineData: { mimeType: 'image/jpeg', data: imageBase64Full } },
    { inlineData: { mimeType: 'image/jpeg', data: imageBase64Crop } },
    { text: promptText },
  ]);

  const text = result?.response?.text?.() || '';
  if (!String(text).trim()) throw new Error('Gemini vision empty response');
  recordProviderSuccess('gemini');
  return text;
}

/**
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function perplexityTextCompletion(prompt) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error('PERPLEXITY_API_KEY not set');

  const body = {
    model: PERPLEXITY_MODEL,
    messages: [
      {
        role: 'user',
        content: `${prompt}

Return ONLY one valid JSON object matching the investigation schema described above — no markdown fences, no commentary before or after.`,
      },
    ],
    max_tokens: 6000,
    temperature: 0.2,
  };

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Perplexity HTTP ${res.status} ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text || !String(text).trim()) throw new Error('Perplexity empty content');
  recordProviderSuccess('perplexity');
  return String(text);
}

/**
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function geminiTextCompletion(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });

  const result = await model.generateContent(
    `${prompt}

Return ONLY one valid JSON object matching the investigation schema — no markdown fences, no commentary.`
  );
  const text = result?.response?.text?.() || '';
  if (!String(text).trim()) throw new Error('Gemini text empty response');
  recordProviderSuccess('gemini');
  return text;
}

/**
 * Investigation fallback chain when Claude API fails or returns unusable output.
 * @param {string} userPrompt
 * @returns {Promise<{ text: string; provider: 'perplexity' | 'gemini' } | null>}
 */
export async function runInvestigationTextFallbackChain(userPrompt) {
  const candidates = [];

  if (process.env.PERPLEXITY_API_KEY) {
    candidates.push(
      perplexityTextCompletion(userPrompt)
        .then((text) => ({ text, provider: 'perplexity' }))
        .catch((e) => {
          console.warn('[aiProvider] Perplexity investigation failed:', e?.message || e);
          recordProviderFailure('perplexity');
          return null;
        })
    );
  }

  if (process.env.GEMINI_API_KEY) {
    candidates.push(
      geminiTextCompletion(userPrompt)
        .then((text) => ({ text, provider: 'gemini' }))
        .catch((e) => {
          console.warn('[aiProvider] Gemini investigation failed:', e?.message || e);
          recordProviderFailure('gemini');
          return null;
        })
    );
  }

  if (candidates.length === 0) return null;

  const results = await Promise.all(candidates);
  const first = results.find((r) => r !== null);
  return first ?? null;
}

const PAY_SERIES_MIN_YEAR = 2018;

/**
 * Normalize LLM JSON into validated pay series (DEF 14A / pay ratio style).
 * @param {Record<string, unknown>} raw
 * @param {number} maxYear
 */
function normalizeExecutivePaySeries(raw, maxYear) {
  const arr = Array.isArray(raw?.series) ? raw.series : [];
  /** @type {{ year: number, ceo_total_comp_usd: number | null, median_employee_usd: number | null }[]} */
  const rows = [];
  for (const row of arr) {
    const y = Number(row?.year);
    if (!Number.isInteger(y) || y < PAY_SERIES_MIN_YEAR || y > maxYear) continue;
    const ceoRaw = row?.ceo_total_comp_usd;
    const medRaw = row?.median_employee_usd;
    const ceo =
      typeof ceoRaw === 'number' && Number.isFinite(ceoRaw) && ceoRaw > 0 ? ceoRaw : null;
    const med =
      typeof medRaw === 'number' && Number.isFinite(medRaw) && medRaw > 0 ? medRaw : null;
    rows.push({
      year: y,
      ceo_total_comp_usd: ceo,
      median_employee_usd: med,
    });
  }
  rows.sort((a, b) => a.year - b.year);
  const dedup = new Map();
  for (const r of rows) {
    dedup.set(r.year, r);
  }
  const series = [...dedup.values()].sort((a, b) => a.year - b.year);
  const complete = series.filter((r) => r.ceo_total_comp_usd != null && r.median_employee_usd != null);
  const data_available = complete.length >= 2;
  const source_note = typeof raw?.source_note === 'string' ? raw.source_note : '';
  return { series, source_note, data_available };
}

/**
 * Ask Perplexity for year-over-year CEO vs median employee pay (DEF 14A) from 2018 through last calendar year.
 * @param {string} companyDisplayName
 * @returns {Promise<
 *   | { ok: true; series: { year: number; ceo_total_comp_usd: number | null; median_employee_usd: number | null }[]; source_note: string; data_available: boolean }
 *   | { ok: false; error: string }
 * >}
 */
export async function perplexityExecutivePayLookup(companyDisplayName) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) {
    return { ok: false, error: 'PERPLEXITY_API_KEY not configured' };
  }

  const name = String(companyDisplayName || '').trim();
  if (!name) {
    return { ok: false, error: 'company name required' };
  }

  const maxYear = new Date().getFullYear();
  const query = `"${name}" CEO total compensation vs median employee pay 2018 2019 2020 2021 2022 2023 2024 annual proxy DEF 14A`;

  const userContent = `Research task: ${query}

Use the U.S. public parent issuer if "${name}" is a subsidiary brand. Prefer SEC DEF 14A filings: Summary Compensation Table "Total" (or equivalent) for CEO total compensation, and CEO pay ratio disclosure for median employee annual compensation (or stated median employee total comp), for each fiscal year where both are reasonably available.

Return ONLY valid JSON (no markdown fences, no commentary) with this exact shape:
{"series":[{"year":2018,"ceo_total_comp_usd":number|null,"median_employee_usd":number|null},...],"source_note":string}

Rules:
- Include one object per calendar/fiscal year from ${PAY_SERIES_MIN_YEAR} through ${maxYear} only when you have at least one numeric field; use null for unknown fields.
- All amounts are plain annual USD integers (e.g. 18600000 for $18.6M CEO; 43000 for $43K median).
- Do not invent values—use null if unsure. Omit entire years only if both values are unknown.

Years to cover in your search: 2018, 2019, 2020, 2021, 2022, 2023, 2024, and ${maxYear} if data exists.`;

  const body = {
    model: PERPLEXITY_MODEL,
    messages: [{ role: 'user', content: userContent }],
    max_tokens: 2800,
    temperature: 0.1,
  };

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      recordProviderFailure('perplexity');
      return {
        ok: false,
        error: `Perplexity HTTP ${res.status} ${errText.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    let text = data?.choices?.[0]?.message?.content;
    if (!text || !String(text).trim()) {
      recordProviderFailure('perplexity');
      return { ok: false, error: 'Perplexity empty content' };
    }
    text = String(text).trim();
    const fence = /^```(?:json)?\s*([\s\S]*?)```/im.exec(text);
    if (fence) text = fence[1].trim();

    const parsed = JSON.parse(text);
    const normalized = normalizeExecutivePaySeries(parsed, maxYear);
    recordProviderSuccess('perplexity');
    return {
      ok: true,
      series: normalized.series,
      source_note: normalized.source_note,
      data_available: normalized.data_available,
    };
  } catch (e) {
    recordProviderFailure('perplexity');
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
