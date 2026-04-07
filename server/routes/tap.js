import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Router } from 'express';
import { identifyObject, inventoryScene, inferSceneContext } from '../services/vision.js';
import { searchEtsy } from '../services/etsy.js';
import {
  getInvestigationProfile,
  isIncumbentSlugKnown,
  resolveIncumbentSlug,
} from '../services/investigation.js';
import { queryLocalBusinesses } from '../services/overpass.js';
import { CATEGORY_TO_SHOP_TYPES, DEFAULT_SHOP_TYPES } from '../services/categoryShopTypes.js';
import { validateImagePayload } from '../utils/imageUtils.js';
import { findLocalSellers } from '../services/sellerRegistry.js';
import { pool } from '../db/pool.js';
import { getIncumbentDbPreview } from '../services/incumbentPreview.js';
import { saveTapHistoryAsync } from '../services/tapHistory.js';
import { attachHireDirectCategories } from '../services/hireDirectCategories.js';
import {
  recordImpactAfterInvestigation,
  recordImpactAfterSourcing,
  recordImpactAfterTapPreview,
  recordImpactAfterTypedInvestigate,
} from '../services/impactAnalytics.js';
import { tapRateLimit } from '../middleware/tapRateLimit.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const chainExclusions = JSON.parse(
  readFileSync(join(__dirname, '../data/chain-exclusions.json'), 'utf8')
);

/** @param {Record<string, unknown>} identification */
export function getIdentificationTier(identification) {
  const method = String(identification?.identification_method || '');
  if (method === 'text_search') {
    return 'confirmed';
  }
  const conf = typeof identification?.confidence === 'number' ? identification.confidence : 0;
  if (conf >= 0.8 && method === 'direct_logo') {
    return 'confirmed';
  }
  if (conf >= 0.6) {
    return 'likely';
  }
  if (method === 'scene_inference') {
    return 'inferred';
  }
  return 'ambiguous';
}

const router = Router();

/** @param {unknown} raw */
function parseSelectionBox(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const x = Number(raw.x);
  const y = Number(raw.y);
  const width = Number(raw.width);
  const height = Number(raw.height);
  if (![x, y, width, height].every(Number.isFinite)) return null;
  if (width <= 0 || height <= 0) return null;
  if (x < 0 || y < 0 || x > 1 || y > 1) return null;
  if (x + width > 1.0001 || y + height > 1.0001) return null;
  return { x, y, width, height };
}

/** @param {unknown[]} inventory @param {number} tapX @param {number} tapY */
function findClosestToTap(inventory, tapX, tapY) {
  if (!inventory || inventory.length === 0) return null;
  let closest = null;
  let minDist = Infinity;
  for (const item of inventory) {
    if (!item || typeof item !== 'object') continue;
    const xp = Number(item.approximate_x_percent);
    const yp = Number(item.approximate_y_percent);
    if (!Number.isFinite(xp) || !Number.isFinite(yp)) continue;
    const dx = xp / 100 - tapX;
    const dy = yp / 100 - tapY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      closest = item;
    }
  }
  return closest;
}

/**
 * Low-confidence taps: full-scene inventory + scene context when vision confidence is below 0.7.
 * @param {string} base64
 * @param {number} tapX
 * @param {number} tapY
 * @param {Record<string, unknown>} identification
 */
async function enhanceIdentificationWithScene(base64, tapX, tapY, identification) {
  let finalIdentification = { ...identification };
  let sceneInventory = null;
  const conf = typeof identification?.confidence === 'number' ? identification.confidence : 0;
  if (conf < 0.7) {
    const [inventory, sceneContext] = await Promise.all([
      inventoryScene(base64),
      inferSceneContext(base64),
    ]);
    sceneInventory = inventory;

    const closest = findClosestToTap(inventory, tapX, tapY);
    const closestConf = closest && typeof closest.confidence === 'number' ? closest.confidence : 0;
    if (closest && closestConf > conf) {
      const basis = String(closest.identification_basis || '');
      finalIdentification = {
        ...finalIdentification,
        brand: closest.brand != null ? String(closest.brand) : finalIdentification.brand,
        confidence: closestConf,
        identification_method:
          basis === 'direct logo' ? 'direct_logo' : basis === 'partial logo' ? 'partial_logo' : 'scene_inference',
        confidence_notes: `Inventory-adjusted: ${basis} near tap coordinates`,
      };
    }

    const firstLikely = sceneContext?.likely_brands?.[0];
    if (
      !finalIdentification.brand &&
      firstLikely &&
      firstLikely.confidence === 'high' &&
      firstLikely.brand
    ) {
      finalIdentification = {
        ...finalIdentification,
        brand: String(firstLikely.brand),
        identification_method: 'scene_inference',
        confidence_notes:
          typeof firstLikely.reasoning === 'string'
            ? firstLikely.reasoning
            : String(finalIdentification.confidence_notes || ''),
      };
    }
  }
  return { finalIdentification, sceneInventory };
}

/**
 * Etsy + Overpass + seller registry for a finalized identification.
 * @param {Record<string, unknown>} finalIdentification
 * @param {unknown} user_lat
 * @param {unknown} user_lng
 */
async function loadAlternativesBundle(finalIdentification, user_lat, user_lng) {
  const keywords = finalIdentification.search_keywords || finalIdentification.object || 'handmade';

  const etsyPromise = searchEtsy({
    keywords,
    limit: 10,
    category: finalIdentification.category,
  });

  const lat = Number(user_lat);
  const lng = Number(user_lng);
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);

  const shopTypes = CATEGORY_TO_SHOP_TYPES[finalIdentification.category] || DEFAULT_SHOP_TYPES;

  const localPromise = hasGeo
    ? queryLocalBusinesses({
        lat,
        lng,
        radiusMeters: 25_000,
        shopTypes,
        excludeNameSubstrings: chainExclusions,
      })
    : Promise.resolve([]);

  const registryPromise = findLocalSellers({
    lat: hasGeo ? lat : null,
    lng: hasGeo ? lng : null,
    category: finalIdentification.category,
    keywords: finalIdentification.search_keywords,
    radiusMiles: 50,
  });

  let etsyResults = [];
  let localResults = [];
  let registryResults = [];
  try {
    [etsyResults, localResults, registryResults] = await Promise.all([
      etsyPromise,
      localPromise,
      registryPromise,
    ]);
  } catch (e) {
    console.error('Parallel search error', e);
  }

  const empty_sources = [];
  if (!etsyResults.length) empty_sources.push('etsy');
  if (!registryResults.length) empty_sources.push('seller_registry');
  if (hasGeo && !localResults.length) empty_sources.push('overpass');

  return {
    results: etsyResults,
    registry_results: registryResults,
    local_results: localResults,
    hasGeo,
    empty_sources,
  };
}

router.post('/tap', tapRateLimit, async (req, res) => {
  const t0 = Date.now();
  const { image_base64, tap_x, tap_y, user_lat, user_lng, selection_box } = req.body || {};

  const validated = validateImagePayload(image_base64);
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error });
  }

  const tx = Number(tap_x);
  const ty = Number(tap_y);
  if (!Number.isFinite(tx) || !Number.isFinite(ty) || tx < 0 || tx > 1 || ty < 0 || ty > 1) {
    return res.status(400).json({ error: 'tap_x and tap_y must be between 0 and 1' });
  }

  const selBox = parseSelectionBox(selection_box);
  if (selection_box != null && !selBox) {
    return res.status(400).json({
      error: 'selection_box must be { x, y, width, height } in 0–1 with x+width,y+height ≤ 1',
    });
  }

  let identification;
  try {
    identification = await identifyObject(validated.base64, tx, ty, selBox);
  } catch (e) {
    console.error('Vision error', e);
    return res.status(500).json({ error: 'Vision service unavailable' });
  }

  let { finalIdentification, sceneInventory } = await enhanceIdentificationWithScene(
    validated.base64,
    tx,
    ty,
    identification
  );

  const resolvedSlug = resolveIncumbentSlug(finalIdentification.brand, finalIdentification.corporate_parent);
  const slugKnownInSystem = await isIncumbentSlugKnown(resolvedSlug);
  finalIdentification = {
    ...finalIdentification,
    resolved_incumbent_slug: resolvedSlug,
    slug_known_in_system: slugKnownInSystem,
  };

  const identification_tier = getIdentificationTier(finalIdentification);

  const CONFIDENCE_FLOOR = 0.25;
  const finalConf =
    typeof finalIdentification.confidence === 'number' ? finalIdentification.confidence : 0;

  if (finalConf < CONFIDENCE_FLOOR && !req.body.preview_only) {
    return res.status(422).json({
      error: 'confidence_too_low',
      message:
        'Could not identify a brand from this image. Try holding to select a specific object, or move closer to the label.',
      confidence: finalConf,
      identification_tier: 'ambiguous',
    });
  }

  if (req.body?.preview_only === true) {
    const response_ms = Date.now() - t0;
    const crop_base64 =
      typeof finalIdentification?.crop_base64 === 'string' ? finalIdentification.crop_base64 : null;
    let db_preview = null;
    if (finalIdentification.brand || finalIdentification.corporate_parent) {
      // Same alias → canonical slug resolution as full tap (getIncumbentDbPreview → resolveIncumbentSlug).
      db_preview = await getIncumbentDbPreview(
        finalIdentification.brand,
        finalIdentification.corporate_parent
      );
    }
    recordImpactAfterTapPreview(req, finalIdentification);
    return res.json({
      identification: finalIdentification,
      identification_tier,
      crop_base64,
      scene_inventory: sceneInventory,
      db_preview,
      preview_only: true,
      version: 'v1',
      response_ms,
    });
  }

  const session_id = typeof req.body?.session_id === 'string' ? req.body.session_id.trim() : null;

  // incumbent_profiles queries use resolveIncumbentSlug() (investigation.js), which reads
  // server/db/brand_aliases.json — e.g. venetian → las-vegas-sands, mgm → mgm-resorts.
  const invPromise =
    finalIdentification.brand || finalIdentification.corporate_parent
      ? getInvestigationProfile(
          finalIdentification.brand,
          finalIdentification.corporate_parent,
          {
            healthFlag: finalIdentification.health_flag,
            productCategory: finalIdentification.category,
          }
        ).catch((e) => {
          console.error('Investigation error', e);
          return null;
        })
      : Promise.resolve(null);

  const altPromise = loadAlternativesBundle(finalIdentification, user_lat, user_lng);

  const [investigationRaw, alt] = await Promise.all([invPromise, altPromise]);
  const investigation = attachHireDirectCategories(investigationRaw);
  const { results: etsyResults, registry_results: registryResults, local_results: localResults, hasGeo, empty_sources } = alt;

  const response_ms = Date.now() - t0;

  console.log(
    JSON.stringify({
      event: 'tap',
      object: finalIdentification.object,
      results_etsy: etsyResults.length,
      results_local: localResults.length,
      results_registry: registryResults.length,
      has_investigation: Boolean(investigation),
      ms: response_ms,
    })
  );

  const searched_sources = ['etsy', 'seller_registry'];
  if (investigation) searched_sources.push('investigation');
  if (hasGeo) searched_sources.push('overpass');

  saveTapHistoryAsync({
    session_id,
    identification: finalIdentification,
    investigation,
    user_lat: Number(user_lat),
    user_lng: Number(user_lng),
  });

  res.json({
    identification: finalIdentification,
    identification_tier,
    results: etsyResults,
    registry_results: registryResults,
    local_results: localResults,
    investigation,
    scene_inventory: sceneInventory,
    searched_sources,
    empty_sources,
    version: 'v1',
    response_ms,
  });
});

/** POST /api/tap/sourcing — alternatives only (progressive loading). */
router.post('/tap/sourcing', async (req, res) => {
  const t0 = Date.now();
  const { identification, user_lat, user_lng } = req.body || {};

  if (!identification || typeof identification !== 'object') {
    return res.status(400).json({ error: 'identification required' });
  }

  try {
    const alt = await loadAlternativesBundle(identification, user_lat, user_lng);
    const searched_sources = ['etsy', 'seller_registry'];
    if (alt.hasGeo) searched_sources.push('overpass');

    recordImpactAfterSourcing(req, identification);
    res.json({
      results: alt.results,
      registry_results: alt.registry_results,
      local_results: alt.local_results,
      searched_sources,
      empty_sources: alt.empty_sources,
      response_ms: Date.now() - t0,
      version: 'v1',
    });
  } catch (e) {
    console.error('/tap/sourcing', e);
    res.status(500).json({ error: e?.message || 'sourcing failed' });
  }
});

/** POST /api/tap/investigation — deep research only (progressive loading). */
router.post('/tap/investigation', tapRateLimit, async (req, res) => {
  const t0 = Date.now();
  const { identification, session_id, user_lat, user_lng } = req.body || {};

  if (!identification || typeof identification !== 'object') {
    return res.status(400).json({ error: 'identification required' });
  }

  let investigation = null;
  if (identification.brand || identification.corporate_parent) {
    try {
      investigation = attachHireDirectCategories(
        await getInvestigationProfile(identification.brand, identification.corporate_parent, {
          healthFlag: identification.health_flag,
          productCategory: identification.category,
        })
      );
    } catch (e) {
      console.error('Investigation error', e);
    }
  }

  const sid = typeof session_id === 'string' ? session_id.trim() : null;
  saveTapHistoryAsync({
    session_id: sid,
    identification,
    investigation,
    user_lat: user_lat != null ? Number(user_lat) : null,
    user_lng: user_lng != null ? Number(user_lng) : null,
  });

  recordImpactAfterInvestigation(req, identification, investigation);

  res.json({
    investigation,
    is_stub_investigation: investigation?.is_stub_investigation ?? false,
    searched_sources: investigation ? ['investigation'] : [],
    response_ms: Date.now() - t0,
    version: 'v1',
  });
});

/** GET /api/history — list recent taps for a session. */
router.get('/history', async (req, res) => {
  const session_id = typeof req.query.session_id === 'string' ? req.query.session_id.trim() : '';
  if (!session_id || !pool) {
    return res.json({ items: [] });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, created_at, brand_name, object_name, generated_headline, overall_concern_level, verdict_tags, city
       FROM tap_history
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [session_id]
    );
    const items = rows.map((r) => ({
      id: r.id,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      brand_name: r.brand_name,
      object_name: r.object_name,
      generated_headline: r.generated_headline,
      overall_concern_level: r.overall_concern_level,
      verdict_tags: r.verdict_tags,
      city: r.city,
    }));
    res.json({ items });
  } catch (e) {
    console.error('GET /history', e);
    res.status(500).json({ error: 'history failed' });
  }
});

/** GET /api/history/:id — full saved investigation (session-scoped). */
router.get('/history/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const session_id = typeof req.query.session_id === 'string' ? req.query.session_id.trim() : '';

  if (!Number.isFinite(id) || !session_id || !pool) {
    return res.status(400).json({ error: 'invalid request' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, created_at, session_id, investigation_json, identification_json, brand_name, object_name, city
       FROM tap_history
       WHERE id = $1 AND session_id = $2
       LIMIT 1`,
      [id, session_id]
    );
    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: 'not found' });
    }

    res.json({
      id: row.id,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      investigation: row.investigation_json,
      identification: row.identification_json,
      brand_name: row.brand_name,
      object_name: row.object_name,
      city: row.city,
    });
  } catch (e) {
    console.error('GET /history/:id', e);
    res.status(500).json({ error: 'history detail failed' });
  }
});

/** POST /api/investigate — typed brand/topic search, no image (rabbit hole / Deep mode). */
router.post('/investigate', async (req, res) => {
  const t0 = Date.now();
  const raw = req.body?.brand;
  const brand = typeof raw === 'string' ? raw.trim() : '';
  if (!brand) {
    return res.status(400).json({ error: 'brand required' });
  }

  const session_id = typeof req.body?.session_id === 'string' ? req.body.session_id.trim() : null;

  try {
    const investigation = attachHireDirectCategories(
      await getInvestigationProfile(brand, null, {
        healthFlag: false,
        productCategory: 'search',
      })
    );

    const identification = {
      object: brand,
      brand,
      corporate_parent: null,
      category: 'search',
      confidence: 1,
      identification_method: 'text_search',
      search_keywords: brand,
    };

    const identification_tier = getIdentificationTier(identification);
    const response_ms = Date.now() - t0;

    saveTapHistoryAsync({
      session_id,
      identification,
      investigation,
      user_lat: null,
      user_lng: null,
    });

    recordImpactAfterTypedInvestigate(req, investigation);

    res.json({
      identification,
      identification_tier,
      investigation,
      results: [],
      registry_results: [],
      local_results: [],
      scene_inventory: null,
      searched_sources: investigation ? ['investigation'] : [],
      empty_sources: [],
      version: 'v1',
      response_ms,
    });
  } catch (err) {
    console.error('/api/investigate', err);
    res.status(500).json({ error: err?.message || 'investigation failed' });
  }
});

export default router;
