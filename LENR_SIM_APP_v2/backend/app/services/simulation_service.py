import asyncio
import logging
import math
import random
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Union, Any, Tuple
from enum import Enum

import numpy as np
from fastapi import BackgroundTasks
from uuid import UUID

from app.models.simulation_models import (
    SimulationParameters,
    SimulationStatus,
    SimulationResult,
    TemperatureData,
    PressureData,
    ExcessPowerData
)
from app.core.physics_engine import run_lenr_simulation
from app.utils.storage import save_simulation, update_simulation, get_simulation, get_simulations_by_status, delete_simulation

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory storage for simulations
# In a production environment, this would be replaced with a database
simulations: Dict[str, SimulationStatus] = {}
simulation_results: Dict[str, SimulationResult] = {}
# Active simulation tasks for cancellation
active_tasks: Dict[str, asyncio.Task] = {}

# In-memory storage for active simulations and results
# In a production environment, this would be replaced with a database
_active_simulations: Dict[str, asyncio.Task] = {}
_simulation_results: Dict[str, SimulationResult] = {}

class SimulationStage(str, Enum):
    INITIALIZING = "initializing"
    SETUP = "setup"
    PROCESSING = "processing"
    ANALYZING = "analyzing"
    FINALIZING = "finalizing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

async def create_simulation(
    parameters: SimulationParameters,
    background_tasks: BackgroundTasks
) -> str:
    """
    Create a new simulation and start it as a background task.
    
    Args:
        parameters: Simulation parameters
        background_tasks: FastAPI BackgroundTasks for managing background processes
        
    Returns:
        str: ID of the created simulation
    """
    simulation_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    # Create initial simulation status
    status = SimulationStatus(
        id=simulation_id,
        status="initialized",  # Start with initialized status
        created_at=now,
        updated_at=now,
        started_at=None,
        completed_at=None,
        progress=0.0,
        parameters=parameters,
        error_message=None,
        results=None
    )
    
    # Save to storage
    await save_simulation(status)
    simulations[simulation_id] = status
    
    # Create and store the background task
    task = asyncio.create_task(create_simulation_task(simulation_id, parameters))
    active_tasks[simulation_id] = task
    
    # Add task to background tasks for lifecycle management
    background_tasks.add_task(lambda: task)
    
    logger.info(f"Created simulation with ID: {simulation_id}, status: initialized")
    return simulation_id


async def get_simulation(simulation_id: str) -> Optional[SimulationStatus]:
    """
    Get the status of a simulation by ID.
    
    Args:
        simulation_id: ID of the simulation
        
    Returns:
        Optional[SimulationStatus]: Simulation status or None if not found
    """
    return simulations.get(simulation_id)


async def get_all_simulations(
    status: Optional[str] = None,
    limit: int = 10,
    offset: int = 0
) -> List[SimulationStatus]:
    """
    Get all simulations, optionally filtered by status.
    
    Args:
        status: Filter by status (pending, running, completed, failed, cancelled)
        limit: Maximum number of simulations to return
        offset: Number of simulations to skip
        
    Returns:
        List[SimulationStatus]: List of simulation statuses
    """
    result = list(simulations.values())
    
    # Apply status filter if provided
    if status:
        result = [s for s in result if s.status == status]
    
    # Sort by created_at (newest first)
    result.sort(key=lambda x: x.created_at, reverse=True)
    
    # Apply pagination
    return result[offset:offset + limit]


async def delete_simulation(simulation_id: str) -> bool:
    """
    Delete a simulation and its results.
    
    Args:
        simulation_id: ID of the simulation to delete
        
    Returns:
        bool: True if successfully deleted, False otherwise
    """
    if simulation_id not in simulations:
        return False
    
    # Cancel running task if exists
    if simulation_id in active_tasks and not active_tasks[simulation_id].done():
        active_tasks[simulation_id].cancel()
        try:
            await active_tasks[simulation_id]
        except asyncio.CancelledError:
            logger.info(f"Cancelled running simulation {simulation_id}")
        except Exception as e:
            logger.error(f"Error cancelling simulation {simulation_id}: {str(e)}")
        
        active_tasks.pop(simulation_id, None)
    
    # Remove from storage
    simulations.pop(simulation_id, None)
    simulation_results.pop(simulation_id, None)
    
    logger.info(f"Deleted simulation with ID: {simulation_id}")
    return True


async def stop_simulation(simulation_id: str) -> bool:
    """
    Stop a running simulation.
    
    Args:
        simulation_id: ID of the simulation to stop
        
    Returns:
        bool: True if successfully stopped, False otherwise
    """
    if (
        simulation_id not in simulations 
        or simulations[simulation_id].status not in ["pending", "running"]
    ):
        return False
    
    # Cancel task if it exists and is running
    if simulation_id in active_tasks and not active_tasks[simulation_id].done():
        active_tasks[simulation_id].cancel()
        try:
            await active_tasks[simulation_id]
        except asyncio.CancelledError:
            logger.info(f"Cancelled simulation {simulation_id}")
        except Exception as e:
            logger.error(f"Error cancelling simulation {simulation_id}: {str(e)}")
        
        # Update status
        simulations[simulation_id].status = "cancelled"
        simulations[simulation_id].updated_at = datetime.now()
        
        active_tasks.pop(simulation_id, None)
        return True
    
    return False


async def get_simulation_results(simulation_id: str) -> Optional[SimulationResult]:
    """
    Get the results of a completed simulation.
    
    Args:
        simulation_id: ID of the simulation
        
    Returns:
        Optional[SimulationResult]: Simulation results or None if not found or not completed
    """
    if (
        simulation_id not in simulations 
        or simulations[simulation_id].status != "completed"
    ):
        return None
    
    return simulation_results.get(simulation_id)


# Private functions for internal use

async def _run_simulation(simulation_id: str, parameters: SimulationParameters) -> SimulationResult:
    """
    Run the actual simulation and return the results.
    
    Args:
        simulation_id: Unique identifier for the simulation
        parameters: Simulation parameters
        
    Returns:
        SimulationResult: The results of the simulation
    """
    logger.info(f"Running simulation {simulation_id}")
    
    try:
        # Get the current simulation to update progress
        simulation = await get_simulation(simulation_id)
        if not simulation:
            logger.error(f"Simulation {simulation_id} not found")
            raise ValueError(f"Simulation {simulation_id} not found")
            
        # Update status to running immediately
        simulation.status = SimulationStage.INITIALIZING
        simulation.started_at = datetime.utcnow()
        simulation.updated_at = datetime.utcnow()
        simulation.current_stage = SimulationStage.INITIALIZING
        simulation.stage_progress = 0.0
        simulation.overall_progress = 0.0
        await update_simulation(simulation)
        
        # Progress callback to update the simulation status
        async def update_progress(stage: SimulationStage, stage_progress: float, message: Optional[str] = None):
            simulation.current_stage = stage
            simulation.stage_progress = stage_progress
            
            # Calculate overall progress based on stages
            stage_weights = {
                SimulationStage.INITIALIZING: 0.1,
                SimulationStage.SETUP: 0.1,
                SimulationStage.PROCESSING: 0.5,
                SimulationStage.ANALYZING: 0.2,
                SimulationStage.FINALIZING: 0.1
            }
            
            # Calculate overall progress considering completed stages
            completed_weight = sum(stage_weights[s] for s in SimulationStage if s.value < stage.value)
            current_stage_contribution = stage_weights[stage] * (stage_progress / 100.0)
            simulation.overall_progress = (completed_weight + current_stage_contribution) * 100.0
            
            if message:
                simulation.message = message
            simulation.updated_at = datetime.utcnow()
            await update_simulation(simulation)
            logger.debug(f"Simulation {simulation_id} - Stage: {stage}, Progress: {stage_progress}%, Overall: {simulation.overall_progress}%")
            
        # Setup phase
        await update_progress(SimulationStage.SETUP, 0.0, "Preparing simulation parameters")
        # Additional setup logic here
        await update_progress(SimulationStage.SETUP, 100.0, "Setup complete")
        
        # Processing phase
        await update_progress(SimulationStage.PROCESSING, 0.0, "Starting physics calculations")
        result_data = await run_lenr_simulation(
            parameters=parameters,
            progress_callback=lambda p: update_progress(SimulationStage.PROCESSING, p, f"Processing physics calculations: {p:.1f}%")
        )
        
        # Analysis phase
        await update_progress(SimulationStage.ANALYZING, 0.0, "Analyzing simulation results")
        
        # Create the simulation result
        result = SimulationResult(
            simulation_id=simulation_id,
            parameters=parameters,
            time_series=result_data,
            summary_stats={
                "max_temperature": float(np.max(result_data.temperature)),
                "max_pressure": float(np.max(result_data.pressure)),
                "max_excess_power": float(np.max(result_data.excess_power)),
                "total_energy_produced": float(np.sum(result_data.energy_produced)),
                "average_efficiency": float(np.mean(result_data.efficiency)),
            },
            created_at=datetime.utcnow()
        )
        
        await update_progress(SimulationStage.ANALYZING, 100.0, "Analysis complete")
        
        # Finalizing phase
        await update_progress(SimulationStage.FINALIZING, 0.0, "Saving results")
        simulation_results[simulation_id] = result
        await update_progress(SimulationStage.FINALIZING, 100.0, "Results saved")
        
        # Mark as completed
        simulation.status = SimulationStage.COMPLETED
        simulation.current_stage = SimulationStage.COMPLETED
        simulation.stage_progress = 100.0
        simulation.overall_progress = 100.0
        simulation.completed_at = datetime.utcnow()
        simulation.updated_at = datetime.utcnow()
        await update_simulation(simulation)
        
        return result
        
    except asyncio.CancelledError:
        logger.info(f"Simulation {simulation_id} was cancelled")
        simulation.status = SimulationStage.CANCELLED
        simulation.current_stage = SimulationStage.CANCELLED
        simulation.updated_at = datetime.utcnow()
        await update_simulation(simulation)
        raise
        
    except Exception as e:
        logger.error(f"Error in simulation {simulation_id}: {str(e)}")
        simulation.status = SimulationStage.FAILED
        simulation.current_stage = SimulationStage.FAILED
        simulation.error_message = str(e)
        simulation.updated_at = datetime.utcnow()
        await update_simulation(simulation)
        raise


async def create_simulation_task(simulation_id: str, parameters: SimulationParameters) -> None:
    """
    Create and start a new simulation task.
    
    Args:
        simulation_id: Unique identifier for the simulation
        parameters: Simulation parameters
    """
    logger.info(f"Starting simulation task for {simulation_id}")
    
    try:
        # Get the simulation
        simulation = await get_simulation(simulation_id)
        if not simulation:
            logger.error(f"Simulation {simulation_id} not found")
            raise ValueError(f"Simulation {simulation_id} not found")
        
        if simulation.status != "initialized":
            logger.warning(f"Simulation {simulation_id} in unexpected state: {simulation.status}")
            
        # Run the simulation
        result = await _run_simulation(simulation_id, parameters)
            
        # Update simulation with results
        simulation.status = "completed"
        simulation.progress = 100.0
        simulation.completed_at = datetime.utcnow()
        simulation.updated_at = datetime.utcnow()
        simulation.results = result
        await update_simulation(simulation)
        
        # Store results in memory
        simulation_results[simulation_id] = result
        
        logger.info(f"Completed simulation {simulation_id} successfully")
        
    except asyncio.CancelledError:
        logger.info(f"Simulation {simulation_id} was cancelled")
        simulation.status = "cancelled"
        simulation.updated_at = datetime.utcnow()
        simulation.error_message = "Simulation was cancelled"
        await update_simulation(simulation)
        raise
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error in simulation {simulation_id}: {error_msg}")
        simulation.status = "failed"
        simulation.updated_at = datetime.utcnow()
        simulation.error_message = error_msg
        await update_simulation(simulation)
        raise
    finally:
        # Clean up task reference
        active_tasks.pop(simulation_id, None)


async def get_simulation_by_id(simulation_id: str) -> Optional[SimulationStatus]:
    """
    Get a simulation by its ID.
    
    Args:
        simulation_id: Unique identifier for the simulation
        
    Returns:
        SimulationStatus: The simulation status or None if not found
    """
    return await get_simulation(simulation_id)


async def get_all_simulations(
    status: Optional[str] = None,
    limit: int = 10,
    offset: int = 0
) -> List[SimulationStatus]:
    """
    Get all simulations with optional filtering by status.
    
    Args:
        status: Optional status to filter by
        limit: Maximum number of simulations to return
        offset: Number of simulations to skip
        
    Returns:
        List[SimulationStatus]: List of simulation status objects
    """
    return await get_simulations_by_status(status, limit, offset)


async def get_simulation_results(simulation_id: str) -> Optional[SimulationResult]:
    """
    Get the results of a simulation by its ID.
    
    Args:
        simulation_id: Unique identifier for the simulation
        
    Returns:
        SimulationResult: The simulation results or None if not found
    """
    return _simulation_results.get(simulation_id)


async def delete_simulation_by_id(simulation_id: str) -> bool:
    """
    Delete a simulation and its results.
    
    Args:
        simulation_id: Unique identifier for the simulation
        
    Returns:
        bool: True if successful, False otherwise
    """
    # Stop the simulation if it's running
    if simulation_id in _active_simulations:
        await stop_simulation_by_id(simulation_id)
    
    # Delete the results
    _simulation_results.pop(simulation_id, None)
    
    # Delete the simulation from storage
    return await delete_simulation(simulation_id)


async def stop_simulation_by_id(simulation_id: str) -> Optional[SimulationStatus]:
    """
    Stop a running simulation.
    
    Args:
        simulation_id: Unique identifier for the simulation
        
    Returns:
        SimulationStatus: Updated simulation status or None if not found
    """
    # Get the task
    task = _active_simulations.get(simulation_id)
    if not task:
        logger.warning(f"No active task found for simulation {simulation_id}")
        return None
    
    # Cancel the task
    if not task.done():
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    
    # Remove from active simulations
    _active_simulations.pop(simulation_id, None)
    
    # Update the simulation status
    simulation = await get_simulation(simulation_id)
    if simulation:
        simulation.status = "cancelled"
        simulation.message = "Simulation was cancelled by user"
        simulation.end_time = datetime.utcnow()
        await update_simulation(simulation)
    
    return simulation 