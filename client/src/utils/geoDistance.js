/**
 * Distance helpers for local feed / map UI (miles).
 */

/** Earth radius in miles */
const R_MI = 3958.8;

export function haversineDistanceMiles(lat1, lon1, lat2, lon2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R_MI * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Sort key: finite distance in miles, else +Infinity.
 * @param {Record<string, unknown>} b
 * @param {number} userLat
 * @param {number} userLng
 */
function distanceSortKey(b, userLat, userLng) {
  const raw = b?.distance_mi ?? b?.distance_miles;
  const fromField = typeof raw === 'number' ? raw : Number(raw);
  if (Number.isFinite(fromField)) return fromField;
  const lat = typeof b?.lat === 'number' ? b.lat : b?.lat != null ? Number(b.lat) : NaN;
  const lng = typeof b?.lng === 'number' ? b.lng : b?.lng != null ? Number(b.lng) : NaN;
  if (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Number.isFinite(userLat) &&
    Number.isFinite(userLng)
  ) {
    return haversineDistanceMiles(userLat, userLng, lat, lng);
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * Nearest first; tie-break registry before OSM. Fills in `distance_mi` when computed.
 * @param {Array<Record<string, unknown>> | undefined} feed
 * @param {number} userLat
 * @param {number} userLng
 */
export function sortLocalBusinessesByProximity(feed, userLat, userLng) {
  if (!Array.isArray(feed)) return [];
  if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) return [...feed];

  const enriched = feed.map((b) => {
    const d = distanceSortKey(b, userLat, userLng);
    const rounded = Number.isFinite(d) && d !== Number.POSITIVE_INFINITY ? Math.round(d * 10) / 10 : d;
    const next = { ...b };
    if (
      (next.distance_mi == null || !Number.isFinite(Number(next.distance_mi))) &&
      Number.isFinite(rounded) &&
      rounded !== Number.POSITIVE_INFINITY
    ) {
      next.distance_mi = rounded;
    }
    return next;
  });

  return enriched.sort((a, b) => {
    const da = distanceSortKey(a, userLat, userLng);
    const db = distanceSortKey(b, userLat, userLng);
    if (da !== db) return da - db;
    const ra = a.type === 'registry' ? 0 : 1;
    const rb = b.type === 'registry' ? 0 : 1;
    if (ra !== rb) return ra - rb;
    if (Boolean(b.verified) !== Boolean(a.verified)) return a.verified ? -1 : 1;
    const ta = a.trust_tier === 'verified_independent' ? 0 : 1;
    const tb = b.trust_tier === 'verified_independent' ? 0 : 1;
    return ta - tb;
  });
}
