#!/usr/bin/env bash
# Detached FF dry-run of the v0.3.7-beta merge train onto origin/main, then a
# simulated VPS rebase onto the resulting tip. Does not push, merge, or deploy.
#
# Usage (repo root, needs network):
#   ./LENR_SIM_APP_v2/infrastructure/vps/scripts/dry-run-merge-train.sh
set -euo pipefail

SHARE_BRANCH="${MERGE_TRAIN_SHARE_BRANCH:-consciousenergy/v037-share-uptime-prep-98d8}"
VPS_BRANCH="${MERGE_TRAIN_VPS_BRANCH:-consciousenergy/vps-public-beta-rebase-98d8}"
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

echo "==> Fast-forward merge train onto main"
for b in "${TRAIN_BRANCHES[@]}"; do
  echo "  -- ff-only origin/$b"
  git merge --ff-only "origin/$b"
done

MERGED_TIP="$(git rev-parse --short HEAD)"
SHARE_TIP="$(git rev-parse --short "origin/$SHARE_BRANCH")"
echo "OK: merged tip=$MERGED_TIP (share tip=$SHARE_TIP)"
if [[ "$MERGED_TIP" != "$SHARE_TIP" ]]; then
  echo "FAIL: merged tip $MERGED_TIP != share tip $SHARE_TIP" >&2
  exit 1
fi

echo "==> Simulate VPS rebase onto merged tip"
git checkout -B dry-vps-rebase "origin/$VPS_BRANCH" >/dev/null
git rebase "$MERGED_TIP"
VPS_TIP="$(git rev-parse --short HEAD)"
echo "OK: VPS dry-rebase tip=$VPS_TIP"
if [[ "$VPS_TIP" != "$MERGED_TIP" ]]; then
  echo "FAIL: VPS tip $VPS_TIP != merged tip $MERGED_TIP after rebase" >&2
  exit 1
fi

echo
echo "RESULT: DRY-RUN OK — FF train + VPS rebase clean @ $MERGED_TIP"
echo "Next: ./LENR_SIM_APP_v2/infrastructure/vps/scripts/check-merge-train.sh"
echo "Then human-gated squash per LENR_SIM_APP_v2/docs/v0.3.7-beta/MERGE_TRAIN_VPS.md"
exit 0
