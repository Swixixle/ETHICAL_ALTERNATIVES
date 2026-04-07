/**
 * POST /api/report-error — user-submitted factual corrections for investigations
 */
import express from 'express';
import { pool } from '../db/pool.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const brand_slug = typeof body.brand_slug === 'string' ? body.brand_slug.trim() || null : null;
  const brand_name = typeof body.brand_name === 'string' ? body.brand_name.trim() : '';
  const field = typeof body.field === 'string' ? body.field.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const reported_at =
    typeof body.reported_at === 'string' && body.reported_at.trim()
      ? body.reported_at.trim()
      : null;

  if (!brand_name || !field || !description || description.length <= 10) {
    return res.status(200).json({ received: true });
  }

  if (!pool) {
    console.log(
      `[error-report] brand=${brand_name} slug=${brand_slug ?? ''} field=${field} description=${description.slice(0, 200)}${description.length > 200 ? '…' : ''}`
    );
    return res.status(200).json({ received: true });
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS error_reports (
        id SERIAL PRIMARY KEY,
        brand_slug TEXT,
        brand_name TEXT NOT NULL,
        field TEXT NOT NULL,
        description TEXT NOT NULL,
        reported_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        status TEXT DEFAULT 'pending'
      )
    `);

    const ins = await pool.query(
      `INSERT INTO error_reports (brand_slug, brand_name, field, description, reported_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [brand_slug, brand_name, field, description, reported_at]
    );
    const id = ins.rows[0]?.id;
    return res.status(200).json({ received: true, id });
  } catch (e) {
    console.error('[error-report]', e?.message || e);
    return res.status(200).json({ received: true });
  }
});

export default router;
