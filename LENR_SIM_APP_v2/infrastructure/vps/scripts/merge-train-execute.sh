#!/usr/bin/env bash
# Human-gated squash executor for the v0.3.7-beta merge train (#185→#189).
#
# CRITICAL: stacked PRs cannot be retargeted + squash-merged onto main after a
# prior squash without `git rebase --onto`. A naive retarget leaves add/add
# conflicts (verified locally: #186–#189 conflict; rebase-onto lands clean and
# final tree == share tip).
#
# CRITICAL #2: after force-pushing a rebased head, the *next* PR's rebase cutoff
# must be that head's *pre-rebase* SHA (not origin/<head> after the force-push).
# Otherwise later PRs replay already-landed commits and conflict again.
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
PREVIEW_PR=190
SUPERSEDE_PR=184
MODE="${1:-plan}"
CONFIRM_TOKEN="I_MERGE_STACK_0_3_7"
SHIP_CONFIRM_TOKEN="I_SHIP_VPS_0_3_7"

# Ordered train: pr|head_branch
# Cutoffs are captured at runtime (pre-rebase SHAs) — see cmd_merge.
TRAIN_ROWS=(
  "185|consciousenergy/v0.3.7-beta-98d8"
  "186|consciousenergy/v037-bubble-engine-truth-98d8"
  "187|consciousenergy/v037-bf-ui-honesty-98d8"
  "188|consciousenergy/v037-bubble-km-bridge-98d8"
  "189|consciousenergy/v037-share-uptime-prep-98d8"
)

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

# 1) Squash #185 (already targets main)
gh pr merge 185 --repo $REPO --squash --delete-branch=false

# 2) For each remaining PR: rebase --onto main using the *pre-rebase* tip of
#    the previous stack head as the cutoff, force-push, retarget base=main,
#    wait for checks, squash-merge.
#    (Naive retarget-without-rebase conflicts on #186–#189.)
#    (Using origin/<prev> *after* force-push as cutoff also conflicts.)
cutoff=\$(git rev-parse origin/consciousenergy/v0.3.7-beta-98d8)
for row in \\
  "186|consciousenergy/v037-bubble-engine-truth-98d8" \\
  "187|consciousenergy/v037-bf-ui-honesty-98d8" \\
  "188|consciousenergy/v037-bubble-km-bridge-98d8" \\
  "189|consciousenergy/v037-share-uptime-prep-98d8"
do
  IFS='|' read -r n head <<< "\$row"
  old_head=\$(git rev-parse origin/\$head)   # capture BEFORE rebase/force-push
  git fetch origin main "\$head"
  git checkout -B "\$head" "origin/\$head"
  git rebase --onto origin/main "\$cutoff" "\$head"
  git push --force-with-lease origin "HEAD:refs/heads/\$head"
  gh pr edit "\$n" --repo $REPO --base main
  gh pr checks "\$n" --repo $REPO --watch
  gh pr merge "\$n" --repo $REPO --squash --delete-branch=false
  cutoff=\$old_head
done

# 3) Close superseded / preview
gh pr close $SUPERSEDE_PR --repo $REPO --comment "Superseded by #187 BF HUD readability + honesty."
gh pr close $PREVIEW_PR --repo $REPO --comment "CI preview only; stack landed via #185–#189. Do not squash-merge."

# 4) VPS ship (separate confirm)
CONFIRM=$SHIP_CONFIRM_TOKEN EXECUTE=1 \\
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ship

# 5) Prove live
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

wait_checks_green() {
  local n="$1"
  # Watch can exit non-zero on skipped checks; require no failures after.
  gh pr checks "$n" --repo "$REPO" --watch || true
  if gh pr checks "$n" --repo "$REPO" 2>/dev/null | awk -F'\t' 'tolower($2) ~ /fail/ {exit 0} END{exit 1}'; then
    echo "ERROR: #$n has failing checks; aborting train" >&2
    exit 1
  fi
  local mergeable
  mergeable="$(gh pr view "$n" --repo "$REPO" --json mergeable -q .mergeable)"
  if [[ "$mergeable" != "MERGEABLE" ]]; then
    echo "ERROR: #$n mergeable=$mergeable after rebase/checks; aborting" >&2
    exit 1
  fi
}

rebase_head_onto_main() {
  local head="$1"
  local cutoff="$2"
  local wt
  wt="$(mktemp -d "${TMPDIR:-/tmp}/v037-train-rebase-XXXXXX")"

  git fetch origin main "$head"
  git worktree add --detach "$wt" "origin/$head" >/dev/null
  (
    cd "$wt"
    git checkout -B "$head"
    echo "  rebase --onto origin/main $cutoff $head"
    git rebase --onto origin/main "$cutoff" "$head"
    echo "  rebased tip=$(git rev-parse --short HEAD)"
    git push --force-with-lease origin "HEAD:refs/heads/$head"
  )
  git worktree remove --force "$wt" >/dev/null 2>&1 || rm -rf "$wt"
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

  local row n head first_head cutoff old_head
  # Fetch all train heads once so cutoffs are stable.
  local heads=()
  for row in "${TRAIN_ROWS[@]}"; do
    IFS='|' read -r n head <<<"$row"
    heads+=("$head")
  done
  git fetch origin main "${heads[@]}"

  IFS='|' read -r n first_head <<<"${TRAIN_ROWS[0]}"
  echo "==> Squash-merging #$n (base already main)"
  gh pr merge "$n" --repo "$REPO" --squash --delete-branch=false

  # Cutoff for #186 = original #185 tip (branch not rewritten by squash merge).
  cutoff="$(git rev-parse "origin/$first_head")"
  echo "  initial cutoff (pre-#186)=$cutoff"

  local i
  for ((i = 1; i < ${#TRAIN_ROWS[@]}; i++)); do
    IFS='|' read -r n head <<<"${TRAIN_ROWS[$i]}"
    old_head="$(git rev-parse "origin/$head")"
    echo "==> Rebase #$n ($head) onto main; cutoff=${cutoff:0:7} old_head=${old_head:0:7}"
    rebase_head_onto_main "$head" "$cutoff"
    echo "==> Retarget #$n -> main, wait for checks, squash-merge"
    gh pr edit "$n" --repo "$REPO" --base main
    wait_checks_green "$n"
    gh pr merge "$n" --repo "$REPO" --squash --delete-branch=false
    # Next PR's unique commits are those after this head's *pre-rebase* tip.
    cutoff="$old_head"
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
