import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query(
  "SELECT brand_slug, last_researched, profile_json FROM incumbent_profiles WHERE brand_slug LIKE '%united%' OR brand_slug LIKE '%health%' LIMIT 5"
);
for (const row of rows) {
  console.log('Slug:', row.brand_slug);
  console.log('Last researched:', row.last_researched);
  const p = typeof row.profile_json === 'string' ? JSON.parse(row.profile_json) : row.profile_json;
  console.log('Has deep_research:', !!p?.deep_research);
  console.log('Has tax_summary:', !!p?.tax_summary);
  console.log('Tax summary preview:', p?.tax_summary?.slice(0, 100));
  console.log('---');
}
await pool.end();
