import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

/** GET /api/board?lat=&lng=&date= */
router.get('/', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const hasLat = Number.isFinite(lat);
  const hasLng = Number.isFinite(lng);
  const date = typeof req.query.date === 'string' && req.query.date.trim()
    ? req.query.date.trim()
    : new Date().toISOString().slice(0, 10);

  if (!pool) {
    return res.json({ offers: [], needs: [], date, count: 0 });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        id, post_type, name, contact, title, description, skills,
        city, state_province, lat, lng, radius_miles,
        available_from, available_until, rate, matched,
        CASE
          WHEN lat IS NOT NULL AND $1::float IS NOT NULL AND $2::float IS NOT NULL
          THEN ROUND(
            SQRT(
              POWER((lat::float - $1) * 69.0, 2) +
              POWER((lng::float - $2) * 69.0 * COS(RADIANS($1)), 2)
            )::numeric, 1
          )
          ELSE NULL
        END AS distance_miles
      FROM community_board
      WHERE board_date = $3::date
        AND active = true
      ORDER BY distance_miles ASC NULLS LAST, created_at DESC
    `,
      [hasLat ? lat : null, hasLng ? lng : null, date]
    );

    const offers = result.rows.filter((r) => r.post_type === 'offer');
    const needs = result.rows.filter((r) => r.post_type === 'need');

    res.json({
      offers,
      needs,
      date,
      count: result.rows.length,
    });
  } catch (err) {
    console.error('[board] GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/board */
router.post('/', async (req, res) => {
  const {
    post_type,
    name,
    contact,
    title,
    description,
    skills,
    city,
    state_province,
    lat,
    lng,
    available_from,
    available_until,
    rate,
    radius_miles,
  } = req.body || {};

  if (!post_type || !name || !contact || !title) {
    return res.status(400).json({
      error: 'post_type, name, contact, and title are required',
    });
  }

  if (!['offer', 'need'].includes(post_type)) {
    return res.status(400).json({ error: 'post_type must be offer or need' });
  }

  if (!pool) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO community_board (
        post_type, name, contact, title, description,
        skills, city, state_province, lat, lng,
        available_from, available_until, rate, radius_miles
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING id, post_type, title, board_date
    `,
      [
        post_type,
        name,
        contact,
        title,
        description || null,
        Array.isArray(skills) ? skills : [],
        city || null,
        state_province || null,
        lat != null && Number.isFinite(Number(lat)) ? Number(lat) : null,
        lng != null && Number.isFinite(Number(lng)) ? Number(lng) : null,
        available_from || '08:00',
        available_until || '18:00',
        rate || null,
        radius_miles != null && Number.isFinite(Number(radius_miles))
          ? Math.round(Number(radius_miles))
          : 10,
      ]
    );

    res.json({
      success: true,
      post: result.rows[0],
      message:
        post_type === 'offer'
          ? "You're on the board for today. Check back — matches are made by proximity and skill."
          : 'Your request is posted. Someone nearby will see it.',
    });
  } catch (err) {
    console.error('[board] POST error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
