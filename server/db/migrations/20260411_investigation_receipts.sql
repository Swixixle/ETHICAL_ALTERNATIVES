-- Signed investigation receipts (Ed25519). Run on production DB after deploy.
CREATE TABLE IF NOT EXISTS investigation_receipts (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL,
  receipt_json JSONB NOT NULL,
  signature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investigation_receipts_slug ON investigation_receipts (slug);
CREATE INDEX IF NOT EXISTS idx_investigation_receipts_created ON investigation_receipts (created_at DESC);
