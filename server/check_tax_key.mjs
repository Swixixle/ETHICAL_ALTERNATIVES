import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query(
  "SELECT profile_json FROM incumbent_profiles WHERE brand_slug = 'unitedhealth' LIMIT 1"
);
const p = typeof rows[0].profile_json === 'string' ? JSON.parse(rows[0].profile_json) : rows[0].profile_json;

console.log('tax key type:', typeof p.tax);
console.log('tax key:', p.tax);
console.log('\nlabor key type:', typeof p.labor);
console.log('labor preview:', JSON.stringify(p.labor)?.slice(0, 200));
console.log('\nlegal key type:', typeof p.legal);
console.log('legal preview:', JSON.stringify(p.legal)?.slice(0, 200));

console.log('\n\nDeep research TAX category:');
const taxCat = p.deep_research?.per_category?.find(c => c.category === 'tax' || c.category === 'tax_and_financial');
if (taxCat) {
  console.log('Found tax category:', taxCat.category);
  console.log('Incidents:', taxCat.incidents?.length);
  console.log('First incident:', JSON.stringify(taxCat.incidents?.[0])?.slice(0, 300));
}

await pool.end();
