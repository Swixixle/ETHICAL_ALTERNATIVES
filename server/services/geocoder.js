const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

const cache = new Map();
const MAX_CACHE = 1000;

let lastRequestAt = 0;

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {string} cityString
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
export async function geocodeCity(cityString) {
  const q = String(cityString || '').trim();
  if (!q) return null;

  const cached = cache.get(q.toLowerCase());
  if (cached) return cached;

  const now = Date.now();
  const wait = 1000 - (now - lastRequestAt);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  try {
    const url = new URL(NOMINATIM);
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'EthicalAlt/0.1 (ethical shopping research; contact: dev@localhost)',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return null;

    const lat = parseFloat(row.lat);
    const lng = parseFloat(row.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const result = { lat, lng };

    if (cache.size >= MAX_CACHE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    cache.set(q.toLowerCase(), result);
    return result;
  } catch (e) {
    console.error('geocodeCity', e);
    return null;
  }
}
