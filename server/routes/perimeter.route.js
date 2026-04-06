/**
 * GET /api/perimeter/:slug — cached live activity layer for profile cards (poll after card load).
 */
import express from 'express';
import { pool } from '../db/pool.js';
import { kickPerimeterCheckForSlug } from '../services/perimeterCache.js';

const router = express.Router();

router.get('/:slug', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ status: 'unavailable', error: 'Database not configured' });
  }

  const slug =
    typeof req.params.slug === 'string' ? req.params.slug.trim().toLowerCase() : '';
  if (!slug) {
    return res.status(400).json({ status: 'error', error: 'Invalid slug' });
  }

  try {
    const idRow = await pool.query(
      `SELECT brand_slug FROM incumbent_profiles WHERE LOWER(brand_slug) = LOWER($1) LIMIT 1`,
      [slug]
    );
    if (!idRow.rows.length) {
      return res.status(404).json({ status: 'error', error: 'Profile not found' });
    }

    const canonicalSlug = idRow.rows[0].brand_slug;

    const cached = await pool.query(
      `SELECT activity_json, generated_at, expires_at FROM profile_activity_cache WHERE brand_slug = $1`,
      [canonicalSlug]
    );

    if (!cached.rows.length) {
      void kickPerimeterCheckForSlug(canonicalSlug);
      return res.json({ status: 'pending' });
    }

    const row = cached.rows[0];
    const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
    if (expiresAt && expiresAt <= Date.now()) {
      void kickPerimeterCheckForSlug(canonicalSlug);
      return res.json({ status: 'pending' });
    }

    const j = row.activity_json;
    const activity = typeof j === 'string' ? JSON.parse(j) : j;
    const ageMs = Date.now() - new Date(row.generated_at).getTime();
    const pollStatus = ageMs < 30_000 ? 'fresh' : 'cached';

    return res.json({
      status: pollStatus,
      ...activity,
    });
  } catch (e) {
    console.error('[/api/perimeter]', e?.message || e);
    return res.status(500).json({ status: 'error', error: 'Perimeter read failed' });
  }
});

export default router;
