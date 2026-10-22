#!/usr/bin/env bash
# Operator cutover window card — prints live evidence + exact arming commands.
# Read-only. Never sets CONFIRM_* / EXECUTE.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${OUT:-/opt/cursor/artifacts/swarm-039-cutover-window-card.log}"
mkdir -p "$(dirname "$OUT")"
exec > >(tee "$OUT") 2>&1

echo "=== v0.3.9 Swarm cutover window card $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo

LOCAL_IMAGES=1 SKIP_IMAGE_BUILD=1 ALLOW_API_DNS_GAP=1 ALLOW_STAGING_DNS_GAP=1 \
  bash "${SCRIPT_DIR}/swarm-039-readiness-barcode.sh" || true

echo
echo "=== arm live cutover (human only) ==="
cat <<EOF
CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 EXECUTE=1 LOCAL_IMAGES=1 \\
  ALLOW_STAGING_DNS_GAP=1 ALLOW_API_DNS_GAP=1 SKIP_IMAGE_BUILD=1 \\
  ${SCRIPT_DIR}/swarm-039-cutover.sh
EOF

echo
echo "=== mid-window abort → Compose restore ==="
cat <<EOF
CONFIRM_RESTORE_COMPOSE=I_RESTORE_COMPOSE_AFTER_SWARM \\
  CONFIRM_LEAVE_SWARM=I_LEAVE_SWARM_FOR_COMPOSE \\
  ${SCRIPT_DIR}/swarm-039-restore-compose.sh
EOF

echo
echo "=== re-verify after cutover ==="
cat <<EOF
ALLOW_API_DNS_GAP=1 ${SCRIPT_DIR}/swarm-039-post-cutover-verify.sh
EOF

echo
echo "Do not close EQ-OPEN-*. CI node 45.93.100.251 must never join Swarm."
