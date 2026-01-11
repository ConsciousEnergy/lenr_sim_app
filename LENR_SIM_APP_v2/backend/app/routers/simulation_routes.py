from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field, validator
from typing import Dict, Any, List, Optional, Union
from uuid import uuid4
import asyncio
import time
import numpy as np
from datetime import datetime

from ..core.simulation_manager import SimulationManager
from ..models.simulation_models import (
    SimulationRequest,
    SimulationResponse,
    SimulationStatus,
    SimulationResult
)

router = APIRouter(prefix="/simulations", tags=["simulations"])

# Simulation manager singleton
simulation_manager = SimulationManager()

@router.post("/", response_model=SimulationResponse)
async def create_simulation(
    request: SimulationRequest,
    background_tasks: BackgroundTasks
):
    """
    Start a new LENR simulation with the provided parameters.
    Returns a simulation ID that can be used to check status.
    """
    # Validate parameters
    try:
        # Generate a unique ID for this simulation
        simulation_id = str(uuid4())
        
        # Register the simulation with the manager
        simulation_manager.register_simulation(simulation_id, request.parameters)
        
        # Start the simulation in the background
        background_tasks.add_task(
            simulation_manager.run_simulation,
            simulation_id
        )
        
        return SimulationResponse(
            simulation_id=simulation_id,
            status="success",
            message="Simulation initialized successfully"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize simulation: {str(e)}")

@router.get("/{simulation_id}/status", response_model=SimulationStatus)
async def get_simulation_status(simulation_id: str):
    """
    Get the current status of a simulation by its ID.
    Returns status, progress, and results if available.
    """
    try:
        # Check if simulation exists
        if not simulation_manager.simulation_exists(simulation_id):
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        # Get full status object
        status = simulation_manager.get_simulation_full_status(simulation_id)
        if not status:
            raise HTTPException(status_code=404, detail="Simulation status not available")
        
        # Get results if simulation is completed
        if status.status == "completed" and not status.results:
            results = simulation_manager.get_simulation_results(simulation_id)
            if results:
                status.results = results
        
        return status
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving simulation status: {str(e)}")

@router.post("/{simulation_id}/trigger", response_model=dict)
async def trigger_simulation_progress(simulation_id: str):
    """
    Force a simulation to advance from the initializing state.
    Useful for stuck simulations.
    """
    try:
        # Check if simulation exists
        if not simulation_manager.simulation_exists(simulation_id):
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        # Try to force trigger progress
        success = simulation_manager.force_trigger_progress(simulation_id)
        
        if not success:
            return {
                "success": False,
                "message": "Simulation couldn't be triggered (not in initializing state or already progressing)"
            }
        
        return {
            "success": True,
            "message": "Simulation progress triggered successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error triggering simulation: {str(e)}")

@router.post("/{simulation_id}/stop")
async def stop_simulation(simulation_id: str):
    """
    Stop a running simulation.
    """
    try:
        # Check if simulation exists
        if not simulation_manager.simulation_exists(simulation_id):
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        # Stop the simulation
        success = simulation_manager.stop_simulation(simulation_id)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to stop simulation")
        
        return {"message": "Simulation stopped successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error stopping simulation: {str(e)}")

@router.get("/{simulation_id}/results", response_model=dict)
async def get_simulation_results(simulation_id: str):
    """
    Get the results of a completed simulation.
    """
    try:
        # Check if simulation exists
        if not simulation_manager.simulation_exists(simulation_id):
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        # Get simulation status
        status = simulation_manager.get_simulation_status(simulation_id)
        
        # If not completed, return an error or status
        if status != "completed":
            return {
                "simulation_id": simulation_id,
                "status": status,
                "message": "Simulation is not yet completed",
                "results": None
            }
        
        # Get results
        results = simulation_manager.get_simulation_results(simulation_id)
        if not results:
            return {
                "simulation_id": simulation_id,
                "status": "completed",
                "message": "No results available for this simulation",
                "results": None
            }
        
        return results
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving simulation results: {str(e)}")

@router.get("/", response_model=List[SimulationStatus])
async def list_simulations():
    """
    List all simulations with their current status.
    """
    try:
        simulations = simulation_manager.list_simulations()
        return simulations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing simulations: {str(e)}")

@router.delete("/{simulation_id}")
async def delete_simulation(simulation_id: str):
    """
    Delete a simulation and its results.
    """
    try:
        # Check if simulation exists
        if not simulation_manager.simulation_exists(simulation_id):
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        # Delete simulation
        success = simulation_manager.delete_simulation(simulation_id)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to delete simulation")
        
        return {"message": "Simulation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting simulation: {str(e)}")

@router.post("/{simulation_id}/summary", response_model=dict)
async def get_simulation_summary(simulation_id: str):
    """
    Get a summary of simulation status and results.
    """
    try:
        # Check if simulation exists
        if not simulation_manager.simulation_exists(simulation_id):
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        # Get status
        status = simulation_manager.get_simulation_full_status(simulation_id)
        if not status:
            raise HTTPException(status_code=404, detail="Simulation status not available")
        
        # Get results summary if completed
        summary = None
        if status.status == "completed":
            results = simulation_manager.get_simulation_results(simulation_id)
            if results and hasattr(results, "summary"):
                summary = results.summary
        
        # Return combined summary
        return {
            "simulation_id": simulation_id,
            "status": status.status,
            "current_stage": status.current_stage,
            "progress": status.overall_progress,
            "message": status.message,
            "created_at": status.created_at,
            "started_at": status.started_at,
            "completed_at": status.completed_at,
            "parameters": status.parameters,
            "summary": summary
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving simulation summary: {str(e)}") 