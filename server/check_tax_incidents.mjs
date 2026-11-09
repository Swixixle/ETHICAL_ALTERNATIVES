import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query(
  "SELECT profile_json FROM incumbent_profiles WHERE brand_slug = 'unitedhealth' LIMIT 1"
);
const p = typeof rows[0].profile_json === 'string' ? JSON.parse(rows[0].profile_json) : rows[0].profile_json;

const taxCat = p.deep_research?.per_category?.find(c => c.category === 'tax_and_financial');
console.log('Tax category found:', !!taxCat);
if (taxCat) {
  console.log('Incidents:', taxCat.incidents?.length || 0);
  console.log('Total found:', taxCat.total_found);
}

console.log('\nOriginal tax.summary:', p.tax?.summary);
console.log('\nAfter flatten would be tax_summary:', p.tax?.summary);

await pool.end();
