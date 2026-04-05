/**
 * Loads nested JSON from server/db/profiles_v11/*.json (sweepstakes / social casino operators).
 * Same upsert pattern as import_profiles_v10.mjs.
 *
 * Usage from repo root: DATABASE_URL=... node server/db/import_profiles_v11.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, 'profiles_v11');

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL');
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

/** @param {Record<string, unknown>} rec */
function collectPrimarySources(rec) {
  const keys = ['tax', 'legal', 'labor', 'environmental', 'political', 'executives', 'connections', 'allegations', 'health_record'];
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
  research_confidence
) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::text[], $8, $9, $10, CURRENT_DATE, $11)
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
  updated_at = now();
`;

async function main() {
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
    ]);
    console.log('upserted', slug, '<-', f);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
