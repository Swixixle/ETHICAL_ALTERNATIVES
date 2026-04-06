/**
 * Cache + background scheduling for perimeter checks.
 */

import { pool } from '../db/pool.js';
import { runPerimeterCheck } from './perimeterCheck.js';

const PERPLEXITY_MODEL =
  process.env.PERPLEXITY_CORROBORATION_MODEL ||
  process.env.PERPLEXITY_MODEL ||
  'sonar';

const CLAUDE_MODEL =
  process.env.ANTHROPIC_INVESTIGATION_MODEL || process.env.ANTHROPIC_PERIMETER_MODEL || 'claude-sonnet-4-6';

/** @type {Map<string, Promise<unknown>>} */
const inflight = new Map();

/**
 * @param {{ active_cases: unknown[] }} result
 */
function ttlHoursForResult(result) {
  const cases = Array.isArray(result?.active_cases) ? result.active_cases : [];
  const urgent = cases.some((c) => {
    if (!c || typeof c !== 'object') return false;
    const st = String(c.status || '').toLowerCase();
    return st === 'trial' || st === 'pending_ruling';
  });
  if (urgent) return 6;
  if (cases.length === 0) return 48;
  return 24;
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
export async function getOrRunPerimeterCheck(profileContext) {
  const brand_slug = String(profileContext?.brand_slug || '').trim();
  if (!brand_slug || !pool) {
    return;
  }

  const existing = inflight.get(brand_slug);
  if (existing) {
    return existing;
  }

  const job = (async () => {
    const cached = await pool.query(
      `SELECT activity_json, expires_at FROM profile_activity_cache
       WHERE brand_slug = $1 AND expires_at > NOW()`,
      [brand_slug]
    );

    if (cached.rows.length > 0) {
      const j = cached.rows[0].activity_json;
      const parsed = typeof j === 'string' ? JSON.parse(j) : j;
      return { ...parsed, from_cache: true };
    }

    const result = await runPerimeterCheck(profileContext);
    const ttlHours = ttlHoursForResult(result);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    const sensor_versions = {
      perplexity: PERPLEXITY_MODEL,
      claude: CLAUDE_MODEL,
      gemini: process.env.GEMINI_VISION_MODEL || null,
    };

    try {
      await pool.query(
        `INSERT INTO profile_activity_cache
           (brand_slug, activity_json, generated_at, expires_at, sensor_versions)
         VALUES ($1, $2::jsonb, NOW(), $3, $4::jsonb)
         ON CONFLICT (brand_slug) DO UPDATE SET
           activity_json = EXCLUDED.activity_json,
           generated_at = NOW(),
           expires_at = EXCLUDED.expires_at,
           sensor_versions = EXCLUDED.sensor_versions`,
        [brand_slug, JSON.stringify(result), expiresAt, JSON.stringify(sensor_versions)]
      );
    } catch (e) {
      console.error('[perimeter] cache write failed', e?.message || e);
    }

    return { ...result, from_cache: false };
  })();

  inflight.set(brand_slug, job);
  try {
    return await job;
  } finally {
    inflight.delete(brand_slug);
  }
}

/**
 * @param {Record<string, unknown>} inv — normalized investigation / DB profile shape
 */
export function kickPerimeterCheckForInvestigation(inv) {
  if (!pool || !inv?.brand_slug) return;
  const brand_slug = String(inv.brand_slug).trim();
  const brand_name = String(inv.brand || inv.brand_name || '').trim();
  if (!brand_slug || !brand_name) return;

  const ctx = {
    brand_slug,
    brand_name,
    parent_company: inv.parent != null ? String(inv.parent) : '',
    verdict_tags: Array.isArray(inv.verdict_tags) ? inv.verdict_tags.map(String) : [],
    legal_flags: Array.isArray(inv.legal_flags) ? inv.legal_flags.map(String) : [],
    concern_level:
      typeof inv.overall_concern_level === 'string' ? inv.overall_concern_level : 'moderate',
  };

  void getOrRunPerimeterCheck(ctx).catch((e) => console.error('[perimeter] background', e?.message || e));
}

/**
 * Load relational row and run/cache perimeter (Black Book / direct slug).
 * @param {string} slug
 */
export async function kickPerimeterCheckForSlug(slug) {
  if (!pool || !slug) return;
  const s = String(slug).trim().toLowerCase();
  if (!s) return;

  const { rows } = await pool.query(
    `SELECT brand_slug, brand_name, parent_company, overall_concern_level, profile_json
     FROM incumbent_profiles WHERE LOWER(brand_slug) = LOWER($1) LIMIT 1`,
    [s]
  );
  const row = rows[0];
  if (!row) return;

  let pj = row.profile_json;
  if (typeof pj === 'string') {
    try {
      pj = JSON.parse(pj);
    } catch {
      pj = {};
    }
  }
  if (!pj || typeof pj !== 'object') pj = {};

  const verdict_tags = Array.isArray(pj.verdict_tags) ? pj.verdict_tags.map(String) : [];
  const legal_flags = Array.isArray(pj.legal_flags) ? pj.legal_flags.map(String) : [];

  const ctx = {
    brand_slug: row.brand_slug,
    brand_name: String(row.brand_name || row.brand_slug),
    parent_company: row.parent_company != null ? String(row.parent_company) : '',
    verdict_tags,
    legal_flags,
    concern_level: String(row.overall_concern_level || pj.overall_concern_level || 'moderate'),
  };

  void getOrRunPerimeterCheck(ctx).catch((e) => console.error('[perimeter] library kick', e?.message || e));
}
