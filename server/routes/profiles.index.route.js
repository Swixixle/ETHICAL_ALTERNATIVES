/**
 * GET /api/profiles/index
 *
 * Lightweight index of all incumbent profiles for the /directory page.
 * Mounted: app.use('/api/profiles', profileIndexRouter) in server/index.js
 */

import express from 'express';
import { pool } from '../db/pool.js';

const router = express.Router();

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

export default router;
