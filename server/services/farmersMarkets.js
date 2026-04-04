import { pool } from '../db/pool.js';

/**
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusMiles
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function queryFarmersMarketsNear(lat, lng, radiusMiles = 50) {
  if (!pool) return [];

  const latN = Number(lat);
  const lngN = Number(lng);
  if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return [];

  const radiusDeg = radiusMiles / 69.0;

  try {
    const result = await pool.query(
      `
      SELECT
        source_fmid,
        market_name,
        street,
        city,
        state,
        zip,
        lat,
        lng,
        schedule,
        products,
        website,
        CASE
          WHEN lat IS NOT NULL AND lng IS NOT NULL
          THEN ROUND(
            SQRT(
              POWER((lat::float8 - $1) * 69.0, 2) +
              POWER((lng::float8 - $2) * 69.0 * COS(RADIANS($1)), 2)
            )::numeric,
            1
          )
          ELSE NULL
        END AS distance_miles
      FROM farmers_markets
      WHERE lat IS NOT NULL AND lng IS NOT NULL
        AND lat::float8 BETWEEN ($1::float8 - $3::float8) AND ($1::float8 + $3::float8)
        AND lng::float8 BETWEEN ($2::float8 - $3::float8) AND ($2::float8 + $3::float8)
        AND SQRT(
          POWER((lat::float8 - $1) * 69.0, 2) +
          POWER((lng::float8 - $2) * 69.0 * COS(RADIANS($1)), 2)
        ) <= $4
      ORDER BY distance_miles ASC NULLS LAST
      LIMIT 15
      `,
      [latN, lngN, radiusDeg, radiusMiles]
    );

    return result.rows.map((row) => ({
      ...row,
      distance_miles: row.distance_miles != null ? Number(row.distance_miles) : null,
    }));
  } catch (err) {
    console.error('farmersMarkets query:', err.message);
    return [];
  }
}
