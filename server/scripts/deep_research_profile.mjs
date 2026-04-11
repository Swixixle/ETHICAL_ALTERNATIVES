#!/usr/bin/env node
/**
 * Deep research pipeline: Perplexity (research + citations) → Claude (structure) → DB append.
 *
 * Usage:
 *   node server/scripts/deep_research_profile.mjs --slug walmart --dry-run
 *   node server/scripts/deep_research_profile.mjs --slug target --sector retail --dry-run --cost-cap 3
 *   node server/scripts/deep_research_profile.mjs --slug hca-healthcare --sector healthcare --dry-run --cost-cap 3
 *   node server/scripts/deep_research_profile.mjs --all --batch-size 2 --delay 60000
 *   node server/scripts/deep_research_profile.mjs --slug walmart --category labor_and_wage --dry-run
 *   node server/scripts/deep_research_profile.mjs --all-categories --slug walmart --dry-run
 *   node server/scripts/deep_research_profile.mjs --slug target --sector retail --dry-run --cost-cap 5 --resume
 *   node server/scripts/deep_research_profile.mjs --slug target --category labor_and_wage --dry-run --merge-existing
 *
 * Sector sets: up to 6 categories per run (from `profile_type` / `profile_json.sector` or `--sector`), unless `--all-categories`.
 * Category passes use a **snake draft**: round 1 forward (one Perplexity+Claude per category), round 2 reverse if budget remains. Each category saves to `deep_research_output/[slug]/[category].json` immediately; per-category resume skips completed rounds. **`--resume`** skips all Perplexity (subsidiary map + category queries) and loads existing temp files, then runs dedup → institutional → summary only. Final merge writes `[slug]_deep.json` and removes the temp dir on full success.
 * **`--merge-existing`** (dry-run): if `deep_research_output/[slug]_deep.json` exists, merge it with this run before write — union `per_category` (current run wins per category), `mergeIncidentsPreserveConfirmed` for `incidents`, concat+dedupe `gaps` / `related_clusters`; keep `institutional_enablement`, `summaries`, `corporate_tree` from the current run when present, else prior file; sum `costs`.
 * Perplexity spend cap: --cost-cap (USD), else PERPLEXITY_DEEP_RESEARCH_COST_CAP_USD, else default **10** (sector-aware runs). Category rounds halt gracefully at cap; saved progress is merged.
 * Truncation: `--max-chars` (default 25000) on Perplexity text before Claude extraction.
 *
 * Requires: PERPLEXITY_API_KEY, ANTHROPIC_API_KEY. DATABASE_URL for slug lookup / writes (unless --dry-run with inferred name).
 */
import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { config as dotenvConfig } from 'dotenv';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

dotenvConfig({ path: join(__dirname, '..', '.env'), override: false });
dotenvConfig({ path: join(process.cwd(), '.env'), override: false });

const PERPLEXITY_ENDPOINT =
  process.env.PERPLEXITY_API_URL || 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_FALLBACK_ENDPOINT = 'https://api.perplexity.ai/v1/sonar';

const DEEP_RESEARCH_MODEL_PRIMARY = 'sonar-deep-research';
const DEEP_RESEARCH_MODEL_FALLBACK = process.env.PERPLEXITY_MODEL || 'sonar';

const CLAUDE_MODEL = process.env.ANTHROPIC_INVESTIGATION_MODEL || 'claude-sonnet-4-20250514';
const MAX_CLAUDE_OUTPUT = 8192;

const ANTHROPIC_INPUT_PER_M = 3.0;
const ANTHROPIC_OUTPUT_PER_M = 15.0;

/** Default cap tuned for ~6 category (sector) runs; use `--cost-cap` for full `--all-categories` passes. */
const DEFAULT_PERPLEXITY_COST_CAP_USD = 10;
const MIN_BATCH_DELAY_MS = 60_000;

/** Max incidents kept per category after merging rounds (sort amount_usd, date); remainder in overflow fields. */
const INCIDENTS_PER_CATEGORY_CAP = 15;

const SNAKE_ROUND = /** @type {const} */ ({ ONE: 1, TWO: 2 });

const SECTOR_CATEGORIES = {
  retail: [
    'labor_and_wage',
    'environmental',
    'antitrust_and_market_power',
    'subsidies_and_bailouts',
    'institutional_enablement',
    'supply_chain',
  ],
  healthcare: [
    'regulatory_and_legal',
    'product_safety',
    'financial_misconduct',
    'labor_and_wage',
    'institutional_enablement',
    'discrimination_and_civil_rights',
  ],
  fast_food: [
    'labor_and_wage',
    'product_safety',
    'environmental',
    'antitrust_and_market_power',
    'subsidies_and_bailouts',
  ],
  financial: [
    'financial_misconduct',
    'antitrust_and_market_power',
    'regulatory_and_legal',
    'discrimination_and_civil_rights',
    'institutional_enablement',
    'data_and_privacy',
  ],
  tech: [
    'data_and_privacy',
    'antitrust_and_market_power',
    'labor_and_wage',
    'financial_misconduct',
    'institutional_enablement',
  ],
  energy: [
    'environmental',
    'regulatory_and_legal',
    'institutional_enablement',
    'financial_misconduct',
    'subsidies_and_bailouts',
    'labor_and_wage',
  ],
  default: [
    'labor_and_wage',
    'environmental',
    'regulatory_and_legal',
    'product_safety',
    'institutional_enablement',
    'subsidies_and_bailouts',
  ],
};

const CATEGORY_LABEL_OVERFLOW = {
  labor_and_wage: 'labor and wage',
  environmental: 'environmental',
  regulatory_and_legal: 'regulatory and legal',
  product_safety: 'product safety',
  financial_misconduct: 'financial misconduct',
  data_and_privacy: 'data and privacy',
  antitrust_and_market_power: 'antitrust and market power',
  discrimination_and_civil_rights: 'discrimination and civil rights',
  institutional_enablement: 'institutional enablement',
  executive_and_governance: 'executive and governance',
  supply_chain: 'supply chain',
  subsidies_and_bailouts: 'subsidies and bailouts',
};

const CATEGORY_QUERIES = {
  labor_and_wage: {
    round1: `Find every documented wage-and-hour action, FLSA or state-law class or collective action, off-the-clock or meal/rest break claim, scheduling or on-call pay dispute, worker misclassification or independent-contractor challenge, OSHA citation or serious safety violation, NLRB unfair labor practice charge or representation case, union organizing retaliation or bargaining impasse, WARN Act layoff, and employment discrimination or harassment case involving {company}. Search both the public brand name and legal employer names, retail banners, staffing vendors, and warehouse or logistics affiliates. Include docket or case numbers, filing dates, settlement or judgment amounts, agency determination IDs, and direct links to DOL WHD, OSHA, NLRB, EEOC, state labor agencies, or court records. Go back as far as digital records exist.`,

    round2: `Second research pass, same labor scope: find additional incidents not clearly covered above. Prioritize PACER or state court complaints, DOL WHD enforcement summaries, OSHA inspection detail (IMIS/ECHO), NLRB case dashboards, multi-district wage-and-hour listings, and published consent decrees or settlements that include docket citations.`,
  },

  environmental: {
    round1: `Find every EPA enforcement action, Clean Air Act violation, Clean Water Act violation, Superfund site involvement, state environmental penalty, and greenwashing enforcement action involving {company} and all its subsidiaries. Include EPA ECHO records, state agency actions, and NGO documented cases with dates and dollar amounts.`,

    round2: `Second pass: prioritize EPA ECHO inspection and formal enforcement documents, state consent orders, Superfund administrative records, citizen suit complaints, and administrative law judge decisions with direct links.`,
  },

  regulatory_and_legal: {
    round1: `Find every DOJ prosecution, FTC enforcement action, state attorney general settlement, consent decree, deferred prosecution agreement, and criminal conviction involving {company} and all its subsidiaries. Include case names, courts, outcomes, and dollar amounts going back as far as records exist.`,

    round2: `Second pass: prioritize PACER dockets, DOJ press releases with case numbers, FTC administrative complaints, AG complaint PDFs, and plea or sentencing documents.`,
  },

  product_safety: {
    round1: `Find every FDA warning letter, product recall, CPSC enforcement action, black box warning, mass tort litigation (MDL), and consumer safety enforcement action involving {company} products. Include dates, products affected, and direct links to FDA or CPSC records.`,

    round2: `Second pass: prioritize FDA inspection records, recall databases, CPSC recall/resolution documents, MDL transfer orders, and court-approved settlements.`,
  },

  financial_misconduct: {
    round1: `Find every SEC enforcement action, accounting fraud, financial restatement, auditor resignation, tax shelter ruling, transfer pricing dispute, and PCAOB enforcement action involving {company}. Include case numbers, amounts, and direct links to SEC EDGAR or DOJ records.`,

    round2: `Second pass: prioritize SEC litigation releases, administrative proceedings, AAERs, PCAOB disciplinary orders, and DOJ fraud indictments with docket links.`,
  },

  data_and_privacy: {
    round1: `Find every data breach, FTC privacy enforcement, state AG privacy action, GDPR fine, worker surveillance controversy, and dark pattern enforcement involving {company}. Include dates, number of users affected, and regulatory records.`,

    round2: `Second pass: prioritize FTC complaint PDFs, state AG stipulated judgments, EU DPA decisions, breach notifications, and court class certification orders.`,
  },

  antitrust_and_market_power: {
    round1: `Find every DOJ antitrust lawsuit, FTC monopolization case, EU competition fine, price-fixing scheme, bid rigging case, and market allocation agreement involving {company}. Include case names, courts, outcomes, and dollar amounts.`,

    round2: `Second pass: prioritize DOJ/FTC complaints, EU Commission decisions, plea agreements, and sentencing memos naming {company} or subsidiaries.`,
  },

  discrimination_and_civil_rights: {
    round1: `Find every EEOC pattern-or-practice lawsuit, DOJ Civil Rights Division action, redlining or discriminatory lending case, algorithmic bias settlement, and class action discrimination case involving {company}. Include dates, populations affected, and settlement amounts.`,

    round2: `Second pass: prioritize EEOC suit filings, DOJ consent decrees, HUD fair lending actions, and court opinions or class notices.`,
  },

  institutional_enablement: {
    round1: `Find documented cases where regulators failed to act on known violations by {company}, revolving door officials who moved between {company} and regulatory agencies (with names, roles, and dates), government subsidies and tax breaks received by {company} especially after major violations, and any congressional investigations or inspector general reports naming {company}.`,

    round2: `Second pass: prioritize IG reports, GAO products, congressional hearing transcripts, lobbying disclosures tied to rulemakings, and revolving-door employment announcements with dates.`,
  },

  executive_and_governance: {
    round1: `Find the CEO-to-median-worker pay ratio for {company}, any related-party transactions, insider loans, dual-class share controversies, board independence issues, and executive compensation controversies. Also find any executives convicted of crimes or named in major enforcement actions.`,

    round2: `Second pass: prioritize DEF 14A pay ratio tables, related-party footnotes in 10-K, insider transaction forms, and criminal dockets naming executives.`,
  },

  supply_chain: {
    round1: `Find documented use of prison labor, forced labor, or child labor in {company}'s supply chain, conflict mineral controversies, and major safety or labor violations at key suppliers that exist primarily because of {company}'s purchasing power. Include NGO reports, congressional investigations, and journalist investigations with sources.`,

    round2: `Second pass: prioritize CBP withhold release orders, OECD/ILO-linked reports with named suppliers, customs complaints, and supplier audit disclosures.`,
  },

  subsidies_and_bailouts: {
    round1: `Find every government subsidy, tax incentive, bailout, loan guarantee, and special tax break received by {company} using Good Jobs First Subsidy Tracker data and other sources. Include amounts, dates, granting agencies, and any conditions attached. Compare total subsidies received to total penalties paid.`,

    round2: `Second pass: prioritize GJF entries with program IDs, state incentive agreements, CARES/PPP disclosure where applicable, and GAO or state auditor reports.`,
  },
};

/** @param {string} category @param {number} roundNum */
function getCategoryQueryTemplate(category, roundNum) {
  const def = CATEGORY_QUERIES[category];
  if (
    def &&
    typeof def === 'object' &&
    typeof def.round1 === 'string' &&
    typeof def.round2 === 'string'
  ) {
    return roundNum === SNAKE_ROUND.TWO ? def.round2 : def.round1;
  }
  throw new Error(`Missing or invalid CATEGORY_QUERIES entry for "${category}"`);
}

const CATEGORY_KEYS = Object.keys(CATEGORY_QUERIES);

const EXTRACTOR_SYSTEM = `You are a structured data extractor for an investigative journalism accountability tool. You receive raw research text and citation URLs from Perplexity. Your job is to extract every distinct incident and normalize it to a JSON schema. Rules:
- Never invent facts not present in the provided text
- Every incident must have a source_url from the provided citations
- If no citation URL exists for an incident, set confidence to "low" and source_url to null
- Descriptions are one neutral sentence — no adjectives asserting guilt, no editorializing
- Return only a valid JSON array, no prose, no markdown fences
- Omit any incident that does not clearly involve the company named in the Category line (as brand, legal employer, or subsidiary named in the research); do not extract other companies' cases

CRITICAL: Use EXACTLY these field names on every incident object — no variations, no extra synonyms:
- amount_usd (number or null; NOT penalty_amount, financial_penalty, settlement_amount)
- agency_or_court (string; NOT regulatory_body, court_or_regulator, agency)
- description (string; NOT summary, details, narrative)
- source_url (string or null; NOT url, link, source_link)
- source_type (one of: regulator | court | investigative_journalism | ngo | secondary_news; NOT source_category, type)
- outcome (one of: settlement | conviction | consent_decree | dismissed | ongoing | fine | recall | subsidy | other; NOT result, disposition, resolution)

Also use these names when applicable: date, entity, parent_attribution, jurisdiction, workers_affected, confidence, category. Omit unknown keys; do not invent incident_id unless present in the text.`;

/**
 * Merge common Claude alias keys into canonical extractor fields and drop aliases.
 * @param {unknown} row
 */
function normalizeIncidentRowKeys(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return;
  const o = /** @type {Record<string, unknown>} */ (row);

  const pickStr = (keys) => {
    for (const k of keys) {
      const v = o[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
  };

  const pickNum = (keys) => {
    for (const k of keys) {
      const v = o[k];
      if (v == null || v === '') continue;
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  if (o.amount_usd == null || o.amount_usd === '') {
    const n = pickNum(['penalty_amount', 'financial_penalty', 'settlement_amount', 'fine_amount']);
    if (n != null) o.amount_usd = n;
  }

  if (o.agency_or_court == null || o.agency_or_court === '') {
    const s = pickStr(['regulatory_body', 'court_or_regulator', 'agency']);
    if (s) o.agency_or_court = s;
  }

  if (o.description == null || o.description === '') {
    const s = pickStr(['summary', 'details', 'narrative']);
    if (s) o.description = s;
  }

  if (o.source_url == null || o.source_url === '') {
    const s = pickStr(['url', 'link', 'source_link']);
    if (s) o.source_url = s;
  }

  if (o.source_type == null || o.source_type === '') {
    const s = pickStr(['source_category']);
    if (s) o.source_type = s;
  }

  if (o.outcome == null || o.outcome === '') {
    const s = pickStr(['result', 'disposition', 'resolution']);
    if (s) o.outcome = s;
  }

  for (const k of [
    'penalty_amount',
    'financial_penalty',
    'settlement_amount',
    'fine_amount',
    'regulatory_body',
    'court_or_regulator',
    'agency',
    'summary',
    'details',
    'narrative',
    'url',
    'link',
    'source_link',
    'source_category',
    'result',
    'disposition',
    'resolution',
  ]) {
    if (k in o) delete o[k];
  }
}

/** @param {unknown[]} incidents */
function normalizeIncidentsArrayKeys(incidents) {
  if (!Array.isArray(incidents)) return;
  for (const row of incidents) normalizeIncidentRowKeys(row);
}

const { values: opts } = parseArgs({
  options: {
    slug: { type: 'string' },
    'dry-run': { type: 'boolean' },
    all: { type: 'boolean' },
    'batch-size': { type: 'string', default: '2' },
    delay: { type: 'string', default: '60000' },
    category: { type: 'string' },
    'cost-cap': { type: 'string', default: '10' },
    sector: { type: 'string' },
    'all-categories': { type: 'boolean' },
    'max-chars': { type: 'string', default: '25000' },
    resume: { type: 'boolean' },
    'merge-existing': { type: 'boolean' },
  },
  strict: true,
});

const _cliCapRaw = opts['cost-cap'];
const _cliCapParsed =
  _cliCapRaw != null && String(_cliCapRaw).trim() !== ''
    ? parseFloat(String(_cliCapRaw).trim())
    : NaN;
const _envCapRaw = process.env.PERPLEXITY_DEEP_RESEARCH_COST_CAP_USD;
const _envCapParsed =
  _envCapRaw != null && String(_envCapRaw).trim() !== ''
    ? parseFloat(String(_envCapRaw).trim())
    : NaN;
/** Effective Perplexity spend ceiling (USD); used as costState.costCapUsd in trackPp. */
const PERPLEXITY_COST_CAP_USD =
  Number.isFinite(_cliCapParsed) && _cliCapParsed > 0
    ? _cliCapParsed
    : Number.isFinite(_envCapParsed) && _envCapParsed > 0
      ? _envCapParsed
      : DEFAULT_PERPLEXITY_COST_CAP_USD;

const DRY_RUN = Boolean(opts['dry-run']);
const RESUME_FLAG = Boolean(opts.resume);
const MERGE_EXISTING_FLAG = Boolean(opts['merge-existing']);
const RUN_ALL = Boolean(opts.all);
const BATCH_SIZE = Math.max(1, parseInt(opts['batch-size'], 10) || 2);
let DELAY_MS = Math.max(0, parseInt(opts.delay, 10) || 60_000);
if (RUN_ALL) DELAY_MS = Math.max(DELAY_MS, MIN_BATCH_DELAY_MS);

const SINGLE_CATEGORY = opts.category ? String(opts.category).trim() : null;
if (SINGLE_CATEGORY && !CATEGORY_KEYS.includes(SINGLE_CATEGORY)) {
  console.error(`Unknown category "${SINGLE_CATEGORY}". Expected one of: ${CATEGORY_KEYS.join(', ')}`);
  process.exit(1);
}

const ALL_CATEGORIES_FLAG = Boolean(opts['all-categories']);
const _maxCharsParsed = parseInt(String(opts['max-chars'] ?? '25000'), 10);
const PERPLEXITY_MAX_CHARS_BEFORE_CLAUDE =
  Number.isFinite(_maxCharsParsed) && _maxCharsParsed > 1000 ? _maxCharsParsed : 25_000;

const SECTOR_KEYS = Object.keys(SECTOR_CATEGORIES);
const CLI_SECTOR_RAW = opts.sector ? String(opts.sector).trim().toLowerCase() : null;
const CLI_SECTOR = CLI_SECTOR_RAW ? CLI_SECTOR_RAW.replace(/-/g, '_') : null;
if (CLI_SECTOR && !SECTOR_KEYS.includes(CLI_SECTOR)) {
  console.error(
    `Unknown --sector "${opts.sector}". Expected one of: ${SECTOR_KEYS.filter((k) => k !== 'default').join(', ')}, default`
  );
  process.exit(1);
}

function estimateAnthropicCostUsd(inputTokens, outputTokens) {
  return Number(
    (
      (inputTokens / 1_000_000) * ANTHROPIC_INPUT_PER_M +
      (outputTokens / 1_000_000) * ANTHROPIC_OUTPUT_PER_M
    ).toFixed(6)
  );
}

function slugToBrandGuess(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * @param {unknown} row — incumbent_profiles row or null
 */
function inferSectorKey(row) {
  const raw = row?.profile_type;
  if (typeof raw === 'string' && raw.trim()) {
    const k = raw.trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
    if (SECTOR_CATEGORIES[k]) return k;
  }
  const pj = row?.profile_json;
  if (pj && typeof pj === 'object' && typeof pj.sector === 'string' && pj.sector.trim()) {
    const k = pj.sector.trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
    if (SECTOR_CATEGORIES[k]) return k;
  }
  return 'default';
}

/**
 * @param {{ singleCategory: string | null; allCategories: boolean; sectorKey: string }} p
 */
const MAX_SECTOR_CATEGORIES_PER_RUN = 6;

function resolveCategoriesToRun(p) {
  if (p.singleCategory) return [p.singleCategory];
  if (p.allCategories) return [...CATEGORY_KEYS];
  const list = SECTOR_CATEGORIES[p.sectorKey] ?? SECTOR_CATEGORIES.default;
  const out = [...list];
  if (out.length > MAX_SECTOR_CATEGORIES_PER_RUN) {
    return out.slice(0, MAX_SECTOR_CATEGORIES_PER_RUN);
  }
  return out;
}

/** @param {unknown} dateVal */
function parseYearFromIncidentDate(dateVal) {
  if (dateVal == null) return null;
  const s = String(dateVal).trim();
  const m = s.match(/^(\d{4})/);
  if (m) return parseInt(m[1], 10);
  return null;
}

/** @param {unknown[]} incidents */
function yearRangeFromIncidents(incidents) {
  let earliest = /** @type {number | null} */ (null);
  let latest = /** @type {number | null} */ (null);
  for (const row of incidents) {
    const y = parseYearFromIncidentDate(row?.date);
    if (y == null || !Number.isFinite(y)) continue;
    if (earliest == null || y < earliest) earliest = y;
    if (latest == null || y > latest) latest = y;
  }
  return { earliest, latest };
}

/** @param {unknown[]} incidents */
function sortIncidentsForCategoryCap(incidents) {
  const arr = incidents.filter((x) => x && typeof x === 'object');
  arr.sort((a, b) => {
    const av = Number(a.amount_usd);
    const bv = Number(b.amount_usd);
    const af = Number.isFinite(av) && av > 0;
    const bf = Number.isFinite(bv) && bv > 0;
    if (af && bf && av !== bv) return bv - av;
    if (af && !bf) return -1;
    if (!af && bf) return 1;
    const ad = String(a.date || '');
    const bd = String(b.date || '');
    return bd.localeCompare(ad);
  });
  return arr;
}

/**
 * @param {string} category
 * @param {unknown[]} allParsed
 */
function buildCategoryResultBundle(category, allParsed) {
  const sorted = sortIncidentsForCategoryCap(allParsed);
  const total_found = sorted.length;
  const top = sorted.slice(0, INCIDENTS_PER_CATEGORY_CAP);
  const overflow_count = Math.max(0, total_found - INCIDENTS_PER_CATEGORY_CAP);
  const year_range = yearRangeFromIncidents(sorted);
  const categoryLabel = CATEGORY_LABEL_OVERFLOW[category] || category.replace(/_/g, ' ');

  /** @type {Record<string, unknown>} */
  const bundle = {
    category,
    incidents: top,
    total_found,
    overflow_count,
    year_range,
  };

  if (total_found > INCIDENTS_PER_CATEGORY_CAP && overflow_count > 0) {
    const e = year_range.earliest;
    const l = year_range.latest;
    if (e != null && l != null) {
      bundle.overflow_note = `Public records document ${overflow_count} additional ${categoryLabel} actions between ${e} and ${l}. Major incidents shown above.`;
    } else {
      bundle.overflow_note = `Public records document ${overflow_count} additional ${categoryLabel} actions in available records. Major incidents shown above.`;
    }
  }

  return { topIncidents: top, bundle };
}

function slugCategoryTempDir(slug) {
  return join(__dirname, '..', 'deep_research_output', slug);
}

function categoryTempJsonPath(slug, category) {
  return join(slugCategoryTempDir(slug), `${category}.json`);
}

/**
 * @param {string} slug
 * @param {string} category
 * @returns {{ slug: string, category: string, rounds: unknown[] } | null}
 */
function loadCategorySnakeState(slug, category) {
  const p = categoryTempJsonPath(slug, category);
  if (!existsSync(p)) return null;
  try {
    const raw = readFileSync(p, 'utf8');
    const j = JSON.parse(raw);
    if (!j || typeof j !== 'object') return null;
    if (!Array.isArray(j.rounds)) j.rounds = [];
    return /** @type {{ slug: string, category: string, rounds: unknown[] }} */ (j);
  } catch {
    return null;
  }
}

/**
 * @param {string} slug
 * @param {{ slug: string, category: string, rounds: unknown[] }} state
 */
function saveCategorySnakeState(slug, state) {
  const dir = slugCategoryTempDir(slug);
  mkdirSync(dir, { recursive: true });
  const p = categoryTempJsonPath(slug, state.category);
  writeFileSync(p, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * @param {unknown} state
 * @param {number} roundNum
 */
function snakeStateHasRound(state, roundNum) {
  if (!state || typeof state !== 'object' || !Array.isArray(state.rounds)) return false;
  return state.rounds.some((r) => r && typeof r === 'object' && r.round === roundNum);
}

/**
 * @param {string} category
 * @param {unknown[]} rounds
 */
function bundleFromSnakeRounds(category, rounds) {
  /** @type {unknown[]} */
  const mergedRaw = [];
  for (const r of rounds) {
    if (r && typeof r === 'object' && Array.isArray(r.incidents_raw)) {
      mergedRaw.push(...r.incidents_raw);
    }
  }
  normalizeIncidentsArrayKeys(mergedRaw);
  const deduped = mergeIncidentsPreserveConfirmed([], mergedRaw);
  return buildCategoryResultBundle(category, deduped).bundle;
}

function logCategorySnakeRoundComplete(category, roundNum, ppUsd, bundle) {
  const kept = Array.isArray(bundle.incidents) ? bundle.incidents.length : 0;
  const found = typeof bundle.total_found === 'number' ? bundle.total_found : kept;
  const ov = typeof bundle.overflow_count === 'number' ? bundle.overflow_count : 0;
  console.log(
    `[category] ${category} round ${roundNum} complete — $${Number(ppUsd).toFixed(2)} | incidents: ${kept} (${found} found) | overflow: ${ov}`
  );
}

function applySnakePerplexityCost(costState, cost, onPpCost) {
  const c = Number(cost) || 0;
  costState.perplexityUsd = Number((costState.perplexityUsd + c).toFixed(6));
  onPpCost(c);
  if (costState.perplexityUsd >= costState.costCapUsd) {
    costState.haltedForCap = true;
  }
}

/**
 * @param {string} slug
 */
function removeSlugCategoryTempDir(slug) {
  const dir = slugCategoryTempDir(slug);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
}

/**
 * @param {string} slug
 * @param {string[]} categoriesToRun
 */
function loadPerCategoryBundlesFromSnakeTemp(slug, categoriesToRun) {
  /** @type {Record<string, unknown>[]} */
  const perCategoryResults = [];
  /** @type {unknown[]} */
  const allTopIncidents = [];
  for (const cat of categoriesToRun) {
    const st = loadCategorySnakeState(slug, cat);
    const rounds = st && Array.isArray(st.rounds) ? st.rounds : [];
    if (rounds.length === 0) {
      perCategoryResults.push({
        category: cat,
        incidents: [],
        total_found: 0,
        overflow_count: 0,
        year_range: { earliest: null, latest: null },
      });
      continue;
    }
    const bundle = bundleFromSnakeRounds(cat, rounds);
    perCategoryResults.push(bundle);
    if (Array.isArray(bundle.incidents)) allTopIncidents.push(...bundle.incidents);
  }
  return { perCategoryResults, allTopIncidents };
}

/**
 * Snake draft: round 1 forward, round 2 reverse; incremental saves per category; resume from temp files.
 * @param {Anthropic} anthropic
 * @param {{ perplexityUsd: number; costCapUsd: number; haltedForCap?: boolean }} costState
 */
async function runSnakeDraftCategoryPasses(
  anthropic,
  costState,
  slug,
  companyName,
  subsidiaries,
  categoriesToRun,
  maxChars,
  onPpCost
) {
  mkdirSync(slugCategoryTempDir(slug), { recursive: true });

  let anthropicInputSnake = 0;
  let anthropicOutputSnake = 0;

  async function runOneCategoryRound(cat, roundNum) {
    if (costState.haltedForCap) return;
    let state = loadCategorySnakeState(slug, cat);
    if (!state) state = { slug, category: cat, rounds: [] };
    if (snakeStateHasRound(state, roundNum)) {
      console.log(`[resume] skip ${cat} round ${roundNum} (already saved)`);
      return;
    }

    const baseTemplate = getCategoryQueryTemplate(cat, roundNum);
    const prompt =
      buildEntityAnchor(companyName) + buildCategoryPrompt(companyName, subsidiaries, baseTemplate);

    const pp = await queryPerplexity(companyName, subsidiaries, cat, prompt);
    applySnakePerplexityCost(costState, pp.costUsd, onPpCost);

    const { incidents_raw, inputTokens, outputTokens } = await extractIncidentsForCategory(
      anthropic,
      cat,
      pp,
      maxChars
    );
    anthropicInputSnake += inputTokens;
    anthropicOutputSnake += outputTokens;

    const roundEntry = {
      round: roundNum,
      incidents_raw,
      perplexity_usd: pp.costUsd,
      claude_input_tokens: inputTokens,
      claude_output_tokens: outputTokens,
      saved_at: new Date().toISOString(),
    };
    state.rounds.push(roundEntry);
    state.rounds.sort((a, b) => (a.round ?? 0) - (b.round ?? 0));
    saveCategorySnakeState(slug, state);

    const bundle = bundleFromSnakeRounds(cat, state.rounds);
    logCategorySnakeRoundComplete(cat, roundNum, pp.costUsd, bundle);
  }

  for (const cat of categoriesToRun) {
    if (costState.haltedForCap) break;
    await runOneCategoryRound(cat, SNAKE_ROUND.ONE);
  }

  if (!costState.haltedForCap && costState.perplexityUsd < costState.costCapUsd) {
    const rev = [...categoriesToRun].reverse();
    for (const cat of rev) {
      if (costState.haltedForCap) break;
      await runOneCategoryRound(cat, SNAKE_ROUND.TWO);
    }
  }

  return { anthropicInput: anthropicInputSnake, anthropicOutput: anthropicOutputSnake };
}

function parseJsonLenient(text) {
  if (!text || typeof text !== 'string') return [];
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  const arrStart = cleaned.indexOf('[');
  const objStart = cleaned.indexOf('{');
  let start = -1;
  if (arrStart === -1) start = objStart;
  else if (objStart === -1) start = arrStart;
  else start = Math.min(arrStart, objStart);
  if (start === -1) return [];
  const isArr = cleaned[start] === '[';
  const end = isArr ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}');
  if (end === -1 || end <= start) return [];
  cleaned = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    const lastComma = cleaned.lastIndexOf('},');
    if (lastComma === -1) return [];
    try {
      return JSON.parse(cleaned.slice(0, lastComma + 1) + ']');
    } catch {
      return [];
    }
  }
}

/**
 * @param {string} content
 */
function extractMessageText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((b) => (b?.type === 'text' && typeof b.text === 'string' ? b.text : ''))
    .join('');
}

/**
 * @param {unknown} data
 * @returns {{ url: string, title: string, snippet: string }[]}
 */
function citationsFromPerplexityResponse(data) {
  /** @type {Map<string, { url: string, title: string, snippet: string }>} */
  const map = new Map();
  const results = Array.isArray(data?.search_results) ? data.search_results : [];
  for (const r of results) {
    const url = typeof r?.url === 'string' ? r.url.trim() : '';
    if (!url) continue;
    map.set(url, {
      url,
      title: typeof r?.title === 'string' ? r.title : url,
      snippet: typeof r?.snippet === 'string' ? r.snippet : '',
    });
  }
  const citeUrls = Array.isArray(data?.citations) ? data.citations : [];
  for (const u of citeUrls) {
    const url = typeof u === 'string' ? u.trim() : '';
    if (!url || map.has(url)) continue;
    map.set(url, { url, title: url, snippet: '' });
  }
  return [...map.values()];
}

/**
 * @param {unknown} usage
 */
function perplexityCostFromUsage(usage) {
  const c = usage?.cost;
  if (c && typeof c === 'object' && typeof c.total_cost === 'number') return c.total_cost;
  return 0;
}

/**
 * @param {string} companyName
 * @param {string[]} subsidiaries
 * @param {string} category
 * @param {string} prompt
 * @param {{ model?: string, endpoint?: string }} [options]
 */
async function queryPerplexity(companyName, subsidiaries, category, prompt, options = {}) {
  console.log('[queryPerplexity] Firing query for category:', category);
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key?.trim()) throw new Error('PERPLEXITY_API_KEY not set');

  let body = {
    model: options.model || DEEP_RESEARCH_MODEL_PRIMARY,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 12000,
    temperature: 0.2,
    search_recency_filter: null,
    return_citations: true,
  };

  const tryEndpoints = [options.endpoint || PERPLEXITY_ENDPOINT, PERPLEXITY_FALLBACK_ENDPOINT];

  let lastErr = /** @type {Error | null} */ (null);
  for (const endpoint of tryEndpoints) {
    let modelRetries = 0;
    while (modelRetries < 2) {
      modelRetries += 1;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          const msg = `Perplexity HTTP ${res.status} ${errText.slice(0, 400)}`;
          lastErr = new Error(msg);
          if (res.status === 400 && body.model === DEEP_RESEARCH_MODEL_PRIMARY) {
            body = { ...body, model: DEEP_RESEARCH_MODEL_FALLBACK };
            continue;
          }
          break;
        }

        const data = await res.json();
        const text = extractMessageText(data?.choices?.[0]?.message?.content);
        const citations = citationsFromPerplexityResponse(data);
        const usage = data?.usage || null;
        const costUsd = perplexityCostFromUsage(usage);

        return {
          text: String(text || '').trim(),
          citations,
          usage,
          costUsd,
          model: data?.model || body.model,
          category,
          companyName,
          subsidiaries,
        };
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        break;
      }
    }
  }
  throw lastErr || new Error('Perplexity request failed');
}

function buildCategoryPrompt(companyName, subsidiaries, template) {
  const subLine =
    subsidiaries.length > 0
      ? `\n\nAlso search under these subsidiary names: ${subsidiaries.join(', ')}`
      : '';
  return template.replace(/\{company\}/g, companyName) + subLine;
}

/**
 * Entity anchor prepended to every Perplexity **category** research prompt (not corporate_structure).
 * Reduces industry roundups and incidents naming other companies.
 * @param {string} companyName
 */
function buildEntityAnchor(companyName) {
  const name = String(companyName || '').trim() || 'the company';
  return `IMPORTANT: Return ONLY enforcement actions, lawsuits, settlements, and regulatory findings that specifically name ${name} or its direct subsidiaries as the respondent, defendant, or subject. Do not include industry-wide statistics, unrelated companies, or general enforcement roundups. Every incident must name ${name} explicitly.\n\n`;
}

async function buildSubsidiaryMap(companyName) {
  const prompt = `Find the complete corporate structure for ${companyName}: ultimate parent company, holding companies, major operating subsidiaries, and known DBA names. Use SEC 10-K Exhibit 21 filings and any other authoritative sources. Return as a structured list with source URLs.`;
  return queryPerplexity(companyName, [], 'corporate_structure', prompt);
}

/**
 * @param {Anthropic} anthropic
 * @param {string} system
 * @param {string} user
 */
async function claudeJson(anthropic, system, user) {
  const msg = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_CLAUDE_OUTPUT,
    system,
    messages: [{ role: 'user', content: user }],
  });
  let inputTokens = 0;
  let outputTokens = 0;
  for (const u of msg.usage ? [msg.usage] : []) {
    inputTokens += u.input_tokens || 0;
    outputTokens += u.output_tokens || 0;
  }
  const text = extractMessageText(msg.content);
  return { text, inputTokens, outputTokens, raw: msg };
}

const CORP_TREE_SYSTEM = `You normalize corporate structure research into one JSON object only (no markdown fences).
Schema:
{
  "brand_name": "Visible brand",
  "operating_entity": "Legal name",
  "parent": "Holding company or null",
  "ultimate_parent": "Top of tree or null",
  "known_subsidiaries": ["..."],
  "dbas": ["..."],
  "sources": ["url strings from provided citations only"]
}
Rules: Never invent subsidiary names not present in the research text. sources must be URLs from the citation list when possible.`;

/**
 * @param {Anthropic} anthropic
 * @param {{ text: string, citations: { url: string, title: string, snippet: string }[] }} pp */
async function normalizeCorporateTree(anthropic, pp) {
  const user = `Research text:\n${pp.text}\n\nCitations (JSON):\n${JSON.stringify(pp.citations, null, 2)}`;
  const { text, inputTokens, outputTokens } = await claudeJson(anthropic, CORP_TREE_SYSTEM, user);
  const tree = parseJsonLenient(text);
  if (!tree || typeof tree !== 'object' || Array.isArray(tree))
    throw new Error('Corporate tree parse failed');
  return { tree, inputTokens, outputTokens };
}

function subsidiaryNamesFromTree(tree) {
  const subs = new Set();
  const add = (v) => {
    if (typeof v === 'string' && v.trim()) subs.add(v.trim());
  };
  add(tree.operating_entity);
  add(tree.parent);
  add(tree.ultimate_parent);
  for (const x of Array.isArray(tree.known_subsidiaries) ? tree.known_subsidiaries : []) add(x);
  for (const x of Array.isArray(tree.dbas) ? tree.dbas : []) add(x);
  return [...subs];
}

/**
 * @param {Anthropic} anthropic
 * @param {string} category
 * @param {{ text: string, citations: { url: string, title: string, snippet: string }[] }} pp
 * @param {number} maxChars
 */
async function extractIncidentsForCategory(anthropic, category, pp, maxChars) {
  let text = pp.text;
  const origLen = text.length;
  if (text.length > maxChars) {
    const k = Math.round(origLen / 1000);
    const capK = Math.round(maxChars / 1000);
    console.log(
      `[extractIncidents] Truncating perplexity response from ${k}k to ${capK}k chars for category: ${category}`
    );
    text = text.slice(0, maxChars);
  }
  const user = `Category: ${category}\n\nPerplexity research:\n${text}\n\nCitations (JSON):\n${JSON.stringify(pp.citations, null, 2)}\n\nExtract incidents; set each incident "category" to "${category}".`;
  const { text: outText, inputTokens, outputTokens } = await claudeJson(anthropic, EXTRACTOR_SYSTEM, user);
  const arr = parseJsonLenient(outText);
  if (!Array.isArray(arr)) throw new Error(`Expected JSON array for category ${category}`);
  for (const row of arr) {
    if (row && typeof row === 'object') {
      row.category = category;
      normalizeIncidentRowKeys(row);
    }
  }
  return { incidents_raw: arr, inputTokens, outputTokens };
}

const DEDUP_SYSTEM = `You receive a JSON array of corporate misconduct incidents. Some may be duplicates reported by different sources. Merge exact duplicates (same event, same date, same entity) keeping the highest-confidence source_url. Flag clusters of related incidents.

Return ONLY valid JSON (no markdown) with this shape:
{"incidents":[...],"gaps":[{"period":"e.g. 2008-2012","note":"why sparse"}],"related_clusters":[{"label":"short label","incident_indices":[0,1,2]}]}

Output incident objects MUST keep canonical field names only: amount_usd, agency_or_court, description, source_url, source_type, outcome, date, entity, jurisdiction, confidence, category, and optional parent_attribution, workers_affected. Do not rename to penalty_amount, regulatory_body, etc.

Use the same incident objects as input. Empty arrays are fine.`;

/**
 * @param {Anthropic} anthropic
 * @param {unknown[]} incidents
 */
async function deduplicateIncidents(anthropic, incidents) {
  const incoming = Array.isArray(incidents) ? incidents : [];
  normalizeIncidentsArrayKeys(incoming);
  if (incoming.length === 0) {
    return { incidents: [], gaps: [], related_clusters: [], inputTokens: 0, outputTokens: 0 };
  }
  let inputTokens = 0;
  let outputTokens = 0;
  try {
    const user = `Incidents JSON:\n${JSON.stringify(incoming)}`;
    const { text, inputTokens: inTok, outputTokens: outTok } = await claudeJson(
      anthropic,
      DEDUP_SYSTEM,
      user
    );
    inputTokens = inTok;
    outputTokens = outTok;
    const obj = parseJsonLenient(text);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      console.warn('[dedup] Parse failed or bad shape — returning undeduped incidents');
      return {
        incidents: incoming,
        gaps: [],
        related_clusters: [],
        inputTokens,
        outputTokens,
      };
    }
    const out = Array.isArray(obj.incidents) ? obj.incidents : [];
    if (out.length === 0) {
      console.warn('[dedup] Empty incidents from model — returning undeduped');
      return {
        incidents: incoming,
        gaps: [],
        related_clusters: [],
        inputTokens,
        outputTokens,
      };
    }
    const gaps = Array.isArray(obj.gaps) ? obj.gaps : [];
    const related_clusters = Array.isArray(obj.related_clusters) ? obj.related_clusters : [];
    normalizeIncidentsArrayKeys(out);
    return { incidents: out, gaps, related_clusters, inputTokens, outputTokens };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[dedup] Claude dedup failed, returning undeduped:', msg);
    return {
      incidents: incoming,
      gaps: [],
      related_clusters: [],
      inputTokens,
      outputTokens,
    };
  }
}

const INSTITUTIONAL_SYSTEM = `From the incident record and company name, identify structured findings. Return ONLY valid JSON (no markdown) with keys:
{
  "revolving_door": [{"name":"","company_role":"","agency_role":"","years":"","decisions_influenced_if_known":""}],
  "subsidy_after_violation": [{"subsidy_date":"","penalty_date":"","subsidy_amount_usd":null,"penalty_amount_usd":null,"note":""}],
  "net_public_transfer": {"subsidies_received_usd":null,"penalties_paid_usd":null,"net_usd":null,"math_note":""},
  "regulatory_non_enforcement": [{"agency":"","summary":"","source_url":null}]
}
Never invent URLs; use source_url from incidents when needed, else null. Only include items supported by the incident text.`;

/**
 * @param {Anthropic} anthropic
 * @param {string} companyName
 * @param {unknown[]} incidents
 */
async function institutionalPass(anthropic, companyName, incidents) {
  const user = `Company: ${companyName}\n\nIncidents:\n${JSON.stringify(incidents)}`;
  const { text, inputTokens, outputTokens } = await claudeJson(anthropic, INSTITUTIONAL_SYSTEM, user);
  const obj = parseJsonLenient(text);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj))
    throw new Error('Institutional pass parse failed');
  return { institutional_enablement: obj, inputTokens, outputTokens };
}

const SUMMARY_SYSTEM = `Generate plain-language summary fields for this company profile. Tone: neutral, factual, like a government report appendix. No accusations, only documented record.

Return ONLY valid JSON (no markdown):
{
  "one_line": "One sentence, max 20 words.",
  "worker_summary": "One paragraph: labor, wage, discrimination, union record only.",
  "community_summary": "One paragraph: environmental, product safety, civil rights only.",
  "public_transfer_note": "One sentence on net public money vs penalties if calculable, else state uncertainty."
}`;

/**
 * @param {Anthropic} anthropic
 * @param {string} companyName
 * @param {unknown[]} incidents
 * @param {unknown} institutional
 */
async function summaryPass(anthropic, companyName, incidents, institutional) {
  const user = `Company: ${companyName}\n\nInstitutional analysis:\n${JSON.stringify(institutional)}\n\nIncidents (abbreviated count ${incidents.length}):\n${JSON.stringify(incidents).slice(0, 120_000)}`;
  const { text, inputTokens, outputTokens } = await claudeJson(anthropic, SUMMARY_SYSTEM, user);
  const obj = parseJsonLenient(text);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('Summary pass parse failed');
  return { summaries: obj, inputTokens, outputTokens };
}

/**
 * @param {unknown[]} incidents
 */
function concernLevelFromIncidents(incidents) {
  if (!Array.isArray(incidents) || incidents.length === 0) return 'clean';
  let score = 0;
  for (const raw of incidents) {
    const i = raw && typeof raw === 'object' ? raw : {};
    const amt = Number(i.amount_usd) || 0;
    const o = String(i.outcome || '').toLowerCase();
    const conf = String(i.confidence || '').toLowerCase();
    if (o === 'conviction' || amt >= 500_000_000) score = Math.max(score, 4);
    else if ((o === 'settlement' || o === 'consent_decree' || o === 'fine') && amt >= 50_000_000)
      score = Math.max(score, 3);
    else if (amt >= 5_000_000 || o === 'ongoing') score = Math.max(score, 3);
    else if (amt >= 100_000 || conf === 'high') score = Math.max(score, 2);
    else score = Math.max(score, 1);
  }
  if (score >= 4) return 'significant';
  if (score === 3) return 'significant';
  if (score === 2) return 'moderate';
  if (score === 1) return 'minor';
  return 'clean';
}

/**
 * @param {unknown[]} existing
 * @param {unknown[]} incoming
 */
function mergeIncidentsPreserveConfirmed(existing, incoming) {
  const existingList = Array.isArray(existing) ? existing : [];
  const incomingList = Array.isArray(incoming) ? incoming : [];

  const byUrl = new Map();
  /** @type {unknown[]} */
  const noUrl = [];

  for (const row of existingList) {
    if (!row || typeof row !== 'object') continue;
    const u = typeof row.source_url === 'string' ? row.source_url.trim() : '';
    if (!u) {
      noUrl.push(row);
      continue;
    }
    byUrl.set(u, { ...row });
  }

  const confOrder = ['low', 'medium', 'high'];
  const rank = (c) => {
    const i = confOrder.indexOf(String(c || '').toLowerCase());
    return i < 0 ? 0 : i;
  };

  for (const row of incomingList) {
    if (!row || typeof row !== 'object') continue;
    const u = typeof row.source_url === 'string' ? row.source_url.trim() : '';
    if (!u) {
      noUrl.push(row);
      continue;
    }
    const prev = byUrl.get(u);
    if (prev && prev.confirmed === true) continue;
    if (!prev) {
      byUrl.set(u, row);
      continue;
    }
    const merged =
      rank(row.confidence) > rank(prev.confidence)
        ? { ...prev, ...row, confirmed: prev.confirmed }
        : { ...prev, ...row, confidence: prev.confidence };
    byUrl.set(u, merged);
  }

  return [...noUrl, ...byUrl.values()];
}

function dryRunDeepJsonPath(slug) {
  return join(__dirname, '..', 'deep_research_output', `${slug}_deep.json`);
}

/**
 * @param {string} slug
 * @returns {Record<string, unknown> | null}
 */
function loadExistingDryRunDeepJson(slug) {
  const p = dryRunDeepJsonPath(slug);
  if (!existsSync(p)) return null;
  try {
    const raw = readFileSync(p, 'utf8');
    const j = JSON.parse(raw);
    return j && typeof j === 'object' && !Array.isArray(j) ? /** @type {Record<string, unknown>} */ (j) : null;
  } catch {
    return null;
  }
}

/** @param {unknown} gaps */
function dedupeGapEntries(gaps) {
  const seen = new Set();
  /** @type {unknown[]} */
  const out = [];
  for (const g of Array.isArray(gaps) ? gaps : []) {
    if (!g || typeof g !== 'object') continue;
    const o = /** @type {Record<string, unknown>} */ (g);
    const key = JSON.stringify({ period: o.period, note: o.note });
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(g);
  }
  return out;
}

/** @param {unknown} clusters */
function dedupeRelatedClusterEntries(clusters) {
  const seen = new Set();
  /** @type {unknown[]} */
  const out = [];
  for (const c of Array.isArray(clusters) ? clusters : []) {
    if (!c || typeof c !== 'object') continue;
    const o = /** @type {Record<string, unknown>} */ (c);
    const key = JSON.stringify({ label: o.label, incident_indices: o.incident_indices });
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/**
 * Union by category key; current run wins when both define the same category.
 * @param {unknown} existingList
 * @param {unknown} currentList
 */
function mergePerCategoryArrays(existingList, currentList) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byCat = new Map();
  for (const b of Array.isArray(existingList) ? existingList : []) {
    if (b && typeof b === 'object' && typeof b.category === 'string') {
      byCat.set(b.category, /** @type {Record<string, unknown>} */ (b));
    }
  }
  for (const b of Array.isArray(currentList) ? currentList : []) {
    if (b && typeof b === 'object' && typeof b.category === 'string') {
      byCat.set(b.category, /** @type {Record<string, unknown>} */ (b));
    }
  }
  return [...byCat.values()];
}

/**
 * @param {unknown} a
 * @param {unknown} b
 */
function mergeDryRunCostObjects(a, b) {
  const aOk = a && typeof a === 'object' && !Array.isArray(a);
  const bOk = b && typeof b === 'object' && !Array.isArray(b);
  if (!aOk) return bOk ? b : undefined;
  if (!bOk) return a;
  const ac = /** @type {Record<string, unknown>} */ (a);
  const bc = /** @type {Record<string, unknown>} */ (b);
  const ai = /** @type {{ input?: number; output?: number }} */ (ac.claude_tokens || {});
  const bi = /** @type {{ input?: number; output?: number }} */ (bc.claude_tokens || {});
  const inSum = Number(ai.input || 0) + Number(bi.input || 0);
  const outSum = Number(ai.output || 0) + Number(bi.output || 0);
  return {
    perplexity_usd_this_slug:
      Number(ac.perplexity_usd_this_slug || 0) + Number(bc.perplexity_usd_this_slug || 0),
    claude_tokens: { input: inSum, output: outSum },
    claude_usd_estimate: estimateAnthropicCostUsd(inSum, outSum),
  };
}

/**
 * Merge prior `deep_research_output/${slug}_deep.json` with this dry-run payload (flat shape).
 * @param {string} slug
 * @param {Record<string, unknown>} newPayload
 */
function mergeDryRunPayloadWithExisting(slug, newPayload) {
  const existing = loadExistingDryRunDeepJson(slug);
  if (!existing) {
    console.log(
      `[deep_research_profile] --merge-existing: no existing file at ${dryRunDeepJsonPath(slug)}`
    );
    return newPayload;
  }

  const ex = /** @type {Record<string, unknown>} */ (existing);
  const nw = /** @type {Record<string, unknown>} */ (newPayload);

  const merged = {
    ...ex,
    ...nw,
    slug: nw.slug ?? ex.slug,
    companyName: nw.companyName ?? ex.companyName,
    dry_run: nw.dry_run ?? ex.dry_run,
    generated_at: nw.generated_at,
    sector_key: nw.sector_key ?? ex.sector_key,
    all_categories_mode: nw.all_categories_mode ?? ex.all_categories_mode,
    perplexity_max_chars_before_claude:
      nw.perplexity_max_chars_before_claude ?? ex.perplexity_max_chars_before_claude,
    model_perplexity_primary: nw.model_perplexity_primary ?? ex.model_perplexity_primary,
    model_perplexity_effective: nw.model_perplexity_effective ?? ex.model_perplexity_effective,
    model_claude: nw.model_claude ?? ex.model_claude,
    per_category: mergePerCategoryArrays(ex.per_category, nw.per_category),
    incidents: mergeIncidentsPreserveConfirmed(
      Array.isArray(ex.incidents) ? ex.incidents : [],
      Array.isArray(nw.incidents) ? nw.incidents : []
    ),
    gaps: dedupeGapEntries([
      ...(Array.isArray(ex.gaps) ? ex.gaps : []),
      ...(Array.isArray(nw.gaps) ? nw.gaps : []),
    ]),
    related_clusters: dedupeRelatedClusterEntries([
      ...(Array.isArray(ex.related_clusters) ? ex.related_clusters : []),
      ...(Array.isArray(nw.related_clusters) ? nw.related_clusters : []),
    ]),
    institutional_enablement: nw.institutional_enablement ?? ex.institutional_enablement,
    summaries: nw.summaries ?? ex.summaries,
    corporate_tree: nw.corporate_tree ?? ex.corporate_tree,
    executive_governance: nw.executive_governance ?? ex.executive_governance,
    costs: mergeDryRunCostObjects(ex.costs, nw.costs),
  };

  console.log(
    `[deep_research_profile] --merge-existing: merged with on-disk file → per_category=${Array.isArray(merged.per_category) ? merged.per_category.length : 0} categories, incidents=${Array.isArray(merged.incidents) ? merged.incidents.length : 0}`
  );
  return merged;
}

async function loadRow(pool, slug) {
  const { rows } = await pool.query(
    `SELECT brand_slug, brand_name, parent_company, ultimate_parent, profile_type, overall_concern_level, profile_json, last_researched
     FROM incumbent_profiles WHERE LOWER(brand_slug) = LOWER($1) LIMIT 1`,
    [slug]
  );
  return rows[0] || null;
}

async function listAllSlugs(pool) {
  const { rows } = await pool.query(
    `SELECT brand_slug FROM incumbent_profiles ORDER BY brand_name ASC`
  );
  return rows.map((r) => r.brand_slug);
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} slug
 * @param {Record<string, unknown>} patch
 */
async function updateProfileDb(pool, slug, patch) {
  const level = patch.overall_concern_level;
  const { overall_concern_level: _drop, ...jsonOnly } = patch;
  await pool.query(
    `UPDATE incumbent_profiles
     SET profile_json = profile_json || $1::jsonb,
         overall_concern_level = COALESCE($2::text, overall_concern_level),
         last_researched = CURRENT_DATE,
         updated_at = NOW()
     WHERE brand_slug = $3`,
    [JSON.stringify(jsonOnly), typeof level === 'string' ? level : null, slug]
  );
}

async function runOneCompany(slug, pool, anthropic, costState) {
  let errorOccurred = false;
  try {
  console.log('[deep_research_profile] runOneCompany start, slug:', slug, 'pool:', Boolean(pool));
  const row = pool ? await loadRow(pool, slug) : null;
  console.log('[deep_research_profile] loadRow done, brand:', row?.brand_name ?? '(none)');
  const companyName = row?.brand_name || slugToBrandGuess(slug);
  if (!companyName) throw new Error(`Unknown slug ${slug} (no DB row and empty name)`);

  let perplexityCumulative = 0;
  let anthropicInput = 0;
  let anthropicOutput = 0;

  /** Perplexity cumulative vs {@link PERPLEXITY_COST_CAP_USD} (stored on costState.costCapUsd). */
  const trackPp = (cost) => {
    perplexityCumulative += cost || 0;
    costState.perplexityUsd += cost || 0;
    if (costState.perplexityUsd > costState.costCapUsd) {
      throw new Error(
        `Perplexity cost cap exceeded ($${costState.perplexityUsd.toFixed(2)} > $${costState.costCapUsd})`
      );
    }
  };

  let subsidiaries = /** @type {string[]} */ ([]);
  let corporate_tree = /** @type {Record<string, unknown> | null} */ (null);

  if (!SINGLE_CATEGORY && !RESUME_FLAG) {
    console.log('[deep_research_profile] Building subsidiary map...');
    const ppTree = await buildSubsidiaryMap(companyName);
    trackPp(ppTree.costUsd);
    const norm = await normalizeCorporateTree(anthropic, ppTree);
    anthropicInput += norm.inputTokens;
    anthropicOutput += norm.outputTokens;
    corporate_tree = /** @type {Record<string, unknown>} */ (norm.tree);
    subsidiaries = subsidiaryNamesFromTree(norm.tree);
  } else if (!SINGLE_CATEGORY && RESUME_FLAG) {
    const stored = row?.profile_json?.deep_research?.corporate_tree;
    corporate_tree =
      stored && typeof stored === 'object' && !Array.isArray(stored)
        ? /** @type {Record<string, unknown>} */ (stored)
        : null;
    subsidiaries = corporate_tree ? subsidiaryNamesFromTree(corporate_tree) : [];
    console.log(
      '[deep_research_profile] --resume: skipped subsidiary map (Perplexity); corporate_tree subsidiaries:',
      subsidiaries.length
    );
  } else if (SINGLE_CATEGORY && row?.profile_json?.deep_research?.corporate_tree) {
    corporate_tree = row.profile_json.deep_research.corporate_tree;
    subsidiaries = subsidiaryNamesFromTree(corporate_tree);
  }

  const sectorKey = CLI_SECTOR ?? inferSectorKey(row);
  const categoriesToRun = resolveCategoriesToRun({
    singleCategory: SINGLE_CATEGORY,
    allCategories: ALL_CATEGORIES_FLAG,
    sectorKey,
  });
  console.log(
    '[deep_research_profile] sector:',
    sectorKey,
    '| all-categories:',
    ALL_CATEGORIES_FLAG,
    '| categories:',
    categoriesToRun.length,
    '(' + categoriesToRun.join(', ') + ')'
  );

  costState.haltedForCap = false;
  const onSnakePpCost = (c) => {
    perplexityCumulative += c;
  };

  if (!RESUME_FLAG) {
    const snakeTok = await runSnakeDraftCategoryPasses(
      anthropic,
      costState,
      slug,
      companyName,
      subsidiaries,
      categoriesToRun,
      PERPLEXITY_MAX_CHARS_BEFORE_CLAUDE,
      onSnakePpCost
    );
    anthropicInput += snakeTok.anthropicInput;
    anthropicOutput += snakeTok.anthropicOutput;
  } else {
    console.log(
      '[deep_research_profile] --resume: skipping Perplexity category rounds (using saved temp files only)'
    );
  }

  const { perCategoryResults, allTopIncidents } = loadPerCategoryBundlesFromSnakeTemp(
    slug,
    categoriesToRun
  );

  const dedup = await deduplicateIncidents(anthropic, allTopIncidents);
  anthropicInput += dedup.inputTokens;
  anthropicOutput += dedup.outputTokens;

  const inst = await institutionalPass(anthropic, companyName, dedup.incidents);
  anthropicInput += inst.inputTokens;
  anthropicOutput += inst.outputTokens;

  const summ = await summaryPass(anthropic, companyName, dedup.incidents, inst.institutional_enablement);
  anthropicInput += summ.inputTokens;
  anthropicOutput += summ.outputTokens;

  const executive_governance = {
    incidents: dedup.incidents.filter(
      (i) => i && typeof i === 'object' && i.category === 'executive_and_governance'
    ),
  };

  const existingPj = row?.profile_json && typeof row.profile_json === 'object' ? row.profile_json : {};
  const existingDr = existingPj.deep_research && typeof existingPj.deep_research === 'object'
    ? existingPj.deep_research
    : {};
  const existingIncidents = Array.isArray(existingDr.incidents) ? existingDr.incidents : [];
  const mergedIncidents = mergeIncidentsPreserveConfirmed(existingIncidents, dedup.incidents);
  const overall_concern_level = concernLevelFromIncidents(mergedIncidents);

  const deep_research = {
    generated_at: new Date().toISOString(),
    sector_key: sectorKey,
    all_categories_mode: ALL_CATEGORIES_FLAG,
    per_category: perCategoryResults,
    perplexity_max_chars_before_claude: PERPLEXITY_MAX_CHARS_BEFORE_CLAUDE,
    model_perplexity_primary: DEEP_RESEARCH_MODEL_PRIMARY,
    model_perplexity_effective: DEEP_RESEARCH_MODEL_FALLBACK,
    model_claude: CLAUDE_MODEL,
    corporate_tree: corporate_tree || existingDr.corporate_tree || null,
    incidents: mergedIncidents,
    gaps: dedup.gaps,
    related_clusters: dedup.related_clusters,
    institutional_enablement: inst.institutional_enablement,
    executive_governance,
    summaries: summ.summaries,
    costs: {
      perplexity_usd_this_slug: Number(perplexityCumulative.toFixed(4)),
      claude_tokens: { input: anthropicInput, output: anthropicOutput },
      claude_usd_estimate: estimateAnthropicCostUsd(anthropicInput, anthropicOutput),
    },
  };

  const patch = {
    deep_research,
    overall_concern_level,
    last_researched_note: deep_research.generated_at,
  };

  const anthropicUsd = estimateAnthropicCostUsd(anthropicInput, anthropicOutput);
  console.log(
    `  ${slug}: Perplexity ~$${perplexityCumulative.toFixed(4)} | Claude tokens in=${anthropicInput} out=${anthropicOutput} ~$${anthropicUsd.toFixed(4)}`
  );

  if (!costState.haltedForCap && !errorOccurred) {
    removeSlugCategoryTempDir(slug);
  }

  return { slug, companyName, patch, deep_research, row };
  } catch (err) {
    console.error('[deep_research_profile] FATAL in runOneCompany:', err);
    errorOccurred = true;
    throw err;
  }
}

function writeDryRunOutput(slug, payload) {
  const outDir = join(__dirname, '..', 'deep_research_output');
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, `${slug}_deep.json`);
  writeFileSync(path, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`  Wrote ${path}`);
}

async function main() {
  const slugOpt = opts.slug ? String(opts.slug).trim() : '';
  if (!RUN_ALL && !slugOpt) {
    console.error('Provide --slug <slug> or --all');
    process.exit(1);
  }

  console.log(
    `[deep_research_profile] Perplexity cost cap USD: ${PERPLEXITY_COST_CAP_USD} (--cost-cap > PERPLEXITY_DEEP_RESEARCH_COST_CAP_USD > default ${DEFAULT_PERPLEXITY_COST_CAP_USD})`
  );
  console.log('[deep_research_profile] Starting slug:', RUN_ALL ? '(all)' : slugOpt);
  console.log('[deep_research_profile] Dry run:', DRY_RUN);
  console.log('[deep_research_profile] Resume (skip Perplexity, use temp files):', RESUME_FLAG);
  console.log('[deep_research_profile] Merge existing dry-run JSON:', MERGE_EXISTING_FLAG);
  if (MERGE_EXISTING_FLAG && !DRY_RUN) {
    console.warn(
      '[deep_research_profile] --merge-existing only applies with --dry-run; ignoring for live run.'
    );
  }
  console.log(
    '[deep_research_profile] Flags: --all-categories=',
    ALL_CATEGORIES_FLAG,
    ' --sector=',
    CLI_SECTOR ?? '(infer from DB)',
    ' --max-chars=',
    PERPLEXITY_MAX_CHARS_BEFORE_CLAUDE
  );

  if (!process.env.PERPLEXITY_API_KEY?.trim()) {
    console.error('PERPLEXITY_API_KEY required');
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    console.error('ANTHROPIC_API_KEY required');
    process.exit(1);
  }

  const dbUrl = typeof process.env.DATABASE_URL === 'string' ? process.env.DATABASE_URL.trim() : '';
  const pool =
    dbUrl.length > 8 && !dbUrl.startsWith('#')
      ? new Pool({
          connectionString: dbUrl,
          max: 4,
          ssl: { rejectUnauthorized: false },
        })
      : null;

  if (!pool && !DRY_RUN) {
    console.error('DATABASE_URL required for live runs');
    process.exit(1);
  }
  if (!pool && RUN_ALL) {
    console.error('DATABASE_URL required for --all');
    process.exit(1);
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  /** @type {{ perplexityUsd: number; costCapUsd: number; haltedForCap?: boolean }} */
  const costState = {
    perplexityUsd: 0,
    costCapUsd: Number(PERPLEXITY_COST_CAP_USD),
    haltedForCap: false,
  };

  if (!RUN_ALL) {
    console.log('[deep_research_profile] Loading DB row...');
    const { slug, patch, deep_research, companyName } = await runOneCompany(
      slugOpt,
      pool,
      anthropic,
      costState
    );
    if (DRY_RUN) {
      let payload = { slug, companyName, dry_run: true, ...deep_research };
      if (MERGE_EXISTING_FLAG) {
        payload = /** @type {Record<string, unknown>} */ (
          mergeDryRunPayloadWithExisting(slug, payload)
        );
      }
      writeDryRunOutput(slug, payload);
    } else if (pool) {
      await updateProfileDb(pool, slug, patch);
      console.log(`  Updated DB for ${slug}`);
    }
    console.log(
      `\nCumulative Perplexity ~$${costState.perplexityUsd.toFixed(4)} (cap $${costState.costCapUsd})`
    );
    await pool?.end();
    return;
  }

  const slugs = await listAllSlugs(/** @type {import('pg').Pool} */ (pool));
  console.log(`--all: ${slugs.length} profiles, batch-size=${BATCH_SIZE}, delay=${DELAY_MS}ms`);

  for (let i = 0; i < slugs.length; i += BATCH_SIZE) {
    const batch = slugs.slice(i, i + BATCH_SIZE);
    for (const slug of batch) {
      try {
        if (DRY_RUN) {
          const r = await runOneCompany(slug, pool, anthropic, costState);
          let payload = { slug, companyName: r.companyName, dry_run: true, ...r.deep_research };
          if (MERGE_EXISTING_FLAG) {
            payload = /** @type {Record<string, unknown>} */ (
              mergeDryRunPayloadWithExisting(slug, payload)
            );
          }
          writeDryRunOutput(slug, payload);
        } else {
          const r = await runOneCompany(slug, pool, anthropic, costState);
          await updateProfileDb(/** @type {import('pg').Pool} */ (pool), slug, r.patch);
          console.log(`  Updated DB for ${slug}`);
        }
        console.log(
          `  Cumulative Perplexity ~$${costState.perplexityUsd.toFixed(4)} | cap $${costState.costCapUsd}`
        );
      } catch (e) {
        console.error(`  ERROR ${slug}:`, e instanceof Error ? e.message : e);
      }
    }
    if (i + BATCH_SIZE < slugs.length && DELAY_MS > 0) {
      console.log(`Batch delay ${DELAY_MS}ms…`);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  await pool.end();
  console.log('\nDone.');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
