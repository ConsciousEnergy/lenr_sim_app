"""Read-only index of committed ``datasets/reviewer_packs/*`` manifests.

Model-output campaign packs only. Never flips ``lenr_proved`` or closes EQ-OPEN-*.
Distinct from paper Packet A–E markdown at ``/docs/reviewer-packets``.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from app.data.dataset_io import datasets_root

PACK_SCHEMA = "lenr-reviewer-pack-v1"
INDEX_SCHEMA = "lenr-campaign-pack-index-v1"

REQUIRED_OPEN_IDS = (
    "EQ-OPEN-MEV-01",
    "EQ-OPEN-RAD-01",
    "EQ-OPEN-RATE-01",
    "EQ-OPEN-EC-01",
    "EQ-OPEN-YIELD-01",
)

# Test fixture — never present as an external-review “full” pack.
FIXTURE_PACK_IDS = frozenset({"smoke"})

PACK_ROLES: Dict[str, str] = {
    "smoke": "fixture",
    "q_campaign_demo": "demo_hydrate",
    "cavitation_collapse_campaign": "campaign",
    "detector_weak_screen": "campaign",
    "iccf27_hydration": "campaign",
    "celani_exploratory_moe": "campaign",
}


def _pack_root() -> Path:
    return datasets_root() / "reviewer_packs"


def _summary_from_manifest(pack_id: str, manifest: Dict[str, Any]) -> Dict[str, Any]:
    open_ids = list(manifest.get("open_ids") or [])
    role = PACK_ROLES.get(pack_id, "campaign")
    return {
        "pack_id": pack_id,
        "role": role,
        "fixture": pack_id in FIXTURE_PACK_IDS,
        "schema": manifest.get("schema"),
        "preset": manifest.get("preset"),
        "n_experiments": manifest.get("n_experiments"),
        "n_theory_runs": manifest.get("n_theory_runs"),
        # Callers must only pass manifests with boolean False (see list filter).
        "lenr_proved": False,
        "empirical_claim_tiers_raised": bool(
            manifest.get("empirical_claim_tiers_raised")
        ),
        "open_ids": open_ids,
        "open_ids_all_present": set(open_ids) >= set(REQUIRED_OPEN_IDS),
        "disclaimer": manifest.get("disclaimer"),
        "pack_path": f"LENR_SIM_APP_v2/datasets/reviewer_packs/{pack_id}/",
    }


def list_committed_pack_summaries() -> Dict[str, Any]:
    """Return honesty-locked summaries for every committed pack directory."""
    root = _pack_root()
    if not root.is_dir():
        raise FileNotFoundError(f"reviewer_packs directory missing: {root}")

    packs: List[Dict[str, Any]] = []
    for path in sorted(root.iterdir()):
        if not path.is_dir():
            continue
        if path.name.startswith(".") or path.name == "local":
            continue
        manifest_path = path / "manifest.json"
        if not manifest_path.is_file():
            continue
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if not isinstance(manifest, dict):
            continue
        if manifest.get("schema") != PACK_SCHEMA:
            continue
        # Advertise only when lenr_proved is the boolean False (not missing / "false").
        if manifest.get("lenr_proved") is not False:
            continue
        packs.append(_summary_from_manifest(path.name, manifest))

    return {
        "schema": INDEX_SCHEMA,
        "lenr_proved": False,
        "eq_open_status": "OPEN",
        "required_open_ids": list(REQUIRED_OPEN_IDS),
        "disclaimer": (
            "Campaign JSON packs are model-output SQL hydrate/export envelopes "
            "(lenr-reviewer-pack-v1). They are not paper Packet A–E checklists, "
            "do not prove LENR, and do not close EQ-OPEN-*."
        ),
        "surfaces": {
            "paper_packets_a_e": "/docs/reviewer-packets",
            "campaign_json_packs": "LENR_SIM_APP_v2/datasets/reviewer_packs/",
            "researcher_review_pack_doc": "/docs/researcher-review-pack",
        },
        "n_packs": len(packs),
        "packs": packs,
    }
