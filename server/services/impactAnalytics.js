/**
 * Aggregate impact metrics — no PII in daily/monthly civic tables.
 * Brand slug is an aggregate key only; optional usage consent gates per-brand monthly.
 */

import { pool } from '../db/pool.js';

/** @param {import('express').Request} req */
function consentUsage(req) {
  return String(req.get('x-ea-consent-usage') || '').trim() === '1';
}

/** @param {import('express').Request} req */
function consentCivic(req) {
  return String(req.get('x-ea-consent-civic') || '').trim() === '1';
}

/** @param {import('express').Request} req */
function consentOutcome(req) {
  return String(req.get('x-ea-consent-outcome') || '').trim() === '1';
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function yearMonthUTC(d = new Date()) {
  return d.toISOString().slice(0, 7);
}

/**
 * @param {Record<string, number>} deltas — keys: scan_count, investigation_count, clean_card_count, dirty_card_count, alt_open_count
 */
export async function bumpImpactDaily(deltas) {
  if (!pool) return;
  const day = todayUTC();
  const scan = deltas.scan_count || 0;
  const inv = deltas.investigation_count || 0;
  const clean = deltas.clean_card_count || 0;
  const dirty = deltas.dirty_card_count || 0;
  const alt = deltas.alt_open_count || 0;
  if (!scan && !inv && !clean && !dirty && !alt) return;

  try {
    await pool.query(
      `INSERT INTO impact_daily_aggregates (day, scan_count, investigation_count, clean_card_count, dirty_card_count, alt_open_count)
       VALUES ($1::date, $2, $3, $4, $5, $6)
       ON CONFLICT (day) DO UPDATE SET
         scan_count = impact_daily_aggregates.scan_count + EXCLUDED.scan_count,
         investigation_count = impact_daily_aggregates.investigation_count + EXCLUDED.investigation_count,
         clean_card_count = impact_daily_aggregates.clean_card_count + EXCLUDED.clean_card_count,
         dirty_card_count = impact_daily_aggregates.dirty_card_count + EXCLUDED.dirty_card_count,
         alt_open_count = impact_daily_aggregates.alt_open_count + EXCLUDED.alt_open_count,
         updated_at = now()`,
      [day, scan, inv, clean, dirty, alt]
    );
  } catch (e) {
    console.warn('[impact] bumpImpactDaily', e?.message || e);
  }
}

/**
 * @param {import('express').Request} req
 * @param {string | null | undefined} brandSlug
 * @param {{ scans?: number; alt_views?: number }} deltas
 */
export async function bumpImpactBrandMonthly(req, brandSlug, deltas) {
  if (!pool || !brandSlug || !consentUsage(req)) return;
  const slug = String(brandSlug)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) return;

  const ym = yearMonthUTC();
  const scans = deltas.scans || 0;
  const alt = deltas.alt_views || 0;
  if (!scans && !alt) return;

  try {
    await pool.query(
      `INSERT INTO impact_brand_monthly (year_month, brand_slug, scan_count, alt_view_count)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (year_month, brand_slug) DO UPDATE SET
         scan_count = impact_brand_monthly.scan_count + EXCLUDED.scan_count,
         alt_view_count = impact_brand_monthly.alt_view_count + EXCLUDED.alt_view_count,
         updated_at = now()`,
      [ym, slug, scans, alt]
    );
  } catch (e) {
    console.warn('[impact] bumpImpactBrandMonthly', e?.message || e);
  }
}

/**
 * @param {'witness'|'share_export'|'narration'} kind
 */
export async function bumpCivicDaily(req, kind) {
  if (!pool || !consentCivic(req)) return;
  const day = todayUTC();
  const col =
    kind === 'witness'
      ? 'witness_count'
      : kind === 'share_export'
        ? 'share_export_count'
        : kind === 'narration'
          ? 'narration_count'
          : null;
  if (!col) return;

  try {
    if (kind === 'witness') {
      await pool.query(
        `INSERT INTO civic_actions_daily (day, witness_count) VALUES ($1::date, 1)
         ON CONFLICT (day) DO UPDATE SET
           witness_count = civic_actions_daily.witness_count + 1, updated_at = now()`,
        [day]
      );
    } else if (kind === 'share_export') {
      await pool.query(
        `INSERT INTO civic_actions_daily (day, share_export_count) VALUES ($1::date, 1)
         ON CONFLICT (day) DO UPDATE SET
           share_export_count = civic_actions_daily.share_export_count + 1, updated_at = now()`,
        [day]
      );
    } else {
      await pool.query(
        `INSERT INTO civic_actions_daily (day, narration_count) VALUES ($1::date, 1)
         ON CONFLICT (day) DO UPDATE SET
           narration_count = civic_actions_daily.narration_count + 1, updated_at = now()`,
        [day]
      );
    }
  } catch (e) {
    console.warn('[impact] bumpCivicDaily', e?.message || e);
  }
}

/** @param {Record<string, unknown> | null | undefined} investigation */
function classifyCleanDirty(investigation) {
  if (!investigation || typeof investigation !== 'object') {
    return { clean: 0, dirty: 0 };
  }
  const level = String(investigation.overall_concern_level || '').toLowerCase();
  if (level === 'clean') return { clean: 1, dirty: 0 };
  return { clean: 0, dirty: 1 };
}

/**
 * Vision preview succeeded — counts as a scan.
 * @param {import('express').Request} req
 * @param {Record<string, unknown>} identification
 */
export function recordImpactAfterTapPreview(req, identification) {
  if (!identification || typeof identification !== 'object') return;
  const slug =
    typeof identification.resolved_incumbent_slug === 'string'
      ? identification.resolved_incumbent_slug
      : null;
  void bumpImpactDaily({ scan_count: 1 });
  void bumpImpactBrandMonthly(req, slug, { scans: 1 });
}

/**
 * @param {import('express').Request} req
 * @param {Record<string, unknown>} identification
 * @param {Record<string, unknown> | null} investigation
 */
export function recordImpactAfterInvestigation(req, identification, investigation) {
  const { clean, dirty } = classifyCleanDirty(investigation);
  void bumpImpactDaily({
    investigation_count: investigation ? 1 : 0,
    clean_card_count: clean,
    dirty_card_count: dirty,
  });
}

/**
 * Progressive alternatives loaded.
 * @param {import('express').Request} req
 * @param {Record<string, unknown>} identification
 */
export function recordImpactAfterSourcing(req, identification) {
  const slug =
    typeof identification?.resolved_incumbent_slug === 'string'
      ? identification.resolved_incumbent_slug
      : null;
  void bumpImpactDaily({ alt_open_count: 1 });
  void bumpImpactBrandMonthly(req, slug, { alt_views: 1 });
}

/** Deep-mode / typed investigate — no vision scan, counts as inquiry + investigation. */
export function recordImpactAfterTypedInvestigate(req, investigation) {
  const slug =
    investigation && typeof investigation.brand_slug === 'string' ? investigation.brand_slug : null;
  const { clean, dirty } = classifyCleanDirty(investigation);
  void bumpImpactDaily({
    scan_count: 1,
    investigation_count: investigation ? 1 : 0,
    clean_card_count: clean,
    dirty_card_count: dirty,
  });
  void bumpImpactBrandMonthly(req, slug, { scans: 1 });
}

const OUTCOME_OK = new Set(['yes_switched', 'no_same', 'no_already_avoided', 'skipped']);

/**
 * @param {import('express').Request} req
 * @param {string} outcome
 */
export async function recordImpactOutcome(req, outcome) {
  if (!pool || !consentOutcome(req) || !OUTCOME_OK.has(outcome)) return;
  try {
    await pool.query(`INSERT INTO impact_outcomes_raw (outcome) VALUES ($1)`, [outcome]);
  } catch (e) {
    console.warn('[impact] recordImpactOutcome', e?.message || e);
  }
}

/** Fold raw outcomes older than 30 days into monthly, then delete those rows. */
export async function rollupOutcomesRaw() {
  if (!pool) return;
  try {
    await pool.query(
      `WITH agg AS (
         SELECT
           to_char(date_trunc('month', created_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS ym,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE outcome = 'yes_switched')::int AS switched,
           COUNT(*) FILTER (WHERE outcome = 'no_same')::int AS same,
           COUNT(*) FILTER (WHERE outcome = 'no_already_avoided')::int AS avoided,
           COUNT(*) FILTER (WHERE outcome = 'skipped')::int AS skipped
         FROM impact_outcomes_raw
         WHERE created_at < (now() AT TIME ZONE 'utc') - interval '30 days'
         GROUP BY 1
       )
       INSERT INTO impact_outcomes_monthly (
         year_month, response_count, switched_count, same_count, avoided_count, skipped_count
       )
       SELECT ym, total, switched, same, avoided, skipped FROM agg
       ON CONFLICT (year_month) DO UPDATE SET
         response_count = impact_outcomes_monthly.response_count + EXCLUDED.response_count,
         switched_count = impact_outcomes_monthly.switched_count + EXCLUDED.switched_count,
         same_count = impact_outcomes_monthly.same_count + EXCLUDED.same_count,
         avoided_count = impact_outcomes_monthly.avoided_count + EXCLUDED.avoided_count,
         skipped_count = impact_outcomes_monthly.skipped_count + EXCLUDED.skipped_count,
         updated_at = now()`
    );

    await pool.query(
      `DELETE FROM impact_outcomes_raw
       WHERE created_at < (now() AT TIME ZONE 'utc') - interval '30 days'`
    );
  } catch (e) {
    console.warn('[impact] rollupOutcomesRaw', e?.message || e);
  }
}

/** @param {string} ym — YYYY-MM */
export async function getImpactPublicSnapshot(ym = yearMonthUTC()) {
  if (!pool) {
    return {
      year_month: ym,
      aggregates: null,
      civic: null,
      outcomes: null,
      methodology: 'Database not configured — metrics unavailable.',
    };
  }

  await rollupOutcomesRaw();

  const [monthStart, monthEnd] = monthBounds(ym);

  try {
    const [dailySum, civicSum, monthlyOutcomes, rawMonth] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(SUM(scan_count), 0)::int AS scans,
           COALESCE(SUM(investigation_count), 0)::int AS investigations,
           COALESCE(SUM(clean_card_count), 0)::int AS clean_cards,
           COALESCE(SUM(dirty_card_count), 0)::int AS dirty_cards,
           COALESCE(SUM(alt_open_count), 0)::int AS alt_opens
         FROM impact_daily_aggregates
         WHERE day >= $1::date AND day < $2::date`,
        [monthStart, monthEnd]
      ),
      pool.query(
        `SELECT
           COALESCE(SUM(witness_count), 0)::int AS witness_reports,
           COALESCE(SUM(share_export_count), 0)::int AS share_exports,
           COALESCE(SUM(narration_count), 0)::int AS narrations
         FROM civic_actions_daily
         WHERE day >= $1::date AND day < $2::date`,
        [monthStart, monthEnd]
      ),
      pool.query(
        `SELECT response_count, switched_count, same_count, avoided_count, skipped_count
         FROM impact_outcomes_monthly WHERE year_month = $1 LIMIT 1`,
        [ym]
      ),
      pool.query(
        `SELECT outcome, COUNT(*)::int AS c FROM impact_outcomes_raw
         WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
         GROUP BY outcome`,
        [`${monthStart}T00:00:00.000Z`, `${monthEnd}T00:00:00.000Z`]
      ),
    ]);

    const d = dailySum.rows[0] || {};
    const cv = civicSum.rows[0] || {};
    const mo = monthlyOutcomes.rows[0];
    const rawRows = rawMonth.rows || [];

    let switched = mo ? Number(mo.switched_count) || 0 : 0;
    let same = mo ? Number(mo.same_count) || 0 : 0;
    let avoided = mo ? Number(mo.avoided_count) || 0 : 0;
    let skipped = mo ? Number(mo.skipped_count) || 0 : 0;
    let rolledResponses = mo ? Number(mo.response_count) || 0 : 0;

    for (const r of rawRows) {
      const c = Number(r.c) || 0;
      rolledResponses += c;
      if (r.outcome === 'yes_switched') switched += c;
      else if (r.outcome === 'no_same') same += c;
      else if (r.outcome === 'no_already_avoided') avoided += c;
      else if (r.outcome === 'skipped') skipped += c;
    }

    const denom = switched + same + avoided;
    const switchedPct = denom > 0 ? Math.round((switched / denom) * 1000) / 10 : null;

    return {
      year_month: ym,
      aggregates: {
        scans: d.scans ?? 0,
        investigations: d.investigations ?? 0,
        clean_cards: d.clean_cards ?? 0,
        dirty_cards: d.dirty_cards ?? 0,
        alt_opens: d.alt_opens ?? 0,
      },
      civic: {
        witness_reports: cv.witness_reports ?? 0,
        share_exports: cv.share_exports ?? 0,
        narrations: cv.narrations ?? 0,
      },
      outcomes: {
        responses: rolledResponses,
        switched_count: switched,
        switched_pct: switchedPct,
        same_count: same,
        avoided_count: avoided,
        skipped_count: skipped,
      },
      methodology:
        'Aggregates are counts of server events (no personal data). Outcome percentages are self-reported opt-in only and are not a representative sample of all users.',
    };
  } catch (e) {
    console.warn('[impact] getImpactPublicSnapshot', e?.message || e);
    return {
      year_month: ym,
      error: 'snapshot_failed',
      methodology: 'Could not load metrics.',
    };
  }
}

/**
 * Audit row for share / export (no user id, no IP column, no photo blob).
 * @param {string} brandSlug
 * @param {string} channel e.g. share_card | tiktok
 * @param {'low'|'medium'|'high'} riskLevel
 * @param {boolean} wasBlocked
 */
export async function logImpactShare(brandSlug, channel, riskLevel, wasBlocked) {
  if (!pool) return;
  const slug = String(brandSlug || 'unknown')
    .trim()
    .slice(0, 200);
  const ch = String(channel || 'unknown').trim().slice(0, 64);
  const rl = riskLevel === 'low' || riskLevel === 'medium' || riskLevel === 'high' ? riskLevel : 'high';
  try {
    await pool.query(
      `INSERT INTO impact_shares (brand_slug, channel, risk_level, was_blocked)
       VALUES ($1, $2, $3, $4)`,
      [slug, ch, rl, Boolean(wasBlocked)]
    );
  } catch (e) {
    console.warn('[impact] logImpactShare', e?.message || e);
  }
}

/** @param {string} ym YYYY-MM */
function monthBounds(ym) {
  const [y, m] = ym.split('-').map((n) => parseInt(n, 10));
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  const end = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
  return [start, end];
}
