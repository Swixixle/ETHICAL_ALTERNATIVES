-- EthicalAlt Volume 2 incumbent profiles (20 rows: 15 companies + Sysco explainer + 5 positive).
-- Source narrative: server/db/sources/ethicalalt-profiles-v2-author.md
-- Structured JSON payloads: server/db/profiles_v2/*.json
--
--   psql "$DATABASE_URL" -f server/db/schema.sql
--   cd server && DATABASE_URL=... npm run db:import:v1
--   cd server && DATABASE_URL=... npm run db:import:v2

SELECT 'Run: cd server && DATABASE_URL=... npm run db:import:v2' AS instruction;
