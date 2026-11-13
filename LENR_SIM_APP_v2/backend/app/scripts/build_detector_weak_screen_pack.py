"""Build the detector/weak-screen reviewer pack (model-output only).

Usage (from LENR_SIM_APP_v2/backend):
    python -m app.scripts.build_detector_weak_screen_pack

Does not prove LENR. EQ-OPEN-* stay OPEN. Dual score/final_score preserved.
No ARA / Parkhomov-full SQLite co-tenancy.
"""

from __future__ import annotations

import json
import logging
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List

from app.campaign.detector_weak_screen import (
    detector_weak_screen_count,
    iter_detector_weak_screen_cases,
)
from app.data.dataset_io import datasets_root
from app.physics_engine.theory_scoring import compute_theory_scores
from app.services.reviewer_pack import PACK_SCHEMA, _git_sha, _load_invariants
from app.services.simulation_persistence import DISCLAIMER

logger = logging.getLogger(__name__)

OPEN_IDS = [
    "EQ-OPEN-MEV-01",
    "EQ-OPEN-RAD-01",
    "EQ-OPEN-RATE-01",
    "EQ-OPEN-EC-01",
    "EQ-OPEN-YIELD-01",
]

PRESET = "detector_weak_screen"
PACK_DIRNAME = "detector_weak_screen"


def _score_row(case: Dict[str, Any]) -> Dict[str, Any]:
    conditions = {
        "temperature": float(case["temperature"]),
        "loading_ratio": float(case["loading_ratio"]),
        "pressure": 101325.0,
        "electron_density": 6.8e28,
        "host_material": case.get("host_material"),
    }
    enabled = case.get("enabled_theories")
    scores = compute_theory_scores(
        conditions,
        enabled_theories=list(enabled) if enabled else None,
        skip_sensitivity=True,
    )
    enriched: Dict[str, Any] = {}
    for theory_id, entry in scores.items():
        if not isinstance(entry, dict):
            continue
        row = dict(entry)
        # Dual-score honesty: keep guardrails-like ``score`` distinct from final_score.
        if "score" not in row:
            row["score"] = round(float(row.get("confidence") or 0.0), 4)
        row["score_formula"] = "five_factor_gm_x_claim_tier"
        row["parameter_sensitivity"] = 0.5
        enriched[theory_id] = row
    return enriched


def build_rows() -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    experiments: List[Dict[str, Any]] = []
    theory_runs: List[Dict[str, Any]] = []
    for index, case in enumerate(iter_detector_weak_screen_cases(), start=1):
        exp_id = f"detector-weak-{index:02d}"
        experiments.append(
            {
                "id": exp_id,
                "name": f"Detector/weak screen {case.get('tag')}",
                "type": "unified_theory",
                "status": "completed",
                "is_baseline": False,
                "source": "simulation_campaign",
                "sourceClass": "Campaign",
                "material": case["host_material"],
                "temperature_k": case["temperature"],
                "loading_ratio": case["loading_ratio"],
                "enhancement_factor": 1.0,
                "excess_heat_watts": 0.0,
                "literature_id": case.get("literature_id"),
                "claim_tag": case.get("claim_tag"),
                "parameters": {
                    "open_question_ids": list(case.get("open_question_ids") or []),
                    "campaign_preset": PRESET,
                    "tag": case.get("tag"),
                },
                "results": {
                    "is_model_output": True,
                    "lenr_proved": False,
                    "tag": case.get("tag"),
                    "campaign_preset": PRESET,
                    "scenario_kind": "scenario_table_not_posterior",
                    "open_question_ids": list(case.get("open_question_ids") or []),
                    "open_ids": OPEN_IDS,
                    "citation_key": case.get("citation_key"),
                    "enabled_theories": case.get("enabled_theories"),
                },
            }
        )
        scores = _score_row(case)
        if scores:
            theory_runs.append(
                {
                    "id": f"detector-weak-run-{index:02d}",
                    "experiment_id": exp_id,
                    "session_id": "simulation_campaign",
                    "temperature_k": case["temperature"],
                    "loading_ratio": case["loading_ratio"],
                    "theory_scores": scores,
                    "is_empirical_confidence": False,
                    "combined_enhancement": 1.0,
                }
            )
    return experiments, theory_runs


def write_pack(
    experiments: List[Dict[str, Any]],
    runs: List[Dict[str, Any]],
) -> Path:
    out = datasets_root() / "reviewer_packs" / PACK_DIRNAME
    out.mkdir(parents=True, exist_ok=True)
    (out / "experiments.jsonl").write_text(
        "\n".join(json.dumps(row) for row in experiments) + "\n",
        encoding="utf-8",
    )
    (out / "theory_runs.jsonl").write_text(
        "\n".join(json.dumps(row) for row in runs) + "\n",
        encoding="utf-8",
    )
    histogram: Counter[str] = Counter()
    for run in runs:
        for rec in (run.get("theory_scores") or {}).values():
            if isinstance(rec, dict) and rec.get("claim_tier"):
                histogram[str(rec["claim_tier"])] += 1
    literature_ids = sorted(
        {str(row["literature_id"]) for row in experiments if row.get("literature_id")}
    )
    stressed = sorted(
        {
            oid
            for row in experiments
            for oid in (
                (row.get("parameters") or {}).get("open_question_ids")
                or (row.get("results") or {}).get("open_question_ids")
                or []
            )
        }
    )
    manifest = {
        "schema": PACK_SCHEMA,
        "disclaimer": DISCLAIMER,
        "lenr_proved": False,
        "empirical_claim_tiers_raised": False,
        "git_sha": _git_sha(),
        "preset": PRESET,
        "n_experiments": len(experiments),
        "n_theory_runs": len(runs),
        "claim_tier_histogram": dict(histogram),
        "source_class_counts": {"Campaign": len(experiments)},
        "open_ids": OPEN_IDS,
        "campaign_invariants": _load_invariants(),
        "score_formula": "five_factor_gm_x_claim_tier",
        "skip_sensitivity_note": (
            "Persisted parameter_sensitivity is 0.5 unless live scores are computed."
        ),
        "literature_ids": literature_ids,
        "stressed_open_ids": stressed,
        "kind": "scenario_table_not_posterior",
        "note": (
            "Model-output detector UL / Cd-ratio (RAD/RATE), weak EC-threshold "
            "(Q4), and moderator-null scenario cells, including Parkhomov "
            "Cd-wrapped SNM-14 contested anchor. Dual score/final_score "
            "preserved. Links lab-design avenues for EQ-OPEN-EC-01 / "
            "EQ-OPEN-RAD-01 / EQ-OPEN-RATE-01 without status flips. Does not "
            "prove LENR; EQ-OPEN-* stay OPEN. Not a lab posterior. Parkhomov "
            "ν/anti-ν detector-gas SPEC curated rows stay feeds_production_rate="
            "false and do not discharge Q4."
        ),
    }
    (out / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    expected = detector_weak_screen_count()
    if len(experiments) != expected:
        raise RuntimeError(
            f"pack size {len(experiments)} != detector_weak_screen_count {expected}"
        )
    return out


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    experiments, runs = build_rows()
    out = write_pack(experiments, runs)
    logger.info(
        "Wrote %s (%s experiments, %s theory_runs); lenr_proved=false",
        out,
        len(experiments),
        len(runs),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
