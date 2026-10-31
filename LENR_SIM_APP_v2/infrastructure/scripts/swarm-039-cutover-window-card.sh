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
echo "=== live DNS (WordPress.com apex; cutover can proceed with ALLOW_API_DNS_GAP) ==="
SHARE_IP="${SHARE_IP:-185.211.4.66}"
KVM1_IP="${KVM1_IP:-31.220.55.113}"
for host in lenr-sim-beta.conscious.energy api.conscious.energy api-staging.conscious.energy; do
  ips="$(dig +short "$host" A 2>/dev/null | grep -E '^[0-9.]+$' | tr '\n' ' ' || true)"
  echo "${host} A → ${ips:-none}"
done
echo "share=${SHARE_IP} kvm1=${KVM1_IP}"
if dig +short api.conscious.energy A 2>/dev/null | grep -qxF "$SHARE_IP"; then
  echo "api.conscious.energy already includes share — full API hostname ready"
else
  echo "api.conscious.energy still on WordPress — cutover serves API via lenr-sim-beta (traefik_extra_api_hosts); flip A api → ${SHARE_IP} in the window when ready"
fi

echo
echo "=== pre-arm staging ops barcode (no CONFIRM) ==="
cat <<EOF
${SCRIPT_DIR}/staging-swarm-ops-verify.sh
# Expect STAGING OPS BARCODE GREEN (WP api-staging A may still lag).
# Docs: docs/v0.3.8-beta/STAGING_SWARM_DRY_RUN.md
EOF

echo
echo "=== pre-arm observability (Grafana + optional D-Force) ==="
cat <<EOF
# Staging Grafana SSH tunnel (Docker host-mode bypasses UFW — DOCKER-USER DROP required):
ssh -i "\${KVM1_SSH_KEY:-\$HOME/.ssh/lenr-sim-staging}" -L 3000:127.0.0.1:3000 root@31.220.55.113
# browser → http://127.0.0.1:3000  (password: /opt/lenr-sim/.grafana-admin-password on KVM1)
# Public kvm1:3000 must NOT return 200 (lenr-grafana-localhost.service / DOCKER-USER).
# Optional TUI (operator laptop):
#   d4s --context lenr-staging   # pre-cutover (KVM1 manager)
#   d4s --context lenr-share     # post-cutover (share manager)
# Docs: docs/v0.3.8-beta/OBSERVABILITY_GRAFANA.md + D4S_DFORCE_OPERATOR.md
EOF

echo
echo "=== optional: Postgres backup on share before the window (no CONFIRM) ==="
cat <<EOF
# Live cutover also auto-refreshes dump+tgz immediately before Compose drain.
# Logical dump (Compose postgres still up) + volume tarball under /opt/lenr-sim/backups/
ssh -i "\${SHARE_SSH_KEY:-\$HOME/.ssh/lenr-sim-share}" root@185.211.4.66 \\
  'mkdir -p /opt/lenr-sim/backups && ts=\$(date -u +%Y%m%dT%H%M%SZ) && \\
   docker exec \$(docker ps -q -f name=lenr-sim-postgres | head -1) \\
     pg_dump -U lenr_app -d lenr_sim --no-owner --no-acl | gzip -c \\
     > /opt/lenr-sim/backups/postgres-pre-cutover-\$ts.sql.gz && chmod 600 /opt/lenr-sim/backups/postgres-pre-cutover-\$ts.sql.gz'
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
