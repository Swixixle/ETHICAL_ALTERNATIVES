import { pool } from '../db/pool.js';

/** Vision / tap category → registry category tokens for overlap queries */
const CATEGORY_MAP = {
  clothing: ['clothing', 'fashion', 'handmade', 'vintage', 'denim', 'knitwear'],
  food: ['food', 'coffee', 'tea', 'chocolate', 'bakery', 'farm'],
  coffee: ['coffee', 'roaster', 'tea'],
  personal_care: ['personal_care', 'soap', 'skincare', 'beauty', 'candles'],
  home_goods: ['ceramics', 'furniture', 'textiles', 'candles', 'art', 'home_goods'],
  electronics: ['electronics', 'repair', 'refurbished'],
  books: ['books', 'zines', 'publishing'],
  art: ['art', 'ceramics', 'home_goods', 'handmade', 'textiles'],
  outdoor: ['outdoor', 'gear', 'clothing'],
  tobacco: [],
  tools: ['handmade', 'tools', 'other'],
  other: ['handmade', 'other'],
  stay: ['lodging'],
};

function normalizeCategoryTerms(category) {
  const key = typeof category === 'string' ? category.trim().toLowerCase() : '';
  if (Object.prototype.hasOwnProperty.call(CATEGORY_MAP, key)) {
    const mapped = CATEGORY_MAP[key];
    if (!mapped || !mapped.length) return [];
    return [...new Set(mapped.map((t) => String(t).toLowerCase()))];
  }
  const fallback = key ? [key] : ['handmade', 'other'];
  return [...new Set(fallback.map((t) => String(t).toLowerCase()))];
}

function keywordTokens(keywords) {
  if (Array.isArray(keywords)) {
    return [...new Set(keywords.map((k) => String(k).toLowerCase().trim()).filter(Boolean))];
  }
  if (typeof keywords === 'string' && keywords.trim()) {
    return [...new Set(keywords.toLowerCase().split(/[\s,]+/).filter(Boolean))];
  }
  return [];
}

/**
 * @param {object} params
 * @param {number | null | undefined} params.lat
 * @param {number | null | undefined} params.lng
 * @param {string} params.category
 * @param {string | string[]} params.keywords
 * @param {number} [params.radiusMiles]
 */
/** All registry category tokens for home-feed "all" filter (lodging only under STAY) */
export function allRegistryCategoryTerms() {
  return [
    ...new Set(
      Object.entries(CATEGORY_MAP)
        .filter(([k]) => k !== 'stay')
        .flatMap(([, v]) => v)
        .filter(Boolean)
    ),
  ];
}

export async function findLocalSellers({ lat, lng, category, keywords, radiusMiles = 50 }) {
  if (!pool) return [];

  const catKey = typeof category === 'string' ? category.trim().toLowerCase() : '';
  const categoryTerms =
    catKey === 'all' || catKey === ''
      ? allRegistryCategoryTerms()
      : normalizeCategoryTerms(category);
  if (!categoryTerms.length) return [];

  const kw = keywordTokens(keywords);

  const latN = Number(lat);
  const lngN = Number(lng);
  const hasUserGeo = Number.isFinite(latN) && Number.isFinite(lngN);
  const radiusDeg = radiusMiles / 69.0;

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        seller_name,
        tagline,
        description,
        product_description,
        website_url,
        etsy_url,
        instagram_url,
        other_url,
        other_url_label,
        city,
        state_province,
        country,
        lat,
        lng,
        ships_nationally,
        ships_worldwide,
        in_person_only,
        categories,
        keywords,
        verified,
        is_worker_owned,
        is_bcorp,
        is_fair_trade,
        certifications,
        CASE
          WHEN lat IS NOT NULL AND lng IS NOT NULL AND $1::float8 IS NOT NULL AND $2::float8 IS NOT NULL
          THEN ROUND(
            SQRT(
              POWER((lat::float8 - $1) * 69.0, 2) +
              POWER((lng::float8 - $2) * 69.0 * COS(RADIANS($1)), 2)
            )::numeric,
            1
          )
          ELSE NULL
        END AS distance_miles
      FROM seller_registry
      WHERE active = true
        AND (
          (
            $1::float8 IS NOT NULL AND $2::float8 IS NOT NULL
            AND lat IS NOT NULL AND lng IS NOT NULL
            AND lat::float8 BETWEEN ($1::float8 - $3::float8) AND ($1::float8 + $3::float8)
            AND lng::float8 BETWEEN ($2::float8 - $3::float8) AND ($2::float8 + $3::float8)
          )
          OR ships_nationally = true
          OR ships_worldwide = true
        )
        AND (
          categories && $4::text[]
          OR ($5::text[] <> '{}'::text[] AND keywords && $5::text[])
        )
      ORDER BY
        CASE
          WHEN lat IS NOT NULL AND lng IS NOT NULL AND $1::float8 IS NOT NULL AND $2::float8 IS NOT NULL
          THEN SQRT(
            POWER((lat::float8 - $1) * 69.0, 2) +
            POWER((lng::float8 - $2) * 69.0 * COS(RADIANS($1)), 2)
          )
          ELSE 999999
        END ASC,
        verified DESC,
        is_worker_owned DESC
      LIMIT 20
    `,
      [
        hasUserGeo ? latN : null,
        hasUserGeo ? lngN : null,
        radiusDeg,
        categoryTerms,
        kw.length ? kw : [],
      ]
    );

    return result.rows.map((row) => ({
      ...row,
      distance_miles:
        row.distance_miles != null ? Number(row.distance_miles) : null,
    }));
  } catch (err) {
    console.error('sellerRegistry error:', err.message);
    return [];
  }
}

function normalizeTextArray(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map((x) => String(x).toLowerCase().trim()).filter(Boolean))];
}

/**
 * @param {Record<string, unknown>} data
 */
export async function submitSeller(data) {
  if (!pool) throw new Error('Database not configured');

  const seller_name = typeof data.seller_name === 'string' ? data.seller_name.trim() : '';
  const categories = normalizeTextArray(data.categories);
  const keywords = normalizeTextArray(data.keywords);

  if (!seller_name) throw new Error('seller_name is required');
  if (!categories.length) throw new Error('at least one category is required');

  const description = typeof data.description === 'string' ? data.description.trim() || null : null;
  const tagline = typeof data.tagline === 'string' ? data.tagline.trim() || null : null;
  const product_description =
    typeof data.product_description === 'string' ? data.product_description.trim() || null : null;

  const row = await pool.query(
    `
    INSERT INTO seller_registry (
      seller_name, description, tagline,
      website_url, etsy_url, instagram_url, email, other_url, other_url_label,
      city, state_province, country, lat, lng,
      ships_nationally, ships_worldwide, in_person_only,
      categories, keywords, product_description,
      verified, active, submission_method,
      is_worker_owned, is_bcorp, is_fair_trade, certifications
    ) VALUES (
      $1, $2, $3,
      $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13, $14,
      $15, $16, $17,
      $18, $19, $20,
      false, true, $21,
      $22, $23, $24, $25
    )
    RETURNING id, seller_name, created_at
  `,
    [
      seller_name,
      description,
      tagline,
      typeof data.website_url === 'string' ? data.website_url.trim() || null : null,
      typeof data.etsy_url === 'string' ? data.etsy_url.trim() || null : null,
      typeof data.instagram_url === 'string' ? data.instagram_url.trim() || null : null,
      typeof data.email === 'string' ? data.email.trim() || null : null,
      typeof data.other_url === 'string' ? data.other_url.trim() || null : null,
      typeof data.other_url_label === 'string' ? data.other_url_label.trim() || null : null,
      typeof data.city === 'string' ? data.city.trim() || null : null,
      typeof data.state_province === 'string' ? data.state_province.trim() || null : null,
      typeof data.country === 'string' && data.country.trim() ? data.country.trim() : 'US',
      data.lat != null && data.lat !== '' ? Number(data.lat) : null,
      data.lng != null && data.lng !== '' ? Number(data.lng) : null,
      Boolean(data.ships_nationally),
      Boolean(data.ships_worldwide),
      Boolean(data.in_person_only),
      categories,
      keywords,
      product_description,
      typeof data.submission_method === 'string' ? data.submission_method : 'app',
      Boolean(data.is_worker_owned),
      Boolean(data.is_bcorp),
      Boolean(data.is_fair_trade),
      normalizeTextArray(data.certifications),
    ]
  );

  return row.rows[0];
}
