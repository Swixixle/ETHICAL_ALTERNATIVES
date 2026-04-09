#!/usr/bin/env node
/**
 * server/db/corroborate_profiles.mjs
 *
 * Corroboration pass: **Claude** (web search, structured judgment) and **Perplexity**
 * Sonar (fast facts) run **in parallel** per profile vs `profile_json`. Report includes
 * `perplexity_corroboration`, cross-source escalation, and `NEEDS_HUMAN_REVIEW` when
 * the two models disagree on concern level.
 *
 * Run from repo:
 *   cd server && node db/corroborate_profiles.mjs --tier1
 *   cd server && node db/corroborate_profiles.mjs --slug walmart --dry-run
 *   cd server && node db/corroborate_profiles.mjs --all --batch-size 3 --batch-delay 45000 --output report.json
 *
 * Requires: DATABASE_URL, ANTHROPIC_API_KEY (unless --dry-run). Optional: PERPLEXITY_API_KEY.
 */
import pg from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { config as dotenvConfig } from 'dotenv';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

dotenvConfig({ path: join(__dirname, '..', '.env'), override: false });
dotenvConfig(); // cwd .env if present

const HARD_TIMEOUT_MS = 300_000;

/** Assistant output cap per Anthropic turn — keep modest so turn 1 can finish JSON + leave room for tool rounds. */
const MAX_OUTPUT_TOKENS = 2048;
const INPUT_COST_PER_M = 3.0;
const OUTPUT_COST_PER_M = 15.0;

/** Profiles to run first when validating the pipeline (sensitive / high-stakes dossiers). */
const TIER1_SLUGS = [
  'purdue-pharma',
  'volkswagen-group',
  'goldman-sachs',
  'nra',
  'boy-scouts-of-america',
  'roman-catholic-church',
  'southern-baptist-convention',
  'lds-church',
  'jehovahs-witnesses',
  'church-of-scientology',
  'flds-church',
  'yeshiva-university',
  'lev-tahor',
  'clinton-foundation',
  'gates-foundation',
];

const { values: opts } = parseArgs({
  options: {
    slug: { type: 'string' },
    type: { type: 'string' },
    all: { type: 'boolean' },
    tier1: { type: 'boolean' },
    'tier1-first': { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    'batch-size': { type: 'string', default: '5' },
    'batch-delay': { type: 'string', default: '30000' },
    output: { type: 'string', default: 'corroboration_report.json' },
    upsert: { type: 'boolean' },
    resume: { type: 'boolean' },
  },
  strict: true,
});

const BATCH_SIZE = Math.max(1, parseInt(opts['batch-size'], 10) || 5);
const BATCH_DELAY = Math.max(0, parseInt(opts['batch-delay'], 10) || 30_000);
const OUTPUT_FILE = opts.output;
const DRY_RUN = Boolean(opts['dry-run']);
const UPSERT = Boolean(opts.upsert);
const RESUME = Boolean(opts.resume);
const TIER1_FIRST = Boolean(opts['tier1-first']);

const MODEL = process.env.ANTHROPIC_INVESTIGATION_MODEL || 'claude-sonnet-4-20250514';
const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || 'sonar';
const PERPLEXITY_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.PERPLEXITY_CORROBORATION_TIMEOUT_MS) || 45_000, 8_000),
  90_000
);

function estimateCost(input, output) {
  return Number(
    ((input / 1_000_000) * INPUT_COST_PER_M + (output / 1_000_000) * OUTPUT_COST_PER_M).toFixed(4)
  );
}

/**
 * LLM fields often use compact "millions" (8.6) while prose uses full USD or "$12.5 million".
 */
function coerceApproxUsdToFullDollars(n) {
  if (!Number.isFinite(n) || n === 0) return null;
  const a = Math.abs(n);
  if (a >= 250_000) return Math.round(n); // already full USD
  if (a > 0 && a <= 1_000) return Math.round(n * 1_000_000); // e.g. 8.6 → 8.6M
  return Math.round(n);
}

/**
 * Apply unit word / suffix to a base number → USD dollars.
 */
function applyMoneyUnit(base, unitRaw) {
  let n = parseFloat(String(base).replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  const u = String(unitRaw || '')
    .toLowerCase()
    .trim();
  if (!u) return n;
  if (u.startsWith('trillion') || u === 'tn') n *= 1_000_000_000_000;
  else if (u === 'b' || u === 'bn' || u.startsWith('billion')) n *= 1_000_000_000;
  else if (u === 'm' || u === 'mm' || u.startsWith('million')) n *= 1_000_000;
  else if (u === 'k' || u.startsWith('thousand')) n *= 1_000;
  return n;
}

/**
 * Collect monetary figures normalized to USD (absolute dollars). Filters noise & duplicate scales.
 */
function extractNormalizedUsdAmounts(text) {
  const raw = String(text || '');
  const amounts = [];
  const seen = new Set();

  function add(n) {
    if (n == null || !Number.isFinite(n) || n < 1_000) return; // ignore sub-$1k noise
    const key = String(Math.round(n / 100) * 100); // ~$100 bucket dedupe
    if (seen.has(key)) return;
    seen.add(key);
    amounts.push(n);
  }

  // $12,500,000 | $12.5 million | $3.5bn | $2M
  for (const m of raw.matchAll(
    /\$\s*([\d,]+(?:\.\d+)?)\s*(trillion|billion|million|thousand|bn|tn|mill\.|bill\.|thous\.|[mMbBkK])?/gi
  )) {
    const unit = m[2];
    let n = applyMoneyUnit(m[1], unit);
    if (n == null) continue;
    const baseNum = parseFloat(String(m[1]).replace(/,/g, ''));
    // Skip tiny bare amounts like "$8.6" with no scale (avoid treating as dollars)
    if (!unit && Number.isFinite(baseNum) && baseNum >= 1 && baseNum < 10_000) continue;
    if (!unit && Number.isFinite(baseNum) && baseNum < 250_000 && /\.\d/.test(m[1])) continue;
    add(n);
  }

  // 12.5 million | 3 billion (no dollar sign)
  for (const m of raw.matchAll(/\b([\d,]+(?:\.\d+)?)\s+(trillion|billion|million|thousand)\b/gi)) {
    const n = applyMoneyUnit(m[1], m[2]);
    if (n != null) add(n);
  }

  // Compact suffix: 8.6M, $2B (letter must be M/B/K)
  for (const m of raw.matchAll(/\$?\s*([\d,]+(?:\.\d+)?)\s*([mMbBkK])(?=\b|[.,\s]|$)/g)) {
    const suf = (m[2] || '').toLowerCase();
    const unit =
      suf === 'm' ? 'million' : suf === 'b' ? 'billion' : suf === 'k' ? 'thousand' : '';
    const n = applyMoneyUnit(m[1], unit);
    if (n != null) add(n);
  }

  // Full-dollar integers: 12,500,000 or 8600000 (exclude years 1900–2039)
  for (const m of raw.matchAll(/\b(\d{1,3}(?:,\d{3})+|\d{6,})\b/g)) {
    const digits = m[1].replace(/,/g, '');
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n) || n < 100_000) continue;
    if (n >= 1900 && n <= 2039) continue;
    add(n);
  }

  return amounts.sort((a, b) => b - a);
}

/** @deprecated use extractNormalizedUsdAmounts — kept name for clarity in callers */
function extractDollarAmounts(text) {
  return extractNormalizedUsdAmounts(text);
}

function extractYears(text) {
  const raw = text || '';
  return [...raw.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => parseInt(m[0], 10));
}

function extractNames(text) {
  const raw = text || '';
  return [...raw.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g)].map((m) => m[1]);
}

function axisSummary(pj, key) {
  const o = pj?.[key];
  if (o && typeof o === 'object' && typeof o.summary === 'string') return o.summary;
  return '';
}

function profileTextStored(pj) {
  if (!pj || typeof pj !== 'object') return '';
  const nested = pj.profile && typeof pj.profile === 'object' ? pj.profile : {};
  const parts = [
    pj.executive_summary,
    nested.executive_summary,
    pj.generated_headline,
    pj.investigation_summary,
    pj.tax_summary,
    nested.tax_summary,
    axisSummary(pj, 'tax'),
    pj.legal_summary,
    nested.legal_summary,
    axisSummary(pj, 'legal'),
    pj.labor_summary,
    nested.labor_summary,
    axisSummary(pj, 'labor'),
    pj.environmental_summary,
    nested.environmental_summary,
    axisSummary(pj, 'environmental'),
    pj.political_summary,
    nested.political_summary,
    axisSummary(pj, 'political'),
    typeof pj.product_health === 'string' ? pj.product_health : '',
    nested.product_health,
    axisSummary(pj, 'executives'),
    pj.executives?.summary,
    nested.executives?.summary,
    pj.allegations?.summary,
    (pj.verdict_tags || []).join(' '),
    (nested.verdict_tags || []).join(' '),
    ...(Array.isArray(pj.timeline) ? pj.timeline.map((t) => `${t.year} ${t.event}`) : []),
  ];
  return parts.filter(Boolean).join(' ');
}

function profileTextLive(live) {
  if (!live || typeof live !== 'object') return '';
  const lf = Array.isArray(live.legal_findings)
    ? live.legal_findings
        .map((f) => {
          const bits = [f.summary || ''];
          const full = coerceApproxUsdToFullDollars(Number(f.amount_usd_approx));
          if (full != null) bits.push(`$${full.toLocaleString('en-US')}`);
          if (f.year != null) bits.push(String(f.year));
          return bits.join(' ');
        })
        .join(' ')
    : '';
  const execN = Array.isArray(live.executives)
    ? live.executives.map((e) => `${e.name} ${e.criminal_liability} ${e.note || ''}`).join(' ')
    : '';
  const parts = [
    live.executive_summary,
    live.generated_headline,
    live.tax_summary,
    live.legal_summary,
    lf,
    execN,
    live.verdict_tags_review?.tags_notes,
    live.labor_summary,
    live.environmental_summary,
    live.political_summary,
    typeof live.product_health === 'string' ? live.product_health : '',
    (live.verdict_tags || []).join(' '),
    ...(Array.isArray(live.timeline) ? live.timeline.map((t) => `${t.year} ${t.event}`) : []),
  ];
  return parts.filter(Boolean).join(' ');
}

/**
 * Map compact corroboration JSON into fields compareProfiles() already expects.
 */
function normalizeLiveCorroboration(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const findings = Array.isArray(raw.legal_findings) ? raw.legal_findings.slice(0, 3) : [];
  const legal_summary =
    raw.legal_summary ||
    findings
      .map((f) => {
        const amt =
          f.amount_usd_approx != null && Number.isFinite(Number(f.amount_usd_approx))
            ? `$${Number(f.amount_usd_approx).toLocaleString()}`
            : '';
        const yr = f.year != null ? String(f.year) : '';
        return [f.summary, amt, yr].filter(Boolean).join(' — ');
      })
      .join(' | ');
  const execs = Array.isArray(raw.executives) ? raw.executives : [];
  const execBlurb = execs
    .map(
      (e) =>
        `${e.name || ''} (${e.role || ''}) liability:${e.criminal_liability || 'unknown'} ${e.note || ''}`
    )
    .join('; ');
  const suggested = raw.verdict_tags_review?.suggested_verdict_tags;
  const verdict_tags =
    Array.isArray(suggested) && suggested.length
      ? suggested
      : Array.isArray(raw.verdict_tags)
        ? raw.verdict_tags
        : [];
  const named_executives = execs.map((e) => {
    const cl = String(e.criminal_liability || '').toLowerCase();
    let status = '';
    if (cl.includes('convict')) status = 'convicted';
    else if (cl.includes('acquit')) status = 'acquitted';
    return {
      name: e.name || '',
      status,
      key_fact: e.note || e.role || '',
    };
  });
  return {
    ...raw,
    legal_summary,
    executive_summary: [raw.executive_summary, execBlurb].filter(Boolean).join(' '),
    verdict_tags,
    named_executives,
    _verdict_tags_stored_accurate: raw.verdict_tags_review?.stored_tags_accurate,
  };
}

/**
 * Short prompt so turn-1 output stays small; enough to verify $ amounts, years, execs, tags.
 */
function buildCorroborationPromptCondensed(brandName, corporateParent, storedPj) {
  const brand = brandName || 'Unknown brand';
  const parent = corporateParent || 'unknown';
  const tags = storedPj && Array.isArray(storedPj.verdict_tags) ? storedPj.verdict_tags : [];
  const tagLine = tags.length ? tags.map((t) => String(t)).join(', ') : '(none in DB)';
  return `You verify our database profile against the live public record. Use web search. Reply with ONE compact JSON object only — no markdown, no prose before/after.

Entity — Brand: ${brand} — Parent: ${parent}
Stored verdict_tags (snake_case): ${tagLine}

JSON shape (fill all keys; arrays may be empty):
{
  "overall_concern_level": "significant" | "moderate" | "minor" | "clean",
  "legal_findings": [
    { "summary": "one sentence", "amount_usd_approx": number | null, "year": number | null }
  ],
  "executives": [
    { "name": "", "role": "", "criminal_liability": "none" | "charged" | "convicted" | "acquitted" | "investigation" | "unknown", "note": "" }
  ],
  "verdict_tags_review": {
    "stored_tags_accurate": boolean,
    "suggested_verdict_tags": [],
    "tags_notes": "one sentence"
  },
  "executive_summary": "max 2 short sentences"
}

Rules:
- legal_findings: at most 3 entries; most material fines/settlements/judgments first; use amount_usd_approx when known (numeric dollars).
- executives: current key named leaders; criminal_liability must reflect documented record only.
- verdict_tags_review: say whether stored tags are still accurate; suggested_verdict_tags = snake_case you would use today (can match stored).
- Stay under ~1200 words total in the JSON. No community_impact, timelines, or long category essays.`;
}

function normalizeConcern(s) {
  const x = String(s || '')
    .toLowerCase()
    .trim();
  if (x === 'minor' || x === 'low') return 'low_minor';
  if (x === 'clean') return 'clean';
  if (x === 'significant' || x === 'high') return 'significant';
  if (x === 'moderate' || x === 'medium') return 'moderate';
  return x || 'unknown';
}

function collectCitationUrls(response) {
  const urls = [];
  for (const b of response?.content || []) {
    if (b.type === 'text' && Array.isArray(b.citations)) {
      for (const c of b.citations) {
        if (c?.url) urls.push(c.url);
      }
    }
  }
  return urls;
}

function extractAssistantText(lastResponse) {
  return (lastResponse?.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

/**
 * Anthropic multi-turn loop with web_search (matches investigation service behavior).
 */
async function runLiveInvestigation(anthropic, userPrompt) {
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }];
  const messages = [{ role: 'user', content: userPrompt }];
  let inputTokens = 0;
  let outputTokens = 0;
  let lastResponse = null;
  const maxSteps = 24;

  for (let step = 0; step < maxSteps; step++) {
    lastResponse = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      tools,
      messages,
    });

    inputTokens += lastResponse.usage?.input_tokens || 0;
    outputTokens += lastResponse.usage?.output_tokens || 0;
    void collectCitationUrls(lastResponse);

    process.stdout.write(`  step ${step + 1} stop=${lastResponse.stop_reason} `);

    const sr = lastResponse.stop_reason;
    if (sr === 'end_turn' || sr === 'max_tokens') {
      console.log('✓');
      break;
    }

    if (sr === 'pause_turn') {
      messages.push({ role: 'assistant', content: lastResponse.content });
      continue;
    }

    if (sr === 'tool_use') {
      messages.push({ role: 'assistant', content: lastResponse.content });
      const toolResults = [];
      for (const block of lastResponse.content || []) {
        if (block.type === 'tool_use') {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content:
              'No local execution — use search results already returned. Reply with ONE compact JSON object only (corroboration schema from the user). No markdown.',
          });
        }
      }
      if (toolResults.length) {
        messages.push({ role: 'user', content: toolResults });
      } else {
        messages.push({
          role: 'user',
          content: 'Continue; output only the final compact JSON object (same schema).',
        });
      }
      continue;
    }

    console.log(`(stop=${sr})`);
    break;
  }

  const text = extractAssistantText(lastResponse);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in live investigation response');

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`JSON parse failed: ${e.message}`);
  }

  return { parsed, inputTokens, outputTokens };
}

/**
 * Fast fact retrieval via Perplexity Sonar. Returns `{ skipped: true }` if `PERPLEXITY_API_KEY` is unset (no log noise).
 */
async function runPerplexityFactCheck(brandName, corporateParent, storedPj) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key || !String(key).trim()) {
    return { skipped: true, reason: 'PERPLEXITY_API_KEY not set' };
  }

  const primary = [brandName, corporateParent].filter(Boolean).join(' / ') || String(brandName || 'entity');

  const userContent = `For "${primary}": what are the current **documented** legal settlements / major fines (with amounts and years where known), **conviction or plea status** of named executives or controlling owners if any, and a single overall concern assessment for the documented public record?

Use only verifiable sources (government filings, courts, regulators, established news). Do not speculate.

Return ONLY valid JSON (no markdown):
{
  "overall_concern_level": "significant" | "moderate" | "minor" | "clean",
  "key_legal_facts": ["each: short fact with $ and year if known"],
  "executive_accountability": "one or two sentences: who was criminally or civilly liable and current status if known",
  "caveats": "what remains uncertain or pending"
}`;

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), PERPLEXITY_TIMEOUT_MS);
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [{ role: 'user', content: userContent }],
        max_tokens: 1200,
        temperature: 0.1,
      }),
      signal: ac.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        skipped: false,
        error: `HTTP ${res.status} ${errText.slice(0, 240)}`,
        text: '',
        parsed: null,
        model: PERPLEXITY_MODEL,
      };
    }

    const data = await res.json();
    const text = String(data?.choices?.[0]?.message?.content || '').trim();
    if (!text) {
      return { skipped: false, error: 'empty response', text: '', parsed: null, model: PERPLEXITY_MODEL };
    }

    let parsed = null;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        parsed = null;
      }
    }

    return { skipped: false, text, parsed, model: PERPLEXITY_MODEL };
  } catch (e) {
    const msg = e?.name === 'AbortError' ? 'timeout' : e?.message || String(e);
    return { skipped: false, error: msg, text: '', parsed: null, model: PERPLEXITY_MODEL };
  }
}

const SEVERITY_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4, NEEDS_HUMAN_REVIEW: 5 };
const RANK_TO_LABEL = { 1: 'LOW', 2: 'MEDIUM', 3: 'HIGH', 4: 'CRITICAL' };

function escalateSeverity(sev) {
  if (sev === 'NEEDS_HUMAN_REVIEW' || sev === 'CRITICAL') return sev;
  const r = SEVERITY_RANK[sev];
  if (r == null) return sev;
  const next = Math.min(r + 1, 4);
  return RANK_TO_LABEL[next] ?? 'CRITICAL';
}

function perplexityTextForCompare(pp) {
  if (!pp || pp.skipped) return '';
  const parts = [
    pp.text,
    pp.parsed?.executive_accountability,
    pp.parsed?.caveats,
    ...(Array.isArray(pp.parsed?.key_legal_facts) ? pp.parsed.key_legal_facts : []),
    pp.parsed?.overall_concern_level,
  ];
  return parts.filter(Boolean).join(' ');
}

function mergePerplexityCrossCheck(core, storedPj, live, pp) {
  const perplexity_corroboration = {
    ran: Boolean(pp && !pp.skipped && !pp.error && pp.text),
    skipped_reason: pp?.skipped ? pp.reason : null,
    error: pp?.error || null,
    model: pp?.model || null,
    parsed_excerpt: pp?.parsed
      ? JSON.stringify(pp.parsed).slice(0, 600)
      : (pp?.text || '').slice(0, 600),
    vs_claude: /** @type {Record<string, unknown> | null} */ (null),
  };

  if (!pp || pp.skipped) {
    perplexity_corroboration.vs_claude = {
      claude_agreement: 'n/a',
      note: pp?.reason || 'Perplexity not configured',
    };
    return { ...core, perplexity_corroboration, needs_human_review: false };
  }

  if (pp.error && !pp.text) {
    perplexity_corroboration.vs_claude = {
      claude_agreement: 'n/a',
      status: 'perplexity_failed',
      note: pp.error,
    };
    return { ...core, perplexity_corroboration, needs_human_review: false };
  }

  const ppLevel = normalizeConcern(pp.parsed?.overall_concern_level || '');
  const clLevel = normalizeConcern(live?.overall_concern_level);
  const stLevel = normalizeConcern(storedPj?.overall_concern_level);
  const ppText = perplexityTextForCompare(pp);
  const liveText = profileTextLive(live);

  const levelsAligned = ppLevel === clLevel || ppLevel === 'unknown' || clLevel === 'unknown';
  perplexity_corroboration.vs_claude = {
    perplexity_concern: pp.parsed?.overall_concern_level ?? null,
    claude_concern: live?.overall_concern_level ?? null,
    concern_alignment: levelsAligned ? 'aligned' : 'divergent',
    /** Do Perplexity and Claude line up on the headline assessment (concern)? */
    claude_agreement: levelsAligned ? 'agree' : 'disagree',
  };

  let needs_human_review = false;
  const discrepancies = [...core.discrepancies];

  if (!levelsAligned && ppLevel !== 'unknown' && clLevel !== 'unknown') {
    needs_human_review = true;
    discrepancies.push({
      field: 'cross_source.claude_vs_perplexity_concern',
      severity: 'NEEDS_HUMAN_REVIEW',
      stored: String(storedPj?.overall_concern_level ?? ''),
      live: `Claude: ${live?.overall_concern_level}; Perplexity: ${pp.parsed?.overall_concern_level}`,
      note: 'Claude and Perplexity disagree on overall concern — human review.',
    });
  }

  const ppAmounts = extractDollarAmounts(ppText).sort((a, b) => b - a);
  const clAmounts = extractDollarAmounts(liveText).sort((a, b) => b - a);
  const ppClCloserClaude =
    ppAmounts.length > 0 &&
    clAmounts.length > 0 &&
    Math.abs(ppAmounts[0] - clAmounts[0]) / Math.max(ppAmounts[0], clAmounts[0], 1) < 0.35;

  for (let i = 0; i < discrepancies.length; i++) {
    const d = discrepancies[i];
    if (d.severity === 'NEEDS_HUMAN_REVIEW') continue;

    let agree = false;

    if (d.field === 'overall_concern_level' && levelsAligned && ppLevel === clLevel && stLevel !== clLevel) {
      agree = true;
    }

    if (d.field === 'dollar_amounts' && ppClCloserClaude) {
      const storedAmounts = extractDollarAmounts(profileTextStored(storedPj)).sort((a, b) => b - a);
      if (storedAmounts.length && ppAmounts.length && clAmounts.length) {
        const stM = storedAmounts[0];
        const bothChallengeStored =
          Math.abs(clAmounts[0] - stM) / Math.max(stM, 1) > 0.15 &&
          Math.abs(ppAmounts[0] - stM) / Math.max(stM, 1) > 0.15 &&
          Math.abs(ppAmounts[0] - clAmounts[0]) < 0.35 * Math.max(ppAmounts[0], clAmounts[0]);
        if (bothChallengeStored) agree = true;
      }
    }

    if (agree) {
      discrepancies[i] = {
        ...d,
        severity: escalateSeverity(d.severity),
        note: `${d.note} [escalated: Claude & Perplexity agree vs stored]`,
      };
    }
  }

  perplexity_corroboration.vs_claude.summary =
    perplexity_corroboration.vs_claude.claude_agreement === 'agree'
      ? 'Perplexity agrees with Claude on concern level (or one side unknown).'
      : 'Perplexity disagrees with Claude on concern level.';
  perplexity_corroboration.vs_claude.escalation_note = needs_human_review
    ? 'Models diverge — NEEDS_HUMAN_REVIEW.'
    : 'Cross-source: escalate severities where both models challenge stored amounts/concern.';

  return { discrepancies, netNew: core.netNew, perplexity_corroboration, needs_human_review };
}

/** Core discrepancies without Perplexity cross-check (testable). */
function compareProfilesCore(slug, storedPj, live) {
  const discrepancies = [];
  const storedText = profileTextStored(storedPj);
  const liveText = profileTextLive(live);

  if (live._verdict_tags_stored_accurate === false) {
    discrepancies.push({
      field: 'verdict_tags_review',
      severity: 'MEDIUM',
      stored: (storedPj?.verdict_tags || []).join(', ') || '(none)',
      live: live.verdict_tags_review?.tags_notes || (live.verdict_tags || []).join(', '),
      note: 'Live check flagged stored verdict_tags as no longer accurate.',
    });
  }

  const storedLevel = normalizeConcern(storedPj?.overall_concern_level);
  const liveLevel = normalizeConcern(live?.overall_concern_level);
  if (storedLevel && liveLevel && storedLevel !== liveLevel && storedLevel !== 'unknown' && liveLevel !== 'unknown') {
    discrepancies.push({
      field: 'overall_concern_level',
      severity: 'HIGH',
      stored: storedPj?.overall_concern_level,
      live: live?.overall_concern_level,
      note: 'Concern level assessment differs between stored profile and live investigation.',
    });
  }

  const storedAmounts = extractDollarAmounts(storedText).sort((a, b) => b - a);
  const liveAmounts = extractDollarAmounts(liveText).sort((a, b) => b - a);

  if (storedAmounts.length > 0 && liveAmounts.length > 0) {
    const storedMax = storedAmounts[0];
    const liveMax = liveAmounts[0];
    const denom = Math.max(Math.abs(storedMax), Math.abs(liveMax), 1);
    const diff = Math.abs(storedMax - liveMax) / denom;
    const pct = Math.min(9_999, Math.round(diff * 100));
    const pctNote = `~${pct}%`;
    if (diff > 0.2) {
      discrepancies.push({
        field: 'dollar_amounts',
        severity: diff > 0.5 ? 'CRITICAL' : 'HIGH',
        stored: `$${storedMax.toLocaleString()} (largest normalized)`,
        live: `$${liveMax.toLocaleString()} (largest normalized)`,
        note: `Largest headline amounts differ ${pctNote} after normalizing to USD.`,
      });
    } else if (diff > 0.08) {
      discrepancies.push({
        field: 'dollar_amounts',
        severity: 'MEDIUM',
        stored: `$${storedMax.toLocaleString()} (largest normalized)`,
        live: `$${liveMax.toLocaleString()} (largest normalized)`,
        note: `Financial headline figures differ moderately (${pctNote}) after USD normalization.`,
      });
    }
  }

  const liveExecs = Array.isArray(live.named_executives) ? live.named_executives : [];
  for (const exec of liveExecs) {
    const name = exec.name || '';
    if (!name) continue;
    if (storedText.toLowerCase().includes(name.toLowerCase())) {
      const storedMentions = storedText.toLowerCase();
      const liveStatus = (exec.status || '').toLowerCase();
      if (liveStatus === 'acquitted' && storedMentions.includes('convicted')) {
        discrepancies.push({
          field: `executive.${name}`,
          severity: 'CRITICAL',
          stored: 'described as convicted',
          live: `status: acquitted (${exec.key_fact || ''})`,
          note: `${name} — stored profile implies conviction; live research suggests acquittal. Verify.`,
        });
      }
      if (
        liveStatus === 'convicted' &&
        !storedMentions.includes('convicted') &&
        !storedMentions.includes('guilty')
      ) {
        discrepancies.push({
          field: `executive.${name}`,
          severity: 'HIGH',
          stored: 'not described as convicted',
          live: `status: convicted (${exec.key_fact || ''})`,
          note: `${name} — live investigation found conviction not emphasized in stored profile.`,
        });
      }
    }
  }

  const storedYears = extractYears(storedText);
  const liveYears = extractYears(liveText);
  if (storedYears.length > 0 && liveYears.length > 0) {
    const storedMin = Math.min(...storedYears);
    const liveMin = Math.min(...liveYears);
    if (Math.abs(storedMin - liveMin) > 3) {
      discrepancies.push({
        field: 'timeline_years',
        severity: 'MEDIUM',
        stored: `earliest year token: ${storedMin}`,
        live: `earliest year token: ${liveMin}`,
        note: 'Earliest cited years differ — check founding dates and milestone years.',
      });
    }
  }

  const storedAllegations = (storedPj?.allegations?.summary || '').toLowerCase();
  const liveAllegationsResponse = (live.allegations_response || '').toLowerCase();
  const hasType3Default = storedAllegations.includes('no formal public response');
  const liveHasResponse =
    liveAllegationsResponse.length > 20 &&
    !liveAllegationsResponse.includes('no formal public response') &&
    !liveAllegationsResponse.includes('no documented response');

  if (hasType3Default && liveHasResponse) {
    discrepancies.push({
      field: 'allegations.response',
      severity: 'MEDIUM',
      stored: 'Type 3 default (no documented response)',
      live: (live.allegations_response || '').slice(0, 200),
      note: 'Stored profile uses Type 3 default; live payload includes allegations_response text.',
    });
  }

  const stTags = new Set((storedPj?.verdict_tags || []).map((t) => String(t).toLowerCase()));
  const lvTags = new Set((live.verdict_tags || []).map((t) => String(t).toLowerCase()));
  const onlyStored = [...stTags].filter((t) => !lvTags.has(t));
  const onlyLive = [...lvTags].filter((t) => !stTags.has(t));
  if (onlyStored.length + onlyLive.length >= 4) {
    discrepancies.push({
      field: 'verdict_tags',
      severity: 'LOW',
      stored: onlyStored.slice(0, 12).join(', ') || '(none)',
      live: onlyLive.slice(0, 12).join(', ') || '(none)',
      note: 'Verdict tag sets diverge — may be taxonomy drift or new findings.',
    });
  }

  const storedNames = new Set(extractNames(storedText).map((n) => n.toLowerCase()));
  const liveNames = extractNames(liveText);
  const novelLiveNames = liveNames.filter(
    (n) => n.length > 5 && !storedNames.has(n.toLowerCase())
  );
  if (novelLiveNames.length >= 8) {
    discrepancies.push({
      field: 'named_individuals',
      severity: 'LOW',
      stored: `~${storedNames.size} heuristic name tokens`,
      live: novelLiveNames.slice(0, 15).join(', '),
      note: 'Live text contains many capitalized names not surfaced in stored profile (heuristic).',
    });
  }

  const yNow = new Date().getFullYear();
  const netNewTimeline = Array.isArray(live.timeline)
    ? live.timeline.filter((e) => Number(e.year) > yNow)
    : [];

  const netNewLegacy = Array.isArray(live.post_2025_events)
    ? live.post_2025_events.filter((e) => typeof e === 'string' && e.trim().length > 10)
    : [];

  const netNew = [
    ...(netNewTimeline || []).map((e) => `${e.year}: ${e.event}`),
    ...netNewLegacy,
  ];

  return { discrepancies, netNew };
}

function compareProfiles(slug, storedPj, live, ppResult) {
  const core = compareProfilesCore(slug, storedPj, live);
  return mergePerplexityCrossCheck(core, storedPj, live, ppResult);
}

function sortTier1First(rows) {
  const tier = new Set(TIER1_SLUGS.map((s) => s.toLowerCase()));
  const a = [];
  const b = [];
  for (const r of rows) {
    if (tier.has(String(r.brand_slug).toLowerCase())) a.push(r);
    else b.push(r);
  }
  const order = (slug) => {
    const i = TIER1_SLUGS.indexOf(String(slug).toLowerCase());
    return i === -1 ? 9999 : i;
  };
  a.sort((x, y) => order(x.brand_slug) - order(y.brand_slug));
  b.sort((x, y) => String(x.brand_name).localeCompare(String(y.brand_name)));
  return [...a, ...b];
}

function writeReport(report) {
  writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2), 'utf8');
}

function parseProfileJson(row) {
  let pj = row.profile_json;
  if (pj == null) return null;
  if (typeof pj === 'string') {
    try {
      pj = JSON.parse(pj);
    } catch {
      return null;
    }
  }
  return typeof pj === 'object' ? pj : null;
}

async function main() {
  console.log('\n=== EthicalAlt profile corroboration ===\n');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY && !DRY_RUN) {
    console.error('ERROR: ANTHROPIC_API_KEY is required (or use --dry-run)');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const { rows: cnt } = await pool.query('SELECT COUNT(*)::int AS n FROM incumbent_profiles');
    console.log(`DB connected. Total incumbent_profiles: ${cnt[0].n}`);
  } catch (err) {
    console.error('ERROR: DB connection failed:', err.message);
    process.exit(1);
  }

  let profileRows;
  if (opts.slug) {
    const { rows } = await pool.query(
      `SELECT brand_slug, brand_name, parent_company, profile_type, overall_concern_level, profile_json
       FROM incumbent_profiles WHERE LOWER(brand_slug) = LOWER($1)`,
      [opts.slug.trim()]
    );
    profileRows = rows;
  } else if (opts.tier1) {
    const { rows } = await pool.query(
      `SELECT brand_slug, brand_name, parent_company, profile_type, overall_concern_level, profile_json
       FROM incumbent_profiles WHERE LOWER(brand_slug) = ANY($1::text[])
       ORDER BY brand_name ASC`,
      [TIER1_SLUGS.map((s) => s.toLowerCase())]
    );
    profileRows = sortTier1First(rows);
  } else if (opts.type) {
    const { rows } = await pool.query(
      `SELECT brand_slug, brand_name, parent_company, profile_type, overall_concern_level, profile_json
       FROM incumbent_profiles WHERE profile_type = $1 ORDER BY brand_name ASC`,
      [opts.type]
    );
    profileRows = rows;
  } else if (opts.all) {
    const { rows } = await pool.query(
      `SELECT brand_slug, brand_name, parent_company, profile_type, overall_concern_level, profile_json
       FROM incumbent_profiles ORDER BY profile_type NULLS LAST, brand_name ASC`
    );
    profileRows = TIER1_FIRST ? sortTier1First(rows) : rows;
  } else {
    console.error('Specify one of: --all, --tier1, --slug <slug>, or --type <type>');
    console.error('Tip: use --tier1 first in production; add --tier1-first with --all to prioritize Tier 1.');
    await pool.end();
    process.exit(1);
  }

  console.log(`Profiles selected: ${profileRows.length}`);
  if (TIER1_FIRST && opts.all) console.log('Order: Tier 1 slugs first (--tier1-first), then remainder A–Z.');

  if (DRY_RUN) {
    console.log('\nDRY RUN — would check:');
    profileRows.forEach((r) => console.log(`  ${r.brand_slug} (${r.profile_type || 'database'})`));
    console.log(`\nRough cost guess: ~$${(profileRows.length * 0.12).toFixed(2)} (depends on model + search)`);
    await pool.end();
    return;
  }

  let report = {
    generated_at: new Date().toISOString(),
    total_profiles: profileRows.length,
    profiles_checked: 0,
    discrepancies_found: 0,
    confirmed: 0,
    errors: 0,
    estimated_cost_usd: 0,
    results: [],
  };

  if (RESUME && existsSync(OUTPUT_FILE)) {
    try {
      report = JSON.parse(readFileSync(OUTPUT_FILE, 'utf8'));
      console.log(`Resume: existing results: ${report.results?.length || 0}`);
    } catch {
      console.warn('Could not parse existing report — starting fresh');
    }
  }

  const processedSlugs = new Set((report.results || []).map((r) => r.slug));

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let totalCost = report.estimated_cost_usd || 0;
  let checked = 0;
  let discrepancyCount = report.discrepancies_found || 0;
  let confirmedCount = report.confirmed || 0;
  let errorCount = report.errors || 0;

  for (let i = 0; i < profileRows.length; i += BATCH_SIZE) {
    const batch = profileRows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      if (processedSlugs.has(row.brand_slug)) {
        console.log(`  skip ${row.brand_slug} (resume)`);
        continue;
      }

      checked++;
      const startMs = Date.now();
      const pj = parseProfileJson(row);
      console.log(`\n[${checked}/${profileRows.length}] ${row.brand_name} (${row.brand_slug})`);

      let entryResult;

      try {
        const corporateParent =
          row.parent_company ||
          pj?.parent_company ||
          pj?.ultimate_parent ||
          pj?.parent ||
          null;

        const userPrompt = buildCorroborationPromptCondensed(row.brand_name, corporateParent, pj);

        const claudeTask = Promise.race([
          runLiveInvestigation(anthropic, userPrompt),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Hard timeout 300s exceeded')), HARD_TIMEOUT_MS)
          ),
        ]);
        const ppTask = runPerplexityFactCheck(row.brand_name, corporateParent, pj);

        const [liveResult, ppResult] = await Promise.all([claudeTask, ppTask]);

        if (ppResult.skipped) {
          console.log('  perplexity: skipped');
        } else if (ppResult.error && !ppResult.text) {
          console.log(`  perplexity: error (${ppResult.error})`);
        } else {
          console.log(
            `  perplexity: ok (${ppResult.parsed?.overall_concern_level ?? 'unparsed text'})`
          );
        }

        const { parsed: rawLive, inputTokens, outputTokens } = liveResult;
        const live = normalizeLiveCorroboration(rawLive);
        const cost = estimateCost(inputTokens, outputTokens);
        totalCost = Number((totalCost + cost).toFixed(4));

        console.log(`  claude tokens in=${inputTokens} out=${outputTokens} ~$${cost} | cumulative ~$${totalCost}`);

        const { discrepancies, netNew, perplexity_corroboration, needs_human_review } = compareProfiles(
          row.brand_slug,
          pj,
          live,
          ppResult
        );

        const status = discrepancies.length > 0 ? 'DISCREPANCY' : 'CONFIRMED';
        if (status === 'DISCREPANCY') discrepancyCount++;
        else confirmedCount++;

        console.log(
          `  ${status} | discrepancies=${discrepancies.length} | net_new=${netNew.length}${needs_human_review ? ' | NEEDS_HUMAN_REVIEW' : ''}`
        );
        discrepancies.forEach((d) => console.log(`    [${d.severity}] ${d.field}: ${d.note}`));

        entryResult = {
          slug: row.brand_slug,
          brand_name: row.brand_name,
          profile_type: row.profile_type,
          status,
          needs_human_review,
          perplexity_corroboration,
          discrepancies,
          net_new_findings: netNew,
          stored_concern_level: row.overall_concern_level,
          live_concern_level: live.overall_concern_level ?? null,
          live_executive_summary: (live.executive_summary || '').slice(0, 500),
          tokens_used: { input: inputTokens, output: outputTokens },
          estimated_cost_usd: cost,
          duration_ms: Date.now() - startMs,
          timestamp: new Date().toISOString(),
        };

        if (UPSERT && status === 'DISCREPANCY') {
          const bad = discrepancies.some((d) => d.severity === 'CRITICAL' || d.severity === 'HIGH');
          if (bad) {
            await pool.query(
              `UPDATE incumbent_profiles SET profile_json = profile_json || $1::jsonb, updated_at = NOW() WHERE brand_slug = $2`,
              [
                JSON.stringify({
                  _corroborated_at: new Date().toISOString(),
                  _corroboration_discrepancy_notes: discrepancies,
                  _corroboration_live_concern: live.overall_concern_level ?? null,
                }),
                row.brand_slug,
              ]
            );
            entryResult.upserted_annotation = true;
            console.log('  ✓ merged corroboration metadata into profile_json');
          }
        }
      } catch (err) {
        errorCount++;
        console.error(`  ERROR: ${err.message}`);
        entryResult = {
          slug: row.brand_slug,
          brand_name: row.brand_name,
          profile_type: row.profile_type,
          status: 'ERROR',
          error: err.message,
          duration_ms: Date.now() - startMs,
          timestamp: new Date().toISOString(),
        };
      }

      report.results.push(entryResult);
      report.profiles_checked = checked;
      report.discrepancies_found = discrepancyCount;
      report.confirmed = confirmedCount;
      report.errors = errorCount;
      report.estimated_cost_usd = totalCost;
      report.generated_at = new Date().toISOString();
      writeReport(report);
    }

    if (i + BATCH_SIZE < profileRows.length && BATCH_DELAY > 0) {
      console.log(`\nBatch delay ${BATCH_DELAY}ms…`);
      await new Promise((r) => setTimeout(r, BATCH_DELAY));
    }
  }

  await pool.end();

  console.log('\n=== Done ===');
  console.log(`Checked: ${checked} | discrepancies: ${discrepancyCount} | confirmed: ${confirmedCount} | errors: ${errorCount}`);
  console.log(`Report: ${OUTPUT_FILE} | est. cost: $${totalCost}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
