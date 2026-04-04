/**
 * Tracks movement and requests territory when the user has moved far enough;
 * only surfaces new data when reverse-geocoded county changes.
 */

const COUNTY_CHANGE_THRESHOLD_MILES = 5;

let watchId = null;
let lastPosition = null;
let lastCounty = null;
let onTerritoryChange = null;

function distanceMiles(lat1, lng1, lat2, lng2) {
  const dx = (lat2 - lat1) * 69.0;
  const dy = (lng2 - lng1) * 69.0 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dx * dx + dy * dy);
}

/** Sync tracker with a known point (e.g. home load) to avoid duplicate lookups on first watch fix. */
export function primeTravelTracker(lat, lng, county) {
  lastPosition = { lat, lng };
  if (county !== undefined) lastCounty = county || null;
}

export function resetTravelTracker() {
  lastPosition = null;
  lastCounty = null;
}

/**
 * @param {string} apiBase
 * @param {(data: unknown) => void} onNewTerritory
 */
export function startTravelTracking(apiBase, onNewTerritory) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return;

  onTerritoryChange = onNewTerritory;

  watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;

      if (lastPosition) {
        const dist = distanceMiles(lastPosition.lat, lastPosition.lng, lat, lng);
        if (dist < COUNTY_CHANGE_THRESHOLD_MILES) return;
      }

      lastPosition = { lat, lng };

      try {
        const base = (apiBase || '').replace(/\/$/, '');
        const res = await fetch(`${base}/api/territory?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
        if (!res.ok) return;
        const data = await res.json();

        const newCounty = data.county;

        if (newCounty && newCounty !== lastCounty) {
          lastCounty = newCounty;
          onTerritoryChange?.(data);
        }
      } catch (err) {
        console.warn('[travel] territory lookup failed:', err?.message || err);
      }
    },
    (err) => console.warn('[travel] geolocation error:', err.message),
    {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60000,
    }
  );
}

export function stopTravelTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  lastPosition = null;
  onTerritoryChange = null;
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {string} apiBase
 */
export async function lookupCurrentTerritory(lat, lng, apiBase) {
  const base = (apiBase || '').replace(/\/$/, '');
  const res = await fetch(`${base}/api/territory?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
  if (!res.ok) {
    const err = new Error(`territory HTTP ${res.status}`);
    throw err;
  }
  return res.json();
}
