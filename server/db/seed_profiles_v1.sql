-- EthicalAlt Volume 1 incumbent profiles (16 rows: 15 names + altria alias for tobacco).
-- Source narrative & tone: server/db/sources/ethicalt-profiles-v1-author.md
-- Structured JSON payloads: server/db/profiles_v1/*.json
--
-- Apply schema first, then import JSON (recommended):
--   psql "$DATABASE_URL" -f server/db/schema.sql
--   cd server && DATABASE_URL=... node db/import_profiles_v1.mjs
--
-- Pure-SQL alternative would embed large jsonb literals; the Node importer avoids
-- escaping mistakes and stays idempotent via ON CONFLICT (brand_slug).

SELECT 'Run: cd server && DATABASE_URL=... node db/import_profiles_v1.mjs' AS instruction;
