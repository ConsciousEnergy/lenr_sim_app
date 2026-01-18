"""
Shared Simulation Router

API endpoints for saving, sharing, and searching simulations across all users.
Enables collaborative research by allowing users to share simulation results
and find matches for experimental replication.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Body, Depends
from pydantic import BaseModel, Field
import logging

from app.models.simulation_models import (
    SharedSimulation, MatchResult, SimulationSearchParams,
    MaterialType, ReactantType
)
from app.services.shared_simulation_service import SharedSimulationService, get_simulation_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/simulations", tags=["simulations"])


# Pydantic models for API requests/responses
class SaveSimulationRequest(BaseModel):
    """Request to save a simulation"""
    name: str = Field(..., description="Name for the simulation")
    description: str = Field("", description="Optional description")
    tags: List[str] = Field(default_factory=list, description="Tags for categorization")
    is_public: bool = Field(False, description="Whether to share publicly")
    parameters: Dict[str, Any] = Field(..., description="Full simulation configuration")
    results: Dict[str, Any] = Field(..., description="Simulation results")
    session_id: str = Field("", description="Browser session ID for anonymous users")


class ShareSimulationRequest(BaseModel):
    """Request to change sharing status"""
    simulation_id: str
    is_public: bool


class MatchSimulationRequest(BaseModel):
    """Request to find matching simulations"""
    material_type: Optional[str] = None
    reactant: Optional[str] = None
    temperature_k: Optional[float] = None
    pressure_pa: Optional[float] = None
    loading_ratio: Optional[float] = None
    tolerance: float = Field(0.1, ge=0.0, le=1.0, description="Matching tolerance (0.1 = 10%)")
    limit: int = Field(10, ge=1, le=50)


class SimulationResponse(BaseModel):
    """Response containing simulation data"""
    id: str
    name: str
    description: str
    tags: List[str]
    is_public: bool
    material_type: str
    reactant: str
    temperature_k: float
    excess_heat_watts: float
    created_at: str
    updated_at: str


class SimulationDetailResponse(SimulationResponse):
    """Detailed simulation response with full parameters and results"""
    parameters: Dict[str, Any]
    results: Dict[str, Any]


class MatchResponse(BaseModel):
    """Response containing matching simulation results"""
    simulation: SimulationResponse
    similarity_score: float
    matching_criteria: Dict[str, Any]
    differences: Dict[str, float]


@router.post("/save", response_model=SimulationResponse, status_code=201)
async def save_simulation(
    request: SaveSimulationRequest,
    service: SharedSimulationService = Depends(get_simulation_service)
):
    """
    Save a simulation for the current user.
    
    Can be saved as private (only visible to creator) or public (shared with community).
    """
    try:
        # Extract matching metadata from parameters/results
        material_type = MaterialType(request.parameters.get('material', {}).get('host_material', 'palladium').lower())
        reactant = ReactantType(request.parameters.get('material', {}).get('reactant', 'deuterium').lower())
        
        # Extract key metrics from results
        excess_heat = request.results.get('excess_heat_watts', 0.0)
        tunneling_prob = request.results.get('tunneling_probability', 0.0)
        reaction_rate = request.results.get('reaction_rate', 0.0)
        
        # Get environmental parameters
        env = request.parameters.get('environmental', {})
        temperature = env.get('temperature', 300.0)
        pressure = env.get('pressure', 101325.0)
        loading_ratio = request.parameters.get('lattice', {}).get('loading_ratio', 0.9)
        
        # Create simulation model
        simulation = SharedSimulation(
            name=request.name,
            description=request.description,
            tags=request.tags,
            is_public=request.is_public,
            parameters=request.parameters,
            results=request.results,
            session_id=request.session_id,
            material_type=material_type,
            reactant=reactant,
            temperature_k=temperature,
            pressure_pa=pressure,
            loading_ratio=loading_ratio,
            excess_heat_watts=excess_heat,
            tunneling_probability=tunneling_prob,
            reaction_rate=reaction_rate
        )
        
        saved = await service.save_simulation(simulation)
        
        return SimulationResponse(
            id=saved.id,
            name=saved.name,
            description=saved.description,
            tags=saved.tags,
            is_public=saved.is_public,
            material_type=saved.material_type.value,
            reactant=saved.reactant.value,
            temperature_k=saved.temperature_k,
            excess_heat_watts=saved.excess_heat_watts,
            created_at=saved.created_at.isoformat(),
            updated_at=saved.updated_at.isoformat()
        )
    except Exception as e:
        logger.error(f"Error saving simulation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save simulation: {str(e)}")


@router.get("/mine", response_model=List[SimulationResponse])
async def get_my_simulations(
    session_id: str = Query(..., description="Browser session ID"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: SharedSimulationService = Depends(get_simulation_service)
):
    """Get all simulations saved by the current user (identified by session_id)"""
    try:
        simulations = await service.get_user_simulations(session_id, limit=limit, offset=offset)
        return [
            SimulationResponse(
                id=s.id,
                name=s.name,
                description=s.description,
                tags=s.tags,
                is_public=s.is_public,
                material_type=s.material_type.value,
                reactant=s.reactant.value,
                temperature_k=s.temperature_k,
                excess_heat_watts=s.excess_heat_watts,
                created_at=s.created_at.isoformat(),
                updated_at=s.updated_at.isoformat()
            )
            for s in simulations
        ]
    except Exception as e:
        logger.error(f"Error fetching user simulations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch simulations: {str(e)}")


@router.post("/share", response_model=SimulationResponse)
async def share_simulation(
    request: ShareSimulationRequest,
    session_id: str = Query(..., description="Browser session ID"),
    service: SharedSimulationService = Depends(get_simulation_service)
):
    """Change the sharing status of a simulation"""
    try:
        simulation = await service.update_sharing_status(
            request.simulation_id,
            session_id,
            request.is_public
        )
        if not simulation:
            raise HTTPException(status_code=404, detail="Simulation not found or access denied")
        
        return SimulationResponse(
            id=simulation.id,
            name=simulation.name,
            description=simulation.description,
            tags=simulation.tags,
            is_public=simulation.is_public,
            material_type=simulation.material_type.value,
            reactant=simulation.reactant.value,
            temperature_k=simulation.temperature_k,
            excess_heat_watts=simulation.excess_heat_watts,
            created_at=simulation.created_at.isoformat(),
            updated_at=simulation.updated_at.isoformat()
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sharing simulation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update sharing status: {str(e)}")


@router.get("/public", response_model=List[SimulationResponse])
async def get_public_simulations(
    material_type: Optional[str] = Query(None, description="Filter by material type"),
    min_temperature: Optional[float] = Query(None, description="Minimum temperature (K)"),
    max_temperature: Optional[float] = Query(None, description="Maximum temperature (K)"),
    min_heat: Optional[float] = Query(None, description="Minimum excess heat (W)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: SharedSimulationService = Depends(get_simulation_service)
):
    """Browse all publicly shared simulations"""
    try:
        search_params = SimulationSearchParams(
            material_type=MaterialType(material_type) if material_type else None,
            min_temperature_k=min_temperature,
            max_temperature_k=max_temperature,
            min_excess_heat=min_heat,
            is_public=True,
            limit=limit,
            offset=offset
        )
        
        simulations = await service.search_simulations(search_params)
        return [
            SimulationResponse(
                id=s.id,
                name=s.name,
                description=s.description,
                tags=s.tags,
                is_public=s.is_public,
                material_type=s.material_type.value,
                reactant=s.reactant.value,
                temperature_k=s.temperature_k,
                excess_heat_watts=s.excess_heat_watts,
                created_at=s.created_at.isoformat(),
                updated_at=s.updated_at.isoformat()
            )
            for s in simulations
        ]
    except Exception as e:
        logger.error(f"Error fetching public simulations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch public simulations: {str(e)}")


@router.get("/{simulation_id}", response_model=SimulationDetailResponse)
async def get_simulation(
    simulation_id: str,
    service: SharedSimulationService = Depends(get_simulation_service)
):
    """Get detailed information about a specific simulation (public or user's own)"""
    try:
        simulation = await service.get_simulation(simulation_id)
        if not simulation:
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        return SimulationDetailResponse(
            id=simulation.id,
            name=simulation.name,
            description=simulation.description,
            tags=simulation.tags,
            is_public=simulation.is_public,
            material_type=simulation.material_type.value,
            reactant=simulation.reactant.value,
            temperature_k=simulation.temperature_k,
            excess_heat_watts=simulation.excess_heat_watts,
            created_at=simulation.created_at.isoformat(),
            updated_at=simulation.updated_at.isoformat(),
            parameters=simulation.parameters,
            results=simulation.results
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching simulation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch simulation: {str(e)}")


@router.post("/matches", response_model=List[MatchResponse])
async def find_matches(
    request: MatchSimulationRequest,
    service: SharedSimulationService = Depends(get_simulation_service)
):
    """
    Find simulations with similar parameters for experimental replication.
    
    Uses matching algorithm to find best matches based on:
    - Material type (exact match required)
    - Temperature, pressure, loading ratio (within tolerance)
    - Similar excess heat outputs
    """
    try:
        # Build target parameters
        target_material = MaterialType(request.material_type.lower()) if request.material_type else None
        target_reactant = ReactantType(request.reactant.lower()) if request.reactant else None
        
        matches = await service.find_best_matches(
            material_type=target_material,
            reactant=target_reactant,
            temperature_k=request.temperature_k,
            pressure_pa=request.pressure_pa,
            loading_ratio=request.loading_ratio,
            tolerance=request.tolerance,
            limit=request.limit
        )
        
        return [
            MatchResponse(
                simulation=SimulationResponse(
                    id=m.simulation.id,
                    name=m.simulation.name,
                    description=m.simulation.description,
                    tags=m.simulation.tags,
                    is_public=m.simulation.is_public,
                    material_type=m.simulation.material_type.value,
                    reactant=m.simulation.reactant.value,
                    temperature_k=m.simulation.temperature_k,
                    excess_heat_watts=m.simulation.excess_heat_watts,
                    created_at=m.simulation.created_at.isoformat(),
                    updated_at=m.simulation.updated_at.isoformat()
                ),
                similarity_score=m.similarity_score,
                matching_criteria=m.matching_criteria,
                differences=m.differences
            )
            for m in matches
        ]
    except Exception as e:
        logger.error(f"Error finding matches: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to find matches: {str(e)}")
