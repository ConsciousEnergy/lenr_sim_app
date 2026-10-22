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

# 5) Public API DNS (WordPress) — optional when Traefik serves lenr-sim-beta
api_prod_dns="$(dig +short api.conscious.energy A | grep -E '^[0-9.]+$' | head -1 || true)"
# dig may follow CNAME to WP parking; prefer answers that match share.
api_prod_all="$(dig +short api.conscious.energy A | tr '\n' ' ')"
if [[ "$api_prod_dns" == "$SHARE_IP" ]] || echo "$api_prod_all" | grep -Fq "$SHARE_IP"; then
  ok "api.conscious.energy A includes ${SHARE_IP}"
elif [[ "${ALLOW_API_DNS_GAP:-0}" == "1" ]]; then
  note "api.conscious.energy still '${api_prod_all:-unset}' (ALLOW_API_DNS_GAP=1 — Traefik traefik_extra_api_hosts / lenr-sim-beta)"
  beta_dns="$(dig +short lenr-sim-beta.conscious.energy A | grep -E '^[0-9.]+$' | head -1 || true)"
  if [[ "$beta_dns" == "$SHARE_IP" ]]; then
    ok "lenr-sim-beta.conscious.energy A → ${SHARE_IP} (cutover TLS path)"
  else
    bad "lenr-sim-beta DNS is '${beta_dns:-unset}' (need A → ${SHARE_IP} when api DNS lags)"
  fi
else
  bad "api.conscious.energy DNS is '${api_prod_all:-unset}' (need WordPress A → ${SHARE_IP} or ALLOW_API_DNS_GAP=1)"
fi

# 6) GHCR env or LOCAL_IMAGES=1
IMAGE_TAG="${BACKEND_IMAGE_TAG:-0.3.9-beta}"
SHARE_KEY="${SHARE_SSH_KEY:-${VPS_SSH_IDENTITY_FILE:-$HOME/.ssh/lenr-sim-share}}"
KVM1_KEY="${KVM1_SSH_KEY:-$HOME/.ssh/lenr-sim-staging}"
if [[ -n "${GHCR_USER:-}" && -n "${GHCR_TOKEN:-}" ]]; then
  ok "GHCR_USER + GHCR_TOKEN set"
elif [[ "${LOCAL_IMAGES:-0}" == "1" ]]; then
  ok "LOCAL_IMAGES=1 — cutover will docker build on share + load onto KVM1 (no GHCR)"
  if [[ "${SKIP_IMAGE_BUILD:-0}" == "1" ]]; then
    for pair in "share:${SHARE_KEY}:${SHARE_IP}" "kvm1:${KVM1_KEY}:${KVM1_IP}"; do
      role="${pair%%:*}"; rest="${pair#*:}"; key="${rest%%:*}"; host="${rest##*:}"
      if [[ -f "$key" ]] \
        && ssh -i "$key" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
             "root@${host}" \
             "docker image inspect ghcr.io/consciousenergy/lenr-sim-backend:${IMAGE_TAG} >/dev/null \
              && docker image inspect ghcr.io/consciousenergy/lenr-sim-frontend:${IMAGE_TAG} >/dev/null"; then
        ok "${role} has local backend+frontend :${IMAGE_TAG}"
      else
        note "${role} missing :${IMAGE_TAG} images (cutover will build/xfer)"
      fi
    done
  fi
else
  bad "GHCR_USER/GHCR_TOKEN unset (or set LOCAL_IMAGES=1 for on-manager build)"
fi

# 7) Share SSH (manager target)
if [[ -f "$SHARE_KEY" ]] \
  && ssh -i "$SHARE_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
       -o StrictHostKeyChecking=accept-new "root@${SHARE_IP}" 'echo ok' >/dev/null 2>&1; then
  ok "share SSH root@${SHARE_IP} via ${SHARE_KEY}"
else
  bad "share SSH unavailable (set SHARE_SSH_KEY or run hostinger-compose-unlock.py attach-key with AGENT_* paths)"
fi

# 7b) SPA still served on share (Compose today; Swarm after cutover)
spa="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 "${SHARE_URL}/" || echo 000)"
if [[ "$spa" == "200" ]]; then
  ok "share SPA ${SHARE_URL}/ → 200"
else
  bad "share SPA → ${spa}"
fi

# 7c) Compose Postgres volume that Swarm will reuse (external name)
if [[ -f "$SHARE_KEY" ]] \
  && ssh -i "$SHARE_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
       "root@${SHARE_IP}" \
       'docker volume inspect lenr-sim_postgres_data >/dev/null'; then
  ok "share volume lenr-sim_postgres_data present (Swarm postgres_volume_external)"
else
  bad "share missing docker volume lenr-sim_postgres_data"
fi

# 7d) Share UFW allows Swarm ports (worker join)
if [[ -f "$SHARE_KEY" ]] \
  && ssh -i "$SHARE_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
       "root@${SHARE_IP}" \
       'ufw status | grep -q "2377/tcp" && ufw status | grep -q "7946" && ufw status | grep -q "4789/udp"'; then
  ok "share UFW allows Swarm ports 2377/7946/4789"
else
  bad "share UFW missing Swarm ports (setup-docker.yml opens them; or ufw allow 2377/tcp 7946/tcp 7946/udp 4789/udp)"
fi

# 7e) Compose .env has DB + API secrets (values not printed)
if [[ -f "$SHARE_KEY" ]] \
  && ssh -i "$SHARE_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
       "root@${SHARE_IP}" \
       'f=/opt/lenr-sim/.env; test -f "$f" \
         && grep -qE "^LENR_DB_PASSWORD=.+" "$f" \
         && grep -qE "^LENR_SECRET_KEY=.+" "$f"'; then
  ok "share /opt/lenr-sim/.env has LENR_DB_PASSWORD + LENR_SECRET_KEY (for Swarm secrets)"
else
  bad "share /opt/lenr-sim/.env missing LENR_DB_PASSWORD or LENR_SECRET_KEY"
fi

# 8) Confirm gate reminder (never auto-set)
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
