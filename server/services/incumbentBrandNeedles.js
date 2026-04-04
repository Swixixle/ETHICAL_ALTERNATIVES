import { pool } from '../db/pool.js';
import { brandSlugForMatch, foldAccentsForMatch } from '../utils/chainMatch.js';

let cache = { needles: [], at: 0 };
let matchCache = { data: /** @type {{ slugs: Set<string>; compareNames: string[] } | null} */ (null), at: 0 };
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
      UNION SELECT DISTINCT lower(trim(replace(brand_slug, '-', ' ')))
      FROM incumbent_profiles
      WHERE brand_slug IS NOT NULL AND length(trim(brand_slug)) >= 3
      UNION
      SELECT DISTINCT lower(trim(s.n))
      FROM incumbent_profiles,
           LATERAL unnest(COALESCE(known_subsidiaries, ARRAY[]::text[])) AS s(n)
      WHERE s.n IS NOT NULL AND length(trim(s.n)) >= 3
    `);

    const needles = [...new Set(rows.map((r) => r.n).filter(Boolean))];
    cache = { needles, at: now };
    return needles;
  } catch (e) {
    console.error('getIncumbentBrandNeedles:', e?.message || e);
    return cache.needles.length ? cache.needles : [];
  }
}

/**
 * Data for strict incumbent matching: exact `brand_slug` / slugified subsidiaries only, plus
 * ≥80% name similarity in {@link nameMatchesIncumbentProfiles} — no substring needle list.
 */
export async function getIncumbentProfilesMatchData() {
  if (!pool) return { slugs: new Set(), compareNames: [] };

  const now = Date.now();
  if (matchCache.data && now - matchCache.at < TTL_MS) {
    return matchCache.data;
  }

  try {
    const { rows } = await pool.query(`
      SELECT brand_slug,
             brand_name,
             parent_company,
             ultimate_parent,
             known_subsidiaries
      FROM incumbent_profiles
    `);

    const slugs = new Set();
    const nameSet = new Set();

    const pushCompare = (raw) => {
      const t = foldAccentsForMatch(raw);
      if (t.length >= 4) nameSet.add(t);
    };

    for (const r of rows) {
      if (r.brand_slug) {
        const raw = String(r.brand_slug).toLowerCase().trim();
        if (raw) slugs.add(raw);
      }
      if (r.brand_name) {
        pushCompare(r.brand_name);
        const fromName = brandSlugForMatch(r.brand_name);
        if (fromName) slugs.add(fromName);
      }
      pushCompare(r.parent_company);
      pushCompare(r.ultimate_parent);

      const subs = r.known_subsidiaries;
      if (Array.isArray(subs)) {
        for (const sub of subs) {
          if (sub == null || sub === '') continue;
          pushCompare(sub);
          const subSlug = brandSlugForMatch(sub);
          if (subSlug) slugs.add(subSlug);
        }
      }
    }

    const data = { slugs, compareNames: [...nameSet] };
    matchCache = { data, at: now };
    return data;
  } catch (e) {
    console.error('getIncumbentProfilesMatchData:', e?.message || e);
    const fallback = matchCache.data || { slugs: new Set(), compareNames: [] };
    return fallback;
  }
}
