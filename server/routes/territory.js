import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const anthropic = new Anthropic();

const MODEL =
  process.env.ANTHROPIC_TERRITORY_MODEL ||
  process.env.ANTHROPIC_CITY_MODEL ||
  process.env.ANTHROPIC_VISION_MODEL ||
  'claude-sonnet-4-6';

/** In-memory cache keyed by rounded lat/lng (0.1 degree ~ 11 km) */
const territoryCache = new Map();

function cacheKey(lat, lng) {
  return `${Math.round(lat * 10) / 10},${Math.round(lng * 10) / 10}`;
}

function parseHistoryJson(text) {
  const trimmed = String(text || '').trim();
  let slice = trimmed;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) slice = fence[1].trim();
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

/** @param {unknown} data */
function normalizeNativeLandTerritories(data) {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map(extractTerritory).filter(Boolean);
  }
  if (typeof data === 'object' && data !== null && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
    return data.features.map((f) => extractTerritory(f)).filter(Boolean);
  }
  return [];
}

/** @param {unknown} raw */
function extractTerritory(raw) {
  const f = raw && typeof raw === 'object' ? raw : null;
  const props = f?.properties && typeof f.properties === 'object' ? f.properties : f;
  if (!props || typeof props !== 'object') return null;
  const name = props.Name ?? props.name;
  const slug = props.Slug ?? props.slug ?? null;
  if (!name || typeof name !== 'string') return null;
  const description_url = slug
    ? `https://native-land.ca/maps/territories/${encodeURIComponent(slug)}`
    : 'https://native-land.ca';
  return {
    name,
    slug,
    color: typeof props.color === 'string' ? props.color : null,
    description_url,
  };
}

function fallbackHistory(county, state, country, territories) {
  const location_name = [county, state].filter(Boolean).join(', ') || 'This location';
  const names = territories.map((t) => t.name).join(', ');
  return {
    location_name,
    territory_summary: names
      ? `Native Land Digital and regional records indicate overlapping Indigenous territories in this area, including ${names}. Further treaty-specific detail was not generated in this response; consult primary sources and Native Land Digital.`
      : 'Indigenous territory names for this exact point were not loaded (configure NATIVE_LAND_API_KEY for the Native Land Digital layer). Use regional archives and Native Land Digital for ground-truthing.',
    treaty_note: null,
    county_history: '',
    land_character: '',
    oral_tradition_note: null,
    sources: [
      'Native Land Digital (native-land.ca)',
      ...(county && state ? [`${state} historical sources`] : []),
    ],
  };
}

/** GET /api/territory?lat=&lng= */
router.get('/', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat and lng required' });
  }

  const key = cacheKey(lat, lng);
  if (territoryCache.has(key)) {
    return res.json(territoryCache.get(key));
  }

  try {
    let territories = [];
    const nlKey = process.env.NATIVE_LAND_API_KEY;
    if (nlKey) {
      const nlUrl = new URL('https://native-land.ca/api/index.php');
      nlUrl.searchParams.set('maps', 'territories');
      nlUrl.searchParams.set('position', `${lat},${lng}`);
      nlUrl.searchParams.set('key', nlKey);

      const nativeLandRes = await fetch(nlUrl.toString(), {
        headers: { 'User-Agent': 'EthicalAlt/1.0 (ethical alternatives app)' },
      });
      if (!nativeLandRes.ok) {
        const errText = await nativeLandRes.text().catch(() => '');
        console.warn('[territory] Native Land HTTP', nativeLandRes.status, errText.slice(0, 200));
      } else {
        const nativeLandData = await nativeLandRes.json();
        territories = normalizeNativeLandTerritories(nativeLandData);
      }
    } else {
      console.warn('[territory] NATIVE_LAND_API_KEY not set; territory polygons skipped');
    }

    const geoUrl = new URL('https://nominatim.openstreetmap.org/reverse');
    geoUrl.searchParams.set('lat', String(lat));
    geoUrl.searchParams.set('lon', String(lng));
    geoUrl.searchParams.set('format', 'json');
    geoUrl.searchParams.set('addressdetails', '1');

    const geocodeRes = await fetch(geoUrl.toString(), {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'EthicalAlt/1.0 (ethical alternatives app)',
      },
    });
    const geocodeData = await geocodeRes.json();
    const addr = geocodeData.address || {};
    const county = addr.county || addr.city || null;
    const state = addr.state || null;
    const country = (addr.country_code && String(addr.country_code).toUpperCase()) || 'US';

    const territoryNames = territories.map((t) => t.name).join(', ') || 'unknown (see Native Land Digital)';
    const locationStr = [county, state].filter(Boolean).join(', ');

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 900,
      messages: [
        {
          role: 'user',
          content: `You are generating a place history card for GPS coordinates ${lat}, ${lng}.

Location: ${locationStr}, ${country}
Indigenous territories at this location (from Native Land Digital, when available): ${territoryNames}

Generate a JSON object with this exact shape:

{
  "location_name": string,
  "territory_summary": string,
  "treaty_note": string | null,
  "county_history": string,
  "land_character": string,
  "oral_tradition_note": string | null,
  "sources": string[]
}

Rules:
- Be specific to this exact location. No generic tourism copy.
- Do not present contested history as settled; use "historical records indicate" / "oral tradition holds" where needed.
- Never use the word "discovered" for European arrival.
- If Native Land listed "unknown", say documentation should be checked on native-land.ca and in regional archives.
- Return ONLY valid JSON. No markdown, no preamble.`,
        },
      ],
    });

    const block = response.content?.[0];
    const text = block && block.type === 'text' ? block.text : '';
    let parsed = parseHistoryJson(text);
    if (!parsed || typeof parsed !== 'object') {
      parsed = fallbackHistory(county, state, country, territories);
    }

    const result = {
      lat,
      lng,
      county,
      state,
      country,
      territories,
      history: parsed,
      source_native_land: 'https://native-land.ca',
    };

    territoryCache.set(key, result);
    setTimeout(() => territoryCache.delete(key), 24 * 60 * 60 * 1000);

    res.json(result);
  } catch (err) {
    console.error('[territory] error:', err.message);
    res.status(500).json({ error: err.message || 'territory lookup failed' });
  }
});

export default router;
