/**
 * Tiered AI provider helpers + health metrics for vision/investigation fallbacks.
 * Vision: Claude (vision.js) -> Gemini.
 * Investigation routing (cost-aware): major brands -> Gemini only; complex ownership -> Claude+web;
 * default -> Gemini draft + Claude verify. Fallback chain: Perplexity then Gemini on failures.
 */


const PROVIDERS = ['claude', 'perplexity', 'gemini'];

/**
 * @param {string | null | undefined} s
 */
export function normalizeBrandForRouting(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Subsidiary / structure language — prefer full Claude + web search. */
const COMPLEX_OWNERSHIP_RE =
  /\b(subsidiar(y|ies)|parent\s+company|ultimate\s+parent|holding\s+compan(y|ies)|\bdba\b|d\s*\/\s*b\/\s*a|formerly\s+known|spun\s+off|merger|acqui(red|sition)|joint\s+venture|division\s+of|owned\s+by|operates\s+as|licen[cs]ee|franchisee\s+of|part\s+of\s+[A-Za-z]|umbrella\s+of)\b/i;

/** Normalized tokens / phrases — megabrands where Gemini-only draft is usually sufficient. */
const MAJOR_BRAND_PHRASES = new Set(
  [
    'walmart',
    'amazon',
    'apple',
    'google',
    'alphabet',
    'meta',
    'facebook',
    'microsoft',
    'costco',
    'target',
    'cvs',
    'walgreens',
    'mcdonalds',
    "mcdonald's",
    'starbucks',
    'coca cola',
    'cocacola',
    'pepsi',
    'pepsico',
    'procter and gamble',
    'unilever',
    'nestle',
    'tesla',
    'ford',
    'gm',
    'general motors',
    'toyota',
    'honda',
    'nike',
    'adidas',
    'home depot',
    'lowes',
    "lowe's",
    'kroger',
    'best buy',
    'dollar general',
    'dollar tree',
    'bank of america',
    'jpmorgan',
    'jp morgan',
    'wells fargo',
    'citigroup',
    'goldman sachs',
    'verizon',
    'at t',
    'att',
    'comcast',
    'disney',
    'netflix',
    'intel',
    'ibm',
    'oracle',
    'salesforce',
    'uber',
    'lyft',
    'airbnb',
    'marriott',
    'hilton',
    'delta',
    'united airlines',
    'american airlines',
    'southwest',
    'fedex',
    'ups',
    'pfizer',
    'johnson and johnson',
    'abbvie',
    'merck',
    'boeing',
    'lockheed',
    'exxon',
    'chevron',
    'shell',
    'bp',
    'walgreen',
  ].map((s) => normalizeBrandForRouting(s))
);

/**
 * @param {string | null | undefined} brandName
 * @param {string | null | undefined} corporateParent
 */
export function isMajorBrandForRouting(brandName, corporateParent) {
  const candidates = [brandName, corporateParent].map(normalizeBrandForRouting).filter(Boolean);
  for (const t of candidates) {
    if (MAJOR_BRAND_PHRASES.has(t)) return true;
    const first = t.split(' ')[0] || '';
    if (first.length >= 3 && MAJOR_BRAND_PHRASES.has(first)) return true;
    for (const phrase of MAJOR_BRAND_PHRASES) {
      if (phrase.length < 4) continue;
      if (t === phrase || t.startsWith(`${phrase} `)) return true;
    }
  }
  return false;
}

/**
 * @param {string | null | undefined} brandName
 * @param {string | null | undefined} corporateParent
 */
export function hasComplexOwnershipSignals(brandName, corporateParent) {
  const hay = `${brandName || ''} ${corporateParent || ''}`.trim();
  if (!hay) return false;
  if (COMPLEX_OWNERSHIP_RE.test(hay)) return true;
  const nb = normalizeBrandForRouting(brandName);
  const np = normalizeBrandForRouting(corporateParent);
  if (nb && np && nb !== np) return true;
  if (/[;&]/.test(hay) && /\b(inc|llc|ltd|corp|co\.)\b/i.test(hay)) return true;
  return false;
}

/**
 * @param {string | null | undefined} brandName
 * @param {string | null | undefined} corporateParent
 * @returns {'gemini_only' | 'claude_web' | 'gemini_claude_verify'}
 */
export function resolveInvestigationRoute(brandName, corporateParent) {
  if (isMajorBrandForRouting(brandName, corporateParent)) return 'gemini_only';
  if (hasComplexOwnershipSignals(brandName, corporateParent)) return 'claude_web';
  return 'gemini_claude_verify';
}

function anthropicMessageText(msg) {
  const parts = [];
  for (const b of msg?.content || []) {
    if (b.type === 'text' && b.text) parts.push(b.text);
  }
  return parts.join('\n').trim();
}

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

/** Tier 1 Prepay / AI Studio: `gemini-2.5-flash` replaces deprecated flash-lite. Override via GEMINI_* env. */
const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash';
const GEMINI_TEXT_MODEL =
  process.env.GEMINI_INVESTIGATION_MODEL || process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
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
 * Gemini-first investigation draft (no web search). Used for cost routing.
 * @param {string} prompt
 */
export async function runGeminiInvestigationDraft(prompt) {
  console.log('[aiProvider] investigation: primary=gemini (draft)');
  return geminiTextCompletion(prompt);
}

/**
 * Light Claude pass: verify / normalize draft JSON without web search tools.
 * @param {string} brandLabel
 * @param {string} draftText
 */
export async function runClaudeInvestigationVerify(brandLabel, draftText) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: key });
  const model =
    process.env.ANTHROPIC_INVESTIGATION_VERIFY_MODEL ||
    process.env.ANTHROPIC_INVESTIGATION_MODEL ||
    'claude-sonnet-4-6';
  const slice = String(draftText || '').slice(0, 14_000);

  const msg = await client.messages.create({
    model,
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: `You verify a draft corporate investigation JSON for "${brandLabel}". The draft came from another model without live web access.

Tasks: (1) Fix internal inconsistencies (brand vs parent vs subsidiaries vs overall_concern_level vs summaries). (2) Correct only well-established parent/subsidiary facts for famous companies; do not invent new enforcement cases or dollar amounts. (3) Preserve the same JSON shape and keys as the draft (legal_summary, tax_summary, labor_summary, executive_summary, overall_concern_level, timeline, flags, sources, verdict_tags, community_impact, etc.). (4) Output ONLY one valid JSON object — no markdown fences, no commentary.

DRAFT:
${slice}`,
      },
    ],
  });

  const text = anthropicMessageText(msg);
  if (!String(text).trim()) throw new Error('Claude verify empty response');
  recordProviderSuccess('claude');
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
