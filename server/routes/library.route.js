/**
 * GET /api/library — lightweight list for Black Book index
 * GET /api/library/:slug — full profile_json for dossier reader
 */
import express from 'express';
import { pool } from '../db/pool.js';
import { kickPerimeterCheckForSlug } from '../services/perimeterCache.js';

const router = express.Router();

router.get('/', async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      error: 'Database not configured.',
      profiles: [],
      total: 0,
    });
  }

  try {
    const result = await pool.query(`
      SELECT
        brand_slug,
        brand_name,
        parent_company,
        COALESCE(
          NULLIF(TRIM(profile_json->>'profile_type'), ''),
          NULLIF(TRIM(profile_type::text), ''),
          'database'
        ) AS profile_type,
        LOWER(COALESCE(
          NULLIF(TRIM(profile_json->>'overall_concern_level'), ''),
          NULLIF(TRIM(overall_concern_level::text), ''),
          'unknown'
        )) AS concern_level,
        COALESCE(profile_json->>'generated_headline', '') AS headline,
        SUBSTRING(
          COALESCE(
            NULLIF(TRIM(profile_json->>'executive_summary'), ''),
            NULLIF(TRIM(investigation_summary), ''),
            ''
          )
          FROM 1 FOR 220
        ) AS summary_snippet,
        updated_at,
        (
          (profile_json->'deep_research') IS NOT NULL
          AND (profile_json->'deep_research') <> 'null'::jsonb
        ) AS has_deep_research
      FROM incumbent_profiles
      ORDER BY brand_name ASC
    `);

    const profiles = result.rows.map((row) => ({
      slug: row.brand_slug,
      name: row.brand_name,
      parent: row.parent_company || '',
      profile_type: row.profile_type || 'database',
      concern_level: row.concern_level || 'unknown',
      headline: row.headline || '',
      summary_snippet: row.summary_snippet || '',
      updated_at: row.updated_at,
      has_deep_research: Boolean(row.has_deep_research),
    }));

    res.json({
      profiles,
      total: profiles.length,
    });
  } catch (err) {
    console.error('[/api/library]', err.message);
    res.status(500).json({ error: 'Failed to load library index.', profiles: [], total: 0 });
  }
});

router.get('/:slug', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured.' });
  }

  const slug = typeof req.params.slug === 'string' ? req.params.slug.trim().toLowerCase() : '';
  if (!slug) {
    return res.status(400).json({ error: 'Invalid slug' });
  }

  try {
    const result = await pool.query(
      `
      SELECT brand_slug, brand_name, parent_company, ultimate_parent,
             overall_concern_level, profile_json, profile_type, updated_at
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

    const profile = {
      ...pj,
      brand_slug: pj.brand_slug || row.brand_slug,
      brand_name: pj.brand_name || row.brand_name,
      parent_company: pj.parent_company ?? row.parent_company ?? null,
      ultimate_parent: pj.ultimate_parent ?? row.ultimate_parent ?? null,
      overall_concern_level:
        pj.overall_concern_level || row.overall_concern_level || 'unknown',
      profile_type: pj.profile_type || row.profile_type || 'database',
      _meta: { updated_at: row.updated_at },
    };

    void kickPerimeterCheckForSlug(row.brand_slug);

    res.json({ profile });
  } catch (err) {
    console.error('[/api/library/:slug]', err.message);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

export default router;
