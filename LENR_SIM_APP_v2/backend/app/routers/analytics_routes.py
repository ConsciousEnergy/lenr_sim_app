"""
Analytics API Routes for LENR Simulation App

REST API endpoints for analytics dashboard, experiment management,
data export functionality, and theory network scoring/validation.

v0.2.3-beta: Initial implementation
v0.3.1-beta: Added theory-graph, theory-scores, theory-comparison,
             parameter-sweep, and validation-report endpoints
"""

import logging
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession
import io

from app.core.database import get_db_session
from app.core.analytics_write_guard import require_analytics_write
from app.core.compute_guard import heavy_compute_slot, run_in_threadpool
from app.services.analytics_service import AnalyticsService, get_analytics_service
from app.utils.json_safe import to_json_safe

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ==================
# Pydantic Models
# ==================

class ExperimentCreate(BaseModel):
    """Request model for creating an experiment."""
    name: str = Field(..., min_length=1, max_length=255)
    experiment_type: str = Field(default="lenr")
    session_id: Optional[str] = None
    status: str = Field(default="completed")
    
    # Parameters
    material: str = Field(default="palladium")
    temperature_k: float = Field(default=300.0, ge=0)
    pressure_bar: float = Field(default=1.0, ge=0)
    loading_ratio: Optional[float] = Field(default=None, ge=0, le=1)
    defect_density: Optional[float] = Field(default=None, ge=0)
    driving_frequency_khz: Optional[float] = Field(default=None, ge=0)
    parameters: Optional[dict] = Field(default_factory=dict)
    
    # Results
    enhancement_factor: Optional[float] = None
    fusion_rate: Optional[float] = None
    energy_output_kev: Optional[float] = None
    excess_heat_watts: Optional[float] = None
    duration_seconds: Optional[float] = None
    results: Optional[dict] = Field(default_factory=dict)
    source: Optional[str] = Field(
        default=None,
        description="Optional persist source (User Simulation, simulation_campaign, auto_persist).",
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Palladium D-loading Test",
                "experiment_type": "lenr",
                "material": "palladium",
                "temperature_k": 350.0,
                "pressure_bar": 2.5,
                "loading_ratio": 0.85,
                "enhancement_factor": 45.2,
                "energy_output_kev": 125.5,
                "duration_seconds": 3600,
            }
        }
    )


class ExperimentUpdate(BaseModel):
    """Request model for updating an experiment."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[str] = None
    enhancement_factor: Optional[float] = None
    energy_output_kev: Optional[float] = None
    results: Optional[dict] = None


class TimelinePointCreate(BaseModel):
    """Request model for adding timeline points."""
    timestamp_ms: int = Field(..., ge=0)
    enhancement_factor: Optional[float] = None
    temperature_k: Optional[float] = None
    pressure_bar: Optional[float] = None
    energy_output: Optional[float] = None
    data: Optional[dict] = Field(default_factory=dict)


class TimelinePointsCreate(BaseModel):
    """Request model for batch adding timeline points."""
    points: List[TimelinePointCreate]


class StatsResponse(BaseModel):
    """Response model for statistics.

    ``successRate`` is a completion-rate alias kept for older clients.
    It is *not* a scientific-positive or LENR-validation rate.
    """
    totalSimulations: int
    successRate: float
    completionRate: float = 0.0
    scientificPositiveRate: float = 0.0
    avgEnhancement: float
    totalEnergy: float
    maxEnhancement: float
    completedCount: int
    failedCount: int
    outcomeCounts: Dict[str, int] = Field(default_factory=dict)
    claimTierCounts: Dict[str, int] = Field(default_factory=dict)
    openQuestionCounts: Dict[str, int] = Field(default_factory=dict)
    openQuestionCountsCampaign: Dict[str, int] = Field(default_factory=dict)
    sourceClassCounts: Dict[str, int] = Field(default_factory=dict)


class ExperimentListResponse(BaseModel):
    """Response model for paginated experiment list."""
    experiments: List[dict]
    total: int
    limit: int
    offset: int


class CompareRequest(BaseModel):
    """Request model for comparing experiments."""
    experiment_ids: List[str] = Field(..., min_length=2, max_length=10)


# ==================
# Statistics Endpoints
# ==================

@router.get("/stats", response_model=StatsResponse)
async def get_statistics(
    session_id: Optional[str] = Query(None, description="Filter to user's experiments"),
    include_baseline: bool = Query(True, description="Include baseline data in stats"),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Get aggregate statistics for the analytics dashboard.

    ``successRate`` is a completion-rate alias for older clients. Use
    ``completionRate`` and ``scientificPositiveRate`` for honest labels.
    """
    service = get_analytics_service(db)
    stats = await service.get_statistics(
        session_id=session_id,
        include_baseline=include_baseline,
    )
    return stats


@router.get("/distribution/type")
async def get_type_distribution(
    session_id: Optional[str] = Query(None),
    include_baseline: bool = Query(True),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Get distribution of experiment types for pie chart.
    
    Returns list of {name, value, percentage} for each type.
    """
    service = get_analytics_service(db)
    return await service.get_type_distribution(
        session_id=session_id,
        include_baseline=include_baseline,
    )


@router.get("/distribution/material")
async def get_material_distribution(
    session_id: Optional[str] = Query(None),
    include_baseline: bool = Query(True),
    db: AsyncSession = Depends(get_db_session),
):
    """Get distribution of materials used in experiments."""
    service = get_analytics_service(db)
    return await service.get_material_distribution(
        session_id=session_id,
        include_baseline=include_baseline,
    )


@router.get("/distribution/source")
async def get_source_distribution(
    session_id: Optional[str] = Query(None),
    include_baseline: bool = Query(True),
    db: AsyncSession = Depends(get_db_session),
):
    """Pie of Baseline / Campaign / Auto / User from SQL source flags."""
    service = get_analytics_service(db)
    return await service.get_source_distribution(
        session_id=session_id,
        include_baseline=include_baseline,
    )


@router.get("/distribution/temperature")
async def get_temperature_distribution(
    session_id: Optional[str] = Query(None),
    bins: int = Query(10, ge=3, le=20),
    include_baseline: bool = Query(True),
    db: AsyncSession = Depends(get_db_session),
):
    """Get temperature distribution for bar chart."""
    service = get_analytics_service(db)
    return await service.get_temperature_distribution(
        session_id=session_id,
        bins=bins,
        include_baseline=include_baseline,
    )


# ==================
# Timeline Endpoints
# ==================

@router.get("/timeline")
async def get_timeline_data(
    session_id: Optional[str] = Query(None),
    limit: int = Query(30, ge=1, le=100),
    include_baseline: bool = Query(True),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Get time-series data for enhancement factor over time chart.
    
    Returns experiments sorted by date with enhancement and energy values.
    """
    service = get_analytics_service(db)
    return await service.get_timeline_data(
        session_id=session_id,
        limit=limit,
        include_baseline=include_baseline,
    )


# ==================
# Experiment CRUD Endpoints
# ==================

@router.get("/experiments", response_model=ExperimentListResponse)
async def list_experiments(
    session_id: Optional[str] = Query(None),
    include_baseline: bool = Query(True),
    experiment_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    material: Optional[str] = Query(None),
    source_class: Optional[str] = Query(
        None,
        description="Filter Baseline, Campaign, Auto, or User (additive).",
    ),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Get paginated list of experiments with optional filtering.
    
    Supports filtering by type, status, material, source_class, and pagination.
    Additive list fields: sourceClass, literatureId, meanFinalScore, topTheoryId,
    enhancementSaturated, log10EnhancementRaw, excessHeatWatts.
    sort_by=mean_final_score ranks by five-factor association, not P(LENR).
    """
    service = get_analytics_service(db)
    experiments, total = await service.get_experiments(
        session_id=session_id,
        include_baseline=include_baseline,
        experiment_type=experiment_type,
        status=status,
        material=material,
        source_class=source_class,
        limit=limit,
        offset=offset,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    
    return {
        "experiments": experiments,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/experiments/{experiment_id}")
async def get_experiment(
    experiment_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Get a single experiment by ID."""
    service = get_analytics_service(db)
    experiment = await service.get_experiment(experiment_id)
    
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    return experiment


@router.post("/experiments", status_code=201)
async def create_experiment(
    experiment: ExperimentCreate,
    db: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_analytics_write),
):
    """
    Create a new experiment record.
    
    Use this to save simulation results to the analytics database.
    """
    service = get_analytics_service(db)
    
    created = await service.create_experiment(
        name=experiment.name,
        experiment_type=experiment.experiment_type,
        session_id=experiment.session_id,
        status=experiment.status,
        material=experiment.material,
        temperature_k=experiment.temperature_k,
        pressure_bar=experiment.pressure_bar,
        loading_ratio=experiment.loading_ratio,
        defect_density=experiment.defect_density,
        driving_frequency_khz=experiment.driving_frequency_khz,
        parameters=experiment.parameters,
        enhancement_factor=experiment.enhancement_factor,
        fusion_rate=experiment.fusion_rate,
        energy_output_kev=experiment.energy_output_kev,
        excess_heat_watts=experiment.excess_heat_watts,
        duration_seconds=experiment.duration_seconds,
        results=experiment.results,
        source=experiment.source or "User Simulation",
    )
    
    return created


@router.put("/experiments/{experiment_id}")
async def update_experiment(
    experiment_id: str,
    update: ExperimentUpdate,
    db: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_analytics_write),
):
    """Update an existing experiment."""
    service = get_analytics_service(db)
    
    updated = await service.update_experiment(
        experiment_id,
        **update.model_dump(exclude_unset=True)
    )
    
    if not updated:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    return updated


@router.delete("/experiments/{experiment_id}", status_code=204)
async def delete_experiment(
    experiment_id: str,
    db: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_analytics_write),
):
    """Delete an experiment."""
    service = get_analytics_service(db)
    
    deleted = await service.delete_experiment(experiment_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    return Response(status_code=204)


# ==================
# Timeline Points Endpoints
# ==================

@router.get("/experiments/{experiment_id}/timeline")
async def get_experiment_timeline(
    experiment_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Get timeline data points for a specific experiment."""
    service = get_analytics_service(db)
    
    # First check experiment exists
    experiment = await service.get_experiment(experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    return await service.get_experiment_timeline(experiment_id)


@router.post("/experiments/{experiment_id}/timeline", status_code=201)
async def add_timeline_points(
    experiment_id: str,
    data: TimelinePointsCreate,
    db: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_analytics_write),
):
    """Add timeline data points to an experiment."""
    service = get_analytics_service(db)
    
    # First check experiment exists
    experiment = await service.get_experiment(experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    points = [p.model_dump() for p in data.points]
    count = await service.add_timeline_points(experiment_id, points)
    
    return {"added": count}


# ==================
# Export Endpoints
# ==================

@router.get("/export/csv")
async def export_csv(
    session_id: Optional[str] = Query(None),
    include_baseline: bool = Query(True),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Export experiments to CSV format.
    
    Returns a downloadable CSV file.
    """
    service = get_analytics_service(db)
    csv_content = await service.export_experiments_csv(
        session_id=session_id,
        include_baseline=include_baseline,
    )
    
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=lenr_experiments.csv"
        }
    )


@router.get("/export/json")
async def export_json(
    session_id: Optional[str] = Query(None),
    include_baseline: bool = Query(True),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Export experiments to JSON format.
    
    Returns experiments as JSON array.
    """
    service = get_analytics_service(db)
    return await service.export_experiments_json(
        session_id=session_id,
        include_baseline=include_baseline,
    )


# ==================
# Comparison Endpoint
# ==================

@router.post("/compare")
async def compare_experiments(
    request: CompareRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Get multiple experiments for side-by-side comparison.
    
    Accepts 2-10 experiment IDs to compare.
    """
    service = get_analytics_service(db)
    experiments = await service.compare_experiments(request.experiment_ids)
    
    if len(experiments) != len(request.experiment_ids):
        found_ids = {e['id'] for e in experiments}
        missing = [eid for eid in request.experiment_ids if eid not in found_ids]
        raise HTTPException(
            status_code=404,
            detail=f"Some experiments not found: {missing}"
        )
    
    return experiments


# ==================
# Theory Network & Scoring Pydantic Models
# ==================

class TheoryConditions(BaseModel):
    """Physical conditions for running theory calculations."""
    temperature: float = Field(default=300.0, ge=0, description="Temperature in Kelvin")
    loading_ratio: float = Field(default=0.9, ge=0, le=1.5, description="D/Pd loading ratio")
    pressure: float = Field(default=101325.0, ge=0, description="Pressure in Pascals")
    electron_density: float = Field(default=6.8e28, ge=0, description="Electron density in m^-3")
    current_density_mA_cm2: float = Field(default=50.0, ge=0, description="Current density in mA/cm²")
    excess_heat_W: float = Field(default=1.0, ge=0, description="Measured excess heat in watts")
    gap_width_nm: float = Field(default=1.0, ge=0, description="NAE gap width in nanometres (Hydroton/NAE)")
    crack_width_nm: float = Field(default=1.0, ge=0, description="Crack width in nanometres (Hydroton/NAE)")
    enabled_theories: Optional[List[str]] = Field(
        default=None,
        description="List of theory_ids to include (None = all)",
    )
    score_mode: str = Field(
        default="five_factor",
        description=(
            "five_factor (default geometric mean) or "
            "five_factor_plus_literature (opt-in literature likelihood). "
            "Does not raise claim_tier."
        ),
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "temperature": 350.0,
                "loading_ratio": 0.92,
                "pressure": 101325.0,
                "electron_density": 6.8e28,
            }
        }
    )


class ParameterSweepRequest(BaseModel):
    """Request for sweeping a parameter across all theories."""
    base_conditions: TheoryConditions = Field(default_factory=TheoryConditions)
    sweep_param: str = Field(
        default="temperature",
        description="Parameter to sweep (temperature, loading_ratio, pressure, etc.)",
    )
    sweep_min: float = Field(default=200.0, description="Sweep range minimum")
    sweep_max: float = Field(default=800.0, description="Sweep range maximum")
    sweep_steps: int = Field(default=20, ge=2, le=100, description="Number of sweep points")
    enabled_theories: Optional[List[str]] = None


class TheoryComparisonRequest(BaseModel):
    """Request for side-by-side theory comparison."""
    conditions: TheoryConditions = Field(default_factory=TheoryConditions)
    theory_ids: List[str] = Field(
        ..., min_length=2, max_length=19,
        description="Theory IDs to compare",
    )


# ==================
# Theory Network Endpoints
# ==================

@router.get("/theory-graph")
async def get_theory_graph():
    """
    Get the full theory relationship network graph.

    Returns nodes (theories with properties, categories, predictions)
    and edges (relationship types, shared properties, strength) for
    the D3 force-directed Relevance Map.
    """
    from app.physics_engine.theory_relationships import TheoryGraph
    graph = TheoryGraph()
    return graph.to_dict()


@router.get("/theory-run-history")
async def get_theory_run_history(
    session_id: Optional[str] = Query(None),
):
    """
    Aggregate persisted theory_runs into a Relevance Map overlay.

    This is simulation-derived association, not empirical confidence.
    Curated edge strength on /theory-graph is not modified.
    """
    from app.core.database import db_manager
    from app.services.theory_run_history import (
        aggregate_theory_run_history,
        empty_theory_run_history,
    )

    if not db_manager._is_initialized:
        return empty_theory_run_history()
    try:
        async with db_manager.session() as session:
            return await aggregate_theory_run_history(session, session_id=session_id)
    except Exception:
        logger.exception("theory-run-history unavailable; returning empty overlay")
        return empty_theory_run_history()


@router.get("/theory-properties")
async def get_theory_properties():
    """
    Get the shared physical properties taxonomy.

    Returns a dictionary mapping property IDs to descriptions.
    """
    from app.physics_engine.theory_relationships import PHYSICAL_PROPERTIES_TAXONOMY
    return {"properties": PHYSICAL_PROPERTIES_TAXONOMY}


@router.post("/theory-scores")
async def compute_theory_scores_endpoint(request: TheoryConditions):
    """
    Run all (or selected) theories under the given conditions and
    compute predictive probability scores.

    Returns per-theory scores with 5 sub-scores and a final weighted
    geometric mean score.
    """
    from app.physics_engine.theory_scoring import compute_theory_scores

    conditions = {
        "temperature": request.temperature,
        "loading_ratio": request.loading_ratio,
        "pressure": request.pressure,
        "electron_density": request.electron_density,
        "current_density_mA_cm2": request.current_density_mA_cm2,
        "excess_heat_W": request.excess_heat_W,
        "gap_width_nm": request.gap_width_nm,
        "crack_width_nm": request.crack_width_nm,
    }

    try:
        scores = compute_theory_scores(
            conditions=conditions,
            enabled_theories=request.enabled_theories,
            score_mode=request.score_mode or "five_factor",
        )
    except Exception as exc:
        logger.exception("Error computing theory scores")
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "conditions": conditions,
        "scores": scores,
        "n_theories": len(scores),
        "score_mode": request.score_mode or "five_factor",
        "claim_tiers_raised": False,
    }


@router.post("/theory-comparison")
async def compare_theories(request: TheoryComparisonRequest):
    """
    Side-by-side comparison of specific theories under identical conditions.

    Returns full contribution details and scores for selected theories.
    """
    from app.physics_engine.theory_pipeline import get_default_pipeline
    from app.physics_engine.theory_scoring import compute_theory_scores

    conditions = {
        "temperature": request.conditions.temperature,
        "loading_ratio": request.conditions.loading_ratio,
        "pressure": request.conditions.pressure,
        "electron_density": request.conditions.electron_density,
        "current_density_mA_cm2": request.conditions.current_density_mA_cm2,
        "excess_heat_W": request.conditions.excess_heat_W,
        "gap_width_nm": request.conditions.gap_width_nm,
        "crack_width_nm": request.conditions.crack_width_nm,
    }

    pipeline = get_default_pipeline()
    contributions = []
    for tid in request.theory_ids:
        try:
            contrib = pipeline.run_single(tid, conditions)
            contributions.append({
                "theory_id": contrib.theory_id,
                "theory_name": contrib.theory_name,
                "enhancement_factor": contrib.enhancement_factor,
                "reaction_rate_modifier": contrib.reaction_rate_modifier,
                "energy_output_watts": contrib.energy_output_watts,
                "observables": contrib.observables,
                "confidence": contrib.confidence,
                "is_applicable": contrib.is_applicable,
                "references": contrib.references,
            })
        except KeyError:
            raise HTTPException(status_code=404, detail=f"Theory '{tid}' not found")
        except Exception as exc:
            logger.exception("Error running theory %s", tid)
            raise HTTPException(status_code=500, detail=str(exc))

    scores = compute_theory_scores(
        conditions=conditions,
        enabled_theories=request.theory_ids,
    )

    return {
        "conditions": conditions,
        "contributions": contributions,
        "scores": scores,
    }


@router.post("/parameter-sweep")
async def run_parameter_sweep(request: ParameterSweepRequest):
    """
    Sweep a single parameter across its range while keeping others fixed.
    Returns enhancement, confidence, and score curves for all theories.
    """
    from app.physics_engine.theory_scoring import parameter_sweep
    import numpy as np

    base = {
        "temperature": request.base_conditions.temperature,
        "loading_ratio": request.base_conditions.loading_ratio,
        "pressure": request.base_conditions.pressure,
        "electron_density": request.base_conditions.electron_density,
        "current_density_mA_cm2": request.base_conditions.current_density_mA_cm2,
        "excess_heat_W": request.base_conditions.excess_heat_W,
    }

    sweep_values = list(
        np.linspace(request.sweep_min, request.sweep_max, request.sweep_steps)
    )

    try:
        async with heavy_compute_slot("analytics/parameter-sweep"):
            results = await run_in_threadpool(
                lambda: parameter_sweep(
                    base_conditions=base,
                    sweep_param=request.sweep_param,
                    sweep_values=sweep_values,
                    enabled_theories=request.enabled_theories,
                )
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error running parameter sweep")
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "sweep_param": request.sweep_param,
        "sweep_values": sweep_values,
        "results": results,
    }


@router.get("/validation-report")
async def get_validation_report(
    temperature: float = Query(300.0, ge=0),
    loading_ratio: float = Query(0.9, ge=0, le=1.5),
    pressure: float = Query(101325.0, ge=0),
    electron_density: float = Query(6.8e28, ge=0),
):
    """
    Run all validation checks on all theories and return a report.

    Validation checks include: Miles correlation, no dangerous radiation,
    loading threshold, surface dependence, product spectrum, thermal
    activation, and reproducibility.
    """
    from app.physics_engine.theory_validation import validate_all_theories

    conditions = {
        "temperature": temperature,
        "loading_ratio": loading_ratio,
        "pressure": pressure,
        "electron_density": electron_density,
    }

    try:
        reports = validate_all_theories(conditions)
    except Exception as exc:
        logger.exception("Error running validation")
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "conditions": conditions,
        "reports": [r.to_dict() for r in reports],
        "n_theories": len(reports),
    }


# ==================
# Coupled Pipeline Endpoints (v0.3.3-beta)
# ==================

class CoupledRunRequest(BaseModel):
    """Request body for running the coupled theory pipeline."""
    conditions: TheoryConditions = Field(default_factory=TheoryConditions)
    enabled_theories: Optional[List[str]] = Field(
        default=None,
        description="Theory IDs to include (None = all)",
    )
    theory_configs: Optional[dict] = Field(
        default=None,
        description="Per-theory configuration overrides keyed by theory_id",
    )
    persist_session_id: Optional[str] = Field(
        default=None,
        description="Optional analytics session id for auto-persist. Additive.",
    )
    persist_source: Optional[str] = Field(
        default=None,
        description="Optional persist source label (auto_persist or simulation_campaign).",
    )


@router.post("/theories/run-coupled")
async def run_coupled_pipeline(request: CoupledRunRequest):
    """
    Run all (or selected) theories with **sequential cross-theory coupling**.

    Theories execute in dependency order (topological sort of the
    relationship graph).  After each theory runs, its observable outputs
    are injected into the conditions dict so downstream theories can
    consume them.

    Returns per-theory contributions, enriched conditions, execution
    order, and the coupling map showing which theory outputs fed into
    which inputs.
    """
    from app.physics_engine.theory_pipeline import get_default_pipeline
    from app.physics_engine.theory_relationships import TheoryGraph

    conditions = {
        "temperature": request.conditions.temperature,
        "loading_ratio": request.conditions.loading_ratio,
        "pressure": request.conditions.pressure,
        "electron_density": request.conditions.electron_density,
        "current_density_mA_cm2": request.conditions.current_density_mA_cm2,
        "excess_heat_W": request.conditions.excess_heat_W,
        "gap_width_nm": request.conditions.gap_width_nm,
        "crack_width_nm": request.conditions.crack_width_nm,
    }

    pipeline = get_default_pipeline()
    enabled = request.enabled_theories

    try:
        async with heavy_compute_slot("analytics/theories/run-coupled"):
            result = await run_in_threadpool(
                lambda: pipeline.run_coupled(
                    conditions=conditions,
                    enabled_theories=enabled,
                    theory_configs=request.theory_configs,
                )
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error in coupled pipeline")
        raise HTTPException(status_code=500, detail=str(exc))

    # Coupling map for visualisation
    graph = TheoryGraph()
    coupling_map = graph.get_coupling_map(result.enabled_theories)

    contributions = []
    for c in result.contributions:
        contributions.append({
            "theory_id": c.theory_id,
            "theory_name": c.theory_name,
            "enhancement_factor": float(c.enhancement_factor),
            "reaction_rate_modifier": float(c.reaction_rate_modifier),
            "energy_output_watts": float(c.energy_output_watts),
            "observables": to_json_safe(c.observables),
            "confidence": float(c.confidence),
            "is_applicable": bool(c.is_applicable),
            "references": list(c.references),
        })

    payload = {
        "execution_order": result.enabled_theories,
        "contributions": contributions,
        "combined_enhancement": float(result.combined_enhancement),
        "combined_reaction_rate_modifier": float(result.combined_reaction_rate_modifier),
        "total_energy_watts": float(result.total_energy_watts),
        "enriched_conditions": to_json_safe(result.conditions),
        "coupling_map": coupling_map,
    }
    try:
        from app.services.persist_runs import persist_theory_pipeline

        persistence = await persist_theory_pipeline(
            {
                "conditions": conditions,
                "enabled_theories": enabled,
            },
            result,
            session_id=request.persist_session_id,
            source=request.persist_source or "auto_persist",
        )
        if persistence:
            payload["analytics_transparency"] = {"persistence": persistence}
    except Exception:
        logger.exception("coupled pipeline persist skipped")
    return payload


@router.get("/theories/coupling-graph")
async def get_coupling_graph(
    enabled_theories: Optional[str] = Query(
        None,
        description="Comma-separated list of theory_ids (None = all)",
    ),
):
    """
    Return the dependency order and coupling map for visualisation.

    Useful for the frontend to draw coupling arrows between theory
    cards without executing the pipeline.
    """
    from app.physics_engine.theory_relationships import TheoryGraph

    graph = TheoryGraph()
    enabled = None
    if enabled_theories:
        enabled = [t.strip() for t in enabled_theories.split(",") if t.strip()]

    execution_order = graph.topological_sort(enabled)
    coupling_map = graph.get_coupling_map(enabled)

    return {
        "execution_order": execution_order,
        "coupling_map": coupling_map,
    }
