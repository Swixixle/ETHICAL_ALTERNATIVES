import { setTimeout as delay } from 'node:timers/promises';

const ETSY_LISTINGS =
  'https://openapi.etsy.com/v3/application/listings/active';

/** Map Etsy taxonomy path segments to our category (best-effort). */
function mapTaxonomyToCategory(taxonomyPath) {
  if (!Array.isArray(taxonomyPath) || !taxonomyPath.length) return null;
  const path = taxonomyPath
    .map((t) => (typeof t === 'string' ? t : t?.path ?? t?.name ?? ''))
    .join('/')
    .toLowerCase();

  if (/book|stationery/.test(path)) return 'books';
  if (/electronic|computer|phone|camera/.test(path)) return 'electronics';
  if (/coffee|tea/.test(path)) return 'coffee';
  if (/food|kitchen|grocery|candy/.test(path)) return 'food';
  if (/beauty|bath|cosmetic|skin|personal/.test(path)) return 'personal_care';
  if (/home|house|ceramic|rug|furniture|supplies/.test(path)) return 'home_goods';
  if (/tool|hardware|suppl/.test(path)) return 'tools';
  if (/cigar|tobacco|smok/.test(path)) return 'tobacco';
  if (/clothing|apparel|jean|shirt|dress|bag|shoe|accessories/.test(path)) return 'clothing';
  return null;
}

function getShop(listing) {
  const s = listing?.shop;
  if (s && typeof s === 'object') return s;
  return null;
}

function listingPriceUsd(listing) {
  const p = listing?.price;
  if (!p || typeof p !== 'object') return 0;
  const amount = Number(p.amount);
  const divisor = Number(p.divisor) || 100;
  if (Number.isNaN(amount)) return 0;
  return amount / divisor;
}

function mainImageUrl(listing) {
  const img = listing?.images?.[0] || listing?.MainImage || listing?.image;
  if (!img) return null;
  const candidates = [img.url_fullxfull, img.url_570xN, img.url_300x300, img.url];
  for (const u of candidates) {
    if (typeof u === 'string' && u.length) return u;
  }
  return null;
}

function buildListingUrl(listingId) {
  return `https://www.etsy.com/listing/${listingId}`;
}

function buildShopUrl(shopIdOrSlug) {
  if (shopIdOrSlug == null) return 'https://www.etsy.com/';
  return `https://www.etsy.com/shop/${shopIdOrSlug}`;
}

function normalizeListing(listing, categoryHint) {
  const listingId = String(listing?.listing_id ?? '');
  const shop = getShop(listing);
  const shopId = shop?.shop_id ?? shop?.shop_id;
  const shopSlug = shop?.shop_name
    ? String(shop.shop_name).replace(/\s+/g, '').replace(/[^a-zA-Z0-9-_]/g, '')
    : shopId;

  const taxonomyCategory =
    mapTaxonomyToCategory(listing?.taxonomy_path) || mapTaxonomyToCategory(listing?.categories);

  const title = listing?.title ? String(listing.title) : 'Etsy listing';
  const description =
    listing?.description && typeof listing.description === 'string'
      ? listing.description.slice(0, 500)
      : null;

  return {
    type: 'etsy',
    listing_id: listingId,
    title,
    description,
    price_usd: listingPriceUsd(listing),
    currency: listing?.price?.currency_code || 'USD',
    url: buildListingUrl(listingId),
    image_url: mainImageUrl(listing),
    shop_name: shop?.shop_name ? String(shop.shop_name) : 'Unknown shop',
    shop_url: buildShopUrl(shopSlug || shopId),
    shop_city: shop?.shop_location_city ?? null,
    shop_state: shop?.shop_location_state ?? null,
    shop_country: shop?.shop_location_country_iso ?? null,
    shop_sales_count: Number(shop?.transaction_sold_count) || 0,
    provenance_label: 'Independent',
    _category_mapped: categoryHint || taxonomyCategory,
  };
}

function prefersIndependentShop(shop) {
  if (!shop) return true;
  const sales = Number(shop.transaction_sold_count);
  const active = Number(shop.listing_active_count);
  if (Number.isNaN(sales) || Number.isNaN(active)) return true;
  return sales < 10_000 && active < 1_000;
}

async function fetchListingsOnce(url, apiKey) {
  const res = await fetch(url, {
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });
  return res;
}

/**
 * @param {object} opts
 * @param {string} opts.keywords
 * @param {number} [opts.limit]
 * @param {string} [opts.category] — our vision category (for taxonomy hint only)
 */
export async function searchEtsy({ keywords, limit = 12, category }) {
  const apiKey = process.env.ETSY_API_KEY;
  if (!apiKey) {
    console.error('Etsy: missing ETSY_API_KEY');
    return [];
  }

  const url = new URL(ETSY_LISTINGS);
  url.searchParams.set('keywords', keywords || 'handmade');
  url.searchParams.set('limit', String(Math.min(100, Math.max(1, limit))));
  url.searchParams.set('sort_on', 'score');
  url.searchParams.set('includes', 'MainImage,Shop');

  try {
    let res = await fetchListingsOnce(url, apiKey);
    if (res.status === 429) {
      await delay(1000);
      res = await fetchListingsOnce(url, apiKey);
    }

    if (!res.ok) {
      console.error('Etsy API error', res.status, await res.text().catch(() => ''));
      return [];
    }

    const data = await res.json();
    const raw = Array.isArray(data?.results) ? data.results : [];

    const preferred = raw.filter((listing) => prefersIndependentShop(getShop(listing)));
    const rest = raw.filter((listing) => !preferred.includes(listing));
    const seen = new Set();
    const ordered = [];
    for (const l of [...preferred, ...rest]) {
      const id = String(l?.listing_id ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ordered.push(l);
    }

    const normalized = ordered
      .map((l) => normalizeListing(l, category))
      .map(({ _category_mapped, ...rest }) => rest)
      .filter((n) => n.listing_id)
      .slice(0, limit);

    return normalized;
  } catch (e) {
    console.error('Etsy network error', e);
    return [];
  }
}
