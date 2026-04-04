import { pool } from '../db/pool.js';
import { resolveIncumbentSlug } from './investigation.js';

/**
 * Fast DB snippet for progressive loading (verdict tags, concern, community_impact from profile_json).
 * @param {string | null | undefined} brandName
 * @param {string | null | undefined} corporateParent
 */
export async function getIncumbentDbPreview(brandName, corporateParent) {
  if (!pool) return null;
  const slug = resolveIncumbentSlug(brandName, corporateParent);
  if (!slug) return null;

  try {
    const { rows } = await pool.query(
      `SELECT brand_slug, brand_name, verdict_tags, overall_concern_level, profile_json
       FROM incumbent_profiles
       WHERE brand_slug = $1
       LIMIT 1`,
      [slug]
    );
    const row = rows[0];
    if (!row) return null;

    let community_impact = null;
    const pj = row.profile_json;
    if (pj && typeof pj === 'object' && !Array.isArray(pj) && pj.community_impact) {
      community_impact =
        typeof pj.community_impact === 'object' && pj.community_impact !== null
          ? pj.community_impact
          : null;
    } else if (typeof pj === 'string') {
      try {
        const parsed = JSON.parse(pj);
        const ci = parsed?.community_impact;
        community_impact = ci && typeof ci === 'object' ? ci : null;
      } catch {
        /* ignore */
      }
    }

    return {
      brand_slug: row.brand_slug ? String(row.brand_slug) : slug,
      brand_name: row.brand_name ? String(row.brand_name) : String(brandName || corporateParent || ''),
      verdict_tags: Array.isArray(row.verdict_tags) ? row.verdict_tags.map(String) : [],
      overall_concern_level: row.overall_concern_level ? String(row.overall_concern_level) : null,
      community_impact,
    };
  } catch (e) {
    console.error('[incumbentPreview]', e?.message || e);
    return null;
  }
}
