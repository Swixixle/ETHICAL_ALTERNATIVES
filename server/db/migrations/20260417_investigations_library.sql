-- Auto-saved deep investigation library: one row per target entity, refreshed on demand.
-- Run: psql $DATABASE_URL -f server/db/migrations/20260417_investigations_library.sql

CREATE TABLE IF NOT EXISTS investigations (
  id SERIAL PRIMARY KEY,
  target_entity TEXT NOT NULL UNIQUE,

  findings JSONB NOT NULL,
  sources JSONB NOT NULL,

  investigated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signature TEXT NOT NULL,

  corroborated BOOLEAN NOT NULL DEFAULT TRUE,
  needs_human_review BOOLEAN NOT NULL DEFAULT FALSE,
  confidence DECIMAL(4,3),

  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(target_entity, ''))) STORED
);

CREATE INDEX IF NOT EXISTS idx_investigations_target ON investigations (target_entity);
CREATE INDEX IF NOT EXISTS idx_investigations_investigated_at ON investigations (investigated_at DESC);
CREATE INDEX IF NOT EXISTS idx_investigations_search ON investigations USING GIN (tsv);
CREATE INDEX IF NOT EXISTS idx_investigations_needs_review ON investigations (needs_human_review)
  WHERE needs_human_review = true;

COMMENT ON TABLE investigations IS 'Cached multi-adapter auto-investigation results (see server/lib/auto_investigation.mjs)';
COMMENT ON COLUMN investigations.target_entity IS 'Entity key (e.g. incumbent brand_slug or display name)';
COMMENT ON COLUMN investigations.findings IS 'JSON: perplexity, gdelt, epa, sec, corroboration, etc.';
COMMENT ON COLUMN investigations.sources IS 'JSON array of adapter names';
COMMENT ON COLUMN investigations.signature IS 'Ed25519 base64 (or "unsigned" when ED25519_PRIVATE_KEY unset)';
