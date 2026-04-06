/**
 * Bulk import: legacy volumes (profiles_v3 … v13) with a minimal column upsert,
 * then hand-authored batches (profiles_batch02 …) with the full relational upsert.
 *
 * Hand-authored folder list: profileBatchManifest.mjs (keep in sync with
 * docs/MASTER_COMPANY_TRACKING.md).
 *
 * For a single batch only:
 *   DATABASE_URL=... node server/db/import_profiles_from_dir.mjs profiles_batch05
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { HAND_AUTHORED_PROFILE_BATCH_DIRS } from './profileBatchManifest.mjs';
import { importHandAuthoredProfilesFromDir } from './handAuthoredProfileImport.mjs';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function importLegacyBatch(batchDir) {
  if (!existsSync(batchDir)) {
    console.log(`Skipping ${batchDir}`);
    return 0;
  }
  const files = readdirSync(batchDir).filter((f) => f.endsWith('.json'));
  let count = 0;
  for (const file of files) {
    const slug = file.replace('.json', '');
    const profile = JSON.parse(readFileSync(join(batchDir, file), 'utf8'));
    await pool.query(
      `INSERT INTO incumbent_profiles (brand_slug, brand_name, parent_company, ultimate_parent, overall_concern_level, profile_type, profile_json) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (brand_slug) DO UPDATE SET brand_name=EXCLUDED.brand_name, parent_company=EXCLUDED.parent_company, ultimate_parent=EXCLUDED.ultimate_parent, overall_concern_level=EXCLUDED.overall_concern_level, profile_type=EXCLUDED.profile_type, profile_json=EXCLUDED.profile_json, updated_at=NOW()`,
      [
        slug,
        profile.brand_name,
        profile.parent_company,
        profile.ultimate_parent,
        profile.overall_concern_level,
        profile.profile_type || 'database',
        JSON.stringify(profile),
      ]
    );
    console.log(`  ✓ ${slug}`);
    count++;
  }
  return count;
}

async function main() {
  let total = 0;
  for (const batch of [
    'profiles_v3',
    'profiles_v4',
    'profiles_v5',
    'profiles_v6',
    'profiles_v7',
    'profiles_v8',
    'profiles_v9',
    'profiles_v10',
    'profiles_v11',
    'profiles_v12',
    'profiles_v13',
  ]) {
    console.log(`\nImporting ${batch}...`);
    total += await importLegacyBatch(join(__dirname, batch));
  }

  console.log('\n--- Hand-authored batches (full relational upsert) ---');
  for (const batch of HAND_AUTHORED_PROFILE_BATCH_DIRS) {
    if (!existsSync(join(__dirname, batch))) {
      console.log(`\nSkipping ${batch} (directory not present)`);
      continue;
    }
    console.log(`\nImporting ${batch}...`);
    const n = await importHandAuthoredProfilesFromDir(pool, batch, __dirname);
    total += n;
  }

  console.log(`\nDone. ${total} profiles upserted total.`);
  console.log('\nSingle batch: DATABASE_URL=... node server/db/import_profiles_from_dir.mjs <dirName>');
  await pool.end();
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
