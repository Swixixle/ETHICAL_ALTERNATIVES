/**
 * Import hand-authored profile JSON from a folder under server/db/.
 *
 * Relational upsert matches batch 02/03 (verdict_tags, primary_sources, investigation_summary, full profile_json).
 * Shared implementation: handAuthoredProfileImport.mjs
 * Canonical list of batch folders: profileBatchManifest.mjs
 *
 * Usage from repo root:
 *   DATABASE_URL=... node server/db/import_profiles_from_dir.mjs profiles_batch03
 */
import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { importHandAuthoredProfilesFromDir } from './handAuthoredProfileImport.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const rawArg = process.argv[2]?.trim();
if (!rawArg) {
  console.error('Usage: DATABASE_URL=... node server/db/import_profiles_from_dir.mjs <dirName>');
  console.error('  dirName: folder inside server/db (e.g. profiles_batch03, profiles_batch04)');
  console.error('  See profileBatchManifest.mjs for the canonical batch folder list.');
  process.exit(1);
}

const dirName = basename(rawArg.replace(/[/\\]+$/, ''));
if (!dirName || dirName === '.' || dirName === '..' || rawArg.includes('..')) {
  console.error('Invalid directory name. Use a single folder name under server/db (no path traversal).');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL');
  process.exit(1);
}

const targetDir = join(__dirname, dirName);
if (!existsSync(targetDir)) {
  console.error(`Directory not found: ${targetDir}`);
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

async function main() {
  console.log(`Importing from ${dirName}/\n`);
  const n = await importHandAuthoredProfilesFromDir(pool, dirName, __dirname);
  await pool.end();
  if (n === 0) {
    console.error(`No profiles imported from ${dirName}/`);
    process.exit(1);
  }
  console.log(`\nDone. ${n} profiles upserted from ${dirName}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
