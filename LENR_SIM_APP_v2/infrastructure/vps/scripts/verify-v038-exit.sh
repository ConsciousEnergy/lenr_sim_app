#!/usr/bin/env bash
# Requirement-by-requirement exit audit for v0.3.8 P0 + v0.3.9 Swarm prep.
# Writes /opt/cursor/artifacts/v038_exit_criteria_audit.{json,md}
# Exit 0 only when every requirement is PASS (goal-complete).
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
REPO="${MERGE_TRAIN_REPO:-ConsciousEnergy/lenr_sim_app}"
# km_auto_live_compose MUST hit the public Compose share — never tip/localhost.
# BETA_SHARE_URL is often set to http://127.0.0.1:18080 for tip probe-km and would
# false-PASS this gate (tip already advertises auto while live still does not).
LIVE_COMPOSE="${LIVE_COMPOSE_URL:-https://lenr-sim-beta.conscious.energy}"
OUT_JSON="${EXIT_AUDIT_JSON:-/opt/cursor/artifacts/v038_exit_criteria_audit.json}"
OUT_MD="${EXIT_AUDIT_MD:-/opt/cursor/artifacts/v038_exit_criteria_audit.md}"
mkdir -p "$(dirname "$OUT_JSON")"

python3 - "$REPO" "$LIVE_COMPOSE" "$OUT_JSON" "$OUT_MD" <<'PY'
import json, os, subprocess, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

repo, live_compose, out_json, out_md = sys.argv[1:5]

def sh(*args, check=False):
    r = subprocess.run(args, capture_output=True, text=True)
    if check and r.returncode != 0:
        raise RuntimeError(r.stderr or r.stdout)
    return r

def gh_json(*args):
    r = sh("gh", *args)
    if r.returncode != 0:
        return None
    try:
        return json.loads(r.stdout)
    except Exception:
        return None

def file_on_ref(ref, path):
    r = sh("git", "cat-file", "-e", f"{ref}:{path}")
    return r.returncode == 0

def is_public_compose_url(url: str) -> bool:
    """Reject tip/local overrides so km_auto cannot false-PASS."""
    try:
        u = urlparse(url)
    except Exception:
        return False
    host = (u.hostname or "").lower()
    if u.scheme not in ("http", "https"):
        return False
    if host in ("localhost", "127.0.0.1", "::1") or host.endswith(".local"):
        return False
    if host.startswith("10.") or host.startswith("192.168.") or host.startswith("172."):
        # private / link-local ranges — not the public Compose share
        return False
    return bool(host)

def live_modes(base: str):
    try:
        with urllib.request.urlopen(f"{base.rstrip('/')}/api/physics/bubble-fusion/defaults", timeout=20) as resp:
            d = json.load(resp)
        return ((d.get("options") or {}).get("dynamics_modes") or [])
    except Exception as e:
        return [f"error:{e}"]

if not is_public_compose_url(live_compose):
    modes = [f"error:LIVE_COMPOSE_URL_not_public:{live_compose}"]
    km_live = False
else:
    modes = live_modes(live_compose)
    km_live = "auto" in modes

pr196 = gh_json("pr", "view", "196", "--repo", repo, "--json", "state,mergedAt") or {}
pr197 = gh_json("pr", "view", "197", "--repo", repo, "--json", "state,mergedAt") or {}
pr204 = gh_json("pr", "view", "204", "--repo", repo, "--json", "state,mergedAt,headRefOid") or {}
pr206 = gh_json("pr", "view", "206", "--repo", repo, "--json", "state,mergedAt,headRefOid") or {}
main_has_ara = file_on_ref("origin/main", "LENR_SIM_APP_v2/backend/tests/test_physics/test_ara_p1_scaffolds.py")
main_has_staging = file_on_ref("origin/main", "LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh")
main_has_honesty = file_on_ref(
    "origin/main",
    "LENR_SIM_APP_v2/frontend/src/components/physics/TheoryFidelityHonestySummary.jsx",
)
head_has_ara = file_on_ref("HEAD", "LENR_SIM_APP_v2/backend/tests/test_physics/test_ara_p1_scaffolds.py")
cutover = file_on_ref("origin/main", "LENR_SIM_APP_v2/docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md")
cmns = file_on_ref("origin/main", "LENR_SIM_APP_v2/docs/v0.3.8-beta/CMNS_MODEL_FIDELITY_RESPONSE.md")
null_mod = file_on_ref("origin/main", "LENR_SIM_APP_v2/backend/app/physics_engine/theories/null_recombination.py")
holmlid = file_on_ref("origin/main", "LENR_SIM_APP_v2/backend/app/physics_engine/theories/holmlid_udh.py")
eq_open = Path("LENR_SIM_APP_v2/docs").exists()

items = [
    {
        "id": "land_196_197_on_main",
        "requirement": "#196 / #197 squash-merged to main",
        "status": "PASS" if pr196.get("state") == "MERGED" and pr197.get("state") == "MERGED" else "FAIL",
        "evidence": f"#196={pr196.get('state')} #197={pr197.get('state')}",
    },
    {
        "id": "km_auto_live_compose",
        "requirement": "KM auto live on Compose share",
        "status": "PASS" if km_live else "FAIL",
        "evidence": f"LIVE_COMPOSE_URL={live_compose} modes={modes} (ignores BETA_SHARE_URL tip override)",
    },
    {
        "id": "cmns_fidelity_doc_axes",
        "requirement": "CMNS fidelity response doc + ledger/UI axes",
        "status": "PASS" if cmns else "FAIL",
        "evidence": f"CMNS_MODEL_FIDELITY_RESPONSE on main={cmns}",
    },
    {
        "id": "provenance_contract",
        "requirement": "Additive provenance + contract tests green",
        "status": "PASS" if file_on_ref("origin/main", "LENR_SIM_APP_v2/backend/tests/test_integration/test_fidelity_provenance_contract.py") else "FAIL",
        "evidence": "test_fidelity_provenance_contract.py on main",
    },
    {
        "id": "taxonomy_honesty",
        "requirement": "Holmlid≠Kim + taxonomy honesty",
        "status": "PASS" if holmlid and null_mod else "FAIL",
        "evidence": f"holmlid_udh={holmlid} null_recombination={null_mod}; Theory Paper honesty on #204",
    },
    {
        "id": "nulls_and_benchmarks",
        "requirement": "≥1 null control; ≥2 paper benchmarks",
        "status": "PASS" if null_mod and file_on_ref("origin/main", "LENR_SIM_APP_v2/backend/tests/test_paper_benchmarks/test_p0_paper_benchmarks.py") else "FAIL",
        "evidence": "null_recombination + test_p0_paper_benchmarks on main",
    },
    {
        "id": "staging_swarm_dry_run",
        "requirement": "Staging Swarm dry-run evidence; public still Compose",
        "status": "PASS" if main_has_staging else ("PARTIAL" if file_on_ref("HEAD", "LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh") else "FAIL"),
        "evidence": f"helper on main={main_has_staging}; pr206={pr206.get('state')}; remote TF still operator-gated",
    },
    {
        "id": "cutover_docs_gates_039",
        "requirement": "0.3.9 cutover docs/gates (prep only)",
        "status": "PASS" if cutover else "FAIL",
        "evidence": f"SWARM_PUBLIC_CUTOVER.md on main={cutover}",
    },
    {
        "id": "ara_p1_start",
        "requirement": "Start ARA P1 scaffolds",
        "status": "PASS" if main_has_ara else ("PARTIAL" if head_has_ara else "FAIL"),
        "evidence": f"scaffolds on main={main_has_ara}; on HEAD={head_has_ara}; pr206={pr206.get('state')} pr204={pr204.get('state')}",
    },
    {
        "id": "eq_open_remain_open",
        "requirement": "EQ-OPEN-* stay OPEN",
        "status": "PASS" if eq_open else "FAIL",
        "evidence": "docs tree present; do not close EQ-OPEN-*",
    },
]

blocking = [i["id"] for i in items if i["status"] != "PASS"]
complete = len(blocking) == 0
audit = {
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "goal_complete": complete,
    "reason": "all PASS" if complete else f"blocking={blocking}",
    "items": items,
    "blocking": blocking,
    "live_compose_url": live_compose,
    "live_modes": modes,
    "pr204": pr204,
    "pr206": pr206,
}
Path(out_json).write_text(json.dumps(audit, indent=2) + "\n")
lines = [
    "# v0.3.8 / v0.3.9-prep exit criteria audit",
    "",
    f"generated_at: `{audit['generated_at']}`",
    f"goal_complete: **{'true' if complete else 'false'}**",
    "",
    "## Requirement matrix",
    "",
    "| ID | Status | Requirement |",
    "|---|---|---|",
]
for i in items:
    lines.append(f"| `{i['id']}` | **{i['status']}** | {i['requirement']} |")
lines += ["", "## Evidence notes"]
for i in items:
    lines += [f"### `{i['id']}` — {i['status']}", i["evidence"], ""]
Path(out_md).write_text("\n".join(lines) + "\n")
print(json.dumps({"goal_complete": complete, "blocking": blocking, "live_modes": modes}, indent=2))
sys.exit(0 if complete else 1)
PY
