#!/usr/bin/env bash
# Corroboration pass for newer healthcare / medtech profiles (Claude + Perplexity vs DB JSON).
# Run from repo: DATABASE_URL and ANTHROPIC_API_KEY must be set (e.g. export or server/.env).
# Optional: PERPLEXITY_API_KEY (see server/db/corroborate_profiles.mjs).
#
# Each profile is run with --slug in a separate process. --resume merges into the same JSON
# so the report accumulates; delete tier5_corroboration_healthcare.json in server/ for a clean run.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set. Export it or add to server/.env." >&2
  exit 1
fi
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "ERROR: ANTHROPIC_API_KEY is not set. Export it or add to server/.env." >&2
  exit 1
fi

OUTPUT="tier5_corroboration_healthcare.json"

SLUGS=(
  baxter-international
  change-healthcare
  multiplan
  centene
  teamhealth
  envision-healthcare
  epic-systems
  hca-healthcare
  tenet-healthcare
  lifepoint-health
  radiology-partners
  owens-minor
  premier-inc
  henry-schein
  medline-industries
  vizient
  amsurg
  molina-healthcare
  humana
  elevance-health
  davita
  amedisys
  getinge
  draeger
  hamilton-medical
  fisher-paykel-healthcare
  ge-healthcare
  medtronic
  vyaire-medical
)

total="${#SLUGS[@]}"
idx=0
for slug in "${SLUGS[@]}"; do
  idx=$((idx + 1))
  echo "=== [${idx}/${total}] ${slug} → ${OUTPUT} ==="
  node db/corroborate_profiles.mjs \
    --slug "$slug" \
    --batch-size 1 \
    --batch-delay 30000 \
    --output "$OUTPUT" \
    --resume
  if [[ "$idx" -lt "$total" ]]; then
    echo "--- sleeping 30s before next slug ---"
    sleep 30
  fi
done

echo "Done. Report: ${ROOT}/${OUTPUT}"
