-- Live perimeter check cache (on-demand; static profile_json never updated here)
CREATE TABLE IF NOT EXISTS profile_activity_cache (
  brand_slug        TEXT PRIMARY KEY REFERENCES incumbent_profiles(brand_slug) ON DELETE CASCADE,
  activity_json     JSONB NOT NULL,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL,
  sensor_versions   JSONB
);

CREATE INDEX IF NOT EXISTS idx_activity_cache_expires
  ON profile_activity_cache (expires_at);
