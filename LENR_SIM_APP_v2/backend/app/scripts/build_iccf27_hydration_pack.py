"""Build the ICCF-27 hydration reviewer pack from live model-output campaign cells.

Usage (from LENR_SIM_APP_v2/backend):
    python -m app.scripts.build_iccf27_hydration_pack

Does not prove LENR. EQ-OPEN-* stay OPEN. Does not rewrite q_campaign_demo.
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from app.campaign.carbon_silicate import iter_carbon_silicate_uq_cases
from app.campaign.iccf27 import iter_iccf27_grid_cases
from app.campaign.runner import _simulate_payload
from app.api.routes.unified_simulation import run_unified_simulation
from app.api.routes.physics import TheoryConditions, TheoryRunRequest, run_theories
from app.data.dataset_io import datasets_root
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


def _cells() -> List[Dict[str, Any]]:
    cells = []
    for case in iter_carbon_silicate_uq_cases():
        packed = dict(case)
        if packed.get("include_uncertainty"):
            packed["uncertainty_samples"] = 16
        cells.append(packed)
    # A few ICCF-27 EMP/contested anchors, not the whole grid.
    wanted = {
        "kasagi-nicu-radiant-2026",
        "czerski-thermal-spike-zr-2024",
        "hylenr-tamu-phase1-2026",
    }
    for case in iter_iccf27_grid_cases():
        if case.get("literature_id") in wanted:
            cells.append(case)
    return cells


async def _run() -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    experiments: List[Dict[str, Any]] = []
    theory_runs: List[Dict[str, Any]] = []
    for index, case in enumerate(_cells(), start=1):
        request = _simulate_payload(case, "iccf27_hydration", "carbon_silicate_uq")
        request.time_steps = 10
        request.total_time = 1.0
        # Pack is a committed JSONL fixture; skip live SQL auto-persist.
        request.persist_session_id = None
        request.persist_source = None
        response = await run_unified_simulation(request)
        body = response.model_dump() if hasattr(response, "model_dump") else dict(response)
        enhancement = body.get("enhancement") if isinstance(body.get("enhancement"), dict) else {}
        observables = body.get("observables") if isinstance(body.get("observables"), dict) else {}
        uq = ((body.get("reaction_rate_engine") or {}).get("uncertainty") or {})
        exp = {
            "id": f"iccf27-hyd-{index:02d}",
            "name": f"ICCF27 hydration {case.get('tag')}",
            "type": "unified_theory",
            "status": "completed",
            "is_baseline": False,
            "source": "simulation_campaign",
            "sourceClass": "Campaign",
            "material": case["host_material"],
            "temperature_k": case["temperature"],
            "loading_ratio": case["loading_ratio"],
            "enhancement_factor": float(enhancement.get("total") or 1.0),
            "excess_heat_watts": float(observables.get("excess_heat_watts") or 0.0),
            "literature_id": case.get("literature_id"),
            "claim_tag": case.get("claim_tag"),
            "results": {
                "is_model_output": True,
                "lenr_proved": False,
                "tag": case.get("tag"),
                "rate_mode": case.get("rate_mode"),
                "uncertainty": {
                    "p05": uq.get("credible_interval", {}).get("p05") if isinstance(uq.get("credible_interval"), dict) else None,
                    "p50": uq.get("median") or (uq.get("credible_interval") or {}).get("p50"),
                    "p95": (uq.get("credible_interval") or {}).get("p95") if isinstance(uq.get("credible_interval"), dict) else None,
                    "n_samples": uq.get("n_samples"),
                    "seed": uq.get("seed"),
                },
                "open_ids": OPEN_IDS,
            },
        }
        experiments.append(exp)
        loading = min(max(float(case.get("loading_ratio") or 0.9), 0.0), 1.0)
        theory_body = await run_theories(
            TheoryRunRequest(
                conditions=TheoryConditions(
                    temperature=min(max(float(case["temperature"]), 1.0), 2000.0),
                    loading_ratio=loading,
                    host_material=case.get("host_material"),
                    beam_energy_kev=case.get("beam_energy_kev"),
                    molecular_beam_species=case.get("molecular_beam_species"),
                ),
                enabled_theories=list(case["enabled_theories"]) if case.get("enabled_theories") else None,
            )
        )
        per_theory = theory_body.get("per_theory") or []
        scores = {
            row["theory_id"]: row
            for row in per_theory
            if isinstance(row, dict) and row.get("theory_id")
        }
        if scores:
            theory_runs.append({
                "id": f"iccf27-hyd-run-{index:02d}",
                "experiment_id": exp["id"],
                "theory_scores": scores,
                "is_empirical_confidence": False,
            })
    return experiments, theory_runs


def _write(experiments: List[Dict[str, Any]], runs: List[Dict[str, Any]]) -> Path:
    out = datasets_root() / "reviewer_packs" / "iccf27_hydration"
    out.mkdir(parents=True, exist_ok=True)
    (out / "experiments.jsonl").write_text(
        "\n".join(json.dumps(row) for row in experiments) + "\n",
        encoding="utf-8",
    )
    (out / "theory_runs.jsonl").write_text(
        "\n".join(json.dumps(row) for row in runs) + "\n",
        encoding="utf-8",
    )
    histogram: Dict[str, int] = {}
    for run in runs:
        for rec in (run.get("theory_scores") or {}).values():
            if isinstance(rec, dict) and rec.get("claim_tier"):
                histogram[str(rec["claim_tier"])] = histogram.get(str(rec["claim_tier"]), 0) + 1
    manifest = {
        "schema": PACK_SCHEMA,
        "disclaimer": DISCLAIMER,
        "lenr_proved": False,
        "empirical_claim_tiers_raised": False,
        "git_sha": _git_sha(),
        "preset": "iccf27_hydration",
        "n_experiments": len(experiments),
        "n_theory_runs": len(runs),
        "claim_tier_histogram": histogram,
        "source_class_counts": {"Campaign": len(experiments)},
        "open_ids": OPEN_IDS,
        "campaign_invariants": _load_invariants(),
        "score_formula": "five_factor_gm_x_claim_tier",
        "hosts": sorted({row["material"] for row in experiments}),
        "note": (
            "Model-output hydration of Pd/Ni plus graphite/SiC UQ cells and "
            "selected ICCF-27 literature anchors. Does not replace q_campaign_demo."
        ),
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return out


async def _async_main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    experiments, runs = await _run()
    out = _write(experiments, runs)
    logger.info("Wrote %s (%s experiments)", out, len(experiments))
    return 0


def main() -> int:
    return asyncio.run(_async_main())


if __name__ == "__main__":
    raise SystemExit(main())
