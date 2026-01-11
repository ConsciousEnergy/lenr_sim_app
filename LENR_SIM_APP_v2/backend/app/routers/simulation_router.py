from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Query, Path, status
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict
from uuid import uuid4
from datetime import datetime

from ..models.simulation_models import SimulationParameters, SimulationStatus, SimulationResult
from ..services.simulation_service import (
    create_simulation_task,
    get_simulation_by_id,
    get_all_simulations,
    get_simulation_results,
    delete_simulation_by_id,
    stop_simulation_by_id
)

router = APIRouter(
    prefix="/simulations",
    tags=["simulations"],
    responses={404: {"description": "Simulation not found"}, 500: {"description": "Internal server error"}}
)


@router.post(
    "/",
    response_model=SimulationStatus,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new simulation",
    description="Create a new LENR simulation with the provided parameters"
)
async def create_simulation(
    parameters: SimulationParameters,
    background_tasks: BackgroundTasks
):
    """
    Create a new LENR simulation with the given parameters:
    
    - **reactor_temperature**: Initial reactor temperature in Celsius
    - **reactor_pressure**: Initial reactor pressure in bars
    - **reactor_volume**: Reactor volume in liters
    - **material_type**: Type of material (nickel, palladium, titanium, custom)
    - **lattice_constant**: Lattice constant in angstroms
    - **loading_ratio**: Loading ratio of hydrogen/deuterium in metal lattice
    - **simulation_duration**: Simulation duration in seconds
    - **time_step**: Time step for simulation in seconds
    """
    try:
        simulation_id = str(uuid4())
        now = datetime.utcnow()
        
        # Create initial simulation status
        simulation_status = SimulationStatus(
            id=simulation_id,
            status="pending",
            progress=0.0,
            created_at=now,
            parameters=parameters
        )
        
        # Queue the simulation task to run in the background
        background_tasks.add_task(
            create_simulation_task,
            simulation_id,
            parameters
        )
        
        return simulation_status
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create simulation: {str(e)}"
        )


@router.get(
    "/",
    response_model=List[SimulationStatus],
    summary="Get all simulations",
    description="Retrieve a list of all simulations with optional filtering by status"
)
async def get_simulations(
    status: Optional[str] = Query(None, description="Filter by simulation status"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of simulations to return"),
    offset: int = Query(0, ge=0, description="Number of simulations to skip")
):
    """
    Retrieve a list of simulations with optional filtering and pagination.
    
    - **status**: Optional filter by simulation status (pending, running, completed, failed, cancelled)
    - **limit**: Maximum number of simulations to return (default: 10, max: 100)
    - **offset**: Number of simulations to skip (default: 0)
    """
    try:
        return await get_all_simulations(status, limit, offset)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve simulations: {str(e)}"
        )


@router.get(
    "/{simulation_id}",
    response_model=SimulationStatus,
    summary="Get simulation status",
    description="Retrieve the status of a specific simulation by ID"
)
async def get_simulation(
    simulation_id: str = Path(..., description="ID of the simulation to retrieve")
):
    """
    Retrieve the status of a specific simulation by its unique ID.
    
    - **simulation_id**: Unique identifier of the simulation
    """
    simulation = await get_simulation_by_id(simulation_id)
    if not simulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation with ID {simulation_id} not found"
        )
    return simulation


@router.get(
    "/{simulation_id}/results",
    response_model=SimulationResult,
    summary="Get simulation results",
    description="Retrieve the results of a completed simulation"
)
async def get_simulation_results_endpoint(
    simulation_id: str = Path(..., description="ID of the simulation to retrieve results for")
):
    """
    Retrieve the detailed results of a completed simulation.
    Only available for simulations with status 'completed'.
    
    - **simulation_id**: Unique identifier of the simulation
    """
    simulation = await get_simulation_by_id(simulation_id)
    if not simulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation with ID {simulation_id} not found"
        )
    
    if simulation.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Results only available for completed simulations. Current status: {simulation.status}"
        )
    
    results = await get_simulation_results(simulation_id)
    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Results for simulation with ID {simulation_id} not found"
        )
    
    return results


@router.delete(
    "/{simulation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete simulation",
    description="Delete a simulation and its associated data"
)
async def delete_simulation(
    simulation_id: str = Path(..., description="ID of the simulation to delete")
):
    """
    Delete a simulation and all associated data.
    
    - **simulation_id**: Unique identifier of the simulation to delete
    """
    simulation = await get_simulation_by_id(simulation_id)
    if not simulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation with ID {simulation_id} not found"
        )
    
    success = await delete_simulation_by_id(simulation_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete simulation with ID {simulation_id}"
        )
    
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)


@router.post(
    "/{simulation_id}/stop",
    response_model=SimulationStatus,
    summary="Stop simulation",
    description="Stop a running simulation"
)
async def stop_simulation(
    simulation_id: str = Path(..., description="ID of the simulation to stop")
):
    """
    Stop a running simulation. Only works for simulations with status 'running'.
    
    - **simulation_id**: Unique identifier of the simulation to stop
    """
    simulation = await get_simulation_by_id(simulation_id)
    if not simulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation with ID {simulation_id} not found"
        )
    
    if simulation.status != "running":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only stop running simulations. Current status: {simulation.status}"
        )
    
    updated_simulation = await stop_simulation_by_id(simulation_id)
    if not updated_simulation:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop simulation with ID {simulation_id}"
        )
    
    return updated_simulation 