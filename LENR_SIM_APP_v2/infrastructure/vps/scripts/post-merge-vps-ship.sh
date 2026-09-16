#!/usr/bin/env bash
# Post-merge VPS ship helper for Compose share after #196/#197 (KM auto).
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
#
# ship prefers workflow_dispatch on main (GHCR already built on merge of #196/#197).
# Optional VPS_BRANCH rebase remains available via SHIP_VIA_VPS_BRANCH=1.
#
# Preconditions for ship:
#   - #196 and #197 are MERGED (or ALLOW_UNMERGED=1 for rehearsal)
#   - origin/main reports APP_VERSION matching EXPECT_VERSION (default 0.3.7-beta
#     until the 0.3.8 version bump lands)
set -euo pipefail

REPO="${MERGE_TRAIN_REPO:-ConsciousEnergy/lenr_sim_app}"
VPS_BRANCH="${MERGE_TRAIN_VPS_BRANCH:-consciousenergy/vps-public-beta-rebase-98d8}"
# Phase-1 KM + infra prep PRs (squash-merged to main).
TRAIN_PRS=(196 197)
EXPECT_VERSION="${EXPECT_VERSION:-0.3.7-beta}"
MODE="${1:-plan}"
CONFIRM_TOKEN="I_SHIP_VPS_0_3_8"
# Prefer dispatch on main (deploy-vps is workflow_dispatch-only; image already on GHCR).
SHIP_REF="${SHIP_REF:-main}"
SHIP_VIA_VPS_BRANCH="${SHIP_VIA_VPS_BRANCH:-0}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: missing $1" >&2; exit 2; }; }
need git
need gh

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

print_plan() {
  cat <<EOF
==> Post-merge VPS Compose ship plan (human-gated) — after #196/#197

# A) Confirm phase-1 PRs are on main:
gh pr view 196 --json state,mergedAt
gh pr view 197 --json state,mergedAt

# B) Image build already ran on push to main (deploy-vps skipped). Ship Compose:
CONFIRM=${CONFIRM_TOKEN} EXECUTE=1 \\
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ship
# Dispatches Build and Deploy on ${SHIP_REF} (workflow_dispatch → deploy-vps),
# waits (unless SKIP_WAIT=1), then fail-closes:
#   EXPECT_VERSION=${EXPECT_VERSION} ./${VERIFY_SCRIPT}
# ${PROBE_NOTE}

# Optional legacy path (rebase VPS branch then dispatch there):
#   SHIP_VIA_VPS_BRANCH=1 CONFIRM=${CONFIRM_TOKEN} EXECUTE=1 \\
#     ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ship

# Swarm / Terraform / Pages public cutover remains gated for v0.3.9
# (CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9). Staging dry-run uses I_STAGING_0_3_8.
# See docs/v0.3.8-beta/COMPOSE_SHIP_HANDOFF.md
EOF
}

cmd_check() {
  echo "==> Fetch origin"
  git fetch --quiet origin main "$VPS_BRANCH" || true

  local main_ver main_sha vps_sha
  main_sha="$(git rev-parse --short origin/main)"
  vps_sha="$(git rev-parse --short origin/"$VPS_BRANCH" 2>/dev/null || echo missing)"
  main_ver="$(read_app_version_at origin/main)"

  echo "main@$main_sha APP_VERSION=${main_ver:-?}"
  echo "vps@$vps_sha"
  echo "EXPECT_VERSION=$EXPECT_VERSION SHIP_REF=$SHIP_REF"

  if train_merged; then
    echo "OK: #196/#197 MERGED"
  else
    echo "BLOCKED: #196/#197 not fully merged"
  fi

  if [[ "${main_ver:-}" == "$EXPECT_VERSION" ]]; then
    echo "OK: origin/main carries $EXPECT_VERSION"
  else
    echo "NOTE: origin/main APP_VERSION=${main_ver:-missing} (EXPECT_VERSION=$EXPECT_VERSION)"
    echo "      Ship still valid for KM auto if GHCR tip includes #196; adjust EXPECT_VERSION if bumped."
  fi

  if [[ "$vps_sha" == "$main_sha" ]]; then
    echo "OK: VPS branch == main"
  else
    echo "NOTE: VPS @$vps_sha != main @$main_sha (only needed if SHIP_VIA_VPS_BRANCH=1)"
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

cmd_ship() {
  if [[ "${CONFIRM:-}" != "$CONFIRM_TOKEN" ]]; then
    echo "ERROR: refuse ship without CONFIRM=${CONFIRM_TOKEN}" >&2
    exit 2
  fi
  if [[ "${EXECUTE:-0}" != "1" ]]; then
    echo "ERROR: refuse ship without EXECUTE=1 (default is plan-only)" >&2
    exit 2
  fi

  git fetch origin main "$VPS_BRANCH" || git fetch origin main

  if [[ "${ALLOW_UNMERGED:-0}" != "1" ]]; then
    train_merged || {
      echo "ERROR: #196/#197 not MERGED; will not ship" >&2
      exit 1
    }
    local main_ver
    main_ver="$(read_app_version_at origin/main)"
    if [[ "$main_ver" != "$EXPECT_VERSION" ]]; then
      echo "ERROR: origin/main APP_VERSION=$main_ver (want $EXPECT_VERSION)" >&2
      echo "Set EXPECT_VERSION=$main_ver if the tip version bumped intentionally." >&2
      exit 1
    fi
  else
    echo "WARN: ALLOW_UNMERGED=1 — skipping MERGED/version gates"
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

  local before_epoch run_id i
  before_epoch="$(date -u +%s)"
  gh workflow run deploy.yml --repo "$REPO" --ref "$dispatch_ref"
  echo "Dispatched deploy.yml on $dispatch_ref"

  if [[ "${SKIP_WAIT:-0}" == "1" ]]; then
    echo "SKIP_WAIT=1 — not watching deploy; verify manually:"
    echo "  EXPECT_VERSION=$EXPECT_VERSION ./$VERIFY_SCRIPT"
    echo "  $PROBE_NOTE"
    return 0
  fi

  echo "==> Waiting for Build and Deploy run on $dispatch_ref"
  run_id=""
  for i in $(seq 1 45); do
    run_id="$(
      gh run list --repo "$REPO" --workflow "Build and Deploy" --branch "$dispatch_ref" --limit 5 \
        --json databaseId,createdAt,status,headSha,event \
        | python3 -c "
import json,sys,datetime
before=${before_epoch}-30
rows=json.load(sys.stdin)
for r in rows:
    ts=r.get('createdAt') or ''
    try:
        epoch=int(datetime.datetime.fromisoformat(ts.replace('Z','+00:00')).timestamp())
    except Exception:
        continue
    if epoch >= before:
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
    echo "ERROR: could not locate dispatched Build and Deploy run on $dispatch_ref" >&2
    exit 1
  fi
  echo "Watching run $run_id"
  gh run watch "$run_id" --repo "$REPO" --exit-status
  echo "Deploy run $run_id succeeded"

  echo "==> Prove live share reports $EXPECT_VERSION"
  cmd_verify_live
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
  ship)
    cmd_ship
    ;;
  *)
    echo "Usage: $0 [plan|check|verify-live|ship]" >&2
    exit 2
    ;;
esac
