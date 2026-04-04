import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { queryLocalFeedPlaces } from '../services/overpass.js';
import { findLocalSellers } from '../services/sellerRegistry.js';
import { getIncumbentBrandNeedles } from '../services/incumbentBrandNeedles.js';
import { nameMatchesChain, normalizeChainNeedles } from '../utils/chainMatch.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const chainExclusionsRaw = JSON.parse(
  readFileSync(join(__dirname, '../data/chain-exclusions.json'), 'utf8')
);
const chainNeedles = normalizeChainNeedles(chainExclusionsRaw);

const router = Router();

function pickSellerWebsite(s) {
  if (s.website_url) return String(s.website_url);
  if (s.etsy_url) return String(s.etsy_url);
  if (s.instagram_url) return String(s.instagram_url);
  if (s.other_url) return String(s.other_url);
  return null;
}

function mapRegistryItem(s) {
  return {
    type: 'registry',
    id: `registry-${s.id}`,
    name: s.seller_name,
    tagline: s.tagline || s.product_description || s.description || null,
    distance_mi: s.distance_miles != null ? Number(s.distance_miles) : null,
    website: pickSellerWebsite(s),
    phone: null,
    city: s.city,
    state: s.state_province,
    address: null,
    verified: s.verified,
    ethics_badges: [
      s.is_worker_owned ? 'Worker-owned' : null,
      s.is_bcorp ? 'B-Corp' : null,
      s.is_fair_trade ? 'Fair trade' : null,
    ].filter(Boolean),
  };
}

function mapOsmRow(b) {
  return {
    type: 'osm',
    id: `osm-${b.osm_id}`,
    name: b.name,
    tagline: b.tagline || null,
    distance_mi: b.distance_miles != null ? Number(Number(b.distance_miles).toFixed(1)) : null,
    website: b.website ? String(b.website) : null,
    phone: b.phone ? String(b.phone) : null,
    city: null,
    address: b.address || null,
    verified: false,
    ethics_badges: [],
  };
}

const sortFeed = (a, b) => {
  const ra = a.type === 'registry' ? 0 : 1;
  const rb = b.type === 'registry' ? 0 : 1;
  if (ra !== rb) return ra - rb;
  const da = a.distance_mi ?? 9999;
  const db = b.distance_mi ?? 9999;
  return da - db;
};

/** GET /api/local-feed?lat=&lng=&category=&radius= */
router.get('/', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const category = typeof req.query.category === 'string' ? req.query.category : 'all';
  const radiusMiles = Math.min(100, Math.max(1, parseInt(String(req.query.radius), 10) || 25));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat and lng required' });
  }

  const radiusMeters = Math.round(radiusMiles * 1609.34);

  try {
    const [{ places: osmPlaces, chainPlaces: osmChainRaw }, registryResults, dbNeedlesRaw] =
      await Promise.all([
        queryLocalFeedPlaces({
          lat,
          lng,
          radiusMeters,
          category,
          excludeNameSubstrings: chainExclusionsRaw,
        }),
        findLocalSellers({
          lat,
          lng,
          category,
          keywords: [],
          radiusMiles,
        }),
        getIncumbentBrandNeedles(),
      ]);

    const dbNeedles = normalizeChainNeedles(dbNeedlesRaw);

    const registryFeed = [];
    const registryChain = [];
    for (const s of registryResults) {
      const item = mapRegistryItem(s);
      if (nameMatchesChain(item.name, chainNeedles) || nameMatchesChain(item.name, dbNeedles)) {
        registryChain.push(item);
      } else {
        registryFeed.push(item);
      }
    }

    const osmFeed = [];
    const osmDbChain = [];
    for (const b of osmPlaces) {
      if (nameMatchesChain(b.name, dbNeedles)) {
        osmDbChain.push(b);
      } else {
        osmFeed.push(b);
      }
    }

    const osmItems = osmFeed.map((b) => mapOsmRow(b));
    const osmChainItems = [...osmChainRaw.map((b) => mapOsmRow(b)), ...osmDbChain.map((b) => mapOsmRow(b))];

    const feed = [...registryFeed, ...osmItems].sort(sortFeed);
    const chain_results = [...registryChain, ...osmChainItems].sort(sortFeed);

    res.json({
      feed,
      chain_results,
      count: feed.length,
      chain_count: chain_results.length,
    });
  } catch (err) {
    console.error('Local feed error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'local feed failed' });
  }
});

export default router;
