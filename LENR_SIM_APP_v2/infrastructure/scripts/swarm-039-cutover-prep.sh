#!/usr/bin/env bash
# Preflight for v0.3.9 public Swarm cutover — does NOT apply Swarm or DNS.
# Exit 0 only when prerequisites look ready; never sets CONFIRM_SWARM_0_3_9.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
INFRA="${ROOT}/LENR_SIM_APP_v2/infrastructure"
STAGING_INV="${INFRA}/ansible/inventory.staging.yml"
PROD_INV="${INFRA}/ansible/inventory.yml"
SHARE_URL="${LIVE_COMPOSE_URL:-https://lenr-sim-beta.conscious.energy}"
KVM1_IP="${KVM1_IP:-31.220.55.113}"
SHARE_IP="${SHARE_IP:-185.211.4.66}"
CI_IP="${CI_IP:-45.93.100.251}"
BOOTSTRAP_HOST="api-staging.${KVM1_IP}.sslip.io"
fail=0

note() { printf '  - %s\n' "$*"; }
ok() { printf 'OK  %s\n' "$*"; }
bad() { printf 'BAD %s\n' "$*"; fail=1; }

echo "=== v0.3.9 Swarm cutover prep (read-only) ==="

# 1) Staging inventory present
if [[ -f "$STAGING_INV" ]]; then
  ok "staging inventory present"
else
  bad "missing ${STAGING_INV} (copy from inventory.staging.yml.example)"
fi

# 2) Prod inventory present (required for deploy.sh production)
if [[ -f "$PROD_INV" ]]; then
  ok "prod inventory.yml present"
  # Ignore # comments; only flag live host IP assignments.
  if grep -vE '^[[:space:]]*#' "$PROD_INV" | grep -Fq "$CI_IP"; then
    bad "prod inventory must not include CI node ${CI_IP} as a host"
  else
    ok "prod inventory does not list CI node as a host"
  fi
else
  bad "missing ${PROD_INV} — copy inventory.yml.example before cutover window"
fi

# 3) Compose share healthy
code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 "${SHARE_URL}/api/health" || echo 000)"
if [[ "$code" == "200" ]]; then
  ok "Compose share health ${SHARE_URL} → 200"
else
  bad "Compose share health → ${code}"
fi

# 4) Staging bootstrap TLS (sslip) and/or WordPress DNS for api-staging
boot="$(curl -sk -o /dev/null -w '%{http_code}' --connect-timeout 10 "https://${BOOTSTRAP_HOST}/api/health" || echo 000)"
if [[ "$boot" == "200" ]]; then
  ok "staging TLS bootstrap https://${BOOTSTRAP_HOST}/api/health → 200"
else
  note "staging TLS bootstrap → ${boot} (redeploy stack with traefik_acme_bootstrap_host)"
fi

api_dns="$(dig +short api-staging.conscious.energy A | grep -E '^[0-9.]+$' | head -1 || true)"
if [[ "$api_dns" == "$KVM1_IP" ]]; then
  ok "api-staging.conscious.energy A → ${KVM1_IP}"
  canon="$(curl -sk -o /dev/null -w '%{http_code}' --connect-timeout 10 https://api-staging.conscious.energy/api/health || echo 000)"
  [[ "$canon" == "200" ]] && ok "canonical staging HTTPS → 200" || bad "canonical staging HTTPS → ${canon}"
elif [[ "${ALLOW_STAGING_DNS_GAP:-0}" == "1" ]]; then
  note "api-staging DNS still '${api_dns:-unset}' (ALLOW_STAGING_DNS_GAP=1)"
else
  bad "api-staging DNS is '${api_dns:-unset}' (need WordPress.com A → ${KVM1_IP})"
fi

# 5) GHCR env or LOCAL_IMAGES=1
if [[ -n "${GHCR_USER:-}" && -n "${GHCR_TOKEN:-}" ]]; then
  ok "GHCR_USER + GHCR_TOKEN set"
elif [[ "${LOCAL_IMAGES:-0}" == "1" ]]; then
  ok "LOCAL_IMAGES=1 — cutover will docker build on share (no GHCR)"
else
  bad "GHCR_USER/GHCR_TOKEN unset (or set LOCAL_IMAGES=1 for on-manager build)"
fi

# 6) Share SSH (manager target)
SHARE_KEY="${SHARE_SSH_KEY:-${VPS_SSH_IDENTITY_FILE:-$HOME/.ssh/lenr-sim-share}}"
if [[ -f "$SHARE_KEY" ]] \
  && ssh -i "$SHARE_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
       -o StrictHostKeyChecking=accept-new "root@${SHARE_IP}" 'echo ok' >/dev/null 2>&1; then
  ok "share SSH root@${SHARE_IP} via ${SHARE_KEY}"
else
  bad "share SSH unavailable (set SHARE_SSH_KEY or run hostinger-compose-unlock.py attach-key with AGENT_* paths)"
fi

# 6) Confirm gate reminder (never auto-set)
if [[ "${CONFIRM_SWARM_0_3_9:-}" == "I_CUTOVER_0_3_9" ]]; then
  note "CONFIRM_SWARM_0_3_9 is set — human cutover window armed"
else
  note "CONFIRM_SWARM_0_3_9 unset (expected until human arms cutover)"
fi

echo
if [[ "$fail" -eq 0 ]]; then
  echo "Prep green — arm CONFIRM_SWARM_0_3_9 only in an announced window."
  exit 0
fi
echo "Prep incomplete — fix BAD lines before production cutover."
exit 1
