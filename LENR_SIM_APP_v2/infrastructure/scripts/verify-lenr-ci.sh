#!/usr/bin/env bash
# Collect evidence that lenr-ci self-hosted cutover works.
# Safe to run from agent host after registration. Does not print secrets.
#
# Env (optional):
#   SHARE_SSH_HOST   default root@185.211.4.66
#   REPO             default ConsciousEnergy/lenr_sim_app
#   GH_ADMIN_PAT     if set, used for runners/variables API (Cursor gh often 403)
set -euo pipefail

SHARE_SSH_HOST="${SHARE_SSH_HOST:-root@185.211.4.66}"
REPO="${REPO:-ConsciousEnergy/lenr_sim_app}"
OUT="${OUT:-/opt/cursor/artifacts/lenr-ci-verify.log}"
mkdir -p "$(dirname "$OUT")"

gh_api() {
  if [[ -n "${GH_ADMIN_PAT:-}" ]]; then
    GH_TOKEN="$GH_ADMIN_PAT" gh api "$@"
  else
    gh api "$@"
  fi
}

{
  echo "=== lenr-ci verify $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
  echo "== versions =="
  python3 - <<'PY'
from pathlib import Path
import re, json
root = Path("/workspace") if Path("/workspace/LENR_SIM_APP_v2").exists() else Path(".")
c = (root / "LENR_SIM_APP_v2/backend/app/core/config.py").read_text()
v1 = re.search(r'APP_VERSION: str = "([^"]+)"', c).group(1)
v2 = json.loads((root / "LENR_SIM_APP_v2/frontend/package.json").read_text())["version"]
v3 = re.search(r"APP_VERSION = '([^']+)'", (root / "LENR_SIM_APP_v2/frontend/src/config/version.js").read_text()).group(1)
v4 = re.search(r"BUILD_VERSION=(\S+)", (root / "LENR_SIM_APP_v2/infrastructure/docker/Dockerfile.backend").read_text()).group(1)
ok = len({v1, v2, v3, v4}) == 1 and v1 == "0.3.7-beta"
print(v1, v2, v3, v4, "PASS" if ok else "FAIL")
raise SystemExit(0 if ok else 1)
PY

  echo "== beta health =="
  curl -fsS --max-time 15 https://lenr-sim-beta.conscious.energy/api/health \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["status"], d["version"]); assert d["status"]=="healthy" and d["version"]=="0.3.7-beta"'

  echo "== share runner service =="
  ssh -o BatchMode=yes -o ConnectTimeout=15 -i "${HOME}/.ssh/id_ed25519" \
    "$SHARE_SSH_HOST" \
    'test -f /opt/actions-runner/.runner && echo .runner:present || echo .runner:MISSING; cd /opt/actions-runner && ./svc.sh status 2>/dev/null | head -20 || systemctl status "actions.runner.*" --no-pager 2>/dev/null | head -30 || true'

  echo "== github runners (needs admin) =="
  if gh_api "repos/${REPO}/actions/runners" --jq '.runners[] | {name,status,busy,labels:[.labels[].name]}' 2>/tmp/lenr-ci-runners.err; then
    :
  else
    echo "runners API unavailable: $(tr -d '\n' </tmp/lenr-ci-runners.err | head -c 200)"
  fi

  echo "== LENR_CI_RUNS_ON =="
  if gh_api "repos/${REPO}/actions/variables/LENR_CI_RUNS_ON" --jq '{name,value}' 2>/tmp/lenr-ci-var.err; then
    :
  else
    echo "variable API unavailable or unset: $(tr -d '\n' </tmp/lenr-ci-var.err | head -c 200)"
  fi

  echo "== deploy.yml never runs-on lenr-ci =="
  if grep -nE 'runs-on:.*lenr-ci' /workspace/.github/workflows/deploy.yml 2>/dev/null; then
    echo "FAIL: deploy.yml runs-on includes lenr-ci"
    exit 2
  else
    echo "PASS: deploy.yml runs-on does not include lenr-ci"
  fi

  echo
  echo "Next manual proof: Actions → lenr-ci smoke → Run workflow (must be green on self-hosted)."
  echo "Goal green-PR evidence also needs a code/docs PR job landing on labels self-hosted,linux,x64,lenr-ci."
} | tee "$OUT"

echo "Wrote $OUT"
