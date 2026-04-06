-- Run after base schema. Logs share attempts for audits (no PII, no photos).
CREATE TABLE IF NOT EXISTS impact_shares (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  brand_slug TEXT NOT NULL,
  channel TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  was_blocked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_impact_shares_created ON impact_shares (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_impact_shares_brand ON impact_shares (brand_slug);
