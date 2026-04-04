import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Router } from 'express';
import { identifyObject, inventoryScene, inferSceneContext } from '../services/vision.js';
import { searchEtsy } from '../services/etsy.js';
import { getInvestigationProfile } from '../services/investigation.js';
import { queryLocalBusinesses } from '../services/overpass.js';
import { CATEGORY_TO_SHOP_TYPES, DEFAULT_SHOP_TYPES } from '../services/categoryShopTypes.js';
import { validateImagePayload } from '../utils/imageUtils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const chainExclusions = JSON.parse(
  readFileSync(join(__dirname, '../data/chain-exclusions.json'), 'utf8')
);

/** @param {Record<string, unknown>} identification */
export function getIdentificationTier(identification) {
  const conf = typeof identification?.confidence === 'number' ? identification.confidence : 0;
  const method = String(identification?.identification_method || '');
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
          typeof firstLikely.reasoning === 'string' ? firstLikely.reasoning : String(finalIdentification.confidence_notes || ''),
      };
    }
  }
  return { finalIdentification, sceneInventory };
}

router.post('/tap', async (req, res) => {
  const t0 = Date.now();
  const { image_base64, tap_x, tap_y, user_lat, user_lng } = req.body || {};

  const validated = validateImagePayload(image_base64);
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error });
  }

  const tx = Number(tap_x);
  const ty = Number(tap_y);
  if (!Number.isFinite(tx) || !Number.isFinite(ty) || tx < 0 || tx > 1 || ty < 0 || ty > 1) {
    return res.status(400).json({ error: 'tap_x and tap_y must be between 0 and 1' });
  }

  let identification;
  try {
    identification = await identifyObject(validated.base64, tx, ty);
  } catch (e) {
    console.error('Vision error', e);
    return res.status(500).json({ error: 'Vision service unavailable' });
  }

  const { finalIdentification, sceneInventory } = await enhanceIdentificationWithScene(
    validated.base64,
    tx,
    ty,
    identification
  );

  const identification_tier = getIdentificationTier(finalIdentification);

  if (req.body?.preview_only === true) {
    const response_ms = Date.now() - t0;
    const crop_base64 =
      typeof finalIdentification?.crop_base64 === 'string' ? finalIdentification.crop_base64 : null;
    return res.json({
      identification: finalIdentification,
      identification_tier,
      /** Redundant copy: some clients lose nested base64 on identification; use for ConfirmTap. */
      crop_base64,
      scene_inventory: sceneInventory,
      preview_only: true,
      version: 'v1',
      response_ms,
    });
  }

  let investigation = null;
  if (finalIdentification.brand || finalIdentification.corporate_parent) {
    try {
      investigation = await getInvestigationProfile(finalIdentification.brand, finalIdentification.corporate_parent, {
        healthFlag: finalIdentification.health_flag,
      });
    } catch (e) {
      console.error('Investigation error', e);
    }
  }

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

  let etsyResults = [];
  let localResults = [];
  try {
    [etsyResults, localResults] = await Promise.all([etsyPromise, localPromise]);
  } catch (e) {
    console.error('Parallel search error', e);
  }

  const response_ms = Date.now() - t0;

  console.log(
    JSON.stringify({
      event: 'tap',
      object: finalIdentification.object,
      results_etsy: etsyResults.length,
      results_local: localResults.length,
      has_investigation: Boolean(investigation),
      ms: response_ms,
    })
  );

  const searched_sources = ['etsy'];
  if (investigation) searched_sources.push('investigation');
  if (hasGeo) searched_sources.push('overpass');

  const empty_sources = [];
  if (!etsyResults.length) empty_sources.push('etsy');
  if (hasGeo && !localResults.length) empty_sources.push('overpass');

  res.json({
    identification: finalIdentification,
    identification_tier,
    results: etsyResults,
    local_results: localResults,
    investigation,
    scene_inventory: sceneInventory,
    searched_sources,
    empty_sources,
    version: 'v1',
    response_ms,
  });
});

export default router;
