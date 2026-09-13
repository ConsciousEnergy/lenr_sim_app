#!/usr/bin/env bash
# Post-merge VPS ship helper for v0.3.7-beta.
#
# Default mode is plan-only (prints commands). Never squash-merges the train.
# Never force-pushes or dispatches deploy unless EXECUTE=1 AND CONFIRM is set.
#
# Usage (repo root):
#   ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh
#   ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh check
#   ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh verify-live
#   CONFIRM=I_SHIP_VPS_0_3_7 EXECUTE=1 \
#     ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ship
#
# Preconditions for ship:
#   - #185–#189 are MERGED (or ALLOW_UNMERGED=1 for rehearsal against a dry tip)
#   - origin/main reports APP_VERSION=0.3.7-beta (unless ALLOW_UNMERGED=1)
set -euo pipefail

REPO="${MERGE_TRAIN_REPO:-ConsciousEnergy/lenr_sim_app}"
VPS_BRANCH="${MERGE_TRAIN_VPS_BRANCH:-consciousenergy/vps-public-beta-rebase-98d8}"
SHARE_BRANCH="${MERGE_TRAIN_SHARE_BRANCH:-consciousenergy/v037-share-uptime-prep-98d8}"
TRAIN_PRS=(185 186 187 188 189)
PREVIEW_PR=190
SUPERSEDE_PR=184
EXPECT_VERSION="${EXPECT_VERSION:-0.3.7-beta}"
MODE="${1:-plan}"
CONFIRM_TOKEN="I_SHIP_VPS_0_3_7"

need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: missing $1" >&2; exit 2; }; }
need git
need gh

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

APP_VERSION_FILE="LENR_SIM_APP_v2/backend/app/core/config.py"
VERIFY_SCRIPT="LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh"

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
==> Post-merge VPS ship plan (human-gated)

# A) After operator says "merge the stack":
gh pr merge 185 --repo $REPO --squash --delete-branch=false
for n in 186 187 188 189; do
  gh pr edit "\$n" --repo $REPO --base main
  gh pr checks "\$n" --repo $REPO --watch
  gh pr merge "\$n" --repo $REPO --squash --delete-branch=false
done
gh pr close $SUPERSEDE_PR --repo $REPO --comment "Superseded by #187 BF HUD readability + honesty."
gh pr close $PREVIEW_PR --repo $REPO --comment "CI preview only; stack landed via #185–#189. Do not squash-merge."

# B) Rebase VPS tip onto updated main and deploy (or run this script with ship):
git fetch origin
git checkout $VPS_BRANCH
git rebase origin/main
git push --force-with-lease origin $VPS_BRANCH
gh workflow run deploy.yml --repo $REPO --ref $VPS_BRANCH

# C) Prove live share reports ${EXPECT_VERSION}:
EXPECT_VERSION=${EXPECT_VERSION} ./${VERIFY_SCRIPT}

# Swarm / Terraform / Pages apply remains deferred to v0.3.8-beta.
EOF
}

cmd_check() {
  echo "==> Fetch origin"
  git fetch --quiet origin main "$VPS_BRANCH" "$SHARE_BRANCH" || true

  local main_ver share_ver main_sha vps_sha share_sha
  main_sha="$(git rev-parse --short origin/main)"
  vps_sha="$(git rev-parse --short origin/"$VPS_BRANCH")"
  share_sha="$(git rev-parse --short origin/"$SHARE_BRANCH")"
  main_ver="$(read_app_version_at origin/main)"
  share_ver="$(read_app_version_at origin/"$SHARE_BRANCH")"

  echo "main@$main_sha APP_VERSION=${main_ver:-?}"
  echo "share@$share_sha APP_VERSION=${share_ver:-?}"
  echo "vps@$vps_sha"

  if train_merged; then
    echo "OK: train #185–#189 MERGED"
  else
    echo "BLOCKED: train not fully merged (expected until human gate)"
  fi

  if [[ "${main_ver:-}" == "$EXPECT_VERSION" ]]; then
    echo "OK: origin/main carries $EXPECT_VERSION"
  else
    echo "BLOCKED: origin/main APP_VERSION=${main_ver:-missing} (want $EXPECT_VERSION)"
  fi

  if [[ "$vps_sha" == "$main_sha" ]]; then
    echo "OK: VPS branch == main (re-rebase after train lands before ship)"
  else
    echo "NOTE: VPS @$vps_sha != main @$main_sha — rebase after train lands"
  fi

  if git merge-base --is-ancestor origin/main origin/"$SHARE_BRANCH"; then
    echo "OK: origin/main ⊂ share tip"
  else
    echo "WARN: share tip does not contain origin/main"
  fi
}

cmd_verify_live() {
  if [[ ! -x "$VERIFY_SCRIPT" ]]; then
    echo "ERROR: missing executable $VERIFY_SCRIPT" >&2
    exit 2
  fi
  echo "==> Probing live share (EXPECT_VERSION=${EXPECT_VERSION})"
  EXPECT_VERSION="$EXPECT_VERSION" "./$VERIFY_SCRIPT"
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

  git fetch origin main "$VPS_BRANCH"

  if [[ "${ALLOW_UNMERGED:-0}" != "1" ]]; then
    train_merged || {
      echo "ERROR: merge train not MERGED; will not ship" >&2
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

  local wt
  wt="$(mktemp -d "${TMPDIR:-/tmp}/v037-vps-ship-XXXXXX")"
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

  gh workflow run deploy.yml --repo "$REPO" --ref "$VPS_BRANCH"
  echo "Dispatched deploy.yml on $VPS_BRANCH"
  echo "After Actions finishes:"
  echo "  EXPECT_VERSION=$EXPECT_VERSION ./$VERIFY_SCRIPT"
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
