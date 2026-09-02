#!/bin/bash
# Nightly pg_dump of the production Postgres volume. 14-day retention.
# Install:  0 3 * * * root /opt/lenr-sim/src/LENR_SIM_APP_v2/infrastructure/vps/scripts/backup-db.sh
set -euo pipefail

ENV_FILE="${LENR_ENV_FILE:-/opt/lenr-sim/.env}"
BACKUP_DIR="${BACKUP_DIR:-/opt/lenr-sim/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"
# shellcheck disable=SC1090
set -a
eval "$(grep -E '^(LENR_DB_USER|LENR_DB_NAME|LENR_DB_PASSWORD)=' "$ENV_FILE" | sed 's/\r$//')"
set +a

CONTAINER="$(docker ps --filter 'name=postgres' --format '{{.ID}}' | head -1)"
if [[ -z "$CONTAINER" ]]; then
  echo "No running postgres container" >&2
  exit 1
fi

OUT="$BACKUP_DIR/lenr_sim_${STAMP}.sql.gz"
docker exec -e PGPASSWORD="$LENR_DB_PASSWORD" "$CONTAINER" \
  pg_dump -U "$LENR_DB_USER" -d "$LENR_DB_NAME" --no-owner --format=plain \
  | gzip -9 > "$OUT"
chmod 600 "$OUT"
echo "Wrote $OUT ($(du -h "$OUT" | awk '{print $1}'))"

find "$BACKUP_DIR" -name 'lenr_sim_*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
