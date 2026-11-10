"""
Multi-Physics Coupling API Routes

This module provides API endpoints for running multi-physics coupled simulations
of LENR reactions, including nuclear and thermal phenomena.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field, model_validator
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import time
import os
import logging
import json
import uuid
from datetime import datetime

from app.simulation import (
    SimulationDomain,
    PhysicsDomainManager,
    NuclearDomain,
    ThermalDomain,
    DomainCoupler
)
from app.simulation.multi_physics.test_coupling import run_coupled_simulation, plot_results
from app.core.config import settings
from app.core.compute_guard import (
    release_heavy_slot_sync,
    try_acquire_heavy_slot_sync,
)

# Create router
router = APIRouter()

# In-memory storage for simulation results (single-worker deployment; see
# compute_guard.py). Bounded so a public client cannot grow it without limit.
simulation_results = {}
MAX_STORED_SIMULATIONS = 200
_ACTIVE_STATUSES = {"pending", "running"}


def _active_simulation_count() -> int:
    return sum(1 for sim in simulation_results.values() if sim.get("status") in _ACTIVE_STATUSES)


def _evict_finished_simulations() -> None:
    """Drop the oldest finished entries once the store exceeds MAX_STORED_SIMULATIONS."""
    overflow = len(simulation_results) - MAX_STORED_SIMULATIONS
    if overflow <= 0:
        return
    finished = [
        sim_id for sim_id, sim in simulation_results.items()
        if sim.get("status") not in _ACTIVE_STATUSES
    ]
    for sim_id in finished[:overflow]:
        simulation_results.pop(sim_id, None)


class SimulationRequest(BaseModel):
    """Request model for starting a coupled simulation."""
    domain_size: Tuple[float, float, float] = Field(
        (0.01, 0.01, 0.01),
        description="Physical dimensions of the domain in meters (x, y, z)"
    )
    resolution: Tuple[int, int, int] = Field(
        (10, 10, 10),
        description="Number of grid points in each dimension (nx, ny, nz)"
    )
    simulation_time: float = Field(
        0.01,
        description="Total simulation time in seconds",
        gt=0
    )
    time_step: float = Field(
        1.0e-6,
        description="Time step size in seconds",
        gt=0
    )
    reactions: List[str] = Field(
        ["d-d"],
        description="List of fusion reactions to simulate"
    )
    mechanisms: List[str] = Field(
        ["electron_screening", "coherent_tunneling"],
        description="List of enhancement mechanisms to include"
    )
    initial_temperature: float = Field(
        300.0,
        description="Initial temperature in Kelvin",
        gt=0
    )
    species_densities: Dict[str, float] = Field(
        {"d": 1.0e28},
        description="Dictionary mapping species names to densities (m^-3)"
    )
    thermal_conductivity: float = Field(
        10.0,
        description="Thermal conductivity in W/(m*K)",
        gt=0
    )
    heat_capacity: float = Field(
        500.0,
        description="Heat capacity in J/(kg*K)",
        gt=0
    )
    material_density: float = Field(
        1000.0,
        description="Material density in kg/m^3",
        gt=0
    )

    @model_validator(mode="after")
    def enforce_compute_bounds(self) -> "SimulationRequest":
        """Reject grids/step counts that would monopolise the public-beta host."""
        max_axis = settings.MAX_MULTI_PHYSICS_GRID_POINTS_PER_AXIS
        if any(n < 2 or n > max_axis for n in self.resolution):
            raise ValueError(
                f"resolution must have between 2 and {max_axis} grid points per axis"
            )
        if any(size <= 0 for size in self.domain_size):
            raise ValueError("domain_size components must be positive")
        step_count = self.simulation_time / self.time_step
        if step_count > settings.MAX_MULTI_PHYSICS_STEPS:
            raise ValueError(
                "simulation_time / time_step exceeds the maximum of "
                f"{settings.MAX_MULTI_PHYSICS_STEPS} time steps"
            )
        return self


class SimulationResponse(BaseModel):
    """Response model for a simulation start request."""
    simulation_id: str = Field(..., description="Unique ID for the simulation")
    status: str = Field(..., description="Status of the simulation")
    message: str = Field(..., description="Informational message")
    estimated_duration: float = Field(..., description="Estimated duration in seconds")


class SimulationStatus(BaseModel):
    """Response model for simulation status."""
    simulation_id: str = Field(..., description="Unique ID for the simulation")
    status: str = Field(..., description="Status of the simulation (pending, running, completed, failed)")
    progress: float = Field(..., description="Progress percentage (0-100)")
    current_time: float = Field(..., description="Current simulation time")
    message: Optional[str] = Field(None, description="Additional information")


class SimulationResults(BaseModel):
    """Response model for simulation results."""
    simulation_id: str = Field(..., description="Unique ID for the simulation")
    status: str = Field(..., description="Status of the simulation")
    times: List[float] = Field(..., description="Time points")
    max_temperatures: List[float] = Field(..., description="Maximum temperatures at each time point")
    mean_reaction_rates: List[float] = Field(..., description="Mean reaction rates at each time point")
    final_max_temperature: float = Field(..., description="Final maximum temperature")
    elapsed_time: float = Field(..., description="Wall-clock time elapsed")
    step_count: int = Field(..., description="Number of time steps")


def run_simulation_task(
    simulation_id: str,
    params: SimulationRequest
):
    """
    Background task to run a multi-physics simulation.
    
    Args:
        simulation_id: Unique ID for the simulation
        params: Simulation parameters
    """
    # Slot was reserved in start_simulation; always release in finally.
    try:
        # Update simulation status to running
        simulation_results[simulation_id]["status"] = "running"
        simulation_results[simulation_id]["start_time"] = time.time()
        
        # Create output directory if it doesn't exist
        os.makedirs('outputs', exist_ok=True)
        
        # Run the simulation
        results = run_coupled_simulation(
            domain_dims=params.domain_size,
            resolution=params.resolution,
            simulation_time=params.simulation_time,
            dt=params.time_step,
            reactions=params.reactions,
            mechanisms=params.mechanisms
        )
        
        # Store results. step_count lives on simulation_stats; timeseries
        # arrays come from the visualization collector when present.
        stats = results.get("simulation_stats") or {}

        def _as_list(value):
            if value is None:
                return []
            if hasattr(value, "tolist"):
                return value.tolist()
            return list(value)

        final_temperature = results.get("final_temperature")
        if final_temperature is None:
            final_max = 0.0
        else:
            final_max = float(np.max(final_temperature))

        simulation_results[simulation_id]["status"] = "completed"
        simulation_results[simulation_id]["end_time"] = time.time()
        simulation_results[simulation_id]["results"] = {
            "times": _as_list(results.get("times")),
            "max_temperatures": _as_list(results.get("max_temperatures")),
            "mean_reaction_rates": _as_list(results.get("mean_reaction_rates")),
            "final_max_temperature": final_max,
            "elapsed_time": results.get("elapsed_time", 0.0),
            "step_count": int(stats.get("step_count") or results.get("step_count") or 0),
        }
        
        # Try to generate a plot
        try:
            plot_results(results)
            simulation_results[simulation_id]["plot_path"] = f'outputs/{simulation_id}_results.png'
        except Exception as e:
            simulation_results[simulation_id]["message"] = f"Simulation completed but plot generation failed: {str(e)}"
        
    except Exception as e:
        # Update simulation status to failed
        simulation_results[simulation_id]["status"] = "failed"
        simulation_results[simulation_id]["error"] = str(e)
        simulation_results[simulation_id]["message"] = f"Simulation failed: {str(e)}"
    finally:
        release_heavy_slot_sync()


@router.post("/simulations", response_model=SimulationResponse)
async def start_simulation(
    params: SimulationRequest,
    background_tasks: BackgroundTasks
):
    """
    Start a new multi-physics coupled simulation.
    
    The simulation will run in the background and the results can be
    retrieved later using the returned simulation ID.
    """
    # Share the process-wide heavy slot with async compute_guard paths so
    # BackgroundTasks cannot stack on top of unified/theory heavy POSTs.
    if not try_acquire_heavy_slot_sync(timeout=0):
        raise HTTPException(
            status_code=503,
            detail="The simulation service is busy. Please retry in a few seconds.",
            headers={"Retry-After": str(int(max(1.0, settings.HEAVY_SLOT_WAIT_SECONDS)))},
        )
    _evict_finished_simulations()

    # Generate a unique ID for this simulation
    simulation_id = str(uuid.uuid4())
    
    # Calculate estimated duration (very rough estimate)
    estimated_steps = params.simulation_time / params.time_step
    estimated_duration = estimated_steps * 0.001  # Assuming ~1000 steps per second
    
    # Store initial simulation info
    simulation_results[simulation_id] = {
        "id": simulation_id,
        "status": "pending",
        "params": params.dict(),
        "created_at": datetime.now().isoformat(),
        "message": "Simulation queued",
        "current_time": 0.0,
        "progress": 0.0
    }
    
    # Start the simulation in the background (releases slot in finally)
    background_tasks.add_task(run_simulation_task, simulation_id, params)
    
    return SimulationResponse(
        simulation_id=simulation_id,
        status="pending",
        message="Simulation started in the background",
        estimated_duration=estimated_duration
    )


@router.get("/simulations/{simulation_id}/status", response_model=SimulationStatus)
async def get_simulation_status(simulation_id: str):
    """
    Get the status of a running simulation.
    """
    if simulation_id not in simulation_results:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulation = simulation_results[simulation_id]
    
    # Calculate progress
    progress = 0.0
    current_time = 0.0
    
    if simulation["status"] == "running":
        # If running, estimate progress based on elapsed time
        elapsed = time.time() - simulation.get("start_time", time.time())
        params = simulation["params"]
        estimated_duration = params["simulation_time"] / params["time_step"] * 0.001
        progress = min(95.0, (elapsed / estimated_duration) * 100.0)
        current_time = params["simulation_time"] * (progress / 100.0)
    elif simulation["status"] == "completed":
        progress = 100.0
        current_time = simulation["params"]["simulation_time"]
    
    return SimulationStatus(
        simulation_id=simulation_id,
        status=simulation["status"],
        progress=progress,
        current_time=current_time,
        message=simulation.get("message")
    )


@router.get("/simulations/{simulation_id}/results", response_model=SimulationResults)
async def get_simulation_results(simulation_id: str):
    """
    Get the results of a completed simulation.
    """
    if simulation_id not in simulation_results:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulation = simulation_results[simulation_id]
    
    if simulation["status"] != "completed":
        raise HTTPException(
            status_code=400, 
            detail=f"Simulation results not available (status: {simulation['status']})"
        )
    
    if "results" not in simulation:
        raise HTTPException(status_code=500, detail="Simulation results missing")
    
    results = simulation["results"]
    
    return SimulationResults(
        simulation_id=simulation_id,
        status=simulation["status"],
        times=results["times"],
        max_temperatures=results["max_temperatures"],
        mean_reaction_rates=results["mean_reaction_rates"],
        final_max_temperature=results["final_max_temperature"],
        elapsed_time=results["elapsed_time"],
        step_count=results["step_count"]
    )


@router.get("/simulations", response_model=List[SimulationStatus])
async def list_simulations():
    """
    List all simulations with their current status.
    """
    result = []
    
    for sim_id, simulation in simulation_results.items():
        # Calculate progress
        progress = 0.0
        current_time = 0.0
        
        if simulation["status"] == "running":
            # If running, estimate progress based on elapsed time
            elapsed = time.time() - simulation.get("start_time", time.time())
            params = simulation["params"]
            estimated_duration = params["simulation_time"] / params["time_step"] * 0.001
            progress = min(95.0, (elapsed / estimated_duration) * 100.0)
            current_time = params["simulation_time"] * (progress / 100.0)
        elif simulation["status"] == "completed":
            progress = 100.0
            current_time = simulation["params"]["simulation_time"]
        
        result.append(SimulationStatus(
            simulation_id=sim_id,
            status=simulation["status"],
            progress=progress,
            current_time=current_time,
            message=simulation.get("message")
        ))
    
    return result


@router.delete("/simulations/{simulation_id}")
async def delete_simulation(simulation_id: str):
    """
    Delete a simulation and its results.
    """
    if simulation_id not in simulation_results:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    # Check if the simulation has a plot file
    if "plot_path" in simulation_results[simulation_id]:
        try:
            plot_path = simulation_results[simulation_id]["plot_path"]
            if os.path.exists(plot_path):
                os.remove(plot_path)
        except Exception:
            pass
    
    # Delete the simulation results
    del simulation_results[simulation_id]
    
    return {"status": "success", "message": f"Simulation {simulation_id} deleted"}
