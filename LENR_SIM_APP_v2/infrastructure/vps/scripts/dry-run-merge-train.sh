#!/usr/bin/env bash
# Local rehearsal of the v0.3.7-beta merge train.
#
# Two modes:
#   ff     — fast-forward each stack head onto origin/main (ancestry check)
#   squash — simulate human squash + rebase --onto (matches merge-train-execute.sh)
#
# Default is squash (the path operators actually run). Does not push/merge/deploy.
#
# Usage (repo root, needs network):
#   ./LENR_SIM_APP_v2/infrastructure/vps/scripts/dry-run-merge-train.sh
#   ./LENR_SIM_APP_v2/infrastructure/vps/scripts/dry-run-merge-train.sh squash
#   ./LENR_SIM_APP_v2/infrastructure/vps/scripts/dry-run-merge-train.sh ff
set -euo pipefail

SHARE_BRANCH="${MERGE_TRAIN_SHARE_BRANCH:-consciousenergy/v037-share-uptime-prep-98d8}"
VPS_BRANCH="${MERGE_TRAIN_VPS_BRANCH:-consciousenergy/vps-public-beta-rebase-98d8}"
MODE="${1:-squash}"

# Ordered heads that compose the human squash train (#185 → #189).
TRAIN_BRANCHES=(
  consciousenergy/v0.3.7-beta-98d8
  consciousenergy/v037-bubble-engine-truth-98d8
  consciousenergy/v037-bf-ui-honesty-98d8
  consciousenergy/v037-bubble-km-bridge-98d8
  "$SHARE_BRANCH"
)

need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: missing $1" >&2; exit 2; }; }
need git

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "==> Fetching origin"
git fetch --quiet origin main "$VPS_BRANCH" "${TRAIN_BRANCHES[@]}"

WT="$(mktemp -d "${TMPDIR:-/tmp}/v037-merge-train-XXXXXX")"
cleanup() { git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || rm -rf "$WT"; }
trap cleanup EXIT

echo "==> Detached worktree from origin/main → $WT"
git worktree add --detach "$WT" origin/main >/dev/null
cd "$WT"
git checkout -B dry-main >/dev/null

SHARE_TIP="$(git rev-parse --short "origin/$SHARE_BRANCH")"
SHARE_TREE="$(git rev-parse --short "origin/$SHARE_BRANCH^{tree}")"

if [[ "$MODE" == "ff" ]]; then
  echo "==> Fast-forward merge train onto main (ancestry only)"
  for b in "${TRAIN_BRANCHES[@]}"; do
    echo "  -- ff-only origin/$b"
    git merge --ff-only "origin/$b"
  done
  MERGED_TIP="$(git rev-parse --short HEAD)"
  if [[ "$MERGED_TIP" != "$SHARE_TIP" ]]; then
    echo "FAIL: ff tip $MERGED_TIP != share tip $SHARE_TIP" >&2
    exit 1
  fi
elif [[ "$MODE" == "squash" ]]; then
  echo "==> Squash + rebase --onto rehearsal (matches merge-train-execute.sh)"
  # Cutoff starts as #185 tip after its squash; each later PR uses the *pre-rebase*
  # tip of the previous head (remote refs are never force-pushed here, so
  # origin/<prev> stays at that pre-rebase SHA — same as execute.sh's old_head).
  cutoff=""
  for i in "${!TRAIN_BRANCHES[@]}"; do
    b="${TRAIN_BRANCHES[$i]}"
    n=$((185 + i))
    if [[ "$i" -eq 0 ]]; then
      echo "  -- squash #$n origin/$b onto dry-main"
      git merge --squash "origin/$b"
      git commit -m "dry squash #$n"
      cutoff="$(git rev-parse "origin/$b")"
      continue
    fi
    old_head="$(git rev-parse "origin/$b")"
    echo "  -- rebase --onto dry-main ${cutoff:0:7} origin/$b  then squash #$n"
    git branch -D "dry-$n" >/dev/null 2>&1 || true
    git checkout -B "dry-$n" "origin/$b" >/dev/null
    git rebase --onto dry-main "$cutoff" "dry-$n"
    git checkout dry-main >/dev/null
    git merge --squash "dry-$n"
    git commit -m "dry squash #$n via rebase-onto"
    cutoff="$old_head"
  done
  MERGED_TIP="$(git rev-parse --short HEAD)"
  MERGED_TREE="$(git rev-parse --short HEAD^{tree})"
  if [[ "$MERGED_TREE" != "$SHARE_TREE" ]]; then
    echo "FAIL: squash tree $MERGED_TREE != share tree $SHARE_TREE (tip=$MERGED_TIP share=$SHARE_TIP)" >&2
    exit 1
  fi
  echo "OK: squash tree matches share tip tree=$MERGED_TREE (share=$SHARE_TIP)"
else
  echo "Usage: $0 [squash|ff]" >&2
  exit 2
fi

echo "==> Simulate VPS rebase onto merged tip"
MERGED_FULL="$(git rev-parse HEAD)"
git checkout -B dry-vps-rebase "origin/$VPS_BRANCH" >/dev/null
git rebase "$MERGED_FULL"
VPS_TIP="$(git rev-parse --short HEAD)"
VPS_TREE="$(git rev-parse --short HEAD^{tree})"
echo "OK: VPS dry-rebase tip=$VPS_TIP"
if [[ "$VPS_TREE" != "$(git rev-parse --short "$MERGED_FULL^{tree}")" ]]; then
  echo "FAIL: VPS tree $VPS_TREE != merged tree after rebase" >&2
  exit 1
fi

echo
echo "RESULT: DRY-RUN OK ($MODE) — train + VPS rebase clean @ $MERGED_TIP"
echo "Next: ./LENR_SIM_APP_v2/infrastructure/vps/scripts/check-merge-train.sh"
echo "Then human-gated squash per LENR_SIM_APP_v2/docs/v0.3.7-beta/MERGE_TRAIN_VPS.md"
exit 0
