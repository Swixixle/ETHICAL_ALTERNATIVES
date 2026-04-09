/**
 * On-demand perimeter check: targeted recent legal/regulatory activity (past ~24 months).
 * Static profiles are not modified; output is cached in profile_activity_cache.
 */

import { createPrivateKey, sign } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const CLAUDE_MODEL =
  process.env.ANTHROPIC_INVESTIGATION_MODEL ||
  process.env.ANTHROPIC_PERIMETER_MODEL ||
  'claude-sonnet-4-6';

const PERPLEXITY_MODEL =
  process.env.PERPLEXITY_CORROBORATION_MODEL ||
  process.env.PERPLEXITY_MODEL ||
  'sonar';

const GEMINI_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.0-flash-lite';

const PERPLEXITY_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.PERPLEXITY_PERIMETER_TIMEOUT_MS) || 14_000, 5000),
  45_000
);

const MIN_CASE_CONFIDENCE = 0.4;

/**
 * @param {string} text
 * @returns {any}
 */
function parseJsonLoose(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  let slice = t;
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) slice = fence[1].trim();
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

/**
 * @param {string} brandName
 * @param {string} parentCompany
 * @param {string[]} verdictTags
 * @param {string[]} legalFlags
 */
async function buildSearchQueries(brandName, parentCompany, verdictTags, legalFlags) {
 const sys = `You are building search queries to find CURRENT legal and regulatory activity
(past 24 months) for a company. Given the company's name and its documented
legal history, generate exactly 4 search queries designed to surface:
1. Active DOJ, FTC, SEC, NLRB, or state AG investigations or lawsuits
2. Currently pending class action litigation
3. Congressional hearings or investigations
4. Recent settlements, fines, or consent decrees (2024-2026)

Return ONLY a JSON array of 4 strings. No explanation. No preamble.
Each query should be 4-8 words. Include the company name in each.
Include years 2024 2025 2026 where relevant.
Avoid queries that would return the OLD history already in the profile.`;

  const user = `brand_name: ${brandName}
parent_company: ${parentCompany || 'none'}
verdict_tags (first 5): ${(verdictTags || []).slice(0, 5).join(', ') || 'none'}
legal_flags (first 5): ${(legalFlags || []).slice(0, 5).join(', ') || 'none'}`;

  if (!process.env.ANTHROPIC_API_KEY) {
    return { queries: null };
  }

  try {
    const msg = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      temperature: 0.2,
      system: sys,
      messages: [{ role: 'user', content: user }],
    });
    const text = msg.content?.map((b) => (b.type === 'text' ? b.text : '')).join('\n') || '';
    const arr = parseJsonLoose(text);
    if (Array.isArray(arr) && arr.length >= 4 && arr.every((x) => typeof x === 'string')) {
      return { queries: arr.slice(0, 4).map((q) => String(q).trim()) };
    }
  } catch (e) {
    console.warn('[perimeter] Claude query build failed', e?.message || e);
  }

  return { queries: null };
}

function fallbackQueries(brandName) {
  const n = String(brandName || 'company').trim() || 'company';
  return [
    `${n} DOJ FTC lawsuit 2024 2025`,
    `${n} class action pending 2025`,
    `${n} congressional investigation 2025 2026`,
    `${n} settlement regulatory action 2024`,
  ];
}

/**
 * @param {string} query
 * @returns {Promise<{ text: string; citations: string[] }>}
 */
async function callPerplexitySearch(query) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) {
    return { text: '', citations: [] };
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PERPLEXITY_TIMEOUT_MS);

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [{ role: 'user', content: query }],
        max_tokens: 1400,
        temperature: 0.15,
        return_citations: true,
        search_recency_filter: 'month',
      }),
      signal: ac.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Perplexity ${res.status} ${errText.slice(0, 160)}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || '';
    const rawCites = Array.isArray(data?.citations) ? data.citations : [];
    const citations = [...new Set(rawCites.map(String).filter((u) => /^https?:\/\//i.test(u)))];
    return { text, citations };
  } finally {
    clearTimeout(timer);
  }
}

/** @param {string} brandName @param {string} bundle */
async function synthesizeActivity(brandName, bundle) {
  const sys = `You are analyzing search results to identify CURRENT legal and regulatory
activity for a company. Current means: filed within the past 24 months AND
still active (not fully resolved).

For each distinct case or investigation you find, extract:
- case_description: one sentence, plain language, what is alleged
- case_type: one of [doj_criminal, doj_civil, ftc, sec, nlrb, state_ag,
  class_action, congressional, uk_sfo, eu_competition, other]
- status: one of [filed, pretrial, trial, appeal, pending_ruling,
  settlement_talks, consent_decree, ongoing_investigation]
- date_initiated: YYYY-MM or YYYY if month unknown
- jurisdiction: e.g. "S.D.N.Y.", "D.D.C.", "European Commission", "UK SFO"
- key_parties: array of up to 3 strings [plaintiff/regulator, defendant, others]
- alleged_conduct: 1-2 sentence description of what is alleged
- source_url: the URL this came from
- confidence: number 0.0-1.0 (how confident you are this is real and current)

ONLY include items where:
1. You found a credible source URL (not just a rumor or a tweet)
2. The matter is still ACTIVE — not settled, not dropped, not fully resolved
3. The date is within the past 24 months

Return ONLY valid JSON in this shape:
{
  "active_cases": [...],
  "perimeter_summary": "One plain-English paragraph summarizing what is currently happening with this company legally and regulatorily. If nothing was found, say so plainly.",
  "activity_level": "high" | "moderate" | "quiet" | "unknown"
}

If you find nothing current, return active_cases: [] and activity_level: "quiet".
Do not hallucinate cases. If uncertain, omit.`;

  const user = `Company: ${brandName}

Search bundle (snippets and URLs from web search):
${bundle}`;

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      active_cases: [],
      perimeter_summary: 'Perimeter check completed. No current activity verified.',
      activity_level: 'unknown',
    };
  }

  try {
    const msg = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      temperature: 0.1,
      system: sys,
      messages: [{ role: 'user', content: user }],
    });
    const text = msg.content?.map((b) => (b.type === 'text' ? b.text : '')).join('\n') || '';
    const o = parseJsonLoose(text);
    if (
      o &&
      typeof o === 'object' &&
      Array.isArray(o.active_cases) &&
      typeof o.perimeter_summary === 'string' &&
      typeof o.activity_level === 'string'
    ) {
      return {
        active_cases: o.active_cases,
        perimeter_summary: o.perimeter_summary,
        activity_level: o.activity_level,
      };
    }
  } catch (e) {
    console.warn('[perimeter] synthesis failed', e?.message || e);
  }

  return {
    active_cases: [],
    perimeter_summary: 'Perimeter check completed. No current activity verified.',
    activity_level: 'unknown',
  };
}

/**
 * @param {string} prompt
 * @returns {Promise<{ verified: boolean; confidence: number; note: string } | null>}
 */
async function callGeminiVerify(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const raw = result?.response?.text?.()?.trim();
    if (!raw) return null;
    const o = parseJsonLoose(raw);
    if (!o || typeof o !== 'object') return null;
    return {
      verified: Boolean(o.verified),
      confidence:
        typeof o.confidence === 'number' ? Math.min(Math.max(o.confidence, 0), 1) : 0.5,
      note: typeof o.note === 'string' ? o.note.slice(0, 400) : '',
    };
  } catch {
    return null;
  }
}

/**
 * @param {string} brandName
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
async function searchCourtListener(brandName) {
  const token = process.env.COURTLISTENER_API_KEY;
  if (!token) return [];

  const q = encodeURIComponent(String(brandName || '').trim());
  const url = `https://www.courtlistener.com/api/rest/v4/search/?type=d&q=${q}&filed_after=2023-01-01&order_by=score_desc`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Token ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    const out = [];
    for (const r of results.slice(0, 8)) {
      if (!r || typeof r !== 'object') continue;
      const caseName = typeof r.caseName === 'string' ? r.caseName : typeof r.case_name === 'string' ? r.case_name : '';
      const dateFiled = typeof r.dateFiled === 'string' ? r.dateFiled : typeof r.date_filed === 'string' ? r.date_filed : '';
      const docketId = r.docket_id ?? r.docketId ?? r.id;
      const courtId = typeof r.court === 'string' ? r.court : typeof r.court_id === 'string' ? r.court_id : '';
      const absoluteUrl = typeof r.absolute_url === 'string' ? r.absolute_url : null;
      const sourceUrl = absoluteUrl
        ? absoluteUrl.startsWith('http')
          ? absoluteUrl
          : `https://www.courtlistener.com${absoluteUrl}`
        : typeof docketId === 'number' || typeof docketId === 'string'
          ? `https://www.courtlistener.com/docket/${docketId}/`
          : '';
      if (!caseName || !sourceUrl) continue;

      out.push({
        case_description: `${caseName} — federal docket filed ${dateFiled || 'recently'}.`,
        case_type: 'other',
        status: 'pretrial',
        date_initiated: dateFiled ? dateFiled.slice(0, 7) : '2024',
        jurisdiction: courtId || 'U.S. federal',
        key_parties: [String(brandName), 'Federal court'],
        alleged_conduct: 'Matter listed in public federal court records; details require docket review.',
        source_url: sourceUrl,
        confidence: 0.82,
        source: 'courtlistener',
        docket_id: docketId != null ? String(docketId) : undefined,
      });
    }
    return out;
  } catch (e) {
    console.warn('[perimeter] CourtListener', e?.message || e);
    return [];
  }
}

/**
 * @param {{ active_cases: unknown[]; perimeter_summary: string; generated_at: string }} payload
 */
function signPerimeterPayload(payload) {
  const b64 = process.env.PERIMETER_ED25519_PKCS8_DER_B64;
  if (!b64) return null;

  try {
    const key = createPrivateKey({
      key: Buffer.from(b64, 'base64'),
      format: 'der',
      type: 'pkcs8',
    });
    const msg = Buffer.from(
      JSON.stringify({
        active_cases: payload.active_cases,
        perimeter_summary: payload.perimeter_summary,
        generated_at: payload.generated_at,
      }),
      'utf8'
    );
    const sig = sign(null, msg, key);
    return Buffer.from(sig).toString('base64url');
  } catch (e) {
    console.warn('[perimeter] Ed25519 sign skipped:', e?.message || e);
    return null;
  }
}

function mergeCasesUniqueByUrl(primary, additions) {
  const seen = new Set();
  const merged = [];
  for (const c of [...primary, ...additions]) {
    if (!c || typeof c !== 'object') continue;
    const u = typeof c.source_url === 'string' ? c.source_url : '';
    const key = u || JSON.stringify(c);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(c);
  }
  return merged;
}

/**
 * @param {{
 *   brand_slug: string;
 *   brand_name: string;
 *   parent_company: string;
 *   verdict_tags: string[];
 *   legal_flags: string[];
 *   concern_level: string;
 * }} profileContext
 */
export async function runPerimeterCheck(profileContext) {
  const brand_slug = String(profileContext.brand_slug || '').trim();
  const brand_name = String(profileContext.brand_name || '').trim() || brand_slug;
  const parent_company = String(profileContext.parent_company || '').trim();
  const verdict_tags = Array.isArray(profileContext.verdict_tags) ? profileContext.verdict_tags.map(String) : [];
  const legal_flags = Array.isArray(profileContext.legal_flags) ? profileContext.legal_flags.map(String) : [];

  const sensor_status = {
    perplexity: /** @type {'ok' | 'unavailable'} */ ('ok'),
    claude: /** @type {'ok' | 'unavailable'} */ ('ok'),
    gemini: /** @type {'ok' | 'unavailable' | 'skipped'} */ ('skipped'),
    courtlistener: /** @type {'ok' | 'skipped'} */ ('skipped'),
  };

  const { queries: claudeQueries } = await buildSearchQueries(
    brand_name,
    parent_company,
    verdict_tags,
    legal_flags
  );

  const queries = claudeQueries && claudeQueries.length === 4 ? claudeQueries : fallbackQueries(brand_name);

  sensor_status.claude = process.env.ANTHROPIC_API_KEY ? 'ok' : 'unavailable';

  const rawPieces = [];
  if (!process.env.PERPLEXITY_API_KEY) {
    sensor_status.perplexity = 'unavailable';
  } else {
    try {
      const results = await Promise.all(queries.map((q) => callPerplexitySearch(q)));
      for (let i = 0; i < results.length; i++) {
        const { text, citations } = results[i];
        rawPieces.push(
          `--- Query ${i + 1}: ${queries[i]}\n${text}\nSources: ${citations.join(' | ')}`
        );
      }
    } catch (e) {
      console.warn('[perimeter] Perplexity sweep failed', e?.message || e);
      sensor_status.perplexity = 'unavailable';
    }
  }

  let synth = await synthesizeActivity(brand_name, rawPieces.join('\n\n'));

  let active_cases = Array.isArray(synth.active_cases)
    ? synth.active_cases.filter((c) => c && typeof c === 'object')
    : [];

  active_cases = active_cases.map((c) => ({
    ...c,
    confidence: typeof c.confidence === 'number' ? Math.min(Math.max(c.confidence, 0), 1) : 0.5,
  }));

  const highConfidenceItems = active_cases
    .filter((c) => typeof c.confidence === 'number' && c.confidence >= 0.75)
    .slice(0, 3);

  if (process.env.GEMINI_API_KEY && highConfidenceItems.length) {
    sensor_status.gemini = 'ok';
    for (const item of highConfidenceItems) {
      const prompt = `Is this current legal case real and still active as of 2025-2026?
Company: ${brand_name}
Alleged: ${String(item.alleged_conduct || item.case_description || '')}
Source: ${item.source_url}
Return JSON only: { "verified": true or false, "confidence": 0.0-1.0, "note": "brief reason" }`;
      const geminiVerification = await callGeminiVerify(prompt);
      if (geminiVerification) {
        item.gemini_verification = geminiVerification;
        if (!geminiVerification.verified) {
          item.confidence = Math.max(0.1, item.confidence - 0.2);
        }
      }
    }
  } else if (!process.env.GEMINI_API_KEY) {
    sensor_status.gemini = 'unavailable';
  }

  if (process.env.COURTLISTENER_API_KEY) {
    const courtHits = await searchCourtListener(brand_name);
    if (courtHits.length) {
      sensor_status.courtlistener = 'ok';
      active_cases = mergeCasesUniqueByUrl(active_cases, courtHits);
    }
  }

  active_cases = active_cases.filter((c) => (typeof c.confidence === 'number' ? c.confidence : 0) >= MIN_CASE_CONFIDENCE);

  if (!active_cases.length) {
    synth = {
      ...synth,
      active_cases: [],
      activity_level: 'quiet',
    };
  }

  const generated_at = new Date().toISOString();
  const signature = signPerimeterPayload({
    active_cases,
    perimeter_summary: synth.perimeter_summary,
    generated_at,
  });

  const output = {
    brand_slug,
    active_cases,
    perimeter_summary: synth.perimeter_summary,
    activity_level: active_cases.length ? synth.activity_level : 'quiet',
    sensor_status,
    generated_at,
    queries_used: queries,
    signature,
  };

  return output;
}
