from fastapi import APIRouter, BackgroundTasks, HTTPException
import uuid
import logging
from typing import Dict, Any, List, Optional

from app.models.simulation import SimulationRequest, SimulationResponse
from app.services.simulation_manager import simulation_manager
from app.utils.logging import setup_logger
from app.simulation.factory import create_simulation
from app.simulation.domain import SimulationDomain

# Set up logger
logger = setup_logger("simulation_router", "logs/api.log")

router = APIRouter()

def create_domain_from_request(request: SimulationRequest) -> SimulationDomain:
    """
    Create a simulation domain from a request.
    
    Args:
        request: Simulation request
        
    Returns:
        Simulation domain
    """
    # Extract domain parameters from request
    geometry = request.geometry
    dimensions = request.dimensions
    
    # Create domain
    domain = SimulationDomain(
        geometry=geometry,
        dimensions=dimensions,
        properties=request.properties or {}
    )
    
    return domain

@router.post("/{engine_type}", response_model=SimulationResponse)
async def create_simulation(
    engine_type: str,
    simulation_request: SimulationRequest,
    background_tasks: BackgroundTasks
):
    """
    Create a new simulation with the requested engine and domain.
    
    Available engine types:
    - simple: Basic simulation with simple physics models
    - advanced: Advanced simulation with more detailed physics models
    - fem: Finite Element Method simulation with multiphysics capabilities
    """
    # Create simulation domain from request
    domain = create_domain_from_request(simulation_request)
    
    # Validate engine type
    valid_engines = ["simple", "advanced", "fem"]
    if engine_type.lower() not in valid_engines:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid engine type: {engine_type}. Valid options: {', '.join(valid_engines)}"
        )
    
    try:
        # Create simulation
        engine = create_simulation(engine_type, domain, simulation_request.config)
        
        # Get simulation ID
        sim_id = getattr(engine, "simulation_id", str(uuid.uuid4()))
        
        # Store in simulation manager
        simulation_manager.add_simulation(sim_id, engine)
        
        # Run simulation in background
        if simulation_request.run_immediately:
            background_tasks.add_task(simulation_manager.run_simulation, sim_id)
        
        # Create response
        response = SimulationResponse(
            simulation_id=sim_id,
            status="initialized",
            message=f"Simulation created with {engine_type} engine"
        )
        
        return response
    
    except Exception as e:
        logger.error(f"Error creating simulation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create simulation: {str(e)}"
        ) 