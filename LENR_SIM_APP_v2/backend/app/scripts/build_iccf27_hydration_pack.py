"""Build the ICCF-27 hydration reviewer pack from live model-output campaign cells.

Usage (from LENR_SIM_APP_v2/backend):
    python -m app.scripts.build_iccf27_hydration_pack

Cite-gated Kasagi MoE (σ_Q=0.08, literature_reported) is copied from
``literature_iccf27.v1.json`` onto hydrate envelopes — never invented.
Null-σ ICCF companions stay null-σ. Does not prove LENR. EQ-OPEN-* stay OPEN.
Does not rewrite q_campaign_demo.
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from app.campaign.carbon_silicate import iter_carbon_silicate_uq_cases
from app.campaign.iccf27 import iter_iccf27_grid_cases
from app.campaign.runner import _simulate_payload
from app.api.routes.unified_simulation import run_unified_simulation
from app.api.routes.physics import TheoryConditions, TheoryRunRequest, run_theories
from app.data.dataset_io import datasets_root, iccf27_literature_records
from app.services.literature_moe_persistence import (
    literature_moe_columns_from_record,
    merge_bayesian_into_results,
)
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

# Full ICCF-27 companion set for pack coverage (null-σ unless cite-gated).
WANTED_ICCF_IDS: Set[str] = {
    "kasagi-nicu-radiant-2026",
    "kasagi-ni-radiant-2026",
    "czerski-thermal-spike-zr-2024",
    "czerski-thermal-spike-tipd-2026",
    "hylenr-tamu-phase1-2026",
    "valat-heat-bursts-pd-2026",
}

# Only these may carry corpus literature_reported MoE into the pack envelope.
CITE_GATED_KASAGI_IDS: Set[str] = {
    "kasagi-nicu-radiant-2026",
    "kasagi-ni-radiant-2026",
}

# Stable pack slots for ICCF literature cells.
# Preserve pre-#479 identities: hyd-10 = Czerski-Zr, hyd-11 = HyLENR.
# Kasagi-Ni / tipd / Valat take distinct slots — never reuse 10/11 for new lit.
STABLE_ICCF_PACK_SLOT: Dict[str, int] = {
    "kasagi-nicu-radiant-2026": 9,
    "czerski-thermal-spike-zr-2024": 10,
    "hylenr-tamu-phase1-2026": 11,
    "kasagi-ni-radiant-2026": 12,
    "czerski-thermal-spike-tipd-2026": 13,
    "valat-heat-bursts-pd-2026": 14,
}


def _iccf27_by_id() -> Dict[str, Dict[str, Any]]:
    return {
        str(row["literature_id"]): row
        for row in iccf27_literature_records()
        if row.get("literature_id")
    }


def _cells() -> List[Dict[str, Any]]:
    cells = []
    for case in iter_carbon_silicate_uq_cases():
        packed = dict(case)
        if packed.get("include_uncertainty"):
            packed["uncertainty_samples"] = 16
        cells.append(packed)
    for case in iter_iccf27_grid_cases():
        if case.get("literature_id") in WANTED_ICCF_IDS:
            cells.append(case)
    return cells


def apply_corpus_moe_overlay(
    experiment: Dict[str, Any],
    *,
    corpus_by_id: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Copy corpus MoE onto a pack hydrate row — never invent σ_Q.

    Kasagi pair: excess from corpus Q, σ=0.08, literature_reported, pairing,
    s_heat locked, discovery_grade_eligible analytics-only, lenr_proved=false.
    Other ICCF anchors: literature metadata only; sigma stays absent/null.
    """
    lit_id = experiment.get("literature_id")
    if not lit_id:
        return experiment

    by_id = corpus_by_id if corpus_by_id is not None else _iccf27_by_id()
    record = by_id.get(str(lit_id))
    if record is None:
        return experiment

    out = dict(experiment)
    out["citation_key"] = record.get("citation_key") or out.get("citation_key")
    out["doi"] = record.get("doi") or out.get("doi")
    out["claim_tag"] = record.get("claim_tag") or out.get("claim_tag")
    out["open_question_ids"] = list(
        record.get("open_question_ids") or out.get("open_question_ids") or []
    )

    results = dict(out.get("results") or {})
    results["is_model_output"] = True
    results["lenr_proved"] = False
    results.setdefault("open_ids", list(OPEN_IDS))

    if str(lit_id) not in CITE_GATED_KASAGI_IDS:
        # Null-σ honest completeness — do not copy or invent watt MoE.
        out["results"] = results
        out.pop("sigma_Q_W", None)
        out.pop("moe_provenance", None)
        out.pop("s_heat", None)
        out.pop("discovery_grade_eligible", None)
        out.pop("moe_sigma_q_pairing_verified", None)
        return out

    columns = literature_moe_columns_from_record(record)
    # Excess from corpus Q (not unified-sim 0).
    corpus_q = record.get("excess_heat_watts")
    if corpus_q is not None:
        out["excess_heat_watts"] = float(corpus_q)

    out["sigma_Q_W"] = columns.get("sigma_q_w")
    out["sigma_Q_systematic_W"] = columns.get("sigma_q_systematic_w")
    out["moe_provenance"] = columns.get("moe_provenance")
    out["moe_citation_keys"] = columns.get("moe_citation_keys")
    out["moe_notes"] = columns.get("moe_notes")
    out["moe_sigma_q_pairing_verified"] = columns.get(
        "moe_sigma_q_pairing_verified"
    )
    out["s_heat"] = columns.get("s_heat")
    # Analytics-only flag in the hydrate envelope (pack import still demotes
    # discovery on SQL insert; seed path preserves for Experiment rows).
    out["discovery_grade_eligible"] = bool(columns.get("discovery_grade_eligible"))

    results = merge_bayesian_into_results(results, columns)
    results["is_model_output"] = True
    results["lenr_proved"] = False
    results["corpus_moe_overlay"] = True
    results["corpus_moe_source"] = "literature_iccf27.v1"
    results["open_ids"] = list(OPEN_IDS)
    # Keep analytics eligibility visible in results for pack consumers.
    results["discovery_grade_eligible"] = bool(columns.get("discovery_grade_eligible"))
    out["results"] = results
    return out


def _pack_slot_for_case(case: Dict[str, Any], fallback_index: int) -> int:
    """Stable ICCF slots; UQ cells keep sequential 1..N indices."""
    lit_id = case.get("literature_id")
    if lit_id and str(lit_id) in STABLE_ICCF_PACK_SLOT:
        return STABLE_ICCF_PACK_SLOT[str(lit_id)]
    return fallback_index


def _clamped_theory_inputs(case: Dict[str, Any]) -> Dict[str, Any]:
    """Importer-compatible TheoryRunRequest conditions (clamped), not raw experiment L."""
    temperature = min(max(float(case["temperature"]), 1.0), 2000.0)
    loading = min(max(float(case.get("loading_ratio") or 0.9), 0.0), 1.0)
    conditions: Dict[str, Any] = {
        "temperature": temperature,
        "loading_ratio": loading,
        "host_material": case.get("host_material"),
    }
    if case.get("beam_energy_kev") is not None:
        conditions["beam_energy_kev"] = case.get("beam_energy_kev")
    if case.get("molecular_beam_species") is not None:
        conditions["molecular_beam_species"] = case.get("molecular_beam_species")
    return {
        "temperature_k": temperature,
        "loading_ratio": loading,
        "conditions": conditions,
    }


async def _run() -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    experiments: List[Dict[str, Any]] = []
    theory_runs: List[Dict[str, Any]] = []
    corpus_by_id = _iccf27_by_id()
    used_slots: Set[int] = set()
    for index, case in enumerate(_cells(), start=1):
        pack_slot = _pack_slot_for_case(case, index)
        if pack_slot in used_slots:
            raise RuntimeError(
                f"ICCF pack slot collision at iccf27-hyd-{pack_slot:02d} "
                f"(literature_id={case.get('literature_id')!r})"
            )
        used_slots.add(pack_slot)
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
            "id": f"iccf27-hyd-{pack_slot:02d}",
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
        exp = apply_corpus_moe_overlay(exp, corpus_by_id=corpus_by_id)
        experiments.append(exp)
        theory_inputs = _clamped_theory_inputs(case)
        theory_body = await run_theories(
            TheoryRunRequest(
                conditions=TheoryConditions(**theory_inputs["conditions"]),
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
                "id": f"iccf27-hyd-run-{pack_slot:02d}",
                "experiment_id": exp["id"],
                "temperature_k": theory_inputs["temperature_k"],
                "loading_ratio": theory_inputs["loading_ratio"],
                "conditions": theory_inputs["conditions"],
                "theory_scores": scores,
                "is_empirical_confidence": False,
            })
    experiments.sort(key=lambda row: str(row.get("id") or ""))
    theory_runs.sort(key=lambda row: str(row.get("id") or ""))
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
    lit_ids = sorted(
        {str(row["literature_id"]) for row in experiments if row.get("literature_id")}
    )
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
        "literature_ids": lit_ids,
        "cite_gated_moe_ids": sorted(CITE_GATED_KASAGI_IDS & set(lit_ids)),
        "note": (
            "Model-output hydration of Pd/Ni plus graphite/SiC UQ cells and "
            "ICCF-27 literature anchors. Stable pack slots: hyd-10=Czerski-Zr, "
            "hyd-11=HyLENR (pre-#479 identities); Kasagi-Ni=hyd-12. Cite-gated "
            "Kasagi MoE (σ_Q=0.08, literature_reported) is copied from "
            "literature_iccf27.v1 — never invented. Theory runs serialize "
            "clamped temperature_k/loading_ratio/conditions for importer "
            "fidelity. Null-σ companions stay null-σ. Does not replace "
            "q_campaign_demo. Does not prove LENR."
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
