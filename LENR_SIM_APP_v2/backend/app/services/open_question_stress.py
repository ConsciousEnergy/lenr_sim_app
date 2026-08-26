"""Open-question stress report from persisted campaign / baseline rows.

Model outputs only. Does not close EQ-OPEN-* or prove LENR.
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.dataset_io import open_question_register
from app.models.database_models import Experiment
from app.services.simulation_persistence import DISCLAIMER

STRESS_SCHEMA = "lenr-open-question-stress-v1"
OPEN_IDS = (
    "EQ-OPEN-MEV-01",
    "EQ-OPEN-RAD-01",
    "EQ-OPEN-RATE-01",
    "EQ-OPEN-EC-01",
    "EQ-OPEN-YIELD-01",
)


def _parameters(experiment: Experiment) -> Dict[str, Any]:
    payload = experiment.parameters_json or {}
    return payload if isinstance(payload, dict) else {}


def experiment_open_question_ids(experiment: Experiment) -> List[str]:
    ids = _parameters(experiment).get("open_question_ids") or []
    if not isinstance(ids, list):
        return []
    return [str(item) for item in ids if item]


def tally_open_question_counts(experiments: Iterable[Experiment]) -> Dict[str, int]:
    counts: Counter[str] = Counter()
    for experiment in experiments:
        seen = set()
        for qid in experiment_open_question_ids(experiment):
            if qid in seen:
                continue
            seen.add(qid)
            counts[qid] += 1
    return dict(counts)


def _register_by_id() -> Dict[str, Dict[str, Any]]:
    questions = open_question_register().get("questions") or []
    return {str(row["id"]): row for row in questions if row.get("id")}


def _pipeline_scores(experiment: Experiment) -> Dict[str, Any]:
    results = experiment.results_json or {}
    scores = results.get("pipeline_scores") or {}
    return scores if isinstance(scores, dict) else {}


def _open_status(experiment: Experiment) -> Dict[str, Any]:
    results = experiment.results_json or {}
    status = results.get("open_question_status") or {}
    return status if isinstance(status, dict) else {}


def build_stress_report(
    experiments: Sequence[Experiment],
    *,
    include_live_scores: bool = False,
) -> Dict[str, Any]:
    register = _register_by_id()
    by_q: Dict[str, List[Experiment]] = {qid: [] for qid in OPEN_IDS}
    for experiment in experiments:
        for qid in experiment_open_question_ids(experiment):
            if qid in by_q:
                by_q[qid].append(experiment)

    questions: List[Dict[str, Any]] = []
    for qid in OPEN_IDS:
        meta = register.get(qid) or {}
        rows = by_q[qid]
        literature_counts: Counter[str] = Counter()
        claim_tags: Dict[str, str] = {}
        theories: Counter[str] = Counter()
        stored: List[Dict[str, Any]] = []
        for experiment in rows:
            params = _parameters(experiment)
            literature_id = str(params.get("literature_id") or "")
            if literature_id:
                literature_counts[literature_id] += 1
                if params.get("claim_tag"):
                    claim_tags[literature_id] = str(params.get("claim_tag"))
            enabled = params.get("enabled_theories") or []
            if isinstance(enabled, list):
                for theory_id in enabled:
                    theories[str(theory_id)] += 1
            for theory_id, rec in _pipeline_scores(experiment).items():
                if not isinstance(rec, dict):
                    continue
                stored.append(
                    {
                        "theory_id": theory_id,
                        "final_score": rec.get("final_score"),
                        "claim_tier": rec.get("claim_tier"),
                        "literature_id": literature_id or None,
                    }
                )
        live_scores: List[Dict[str, Any]] = []
        if include_live_scores and rows:
            live_scores = _live_scores_for_rows(rows[:8])
        questions.append(
            {
                "id": qid,
                "label": meta.get("label"),
                "status": meta.get("status") or "OPEN",
                "still_missing": meta.get("still_missing"),
                "n": len(rows),
                "literature_cells": [
                    {
                        "literature_id": lid,
                        "claim_tag": claim_tags.get(lid),
                        "n": count,
                    }
                    for lid, count in sorted(literature_counts.items())
                ],
                "theories": sorted(theories.keys()),
                "stored_scores": stored,
                "live_scores": live_scores,
            }
        )

    proved = any(
        bool(_open_status(experiment).get("lenr_proved")) for experiment in experiments
    )
    return {
        "schema": STRESS_SCHEMA,
        "disclaimer": DISCLAIMER,
        "lenr_proved": False,
        "occurrence_claimed": False,
        "empirical_claim_tiers_raised": False,
        "n_experiments": len(experiments),
        "open_ids": list(OPEN_IDS),
        "open_question_counts": tally_open_question_counts(experiments),
        "questions": questions,
        "any_row_claimed_proved": proved,
    }


def _live_scores_for_rows(rows: Sequence[Experiment]) -> List[Dict[str, Any]]:
    from app.physics_engine.theory_scoring import compute_theory_scores
    from app.physics_engine.literature_likelihood import (
        SCORE_MODE_FIVE_FACTOR,
        SCORE_MODE_PLUS_LITERATURE,
    )

    payload: List[Dict[str, Any]] = []
    seen: set[tuple[str, float, float]] = set()
    for experiment in rows:
        params = _parameters(experiment)
        enabled = params.get("enabled_theories") or []
        if not isinstance(enabled, list) or not enabled:
            continue
        theory_id = str(enabled[0])
        temperature = float(experiment.temperature_k or 300.0)
        loading = float(experiment.loading_ratio or 0.9)
        key = (theory_id, round(temperature, 1), round(loading, 3))
        if key in seen:
            continue
        seen.add(key)
        conditions = {"temperature": temperature, "loading_ratio": min(loading, 1.0)}
        five = compute_theory_scores(
            conditions=conditions,
            enabled_theories=[theory_id],
            skip_sensitivity=True,
            score_mode=SCORE_MODE_FIVE_FACTOR,
        )
        lit = compute_theory_scores(
            conditions=conditions,
            enabled_theories=[theory_id],
            skip_sensitivity=True,
            score_mode=SCORE_MODE_PLUS_LITERATURE,
        )
        five_rec = five.get(theory_id) or {}
        lit_rec = lit.get(theory_id) or {}
        payload.append(
            {
                "theory_id": theory_id,
                "five_factor": five_rec.get("final_score"),
                "five_factor_plus_literature": lit_rec.get("final_score"),
                "claim_tier": five_rec.get("claim_tier"),
            }
        )
    return payload


async def collect_stress_experiments(session: AsyncSession) -> List[Experiment]:
    result = await session.execute(select(Experiment))
    return list(result.scalars().all())


def write_stress_report(out_dir: Path, report: Dict[str, Any]) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "open_question_stress.json"
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return path
