import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { queryLocalFeedPlaces } from '../services/overpass.js';
import { findLocalSellers } from '../services/sellerRegistry.js';
import { getIncumbentBrandNeedles } from '../services/incumbentBrandNeedles.js';
import { nameMatchesChain, normalizeChainNeedles } from '../utils/chainMatch.js';
import { classifyIndependentCandidates } from '../services/chainClassification.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const chainExclusionsRaw = JSON.parse(
  readFileSync(join(__dirname, '../data/chain-exclusions.json'), 'utf8')
);
const hotelChainRaw = JSON.parse(
  readFileSync(join(__dirname, '../data/hotel-chain-needles.json'), 'utf8')
);
const chainNeedles = normalizeChainNeedles(chainExclusionsRaw);
const stayListNeedles = normalizeChainNeedles([...chainExclusionsRaw, ...hotelChainRaw]);

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
    trust_tier: 'verified_independent',
    ethics_badges: [
      s.is_worker_owned ? 'Worker-owned' : null,
      s.is_bcorp ? 'B-Corp' : null,
      s.is_fair_trade ? 'Fair trade' : null,
    ].filter(Boolean),
  };
}

/** @param {{ osm_id: string, name: string, tagline?: string | null, distance_miles?: number, website?: string | null, phone?: string | null, address?: string | null }} b @param {'local_unvetted' | 'not_verified' | 'chain' | 'chain_candidate'} trust */
function mapOsmRow(b, trust) {
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
    trust_tier: trust,
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
  const catLower = String(category).trim().toLowerCase();
  const excludeForOsm =
    catLower === 'stay' ? [...chainExclusionsRaw, ...hotelChainRaw] : chainExclusionsRaw;
  const registryNameNeedles = catLower === 'stay' ? stayListNeedles : chainNeedles;

  try {
    const [{ places: osmPlaces, chainPlaces: osmExcludedByList }, registryResults, dbNeedlesRaw] =
      await Promise.all([
        queryLocalFeedPlaces({
          lat,
          lng,
          radiusMeters,
          category,
          excludeNameSubstrings: excludeForOsm,
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
      if (nameMatchesChain(item.name, registryNameNeedles) || nameMatchesChain(item.name, dbNeedles)) {
        registryChain.push(item);
      } else {
        registryFeed.push(item);
      }
    }

    const osmDbChain = [];
    const osmForClassification = [];
    for (const b of osmPlaces) {
      if (nameMatchesChain(b.name, dbNeedles)) {
        osmDbChain.push(b);
      } else {
        osmForClassification.push(b);
      }
    }

    const classified = await classifyIndependentCandidates(osmForClassification.map((x) => x.name));

    const mainOsm = [];
    const unverifiedOsm = [];
    const claudeChainOsm = [];

    for (const b of osmForClassification) {
      const c = classified.get(b.name);
      if (!c) {
        unverifiedOsm.push(b);
        continue;
      }
      if (c.is_chain && c.confidence > 0.7) {
        claudeChainOsm.push(b);
      } else if (!c.is_chain && c.confidence >= 0.45) {
        mainOsm.push(b);
      } else {
        unverifiedOsm.push(b);
      }
    }

    const feed = [
      ...registryFeed,
      ...mainOsm.map((b) => mapOsmRow(b, 'local_unvetted')),
    ].sort(sortFeed);

    const not_verified_independent = unverifiedOsm.map((b) => mapOsmRow(b, 'not_verified')).sort(sortFeed);

    const chain_results = [
      ...registryChain,
      ...osmExcludedByList.map((b) => mapOsmRow(b, 'chain')),
      ...osmDbChain.map((b) => mapOsmRow(b, 'chain')),
      ...claudeChainOsm.map((b) => mapOsmRow(b, 'chain')),
    ].sort(sortFeed);

    res.json({
      feed,
      not_verified_independent,
      chain_results,
      count: feed.length,
      chain_count: chain_results.length,
      not_verified_count: not_verified_independent.length,
    });
  } catch (err) {
    console.error('Local feed error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'local feed failed' });
  }
});

export default router;
