"""Route-facing persist helpers for unified, bubble-lattice, and theory runs."""

from __future__ import annotations

from typing import Any, Dict, Optional

from app.services.simulation_persistence import (
    SOURCE_AUTO_PERSIST,
    _compact_results,
    _dump,
    _pa_to_bar,
    persist_best_effort,
)


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
    return await persist_best_effort(
        experiment_type="unified_theory",
        name=f"Unified {material} {req.get('rate_mode', 'two_body')} T={env.get('temperature', 300):.0f}K",
        material=material,
        temperature_k=float(env.get("temperature") or 300.0),
        pressure_bar=_pa_to_bar(float(env.get("pressure") or 101325.0)),
        loading_ratio=lattice.get("loading_ratio"),
        enhancement_factor=enhancement,
        fusion_rate=observables.get("reaction_rate"),
        energy_output_kev=None,
        excess_heat_watts=observables.get("excess_heat_watts"),
        duration_seconds=req.get("total_time"),
        parameters={
            "reactant": (req.get("material") or {}).get("reactant"),
            "rate_mode": req.get("rate_mode"),
            "use_theory_pipeline": req.get("use_theory_pipeline"),
            "enabled_theories": req.get("enabled_theories"),
        },
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
    return await persist_best_effort(
        experiment_type="lenr",
        name=f"Theory pipeline T={float(conditions.get('temperature') or 300):.0f}K",
        material=material,
        temperature_k=float(conditions.get("temperature") or 300.0),
        pressure_bar=_pa_to_bar(float(conditions.get("pressure") or 101325.0)),
        loading_ratio=conditions.get("loading_ratio"),
        enhancement_factor=payload.get("combined_enhancement"),
        fusion_rate=None,
        energy_output_kev=None,
        excess_heat_watts=payload.get("total_energy_watts"),
        duration_seconds=None,
        parameters={
            "enabled_theories": req.get("enabled_theories") or payload.get("enabled_theories"),
            "material_system": conditions.get("material_system"),
        },
        results=_compact_results(experiment_type="lenr", response=payload),
        pipeline_result=result,
        session_id=session_id,
        source=source,
        conditions=conditions,
    )
