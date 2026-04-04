/**
 * Loads JSON files from server/db/profiles_v1/*.json into incumbent_profiles (profile_json).
 * Usage from server/: DATABASE_URL=... node db/import_profiles_v1.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, 'profiles_v1');

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL');
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

const sql = `
INSERT INTO incumbent_profiles (
  brand_name,
  brand_slug,
  profile_json,
  verdict_tags,
  overall_concern_level,
  primary_sources,
  investigation_summary,
  last_researched,
  research_confidence
) VALUES ($1, $2, $3::jsonb, $4::text[], $5, $6::text[], $7, CURRENT_DATE, $8)
ON CONFLICT (brand_slug) DO UPDATE SET
  brand_name = EXCLUDED.brand_name,
  profile_json = EXCLUDED.profile_json,
  verdict_tags = EXCLUDED.verdict_tags,
  overall_concern_level = EXCLUDED.overall_concern_level,
  primary_sources = EXCLUDED.primary_sources,
  investigation_summary = EXCLUDED.investigation_summary,
  last_researched = EXCLUDED.last_researched,
  research_confidence = EXCLUDED.research_confidence,
  updated_at = now();
`;

async function main() {
  for (const f of files.sort()) {
    const rec = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    await pool.query(sql, [
      rec.brand_name,
      rec.brand_slug,
      JSON.stringify(rec.profile),
      rec.verdict_tags,
      rec.overall_concern_level,
      rec.primary_sources,
      rec.investigation_summary ?? null,
      rec.research_confidence ?? 'high',
    ]);
    console.log('upserted', rec.brand_slug, '<-', f);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
