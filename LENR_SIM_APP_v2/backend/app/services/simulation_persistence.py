"""Best-effort SQL persistence for simulation and theory-pipeline runs.

Generated rows are model outputs, not laboratory experiments. Extra runs do
not raise empirical claim tiers or close EQ-OPEN-* obligations.
"""

from __future__ import annotations

import logging
import os
import uuid
from typing import Any, Dict, Optional

from app.core.database import db_manager
from app.models.database_models import Experiment, ExperimentStatus, TheoryRun
from app.utils.json_safe import to_json_safe

logger = logging.getLogger(__name__)

SOURCE_AUTO_PERSIST = "auto_persist"
SOURCE_CAMPAIGN = "simulation_campaign"
SHARED_SOURCES = (SOURCE_AUTO_PERSIST, SOURCE_CAMPAIGN)

DISCLAIMER = (
    "Model output only. Not a laboratory experiment. Additional runs do not "
    "raise empirical claim tiers or close EQ-OPEN-*."
)


def persistence_enabled() -> bool:
    """Return False when LENR_AUTO_PERSIST is explicitly disabled."""
    flag = os.getenv("LENR_AUTO_PERSIST", "1").strip().lower()
    return flag not in {"0", "false", "no", "off"}


def _dump(obj: Any) -> Dict[str, Any]:
    if obj is None:
        return {}
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "dict"):
        return obj.dict()
    if isinstance(obj, dict):
        return obj
    return {}


def _pa_to_bar(pressure_pa: float) -> float:
    return float(pressure_pa) / 1.0e5


def _open_question_status(open_questions: Dict[str, Any]) -> Dict[str, Any]:
    keys = (
        "q_mev_gap",
        "q_radiation",
        "q_statistical",
        "q_electron_capture",
        "q_integrated_yield",
    )
    status: Dict[str, Any] = {
        "lenr_proved": bool(open_questions.get("lenr_proved", False)),
        "open_ids": list(open_questions.get("open_ids") or []),
        "schema": open_questions.get("schema"),
    }
    for key in keys:
        block = open_questions.get(key) or {}
        status[key] = {
            "id": block.get("id"),
            "status": block.get("status"),
            "occurrence_claimed": block.get("occurrence_claimed"),
        }
    return status


def _compact_results(
    *,
    experiment_type: str,
    response: Dict[str, Any],
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    open_questions = response.get("open_questions") or {}
    payload = {
        "is_model_output": True,
        "disclaimer": DISCLAIMER,
        "experiment_type": experiment_type,
        "contract_version": response.get("contract_version"),
        "confidence": response.get("confidence"),
        "observables": response.get("observables") or {},
        "open_question_status": _open_question_status(open_questions),
        "validation": response.get("validation") or {},
    }
    if extra:
        payload.update(extra)
    return to_json_safe(payload)


def _scores_from_pipeline(pipeline_result: Any) -> Dict[str, Any]:
    if pipeline_result is None:
        return {}
    contributions = getattr(pipeline_result, "contributions", None)
    if contributions is None and isinstance(pipeline_result, dict):
        contributions = pipeline_result.get("per_theory") or pipeline_result.get(
            "contributions"
        )
    scores: Dict[str, Any] = {}
    for contrib in contributions or []:
        if isinstance(contrib, dict):
            tid = contrib.get("theory_id")
            breakdown = contrib.get("confidence_breakdown") or {}
            if not tid:
                continue
            scores[tid] = {
                "score": float(breakdown.get("weighted_score", contrib.get("confidence") or 0.0)),
                "enhancement": float(contrib.get("enhancement_factor") or 1.0),
                "confidence": float(contrib.get("confidence") or 0.0),
                "claim_tier": contrib.get("claim_tier"),
                "is_applicable": bool(contrib.get("is_applicable", True)),
            }
            continue
        tid = getattr(contrib, "theory_id", None)
        if not tid:
            continue
        breakdown = getattr(contrib, "confidence_breakdown", None) or {}
        scores[tid] = {
            "score": float(breakdown.get("weighted_score", getattr(contrib, "confidence", 0.0))),
            "enhancement": float(getattr(contrib, "enhancement_factor", 1.0)),
            "confidence": float(getattr(contrib, "confidence", 0.0)),
            "claim_tier": getattr(contrib, "claim_tier", None),
            "is_applicable": bool(getattr(contrib, "is_applicable", True)),
        }
    return scores


def _top_theory(scores: Dict[str, Any]) -> tuple[Optional[str], float]:
    if not scores:
        return None, 0.0
    tid, rec = max(scores.items(), key=lambda item: float(item[1].get("score") or 0.0))
    return tid, float(rec.get("score") or 0.0)


async def persist_best_effort(
    *,
    experiment_type: str,
    name: str,
    material: str,
    temperature_k: float,
    pressure_bar: float,
    loading_ratio: Optional[float],
    enhancement_factor: Optional[float],
    fusion_rate: Optional[float],
    energy_output_kev: Optional[float],
    excess_heat_watts: Optional[float],
    duration_seconds: Optional[float],
    parameters: Dict[str, Any],
    results: Dict[str, Any],
    pipeline_result: Any = None,
    session_id: Optional[str] = None,
    source: str = SOURCE_AUTO_PERSIST,
    conditions: Optional[Dict[str, Any]] = None,
    status: str = ExperimentStatus.COMPLETED.value,
) -> Dict[str, Any]:
    """Insert Experiment + optional TheoryRun. Never raises to callers."""
    if not persistence_enabled() or not db_manager._is_initialized:
        return {}
    try:
        from app.services.scientific_outcomes import (
            classify_scientific_outcome,
            tally_claim_tiers,
        )

        scores = _scores_from_pipeline(pipeline_result)
        stamped = dict(results or {})
        if scores:
            stamped.setdefault("pipeline_scores", scores)
        stamped["scientific_outcome"] = classify_scientific_outcome(
            status=status,
            excess_heat_watts=excess_heat_watts,
            pipeline_scores=scores,
            results=stamped,
        )
        stamped.setdefault("claim_tier_histogram", tally_claim_tiers(scores))
        stamped.setdefault("is_model_output", True)
        stamped.setdefault("disclaimer", DISCLAIMER)

        async with db_manager.session() as session:
            experiment = Experiment(
                id=str(uuid.uuid4()),
                name=name,
                description=DISCLAIMER,
                experiment_type=experiment_type,
                session_id=session_id,
                status=status or ExperimentStatus.COMPLETED.value,
                is_baseline=False,
                source=source,
                material=(material or "palladium").lower(),
                temperature_k=float(temperature_k),
                pressure_bar=float(pressure_bar),
                loading_ratio=loading_ratio,
                parameters_json=to_json_safe(parameters),
                enhancement_factor=enhancement_factor,
                fusion_rate=fusion_rate,
                energy_output_kev=energy_output_kev,
                excess_heat_watts=excess_heat_watts,
                duration_seconds=duration_seconds,
                results_json=to_json_safe(stamped),
            )
            session.add(experiment)

            theory_run_id = None
            scores = _scores_from_pipeline(pipeline_result)
            if scores or pipeline_result is not None:
                cond = conditions or {}
                top_id, top_score = _top_theory(scores)
                combined = 1.0
                energy_w = 0.0
                enabled = []
                if pipeline_result is not None:
                    combined = float(
                        getattr(pipeline_result, "combined_enhancement", None)
                        or (pipeline_result.get("combined_enhancement") if isinstance(pipeline_result, dict) else 1.0)
                        or 1.0
                    )
                    energy_w = float(
                        getattr(pipeline_result, "total_energy_watts", None)
                        or (pipeline_result.get("total_energy_watts") if isinstance(pipeline_result, dict) else 0.0)
                        or 0.0
                    )
                    enabled = list(
                        getattr(pipeline_result, "enabled_theories", None)
                        or (pipeline_result.get("enabled_theories") if isinstance(pipeline_result, dict) else [])
                        or []
                    )
                theory_run = TheoryRun(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    temperature_k=float(temperature_k),
                    loading_ratio=float(loading_ratio or 0.9),
                    pressure_pa=float(pressure_bar) * 1.0e5,
                    conditions=to_json_safe(cond),
                    enabled_theories=enabled,
                    theory_scores=to_json_safe(scores),
                    combined_enhancement=combined,
                    total_energy_watts=energy_w,
                    top_theory_id=top_id,
                    top_theory_score=top_score,
                    validation_summary={
                        "is_model_output": True,
                        "disclaimer": DISCLAIMER,
                        "source": source,
                        "experiment_id": experiment.id,
                    },
                )
                session.add(theory_run)
                theory_run_id = theory_run.id

            await session.flush()
            payload = {
                "experiment_id": experiment.id,
                "theory_run_id": theory_run_id,
                "source": source,
                "is_model_output": True,
                "disclaimer": DISCLAIMER,
            }
            logger.info(
                "Persisted %s run %s (theory_run=%s)",
                experiment_type,
                experiment.id,
                theory_run_id,
            )
            return payload
    except Exception:
        logger.exception("auto-persist failed; simulation response unchanged")
        return {}

