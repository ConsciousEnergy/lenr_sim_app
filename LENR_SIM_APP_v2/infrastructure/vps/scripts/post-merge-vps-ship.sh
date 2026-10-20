#!/usr/bin/env bash
# Post-merge VPS ship helper for Compose share after #196/#197/#198 (KM auto + P0).
#
# Default mode is plan-only (prints commands). Never force-pushes or dispatches
# deploy unless EXECUTE=1 AND CONFIRM is set.
#
# Usage (repo root):
#   ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh
#   ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh check
#   ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh verify-live
#   CONFIRM=I_SHIP_VPS_0_3_8 EXECUTE=1 \
#     ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ship
#   # Direct SSH when VPS_SSH_KEY or VPS_SSH_IDENTITY_FILE is set (preferred;
#   # bypasses GitHub Actions billing). VPS_HOST defaults to the public share A.
#   CONFIRM=I_SHIP_VPS_0_3_8 EXECUTE=1 \
#     ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ssh-ship
#
# ship: workflow_dispatch, else repository_dispatch vps-compose-ship.
# ssh-ship: SSH as root@$VPS_HOST and run infrastructure/vps/scripts/deploy.sh
#   (same pin/IMAGE_TAG path as Actions deploy-vps).
#   Identity: VPS_SSH_IDENTITY_FILE=/path/to/key  OR  VPS_SSH_KEY=<pem/openssh>
set -euo pipefail

REPO="${MERGE_TRAIN_REPO:-ConsciousEnergy/lenr_sim_app}"
VPS_BRANCH="${MERGE_TRAIN_VPS_BRANCH:-consciousenergy/vps-public-beta-rebase-98d8}"
TRAIN_PRS=(196 197 198)
EXPECT_VERSION="${EXPECT_VERSION:-0.3.8-beta}"
MODE="${1:-plan}"
CONFIRM_TOKEN="I_SHIP_VPS_0_3_8"
SHIP_REF="${SHIP_REF:-main}"
SHIP_VIA_VPS_BRANCH="${SHIP_VIA_VPS_BRANCH:-0}"
# Public Compose share A → VPS (lenr-sim-beta.conscious.energy). Override with VPS_HOST.
DEFAULT_VPS_HOST="185.211.4.66"

need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: missing $1" >&2; exit 2; }; }
need git

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

APP_VERSION_FILE="LENR_SIM_APP_v2/backend/app/core/config.py"
VERIFY_SCRIPT="LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh"
PROBE_NOTE="Post-ship: POST /api/physics/bubble-fusion with dynamics_mode=auto at high drive; expect km_auto_selected when Mach≥0.3."

read_app_version_at() {
  local ref="$1"
  git show "${ref}:${APP_VERSION_FILE}" \
    | grep -oP 'APP_VERSION:\s*str\s*=\s*"\K[^"]+' \
    || true
}

train_merged() {
  need gh
  local n state
  for n in "${TRAIN_PRS[@]}"; do
    state="$(gh pr view "$n" --repo "$REPO" --json state -q .state)"
    if [[ "$state" != "MERGED" ]]; then
      echo "PR #$n state=$state (want MERGED)"
      return 1
    fi
  done
  return 0
}

require_confirm_execute() {
  if [[ "${CONFIRM:-}" != "$CONFIRM_TOKEN" ]]; then
    echo "ERROR: refuse ship without CONFIRM=${CONFIRM_TOKEN}" >&2
    exit 2
  fi
  if [[ "${EXECUTE:-0}" != "1" ]]; then
    echo "ERROR: refuse ship without EXECUTE=1 (default is plan-only)" >&2
    exit 2
  fi
}

print_plan() {
  cat <<EOF
==> Post-merge VPS Compose ship plan (human-gated) — after #196/#197/#198

# A) Confirm phase-1 + P0 PRs are on main:
gh pr view 196 --json state,mergedAt
gh pr view 197 --json state,mergedAt
gh pr view 198 --json state,mergedAt

# B) Prefer direct SSH when VPS_SSH_KEY is set (host defaults to ${DEFAULT_VPS_HOST}):
CONFIRM=${CONFIRM_TOKEN} EXECUTE=1 \\
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ssh-ship

# C) Or Actions ship (needs repo secrets + billing restored):
CONFIRM=${CONFIRM_TOKEN} EXECUTE=1 \\
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ship

# ${PROBE_NOTE}
# See docs/v0.3.8-beta/COMPOSE_SHIP_HANDOFF.md
EOF
}

cmd_check() {
  need gh
  echo "==> Fetch origin"
  git fetch --quiet origin main "$VPS_BRANCH" || true

  local main_ver main_sha vps_sha
  main_sha="$(git rev-parse --short origin/main)"
  vps_sha="$(git rev-parse --short origin/"$VPS_BRANCH" 2>/dev/null || echo missing)"
  main_ver="$(read_app_version_at origin/main)"

  echo "main@$main_sha APP_VERSION=${main_ver:-?}"
  echo "vps@$vps_sha"
  echo "EXPECT_VERSION=$EXPECT_VERSION SHIP_REF=$SHIP_REF"
  echo "VPS_HOST env: ${VPS_HOST:+set}${VPS_HOST:-MISSING (default ${DEFAULT_VPS_HOST})}"
  echo "VPS_SSH_KEY env: $([[ -n "${VPS_SSH_KEY:-}" ]] && echo set || echo MISSING)"
  echo "ssh-ship resolved host: $(resolve_vps_host)"

  if train_merged; then
    echo "OK: #196/#197/#198 MERGED"
  else
    echo "BLOCKED: train not fully merged"
  fi

  if [[ "${main_ver:-}" == "$EXPECT_VERSION" ]]; then
    echo "OK: origin/main carries $EXPECT_VERSION"
  else
    echo "NOTE: origin/main APP_VERSION=${main_ver:-missing} (EXPECT_VERSION=$EXPECT_VERSION)"
  fi

  echo "Live KM probe after ship: $PROBE_NOTE"
}

cmd_verify_live() {
  if [[ ! -x "$VERIFY_SCRIPT" ]]; then
    echo "ERROR: missing executable $VERIFY_SCRIPT" >&2
    exit 2
  fi
  echo "==> Probing live share (EXPECT_VERSION=${EXPECT_VERSION})"
  EXPECT_VERSION="$EXPECT_VERSION" "./$VERIFY_SCRIPT"
  echo "==> $PROBE_NOTE"
}

cmd_probe_km() {
  local base="${BETA_SHARE_URL:-https://lenr-sim-beta.conscious.energy}"
  echo "==> KM auto probe on $base"
  BETA_SHARE_URL="$base" python3 - <<'PY'
import json, os, sys, urllib.request
base = os.environ["BETA_SHARE_URL"].rstrip("/")
with urllib.request.urlopen(base + "/api/physics/bubble-fusion/defaults", timeout=30) as r:
    defaults = json.load(r)
modes = (defaults.get("options") or {}).get("dynamics_modes") or []
default_mode = (defaults.get("defaults") or {}).get("dynamics_mode")
print("defaults.dynamics_mode=", default_mode)
print("options.dynamics_modes=", modes)
if "auto" not in modes and default_mode != "auto":
    print("FAIL: live build does not advertise dynamics_mode=auto", file=sys.stderr)
    sys.exit(1)
payload = {
    "initial_radius_um": 10.0,
    "acoustic_pressure_bar": 4.0,
    "frequency_khz": 20.0,
    "ambient_pressure_bar": 1.0,
    "ambient_temperature_k": 298.0,
    "fluid_type": "water",
    "gas_type": "deuterium",
    "gas_fraction": 0.8,
    "dynamics_mode": "auto",
}
req = urllib.request.Request(
    base + "/api/physics/bubble-fusion",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(req, timeout=120) as r:
    data = json.load(r)
dyn = data.get("dynamics") or {}
print(json.dumps(dyn, indent=2))
if not dyn.get("km_auto_selected"):
    print("FAIL: expected km_auto_selected at 4 bar auto", file=sys.stderr)
    sys.exit(1)
if dyn.get("dynamics_mode_used") != "keller_miksis":
    print("FAIL: expected dynamics_mode_used=keller_miksis", file=sys.stderr)
    sys.exit(1)
print("OK: KM auto live")
PY
}

resolve_vps_host() {
  # Prefer explicit env; else public share A record (not a secret).
  if [[ -n "${VPS_HOST:-}" ]]; then
    printf '%s\n' "$VPS_HOST"
    return 0
  fi
  printf '%s\n' "$DEFAULT_VPS_HOST"
}

cmd_ssh_ship() {
  require_confirm_execute
  need ssh
  # Prefer identity file (agent key on disk) over embedding private key in env.
  if [[ -z "${VPS_SSH_KEY:-}" && -z "${VPS_SSH_IDENTITY_FILE:-}" ]]; then
    echo "ERROR: ssh-ship requires VPS_SSH_KEY or VPS_SSH_IDENTITY_FILE" >&2
    echo "NOTE: VPS_HOST defaults to ${DEFAULT_VPS_HOST} (lenr-sim-beta A record)" >&2
    exit 2
  fi
  local vps_host
  vps_host="$(resolve_vps_host)"

  git fetch origin "$SHIP_REF" 2>/dev/null || git fetch origin
  local deploy_sha image_tag ship_rev
  # SHIP_REF may be a branch name (main), remote ref (origin/main), or SHA.
  if git rev-parse --verify -q "origin/${SHIP_REF}" >/dev/null; then
    ship_rev="origin/${SHIP_REF}"
  elif git rev-parse --verify -q "${SHIP_REF}" >/dev/null; then
    ship_rev="${SHIP_REF}"
  else
    echo "ERROR: cannot resolve SHIP_REF=${SHIP_REF}" >&2
    exit 1
  fi
  deploy_sha="$(git rev-parse "${ship_rev}")"
  image_tag="$(read_app_version_at "${ship_rev}")"
  if [[ -z "$image_tag" ]]; then
    echo "ERROR: could not read APP_VERSION from ${ship_rev}" >&2
    exit 1
  fi
  if [[ "${ALLOW_UNMERGED:-0}" != "1" ]]; then
    train_merged || {
      echo "ERROR: #196/#197/#198 not MERGED; will not ship" >&2
      exit 1
    }
    if [[ "$image_tag" != "$EXPECT_VERSION" ]]; then
      echo "ERROR: ${ship_rev} APP_VERSION=$image_tag (want $EXPECT_VERSION)" >&2
      exit 1
    fi
  else
    echo "WARN: ALLOW_UNMERGED=1 — shipping ${ship_rev} (@${deploy_sha}) IMAGE_TAG=${image_tag}"
  fi

  # Global path so EXIT trap is safe under `set -u` after function return.
  _SSH_KEY_TMP=""
  _SSH_KEY_OWNED=0
  if [[ -n "${VPS_SSH_IDENTITY_FILE:-}" ]]; then
    if [[ ! -f "$VPS_SSH_IDENTITY_FILE" ]]; then
      echo "ERROR: VPS_SSH_IDENTITY_FILE not found: $VPS_SSH_IDENTITY_FILE" >&2
      exit 2
    fi
    _SSH_KEY_TMP="$VPS_SSH_IDENTITY_FILE"
  else
    _SSH_KEY_TMP="$(mktemp)"
    _SSH_KEY_OWNED=1
    umask 077
    printf '%s\n' "$VPS_SSH_KEY" > "$_SSH_KEY_TMP"
  fi
  cleanup_ssh_key() {
    if [[ "${_SSH_KEY_OWNED:-0}" == "1" && -n "${_SSH_KEY_TMP:-}" ]]; then
      rm -f "$_SSH_KEY_TMP"
    fi
  }
  trap cleanup_ssh_key EXIT

  echo "==> SSH deploy to root@${vps_host} IMAGE_TAG=${image_tag} SHA=${deploy_sha}"
  ssh -i "$_SSH_KEY_TMP" -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes \
    "root@${vps_host}" \
    "set -euo pipefail
     cd /opt/lenr-sim/src
     git fetch --prune origin
     if ! git cat-file -e '${deploy_sha}^{commit}' 2>/dev/null; then
       git fetch origin '${deploy_sha}'
     fi
     git checkout -qf '${deploy_sha}'
     echo \"VPS HEAD=\$(git rev-parse --short HEAD) (pinned to ${deploy_sha})\"
     LENR_ENV_FILE=/opt/lenr-sim/.env \
       IMAGE_TAG='${image_tag}' \
       UPDATE_ENV_IMAGE_TAG=1 \
       EXPECT_VERSION='${image_tag}' \
       LENR_SIM_APP_v2/infrastructure/vps/scripts/deploy.sh"

  cmd_verify_live
  cmd_probe_km
}

cmd_ship() {
  need gh
  require_confirm_execute

  git fetch origin main "$VPS_BRANCH" || git fetch origin main

  if [[ "${ALLOW_UNMERGED:-0}" != "1" ]]; then
    train_merged || {
      echo "ERROR: train not MERGED; will not ship" >&2
      exit 1
    }
    local main_ver
    main_ver="$(read_app_version_at origin/main)"
    if [[ "$main_ver" != "$EXPECT_VERSION" ]]; then
      echo "ERROR: origin/main APP_VERSION=$main_ver (want $EXPECT_VERSION)" >&2
      exit 1
    fi
  else
    echo "WARN: ALLOW_UNMERGED=1 — skipping MERGED/version gates"
  fi

  # Prefer direct SSH when key is present (avoids Actions billing / empty secrets).
  # If the local key is unauthorized (Permission denied), fall through to Actions
  # so a retry can still succeed once repo VPS_* secrets are set.
  if [[ -n "${VPS_SSH_KEY:-}" || -n "${VPS_SSH_IDENTITY_FILE:-}" ]]; then
    echo "NOTE: SSH identity present — trying ssh-ship first (host=$(resolve_vps_host))"
    set +e
    cmd_ssh_ship
    local ssh_rc=$?
    set -e
    if [[ "$ssh_rc" -eq 0 ]]; then
      return 0
    fi
    echo "WARN: ssh-ship failed (rc=${ssh_rc}); falling back to Actions dispatch" >&2
  fi

  local dispatch_ref="$SHIP_REF"
  if [[ "$SHIP_VIA_VPS_BRANCH" == "1" ]]; then
    local wt
    wt="$(mktemp -d "${TMPDIR:-/tmp}/v038-vps-ship-XXXXXX")"
    cleanup() { git -C "$ROOT" worktree remove --force "$wt" >/dev/null 2>&1 || rm -rf "$wt"; }
    trap cleanup EXIT

    git worktree add "$wt" "origin/$VPS_BRANCH" >/dev/null
    (
      cd "$wt"
      git checkout -B "$VPS_BRANCH"
      git rebase origin/main
      echo "VPS rebase tip=$(git rev-parse --short HEAD)"
      git push --force-with-lease origin "HEAD:refs/heads/$VPS_BRANCH"
    )
    dispatch_ref="$VPS_BRANCH"
  fi

  local before_epoch run_id i dispatch_mode
  before_epoch="$(date -u +%s)"
  dispatch_mode="workflow_dispatch"
  if gh workflow run deploy.yml --repo "$REPO" --ref "$dispatch_ref" 2>/tmp/vps-ship-dispatch.err; then
    echo "Dispatched deploy.yml via workflow_dispatch on $dispatch_ref"
  else
    echo "WARN: workflow_dispatch failed; trying repository_dispatch vps-compose-ship"
    cat /tmp/vps-ship-dispatch.err >&2 || true
    gh api --method POST "repos/${REPO}/dispatches" --input - <<EOF
{"event_type":"vps-compose-ship","client_payload":{"confirm":"${CONFIRM_TOKEN}","ref":"${dispatch_ref}"}}
EOF
    dispatch_mode="repository_dispatch"
    echo "Dispatched deploy.yml via repository_dispatch (vps-compose-ship)"
  fi

  if [[ "${SKIP_WAIT:-0}" == "1" ]]; then
    echo "SKIP_WAIT=1 — not watching deploy; verify manually:"
    echo "  EXPECT_VERSION=$EXPECT_VERSION ./$VERIFY_SCRIPT"
    echo "  $PROBE_NOTE"
    return 0
  fi

  echo "==> Waiting for Build and Deploy run (mode=$dispatch_mode)"
  run_id=""
  for i in $(seq 1 60); do
    run_id="$(
      gh run list --repo "$REPO" --workflow "Build and Deploy" --limit 8 \
        --json databaseId,createdAt,status,headSha,event,displayTitle \
        | python3 -c "
import json,sys,datetime
before=${before_epoch}-30
rows=json.load(sys.stdin)
want_event='${dispatch_mode}'
for r in rows:
    ts=r.get('createdAt') or ''
    try:
        epoch=int(datetime.datetime.fromisoformat(ts.replace('Z','+00:00')).timestamp())
    except Exception:
        continue
    if epoch < before:
        continue
    if want_event == 'repository_dispatch' and r.get('event') != 'repository_dispatch':
        continue
    if want_event == 'workflow_dispatch' and r.get('event') != 'workflow_dispatch':
        continue
    print(r['databaseId'])
    break
"
    )"
    if [[ -n "$run_id" ]]; then
      break
    fi
    sleep 4
  done
  if [[ -z "$run_id" ]]; then
    echo "ERROR: could not locate dispatched Build and Deploy run (mode=$dispatch_mode)" >&2
    exit 1
  fi
  echo "Watching run $run_id"
  gh run watch "$run_id" --repo "$REPO" --exit-status
  echo "Deploy run $run_id succeeded"

  cmd_verify_live
  cmd_probe_km
}

case "$MODE" in
  plan|"")
    print_plan
    ;;
  check)
    cmd_check
    ;;
  verify-live)
    cmd_verify_live
    ;;
  probe-km)
    cmd_probe_km
    ;;
  ship)
    cmd_ship
    ;;
  ssh-ship)
    cmd_ssh_ship
    ;;
  *)
    echo "Usage: $0 [plan|check|verify-live|probe-km|ship|ssh-ship]" >&2
    exit 2
    ;;
esac
