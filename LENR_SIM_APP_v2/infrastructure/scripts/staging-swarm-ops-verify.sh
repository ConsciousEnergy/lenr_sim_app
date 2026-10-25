#!/usr/bin/env bash
# Live staging Swarm ops barcode (checklist in STAGING_SWARM_DRY_RUN.md).
# Read-only probes — no CONFIRM, no public cutover, CI node never joins.
#
# Usage (repo root or any cwd):
#   ./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-ops-verify.sh
#
# Env:
#   STAGING_IP          default 31.220.55.113
#   STAGING_SSLIP_API   default https://api-staging.${STAGING_IP}.sslip.io
#   SHARE_BETA          default https://lenr-sim-beta.conscious.energy
#   STAGING_SSH_KEY     default $HOME/.ssh/lenr-sim-staging
#   DOCKER_CONTEXT      default lenr-staging (fallback: SSH)
set -euo pipefail

STAGING_IP="${STAGING_IP:-31.220.55.113}"
STAGING_SSLIP_API="${STAGING_SSLIP_API:-https://api-staging.${STAGING_IP}.sslip.io}"
SHARE_BETA="${SHARE_BETA:-https://lenr-sim-beta.conscious.energy}"
STAGING_SSH_KEY="${STAGING_SSH_KEY:-${HOME}/.ssh/lenr-sim-staging}"
CI_IP="${CI_IP:-45.93.100.251}"
APP_ORIGIN="${APP_ORIGIN:-https://app-staging.conscious.energy}"
ANSIBLE_DIR="$(cd "$(dirname "$0")/../ansible" && pwd)"
STACK="${STACK:-lenr-sim}"

red() { printf '\033[0;31m%s\033[0m\n' "$*" >&2; }
grn() { printf '\033[0;32mOK  %s\033[0m\n' "$*"; }
yel() { printf '\033[0;33m  - %s\033[0m\n' "$*"; }
bad() { red "FAIL $*" ; FAIL=1; }
FAIL=0

docker_staging() {
  if command -v docker >/dev/null 2>&1 \
    && docker context ls --format '{{.Name}}' 2>/dev/null | grep -qx 'lenr-staging'; then
    docker --context lenr-staging "$@"
  else
    # Quote the remote argv so Go templates like {{.Name}} survive SSH.
    local remote
    remote=$(printf '%q ' "$@")
    ssh -i "$STAGING_SSH_KEY" -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=15 \
      "root@${STAGING_IP}" "docker ${remote}"
  fi
}

echo "=== staging Swarm ops verify $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo "CONFIRM_SWARM_0_3_9=${CONFIRM_SWARM_0_3_9:-unset} (must stay unset here)"

# 1a) sslip TLS bootstrap
code=$(curl -skS -o /dev/null -w '%{http_code}' --max-time 20 "${STAGING_SSLIP_API}/api/health" || echo 000)
[[ "$code" == "200" ]] && grn "1a sslip API health → 200 (${STAGING_SSLIP_API})" \
  || bad "1a sslip API health → ${code}"

# 1) canonical api-staging (WP DNS often lagging)
api_dns=$(dig +short api-staging.conscious.energy A 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]*$//')
if echo " ${api_dns} " | grep -q " ${STAGING_IP} "; then
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 \
    "https://api-staging.conscious.energy/api/health" || echo 000)
  [[ "$code" == "200" ]] && grn "1 api-staging.conscious.energy → 200 (A=${api_dns})" \
    || bad "1 api-staging A→${STAGING_IP} but health ${code}"
else
  yel "1 api-staging DNS still '${api_dns:-unset}' (WordPress.com — operator A → ${STAGING_IP})"
fi

# 2–3) stack replicas + postgres on manager
svcs=$(docker_staging service ls --format '{{.Name}} {{.Replicas}}' 2>/dev/null || true)
echo "$svcs" | grep -q "${STACK}_backend 1/1" && grn "2 backend 1/1" || bad "2 backend not 1/1"
echo "$svcs" | grep -q "${STACK}_postgres 1/1" && grn "3 postgres 1/1" || bad "3 postgres not 1/1"
pg_node=$(docker_staging service ps "${STACK}_postgres" --filter desired-state=running \
  --format '{{.Node}}' 2>/dev/null | head -1 || true)
mgr=$(docker_staging node ls --format '{{.Hostname}} {{.ManagerStatus}}' 2>/dev/null \
  | awk '/Leader|Reachable/{print $1; exit}')
[[ -n "$pg_node" && "$pg_node" == "$mgr" ]] \
  && grn "3 postgres on manager (${pg_node})" \
  || yel "3 postgres node=${pg_node:-?} manager=${mgr:-?} (single-node OK if equal)"

# CI never a Swarm node
addrs=$(docker_staging node ls -q 2>/dev/null | while read -r n; do
  docker_staging node inspect "$n" --format '{{.Status.Addr}}'
done || true)
echo "$addrs" | grep -qF "$CI_IP" && bad "CI IP ${CI_IP} present in Swarm node addrs" \
  || grn "CI IP ${CI_IP} absent from Swarm"

# 4) Pages CORS via sslip
opt=$(curl -skS -D - -o /dev/null -X OPTIONS --max-time 20 \
  -H "Origin: ${APP_ORIGIN}" \
  -H "Access-Control-Request-Method: GET" \
  "${STAGING_SSLIP_API}/api/health" || true)
echo "$opt" | grep -qi "access-control-allow-origin: ${APP_ORIGIN}" \
  && grn "4 CORS preflight ACAO=${APP_ORIGIN} (sslip)" \
  || bad "4 CORS preflight missing ACAO for ${APP_ORIGIN}"

# 5) WS path reaches Traefik/backend (not Cloudflare) — 4xx from app is OK.
# Generate Sec-WebSocket-Key at runtime (do not embed RFC6455 sample — gitleaks).
ws_key="$(openssl rand -base64 16 2>/dev/null || head -c 16 /dev/urandom | base64)"
ws=$(curl -skS -o /dev/null -w '%{http_code}' --max-time 10 \
  -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: ${ws_key}" \
  "${STAGING_SSLIP_API}/ws" || true)
ws="${ws:-000}"
[[ "$ws" =~ ^(101|4[0-9][0-9])$ ]] \
  && grn "5 WS upgrade path reaches edge/app (HTTP ${ws}, not CF park)" \
  || yel "5 WS probe HTTP ${ws} (optional if unused)"

# 6) Compose share
share=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "${SHARE_BETA}/api/health" || echo 000)
[[ "$share" == "200" ]] && grn "6 Compose share ${SHARE_BETA}/api/health → 200" \
  || bad "6 Compose share health → ${share}"

# 7) backup playbook --check
if [[ -f "${ANSIBLE_DIR}/inventory.staging.yml" ]]; then
  if ansible-playbook --check -i "${ANSIBLE_DIR}/inventory.staging.yml" \
      "${ANSIBLE_DIR}/playbooks/backup.yml" >/tmp/staging-backup-check.log 2>&1; then
    grn "7 backup.yml --check exit 0"
  else
    bad "7 backup.yml --check failed (see /tmp/staging-backup-check.log)"
  fi
else
  yel "7 skip backup --check (missing inventory.staging.yml)"
fi

# 8) observability + Grafana not public
for s in prometheus grafana blackbox node-exporter; do
  echo "$svcs" | grep -q "${STACK}_${s}" && grn "8 ${s} present" || bad "8 missing ${s}"
done
# curl --max-time still prints %{http_code}=000 on timeout (exit 28); do not append another 000.
gpub=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 \
  "http://${STAGING_IP}:3000/login" 2>/dev/null || true)
gpub="${gpub:-000}"
if [[ "$gpub" == "000" || "$gpub" == "0000" ]]; then
  grn "8 Grafana :3000 not publicly reachable (timeout/closed)"
else
  bad "8 Grafana :3000 publicly returned HTTP ${gpub}"
fi

echo
if [[ "$FAIL" -eq 0 ]]; then
  grn "STAGING OPS BARCODE GREEN (WP api-staging DNS may still lag — ALLOW_STAGING_DNS_GAP)"
  exit 0
fi
red "STAGING OPS BARCODE RED — fix FAIL lines before arming cutover"
exit 1
