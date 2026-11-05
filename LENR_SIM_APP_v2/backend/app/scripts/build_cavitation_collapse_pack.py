"""Build the cavitation/collapse reviewer pack from live model-output cells.

Usage (from LENR_SIM_APP_v2/backend):
    python -m app.scripts.build_cavitation_collapse_pack

Does not prove LENR. EQ-OPEN-* stay OPEN. Does not rewrite q_campaign_demo.
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from app.api.routes.physics import TheoryConditions, TheoryRunRequest, run_theories
from app.api.routes.unified_simulation import run_bubble_lattice_simulation
from app.campaign.cavitation_collapse import iter_cavitation_collapse_cases
from app.campaign.runner import _bubble_lattice_payload
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

PRESET = "cavitation_collapse"
PACK_DIRNAME = "cavitation_collapse_campaign"
# Pinned fixture: keep Sobol samples modest for committed JSONL size/runtime.
PACK_UQ_SAMPLES = 16


def _cells() -> List[Dict[str, Any]]:
    cells: List[Dict[str, Any]] = []
    for case in iter_cavitation_collapse_cases():
        packed = dict(case)
        if packed.get("include_uncertainty"):
            packed["uncertainty_samples"] = PACK_UQ_SAMPLES
        cells.append(packed)
    return cells


def _collapse_summary(body: Dict[str, Any]) -> Dict[str, Any]:
    collapse = body.get("collapse_results") if isinstance(body.get("collapse_results"), dict) else {}
    peak = body.get("peak_conditions") if isinstance(body.get("peak_conditions"), dict) else {}
    dynamics = collapse.get("bubble_dynamics") if isinstance(collapse.get("bubble_dynamics"), dict) else {}
    uq = body.get("collapse_uncertainty") if isinstance(body.get("collapse_uncertainty"), dict) else {}
    rate_uq = ((body.get("reaction_rate_engine") or {}).get("uncertainty") or {})
    observables = uq.get("observables") if isinstance(uq.get("observables"), dict) else {}
    temp_ci = (
        (observables.get("peak_temperature_k") or {}).get("credible_interval")
        if isinstance(observables.get("peak_temperature_k"), dict)
        else None
    )
    return {
        "min_radius_um": collapse.get("min_radius_um"),
        "max_temperature_k": collapse.get("max_temperature_k"),
        "max_pressure_bar": collapse.get("max_pressure_bar"),
        "peak_enhancement": peak.get("enhancement_factor") or collapse.get("peak_enhancement"),
        "dynamics_mode": dynamics.get("mode") or dynamics.get("bubble_dynamics_mode"),
        "peak_mach": dynamics.get("peak_mach"),
        "bounds_solver_used": dynamics.get("bounds_solver_used"),
        "km_auto_selected": dynamics.get("km_auto_selected"),
        "collapse_uq": {
            "peak_temperature_k": temp_ci,
            "n_samples": (uq.get("inputs") or {}).get("n_samples") if isinstance(uq.get("inputs"), dict) else None,
            "seed": (uq.get("inputs") or {}).get("seed") if isinstance(uq.get("inputs"), dict) else None,
        },
        "rate_uq": {
            "p05": (rate_uq.get("credible_interval") or {}).get("p05")
            if isinstance(rate_uq.get("credible_interval"), dict)
            else None,
            "p50": rate_uq.get("median")
            or (
                (rate_uq.get("credible_interval") or {}).get("p50")
                if isinstance(rate_uq.get("credible_interval"), dict)
                else None
            ),
            "p95": (rate_uq.get("credible_interval") or {}).get("p95")
            if isinstance(rate_uq.get("credible_interval"), dict)
            else None,
            "n_samples": rate_uq.get("n_samples"),
            "seed": rate_uq.get("seed"),
        },
    }


async def _run() -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    experiments: List[Dict[str, Any]] = []
    theory_runs: List[Dict[str, Any]] = []
    for index, case in enumerate(_cells(), start=1):
        request = _bubble_lattice_payload(case, session_id=None, preset=PRESET)
        response = await run_bubble_lattice_simulation(request)
        body = response.model_dump() if hasattr(response, "model_dump") else dict(response)
        bubble = case.get("bubble") or {}
        summary = _collapse_summary(body)
        exp = {
            "id": f"cav-collapse-{index:02d}",
            "name": f"Cavitation collapse {case.get('tag')}",
            "type": "bubble_fusion",
            "status": "completed",
            "is_baseline": False,
            "source": "simulation_campaign",
            "sourceClass": "Campaign",
            "material": case["host_material"],
            "temperature_k": case["temperature"],
            "loading_ratio": case["loading_ratio"],
            "enhancement_factor": float(summary.get("peak_enhancement") or 1.0),
            "excess_heat_watts": 0.0,
            "literature_id": case.get("literature_id"),
            "claim_tag": case.get("claim_tag"),
            "results": {
                "is_model_output": True,
                "lenr_proved": False,
                "tag": case.get("tag"),
                "rate_mode": case.get("rate_mode"),
                "route": "bubble_lattice",
                "campaign_preset": PRESET,
                "bubble": {
                    "initial_radius_um": bubble.get("initial_radius_um"),
                    "driving_pressure_bar": bubble.get("driving_pressure_bar"),
                    "frequency_khz": bubble.get("frequency_khz"),
                    "bubble_dynamics_mode": bubble.get("bubble_dynamics_mode"),
                },
                "collapse": summary,
                "open_question_ids": list(case.get("open_question_ids") or []),
                "open_ids": OPEN_IDS,
                "citation_key": case.get("citation_key"),
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
                ),
            )
        )
        per_theory = theory_body.get("per_theory") or []
        scores = {
            row["theory_id"]: row
            for row in per_theory
            if isinstance(row, dict) and row.get("theory_id")
        }
        if scores:
            theory_runs.append(
                {
                    "id": f"cav-collapse-run-{index:02d}",
                    "experiment_id": exp["id"],
                    "theory_scores": scores,
                    "is_empirical_confidence": False,
                }
            )
    return experiments, theory_runs


def _write(experiments: List[Dict[str, Any]], runs: List[Dict[str, Any]]) -> Path:
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
    histogram: Dict[str, int] = {}
    for run in runs:
        for rec in (run.get("theory_scores") or {}).values():
            if isinstance(rec, dict) and rec.get("claim_tier"):
                histogram[str(rec["claim_tier"])] = histogram.get(str(rec["claim_tier"]), 0) + 1
    hosts = sorted({row["material"] for row in experiments})
    dynamics_modes = sorted(
        {
            str((row.get("results") or {}).get("bubble", {}).get("bubble_dynamics_mode"))
            for row in experiments
            if (row.get("results") or {}).get("bubble", {}).get("bubble_dynamics_mode")
        }
    )
    literature_ids = sorted(
        {str(row["literature_id"]) for row in experiments if row.get("literature_id")}
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
        "claim_tier_histogram": histogram,
        "source_class_counts": {"Campaign": len(experiments)},
        "open_ids": OPEN_IDS,
        "campaign_invariants": _load_invariants(),
        "score_formula": "five_factor_gm_x_claim_tier",
        "hosts": hosts,
        "dynamics_modes": dynamics_modes,
        "literature_ids": literature_ids,
        "note": (
            "Model-output cavitation/collapse campaign: bubble-lattice cells "
            "varying host, loading, acoustic drive, and dynamics_mode with "
            "include_uncertainty. Contested sonofusion literature anchor "
            "included. Does not prove LENR; EQ-OPEN-* stay OPEN."
        ),
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return out


async def _async_main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    experiments, runs = await _run()
    out = _write(experiments, runs)
    logger.info("Wrote %s (%s experiments, %s theory_runs)", out, len(experiments), len(runs))
    return 0


def main() -> int:
    return asyncio.run(_async_main())


if __name__ == "__main__":
    raise SystemExit(main())
