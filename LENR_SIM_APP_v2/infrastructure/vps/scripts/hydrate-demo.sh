#!/bin/bash
# One-shot Analytics demo hydrate (150 experiments / 132 theory_runs).
# The backend image already contains datasets/ (Dockerfile.backend COPY).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VPS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${LENR_ENV_FILE:-/opt/lenr-sim/.env}"
COMPOSE=(docker compose -f "$VPS_DIR/docker-compose.prod.yml" --env-file "$ENV_FILE")

export LENR_ENV_FILE="$ENV_FILE"
"${COMPOSE[@]}" exec -T backend \
  python -m app.scripts.seed_database --force --hydrate-demo
