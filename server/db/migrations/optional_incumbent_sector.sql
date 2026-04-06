-- Optional relational `sector` when many profiles lack profile_json->>'sector'.
-- 1) Run the diagnostic in docs/CURSOR_INSTRUCTIONS_DIRECTORY.md
-- 2) Apply this migration on Render
-- 3) Update server/routes/profiles.index.route.js sector expression to:
--    COALESCE(
--      ip.sector,
--      ip.profile_json->>'sector',
--      ip.profile_json->>'category'
--    ) AS sector
-- 4) Extend import scripts (e.g. import_profiles_v*.mjs) to set `sector` on upsert

ALTER TABLE incumbent_profiles ADD COLUMN IF NOT EXISTS sector TEXT;

UPDATE incumbent_profiles
SET sector = profile_json->>'sector'
WHERE sector IS NULL
  AND profile_json->>'sector' IS NOT NULL;

-- Add batch-specific backfill with CASE or IN (...) lists as needed, e.g.:
-- UPDATE incumbent_profiles SET sector = 'Consumer goods'
-- WHERE sector IS NULL AND brand_slug IN ('mcdonalds', 'nike');

CREATE INDEX IF NOT EXISTS idx_incumbent_profiles_sector ON incumbent_profiles (sector);
