import { nameMatchesChain, normalizeChainNeedles } from '../utils/chainMatch.js';

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
 * @param {string[]} [opts.excludeNameSubstrings] chain needles (matched case-insensitively)
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

    const needles = normalizeChainNeedles(excludeNameSubstrings);

    const out = [];
    for (const el of elements) {
      if (el.type !== 'node' || !Number.isFinite(el.lat) || !Number.isFinite(el.lon)) continue;
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || 'Local business';
      if (nameMatchesChain(name, needles)) continue;

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

const FEED_PLACE_LABELS = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  bar: 'Bar',
  pub: 'Pub',
  fast_food: 'Fast food',
  ice_cream: 'Ice cream',
  biergarten: 'Beer garden',
  food_court: 'Food court',
  bicycle_repair_station: 'Bike repair',
  arts_centre: 'Arts center',
  clothes: 'Clothing',
  tailor: 'Tailor',
  shoes: 'Shoes',
  boutique: 'Boutique',
  fabrics: 'Fabrics',
  fashion: 'Fashion',
  books: 'Bookshop',
  gift: 'Gift shop',
  art: 'Art / gallery supplies',
  bakery: 'Bakery',
  deli: 'Deli',
  greengrocer: 'Greengrocer',
  butcher: 'Butcher',
  bicycle: 'Bike shop',
  electronics: 'Electronics',
  repair: 'Repair shop',
  florist: 'Florist',
  coffee: 'Coffee',
  variety_store: 'Variety store',
  hotel: 'Hotel',
  antiques: 'Antiques',
  music: 'Music',
  dry_cleaning: 'Dry cleaner',
  confectionery: 'Confectionery',
  seafood: 'Seafood',
  cheese: 'Cheese shop',
  key_cutter: 'Key cutter',
  craft: 'Craft supplies',
  frame: 'Framing',
  alcohol: 'Bottle shop',
  beauty: 'Beauty',
  furniture: 'Furniture',
  hardware: 'Hardware',
  jewelry: 'Jewelry',
  pet: 'Pet supplies',
};

const STAY_TOURISM_LABELS = {
  guest_house: 'Guest house',
  hostel: 'Hostel',
  bed_and_breakfast: 'B&B / inn',
  apartment: 'Tourist apartment',
  chalet: 'Chalet',
  camp_site: 'Camp site',
};

/**
 * OSM shop=* and amenity=* nodes for the home local feed (home screen).
 * Known chains go to `chainPlaces` (footnote), not `places`.
 * @param {object} opts
 * @param {number} opts.lat
 * @param {number} opts.lng
 * @param {number} [opts.radiusMeters]
 * @param {string} [opts.category] all|food|coffee|clothing|repair|art
 * @param {string[]} [opts.excludeNameSubstrings]
 * @returns {Promise<{ places: object[]; chainPlaces: object[] }>}
 */
export async function queryLocalFeedPlaces({
  lat,
  lng,
  radiusMeters = 40_000,
  category = 'all',
  excludeNameSubstrings = [],
}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { places: [], chainPlaces: [] };
  }

  const cat = typeof category === 'string' ? category.trim().toLowerCase() : 'all';

  if (cat === 'stay') {
    const tourismPat = 'guest_house|hostel|bed_and_breakfast|apartment|chalet|camp_site';
    const stayQuery = `[out:json][timeout:25];
(
  node["tourism"~"^(${tourismPat})$",i](around:${radiusMeters},${lat},${lng});
  node["amenity"="hotel"](around:${radiusMeters},${lat},${lng});
);
out body;`;
    try {
      const res = await fetch(OVERPASS_URL, {
        method: 'POST',
        body: `data=${encodeURIComponent(stayQuery)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (!res.ok) {
        console.error('Overpass stay HTTP', res.status);
        return { places: [], chainPlaces: [] };
      }
      const data = await res.json();
      const elements = Array.isArray(data?.elements) ? data.elements : [];
      const needles = normalizeChainNeedles(excludeNameSubstrings);
      const out = [];
      const chainOut = [];
      const seen = new Set();
      for (const el of elements) {
        if (el.type !== 'node' || !Number.isFinite(el.lat) || !Number.isFinite(el.lon)) continue;
        const tags = el.tags || {};
        const name = tags.name || tags['name:en'] || 'Lodging';
        const id = String(el.id);
        if (seen.has(id)) continue;
        seen.add(id);
        const tourism = tags.tourism;
        const amenity = tags.amenity;
        const labelKey =
          tourism && STAY_TOURISM_LABELS[tourism]
            ? STAY_TOURISM_LABELS[tourism]
            : amenity === 'hotel'
              ? FEED_PLACE_LABELS.hotel
              : 'Stay';
        const tagline =
          typeof tags.description === 'string' && tags.description.trim()
            ? tags.description.trim().slice(0, 140)
            : labelKey;
        const row = {
          type: 'local',
          osm_id: id,
          name,
          address: buildAddress(tags) || `${el.lat.toFixed(4)}, ${el.lon.toFixed(4)}`,
          lat: el.lat,
          lng: el.lon,
          distance_miles: haversineMiles(lat, lng, el.lat, el.lon),
          phone: tags.phone || tags['contact:phone'] || null,
          website: tags.website || tags['contact:website'] || null,
          tagline,
          provenance_label: 'Local Unvetted',
        };
        if (nameMatchesChain(name, needles)) {
          chainOut.push(row);
        } else {
          out.push(row);
        }
      }
      out.sort((a, b) => a.distance_miles - b.distance_miles);
      chainOut.sort((a, b) => a.distance_miles - b.distance_miles);
      return { places: out.slice(0, 80), chainPlaces: chainOut.slice(0, 40) };
    } catch (e) {
      console.error('Overpass stay error', e);
      return { places: [], chainPlaces: [] };
    }
  }

  const FEED_OSM_BY_CATEGORY = {
    all: {
      shop: [
        'clothes',
        'books',
        'gift',
        'art',
        'bakery',
        'deli',
        'greengrocer',
        'butcher',
        'bicycle',
        'electronics',
        'repair',
        'tailor',
        'florist',
        'coffee',
        'shoes',
        'variety_store',
        'antiques',
        'music',
        'dry_cleaning',
        'confectionery',
        'seafood',
        'cheese',
        'craft',
        'frame',
        'alcohol',
        'beauty',
        'furniture',
        'hardware',
        'jewelry',
        'pet',
        'boutique',
        'fabrics',
        'fashion',
      ],
      amenity: [
        'restaurant',
        'cafe',
        'bar',
        'pub',
        'fast_food',
        'ice_cream',
        'biergarten',
        'food_court',
        'arts_centre',
      ],
    },
    coffee: { shop: ['coffee'], amenity: ['cafe'] },
    food: {
      shop: ['bakery', 'deli', 'greengrocer', 'butcher', 'confectionery', 'seafood', 'cheese', 'coffee'],
      amenity: ['restaurant', 'bar', 'pub', 'fast_food', 'ice_cream', 'food_court', 'cafe'],
    },
    clothing: {
      shop: ['clothes', 'tailor', 'shoes', 'boutique', 'fabrics', 'fashion'],
      amenity: [],
    },
    repair: {
      shop: ['repair', 'electronics', 'bicycle', 'tailor', 'key_cutter'],
      amenity: ['bicycle_repair_station'],
    },
    art: {
      shop: ['art', 'music', 'books', 'craft', 'frame', 'antiques', 'gift'],
      amenity: ['arts_centre'],
    },
  };

  const cfg = FEED_OSM_BY_CATEGORY[cat] || FEED_OSM_BY_CATEGORY.all;
  const escape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const shopPat = cfg.shop?.length ? cfg.shop.map(escape).join('|') : '';
  const amenityPat = cfg.amenity?.length ? cfg.amenity.map(escape).join('|') : '';

  const lines = [];
  if (shopPat) {
    lines.push(`  node["shop"~"^(${shopPat})$",i](around:${radiusMeters},${lat},${lng});`);
  }
  if (amenityPat) {
    lines.push(`  node["amenity"~"^(${amenityPat})$",i](around:${radiusMeters},${lat},${lng});`);
  }
  if (!lines.length) return { places: [], chainPlaces: [] };

  const query = `[out:json][timeout:25];
(
${lines.join('\n')}
);
out body;`;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!res.ok) {
      console.error('Overpass feed HTTP', res.status);
      return { places: [], chainPlaces: [] };
    }

    const data = await res.json();
    const elements = Array.isArray(data?.elements) ? data.elements : [];
    const needles = normalizeChainNeedles(excludeNameSubstrings);

    const out = [];
    const chainOut = [];
    const seen = new Set();
    for (const el of elements) {
      if (el.type !== 'node' || !Number.isFinite(el.lat) || !Number.isFinite(el.lon)) continue;
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || 'Independent business';
      const id = String(el.id);
      if (seen.has(id)) continue;
      seen.add(id);

      const shop = tags.shop;
      const amenity = tags.amenity;
      const labelKey = shop || amenity || '';
      const tagline =
        typeof tags.description === 'string' && tags.description.trim()
          ? tags.description.trim().slice(0, 140)
          : FEED_PLACE_LABELS[labelKey] || 'Independent business';

      const row = {
        type: 'local',
        osm_id: id,
        name,
        address: buildAddress(tags) || `${el.lat.toFixed(4)}, ${el.lon.toFixed(4)}`,
        lat: el.lat,
        lng: el.lon,
        distance_miles: haversineMiles(lat, lng, el.lat, el.lon),
        phone: tags.phone || tags['contact:phone'] || null,
        website: tags.website || tags['contact:website'] || null,
        tagline,
        provenance_label: 'Local Unvetted',
      };

      if (nameMatchesChain(name, needles)) {
        chainOut.push(row);
      } else {
        out.push(row);
      }
    }

    out.sort((a, b) => a.distance_miles - b.distance_miles);
    chainOut.sort((a, b) => a.distance_miles - b.distance_miles);
    return { places: out.slice(0, 80), chainPlaces: chainOut.slice(0, 40) };
  } catch (e) {
    console.error('Overpass feed error', e);
    return { places: [], chainPlaces: [] };
  }
}
