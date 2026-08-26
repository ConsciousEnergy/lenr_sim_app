"""Export persisted experiments and theory_runs as a researcher review pack.

Model outputs only. Does not prove LENR or close EQ-OPEN-*.
"""

from __future__ import annotations

import json
import subprocess
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database_models import Experiment, TheoryRun
from app.services.analytics_service import classify_source_class
from app.services.simulation_persistence import DISCLAIMER

PACK_SCHEMA = "lenr-reviewer-pack-v1"
INVARIANTS_PATH = (
    Path(__file__).resolve().parents[4]
    / "formalization"
    / "predictions"
    / "campaign_invariants.json"
)


def _git_sha() -> Optional[str]:
    try:
        root = Path(__file__).resolve().parents[4]
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip() or None
    except Exception:
        return None


def _load_invariants() -> Dict[str, Any]:
    if not INVARIANTS_PATH.is_file():
        return {"schema": "lenr-campaign-predictions-v1", "lenr_proved": False}
    with INVARIANTS_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def _claim_tiers(experiments: List[Experiment], runs: List[TheoryRun]) -> Dict[str, int]:
    counts: Counter[str] = Counter()
    for run in runs:
        for rec in (run.theory_scores or {}).values():
            if isinstance(rec, dict) and rec.get("claim_tier"):
                counts[str(rec["claim_tier"])] += 1
    for exp in experiments:
        results = exp.results_json or {}
        scores = results.get("pipeline_scores") or {}
        if isinstance(scores, dict):
            for rec in scores.values():
                if isinstance(rec, dict) and rec.get("claim_tier"):
                    counts[str(rec["claim_tier"])] += 1
    return dict(counts)


def build_manifest(
    experiments: List[Experiment],
    runs: List[TheoryRun],
    *,
    preset: Optional[str] = None,
) -> Dict[str, Any]:
    source_counts: Counter[str] = Counter()
    for exp in experiments:
        source_counts[
            classify_source_class(is_baseline=bool(exp.is_baseline), source=exp.source)
        ] += 1
    invariants = _load_invariants()
    return {
        "schema": PACK_SCHEMA,
        "disclaimer": DISCLAIMER,
        "lenr_proved": False,
        "empirical_claim_tiers_raised": False,
        "git_sha": _git_sha(),
        "preset": preset,
        "n_experiments": len(experiments),
        "n_theory_runs": len(runs),
        "claim_tier_histogram": _claim_tiers(experiments, runs),
        "source_class_counts": dict(source_counts),
        "open_ids": [
            "EQ-OPEN-MEV-01",
            "EQ-OPEN-RAD-01",
            "EQ-OPEN-RATE-01",
            "EQ-OPEN-EC-01",
            "EQ-OPEN-YIELD-01",
        ],
        "campaign_invariants": invariants,
        "score_formula": "five_factor_gm_x_claim_tier",
        "skip_sensitivity_note": (
            "Persisted parameter_sensitivity is 0.5 unless live scores are computed."
        ),
    }


async def collect_pack_rows(
    session: AsyncSession,
) -> tuple[List[Experiment], List[TheoryRun]]:
    experiments = list((await session.execute(select(Experiment))).scalars().all())
    runs = list((await session.execute(select(TheoryRun))).scalars().all())
    return experiments, runs


def write_pack(
    out_dir: Path,
    experiments: List[Experiment],
    runs: List[TheoryRun],
    *,
    preset: Optional[str] = None,
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = build_manifest(experiments, runs, preset=preset)
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    with (out_dir / "experiments.jsonl").open("w", encoding="utf-8") as handle:
        for exp in experiments:
            row = exp.to_dict()
            row["sourceClass"] = classify_source_class(
                is_baseline=bool(exp.is_baseline), source=exp.source
            )
            handle.write(json.dumps(row) + "\n")
    with (out_dir / "theory_runs.jsonl").open("w", encoding="utf-8") as handle:
        for run in runs:
            handle.write(json.dumps(run.to_dict()) + "\n")
    return out_dir / "manifest.json"
