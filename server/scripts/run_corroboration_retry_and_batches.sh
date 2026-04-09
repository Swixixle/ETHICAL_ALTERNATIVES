#!/usr/bin/env bash
# Run from repo root or server/ — requires DATABASE_URL and ANTHROPIC_API_KEY (e.g. in server/.env).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set. Add it to server/.env or export it before running." >&2
  exit 1
fi

echo "=== Retry slugs (parse errors + spot checks) ==="
node db/corroborate_profiles.mjs --slug ben-jerrys
node db/corroborate_profiles.mjs --slug geo-group
node db/corroborate_profiles.mjs --slug mantech
node db/corroborate_profiles.mjs --slug mgm-resorts
node db/corroborate_profiles.mjs --slug gates-foundation
node db/corroborate_profiles.mjs --slug boy-scouts-of-america

echo "=== Religious institutions → tier3_corroboration_religious.json ==="
node db/corroborate_profiles.mjs --type religious_institution --batch-size 3 --batch-delay 30000 \
  --output tier3_corroboration_religious.json

echo "=== Nonprofits → tier4_corroboration_nonprofit.json ==="
node db/corroborate_profiles.mjs --type nonprofit --batch-size 3 --batch-delay 30000 \
  --output tier4_corroboration_nonprofit.json

echo "Done. Reports written under server/ (cwd)."
