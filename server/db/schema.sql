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

-- Saved tap / investigation sessions (client session_id in sessionStorage).
CREATE TABLE IF NOT EXISTS tap_history (
  id              SERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  session_id      TEXT,
  brand_name      TEXT,
  brand_slug      TEXT,
  object_name     TEXT,
  generated_headline TEXT,
  overall_concern_level TEXT,
  verdict_tags    TEXT[],
  investigation_json JSONB,
  identification_json JSONB,
  user_lat        NUMERIC(9, 6),
  user_lng        NUMERIC(9, 6),
  city            TEXT,
  share_count     INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS tap_history_session ON tap_history (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tap_history_brand ON tap_history (brand_slug);

-- Community-maintained independent seller listings (ethical alternatives).
CREATE TABLE IF NOT EXISTS seller_registry (
  id              SERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  seller_name     TEXT NOT NULL,
  description     TEXT,
  tagline         TEXT,

  website_url     TEXT,
  etsy_url        TEXT,
  instagram_url   TEXT,
  email           TEXT,
  other_url       TEXT,
  other_url_label TEXT,

  city            TEXT,
  state_province  TEXT,
  country         TEXT DEFAULT 'US',
  lat             NUMERIC(9, 6),
  lng             NUMERIC(9, 6),
  ships_nationally BOOLEAN DEFAULT false,
  ships_worldwide  BOOLEAN DEFAULT false,
  in_person_only   BOOLEAN DEFAULT false,

  categories      TEXT[],
  keywords        TEXT[],
  product_description TEXT,

  verified        BOOLEAN DEFAULT false,
  verification_note TEXT,
  active          BOOLEAN DEFAULT true,

  submission_method TEXT DEFAULT 'app',

  is_worker_owned BOOLEAN DEFAULT false,
  is_bcorp        BOOLEAN DEFAULT false,
  is_fair_trade   BOOLEAN DEFAULT false,
  certifications  TEXT[]
);

CREATE INDEX IF NOT EXISTS seller_registry_lat_lng_idx
  ON seller_registry (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS seller_registry_categories_gin ON seller_registry USING GIN (categories);
CREATE INDEX IF NOT EXISTS seller_registry_keywords_gin ON seller_registry USING GIN (keywords);
CREATE INDEX IF NOT EXISTS seller_registry_active ON seller_registry (active) WHERE active = true;

-- Daily community labor board (resets by board_date; posts filtered in app/query).
CREATE TABLE IF NOT EXISTS community_board (
  id              SERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  board_date      DATE DEFAULT CURRENT_DATE,

  post_type       TEXT NOT NULL CHECK (post_type IN ('offer', 'need')),

  name            TEXT NOT NULL,
  contact         TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  skills          TEXT[],

  city            TEXT,
  state_province  TEXT,
  lat             NUMERIC(9, 6),
  lng             NUMERIC(9, 6),
  radius_miles    INTEGER DEFAULT 10,

  available_from  TIME DEFAULT '08:00',
  available_until TIME DEFAULT '18:00',

  rate            TEXT,

  matched         BOOLEAN DEFAULT false,
  match_id        INTEGER REFERENCES community_board (id),
  active          BOOLEAN DEFAULT true,

  verified        BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS community_board_date
  ON community_board (board_date, post_type, active);

CREATE INDEX IF NOT EXISTS community_board_location
  ON community_board (lat, lng);

-- Cached Claude chain / independent classification for OSM business names (local feed pass 3).
CREATE TABLE IF NOT EXISTS chain_classifications (
  name_normalized TEXT PRIMARY KEY,
  is_chain        BOOLEAN NOT NULL,
  confidence      REAL NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now()
);
