/**
 * POST /api/v1/scene/lookup — map vision/OCR brand strings to Black Book profiles + MTO overlay tier.
 */
import express from 'express';
import { pool } from '../db/pool.js';
import { lookupSceneForBrand } from '../services/sceneLookup.js';

const router = express.Router();
const MAX_BRANDS = 40;

router.post('/scene/lookup', async (req, res) => {
  const raw =
    req.body?.brands ??
    req.body?.brand_names ??
    req.body?.detected_brands ??
    req.body?.names;
  if (!Array.isArray(raw)) {
    return res.status(400).json({
      ok: false,
      error: 'Expected JSON body with brands: string[] (or brand_names / detected_brands)',
    });
  }

  const brands = raw
    .map((b) => (typeof b === 'string' ? b.trim() : ''))
    .filter((b) => b.length > 0);

  if (brands.length === 0) {
    return res.status(400).json({ ok: false, error: 'brands array is empty after trimming' });
  }
  if (brands.length > MAX_BRANDS) {
    return res.status(400).json({
      ok: false,
      error: `At most ${MAX_BRANDS} brands per request`,
    });
  }

  if (!pool) {
    return res.status(503).json({
      ok: false,
      error: 'Database not configured.',
      results: [],
    });
  }

  try {
    const results = await Promise.all(brands.map((b) => lookupSceneForBrand(pool, b, null)));
    res.json({ ok: true, results });
  } catch (e) {
    console.error('[/api/v1/scene/lookup]', e?.message || e);
    res.status(500).json({ ok: false, error: 'Scene lookup failed', results: [] });
  }
});

export default router;
