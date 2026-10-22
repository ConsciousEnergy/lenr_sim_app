#!/usr/bin/env bash
# Post-cutover evidence for v0.3.9 public Swarm (share manager + KVM1 worker).
# Exit 0 only when topology + labels + HTTP health match the cutover contract.
# Never sets CONFIRM_SWARM_*. Safe to re-run after an armed cutover.
#
# Usage:
#   ALLOW_API_DNS_GAP=1 ./swarm-039-post-cutover-verify.sh
#   OUT=/opt/cursor/artifacts/swarm-039-post-cutover.log ./swarm-039-post-cutover-verify.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARE_IP="${SHARE_IP:-185.211.4.66}"
KVM1_IP="${KVM1_IP:-31.220.55.113}"
CI_IP="${CI_IP:-45.93.100.251}"
SHARE_URL="${LIVE_COMPOSE_URL:-https://lenr-sim-beta.conscious.energy}"
SHARE_KEY="${SHARE_SSH_KEY:-${VPS_SSH_IDENTITY_FILE:-$HOME/.ssh/lenr-sim-share}}"
KVM1_KEY="${KVM1_SSH_KEY:-$HOME/.ssh/lenr-sim-staging}"
STACK="${STACK_NAME:-lenr-sim}"
OUT="${OUT:-/opt/cursor/artifacts/swarm-039-post-cutover-verify.log}"
mkdir -p "$(dirname "$OUT")"
exec > >(tee "$OUT") 2>&1

red() { printf '\033[0;31m%s\033[0m\n' "$*"; }
grn() { printf '\033[0;32m%s\033[0m\n' "$*"; }
yel() { printf '\033[0;33m%s\033[0m\n' "$*"; }

fail=0
ok() { grn "OK  $*"; }
bad() { red "BAD $*"; fail=1; }

ssh_share() {
  ssh -i "$SHARE_KEY" -o BatchMode=yes -o ConnectTimeout=12 -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=accept-new "root@${SHARE_IP}" "$@"
}
ssh_kvm1() {
  ssh -i "$KVM1_KEY" -o BatchMode=yes -o ConnectTimeout=12 -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=accept-new "root@${KVM1_IP}" "$@"
}

echo "=== swarm-039 post-cutover verify $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo "share=${SHARE_IP} kvm1=${KVM1_IP} ci=${CI_IP} (must stay outside Swarm)"
echo

# 1) Share is active Swarm manager
share_state="$(ssh_share 'docker info --format "{{.Swarm.LocalNodeState}} {{.Swarm.ControlAvailable}}"')"
if [[ "$share_state" == "active true" ]]; then
  ok "share Swarm active manager ($share_state)"
else
  bad "share Swarm expected 'active true', got '${share_state}'"
fi

# 2) KVM1 is active worker (not manager)
kvm1_state="$(ssh_kvm1 'docker info --format "{{.Swarm.LocalNodeState}} {{.Swarm.ControlAvailable}}"')"
if [[ "$kvm1_state" == "active false" ]]; then
  ok "kvm1 Swarm active worker ($kvm1_state)"
elif [[ "$kvm1_state" == "active true" ]]; then
  bad "kvm1 is still a manager ($kvm1_state) — expected worker after cutover"
else
  bad "kvm1 Swarm expected 'active false', got '${kvm1_state}'"
fi

# 3) CI never joined
ci_probe="$(ssh -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes \
  -i "$SHARE_KEY" "root@${CI_IP}" \
  'docker info --format "{{.Swarm.LocalNodeState}}"' 2>/dev/null || echo unreachable)"
if [[ "$ci_probe" == "inactive" || "$ci_probe" == "unreachable" ]]; then
  ok "CI Swarm state=${ci_probe} (outside cluster)"
else
  bad "CI Swarm state=${ci_probe} — CI must never join Swarm"
fi

# 4) Two Ready nodes; labels present
node_dump="$(ssh_share 'docker node ls --format "{{.Hostname}} {{.Status}} {{.Availability}} {{.ManagerStatus}}" 2>/dev/null; echo ---; docker node ls -q 2>/dev/null | while read -r id; do docker node inspect "$id" --format "{{.Description.Hostname}} {{.Status.Addr}} {{json .Spec.Labels}}"; done' || true)"
echo "$node_dump"
ready_count="$(echo "$node_dump" | grep -c ' Ready ' || true)"
if [[ "$ready_count" -ge 2 ]]; then
  ok "Swarm has ${ready_count} Ready nodes"
else
  bad "expected ≥2 Ready nodes, found ${ready_count}"
fi
echo "$node_dump" | grep -q '"app":"true"' && ok "label app=true present" || bad "missing app=true"
echo "$node_dump" | grep -q '"observability":"true"' && ok "label observability=true present" || bad "missing observability=true"
echo "$node_dump" | grep -q '"postgres":"true"' && ok "label postgres=true present" || bad "missing postgres=true (external volume pin)"

# 5) Stack services fully replicated
svc="$(ssh_share "docker stack services ${STACK} --format '{{.Name}}={{.Replicas}}'" 2>/dev/null || true)"
echo "$svc"
if echo "$svc" | grep -q .; then
  bad_reps=0
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    reps="${line#*=}"
    cur="${reps%%/*}"; want="${reps##*/}"
    if [[ "$cur" != "$want" ]]; then
      bad "service ${line}"
      bad_reps=1
    fi
  done <<< "$svc"
  [[ "$bad_reps" -eq 0 ]] && ok "all ${STACK} services fully replicated"
else
  bad "no stack services for ${STACK}"
fi

# 6) Postgres task on share (Compose volume is node-local there)
pg_node="$(ssh_share "docker service ps ${STACK}_postgres --filter desired-state=running --format '{{.Node}}' | head -1" || true)"
share_host="$(ssh_share 'hostname')"
pg_addr="$(ssh_share "docker node ls -q | while read -r id; do
  h=\$(docker node inspect \"\$id\" --format '{{.Description.Hostname}}')
  a=\$(docker node inspect \"\$id\" --format '{{.Status.Addr}}')
  if [ \"\$h\" = '${pg_node}' ]; then echo \"\$a\"; break; fi
done" || true)"
echo "postgres running on node=${pg_node:-none} addr=${pg_addr:-?} share_host=${share_host}"
if [[ -n "$pg_node" && ( "$pg_addr" == "$SHARE_IP" || "$pg_node" == "$share_host" ) ]]; then
  ok "postgres task on share (${pg_node} / ${pg_addr:-hostname})"
else
  bad "postgres on ${pg_node:-none}/${pg_addr:-?} — must be share ${SHARE_IP} (${share_host}) for external volume"
fi

# 7) HTTP health (retry briefly — Traefik ACME / task start can lag)
HTTP_RETRIES="${HTTP_RETRIES:-12}"
HTTP_SLEEP="${HTTP_SLEEP:-10}"
share_api=000
spa=000
for ((i=1; i<=HTTP_RETRIES; i++)); do
  share_api="$(curl -sk -o /dev/null -w '%{http_code}' --connect-timeout 15 "${SHARE_URL}/api/health" || echo 000)"
  spa="$(curl -sk -o /dev/null -w '%{http_code}' --connect-timeout 15 "${SHARE_URL}/" || echo 000)"
  if [[ "$share_api" == "200" && "$spa" == "200" ]]; then
    break
  fi
  yel "HTTP not ready yet api=${share_api} spa=${spa} (try ${i}/${HTTP_RETRIES})"
  sleep "$HTTP_SLEEP"
done
api_prod="$(curl -sk -o /dev/null -w '%{http_code}' --connect-timeout 15 https://api.conscious.energy/api/health || echo 000)"
echo "share /api/health → ${share_api}"
echo "share SPA / → ${spa}"
echo "api.conscious.energy → ${api_prod}"

if [[ "$share_api" == "200" && "$spa" == "200" ]]; then
  ok "share SPA + /api/health → 200"
else
  bad "share health share_api=${share_api} spa=${spa}"
fi
if [[ "$api_prod" == "200" ]]; then
  ok "api.conscious.energy → 200"
elif [[ "${ALLOW_API_DNS_GAP:-0}" == "1" ]]; then
  yel "api.conscious.energy → ${api_prod} (ALLOW_API_DNS_GAP=1)"
else
  bad "api.conscious.energy → ${api_prod} (set ALLOW_API_DNS_GAP=1 if WP DNS lags)"
fi

# 8) Traefik ACME persist on share manager (host bind for /certs/acme.json)
acme_meta="$(ssh_share 'python3 -c "
import os, stat
p = \"/opt/lenr-sim/traefik/certs/acme.json\"
if not os.path.isfile(p):
    print(\"missing\")
else:
    mode = stat.S_IMODE(os.stat(p).st_mode)
    size = os.path.getsize(p)
    print(f\"ok mode={mode:04o} size={size}\")
"' 2>/dev/null || echo unreachable)"
echo "acme.json → ${acme_meta}"
case "$acme_meta" in
  ok\ mode=0600*) ok "Traefik acme.json present mode 0600 on share" ;;
  ok\ mode=*) bad "acme.json mode not 0600 (${acme_meta})" ;;
  *) bad "acme.json missing or unreadable (${acme_meta})" ;;
esac

# 9) Compose project should be down on share (no name=lenr-sim leftovers from compose)
compose_left="$(ssh_share 'docker ps -q -f name=lenr-sim | wc -l')"
# Swarm tasks also match name=lenr-sim — count only compose-style project labels if possible
compose_proj="$(ssh_share 'docker ps -q -f label=com.docker.compose.project=lenr-sim | wc -l')"
if [[ "${compose_proj// /}" == "0" ]]; then
  ok "no Compose project containers (label com.docker.compose.project=lenr-sim)"
else
  bad "${compose_proj} Compose project containers still running (port clash risk)"
fi

echo
if [[ "$fail" -eq 0 ]]; then
  grn "POST-CUTOVER GREEN — topology + health evidence OK"
  echo "Keep Compose volumes for rollback. Do not close EQ-OPEN-*."
  exit 0
fi
red "POST-CUTOVER RED — fix BAD lines before declaring cutover complete"
exit 1
