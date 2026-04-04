const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function buildAddress(tags) {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'],
    tags['addr:state'],
    tags['addr:postcode'],
    tags['addr:country'],
  ].filter(Boolean);
  if (parts.length) return parts.join(', ');
  if (tags['addr:full']) return tags['addr:full'];
  return '';
}

/**
 * @param {object} opts
 * @param {number} opts.lat
 * @param {number} opts.lng
 * @param {number} [opts.radiusMeters] default 25000
 * @param {string[]} opts.shopTypes
 * @param {string[]} [opts.excludeNameSubstrings] lowercase chain needles
 */
export async function queryLocalBusinesses({
  lat,
  lng,
  radiusMeters = 25_000,
  shopTypes,
  excludeNameSubstrings = [],
}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !shopTypes?.length) {
    return [];
  }

  const pattern = shopTypes.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

  const query = `[out:json][timeout:25];
(
  node["shop"~"^(${pattern})$",i](around:${radiusMeters},${lat},${lng});
);
out body;`;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!res.ok) {
      console.error('Overpass HTTP', res.status);
      return [];
    }

    const data = await res.json();
    const elements = Array.isArray(data?.elements) ? data.elements : [];

    const needles = excludeNameSubstrings.map((s) => String(s).toLowerCase());

    const out = [];
    for (const el of elements) {
      if (el.type !== 'node' || !Number.isFinite(el.lat) || !Number.isFinite(el.lon)) continue;
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || 'Local business';
      const lower = name.toLowerCase();
      if (needles.some((n) => n && lower.includes(n))) continue;

      out.push({
        type: 'local',
        osm_id: String(el.id),
        name,
        address: buildAddress(tags) || `${el.lat.toFixed(4)}, ${el.lon.toFixed(4)}`,
        lat: el.lat,
        lng: el.lon,
        distance_miles: haversineMiles(lat, lng, el.lat, el.lon),
        phone: tags.phone || tags['contact:phone'] || null,
        website: tags.website || tags['contact:website'] || null,
        opening_hours: tags.opening_hours || null,
        provenance_label: 'Local Unvetted',
      });
    }

    out.sort((a, b) => a.distance_miles - b.distance_miles);
    return out.slice(0, 40);
  } catch (e) {
    console.error('Overpass error', e);
    return [];
  }
}
