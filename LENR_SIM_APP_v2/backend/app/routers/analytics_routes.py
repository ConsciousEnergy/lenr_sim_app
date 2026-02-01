"""
Analytics API Routes for LENR Simulation App

REST API endpoints for analytics dashboard, experiment management,
and data export functionality.

v0.2.3-beta: Initial implementation
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
import io

from app.core.database import get_db_session
from app.services.analytics_service import AnalyticsService, get_analytics_service

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
    
    class Config:
        json_schema_extra = {
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
    """Response model for statistics."""
    totalSimulations: int
    successRate: float
    avgEnhancement: float
    totalEnergy: float
    maxEnhancement: float
    completedCount: int
    failedCount: int


class ExperimentListResponse(BaseModel):
    """Response model for paginated experiment list."""
    experiments: List[dict]
    total: int
    limit: int
    offset: int


class CompareRequest(BaseModel):
    """Request model for comparing experiments."""
    experiment_ids: List[str] = Field(..., min_items=2, max_items=10)


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
    
    Returns total simulations, success rate, average enhancement factor,
    and total energy output.
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
    db: AsyncSession = Depends(get_db_session),
):
    """Get distribution of materials used in experiments."""
    service = get_analytics_service(db)
    return await service.get_material_distribution(session_id=session_id)


@router.get("/distribution/temperature")
async def get_temperature_distribution(
    session_id: Optional[str] = Query(None),
    bins: int = Query(10, ge=3, le=20),
    db: AsyncSession = Depends(get_db_session),
):
    """Get temperature distribution for bar chart."""
    service = get_analytics_service(db)
    return await service.get_temperature_distribution(
        session_id=session_id,
        bins=bins,
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
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Get paginated list of experiments with optional filtering.
    
    Supports filtering by type, status, material, and pagination.
    """
    service = get_analytics_service(db)
    experiments, total = await service.get_experiments(
        session_id=session_id,
        include_baseline=include_baseline,
        experiment_type=experiment_type,
        status=status,
        material=material,
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
    )
    
    return created


@router.put("/experiments/{experiment_id}")
async def update_experiment(
    experiment_id: str,
    update: ExperimentUpdate,
    db: AsyncSession = Depends(get_db_session),
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
