import { Router } from 'express';
import { pool } from '../db/pool.js';
import { WITNESS_LEGAL_NOTICE } from '../constants/witnessLegal.js';
import { validateWitnessPost, consumeWitnessRateSlot } from '../middleware/witnessValidation.js';
import { refreshWorkerCivicStatsForWitness } from '../services/workerCivicSync.js';
import { bumpCivicDaily } from '../services/impactAnalytics.js';

const router = Router();

function noDb(res) {
  return res.status(503).json({ error: 'registry_unavailable', message: 'Database not configured.' });
}

router.post('/', validateWitnessPost, async (req, res) => {
  if (!pool) return noDb(res);

  const {
    session_id,
    display_name,
    brand_slug,
    brand_name,
    investigation_headline,
    city,
    state_code,
    public_message,
    country,
  } = req.body || {};

  const sid = String(session_id || '').trim() || `anon-${Date.now()}`;
  const safeName = req.witness_validated_name || String(display_name || '').replace(/<[^>]*>/g, '').trim();
  const slug = String(brand_slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '');
  const bname = String(brand_name || '').replace(/<[^>]*>/g, '').trim() || slug || 'Unknown';

  if (!slug || !safeName) {
    return res.status(400).json({ error: 'invalid_payload', legal_notice: WITNESS_LEGAL_NOTICE });
  }

  const safeMsg = public_message
    ? String(public_message).replace(/<[^>]*>/g, '').slice(0, 280)
    : null;
  const head =
    investigation_headline != null
      ? String(investigation_headline).replace(/<[^>]*>/g, '').slice(0, 200)
      : null;
  const safeCity = city != null ? String(city).replace(/<[^>]*>/g, '').slice(0, 60) : null;
  let st = state_code != null ? String(state_code).trim().toUpperCase().slice(0, 2) : null;
  if (!st && safeCity && /,\s*([A-Z]{2})\s*$/i.test(safeCity)) {
    const m = safeCity.match(/,\s*([A-Z]{2})\s*$/i);
    if (m) st = m[1].toUpperCase();
  }
  const ctry =
    country != null && String(country).trim()
      ? String(country).replace(/<[^>]*>/g, '').slice(0, 8)
      : 'US';

  try {
    const result = await pool.query(
      `INSERT INTO civic_witnesses
       (session_id, display_name, brand_slug, brand_name, investigation_headline,
        city, state_code, country, public_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, witnessed_at`,
      [sid, safeName, slug, bname, head, safeCity, st, ctry, safeMsg]
    );
    consumeWitnessRateSlot(req.witness_ip_hash);
    void refreshWorkerCivicStatsForWitness(safeName, safeCity);
    void bumpCivicDaily(req, 'witness');
    console.log('[witness] registered', {
      id: result.rows[0].id,
      brand_slug: slug,
      ip_hash: req.witness_ip_hash,
    });
    return res.json({
      success: true,
      witness_id: result.rows[0].id,
      witnessed_at: result.rows[0].witnessed_at,
      legal_notice: WITNESS_LEGAL_NOTICE,
    });
  } catch (e) {
    console.error('[witness] insert failed', e?.message || e);
    return res.status(500).json({ error: 'witness_insert_failed' });
  }
});

router.get('/brand/:slug', async (req, res) => {
  if (!pool) return noDb(res);
  const slug = String(req.params.slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) return res.status(400).json({ error: 'invalid_slug' });

  try {
    const [countRes, listRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS c FROM civic_witnesses WHERE brand_slug = $1 AND is_public = TRUE`,
        [slug]
      ),
      pool.query(
        `SELECT display_name, city, state_code, public_message, witnessed_at
         FROM civic_witnesses
         WHERE brand_slug = $1 AND is_public = TRUE
         ORDER BY witnessed_at DESC NULLS LAST LIMIT 100`,
        [slug]
      ),
    ]);
    res.setHeader('X-EthicalAlt-Registry', 'civic-witness-v1');
    return res.json({
      brand_slug: slug,
      count: countRes.rows[0]?.c ?? 0,
      witnesses: listRes.rows,
      legal_notice: WITNESS_LEGAL_NOTICE,
    });
  } catch (e) {
    console.error('[witness] brand list failed', e?.message || e);
    return res.status(500).json({ error: 'witness_query_failed' });
  }
});

router.get('/summary', async (_req, res) => {
  if (!pool) return noDb(res);
  try {
    const [brandsRes, totalRes] = await Promise.all([
      pool.query(
        `SELECT
           brand_name,
           brand_slug,
           COUNT(*)::int AS witness_count,
           MAX(witnessed_at) AS last_witnessed,
           (ARRAY_AGG(display_name ORDER BY witnessed_at DESC))[1] AS last_display_name,
           (ARRAY_AGG(city ORDER BY witnessed_at DESC))[1] AS last_city,
           (ARRAY_AGG(state_code ORDER BY witnessed_at DESC))[1] AS last_state_code
         FROM civic_witnesses
         WHERE is_public = TRUE
         GROUP BY brand_name, brand_slug
         ORDER BY witness_count DESC, last_witnessed DESC NULLS LAST
         LIMIT 50`
      ),
      pool.query(`SELECT COUNT(*)::int AS c FROM civic_witnesses WHERE is_public = TRUE`),
    ]);
    res.setHeader('X-EthicalAlt-Registry', 'civic-witness-v1');
    return res.json({
      total_witnesses: totalRes.rows[0]?.c ?? 0,
      brands: brandsRes.rows,
      legal_notice: WITNESS_LEGAL_NOTICE,
    });
  } catch (e) {
    console.error('[witness] summary failed', e?.message || e);
    return res.status(500).json({ error: 'witness_summary_failed' });
  }
});

export default router;
