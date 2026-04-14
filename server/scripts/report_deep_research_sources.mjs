#!/usr/bin/env node
/**
 * Print unique source_url values from profile_json.deep_research for a slug (prod/staging diagnostic).
 *
 * Usage (from repo root, with DATABASE_URL in .env):
 *   node server/scripts/report_deep_research_sources.mjs nike
 */
import 'dotenv/config';
import pg from 'pg';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const slug = (process.argv[2] || 'nike').trim().toLowerCase();
const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;

function collectUrls(dr) {
  /** @type {Set<string>} */
  const urls = new Set();
  if (!dr || typeof dr !== 'object') return urls;

  const top = Array.isArray(dr.incidents) ? dr.incidents : [];
  for (const inc of top) {
    if (inc && typeof inc === 'object' && typeof inc.source_url === 'string' && inc.source_url.trim()) {
      urls.add(inc.source_url.trim());
    }
  }

  const per = Array.isArray(dr.per_category) ? dr.per_category : [];
  for (const cat of per) {
    if (!cat || typeof cat !== 'object') continue;
    const incs = Array.isArray(cat.incidents) ? cat.incidents : [];
    for (const inc of incs) {
      if (inc && typeof inc === 'object' && typeof inc.source_url === 'string' && inc.source_url.trim()) {
        urls.add(inc.source_url.trim());
      }
    }
    const cites = Array.isArray(cat.perplexity_citations) ? cat.perplexity_citations : [];
    for (const c of cites) {
      if (c && typeof c === 'object' && typeof c.url === 'string' && c.url.trim()) {
        urls.add(c.url.trim());
      }
    }
  }
  return urls;
}

async function main() {
  if (!pool) {
    console.error('DATABASE_URL is not set; cannot query. Export profile_json for this slug and use jq locally.');
    process.exit(1);
  }
  try {
    const { rows } = await pool.query(
      `SELECT brand_slug, brand_name, profile_json->'deep_research' AS deep_research
       FROM incumbent_profiles
       WHERE brand_slug = $1
       LIMIT 1`,
      [slug]
    );
    const row = rows[0];
    if (!row) {
      console.error(`No row for brand_slug=${slug}`);
      process.exit(2);
    }
    const dr =
      row.deep_research && typeof row.deep_research === 'object'
        ? row.deep_research
        : JSON.parse(JSON.stringify(row.deep_research || {}));

    console.log(`--- ${row.brand_name || slug} (${row.brand_slug}) deep_research diagnostic ---\n`);

    const merged = Array.isArray(dr.incidents) ? dr.incidents : [];
    console.log(`Merged deep_research.incidents: ${merged.length}`);
    const fromMerged = new Set();
    for (const inc of merged) {
      if (inc?.source_url && String(inc.source_url).trim()) fromMerged.add(String(inc.source_url).trim());
    }
    console.log(`Unique source_url on merged incidents: ${fromMerged.size}`);
    [...fromMerged].sort().forEach((u) => console.log(`  ${u}`));

    const per = Array.isArray(dr.per_category) ? dr.per_category : [];
    console.log(`\nper_category entries: ${per.length}`);
    for (const cat of per) {
      if (!cat || typeof cat !== 'object') continue;
      const key = typeof cat.category === 'string' ? cat.category : '?';
      const incs = Array.isArray(cat.incidents) ? cat.incidents : [];
      const cites = Array.isArray(cat.perplexity_citations) ? cat.perplexity_citations : [];
      const incUrls = new Set();
      for (const inc of incs) {
        if (inc?.source_url && String(inc.source_url).trim()) incUrls.add(String(inc.source_url).trim());
      }
      console.log(`\n[${key}] incidents=${incs.length} unique incident source_url=${incUrls.size} perplexity_citations=${cites.length}`);
      [...incUrls].sort().forEach((u) => console.log(`  incident: ${u}`));
      const citeUrls = cites
        .map((c) => (c && typeof c.url === 'string' ? c.url.trim() : ''))
        .filter(Boolean);
      const sortedCites = [...new Set(citeUrls)].sort();
      if (sortedCites.length) {
        console.log(`  Perplexity citation URLs (sample up to 40 of ${sortedCites.length}):`);
        sortedCites.slice(0, 40).forEach((u) => console.log(`    ${u}`));
        if (sortedCites.length > 40) console.log(`    … ${sortedCites.length - 40} more`);
      } else {
        console.log(`  (no perplexity_citations stored — profile predates audit field or empty run)`);
      }
    }

    const all = collectUrls(dr);
    console.log(`\n--- All unique URLs (incidents + perplexity_citations): ${all.size} ---`);
    [...all].sort().forEach((u) => console.log(u));
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
