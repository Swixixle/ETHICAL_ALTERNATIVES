import { Router } from 'express';
import { pool } from '../db/pool.js';
import {
  assertWorkerMessageAllowed,
  assertWorkerRegisterAllowed,
  consumeWorkerMessageSlot,
  consumeWorkerRegisterSlot,
} from '../middleware/workerRateLimit.js';

const router = Router();

const KM_TO_MI = 0.621371;

export const WORKER_CATEGORIES = [
  'delivery',
  'cleaning',
  'handyman',
  'grocery',
  'transport',
  'lawn_garden',
  'childcare',
  'tech_help',
];

const CATEGORY_SET = new Set(WORKER_CATEGORIES);

const CONTACT_METHODS = new Set(['phone', 'email', 'signal', 'whatsapp']);

function noDb(res) {
  return res.status(503).json({ error: 'registry_unavailable', message: 'Database not configured.' });
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/** @param {number} lat1 @param {number} lon1 @param {number} lat2 @param {number} lon2 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseJsonArray(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** @param {import('pg').QueryResultRow} row @param {number | null} distanceMiles */
function publicWorkerRow(row, distanceMiles) {
  return {
    id: row.id,
    display_name: row.display_name,
    slug: row.slug,
    city: row.city,
    state_code: row.state_code,
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    category: row.category,
    tagline: row.tagline,
    bio: row.bio,
    rate: row.rate,
    availability: row.availability,
    corporate_alternatives: parseJsonArray(row.corporate_alternatives),
    civic_witness_count: Number(row.civic_witness_count) || 0,
    is_civic_verified: Boolean(row.is_civic_verified),
    union_affiliation: row.union_affiliation,
    profile_photo_url: row.profile_photo_url,
    distance_miles: distanceMiles,
  };
}

function slugifyPart(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function randomSuffix() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** GET /api/workers/nearby */
router.get('/nearby', async (req, res) => {
  if (!pool) return noDb(res);

  const lat = parseFloat(String(req.query.lat));
  const lng = parseFloat(String(req.query.lng));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat_lng_required' });
  }

  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  if (category && !CATEGORY_SET.has(category)) {
    return res.status(400).json({ error: 'invalid_category' });
  }

  const radiusKm = Math.min(100, Math.max(1, parseFloat(String(req.query.radius_km || '25')) || 25));

  try {
    const { rows } = await pool.query(
      `SELECT id, display_name, slug, city, state_code, lat, lng, category, tagline, bio, rate, availability,
              corporate_alternatives, civic_witness_count, is_civic_verified, union_affiliation, profile_photo_url
       FROM local_workers
       WHERE is_active = TRUE AND lat IS NOT NULL AND lng IS NOT NULL
         AND ($1::text = '' OR category = $1)`,
      [category]
    );

    const out = [];
    for (const row of rows) {
      const la = Number(row.lat);
      const ln = Number(row.lng);
      if (!Number.isFinite(la) || !Number.isFinite(ln)) continue;
      const km = haversineKm(lat, lng, la, ln);
      if (km > radiusKm) continue;
      const mi = km * KM_TO_MI;
      out.push(publicWorkerRow(row, mi));
    }

    out.sort((a, b) => (a.distance_miles ?? 0) - (b.distance_miles ?? 0));
    return res.json({ workers: out, radius_km: radiusKm });
  } catch (e) {
    console.error('[workers] nearby', e?.message || e);
    return res.status(500).json({ error: 'workers_nearby_failed' });
  }
});

/** GET /api/workers/category-map */
router.get('/category-map', async (req, res) => {
  if (!pool) return noDb(res);

  const lat = parseFloat(String(req.query.lat));
  const lng = parseFloat(String(req.query.lng));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat_lng_required' });
  }

  const radiusKm = 25;

  try {
    const { rows } = await pool.query(
      `SELECT category, lat, lng
       FROM local_workers
       WHERE is_active = TRUE AND lat IS NOT NULL AND lng IS NOT NULL`
    );

    /** @type {Record<string, number>} */
    const counts = {};
    for (const c of WORKER_CATEGORIES) counts[c] = 0;

    for (const row of rows) {
      const la = Number(row.lat);
      const ln = Number(row.lng);
      const cat = String(row.category || '');
      if (!CATEGORY_SET.has(cat)) continue;
      if (!Number.isFinite(la) || !Number.isFinite(ln)) continue;
      if (haversineKm(lat, lng, la, ln) <= radiusKm) counts[cat] += 1;
    }

    return res.json({ counts, radius_km: radiusKm });
  } catch (e) {
    console.error('[workers] category-map', e?.message || e);
    return res.status(500).json({ error: 'workers_category_map_failed' });
  }
});

/** GET /api/workers/registry — discovery for Civic Witness Registry page */
router.get('/registry', async (_req, res) => {
  if (!pool) return noDb(res);
  try {
    const { rows } = await pool.query(
      `SELECT display_name, slug, city, state_code, category, tagline, civic_witness_count, is_civic_verified, created_at
       FROM local_workers
       WHERE is_active = TRUE
       ORDER BY civic_witness_count DESC NULLS LAST, created_at DESC
       LIMIT 80`
    );
    return res.json({ workers: rows });
  } catch (e) {
    console.error('[workers] registry', e?.message || e);
    return res.status(500).json({ error: 'workers_registry_failed' });
  }
});

/** GET /api/workers/profile/:slug */
router.get('/profile/:slug', async (req, res) => {
  if (!pool) return noDb(res);
  const slug = String(req.params.slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) return res.status(400).json({ error: 'invalid_slug' });

  const lat = parseFloat(String(req.query.lat || ''));
  const lng = parseFloat(String(req.query.lng || ''));

  try {
    const { rows } = await pool.query(
      `SELECT id, display_name, slug, city, state_code, lat, lng, category, tagline, bio, rate, availability,
              corporate_alternatives, civic_witness_count, is_civic_verified, union_affiliation, profile_photo_url
       FROM local_workers WHERE slug = $1 AND is_active = TRUE LIMIT 1`,
      [slug]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'not_found' });

    let distanceMiles = null;
    const la = Number(row.lat);
    const ln = Number(row.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(la) && Number.isFinite(ln)) {
      distanceMiles = haversineKm(lat, lng, la, ln) * KM_TO_MI;
    }

    return res.json({ worker: publicWorkerRow(row, distanceMiles) });
  } catch (e) {
    console.error('[workers] profile', e?.message || e);
    return res.status(500).json({ error: 'workers_profile_failed' });
  }
});

/** POST /api/workers/register */
router.post('/register', assertWorkerRegisterAllowed, async (req, res) => {
  if (!pool) return noDb(res);

  const body = req.body || {};
  const display_name = String(body.display_name || '').replace(/<[^>]*>/g, '').trim().slice(0, 80);
  const city = String(body.city || '').replace(/<[^>]*>/g, '').trim().slice(0, 80);
  let state_code = String(body.state_code || '')
    .trim()
    .toUpperCase()
    .slice(0, 2);
  const category = String(body.category || '').trim();
  const tagline = String(body.tagline || '').replace(/<[^>]*>/g, '').trim().slice(0, 80);
  const bio = body.bio != null ? String(body.bio).replace(/<[^>]*>/g, '').trim().slice(0, 280) : null;
  const rate = body.rate != null ? String(body.rate).replace(/<[^>]*>/g, '').trim().slice(0, 60) : null;
  const availability =
    body.availability != null
      ? String(body.availability).replace(/<[^>]*>/g, '').trim().slice(0, 80)
      : 'available';
  const contact_method = String(body.contact_method || '').trim().toLowerCase();
  const contact_value = String(body.contact_value || '').replace(/<[^>]*>/g, '').trim().slice(0, 200);
  const union_affiliation =
    body.union_affiliation != null
      ? String(body.union_affiliation).replace(/<[^>]*>/g, '').trim().slice(0, 120)
      : null;

  let lat = body.lat != null ? Number(body.lat) : null;
  let lng = body.lng != null ? Number(body.lng) : null;
  if (!Number.isFinite(lat)) lat = null;
  if (!Number.isFinite(lng)) lng = null;

  if (!display_name || !city || !state_code || !tagline || !contact_value) {
    return res.status(400).json({ error: 'missing_required_fields' });
  }
  if (!CATEGORY_SET.has(category)) {
    return res.status(400).json({ error: 'invalid_category' });
  }
  if (!CONTACT_METHODS.has(contact_method)) {
    return res.status(400).json({ error: 'invalid_contact_method' });
  }

  /** @type {unknown[]} */
  let corporate_alternatives = [];
  if (Array.isArray(body.corporate_alternatives)) {
    corporate_alternatives = body.corporate_alternatives.slice(0, 5).map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const brand_name = String(entry.brand_name || '').replace(/<[^>]*>/g, '').trim().slice(0, 80);
      const brand_slug = String(entry.brand_slug || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
      const left_year = parseInt(String(entry.left_year || ''), 10);
      const reason =
        entry.reason != null ? String(entry.reason).replace(/<[^>]*>/g, '').trim().slice(0, 200) : '';
      if (!brand_name) return null;
      return {
        brand_slug: brand_slug || brand_name.toLowerCase().replace(/\s+/g, '-').slice(0, 80),
        brand_name,
        left_year: Number.isFinite(left_year) ? left_year : null,
        reason: reason || null,
      };
    });
    corporate_alternatives = corporate_alternatives.filter(Boolean);
  }

  let baseSlug = `${slugifyPart(display_name)}-${slugifyPart(city)}-${randomSuffix()}`.replace(/-+/g, '-');
  if (!baseSlug || baseSlug === '--') baseSlug = `worker-${randomSuffix()}${randomSuffix()}`;

  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const trySlug = attempt === 0 ? baseSlug : `${slugifyPart(display_name)}-${slugifyPart(city)}-${randomSuffix()}`;
      try {
        const ins = await pool.query(
          `INSERT INTO local_workers (
             display_name, slug, city, state_code, lat, lng, category, tagline, bio, rate, availability,
             contact_method, contact_value, corporate_alternatives, union_affiliation
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15)
           RETURNING id, slug`,
          [
            display_name,
            trySlug,
            city,
            state_code,
            lat,
            lng,
            category,
            tagline,
            bio || null,
            rate || null,
            availability || 'available',
            contact_method,
            contact_value,
            JSON.stringify(corporate_alternatives),
            union_affiliation,
          ]
        );
        const row = ins.rows[0];
        consumeWorkerRegisterSlot(req._workerRegKey);
        return res.json({ success: true, worker_id: row.id, slug: row.slug });
      } catch (e) {
        if (e?.code === '23505' && attempt < 7) continue;
        throw e;
      }
    }
  } catch (e) {
    console.error('[workers] register', e?.message || e);
    return res.status(500).json({ error: 'worker_register_failed' });
  }
  return res.status(500).json({ error: 'worker_register_failed' });
});

/** POST /api/workers/:id/message */
router.post('/:id/message', assertWorkerMessageAllowed, async (req, res) => {
  if (!pool) return noDb(res);

  const workerId = parseInt(req.params.id, 10);
  const body = req.body || {};
  const message = String(body.message || '').replace(/<[^>]*>/g, '').trim().slice(0, 2000);
  const sender_session = String(body.sender_session || '').trim().slice(0, 200);
  const sender_city = body.sender_city != null ? String(body.sender_city).replace(/<[^>]*>/g, '').trim().slice(0, 80) : null;

  if (!message) {
    return res.status(400).json({ error: 'message_required' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, contact_method, contact_value FROM local_workers WHERE id = $1 AND is_active = TRUE LIMIT 1`,
      [workerId]
    );
    const w = rows[0];
    if (!w) return res.status(404).json({ error: 'worker_not_found' });

    await pool.query(
      `INSERT INTO worker_messages (worker_id, sender_session, message, sender_city)
       VALUES ($1,$2,$3,$4)`,
      [workerId, sender_session, message, sender_city]
    );

    consumeWorkerMessageSlot(req._workerMsgBucket);

    return res.json({
      success: true,
      worker_contact: { method: w.contact_method, value: w.contact_value },
    });
  } catch (e) {
    console.error('[workers] message', e?.message || e);
    return res.status(500).json({ error: 'worker_message_failed' });
  }
});

export default router;
