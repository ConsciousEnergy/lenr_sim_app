#!/usr/bin/env bash
# Orchestrate dedicated cutover once Hostinger shows a VM ≠ share:
#   1) poll for dedicated VM
#   2) register runner (requires GH_RUNNER_REGISTRATION_TOKEN; NO ALLOW_SHARE_RUNNER)
#   3) remove share runner (CONFIRM_REMOVE_SHARE_RUNNER)
#
# Env:
#   HOSTINGER_API_TOKEN              required
#   GH_RUNNER_REGISTRATION_TOKEN     required (len>=40, not placeholder)
#   CONFIRM_REMOVE_SHARE_RUNNER      must be I_REMOVE_SHARE_RUNNER to clear share
#   POLL_SECONDS / MAX_POLLS         optional (passed to finish-lenr-ci)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

if [[ "${ALLOW_SHARE_RUNNER:-}" == "1" ]]; then
  echo "Refusing: unset ALLOW_SHARE_RUNNER for dedicated cutover." >&2
  exit 2
fi

if [[ -z "${HOSTINGER_API_TOKEN:-}" ]]; then
  echo "HOSTINGER_API_TOKEN required" >&2
  exit 1
fi

if [[ -z "${GH_RUNNER_REGISTRATION_TOKEN:-}" \
   || "$GH_RUNNER_REGISTRATION_TOKEN" == G1th* \
   || "$GH_RUNNER_REGISTRATION_TOKEN" == placeholder* \
   || "${#GH_RUNNER_REGISTRATION_TOKEN}" -lt 40 ]]; then
  echo "Usable GH_RUNNER_REGISTRATION_TOKEN required (fresh GitHub one-time token, len>=40)." >&2
  exit 1
fi

echo "== A) Register on dedicated (finish-lenr-ci; no share override) =="
unset ALLOW_SHARE_RUNNER
"$ROOT/LENR_SIM_APP_v2/infrastructure/scripts/finish-lenr-ci.sh"

echo "== B) Remove share runner =="
if [[ "${CONFIRM_REMOVE_SHARE_RUNNER:-}" != "I_REMOVE_SHARE_RUNNER" ]]; then
  echo "Skipping share removal — set CONFIRM_REMOVE_SHARE_RUNNER=I_REMOVE_SHARE_RUNNER to clear share." >&2
  exit 0
fi
"$ROOT/LENR_SIM_APP_v2/infrastructure/scripts/remove-share-lenr-ci-runner.sh"

echo "== C) Prove dedicated end-state =="
"$ROOT/LENR_SIM_APP_v2/infrastructure/scripts/prove-dedicated-lenr-ci.sh" || {
  echo "Proof failed — dedicated may be registered but evidence incomplete." >&2
  exit 1
}

echo "== D) Done =="
echo "Confirm GitHub Runners: dedicated Idle; no lenr-ci-share-* on 185.211.4.66"
echo "Evidence: /opt/cursor/artifacts/lenr-ci-dedicated-proof.log"
