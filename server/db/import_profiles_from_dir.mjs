/**
 * Import hand-authored profile JSON from a folder under server/db/.
 *
 * Relational upsert matches batch 02/03 (verdict_tags, primary_sources, investigation_summary, full profile_json).
 *
 * Usage from repo root:
 *   DATABASE_URL=... node server/db/import_profiles_from_dir.mjs profiles_batch03
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

const rawArg = process.argv[2]?.trim();
if (!rawArg) {
  console.error('Usage: DATABASE_URL=... node server/db/import_profiles_from_dir.mjs <dirName>');
  console.error('  dirName: folder inside server/db (e.g. profiles_batch03, profiles_batch04)');
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

const dir = join(__dirname, dirName);
if (!existsSync(dir)) {
  console.error(`Directory not found: ${dir}`);
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
if (!files.length) {
  console.error(`No .json files in ${dir}`);
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

/** @param {Record<string, unknown>} rec */
function collectPrimarySources(rec) {
  const keys = [
    'tax',
    'legal',
    'labor',
    'environmental',
    'political',
    'executives',
    'connections',
    'allegations',
    'health_record',
  ];
  const urls = [];
  for (const k of keys) {
    const block = rec[k];
    if (block && typeof block === 'object' && Array.isArray(block.sources)) {
      urls.push(...block.sources.map(String));
    }
  }
  if (Array.isArray(rec.primary_sources)) urls.push(...rec.primary_sources.map(String));
  return [...new Set(urls.filter(Boolean))];
}

const sql = `
INSERT INTO incumbent_profiles (
  brand_name,
  brand_slug,
  parent_company,
  ultimate_parent,
  known_subsidiaries,
  profile_json,
  verdict_tags,
  overall_concern_level,
  primary_sources,
  investigation_summary,
  last_researched,
  research_confidence,
  profile_type
) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::text[], $8, $9, $10, CURRENT_DATE, $11, $12)
ON CONFLICT (brand_slug) DO UPDATE SET
  brand_name = EXCLUDED.brand_name,
  parent_company = EXCLUDED.parent_company,
  ultimate_parent = EXCLUDED.ultimate_parent,
  known_subsidiaries = EXCLUDED.known_subsidiaries,
  profile_json = EXCLUDED.profile_json,
  verdict_tags = EXCLUDED.verdict_tags,
  overall_concern_level = EXCLUDED.overall_concern_level,
  primary_sources = EXCLUDED.primary_sources,
  investigation_summary = EXCLUDED.investigation_summary,
  last_researched = EXCLUDED.last_researched,
  research_confidence = EXCLUDED.research_confidence,
  profile_type = EXCLUDED.profile_type,
  updated_at = now();
`;

async function main() {
  console.log(`Importing from ${dirName}/ (${files.length} files)\n`);
  for (const f of files.sort()) {
    const rec = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const slug = typeof rec.brand_slug === 'string' && rec.brand_slug ? rec.brand_slug : f.replace('.json', '');
    const name = typeof rec.brand_name === 'string' && rec.brand_name ? rec.brand_name : slug;
    const parent = typeof rec.parent_company === 'string' ? rec.parent_company : null;
    const ultimate = typeof rec.ultimate_parent === 'string' ? rec.ultimate_parent : parent;
    const summary =
      typeof rec.executive_summary === 'string' && rec.executive_summary.trim()
        ? rec.executive_summary.trim()
        : typeof rec.investigation_summary === 'string'
          ? rec.investigation_summary.trim()
          : null;

    const subs = Array.isArray(rec.subsidiaries) ? rec.subsidiaries.map(String).filter(Boolean) : null;
    const ptype = typeof rec.profile_type === 'string' && rec.profile_type.trim() ? rec.profile_type.trim() : 'database';

    await pool.query(sql, [
      name,
      slug,
      parent,
      ultimate,
      subs,
      JSON.stringify(rec),
      Array.isArray(rec.verdict_tags) ? rec.verdict_tags.map(String) : [],
      typeof rec.overall_concern_level === 'string' ? rec.overall_concern_level : 'unknown',
      collectPrimarySources(rec),
      summary,
      rec.research_confidence ?? 'high',
      ptype,
    ]);
    console.log('upserted', slug, '<-', f);
  }
  await pool.end();
  console.log(`\nDone. ${files.length} profiles upserted from ${dirName}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
