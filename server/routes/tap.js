import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Router } from 'express';
import { identifyObject } from '../services/vision.js';
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

  const identification_tier = getIdentificationTier(identification);

  let investigation = null;
  if (identification.brand || identification.corporate_parent) {
    try {
      investigation = await getInvestigationProfile(identification.brand, identification.corporate_parent, {
        healthFlag: identification.health_flag,
      });
    } catch (e) {
      console.error('Investigation error', e);
    }
  }

  const keywords = identification.search_keywords || identification.object || 'handmade';

  const etsyPromise = searchEtsy({
    keywords,
    limit: 10,
    category: identification.category,
  });

  const lat = Number(user_lat);
  const lng = Number(user_lng);
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);

  const shopTypes = CATEGORY_TO_SHOP_TYPES[identification.category] || DEFAULT_SHOP_TYPES;

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
      object: identification.object,
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
    identification,
    identification_tier,
    results: etsyResults,
    local_results: localResults,
    investigation,
    searched_sources,
    empty_sources,
    version: 'v1',
    response_ms,
  });
});

export default router;
