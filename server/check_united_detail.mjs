import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query(
  "SELECT profile_json FROM incumbent_profiles WHERE brand_slug = 'unitedhealth' LIMIT 1"
);
const p = typeof rows[0].profile_json === 'string' ? JSON.parse(rows[0].profile_json) : rows[0].profile_json;

console.log('Keys in profile_json:', Object.keys(p));
console.log('\nHas deep_research:', !!p.deep_research);
if (p.deep_research) {
  console.log('Keys in deep_research:', Object.keys(p.deep_research));
  console.log('\nper_category length:', p.deep_research.per_category?.length);
  if (p.deep_research.per_category?.[0]) {
    console.log('First category:', p.deep_research.per_category[0].category);
    console.log('First category keys:', Object.keys(p.deep_research.per_category[0]));
  }
}

console.log('\ntax_summary:', p.tax_summary);
console.log('legal_summary:', p.legal_summary?.slice(0, 100));

await pool.end();
