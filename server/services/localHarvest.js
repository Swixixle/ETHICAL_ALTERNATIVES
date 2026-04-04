const UA = 'EthicalAlt/1.0 (local food discovery; LocalHarvest search)';
const LOCALHARVEST_LABEL = 'LOCAL FARM / CSA';

const cache = new Map(); // key -> { at, rows }

/** @param {number} lat @param {number} lng */
function cacheKey(lat, lng) {
  return `${Math.round(lat * 100) / 100},${Math.round(lng * 100) / 100}`;
}

function decodeHtmlEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(html) {
  return decodeHtmlEntities(String(html).replace(/<[^>]+>/g, ' '));
}

/**
 * @param {string} html
 * @returns {Record<string, unknown>[]}
 */
export function parseLocalHarvestSearchHtml(html) {
  const out = [];
  const seen = new Set();

  const re = /<a href="(\/[^"]+-M\d+)"[^>]*class="mt-0"[^>]*>([^<]*)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const path = m[1];
    const name = decodeHtmlEntities(m[2]).replace(/\s+/g, ' ').trim();
    if (!name || seen.has(path)) continue;
    seen.add(path);

    const start = m.index;
    const nextFarm = html.indexOf('<span class="farm-icon', start + 10);
    const chunk =
      nextFarm === -1 ? html.slice(start) : html.slice(start, nextFarm + 2000);

    const pMatch = chunk.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const desc = pMatch ? stripTags(pMatch[1]).replace(/\s*\[more\]\s*$/i, '').trim() : '';

    const locMatch = chunk.match(
      /fa-location-dot[^<]*<\/i>\s*<a href="[^"]*"[^>]*>([^<]+)<\/a>/i
    );
    const locLine = locMatch ? decodeHtmlEntities(locMatch[1]).trim() : '';

    let city = '';
    let stateProvince = '';
    if (locLine) {
      const bits = locLine.split(',').map((x) => x.trim()).filter(Boolean);
      if (bits.length >= 2) {
        stateProvince = bits.pop() || '';
        city = bits.join(', ');
      } else {
        city = locLine;
      }
    }

    const href = `https://www.localharvest.org${path}`;

    out.push({
      id: `lh-${path.replace(/[^\w-]+/g, '')}`,
      seller_name: name,
      tagline: locLine || 'Farm / CSA listing',
      product_description: desc.slice(0, 500) || null,
      website_url: href,
      etsy_url: null,
      instagram_url: null,
      other_url: null,
      other_url_label: null,
      city: city || null,
      state_province: stateProvince || null,
      country: 'US',
      lat: null,
      lng: null,
      ships_nationally: false,
      ships_worldwide: false,
      in_person_only: true,
      categories: [],
      keywords: [],
      verified: false,
      is_worker_owned: false,
      is_bcorp: false,
      is_fair_trade: false,
      certifications: [],
      distance_miles: null,
      trust_tier: 'sourced',
      provenance_label: LOCALHARVEST_LABEL,
      street_address_line: locLine || null,
    });
  }

  return out.slice(0, 20);
}

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function fetchLocalHarvestFarms(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return [];

  const key = cacheKey(la, ln);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < 24 * 60 * 60 * 1000) {
    return hit.rows;
  }

  const url = `https://www.localharvest.org/search.jsp?lat=${encodeURIComponent(String(la))}&lon=${encodeURIComponent(String(ln))}&scale=4&ty=6`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'text/html',
        'User-Agent': UA,
      },
    });
    if (!res.ok) {
      cache.set(key, { at: now, rows: [] });
      return [];
    }
    const html = await res.text();
    const rows = parseLocalHarvestSearchHtml(html);
    cache.set(key, { at: now, rows });
    return rows;
  } catch (err) {
    console.warn('LocalHarvest:', err?.message || err);
    cache.set(key, { at: now, rows: [] });
    return [];
  }
}

export { LOCALHARVEST_LABEL };
