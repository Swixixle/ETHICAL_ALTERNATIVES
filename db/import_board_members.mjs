import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS board_members (
      id SERIAL PRIMARY KEY,
      brand_slug TEXT NOT NULL,
      person_slug TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT,
      tenure_start TEXT,
      tenure_end TEXT,
      is_current BOOLEAN DEFAULT false,
      committees JSONB DEFAULT '[]',
      present_during JSONB DEFAULT '[]',
      departure_reason TEXT,
      departure_context TEXT,
      revolving_door BOOLEAN DEFAULT false,
      revolving_door_note TEXT,
      other_boards JSONB DEFAULT '[]',
      prior_government BOOLEAN DEFAULT false,
      notes TEXT,
      sources JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(brand_slug, person_slug, tenure_start)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS board_connections (
      id SERIAL PRIMARY KEY,
      person_slug TEXT NOT NULL,
      brand_slug_a TEXT NOT NULL,
      brand_slug_b TEXT NOT NULL,
      overlap_start TEXT,
      overlap_end TEXT,
      pattern_type TEXT,
      description TEXT,
      significance TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('Tables ready.');
}

async function importFile(filePath) {
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  const slug = data.brand_slug;
  let memberCount = 0;
  let failed = 0;

  for (const member of (data.members || [])) {
    try {
      await pool.query(`
        INSERT INTO board_members
          (brand_slug, person_slug, full_name, role, tenure_start, tenure_end, is_current,
           committees, present_during, departure_reason, departure_context,
           revolving_door, revolving_door_note, other_boards, prior_government, notes, sources)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT (brand_slug, person_slug, tenure_start) DO UPDATE SET
          full_name=EXCLUDED.full_name, role=EXCLUDED.role,
          is_current=EXCLUDED.is_current, committees=EXCLUDED.committees,
          present_during=EXCLUDED.present_during, departure_reason=EXCLUDED.departure_reason,
          departure_context=EXCLUDED.departure_context, revolving_door=EXCLUDED.revolving_door,
          revolving_door_note=EXCLUDED.revolving_door_note, other_boards=EXCLUDED.other_boards,
          prior_government=EXCLUDED.prior_government, notes=EXCLUDED.notes, sources=EXCLUDED.sources
      `, [
        slug, member.person_slug, member.full_name, member.role,
        member.tenure_start || null, member.tenure_end || null,
        member.is_current || false,
        JSON.stringify(member.committees || []),
        JSON.stringify(member.present_during || []),
        member.departure_reason || null, member.departure_context || null,
        member.revolving_door || false, member.revolving_door_note || null,
        JSON.stringify(member.other_boards || []),
        member.prior_government || false,
        member.notes || null,
        JSON.stringify(member.sources || [])
      ]);
      memberCount++;
    } catch (err) {
      console.error(`  FAIL ${member.person_slug}: ${err.message}`);
      failed++;
    }
  }

  for (const conn of (data.connections || [])) {
    try {
      await pool.query(`
        INSERT INTO board_connections
          (person_slug, brand_slug_a, brand_slug_b, overlap_start, overlap_end,
           pattern_type, description, significance)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [
        conn.person_slug, conn.brand_slug_a, conn.brand_slug_b,
        conn.overlap_start || null, conn.overlap_end || null,
        conn.pattern_type || null, conn.description || null, conn.significance || null
      ]);
    } catch (err) {
      // connection insert failures are non-fatal
    }
  }

  console.log(`  ${slug}: ${memberCount} members, ${failed} failed`);
  return memberCount;
}

async function main() {
  await createTables();
  const boardsDir = join(__dirname, 'boards');
  if (!existsSync(boardsDir)) {
    console.log('No boards/ directory found. Create db/boards/ and add JSON files.');
    await pool.end();
    return;
  }
  const files = readdirSync(boardsDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No board JSON files found in db/boards/');
    await pool.end();
    return;
  }
  let total = 0;
  for (const file of files) {
    total += await importFile(join(boardsDir, file));
  }
  console.log(`\nDone: ${total} members imported.`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
