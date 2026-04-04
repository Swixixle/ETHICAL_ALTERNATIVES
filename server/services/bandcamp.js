const UA = 'EthicalAlt/1.0 (community seller discovery; Bandcamp location discover link)';
const BANDCAMP_LABEL = 'BANDCAMP — INDEPENDENT ARTIST';

/**
 * @param {string} q
 * @returns {Promise<{ id: string; name: string; fullname: string } | null>}
 */
export async function geonameSearchFirst(q) {
  const query = typeof q === 'string' ? q.trim() : '';
  if (!query) return null;

  try {
    const res = await fetch('https://bandcamp.com/api/location/1/geoname_search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': UA,
      },
      body: JSON.stringify({ q: query }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const row = Array.isArray(data?.results) ? data.results[0] : null;
    if (!row || typeof row.id !== 'string' || typeof row.name !== 'string') return null;
    return {
      id: row.id,
      name: row.name,
      fullname: typeof row.fullname === 'string' ? row.fullname : row.name,
    };
  } catch {
    return null;
  }
}

function slugifyCityName(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * @param {{ city?: string | null; state?: string | null }} place
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function bandcampDiscoverSellerRow(place) {
  const city = typeof place?.city === 'string' ? place.city.trim() : '';
  const state = typeof place?.state === 'string' ? place.state.trim() : '';
  const q = [city, state].filter(Boolean).join(', ');
  if (!q) return null;

  const geo = await geonameSearchFirst(q);
  if (!geo) return null;

  const slug = slugifyCityName(geo.name);
  if (!slug) return null;

  const href = `https://bandcamp.com/discover/location/${geo.id}-${slug}`;
  let stateProvince = '';
  const parts = geo.fullname.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) stateProvince = parts[parts.length - 1];
  else if (state) stateProvince = state;

  return {
    id: `bandcamp-${geo.id}`,
    seller_name: `Discover local artists · ${geo.fullname}`,
    tagline: 'Independent musicians and labels on Bandcamp from this area.',
    product_description: null,
    website_url: href,
    etsy_url: null,
    instagram_url: null,
    other_url: null,
    other_url_label: null,
    city: geo.name,
    state_province: stateProvince || null,
    country: null,
    lat: null,
    lng: null,
    ships_nationally: false,
    ships_worldwide: false,
    in_person_only: false,
    categories: [],
    keywords: [],
    verified: false,
    is_worker_owned: false,
    is_bcorp: false,
    is_fair_trade: false,
    certifications: [],
    distance_miles: null,
    trust_tier: 'sourced',
    provenance_label: BANDCAMP_LABEL,
    street_address_line: null,
  };
}

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function bandcampDiscoverFromCoords(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(la));
    url.searchParams.set('lon', String(ln));
    url.searchParams.set('format', 'json');
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
    const a = data?.address || {};
    const city = a.city || a.town || a.village || a.hamlet || a.municipality || a.county;
    const state = a.state || a['ISO3166-2-lvl4'];
    return bandcampDiscoverSellerRow({
      city: typeof city === 'string' ? city : '',
      state: typeof state === 'string' ? state : '',
    });
  } catch {
    return null;
  }
}

export { BANDCAMP_LABEL };
