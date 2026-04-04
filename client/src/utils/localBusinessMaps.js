/** @param {unknown} v */
function numOrNaN(v) {
  if (typeof v === 'number') return v;
  if (v == null) return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Primary display line: OSM housenumber + street + city when present.
 * @param {Record<string, unknown> | null | undefined} place
 */
export function getStreetAddressLine(place) {
  const s = place?.street_address_line;
  if (typeof s === 'string' && s.trim()) return s.trim();
  return '';
}

/**
 * @param {Record<string, unknown> | null | undefined} place
 * @returns {string | null}
 */
export function getGoogleMapsUrl(place) {
  if (!place) return null;
  const nameRaw = place.name;
  const name =
    typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : 'Business';
  const street = getStreetAddressLine(place);
  const lat = numOrNaN(place.lat);
  const lng = numOrNaN(place.lng);

  if (street) {
    return `https://www.google.com/maps/search/${encodeURIComponent(`${name} ${street}`)}`;
  }
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  const addrRaw = place.address;
  const addr = typeof addrRaw === 'string' ? addrRaw.trim() : '';
  if (addr && !/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(addr)) {
    return `https://www.google.com/maps/search/${encodeURIComponent(`${name} ${addr}`)}`;
  }
  return null;
}
