#!/bin/bash
# Deploy (or refresh) the same-origin VPS stack.
# Usage (on the VPS, from the repo checkout):
#   LENR_ENV_FILE=/opt/lenr-sim/.env ./infrastructure/vps/scripts/deploy.sh
# Optional:
#   BUILD_LOCALLY=1   build images on the host instead of pulling GHCR
#   IMAGE_TAG=sha-... pin a previously built/pushed tag (rollback helper)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VPS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_ROOT="$(cd "$VPS_DIR/../.." && pwd)"   # LENR_SIM_APP_v2
ENV_FILE="${LENR_ENV_FILE:-/opt/lenr-sim/.env}"
COMPOSE=(docker compose -f "$VPS_DIR/docker-compose.prod.yml" --env-file "$ENV_FILE")
BUILD_LOCALLY="${BUILD_LOCALLY:-0}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy infrastructure/vps/.env.production.example and fill secrets." >&2
  exit 1
fi
# Export IMAGE_TAG / GHCR_* / LENR_WORKERS for compose interpolation without
# printing secrets. Parse line-by-line (avoid eval) so odd values cannot
# execute as shell words. Site hostnames live in Caddyfile, not SITE_ADDRESS.
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"
  [[ "$line" =~ ^(IMAGE_TAG|GHCR_USER|GHCR_TOKEN|LENR_WORKERS)=(.*)$ ]] || continue
  key="${BASH_REMATCH[1]}"
  val="${BASH_REMATCH[2]}"
  if [[ "$val" =~ ^".*"$ ]]; then
    val="${val:1:-1}"
  elif [[ "$val" =~ ^'.*'$ ]]; then
    val="${val:1:-1}"
  fi
  printf -v "$key" '%s' "$val"
  export "$key"
done < <(grep -E '^(IMAGE_TAG|GHCR_USER|GHCR_TOKEN|LENR_WORKERS)=' "$ENV_FILE" || true)

IMAGE_TAG="${IMAGE_TAG:-0.3.6-beta}"
PREVIOUS_TAG_FILE=/opt/lenr-sim/.previous-image-tag

mkdir -p /opt/lenr-sim/{logs/backend,logs/caddy,data,backups}
chmod 600 "$ENV_FILE" || true

if [[ -f "$PREVIOUS_TAG_FILE" ]]; then
  echo "Previous IMAGE_TAG was $(cat "$PREVIOUS_TAG_FILE") (use rollback.sh to restore)"
fi

if [[ -n "${GHCR_TOKEN:-}" && -n "${GHCR_USER:-}" && "$BUILD_LOCALLY" != "1" ]]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
fi

cd "$APP_ROOT"
export LENR_ENV_FILE="$ENV_FILE"
export IMAGE_TAG

if [[ "$BUILD_LOCALLY" == "1" ]]; then
  "${COMPOSE[@]}" build backend frontend migrate
else
  if ! "${COMPOSE[@]}" pull backend frontend postgres caddy; then
    echo "GHCR pull failed; building locally." >&2
    "${COMPOSE[@]}" build backend frontend migrate
  fi
fi

echo "$IMAGE_TAG" > "$PREVIOUS_TAG_FILE.tmp"
if [[ -f "$PREVIOUS_TAG_FILE" ]]; then
  cp "$PREVIOUS_TAG_FILE" /opt/lenr-sim/.rollback-image-tag
fi
mv "$PREVIOUS_TAG_FILE.tmp" "$PREVIOUS_TAG_FILE"

"${COMPOSE[@]}" --profile migrate run --rm migrate
"${COMPOSE[@]}" up -d postgres backend frontend caddy

echo "Waiting for backend health..."
for _ in $(seq 1 40); do
  if "${COMPOSE[@]}" exec -T backend sh -c "curl -fsS http://localhost:8000/api/health | grep -q '\"status\":\"healthy\"'"; then
    echo "Backend healthy."
    "${COMPOSE[@]}" exec -T backend curl -fsS http://localhost:8000/api/health || true
    echo "Deploy complete. IMAGE_TAG=$IMAGE_TAG"
    echo "To roll back: $SCRIPT_DIR/rollback.sh"
    # Optional public share probe (set BETA_SHARE_URL to enforce from the VPS).
    if [[ -x "$SCRIPT_DIR/verify-beta-share.sh" ]]; then
      echo "Public share probe..."
      BETA_SHARE_URL="${BETA_SHARE_URL:-https://lenr-sim-beta.conscious.energy}" \
        "$SCRIPT_DIR/verify-beta-share.sh" || {
          echo "WARN: public share probe failed; stack is up locally — check DNS/Caddy." >&2
        }
    fi
    exit 0
  fi
  sleep 3
done

echo "Backend did not become healthy in time. Logs:" >&2
"${COMPOSE[@]}" logs --tail=80 backend >&2
exit 1
