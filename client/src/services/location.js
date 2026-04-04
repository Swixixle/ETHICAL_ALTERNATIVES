/**
 * Request user location; reverse-geocode for city. Cached in sessionStorage for the session.
 * @returns {Promise<{ lat: number, lng: number, city: string, state: string | null, country: string, display: string } | null>}
 */

const CACHE_KEY = 'ea_user_location';

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
          'User-Agent': 'EthicalAlt/1.0 (https://github.com/Swixixle/ETHICAL_ALTERNATIVES)',
        },
      }
    );
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
  } catch {
    return { city: 'your area', state: null, country: 'US', display: 'your area' };
  }
}

export async function getUserLocation() {
  const cached = readCachedLocation();
  if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lng)) {
    return cached;
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation not supported');
  }

  const coords = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 10000, maximumAge: 300000 }
    );
  });

  const geo = await reverseGeocode(coords.lat, coords.lng);
  const location = { ...coords, ...geo };
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(location));
  return location;
}

export function clearLocation() {
  sessionStorage.removeItem(CACHE_KEY);
}
