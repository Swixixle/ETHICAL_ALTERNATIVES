/**
 * GET /api/profiles/index
 *
 * Lightweight index of all incumbent profiles for the /directory page.
 * Mounted: app.use('/api/profiles', profileIndexRouter) in server/index.js
 */

import express from 'express';
import { pool } from '../db/pool.js';

console.log('[profiles router] FILE LOADED — profiles.index.route.js');

const router = express.Router();

/** Literal path first so it is never captured by `/:slug/export`. */
router.get('/index', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured.' });
  }

  try {
    const result = await pool.query(`
      SELECT
        ip.brand_slug,

        COALESCE(
          ip.brand_name,
          ip.profile_json->>'brand_name',
          ip.profile_json->>'display_name',
          ip.brand_slug
        )                                               AS display_name,

        COALESCE(
          ip.profile_json->>'sector',
          ip.profile_json->>'category'
        )                                               AS sector,

        LOWER(COALESCE(
          ip.profile_json->>'overall_concern_level',
          ip.overall_concern_level,
          'moderate'
        ))                                              AS overall_concern_level,

        ip.profile_json->>'generated_headline'          AS generated_headline

      FROM incumbent_profiles ip
      WHERE ip.profile_json IS NOT NULL
        AND char_length(ip.profile_json::text) > 100
      ORDER BY display_name ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('[/api/profiles/index]', err.message);
    res.status(500).json({ error: 'Failed to load profile index.' });
  }
});

/**
 * GET /api/profiles/:slug/export
 * Structured incidents for researchers (not the signed receipt).
 *
 * Lazy-imports `profileIncidentExport` so this file always loads even if that
 * module’s dependency chain (e.g. shared client utils) fails on a given host.
 */
router.get('/:slug/export', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured.' });
  }

  const slug = typeof req.params.slug === 'string' ? req.params.slug.trim().toLowerCase() : '';
  if (!slug || slug === 'index') {
    return res.status(400).json({ error: 'Invalid slug' });
  }

  try {
    const { buildStructuredIncidentExport } = await import('../services/profileIncidentExport.js');

    const result = await pool.query(
      `
      SELECT brand_slug, brand_name, profile_json
      FROM incumbent_profiles
      WHERE LOWER(brand_slug) = LOWER($1)
      LIMIT 1
      `,
      [slug]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const row = result.rows[0];
    let pj = row.profile_json;
    if (typeof pj === 'string') {
      try {
        pj = JSON.parse(pj);
      } catch {
        return res.status(500).json({ error: 'Invalid profile_json' });
      }
    }
    if (!pj || typeof pj !== 'object') {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const payload = buildStructuredIncidentExport(/** @type {Record<string, unknown>} */ (pj), {
      brand_slug: row.brand_slug,
      brand_name: row.brand_name,
    });

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(payload);
  } catch (err) {
    console.error('[/api/profiles/:slug/export]', err?.message || err);
    res.status(500).json({ error: 'Failed to build export' });
  }
});

console.log('[profiles router] routes registered: GET /index, GET /:slug/export');

export default router;
