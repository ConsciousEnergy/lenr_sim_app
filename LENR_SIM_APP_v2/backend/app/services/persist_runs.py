"""Route-facing persist helpers for unified, bubble-lattice, and theory runs."""

from __future__ import annotations

from typing import Any, Dict, Optional

from app.models.database_models import ExperimentStatus
from app.services.simulation_persistence import (
    DISCLAIMER,
    SOURCE_AUTO_PERSIST,
    _compact_results,
    _dump,
    _pa_to_bar,
    persist_best_effort,
)


def provenance_from_mapping(data: Dict[str, Any]) -> Dict[str, Any]:
    """Copy campaign literature keys into parameters_json (omit empties)."""
    payload: Dict[str, Any] = {}
    preset = data.get("campaign_preset")
    tag = data.get("campaign_tag") or data.get("tag")
    literature_id = data.get("literature_id")
    claim_tag = data.get("claim_tag")
    open_ids = data.get("open_question_ids")
    if preset:
        payload["campaign_preset"] = preset
    if tag:
        payload["tag"] = tag
    if literature_id:
        payload["literature_id"] = literature_id
    if claim_tag:
        payload["claim_tag"] = claim_tag
    if isinstance(open_ids, list) and open_ids:
        payload["open_question_ids"] = [str(item) for item in open_ids if item]
    return payload


def campaign_experiment_name(
    *,
    kind: str,
    material: str,
    rate_mode: str,
    temperature: float,
    tag: Optional[str] = None,
    failed: bool = False,
) -> str:
    """Prefer the campaign tag so Analytics History can slice by literature cell."""
    prefix = "FAILED " if failed else ""
    if tag:
        return f"{prefix}Campaign {tag}"[:255]
    return f"{prefix}{kind} {material} {rate_mode} T={float(temperature):.0f}K"[:255]


def _merge_parameters(
    base: Dict[str, Any],
    data: Dict[str, Any],
) -> Dict[str, Any]:
    merged = dict(base)
    merged.update(provenance_from_mapping(data))
    return merged


async def persist_unified_simulation(
    request: Any,
    response: Any,
    pipeline_result: Any = None,
    *,
    session_id: Optional[str] = None,
    source: str = SOURCE_AUTO_PERSIST,
) -> Dict[str, Any]:
    req = _dump(request)
    resp = _dump(response)
    material = ((req.get("material") or {}).get("host_material") or "palladium")
    env = req.get("environmental") or {}
    lattice = req.get("lattice") or {}
    enhancement = (resp.get("enhancement") or {}).get("total")
    observables = resp.get("observables") or {}
    rate_mode = req.get("rate_mode") or "two_body"
    temperature = float(env.get("temperature") or 300.0)
    provenance = provenance_from_mapping(req)
    return await persist_best_effort(
        experiment_type="unified_theory",
        name=campaign_experiment_name(
            kind="Unified",
            material=material,
            rate_mode=str(rate_mode),
            temperature=temperature,
            tag=provenance.get("tag"),
        ),
        material=material,
        temperature_k=temperature,
        pressure_bar=_pa_to_bar(float(env.get("pressure") or 101325.0)),
        loading_ratio=lattice.get("loading_ratio"),
        enhancement_factor=enhancement,
        fusion_rate=observables.get("reaction_rate"),
        energy_output_kev=None,
        excess_heat_watts=observables.get("excess_heat_watts"),
        duration_seconds=req.get("total_time"),
        parameters=_merge_parameters(
            {
                "reactant": (req.get("material") or {}).get("reactant"),
                "rate_mode": rate_mode,
                "use_theory_pipeline": req.get("use_theory_pipeline"),
                "enabled_theories": req.get("enabled_theories"),
            },
            req,
        ),
        results=_compact_results(experiment_type="unified_theory", response=resp),
        pipeline_result=pipeline_result,
        session_id=session_id,
        source=source,
        conditions={
            "temperature": env.get("temperature"),
            "loading_ratio": lattice.get("loading_ratio"),
            "pressure": env.get("pressure"),
        },
    )


async def persist_bubble_lattice(
    request: Any,
    response: Any,
    *,
    session_id: Optional[str] = None,
    source: str = SOURCE_AUTO_PERSIST,
) -> Dict[str, Any]:
    req = _dump(request)
    resp = _dump(response)
    material = ((req.get("material") or {}).get("host_material") or "palladium")
    bubble = req.get("bubble") or {}
    lattice = req.get("lattice") or {}
    peak = resp.get("peak_conditions") or {}
    collapse = resp.get("collapse_results") or {}
    return await persist_best_effort(
        experiment_type="bubble_fusion",
        name=f"Bubble-lattice {material} T={bubble.get('ambient_temperature_k', 298):.0f}K",
        material=material,
        temperature_k=float(bubble.get("ambient_temperature_k") or 298.0),
        pressure_bar=float(bubble.get("driving_pressure_bar") or 1.0),
        loading_ratio=lattice.get("loading_ratio"),
        enhancement_factor=peak.get("enhancement_factor") or collapse.get("peak_enhancement"),
        fusion_rate=None,
        energy_output_kev=None,
        excess_heat_watts=None,
        duration_seconds=None,
        parameters={
            "reactant": (req.get("material") or {}).get("reactant"),
            "rate_mode": req.get("rate_mode"),
            "frequency_khz": bubble.get("frequency_khz"),
            "initial_radius_um": bubble.get("initial_radius_um"),
        },
        results=_compact_results(
            experiment_type="bubble_fusion",
            response=resp,
            extra={"peak_conditions": {k: peak.get(k) for k in ("temperature_k", "pressure_gpa", "enhancement_factor")}},
        ),
        session_id=session_id,
        source=source,
        conditions={
            "temperature": bubble.get("ambient_temperature_k"),
            "loading_ratio": lattice.get("loading_ratio"),
        },
    )


async def persist_theory_pipeline(
    request: Any,
    result: Any,
    *,
    session_id: Optional[str] = None,
    source: str = SOURCE_AUTO_PERSIST,
) -> Dict[str, Any]:
    req = _dump(request)
    payload = result.to_dict() if hasattr(result, "to_dict") else _dump(result)
    conditions = req.get("conditions") or payload.get("conditions") or {}
    material = str(conditions.get("material_system") or "palladium")
    if "_" in material:
        material = material.split("_", 1)[0]
    temperature = float(conditions.get("temperature") or 300.0)
    provenance = provenance_from_mapping(req)
    return await persist_best_effort(
        experiment_type="lenr",
        name=campaign_experiment_name(
            kind="Theory pipeline",
            material=material,
            rate_mode="pipeline",
            temperature=temperature,
            tag=provenance.get("tag"),
        ),
        material=material,
        temperature_k=temperature,
        pressure_bar=_pa_to_bar(float(conditions.get("pressure") or 101325.0)),
        loading_ratio=conditions.get("loading_ratio"),
        enhancement_factor=payload.get("combined_enhancement"),
        fusion_rate=None,
        energy_output_kev=None,
        excess_heat_watts=payload.get("total_energy_watts"),
        duration_seconds=None,
        parameters=_merge_parameters(
            {
                "enabled_theories": req.get("enabled_theories") or payload.get("enabled_theories"),
                "material_system": conditions.get("material_system"),
            },
            req,
        ),
        results=_compact_results(experiment_type="lenr", response=payload),
        pipeline_result=result,
        session_id=session_id,
        source=source,
        conditions=conditions,
    )


async def persist_failed_simulation(
    case: Dict[str, Any],
    error: BaseException,
    *,
    session_id: Optional[str] = None,
    source: str = SOURCE_AUTO_PERSIST,
) -> Dict[str, Any]:
    """Persist a campaign/unified case that raised so Analytics can show failures."""
    material = str(case.get("host_material") or "palladium")
    temperature = float(case.get("temperature") or 300.0)
    provenance = provenance_from_mapping(case)
    return await persist_best_effort(
        experiment_type="unified_theory",
        name=campaign_experiment_name(
            kind="Unified",
            material=material,
            rate_mode=str(case.get("rate_mode") or "two_body"),
            temperature=temperature,
            tag=provenance.get("tag") or case.get("tag"),
            failed=True,
        ),
        material=material,
        temperature_k=temperature,
        pressure_bar=1.01325,
        loading_ratio=case.get("loading_ratio"),
        enhancement_factor=None,
        fusion_rate=None,
        energy_output_kev=None,
        excess_heat_watts=None,
        duration_seconds=None,
        parameters=_merge_parameters(
            {
                "reactant": case.get("reactant"),
                "rate_mode": case.get("rate_mode"),
                "use_theory_pipeline": case.get("use_theory_pipeline"),
                "enabled_theories": case.get("enabled_theories"),
            },
            case,
        ),
        results={
            "is_model_output": True,
            "disclaimer": DISCLAIMER,
            "scientific_outcome": "failed",
            "error": str(error)[:500],
        },
        session_id=session_id,
        source=source,
        status=ExperimentStatus.FAILED.value,
        conditions={
            "temperature": temperature,
            "loading_ratio": case.get("loading_ratio"),
        },
    )


# Alias used by the campaign runner.
persist_failed_run = persist_failed_simulation
