/**
 * Imports USDA National Farmers Market Directory CSV into farmers_markets.
 *
 * Download CSV from https://www.ams.usda.gov/local-food-directories/farmersmarkets
 * (export / data download when available), then:
 *
 *   DATABASE_URL=... node db/import_farmers_markets.mjs ./path/to/farmersmarketdirectory.csv
 *
 * Or set FARMERS_MARKET_CSV_PATH and run without args.
 */
import { createReadStream } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import readline from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL');
  process.exit(1);
}

const csvPath = resolve(
  process.argv[2] || process.env.FARMERS_MARKET_CSV_PATH || ''
);

if (!csvPath) passUsage();

function passUsage() {
  console.error(
    'Usage: node db/import_farmers_markets.mjs <file.csv>\n' +
      '   or: FARMERS_MARKET_CSV_PATH=... node db/import_farmers_markets.mjs'
  );
  process.exit(1);
}

/** @param {string} line */
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
      continue;
    }
    if (c === ',' && !inQ) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** @param {Record<string, string>} row @param {string[]} keys */
function firstVal(row, keys) {
  for (const k of keys) {
    const lk = k.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(row, lk) && row[lk] !== '') {
      return row[lk];
    }
  }
  return '';
}

const PRODUCT_KEYS = [
  'Organic',
  'Bakedgoods',
  'Cheese',
  'Crafts',
  'Flowers',
  'Eggs',
  'Seafood',
  'Herbs',
  'Vegetables',
  'Honey',
  'Jams',
  'Maple',
  'Meat',
  'Nursery',
  'Nuts',
  'Plants',
  'Poultry',
  'Prepared',
  'Soap',
  'Trees',
  'Wine',
  'Coffee',
  'Beans',
  'Fruits',
  'Grains',
  'Juices',
  'Mushrooms',
  'PetFood',
  'Tofu',
  'WildHarvested',
];

function buildSchedule(row) {
  const parts = [];
  for (let n = 1; n <= 4; n++) {
    const d = firstVal(row, [`Season${n}Date`, `season${n}date`]);
    const t = firstVal(row, [`Season${n}Time`, `season${n}time`]);
    const chunk = [d, t].filter(Boolean).join(' · ');
    if (chunk) parts.push(chunk);
  }
  return parts.join(' · ') || null;
}

function buildProducts(row) {
  const yes = [];
  for (const k of PRODUCT_KEYS) {
    const lk = k.toLowerCase();
    const v = row[lk];
    if (v && String(v).toUpperCase() === 'Y') yes.push(k);
  }
  return yes.length ? yes.join(', ') : null;
}

/**
 * @param {Record<string, string>} row
 * @returns {{ lat: number | null; lng: number | null }}
 */
function pickLatLng(row) {
  const y = firstVal(row, ['y', 'lat', 'latitude', 'location_y']);
  const x = firstVal(row, ['x', 'lng', 'lon', 'long', 'longitude', 'location_x']);
  let lat = y ? Number(y) : NaN;
  let lng = x ? Number(x) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { lat: null, lng: null };
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { lat: null, lng: null };
  }
  // Rare mis-labeled columns: US rows should have positive lat and negative lng
  if (lat < 0 && lng > 0 && Math.abs(lat) > 55) {
    const t = lat;
    lat = lng;
    lng = t;
  }
  return { lat, lng };
}

async function readFirstLine(path) {
  const rl = readline.createInterface({
    input: createReadStream(path, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  try {
    for await (const line of rl) {
      return line;
    }
  } finally {
    rl.close();
  }
  return '';
}

async function main() {
  let headerLine = '';
  try {
    headerLine = await readFirstLine(csvPath);
  } catch (e) {
    console.error('Cannot read', csvPath, e?.message || e);
    process.exit(1);
  }
  if (!headerLine || !headerLine.trim()) {
    console.error('Empty CSV');
    process.exit(1);
  }

  const headerCells = parseCsvLine(headerLine).map((h) => h.replace(/^\ufeff/, '').trim());
  const normHeaders = headerCells.map((h) => h.toLowerCase().replace(/\s+/g, '_'));

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const sql = `
    INSERT INTO farmers_markets (
      source_fmid, market_name, street, city, state, zip,
      lat, lng, schedule, products, website
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (source_fmid) DO UPDATE SET
      market_name = EXCLUDED.market_name,
      street = EXCLUDED.street,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      zip = EXCLUDED.zip,
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      schedule = EXCLUDED.schedule,
      products = EXCLUDED.products,
      website = EXCLUDED.website,
      updated_at = now();
  `;

  let n = 0;
  const rl = readline.createInterface({
    input: createReadStream(csvPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let lineNo = 0;
  for await (const line of rl) {
    lineNo++;
    if (lineNo === 1) continue;
    if (!line.trim()) continue;

    const cells = parseCsvLine(line);
    if (cells.length < 2) continue;

    /** @type {Record<string, string>} */
    const row = {};
    for (let i = 0; i < normHeaders.length; i++) {
      row[normHeaders[i]] = cells[i] != null ? String(cells[i]).trim() : '';
    }

    const fmid =
      firstVal(row, ['fmid', 'fm_id', 'market_id', 'id']) ||
      firstVal(row, ['listing_id']);
    if (!fmid) continue;

    const marketName = firstVal(row, ['marketname', 'market_name', 'name']);
    if (!marketName) continue;

    const street = firstVal(row, ['street', 'address', 'street_address']);
    const city = firstVal(row, ['city', 'town']);
    const state = firstVal(row, ['state', 'st', 'state_code']);
    const zip = firstVal(row, ['zip', 'zipcode', 'postal_code']);
    const website = firstVal(row, ['website', 'web', 'url']);
    const { lat, lng } = pickLatLng(row);
    if (lat == null) continue;

    const schedule = buildSchedule(row);
    const products = buildProducts(row);

    await pool.query(sql, [
      fmid,
      marketName,
      street || null,
      city || null,
      state || null,
      zip || null,
      lat,
      lng,
      schedule,
      products,
      website || null,
    ]);
    n++;
    if (n % 500 === 0) console.error('imported', n);
  }

  await pool.end();
  console.log('Upserted farmers_markets rows:', n, 'from', csvPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
