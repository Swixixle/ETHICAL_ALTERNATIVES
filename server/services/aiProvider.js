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

const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.0-flash';
const GEMINI_TEXT_MODEL = process.env.GEMINI_INVESTIGATION_MODEL || process.env.GEMINI_TEXT_MODEL || 'gemini-2.0-flash';
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
  if (process.env.PERPLEXITY_API_KEY) {
    try {
      const text = await perplexityTextCompletion(userPrompt);
      return { text, provider: 'perplexity' };
    } catch (e) {
      console.warn('[aiProvider] Perplexity investigation failed:', e?.message || e);
      recordProviderFailure('perplexity');
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const text = await geminiTextCompletion(userPrompt);
      return { text, provider: 'gemini' };
    } catch (e) {
      console.warn('[aiProvider] Gemini investigation failed:', e?.message || e);
      recordProviderFailure('gemini');
    }
  }

  return null;
}
