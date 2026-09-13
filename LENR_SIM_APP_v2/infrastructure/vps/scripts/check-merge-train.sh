#!/usr/bin/env bash
# Operator preflight for the v0.3.7-beta merge train (#185→#189) + CI preview (#190).
# Does not merge or deploy. Exit 0 only when the stack looks safe to human-squash.
#
# Usage (repo root, needs gh + git + network):
#   ./LENR_SIM_APP_v2/infrastructure/vps/scripts/check-merge-train.sh
set -euo pipefail

REPO="${MERGE_TRAIN_REPO:-ConsciousEnergy/lenr_sim_app}"
TRAIN_PRS=(185 186 187 188 189)
PREVIEW_PR=190
SUPERSEDE_PR=184
VPS_BRANCH="${MERGE_TRAIN_VPS_BRANCH:-consciousenergy/vps-public-beta-rebase-98d8}"
SHARE_BRANCH="${MERGE_TRAIN_SHARE_BRANCH:-consciousenergy/v037-share-uptime-prep-98d8}"
PREVIEW_BRANCH="${MERGE_TRAIN_PREVIEW_BRANCH:-consciousenergy/v037-ci-preview-98d8}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: missing $1" >&2; exit 2; }; }
need gh
need git

fail=0
warn=0
ok() { echo "OK: $*"; }
bad() { echo "FAIL: $*" >&2; fail=1; }
note() { echo "WARN: $*" >&2; warn=1; }

echo "==> Fetching origin"
git fetch --quiet origin main "$SHARE_BRANCH" "$PREVIEW_BRANCH" "$VPS_BRANCH" || true

echo "==> PR open/mergeable"
for n in "${TRAIN_PRS[@]}" "$PREVIEW_PR"; do
  json="$(gh pr view "$n" --repo "$REPO" --json state,isDraft,mergeable,baseRefName,headRefOid,headRefName)"
  state="$(echo "$json" | python3 -c 'import sys,json;print(json.load(sys.stdin)["state"])')"
  draft="$(echo "$json" | python3 -c 'import sys,json;print(json.load(sys.stdin)["isDraft"])')"
  mergeable="$(echo "$json" | python3 -c 'import sys,json;print(json.load(sys.stdin)["mergeable"])')"
  base="$(echo "$json" | python3 -c 'import sys,json;print(json.load(sys.stdin)["baseRefName"])')"
  head="$(echo "$json" | python3 -c 'import sys,json;print(json.load(sys.stdin)["headRefOid"][:7])')"
  if [[ "$state" != "OPEN" ]]; then
    bad "#$n state=$state (expected OPEN)"
    continue
  fi
  if [[ "$mergeable" != "MERGEABLE" ]]; then
    bad "#$n mergeable=$mergeable"
  else
    ok "#$n OPEN mergeable base=$base head=$head draft=$draft"
  fi
  if [[ "$n" == "$PREVIEW_PR" && "$draft" != "True" ]]; then
    note "#$PREVIEW_PR should stay draft (do not squash-merge)"
  fi
done

echo "==> Stack tip == CI preview tip"
share_sha="$(git rev-parse --short "origin/$SHARE_BRANCH" 2>/dev/null || true)"
preview_sha="$(git rev-parse --short "origin/$PREVIEW_BRANCH" 2>/dev/null || true)"
if [[ -z "$share_sha" || -z "$preview_sha" ]]; then
  bad "missing origin tips share=$share_sha preview=$preview_sha"
elif [[ "$share_sha" != "$preview_sha" ]]; then
  bad "share tip $share_sha != preview tip $preview_sha"
else
  ok "share/preview tip=$share_sha"
fi

echo "==> Ancestry share tip contains main"
if git merge-base --is-ancestor origin/main "origin/$SHARE_BRANCH" 2>/dev/null; then
  ok "origin/main ⊂ origin/$SHARE_BRANCH"
else
  bad "origin/main is not an ancestor of origin/$SHARE_BRANCH (rebase/stack drift)"
fi

echo "==> VPS rebase branch vs main"
vps_sha="$(git rev-parse --short "origin/$VPS_BRANCH" 2>/dev/null || true)"
main_sha="$(git rev-parse --short origin/main)"
if [[ "$vps_sha" == "$main_sha" ]]; then
  ok "VPS branch == main @$main_sha (re-rebase after train lands)"
else
  note "VPS branch @$vps_sha differs from main @$main_sha — expected until post-merge rebase"
fi

echo "==> #185 CI (must be green on main before first squash)"
if gh pr checks 185 --repo "$REPO" >/tmp/merge-train-185.checks 2>/dev/null; then
  # gh pr checks: NAME<TAB>STATUS<TAB>...
  if awk -F'\t' 'BEGIN{IGNORECASE=1} $2 ~ /fail/ {exit 0} END{exit 1}' /tmp/merge-train-185.checks; then
    bad "#185 has failing checks"
  fi
  if awk -F'\t' 'BEGIN{IGNORECASE=1} $2 ~ /pending|in_progress|queued/ {exit 0} END{exit 1}' /tmp/merge-train-185.checks; then
    note "#185 still has pending checks"
  fi
  if ! awk -F'\t' 'BEGIN{IGNORECASE=1} $1 ~ /^version-consistency$/ && $2 ~ /pass|success/ {found=1} END{exit !found}' /tmp/merge-train-185.checks; then
    bad "#185 missing passing version-consistency check"
  fi
  if ! awk -F'\t' 'BEGIN{IGNORECASE=1} $1 ~ /^test \(/ && $2 ~ /pass|success/ {found=1} END{exit !found}' /tmp/merge-train-185.checks; then
    bad "#185 missing passing test (3.x) job"
  fi
  if ! awk -F'\t' 'BEGIN{IGNORECASE=1} $1 ~ /^frontend$/ && $2 ~ /pass|success/ {found=1} END{exit !found}' /tmp/merge-train-185.checks; then
    bad "#185 missing passing frontend check"
  fi
  ok "#185 required checks green (version-consistency, test, frontend)"
else
  bad "could not list #185 checks"
fi

echo "==> CI preview #190 latest Test and Benchmark on tip"
run_json="$(gh run list --repo "$REPO" --branch "$PREVIEW_BRANCH" --workflow "Test and Benchmark" --limit 1 --json conclusion,status,headSha,url,databaseId)"
run_sha="$(echo "$run_json" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["headSha"][:7] if d else "")')"
run_status="$(echo "$run_json" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0].get("status","") if d else "")')"
run_conc="$(echo "$run_json" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0].get("conclusion") or "" if d else "")')"
run_url="$(echo "$run_json" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0].get("url","") if d else "")')"
if [[ -z "$run_sha" ]]; then
  bad "no Test and Benchmark runs on $PREVIEW_BRANCH"
elif [[ "$run_sha" != "$preview_sha" ]]; then
  note "latest Test run sha=$run_sha status=$run_status/$run_conc (preview tip=$preview_sha) $run_url"
elif [[ "$run_status" != "completed" || "$run_conc" != "success" ]]; then
  bad "tip Test run not green yet: $run_status/$run_conc $run_url"
else
  ok "tip Test and Benchmark success @$run_sha $run_url"
fi

echo "==> Supersede reminder"
note "After #187 lands, close #$SUPERSEDE_PR (ui-readability overlap). Never squash-merge #$PREVIEW_PR."

echo "==> Live share (informational)"
if body="$(curl -fsS --max-time 15 https://lenr-sim-beta.conscious.energy/api/health 2>/dev/null)"; then
  ver="$(echo "$body" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("version","?"))' 2>/dev/null || echo "?")"
  ok "live share healthy version=$ver (expect 0.3.6-beta until post-merge deploy)"
else
  note "could not probe live share host"
fi

echo
if (( fail )); then
  echo "RESULT: NOT READY ($fail failure(s), $warn warning(s))"
  exit 1
fi
echo "RESULT: READY for human-gated squash merge #185→#189 ($warn warning(s))"
echo "Next: optional ./LENR_SIM_APP_v2/infrastructure/vps/scripts/dry-run-merge-train.sh  # default=squash+rebase-onto"
echo "Then follow LENR_SIM_APP_v2/docs/v0.3.7-beta/MERGE_TRAIN_VPS.md (do not merge #$PREVIEW_PR)."
exit 0
