#!/bin/bash

SLUGS=(
  "disney"
  "coca-cola"
  "unitedhealth"
  "amazon"
  "nestle"
  "comcast"
  "cigna"
  "mcdonalds"
  "shell"
  "tyson-foods"
)

COST_CAP=10
DELAY=90

cd /Users/alexmaksimovich/ETHICAL_ALTERNATIVES/server
set -a && source .env && set +a

for SLUG in "${SLUGS[@]}"; do
  echo ""
  echo "========================================"
  echo "=== Starting: $SLUG ==="
  echo "========================================"

  node scripts/deep_research_profile.mjs \
    --slug "$SLUG" \
    --cost-cap $COST_CAP

  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ]; then
    echo "=== SUCCESS: $SLUG ==="
  else
    echo "=== FAILED: $SLUG (exit $EXIT_CODE) — continuing ==="
  fi

  echo "=== Sleeping ${DELAY}s before next ==="
  sleep $DELAY
done

echo ""
echo "========================================"
echo "=== BATCH COMPLETE ==="
echo "========================================"
