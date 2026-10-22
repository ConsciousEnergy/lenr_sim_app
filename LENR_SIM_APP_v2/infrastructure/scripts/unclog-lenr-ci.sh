#!/usr/bin/env bash
# Recover a wedged dedicated lenr-ci runner (session conflict / no job pickup).
#
# Safe: touches ONLY Hostinger VM 2012566 (45.93.100.251). Never share 1280333.
# Never joins Swarm. Never sets CONFIRM_SWARM_*.
#
# Usage:
#   HOSTINGER_API_TOKEN=... ./unclog-lenr-ci.sh
#   HOSTINGER_API_TOKEN=... CI_SSH_KEY=~/.ssh/lenr-sim-share RESTART=1 ./unclog-lenr-ci.sh
#
# Env:
#   HOSTINGER_API_TOKEN  required for restart / ssh-key attach
#   CI_VM_ID             default 2012566
#   CI_IP                default 45.93.100.251
#   CI_SSH_KEY           default ~/.ssh/lenr-sim-share
#   RESTART              1 to POST .../restart (default 0 — prefer svc restart over SSH)
#   ATTACH_SSH_KEY       1 to POST pubkey to VM (default 1 when SSH fails)
#   OUT                  default /opt/cursor/artifacts/unclog-lenr-ci.log

set -euo pipefail

CI_VM_ID="${CI_VM_ID:-2012566}"
CI_IP="${CI_IP:-45.93.100.251}"
SHARE_VM_ID="${SHARE_VM_ID:-1280333}"
CI_SSH_KEY="${CI_SSH_KEY:-${HOME}/.ssh/lenr-sim-share}"
RESTART="${RESTART:-0}"
ATTACH_SSH_KEY="${ATTACH_SSH_KEY:-auto}"
OUT="${OUT:-/opt/cursor/artifacts/unclog-lenr-ci.log}"
API="https://developers.hostinger.com/api/vps/v1"
mkdir -p "$(dirname "$OUT")"
exec > >(tee "$OUT") 2>&1

echo "=== unclog-lenr-ci $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo "CI_VM_ID=${CI_VM_ID} CI_IP=${CI_IP} RESTART=${RESTART}"

if [[ "${CI_VM_ID}" == "${SHARE_VM_ID}" || "${CI_IP}" == "185.211.4.66" ]]; then
  echo "REFUSE: will not touch Compose share" >&2
  exit 2
fi

SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new)
[[ -f "${CI_SSH_KEY}" ]] && SSH_OPTS+=(-i "${CI_SSH_KEY}")

ssh_ok=0
if ssh "${SSH_OPTS[@]}" "root@${CI_IP}" 'echo ssh_ok' >/dev/null 2>&1; then
  ssh_ok=1
  echo "PASS: SSH to root@${CI_IP}"
else
  echo "WARN: SSH failed to root@${CI_IP}"
fi

if [[ -z "${HOSTINGER_API_TOKEN:-}" ]]; then
  echo "WARN: HOSTINGER_API_TOKEN unset — cannot restart/attach keys via API"
else
  state="$(curl -fsS -H "Authorization: Bearer ${HOSTINGER_API_TOKEN}" \
    "${API}/virtual-machines/${CI_VM_ID}" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("state","?"))')"
  echo "Hostinger state=${state}"
fi

do_attach=0
if [[ "${ATTACH_SSH_KEY}" == "1" ]]; then
  do_attach=1
elif [[ "${ATTACH_SSH_KEY}" == "auto" && "${ssh_ok}" -eq 0 ]]; then
  do_attach=1
fi

if [[ "${do_attach}" -eq 1 ]]; then
  if [[ -z "${HOSTINGER_API_TOKEN:-}" || ! -f "${CI_SSH_KEY}.pub" ]]; then
    echo "FAIL: attach needs HOSTINGER_API_TOKEN and ${CI_SSH_KEY}.pub" >&2
    exit 1
  fi
  echo "== attach SSH pubkey via Hostinger =="
  body="$(CI_SSH_KEY="${CI_SSH_KEY}" python3 -c 'import json,pathlib,os; p=pathlib.Path(os.environ["CI_SSH_KEY"]+".pub"); print(json.dumps({"keys":[p.read_text().strip()]}))')"
  curl -fsS -X POST \
    -H "Authorization: Bearer ${HOSTINGER_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${body}" \
    "${API}/virtual-machines/${CI_VM_ID}/ssh-keys" >/dev/null
  echo "PASS: ssh-keys POST"
  sleep 3
  if ssh "${SSH_OPTS[@]}" "root@${CI_IP}" 'echo ssh_ok' >/dev/null 2>&1; then
    ssh_ok=1
    echo "PASS: SSH after key attach"
  else
    echo "WARN: SSH still failing after key attach (may need RESTART=1)"
  fi
fi

if [[ "${RESTART}" == "1" ]]; then
  [[ -n "${HOSTINGER_API_TOKEN:-}" ]] || { echo "FAIL: RESTART=1 needs HOSTINGER_API_TOKEN" >&2; exit 1; }
  echo "== Hostinger ct_restart VM ${CI_VM_ID} =="
  curl -fsS -X POST \
    -H "Authorization: Bearer ${HOSTINGER_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{}' \
    "${API}/virtual-machines/${CI_VM_ID}/restart"
  echo
  for i in $(seq 1 24); do
    state="$(curl -fsS -H "Authorization: Bearer ${HOSTINGER_API_TOKEN}" \
      "${API}/virtual-machines/${CI_VM_ID}" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("state","?"))')"
    echo "  wait ${i}: state=${state}"
    [[ "${state}" == "running" ]] && break
    sleep 5
  done
  # Give sshd + runner service time after boot
  sleep 15
  ssh_ok=0
  if ssh "${SSH_OPTS[@]}" "root@${CI_IP}" 'echo ssh_ok' >/dev/null 2>&1; then
    ssh_ok=1
  fi
fi

if [[ "${ssh_ok}" -ne 1 ]]; then
  echo "FAIL: no SSH — cannot verify runner. Attach key / restart / check hPanel." >&2
  exit 1
fi

echo "== runner service =="
if [[ "${DO_SVC_RESTART:-0}" == "1" ]]; then
  echo "svc.sh stop/start on CI host"
  ssh "${SSH_OPTS[@]}" "root@${CI_IP}" '
    cd /opt/actions-runner && ./svc.sh stop || true
    sleep 3
    ./svc.sh start
    sleep 8
  '
fi

remote="$(ssh "${SSH_OPTS[@]}" "root@${CI_IP}" '
  set -e
  echo "hostname=$(hostname)"
  docker info --format "Swarm={{.Swarm.LocalNodeState}}" 2>/dev/null || echo "Swarm=?"
  test -f /opt/actions-runner/.runner && echo "runner_config=present" || echo "runner_config=MISSING"
  systemctl is-active actions.runner.ConsciousEnergy-lenr_sim_app.lenr-ci-1.service || true
  journalctl -u actions.runner.ConsciousEnergy-lenr_sim_app.lenr-ci-1.service -n 20 --no-pager | tail -20
')"
echo "${remote}"

if echo "${remote}" | grep -q 'Listening for Jobs'; then
  echo "PASS: Listening for Jobs"
elif echo "${remote}" | grep -qi 'session for this runner already exists'; then
  echo "WARN: session conflict — re-run with DO_SVC_RESTART=1 or RESTART=1"
  ssh "${SSH_OPTS[@]}" "root@${CI_IP}" '
    cd /opt/actions-runner && ./svc.sh stop || true
    sleep 3
    ./svc.sh start
    sleep 8
    journalctl -u actions.runner.ConsciousEnergy-lenr_sim_app.lenr-ci-1.service -n 20 --no-pager | tail -20
  '
else
  echo "WARN: Listening line not seen yet — check journal above"
fi

echo "=== done ==="
echo "Next: gh run list --branch <tip>  # confirm jobs leave queued"
