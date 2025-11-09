"""
API Router for Advanced Simulation Engine

This module provides FastAPI endpoints for setting up, running, and retrieving results
from advanced LENR simulations.
"""

import numpy as np
from typing import Dict, List, Optional, Tuple, Any, Union
from pydantic import BaseModel, Field
import time
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
import logging
import os
import json

from app.utils.logging import setup_logger
from app.physics.advanced_simulation_engine import (
    AdvancedSimulationEngine, SimulationDomain, Species, ReactionModel,
    FusionReactionModel, create_fusion_simulation
)
from app.physics.models import FusionReaction, FusionEnhancementFactors
from app.physics.enhanced_fusion import EnhancedFusionCalculator

# Setup logger
logger = setup_logger("simulation_api", "logs/api.log")

# Create router
router = APIRouter(
    prefix="/simulation",
    tags=["simulation"],
    responses={404: {"description": "Not found"}},
)

# Models for API requests and responses
class SimulationDomainModel(BaseModel):
    """Pydantic model for simulation domain configuration"""
    dimensions: Tuple[float, float, float] = Field(..., description="Physical dimensions of the domain in meters (x, y, z)")
    resolution: Tuple[int, int, int] = Field(..., description="Number of grid points in each dimension (nx, ny, nz)")
    boundary_conditions: Optional[Dict[str, str]] = Field(None, description="Boundary conditions for each dimension and face")

class SpeciesModel(BaseModel):
    """Pydantic model for chemical or nuclear species"""
    name: str = Field(..., description="Name of the species")
    z: int = Field(..., description="Atomic number")
    a: int = Field(..., description="Mass number")
    diffusion_coefficient: float = Field(0.0, description="Diffusion coefficient in m²/s")
    initial_concentration: float = Field(0.0, description="Initial concentration (uniform)")

class ReactionModel(BaseModel):
    """Pydantic model for reaction configuration"""
    name: str = Field(..., description="Name of the reaction")
    reactants: List[str] = Field(..., description="Names of reactant species")
    products: List[str] = Field(..., description="Names of product species")
    reaction_type: str = Field("fusion", description="Type of reaction: 'fusion' or 'chemical'")
    
class SimulationConfigModel(BaseModel):
    """Pydantic model for simulation configuration"""
    domain: SimulationDomainModel
    species: List[SpeciesModel]
    reactions: List[ReactionModel]
    temperature: float = Field(300.0, description="Initial temperature in Kelvin")
    time_step: float = Field(1e-6, description="Time step in seconds")
    max_time: float = Field(1e-3, description="Maximum simulation time in seconds")
    enhancement_factors: Optional[Dict[str, float]] = Field(None, description="Enhancement factors for fusion mechanisms")

class SimulationResultSummary(BaseModel):
    """Pydantic model for simulation result summary"""
    simulation_id: str
    status: str
    progress: float
    elapsed_time: float
    remaining_time: Optional[float] = None
    start_time: float
    end_time: Optional[float] = None
    config_summary: Dict[str, Any]

class SimulationStatus(BaseModel):
    """Pydantic model for simulation status updates"""
    simulation_id: str
    status: str
    progress: float
    message: Optional[str] = None

# Store active simulations in memory
# In a production environment, consider using a database
active_simulations: Dict[str, Dict[str, Any]] = {}

def get_calculator():
    """
    Dependency to get EnhancedFusionCalculator instance
    """
    return EnhancedFusionCalculator()

@router.post("/create", response_model=SimulationResultSummary)
async def create_simulation(
    config: SimulationConfigModel,
    background_tasks: BackgroundTasks,
    calculator: EnhancedFusionCalculator = Depends(get_calculator)
):
    """
    Create a new simulation with the given configuration
    """
    # Generate unique ID for the simulation
    simulation_id = f"sim_{int(time.time())}_{os.urandom(4).hex()}"
    
    # Create basic configuration summary
    config_summary = {
        "domain_size": config.domain.dimensions,
        "resolution": config.domain.resolution,
        "num_species": len(config.species),
        "num_reactions": len(config.reactions),
        "simulation_time": config.max_time,
        "time_step": config.time_step,
        "species": [s.name for s in config.species],
        "reactions": [r.name for r in config.reactions]
    }
    
    # Store initial state
    active_simulations[simulation_id] = {
        "id": simulation_id,
        "status": "created",
        "progress": 0.0,
        "config": config.dict(),
        "config_summary": config_summary,
        "start_time": time.time(),
        "end_time": None,
        "elapsed_time": 0.0,
        "remaining_time": None,
        "results": None,
        "engine": None,
        "error": None
    }
    
    # Schedule initialization and running in background
    background_tasks.add_task(
        initialize_and_run_simulation,
        simulation_id,
        config,
        calculator
    )
    
    # Return initial status
    return SimulationResultSummary(
        simulation_id=simulation_id,
        status="created",
        progress=0.0,
        elapsed_time=0.0,
        start_time=active_simulations[simulation_id]["start_time"],
        config_summary=config_summary
    )

@router.get("/status/{simulation_id}", response_model=SimulationStatus)
async def get_simulation_status(simulation_id: str):
    """
    Get the status of a simulation
    """
    if simulation_id not in active_simulations:
        raise HTTPException(status_code=404, detail=f"Simulation {simulation_id} not found")
    
    sim_data = active_simulations[simulation_id]
    
    return SimulationStatus(
        simulation_id=simulation_id,
        status=sim_data["status"],
        progress=sim_data["progress"],
        message=f"Elapsed time: {sim_data['elapsed_time']:.2f}s"
    )

@router.get("/result/{simulation_id}", response_model=SimulationResultSummary)
async def get_simulation_result(simulation_id: str):
    """
    Get the results of a completed simulation
    """
    if simulation_id not in active_simulations:
        raise HTTPException(status_code=404, detail=f"Simulation {simulation_id} not found")
    
    sim_data = active_simulations[simulation_id]
    
    if sim_data["status"] not in ["completed", "error"]:
        raise HTTPException(status_code=400, detail=f"Simulation {simulation_id} is still running")
    
    # Prepare result summary
    result_summary = SimulationResultSummary(
        simulation_id=simulation_id,
        status=sim_data["status"],
        progress=sim_data["progress"],
        elapsed_time=sim_data["elapsed_time"],
        start_time=sim_data["start_time"],
        end_time=sim_data["end_time"],
        config_summary=sim_data["config_summary"]
    )
    
    return result_summary

@router.get("/visualization-data/{simulation_id}")
async def get_visualization_data(simulation_id: str):
    """
    Get the visualization data for a simulation
    """
    if simulation_id not in active_simulations:
        raise HTTPException(status_code=404, detail=f"Simulation {simulation_id} not found")
    
    sim_data = active_simulations[simulation_id]
    
    if sim_data["status"] not in ["completed"]:
        raise HTTPException(status_code=400, detail=f"Simulation {simulation_id} data not ready")
    
    if not sim_data["results"]:
        raise HTTPException(status_code=400, detail=f"No results available for simulation {simulation_id}")
    
    # Extract key visualization data
    # For performance, we'll downsample the data
    results = sim_data["results"]
    config = sim_data["config"]
    
    # Time steps (take every n-th step)
    time_steps = results["time"]
    step_count = len(time_steps)
    sample_rate = max(1, step_count // 100)  # Max 100 time steps for visualization
    
    # Prepare visualization data
    viz_data = {
        "time": time_steps[::sample_rate].tolist(),
        "domain": {
            "dimensions": config["domain"]["dimensions"],
            "resolution": config["domain"]["resolution"]
        },
        "concentrations": {},
        "reaction_rates": {}
    }
    
    # Include concentration data for each species
    for species_name, concentration_history in results["concentrations"].items():
        # For each time step, calculate average concentration
        avg_concentrations = [np.mean(conc) for conc in concentration_history]
        viz_data["concentrations"][species_name] = avg_concentrations[::sample_rate]
    
    # Include reaction rate data
    for reaction_name, rate_history in results["reaction_rates"].items():
        # For each time step, calculate average rate
        avg_rates = [np.mean(rate) for rate in rate_history]
        viz_data["reaction_rates"][reaction_name] = avg_rates[::sample_rate]
    
    return viz_data

@router.get("/slice-data/{simulation_id}")
async def get_slice_data(
    simulation_id: str, 
    time_index: int = 0,
    slice_axis: str = "z",
    slice_position: float = 0.5  # Position as fraction (0-1)
):
    """
    Get slice data for 3D visualization
    """
    if simulation_id not in active_simulations:
        raise HTTPException(status_code=404, detail=f"Simulation {simulation_id} not found")
    
    sim_data = active_simulations[simulation_id]
    
    if sim_data["status"] not in ["completed"]:
        raise HTTPException(status_code=400, detail=f"Simulation {simulation_id} data not ready")
    
    if not sim_data["results"]:
        raise HTTPException(status_code=400, detail=f"No results available for simulation {simulation_id}")
    
    results = sim_data["results"]
    config = sim_data["config"]
    domain_config = config["domain"]
    
    # Get time steps and ensure time_index is valid
    time_steps = results["time"]
    if time_index < 0 or time_index >= len(time_steps):
        raise HTTPException(status_code=400, detail=f"Invalid time index: {time_index}")
    
    # Get domain information
    dimensions = domain_config["dimensions"]
    resolution = domain_config["resolution"]
    
    # Determine slice axis and position
    axis_idx = {"x": 0, "y": 1, "z": 2}.get(slice_axis.lower())
    if axis_idx is None:
        raise HTTPException(status_code=400, detail=f"Invalid slice axis: {slice_axis}")
    
    # Calculate slice index
    slice_idx = int(slice_position * resolution[axis_idx])
    slice_idx = max(0, min(slice_idx, resolution[axis_idx] - 1))
    
    # Prepare slice data
    slice_data = {
        "time": time_steps[time_index],
        "slice_axis": slice_axis,
        "slice_position": slice_position,
        "dimensions": dimensions,
        "resolution": resolution,
        "concentrations": {},
        "reaction_rates": {}
    }
    
    # Extract slice data for each species
    for species_name, concentration_history in results["concentrations"].items():
        concentration = concentration_history[time_index]
        
        # Extract 2D slice based on axis
        if axis_idx == 0:  # x-axis
            slice_2d = concentration[slice_idx, :, :].tolist()
        elif axis_idx == 1:  # y-axis
            slice_2d = concentration[:, slice_idx, :].tolist()
        else:  # z-axis
            slice_2d = concentration[:, :, slice_idx].tolist()
        
        slice_data["concentrations"][species_name] = slice_2d
    
    # Extract slice data for each reaction
    for reaction_name, rate_history in results["reaction_rates"].items():
        rate = rate_history[time_index]
        
        # Extract 2D slice based on axis
        if axis_idx == 0:  # x-axis
            slice_2d = rate[slice_idx, :, :].tolist()
        elif axis_idx == 1:  # y-axis
            slice_2d = rate[:, slice_idx, :].tolist()
        else:  # z-axis
            slice_2d = rate[:, :, slice_idx].tolist()
        
        slice_data["reaction_rates"][reaction_name] = slice_2d
    
    return slice_data

# Background task function for running simulations
def initialize_and_run_simulation(
    simulation_id: str,
    config: SimulationConfigModel,
    calculator: EnhancedFusionCalculator
):
    """
    Initialize and run a simulation in the background
    """
    if simulation_id not in active_simulations:
        logger.error(f"Simulation {simulation_id} not found in active_simulations")
        return
    
    sim_data = active_simulations[simulation_id]
    
    try:
        # Update status to initializing
        sim_data["status"] = "initializing"
        sim_data["progress"] = 0.0
        
        logger.info(f"Initializing simulation {simulation_id}")
        
        # Create domain
        domain = SimulationDomain(
            dimensions=config.domain.dimensions,
            resolution=config.domain.resolution,
            boundary_conditions=config.domain.boundary_conditions
        )
        
        # Create simulation engine
        engine = AdvancedSimulationEngine(
            domain=domain,
            time_step=config.time_step,
            max_time=config.max_time
        )
        
        # Add species
        species_objects = {}
        for spec in config.species:
            species = Species(
                name=spec.name,
                z=spec.z,
                a=spec.a,
                diffusion_coefficient=spec.diffusion_coefficient,
                initial_concentration=spec.initial_concentration
            )
            engine.add_species(species)
            species_objects[spec.name] = species
        
        # Add reactions
        for reaction_config in config.reactions:
            if reaction_config.reaction_type == "fusion":
                # Find fusion reaction in calculator
                if reaction_config.name not in calculator.reactions:
                    raise ValueError(f"Fusion reaction {reaction_config.name} not found")
                
                fusion_reaction = calculator.reactions[reaction_config.name]
                
                # Get reactant and product species
                reactants = [species_objects[name] for name in reaction_config.reactants]
                products = [species_objects[name] for name in reaction_config.products]
                
                # Create and add fusion reaction model
                reaction = FusionReactionModel(
                    fusion_reaction=fusion_reaction,
                    reactants=reactants,
                    products=products,
                    calculator=calculator
                )
                engine.add_reaction(reaction)
            else:
                # For non-fusion reactions, we would need to implement a different model
                raise ValueError(f"Unsupported reaction type: {reaction_config.reaction_type}")
        
        # Set temperature
        engine.set_temperature(config.temperature)
        
        # Store engine
        sim_data["engine"] = engine
        
        # Update status to running
        sim_data["status"] = "running"
        start_time = time.time()
        
        # Define progress callback
        def progress_callback(engine, step_count):
            progress = min(1.0, step_count * engine.time_step / engine.max_time)
            elapsed = time.time() - start_time
            
            # Estimate remaining time
            if progress > 0:
                remaining = elapsed * (1.0 / progress - 1.0)
            else:
                remaining = None
            
            # Update simulation data
            sim_data["progress"] = progress
            sim_data["elapsed_time"] = elapsed
            sim_data["remaining_time"] = remaining
        
        # Run simulation
        logger.info(f"Running simulation {simulation_id}")
        engine.run(callback=progress_callback)
        
        # Update status to completed
        end_time = time.time()
        sim_data["status"] = "completed"
        sim_data["progress"] = 1.0
        sim_data["elapsed_time"] = end_time - start_time
        sim_data["remaining_time"] = 0.0
        sim_data["end_time"] = end_time
        
        # Store results
        results = engine.get_results()
        
        # Convert numpy arrays to lists for JSON serialization and reduce data size
        processed_results = {
            "time": results["time"].tolist(),
            "concentrations": {},
            "reaction_rates": {},
            "domain": results["domain"]
        }
        
        # Process concentration and reaction rate data
        for species_name, conc_history in results["concentrations"].items():
            processed_results["concentrations"][species_name] = [
                conc.tolist() for conc in conc_history
            ]
        
        for reaction_name, rate_history in results["reaction_rates"].items():
            processed_results["reaction_rates"][reaction_name] = [
                rate.tolist() for rate in rate_history
            ]
        
        sim_data["results"] = processed_results
        
        logger.info(f"Simulation {simulation_id} completed successfully")
    
    except Exception as e:
        # Handle errors
        logger.error(f"Error in simulation {simulation_id}: {str(e)}", exc_info=True)
        
        sim_data["status"] = "error"
        sim_data["error"] = str(e)
        sim_data["end_time"] = time.time()
        sim_data["elapsed_time"] = sim_data["end_time"] - sim_data["start_time"]
    
    finally:
        # Clean up engine reference
        sim_data["engine"] = None
        
        # In a production environment, you might want to schedule cleanup of old simulations
        # For example, deleting results after a certain time period 