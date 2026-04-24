#!/usr/bin/env node
/**
 * Batch-populate the `investigations` table using `lib/auto_investigation.mjs` for every
 * `incumbent_profiles.brand_slug`. Separate from `corroborate_profiles.mjs` (Claude+Perplexity vs profile_json).
 *
 *   cd server && node db/populate_investigation_library.mjs
 *   cd server && node db/populate_investigation_library.mjs --limit 3 --delay 5000
 *
 * Requires: DATABASE_URL, migration `20260417_investigations_library.sql` applied.
 */
import '../env.js';
import { parseArgs } from 'node:util';
import { pool } from '../db/pool.js';
import { investigate } from '../lib/auto_investigation.mjs';

const { values: opts } = parseArgs({
  options: {
    limit: { type: 'string' },
    delay: { type: 'string', default: '30000' },
  },
  strict: true,
});

if (!pool) {
  console.error('DATABASE_URL is required (pool not configured)');
  process.exit(1);
}

const limit = opts.limit != null && String(opts.limit).trim() ? parseInt(String(opts.limit), 10) : null;
const delayMs = Math.max(0, parseInt(String(opts.delay || '30000'), 10) || 0);

async function main() {
  const r =
    limit != null && Number.isFinite(limit) && limit > 0
      ? await pool.query(
          'SELECT brand_slug FROM incumbent_profiles ORDER BY brand_slug ASC LIMIT $1',
          [Math.floor(limit)]
        )
      : await pool.query('SELECT brand_slug FROM incumbent_profiles ORDER BY brand_slug ASC');
  const profiles = r.rows;
  console.log(`Found ${profiles.length} incumbent slug(s) to process\n`);

  for (let i = 0; i < profiles.length; i++) {
    const { brand_slug: slug } = profiles[i];
    console.log(`\n[${i + 1}/${profiles.length}] === ${slug} ===`);
    try {
      await investigate(slug, { forceRefresh: false });
      console.log('✓ Complete');
    } catch (err) {
      console.error('✗ Failed:', err instanceof Error ? err.message : err);
    }
    if (i < profiles.length - 1 && delayMs > 0) {
      console.log(`   Waiting ${delayMs / 1000}s...`);
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }

  console.log('\n=== Library population run finished ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
