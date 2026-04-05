import { pool } from '../db/pool.js';

/**
 * After a civic witness row is inserted, recompute witness counts for any workers
 * matching that display name + city (case-insensitive trim).
 * @param {string} displayName
 * @param {string | null | undefined} city
 */
export async function refreshWorkerCivicStatsForWitness(displayName, city) {
  if (!pool) return;
  const dn = String(displayName || '').trim();
  const ct = String(city || '').trim();
  if (!dn || !ct) return;

  try {
    await pool.query(
      `UPDATE local_workers w SET
         civic_witness_count = sub.c,
         is_civic_verified = sub.c >= 2
       FROM (
         SELECT w0.id AS id,
           (
             SELECT COUNT(*)::int
             FROM civic_witnesses cw
             WHERE cw.is_public = TRUE
               AND LOWER(TRIM(cw.display_name)) = LOWER(TRIM(w0.display_name))
               AND LOWER(TRIM(COALESCE(cw.city, ''))) = LOWER(TRIM(w0.city))
           ) AS c
         FROM local_workers w0
         WHERE LOWER(TRIM(w0.display_name)) = LOWER(TRIM($1))
           AND LOWER(TRIM(w0.city)) = LOWER(TRIM($2))
       ) sub
       WHERE w.id = sub.id`,
      [dn, ct]
    );
  } catch (e) {
    console.warn('[workerCivicSync] refresh failed', e?.message || e);
  }
}
