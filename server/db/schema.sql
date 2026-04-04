-- Incumbent investigation profiles (relational layout + optional JSON override).
-- If you previously used the minimal profile_json-only table, migrate with:
--   DROP TABLE IF EXISTS incumbent_profiles CASCADE;
-- then re-run this file.

CREATE TABLE IF NOT EXISTS incumbent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  brand_name TEXT NOT NULL,
  brand_slug TEXT UNIQUE NOT NULL,

  parent_company TEXT,
  ultimate_parent TEXT,
  known_subsidiaries TEXT[],

  effective_tax_rate DECIMAL(5, 2),
  statutory_rate DECIMAL(5, 2),
  offshore_entities TEXT[],
  government_subsidies_usd BIGINT,

  criminal_cases JSONB,
  civil_settlements JSONB,
  regulatory_actions JSONB,

  lobbying_annual_usd INTEGER,
  lobbying_year INTEGER,
  pac_donations_usd INTEGER,
  pac_year INTEGER,

  osha_violations_5yr INTEGER,
  wage_theft_settlements_usd BIGINT,
  living_wage_certified BOOLEAN,
  union_suppression_documented BOOLEAN,

  epa_enforcement_actions_5yr INTEGER,

  investigation_summary TEXT,
  verdict_tags TEXT[],
  overall_concern_level TEXT,

  last_researched DATE DEFAULT CURRENT_DATE,
  research_confidence TEXT,
  primary_sources TEXT[],

  -- Optional: full API-shaped blob; when NOT NULL it takes precedence over columns above
  profile_json JSONB,

  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incumbent_profiles_slug ON incumbent_profiles (brand_slug);
CREATE INDEX IF NOT EXISTS idx_incumbent_profiles_verdict ON incumbent_profiles USING GIN (verdict_tags);
