const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

const UA =
  'EthicalAlt/1.0 (https://ethicalalt-client.onrender.com; local feed geocoding)';

/** In-memory cache: same city lookups repeat often; entries expire after 24h (Nominatim policy-friendly). */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map();
const MAX_CACHE = 1000;

function pruneExpired() {
  const now = Date.now();
  for (const [k, entry] of cache) {
    if (now > entry.expiresAt) cache.delete(k);
  }
}

let lastRequestAt = 0;

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function rateLimitNominatim() {
  const now = Date.now();
  const wait = 1000 - (now - lastRequestAt);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

function trimCache() {
  pruneExpired();
  while (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    if (firstKey === undefined) break;
    cache.delete(firstKey);
  }
}

/**
 * @param {string} cityString
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
export async function geocodeCity(cityString) {
  const full = await geocodeLocationQuery(cityString);
  return full ? { lat: full.lat, lng: full.lng } : null;
}

/**
 * Forward geocode with city/state/country fields for manual home-screen entry.
 * @param {string} cityString e.g. "Indianapolis, IN"
 * @returns {Promise<{ lat: number, lng: number, city: string, state: string | null, country: string, display: string } | null>}
 */
export async function geocodeLocationQuery(cityString) {
  const q = String(cityString || '').trim();
  if (!q) return null;

  const ttlKey = `full:${q.toLowerCase()}`;
  const entry = cache.get(ttlKey);
  if (entry && Date.now() <= entry.expiresAt) return entry.value;
  if (entry) cache.delete(ttlKey);

  await rateLimitNominatim();

  try {
    const url = new URL(NOMINATIM);
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
        'User-Agent': UA,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return null;

    const lat = parseFloat(row.lat);
    const lng = parseFloat(row.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const addr = row.address || {};
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.hamlet ||
      addr.county ||
      null;
    const cityFallback = city || q.split(',')[0].trim() || 'your area';
    const state = addr.state || addr.region || null;
    const country = addr.country_code ? String(addr.country_code).toUpperCase() : 'US';
    const display =
      typeof row.display_name === 'string' && row.display_name.trim()
        ? row.display_name.trim()
        : [cityFallback, state, country].filter(Boolean).join(', ');

    const result = {
      lat,
      lng,
      city: cityFallback,
      state,
      country,
      display,
    };

    trimCache();
    cache.set(ttlKey, {
      value: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return result;
  } catch (e) {
    console.error('geocodeLocationQuery', e);
    return null;
  }
}
