#!/usr/bin/env bash
# Human-gated squash executor for the v0.3.7-beta merge train (#185→#189).
#
# Default mode prints the plan only. Never merges unless BOTH are set:
#   CONFIRM=I_MERGE_STACK_0_3_7 EXECUTE=1
#
# Usage (repo root, needs gh + git + network + write access to GitHub):
#   ./LENR_SIM_APP_v2/infrastructure/vps/scripts/merge-train-execute.sh
#   ./LENR_SIM_APP_v2/infrastructure/vps/scripts/merge-train-execute.sh plan
#   CONFIRM=I_MERGE_STACK_0_3_7 EXECUTE=1 \
#     ./LENR_SIM_APP_v2/infrastructure/vps/scripts/merge-train-execute.sh merge
#
# Optional after merge:
#   SHIP=1 SHIP_CONFIRM=I_SHIP_VPS_0_3_7 CONFIRM=I_MERGE_STACK_0_3_7 EXECUTE=1 \
#     ./LENR_SIM_APP_v2/infrastructure/vps/scripts/merge-train-execute.sh merge
# Never squash-merges #190. Never applies Terraform/Ansible/Swarm/Pages.
set -euo pipefail

REPO="${MERGE_TRAIN_REPO:-ConsciousEnergy/lenr_sim_app}"
TRAIN_PRS=(185 186 187 188 189)
PREVIEW_PR=190
SUPERSEDE_PR=184
MODE="${1:-plan}"
CONFIRM_TOKEN="I_MERGE_STACK_0_3_7"
SHIP_CONFIRM_TOKEN="I_SHIP_VPS_0_3_7"

need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: missing $1" >&2; exit 2; }; }
need gh
need git

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
CHECK_SCRIPT="$ROOT/LENR_SIM_APP_v2/infrastructure/vps/scripts/check-merge-train.sh"
SHIP_SCRIPT="$ROOT/LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh"

print_plan() {
  cat <<EOF
==> Merge-train execute plan (human-gated)

# 0) Preflight must be READY
./LENR_SIM_APP_v2/infrastructure/vps/scripts/check-merge-train.sh

# 1) Squash train onto main
gh pr merge 185 --repo $REPO --squash --delete-branch=false
for n in 186 187 188 189; do
  gh pr edit "\$n" --repo $REPO --base main
  gh pr checks "\$n" --repo $REPO --watch
  gh pr merge "\$n" --repo $REPO --squash --delete-branch=false
done

# 2) Close superseded / preview
gh pr close $SUPERSEDE_PR --repo $REPO --comment "Superseded by #187 BF HUD readability + honesty."
gh pr close $PREVIEW_PR --repo $REPO --comment "CI preview only; stack landed via #185–#189. Do not squash-merge."

# 3) VPS ship (separate confirm)
CONFIRM=$SHIP_CONFIRM_TOKEN EXECUTE=1 \\
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ship

# 4) Prove live
EXPECT_VERSION=0.3.7-beta \\
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh

To actually merge:
  CONFIRM=$CONFIRM_TOKEN EXECUTE=1 $0 merge
EOF
}

run_preflight() {
  if [[ ! -x "$CHECK_SCRIPT" ]]; then
    echo "ERROR: missing $CHECK_SCRIPT" >&2
    exit 2
  fi
  echo "==> Running check-merge-train.sh (must be READY)"
  "$CHECK_SCRIPT"
}

cmd_merge() {
  if [[ "${CONFIRM:-}" != "$CONFIRM_TOKEN" ]]; then
    echo "ERROR: refuse merge without CONFIRM=${CONFIRM_TOKEN}" >&2
    exit 2
  fi
  if [[ "${EXECUTE:-0}" != "1" ]]; then
    echo "ERROR: refuse merge without EXECUTE=1 (default is plan-only)" >&2
    exit 2
  fi

  run_preflight

  echo "==> Squash-merging #185"
  gh pr merge 185 --repo "$REPO" --squash --delete-branch=false

  local n
  for n in 186 187 188 189; do
    echo "==> Retarget #$n -> main, wait for checks, squash-merge"
    gh pr edit "$n" --repo "$REPO" --base main
    # Watch can exit non-zero on skipped checks; require mergeable success after.
    gh pr checks "$n" --repo "$REPO" --watch || true
    # Fail closed if any required check failed.
    if gh pr checks "$n" --repo "$REPO" 2>/dev/null | awk -F'\t' 'tolower($2) ~ /fail/ {exit 0} END{exit 1}'; then
      echo "ERROR: #$n has failing checks; aborting train" >&2
      exit 1
    fi
    gh pr merge "$n" --repo "$REPO" --squash --delete-branch=false
  done

  echo "==> Closing superseded/preview PRs"
  gh pr close "$SUPERSEDE_PR" --repo "$REPO" --comment "Superseded by #187 BF HUD readability + honesty." || true
  gh pr close "$PREVIEW_PR" --repo "$REPO" --comment "CI preview only; stack landed via #185–#189. Do not squash-merge." || true

  echo "==> Train landed on main. Next: VPS ship."
  if [[ "${SHIP:-0}" == "1" && "${SHIP_CONFIRM:-}" == "$SHIP_CONFIRM_TOKEN" ]]; then
    CONFIRM="$SHIP_CONFIRM_TOKEN" EXECUTE=1 "$SHIP_SCRIPT" ship
  else
    echo "Run: CONFIRM=$SHIP_CONFIRM_TOKEN EXECUTE=1 $SHIP_SCRIPT ship"
    echo "Then: EXPECT_VERSION=0.3.7-beta ./LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh"
    echo "(Optional one-shot after approval: SHIP=1 SHIP_CONFIRM=$SHIP_CONFIRM_TOKEN with merge)"
  fi
}

case "$MODE" in
  plan|"")
    print_plan
    ;;
  preflight)
    run_preflight
    ;;
  merge)
    cmd_merge
    ;;
  *)
    echo "Usage: $0 [plan|preflight|merge]" >&2
    exit 2
    ;;
esac
