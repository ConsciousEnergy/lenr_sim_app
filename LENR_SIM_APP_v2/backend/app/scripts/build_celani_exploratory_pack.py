"""Build the Celani constantan exploratory MoE reviewer pack.

Usage (from LENR_SIM_APP_v2/backend):
    python -m app.scripts.build_celani_exploratory_pack

Copies instrument_precision MoE already present in
``literature_exploratory_moe.v1.json``. Discovery stays REFUSE / gates-blocked —
never flips discovery_grade_eligible. Does not invent σ_Q. Does not prove LENR.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from app.data.dataset_io import (
    datasets_root,
    exploratory_moe_literature_records,
    stable_baseline_id,
)
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

CELANI_ID = "celani-constantan-2019"
PACK_DIRNAME = "celani_exploratory_moe"
PRESET = "celani_exploratory_moe"


def _celani_record() -> Dict[str, Any]:
    for row in exploratory_moe_literature_records():
        if row.get("literature_id") == CELANI_ID:
            return row
    raise RuntimeError(f"{CELANI_ID} missing from literature_exploratory_moe.v1.json")


def build_experiments() -> List[Dict[str, Any]]:
    record = _celani_record()
    columns = literature_moe_columns_from_record(record)
    # Honesty: exploratory instrument_precision must stay non-discovery.
    if columns.get("discovery_grade_eligible"):
        raise RuntimeError(
            "Celani exploratory MoE unexpectedly discovery_grade_eligible — refuse"
        )
    if columns.get("moe_provenance") != "literature_reported_instrument_precision":
        raise RuntimeError(
            f"unexpected Celani moe_provenance={columns.get('moe_provenance')!r}"
        )

    results = merge_bayesian_into_results(
        {
            "is_model_output": True,
            "lenr_proved": False,
            "tag": f"exploratory:{CELANI_ID}",
            "open_ids": list(OPEN_IDS),
            "corpus_moe_overlay": True,
            "corpus_moe_source": "literature_exploratory_moe.v1",
            "discovery_refuse": "REFUSE_FABRICATED_SIGMA_Q_discovery_flip",
        },
        columns,
    )
    results["discovery_grade_eligible"] = False
    results["lenr_proved"] = False

    return [
        {
            "id": f"celani-exp-{stable_baseline_id(CELANI_ID)[:8]}",
            "name": record.get("name") or "Celani constantan exploratory MoE",
            "description": record.get("description"),
            "type": record.get("experiment_type") or "lenr",
            "status": "completed",
            "is_baseline": False,
            "source": record.get("source") or "literature_exploratory_moe",
            "source_url": record.get("source_url"),
            "sourceClass": "Campaign",
            "material": record.get("material") or "nickel",
            "temperature_k": float(record.get("temperature_k") or 900.0),
            "pressure_bar": float(record.get("pressure_bar") or 1.0),
            "loading_ratio": record.get("loading_ratio"),
            "enhancement_factor": record.get("enhancement_factor"),
            "energy_output_kev": record.get("energy_output_kev"),
            "excess_heat_watts": float(record.get("excess_heat_watts") or 12.0),
            "duration_seconds": record.get("duration_seconds"),
            "literature_id": CELANI_ID,
            "claim_tag": record.get("claim_tag"),
            "citation_key": record.get("citation_key"),
            "doi": record.get("doi"),
            "open_question_ids": list(record.get("open_question_ids") or []),
            "sigma_Q_W": columns.get("sigma_q_w"),
            "moe_provenance": columns.get("moe_provenance"),
            "moe_citation_keys": columns.get("moe_citation_keys"),
            "moe_notes": columns.get("moe_notes"),
            "moe_sigma_q_pairing_verified": columns.get(
                "moe_sigma_q_pairing_verified"
            ),
            "s_heat": columns.get("s_heat"),
            "discovery_grade_eligible": False,
            "parameters": dict(record.get("parameters") or {}),
            "results": results,
        }
    ]


def _write(experiments: List[Dict[str, Any]]) -> Path:
    out = datasets_root() / "reviewer_packs" / PACK_DIRNAME
    out.mkdir(parents=True, exist_ok=True)
    (out / "experiments.jsonl").write_text(
        "\n".join(json.dumps(row) for row in experiments) + "\n",
        encoding="utf-8",
    )
    # No theory runs — corpus MoE hydrate only.
    (out / "theory_runs.jsonl").write_text("", encoding="utf-8")
    manifest = {
        "schema": PACK_SCHEMA,
        "disclaimer": DISCLAIMER,
        "lenr_proved": False,
        "empirical_claim_tiers_raised": False,
        "git_sha": _git_sha(),
        "preset": PRESET,
        "n_experiments": len(experiments),
        "n_theory_runs": 0,
        "claim_tier_histogram": {},
        "source_class_counts": {"Campaign": len(experiments)},
        "open_ids": OPEN_IDS,
        "campaign_invariants": _load_invariants(),
        "score_formula": "five_factor_gm_x_claim_tier",
        "hosts": sorted({row["material"] for row in experiments}),
        "literature_ids": [CELANI_ID],
        "note": (
            "Exploratory instrument_precision MoE hydrate for Celani constantan "
            "(σ_Q=2.0 from literature_exploratory_moe.v1). Discovery remains "
            "REFUSE / gates-blocked. Does not invent discovery σ. Does not prove LENR."
        ),
    }
    (out / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    return out


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    experiments = build_experiments()
    out = _write(experiments)
    logger.info("Wrote %s (%s experiments)", out, len(experiments))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
