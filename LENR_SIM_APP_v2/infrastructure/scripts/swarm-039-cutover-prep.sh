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
  # Must be on all.vars (or every host) so deploy-stack installs DOCKER-USER on KVM1.
  if grep -vE '^[[:space:]]*#' "$PROD_INV" | grep -qE 'grafana_publish_host_port:[[:space:]]*[1-9]'; then
    ok "prod inventory sets grafana_publish_host_port (DOCKER-USER on observability node)"
  else
    bad "prod inventory missing grafana_publish_host_port — copy inventory.yml.example all.vars"
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
      elif [[ "${ALLOW_IMAGE_PRESTAGE_GAP:-0}" == "1" ]]; then
        note "${role} missing :${IMAGE_TAG} (ALLOW_IMAGE_PRESTAGE_GAP=1 — cutover refuses SKIP_IMAGE_BUILD without images)"
      else
        bad "${role} missing :${IMAGE_TAG} for SKIP_IMAGE_BUILD=1 (swarm-039-prestage-images.sh or ALLOW_IMAGE_PRESTAGE_GAP=1)"
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

# 7a) KVM1 SSH (leave staging + image load + worker join)
if [[ -f "$KVM1_KEY" ]] \
  && ssh -i "$KVM1_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
       -o StrictHostKeyChecking=accept-new "root@${KVM1_IP}" 'echo ok' >/dev/null 2>&1; then
  ok "kvm1 SSH root@${KVM1_IP} via ${KVM1_KEY}"
else
  bad "kvm1 SSH unavailable (set KVM1_SSH_KEY; needed for leave-staging + docker save|load)"
fi

# 7a2) Disk headroom for image load / Traefik + stack (GiB free on /)
MIN_FREE_GIB="${CUTOVER_MIN_FREE_GIB:-5}"
for pair in "share:${SHARE_KEY}:${SHARE_IP}" "kvm1:${KVM1_KEY}:${KVM1_IP}"; do
  role="${pair%%:*}"; rest="${pair#*:}"; key="${rest%%:*}"; host="${rest##*:}"
  [[ -f "$key" ]] || continue
  avail_kib="$(ssh -i "$key" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
    "root@${host}" "df -Pk / | awk 'NR==2{print \$4}'" 2>/dev/null || echo 0)"
  avail_gib=$(( ${avail_kib:-0} / 1024 / 1024 ))
  if [[ "$avail_gib" -ge "$MIN_FREE_GIB" ]]; then
    ok "${role} disk free ${avail_gib}GiB on / (≥${MIN_FREE_GIB})"
  else
    bad "${role} disk free ${avail_gib}GiB on / (need ≥${MIN_FREE_GIB}; docker system prune or raise CUTOVER_MIN_FREE_GIB)"
  fi
done

# 7b) SPA still served on share (Compose today; Swarm after cutover)
spa="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 "${SHARE_URL}/" || echo 000)"
if [[ "$spa" == "200" ]]; then
  ok "share SPA ${SHARE_URL}/ → 200"
else
  bad "share SPA → ${spa}"
fi

# 7b1) Traefik ACME host store pre-created on share (deploy-stack also ensures;
#      creating early shortens the cutover window and catches permission issues).
if [[ -f "$SHARE_KEY" ]]; then
  acme_prep="$(ssh -i "$SHARE_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
    "root@${SHARE_IP}" bash -s <<'EOS' 2>/dev/null || echo missing
set -euo pipefail
p=/opt/lenr-sim/traefik/certs/acme.json
d=/opt/lenr-sim/traefik/certs
if [[ ! -d "$d" || ! -f "$p" ]]; then
  echo missing
  exit 0
fi
python3 -c "import os,stat; m=stat.S_IMODE(os.stat('$p').st_mode); d=stat.S_IMODE(os.stat('$d').st_mode); print(f'ok dir={d:04o} file={m:04o}')"
EOS
)"
  acme_prep="$(printf '%s' "$acme_prep" | tr -d '\r' | tail -1)"
  case "$acme_prep" in
    ok\ dir=0700\ file=0600) ok "share Traefik ACME store ready (certs 0700, acme.json 0600)" ;;
    ok\ *)
      if [[ "${ALLOW_ACME_MODE_GAP:-0}" == "1" ]]; then
        note "share ACME store modes ${acme_prep} (ALLOW_ACME_MODE_GAP=1)"
      else
        bad "share ACME store modes not 0700/0600 (${acme_prep})"
      fi
      ;;
    *)
      if [[ "${ALLOW_ACME_PRESTAGE_GAP:-0}" == "1" ]]; then
        note "share ACME store missing (ALLOW_ACME_PRESTAGE_GAP=1 — deploy-stack will create)"
      else
        bad "share ACME store missing under /opt/lenr-sim/traefik/certs (mkdir+touch or ALLOW_ACME_PRESTAGE_GAP=1)"
      fi
      ;;
  esac
fi

# 7b2) Compose rollback tag matches live IMAGE_TAG (restore path after abort)
if [[ -f "$SHARE_KEY" ]]; then
  rb_meta="$(ssh -i "$SHARE_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
    "root@${SHARE_IP}" bash -s <<'EOS' 2>/dev/null || echo 'missing|missing'
set -euo pipefail
env_tag="$(grep -E '^IMAGE_TAG=' /opt/lenr-sim/.env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"'"'" || true)"
rb="$(cat /opt/lenr-sim/.rollback-image-tag 2>/dev/null || echo missing)"
printf '%s|%s\n' "${env_tag:-missing}" "$rb"
EOS
)"
  env_tag="${rb_meta%%|*}"; rb_tag="${rb_meta#*|}"
  env_tag="$(printf '%s' "$env_tag" | tr -d '\r\n')"
  rb_tag="$(printf '%s' "$rb_tag" | tr -d '\r\n')"
  if [[ -n "$env_tag" && "$env_tag" != "missing" && "$env_tag" == "$rb_tag" ]]; then
    ok "share rollback tag ${rb_tag} matches IMAGE_TAG (Compose restore)"
  elif [[ "${ALLOW_ROLLBACK_TAG_GAP:-0}" == "1" ]]; then
    note "rollback tag '${rb_tag}' != IMAGE_TAG '${env_tag}' (ALLOW_ROLLBACK_TAG_GAP=1)"
  else
    bad "share rollback tag '${rb_tag}' != IMAGE_TAG '${env_tag}' (set .rollback-image-tag or ALLOW_ROLLBACK_TAG_GAP=1)"
  fi
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

# 7c2) Prod inventory pins Postgres to share via postgres=true label
if grep -vE '^[[:space:]]*#' "$PROD_INV" | grep -qE 'postgres=true'; then
  ok "prod inventory includes postgres=true label (pin external DB volume to share)"
else
  bad "prod inventory missing postgres=true on share manager (required with postgres_volume_external)"
fi

# 7d) Share + KVM1 UFW allow Swarm ports (manager↔worker gossip / overlay)
ufw_swarm_check='ufw status | grep -q "2377/tcp" && ufw status | grep -q "7946" && ufw status | grep -q "4789/udp"'
for pair in "share:${SHARE_KEY}:${SHARE_IP}" "kvm1:${KVM1_KEY}:${KVM1_IP}"; do
  role="${pair%%:*}"; rest="${pair#*:}"; key="${rest%%:*}"; host="${rest##*:}"
  if [[ -f "$key" ]] \
    && ssh -i "$key" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
         "root@${host}" "$ufw_swarm_check" >/dev/null 2>&1; then
    ok "${role} UFW allows Swarm ports 2377/7946/4789"
  elif [[ -f "$key" ]]; then
    bad "${role} UFW missing Swarm ports (setup-docker.yml / join-workers opens them; or ufw allow 2377/tcp 7946/tcp 7946/udp 4789/udp)"
  fi
done

# 7d2) KVM1 → share TCP path for Swarm control/gossip (temp listeners; nothing
# listens until swarm init, so a plain nc to closed ports would false-fail).
# Skip with SKIP_SWARM_PORT_PROBE=1. UDP 4789 (VXLAN) not probed here.
# OpenBSD netcat: listen is `nc -l PORT` ( -p is source port).
if [[ "${SKIP_SWARM_PORT_PROBE:-0}" == "1" ]]; then
  note "SKIP_SWARM_PORT_PROBE=1 — skip KVM1→share Swarm TCP path probe"
elif [[ -f "$SHARE_KEY" && -f "$KVM1_KEY" ]]; then
  path_ok=1
  for port in 2377 7946; do
    # Expand $port into the remote script (unquoted heredoc delimiter).
    if ! ssh -i "$SHARE_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
      "root@${SHARE_IP}" bash -s <<EOS
set -euo pipefail
port=${port}
pkill -f "nc -l \${port}" 2>/dev/null || true
pkill -f "nc -l -p \${port}" 2>/dev/null || true
# Prefer OpenBSD positional listen; fall back to -p for GNU-ish builds.
( timeout 20 nc -l "\$port" || timeout 20 nc -l -p "\$port" ) >/dev/null 2>&1 &
sleep 1
ss -lnt | grep -q ":\${port} "
EOS
    then
      path_ok=0
      note "share could not bind temp listener on ${port}"
      ssh -i "$SHARE_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
        "root@${SHARE_IP}" "pkill -f 'nc -l ${port}' 2>/dev/null || true; pkill -f 'nc -l -p ${port}' 2>/dev/null || true" \
        >/dev/null 2>&1 || true
      continue
    fi
    if ! ssh -i "$KVM1_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
         "root@${KVM1_IP}" \
         "timeout 5 nc -zw3 ${SHARE_IP} ${port}" >/dev/null 2>&1; then
      path_ok=0
      note "KVM1 cannot reach share TCP ${port} (firewall/path)"
    fi
    ssh -i "$SHARE_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
      "root@${SHARE_IP}" \
      "pkill -f 'nc -l ${port}' 2>/dev/null || true; pkill -f 'nc -l -p ${port}' 2>/dev/null || true" \
      >/dev/null 2>&1 || true
  done
  if [[ "$path_ok" -eq 1 ]]; then
    ok "KVM1→share Swarm TCP path (2377/7946) reachable via temp listeners"
  else
    bad "KVM1→share Swarm TCP path blocked (need 2377/tcp + 7946/tcp from ${KVM1_IP} → ${SHARE_IP})"
  fi
else
  note "SSH keys missing — skip KVM1→share Swarm TCP path probe"
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

# 7e2) Grafana admin password source (cutover mints Swarm secret if absent)
if [[ -f "$SHARE_KEY" ]]; then
  gf_src="$(ssh -i "$SHARE_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
    "root@${SHARE_IP}" bash -s <<'EOS' 2>/dev/null || true
f=/opt/lenr-sim/.env
p=/opt/lenr-sim/.grafana-admin-password
if [[ -f "$p" ]] && [[ -s "$p" ]]; then echo file; exit 0; fi
if [[ -f "$f" ]] && grep -qE '^GRAFANA_ADMIN_PASSWORD=.+' "$f"; then echo env; exit 0; fi
echo missing
EOS
)"
  gf_src="$(printf '%s' "$gf_src" | tr -d '\r' | tail -1)"
  case "$gf_src" in
    env) ok "share GRAFANA_ADMIN_PASSWORD present in .env (cutover → Swarm secret)" ;;
    file) ok "share /opt/lenr-sim/.grafana-admin-password present (cutover → Swarm secret)" ;;
    *) note "share GRAFANA_ADMIN_PASSWORD unset — cutover will mint + write .env + Swarm secret" ;;
  esac
fi

# 7f) Observability scaffolds on share + KVM1 (deploy-stack also syncs; prestage shortens window)
obs_check='test -f /opt/lenr-sim/observability/prometheus/prometheus.yml \
  && test -d /opt/lenr-sim/observability/grafana/provisioning'
for pair in "share:${SHARE_KEY}:${SHARE_IP}" "kvm1:${KVM1_KEY}:${KVM1_IP}"; do
  role="${pair%%:*}"; rest="${pair#*:}"; key="${rest%%:*}"; host="${rest##*:}"
  [[ -f "$key" ]] || continue
  if ssh -i "$key" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
       "root@${host}" "$obs_check" >/dev/null 2>&1; then
    ok "${role} observability scaffolds present (/opt/lenr-sim/observability)"
  elif [[ "${ALLOW_OBS_PRESTAGE_GAP:-0}" == "1" ]]; then
    note "${role} observability scaffolds missing (ALLOW_OBS_PRESTAGE_GAP=1 — deploy-stack will sync)"
  else
    bad "${role} missing /opt/lenr-sim/observability scaffolds (rsync infrastructure/observability/ or ALLOW_OBS_PRESTAGE_GAP=1)"
  fi
done

# 7g) Staging Grafana reachable on KVM1 (prove obs before 0.3.9 arming)
# Prefer host-published :3000 (SSH tunnel target); fall back to docker exec.
if [[ -f "$KVM1_KEY" ]]; then
  gf_code="$(ssh -i "$KVM1_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
    "root@${KVM1_IP}" bash -s <<'EOS' 2>/dev/null || true
set -euo pipefail
code=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 3 http://127.0.0.1:3000/login 2>/dev/null || echo 000)
if [[ "$code" == "200" ]]; then echo "$code"; exit 0; fi
cid=$(docker ps -q -f name=lenr-sim_grafana | head -1 || true)
if [[ -n "$cid" ]]; then
  docker exec "$cid" wget -qO- -S http://127.0.0.1:3000/login 2>&1 | head -1 | grep -q '200\|HTTP' \
    && echo exec-ok && exit 0
fi
echo "$code"
EOS
)"
  gf_code="$(printf '%s' "$gf_code" | tr -d '\r' | tail -1)"
  case "$gf_code" in
    200) ok "staging Grafana login HTTP 200 on KVM1 :3000 (SSH tunnel ready)" ;;
    exec-ok)
      if [[ "${ALLOW_GRAFANA_PUBLISH_GAP:-0}" == "1" ]]; then
        note "staging Grafana up in-container only (ALLOW_GRAFANA_PUBLISH_GAP=1 — redeploy with grafana_publish_host_port)"
      else
        bad "staging Grafana not on KVM1 :3000 (redeploy staging stack with grafana_publish_host_port=3000 or ALLOW_GRAFANA_PUBLISH_GAP=1)"
      fi
      ;;
    *)
      if [[ "${ALLOW_GRAFANA_PUBLISH_GAP:-0}" == "1" ]]; then
        note "staging Grafana not reachable (${gf_code}; ALLOW_GRAFANA_PUBLISH_GAP=1)"
      else
        bad "staging Grafana not reachable on KVM1 (${gf_code}) — refresh under CONFIRM_SWARM_0_3_8 before cutover"
      fi
      ;;
  esac
  # Docker host-mode publishes bypass UFW — Grafana must not answer on the public IP.
  if [[ -f "$SHARE_KEY" ]]; then
    ext_gf="$(ssh -i "$SHARE_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
      "root@${SHARE_IP}" \
      "curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 3 --max-time 5 http://${KVM1_IP}:3000/login" \
      2>/dev/null || echo fail)"
    ext_gf="$(printf '%s' "$ext_gf" | tr -d '\r' | tail -1)"
    if [[ "$ext_gf" == "200" ]]; then
      bad "Grafana :3000 reachable from share on ${KVM1_IP} — install DOCKER-USER DROP (Docker bypasses UFW)"
    else
      ok "Grafana :3000 not reachable from share (${ext_gf}) — localhost/SSH tunnel only"
    fi
  fi
  # Guard unit must be enabled on the node that hosts Grafana (staging=KVM1 manager).
  gf_unit="$(ssh -i "$KVM1_KEY" -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
    "root@${KVM1_IP}" 'systemctl is-enabled lenr-grafana-localhost.service 2>/dev/null || echo missing' \
    2>/dev/null | tr -d '\r' | tail -1)"
  if [[ "$gf_unit" == "enabled" ]]; then
    ok "KVM1 lenr-grafana-localhost.service enabled (DOCKER-USER persist)"
  else
    bad "KVM1 lenr-grafana-localhost.service not enabled (${gf_unit}) — redeploy staging under CONFIRM_SWARM_0_3_8"
  fi
  # Optional: D-Force present on operator PATH (not required on VMs)
  if command -v d4s >/dev/null 2>&1; then
    d4s_ver="$(d4s version 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | awk '/Version:/{print $2; exit}')"
    ok "D-Force (d4s) on PATH (${d4s_ver:-present}) — operator TUI"
  else
    note "D-Force (d4s) not on PATH — optional; see docs/v0.3.8-beta/D4S_DFORCE_OPERATOR.md"
  fi
fi

# 8) Prod stack render invariants (postgres pin, external volume, SPA PathPrefix)
# Prefer example inventory in CI; use live inventory.yml when present (operator).
if command -v ansible-playbook >/dev/null 2>&1; then
  if bash "$(dirname "${BASH_SOURCE[0]}")/swarm-039-assert-prod-stack-render.sh"; then
    ok "prod stack render invariants (postgres/SPA/ACME + Grafana/Prometheus)"
  else
    bad "prod stack render invariants failed (see swarm-039-assert-prod-stack-render.sh)"
  fi
else
  note "ansible-playbook missing — skip prod stack render assert (CI/local dry-run covers this)"
fi

# 9) Confirm gate reminder (never auto-set)
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
