import { pool } from '../db/pool.js';

let cache = { needles: [], at: 0 };
const TTL_MS = 5 * 60 * 1000;

/**
 * Lowercase substrings from investigation DB brands (cached).
 * Used with nameMatchesChain to exclude known corporate brands from the independent feed.
 */
export async function getIncumbentBrandNeedles() {
  if (!pool) return [];

  const now = Date.now();
  if (cache.needles.length && now - cache.at < TTL_MS) {
    return cache.needles;
  }

  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT lower(trim(brand_name)) AS n
      FROM incumbent_profiles
      WHERE brand_name IS NOT NULL AND length(trim(brand_name)) >= 3
      UNION
      SELECT DISTINCT lower(trim(parent_company))
      FROM incumbent_profiles
      WHERE parent_company IS NOT NULL AND length(trim(parent_company)) >= 4
      UNION
      SELECT DISTINCT lower(trim(ultimate_parent))
      FROM incumbent_profiles
      WHERE ultimate_parent IS NOT NULL AND length(trim(ultimate_parent)) >= 4
      UNION
      SELECT DISTINCT lower(trim(replace(brand_slug, '-', ' ')))
      FROM incumbent_profiles
      WHERE brand_slug IS NOT NULL AND length(trim(brand_slug)) >= 3
    `);

    const needles = [...new Set(rows.map((r) => r.n).filter(Boolean))];
    cache = { needles, at: now };
    return needles;
  } catch (e) {
    console.error('getIncumbentBrandNeedles:', e?.message || e);
    return cache.needles.length ? cache.needles : [];
  }
}
