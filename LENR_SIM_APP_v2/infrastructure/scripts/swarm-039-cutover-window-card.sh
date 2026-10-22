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
echo "=== pre-arm observability (Grafana + optional D-Force) ==="
cat <<EOF
# Staging Grafana SSH tunnel (UFW must NOT allow :3000 publicly):
ssh -i "\${KVM1_SSH_KEY:-\$HOME/.ssh/lenr-sim-staging}" -L 3000:127.0.0.1:3000 root@31.220.55.113
# browser → http://127.0.0.1:3000  (password: /opt/lenr-sim/.grafana-admin-password on KVM1)
# Optional TUI (operator laptop): d4s --context <ssh-context-to-staging-or-share-manager>
# Docs: docs/v0.3.8-beta/OBSERVABILITY_GRAFANA.md + D4S_DFORCE_OPERATOR.md
EOF

echo
echo "=== optional: refresh LOCAL_IMAGES before the window (no CONFIRM) ==="
cat <<EOF
EXECUTE=1 ${SCRIPT_DIR}/swarm-039-prestage-images.sh
# or reuse tags: SKIP_IMAGE_BUILD=1 EXECUTE=1 ${SCRIPT_DIR}/swarm-039-prestage-images.sh
EOF

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
