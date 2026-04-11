/**
 * Request user location; reverse-geocode for city. Cached in sessionStorage for the session.
 * Manual entry uses GET /api/geocode and the same cache shape as GPS.
 */

const CACHE_KEY = 'ea_user_location';

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

/** City/state used for local documentary and session UI (see cursor-local-documentary spec). */
export function readUserCityState() {
  if (typeof sessionStorage === 'undefined') return { city: '', state: '' };
  try {
    const c = sessionStorage.getItem('ea_user_city');
    const s = sessionStorage.getItem('ea_user_state');
    if (c) return { city: c, state: s || '' };
  } catch {
    /* ignore */
  }
  const loc = readCachedLocation();
  if (loc?.city) return { city: String(loc.city), state: loc?.state ? String(loc.state) : '' };
  return { city: '', state: '' };
}

export function persistLocation(loc) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(loc));
  try {
    if (loc && typeof loc.city === 'string' && loc.city.trim()) {
      sessionStorage.setItem('ea_user_city', loc.city.trim());
    }
    if (loc && loc.state != null && String(loc.state).trim()) {
      sessionStorage.setItem('ea_user_state', String(loc.state).trim());
    }
  } catch {
    /* ignore */
  }
}

export async function reverseGeocode(lat, lng) {
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

/**
 * iOS Safari: minimal path — only getCurrentPosition, then enrich with {@link reverseGeocode} at call site.
 * @returns {Promise<{ lat: number, lng: number, city: null, state: null, country: string, display: string }>}
 */
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      console.warn(
        '[location] not a secure context (HTTPS); geolocation often fails on iOS Safari'
      );
    }
    console.log('[location] calling getCurrentPosition');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('[location] got position', pos.coords);
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          city: null,
          state: null,
          country: 'US',
          display: 'your location',
        });
      },
      (err) => {
        console.error('[geolocation] failed:', err.code, err.message);
        reject(err);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
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

  persistLocation(location);
  console.log('[location] manual geocoding complete', location.display);
  return location;
}

export function clearLocation() {
  sessionStorage.removeItem(CACHE_KEY);
}
