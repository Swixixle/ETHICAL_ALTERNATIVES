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

-- Added for imports / stub self-healing (safe on existing DBs)
ALTER TABLE incumbent_profiles ADD COLUMN IF NOT EXISTS profile_type TEXT;

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

-- USDA National Farmers Market Directory (import via server/db/import_farmers_markets.mjs).
CREATE TABLE IF NOT EXISTS farmers_markets (
  id              SERIAL PRIMARY KEY,
  source_fmid   TEXT UNIQUE NOT NULL,
  market_name     TEXT NOT NULL,
  street          TEXT,
  city            TEXT,
  state           TEXT,
  zip             TEXT,
  lat             NUMERIC(9, 6),
  lng             NUMERIC(9, 6),
  schedule        TEXT,
  products        TEXT,
  website         TEXT,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS farmers_markets_lat_lng_idx
  ON farmers_markets (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

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

-- Civic Witness Registry — voluntary public ledger of reviewers (not legal filings).
CREATE TABLE IF NOT EXISTS civic_witnesses (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  brand_slug TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  investigation_headline TEXT,
  city TEXT,
  state_code TEXT,
  country TEXT DEFAULT 'US',
  witnessed_at TIMESTAMPTZ DEFAULT NOW(),
  public_message TEXT,
  is_public BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_witnesses_brand ON civic_witnesses (brand_slug);
CREATE INDEX IF NOT EXISTS idx_witnesses_state ON civic_witnesses (state_code);

-- Hire Direct — local worker marketplace (direct economic connections, zero platform fee).
CREATE TABLE IF NOT EXISTS local_workers (
  id SERIAL PRIMARY KEY,
  display_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL,
  state_code TEXT NOT NULL,
  lat NUMERIC(9, 6),
  lng NUMERIC(9, 6),
  category TEXT NOT NULL,
  tagline TEXT NOT NULL,
  bio TEXT,
  rate TEXT,
  availability TEXT DEFAULT 'available',
  contact_method TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  corporate_alternatives JSONB DEFAULT '[]',
  civic_witness_count INTEGER DEFAULT 0,
  is_civic_verified BOOLEAN DEFAULT FALSE,
  union_affiliation TEXT,
  profile_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_workers_category ON local_workers (category);
CREATE INDEX IF NOT EXISTS idx_workers_city_state ON local_workers (city, state_code);
CREATE INDEX IF NOT EXISTS idx_workers_location ON local_workers (lat, lng);

CREATE TABLE IF NOT EXISTS worker_messages (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER REFERENCES local_workers (id),
  sender_session TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

-- Aggregate impact metrics (no PII). Daily totals are always safe counters; per-brand monthly is keyed only by slug.
CREATE TABLE IF NOT EXISTS impact_daily_aggregates (
  day DATE PRIMARY KEY,
  scan_count INTEGER NOT NULL DEFAULT 0,
  investigation_count INTEGER NOT NULL DEFAULT 0,
  clean_card_count INTEGER NOT NULL DEFAULT 0,
  dirty_card_count INTEGER NOT NULL DEFAULT 0,
  alt_open_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS impact_brand_monthly (
  year_month TEXT NOT NULL,
  brand_slug TEXT NOT NULL,
  scan_count INTEGER NOT NULL DEFAULT 0,
  alt_view_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (year_month, brand_slug)
);

CREATE INDEX IF NOT EXISTS idx_impact_brand_monthly_slug ON impact_brand_monthly (brand_slug);

CREATE TABLE IF NOT EXISTS civic_actions_daily (
  day DATE PRIMARY KEY,
  witness_count INTEGER NOT NULL DEFAULT 0,
  share_export_count INTEGER NOT NULL DEFAULT 0,
  narration_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS impact_outcomes_raw (
  id SERIAL PRIMARY KEY,
  outcome TEXT NOT NULL
    CHECK (outcome IN ('yes_switched', 'no_same', 'no_already_avoided', 'skipped')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_impact_outcomes_raw_created ON impact_outcomes_raw (created_at);

CREATE TABLE IF NOT EXISTS impact_outcomes_monthly (
  year_month TEXT PRIMARY KEY,
  response_count INTEGER NOT NULL DEFAULT 0,
  switched_count INTEGER NOT NULL DEFAULT 0,
  same_count INTEGER NOT NULL DEFAULT 0,
  avoided_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Share audit log: no user id, no IP column, no binary photo fields (hard rule).
CREATE TABLE IF NOT EXISTS impact_shares (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  brand_slug TEXT NOT NULL,
  channel TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  was_blocked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_impact_shares_created ON impact_shares (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_impact_shares_brand ON impact_shares (brand_slug);

