/**
 * Request user location; reverse-geocode for city. Cached in sessionStorage for the session.
 * Manual entry uses GET /api/geocode and the same cache shape as GPS.
 * @returns {Promise<{ lat: number, lng: number, city: string, state: string | null, country: string, display: string }>}
 */

const CACHE_KEY = 'ea_user_location';
const GEO_TIMEOUT_MS = 15_000;

function apiPrefix() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

export function readCachedLocation() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json`,
      {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en',
          'User-Agent':
            'EthicalAlt/1.0 (https://ethicalalt-client.onrender.com; reverse geocode)',
        },
      }
    );
    if (!res.ok) {
      console.warn('[location] reverse geocode HTTP', res.status);
      return { city: 'your area', state: null, country: 'US', display: 'your area' };
    }
    const data = await res.json();
    const addr = data.address || {};
    const place =
      addr.city || addr.town || addr.village || addr.county || 'your area';
    return {
      city: place,
      state: addr.state || null,
      country: addr.country_code ? String(addr.country_code).toUpperCase() : 'US',
      display: place,
    };
  } catch (e) {
    console.warn('[location] reverse geocode failed', e);
    return { city: 'your area', state: null, country: 'US', display: 'your area' };
  }
}

export async function getUserLocation() {
  try {
    const cached = readCachedLocation();
    if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lng)) {
      return cached;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const e = new Error('Geolocation is not supported in this browser.');
      e.code = 0;
      throw e;
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      console.warn(
        '[location] not a secure context (HTTPS); geolocation often fails on iOS Safari'
      );
    }

    console.log('[location] requesting location...');

    const coords = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('[location] location received');
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn(
            '[location] getCurrentPosition error',
            err?.code,
            err?.message || err
          );
          reject(err);
        },
        {
          enableHighAccuracy: false,
          timeout: GEO_TIMEOUT_MS,
          maximumAge: 300_000,
        }
      );
    });

    console.log('[location] reverse geocoding...');
    const geo = await reverseGeocode(coords.lat, coords.lng);
    console.log('[location] geocoding complete');

    const location = { ...coords, ...geo };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(location));
    return location;
  } catch (err) {
    console.error('[location] getUserLocation failed', err?.code, err?.message || err);
    throw err;
  }
}

/**
 * Resolve a typed city (same pipeline as GPS: lat/lng + identity fields, session cache).
 * @param {string} query e.g. "Indianapolis, IN"
 */
export async function locationFromManualCity(query) {
  const q = String(query || '').trim();
  if (!q) {
    const e = new Error('Enter a city name.');
    e.code = 'MANUAL_EMPTY';
    throw e;
  }

  const base = apiPrefix();
  const path = `/api/geocode?city=${encodeURIComponent(q)}`;
  const url = base ? `${base}${path}` : path;

  console.log('[location] manual city: requesting geocode…');
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const e = new Error(
      res.status === 404
        ? 'We could not find that place. Try a nearby city or add the state (e.g. Portland, OR).'
        : 'Could not look up that city. Try again in a moment.'
    );
    e.code = 'MANUAL_GEOCODE';
    e.status = res.status;
    throw e;
  }

  const location = {
    lat: data.lat,
    lng: data.lng,
    city: data.city,
    state: data.state ?? null,
    country: data.country || 'US',
    display: data.display || data.city || q,
  };

  if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
    const e = new Error('Invalid location from server. Try another search.');
    e.code = 'MANUAL_INVALID';
    throw e;
  }

  sessionStorage.setItem(CACHE_KEY, JSON.stringify(location));
  console.log('[location] manual geocoding complete', location.display);
  return location;
}

export function clearLocation() {
  sessionStorage.removeItem(CACHE_KEY);
}
