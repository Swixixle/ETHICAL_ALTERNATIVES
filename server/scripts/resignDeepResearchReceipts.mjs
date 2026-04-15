/**
 * Re-build and re-sign investigation receipts for every profile that has deep_research,
 * so stored receipt_json.incident_count matches computeReceiptIncidentCount (current signing logic).
 *
 * Usage (from server/):
 *   node scripts/resignDeepResearchReceipts.mjs
 *   node scripts/resignDeepResearchReceipts.mjs --dry-run
 *
 * Requires: DATABASE_URL, PERIMETER_ED25519_PKCS8_DER_B64 (same as POST /api/receipt/generate).
 */

import '../env.js';
import { pool } from '../db/pool.js';
import {
  buildReceiptPayloadFromProfileRow,
  signReceiptBody,
  getReceiptPublicKeyB64Url,
} from '../services/investigationReceipt.js';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  if (!pool) {
    console.error('No DATABASE_URL — cannot run.');
    process.exit(1);
  }
  if (!getReceiptPublicKeyB64Url()) {
    console.error('PERIMETER_ED25519_PKCS8_DER_B64 not configured — cannot sign.');
    process.exit(1);
  }

  const { rows } = await pool.query(`
    SELECT brand_slug, brand_name, parent_company, ultimate_parent, profile_json, overall_concern_level
    FROM incumbent_profiles
    WHERE profile_json IS NOT NULL
      AND profile_json->'deep_research' IS NOT NULL
      AND profile_json->'deep_research' <> 'null'::jsonb
      AND jsonb_typeof(profile_json->'deep_research') = 'object'
      AND jsonb_array_length(COALESCE(profile_json->'deep_research'->'per_category', '[]'::jsonb)) > 0
    ORDER BY brand_slug
  `);

  console.log(`Found ${rows.length} profile(s) with deep_research (per_category non-empty).`);
  if (dryRun) console.log('Dry run — no database writes.\n');

  let updated = 0;
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const slug = String(row.brand_slug || '').trim().toLowerCase();
    if (!slug) {
      skipped += 1;
      continue;
    }

    let profileJson = row.profile_json;
    if (typeof profileJson === 'string') {
      try {
        profileJson = JSON.parse(profileJson);
      } catch {
        console.error(`[skip] ${slug}: invalid profile_json string`);
        skipped += 1;
        continue;
      }
    }

    const built = buildReceiptPayloadFromProfileRow(profileJson, {
      slug: row.brand_slug || slug,
      brand_name: row.brand_name,
      ultimate_parent: row.ultimate_parent,
      parent_company: row.parent_company,
      overall_concern_level: row.overall_concern_level,
      data_source: 'deep_research+database',
    });

    if (!built.ok) {
      console.error(`[skip] ${slug}: build failed — ${built.error || 'unknown'}`);
      skipped += 1;
      continue;
    }

    const receiptBody = /** @type {Record<string, unknown>} */ (built.receiptBody);
    const incidentsHash = /** @type {string} */ (receiptBody.incidents_hash);
    const newCount = receiptBody.incident_count;

    const dup = await pool.query(
      `SELECT id, receipt_json->>'incident_count' AS old_count
       FROM investigation_receipts
       WHERE slug = $1 AND receipt_json->>'incidents_hash' = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [slug, incidentsHash]
    );

    if (dup.rows.length) {
      const existingId = String(dup.rows[0].id);
      const oldCount = dup.rows[0].old_count;
      receiptBody.receipt_id = existingId;
      receiptBody.generated_at = new Date().toISOString();

      const signature = signReceiptBody(receiptBody);
      if (!signature) {
        console.error(`[fail] ${slug}: signReceiptBody returned null`);
        failed += 1;
        continue;
      }

      if (dryRun) {
        console.log(
          `[would update] ${slug} receipt ${existingId.slice(0, 8)}… incident_count ${oldCount} → ${newCount}`
        );
        updated += 1;
        continue;
      }

      await pool.query(
        `UPDATE investigation_receipts SET receipt_json = $2::jsonb, signature = $3 WHERE id = $1::uuid`,
        [existingId, JSON.stringify(receiptBody), signature]
      );
      console.log(
        `[updated] ${slug} receipt ${existingId.slice(0, 8)}… incident_count ${oldCount} → ${newCount}`
      );
      updated += 1;
    } else {
      const signature = signReceiptBody(receiptBody);
      if (!signature) {
        console.error(`[fail] ${slug}: signReceiptBody returned null`);
        failed += 1;
        continue;
      }

      if (dryRun) {
        console.log(`[would insert] ${slug} new receipt incident_count=${newCount}`);
        inserted += 1;
        continue;
      }

      await pool.query(
        `INSERT INTO investigation_receipts (id, slug, receipt_json, signature)
         VALUES ($1::uuid, $2, $3::jsonb, $4)`,
        [receiptBody.receipt_id, slug, JSON.stringify(receiptBody), signature]
      );
      console.log(`[inserted] ${slug} receipt ${String(receiptBody.receipt_id).slice(0, 8)}… incident_count=${newCount}`);
      inserted += 1;
    }
  }

  console.log('\nDone.', { updated, inserted, skipped, failed, dryRun });
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
