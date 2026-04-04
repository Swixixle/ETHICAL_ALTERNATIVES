import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { queryLocalFeedPlaces } from '../services/overpass.js';
import { findLocalSellers } from '../services/sellerRegistry.js';
import { nameMatchesChain, normalizeChainNeedles } from '../utils/chainMatch.js';

/**
 * Inclusion-first: only `chain-exclusions.json` (plus hotel list for stay) can exclude.
 * Substring / accent-folded match via {@link nameMatchesChain}. No DB, no fuzzy logic.
 */

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
  const latN = s.lat != null ? Number(s.lat) : NaN;
  const lngN = s.lng != null ? Number(s.lng) : NaN;
  const trust =
    typeof s.trust_tier === 'string' && s.trust_tier ? s.trust_tier : 'verified_independent';
  const streetLine =
    typeof s.street_address_line === 'string' && s.street_address_line.trim()
      ? s.street_address_line.trim()
      : null;
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
    street_address_line: streetLine,
    lat: Number.isFinite(latN) ? latN : null,
    lng: Number.isFinite(lngN) ? lngN : null,
    verified: s.verified,
    trust_tier: trust,
    provenance_label:
      typeof s.provenance_label === 'string' && s.provenance_label.trim()
        ? s.provenance_label.trim()
        : null,
    ethics_badges: [
      s.is_worker_owned ? 'Worker-owned' : null,
      s.is_bcorp ? 'B-Corp' : null,
      s.is_fair_trade ? 'Fair trade' : null,
    ].filter(Boolean),
  };
}

/** @param {{ osm_id: string, name: string, tagline?: string | null, distance_miles?: number, website?: string | null, phone?: string | null, address?: string | null, street_address_line?: string | null, lat?: number, lng?: number }} b @param {'local' | 'verified_independent' | 'chain' | 'chain_candidate'} trust */
function mapOsmRow(b, trust) {
  const latN = typeof b.lat === 'number' ? b.lat : b.lat != null ? Number(b.lat) : NaN;
  const lngN = typeof b.lng === 'number' ? b.lng : b.lng != null ? Number(b.lng) : NaN;
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
    street_address_line: b.street_address_line ? String(b.street_address_line) : null,
    lat: Number.isFinite(latN) ? latN : null,
    lng: Number.isFinite(lngN) ? lngN : null,
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
  if (da !== db) return da - db;
  if (Boolean(b.verified) !== Boolean(a.verified)) return a.verified ? -1 : 1;
  const ta = a.trust_tier === 'verified_independent' ? 0 : 1;
  const tb = b.trust_tier === 'verified_independent' ? 0 : 1;
  return ta - tb;
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
    const [{ places: osmPlaces, chainPlaces: osmExcludedByList }, registryResults] = await Promise.all([
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
    ]);

    const registryFeed = [];
    const registryChain = [];
    for (const s of registryResults) {
      const item = mapRegistryItem(s);
      if (nameMatchesChain(item.name, registryNameNeedles)) {
        registryChain.push(item);
      } else {
        registryFeed.push(item);
      }
    }

    const feed = [...registryFeed, ...osmPlaces.map((b) => mapOsmRow(b, 'local'))].sort(sortFeed);

    const not_verified_independent = [];

    const chain_results = [
      ...registryChain,
      ...osmExcludedByList.map((b) => mapOsmRow(b, 'chain')),
    ].sort(sortFeed);

    res.json({
      feed,
      not_verified_independent,
      chain_results,
      count: feed.length,
      chain_count: chain_results.length,
      not_verified_count: 0,
    });
  } catch (err) {
    console.error('Local feed error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'local feed failed' });
  }
});

export default router;
