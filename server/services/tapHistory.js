import { pool } from '../db/pool.js';
import { resolveIncumbentSlug } from './investigation.js';

/**
 * Persist a completed investigation without blocking the HTTP response.
 * @param {{
 *   session_id?: string | null;
 *   identification: Record<string, unknown> | null;
 *   investigation: Record<string, unknown> | null;
 *   user_lat?: number | null;
 *   user_lng?: number | null;
 *   city?: string | null;
 * }} payload
 */
export function saveTapHistoryAsync(payload) {
  if (!pool) return;

  const { session_id, identification, investigation, user_lat, user_lng, city } = payload;
  const id = identification && typeof identification === 'object' ? identification : null;
  const inv = investigation && typeof investigation === 'object' ? investigation : null;

  const brand_name =
    (id?.brand != null && String(id.brand)) || (inv?.brand != null && String(inv.brand)) || null;
  const corporate_parent =
    id?.corporate_parent != null ? String(id.corporate_parent) : inv?.parent != null ? String(inv.parent) : null;

  const slug = resolveIncumbentSlug(brand_name, corporate_parent);
  const object_name = id?.object != null ? String(id.object) : null;

  const invForJson = inv;
  const headline =
    invForJson?.generated_headline != null ? String(invForJson.generated_headline) : null;
  const concern =
    invForJson?.overall_concern_level != null ? String(invForJson.overall_concern_level) : null;
  const tags = Array.isArray(invForJson?.verdict_tags)
    ? invForJson.verdict_tags.map(String)
    : null;

  void pool
    .query(
      `INSERT INTO tap_history (
        session_id, brand_name, brand_slug, object_name, generated_headline,
        overall_concern_level, verdict_tags, investigation_json, identification_json,
        user_lat, user_lng, city
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        session_id ? String(session_id) : null,
        brand_name,
        slug || null,
        object_name,
        headline,
        concern,
        tags,
        invForJson ? JSON.stringify(invForJson) : null,
        id ? JSON.stringify(id) : null,
        user_lat != null && Number.isFinite(Number(user_lat)) ? Number(user_lat) : null,
        user_lng != null && Number.isFinite(Number(user_lng)) ? Number(user_lng) : null,
        city ? String(city) : null,
      ]
    )
    .catch((e) => console.error('[tap_history] insert', e?.message || e));
}
