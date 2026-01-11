"""
Simulation API routes for LENR_Sim_App
"""

import time
import uuid
import math
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, status, Body, Query
from typing import Dict, List, Any, Optional, Tuple
import json
import hashlib
import random
from pydantic import BaseModel, Field

from app.models.simulation import (
    ThermalSimulationParams,
    ImpactSimulationParams,
    HeatmapParams,
    ClusterParams,
    TunnelingResult,
    HeatmapResult,
    ClusterVisualizationResult,
    SimulationControlResult,
    LatticeSimulationParams,
    EnhancedFusionParams,
    EnhancedFusionRequest,
    EnhancedFusionResponse,
    SimulationRequest,
    SimulationResponse,
    HAS_PYDANTIC_V2,
)

# Import physics modules (will be implemented)
from app.physics.tunneling_engine import calculate_thermal_tunneling, calculate_impact_tunneling
from app.physics.heatmap_module import generate_heatmap
from app.visualization.cluster_vtk import generate_cluster_vtk
from app.physics.lattice_simulator import start_simulation, stop_simulation, reset_simulation, get_simulation_data
from app.physics.potential_models import PotentialParameters
from app.physics.enhanced_fusion import (
    calculate_total_fusion_enhancement,
    evaluate_fusion_scenario,
)
from app.physics.models import FusionEnhancementFactors

# Import logging
from app.utils.logging import setup_logger, get_logger

# Set up logger
logger = setup_logger("simulation_routes", "logs/app.log")

router = APIRouter()

# Dictionary to track active simulations
active_simulations = {}

# Simple cache for enhanced fusion calculations
_fusion_cache = {}
MAX_CACHE_SIZE = 100

# Utility function to handle model dumping for both Pydantic v1 and v2
def get_model_dict(model, by_alias=True):
    """Get model as dict compatible with both Pydantic v1 and v2"""
    if HAS_PYDANTIC_V2:
        return model.model_dump(by_alias=by_alias)
    else:
        return model.dict(by_alias=by_alias)

@router.post("/thermal", response_model=TunnelingResult)
async def simulate_thermal_tunneling(params: ThermalSimulationParams):
    """
    Calculate thermal (Boltzmann-averaged) quantum tunneling probability
    """
    logger.info(f"Thermal tunneling simulation request with T={params.T}K, lambda={params.lambda_param}m")
    
    start_time = time.time()
    
    try:
        # Create PotentialParameters object with the parameters
        potential_params = PotentialParameters(
            model_type=params.potential,
            equilibrium_position=params.r0,
            spring_constant=params.k_spring,
            T=params.T,
            lambda_param=params.lambda_param
        )
        
        # Call physics engine for calculation with the new signature
        result = calculate_thermal_tunneling(params=potential_params)
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # ms
        
        # Add metadata
        result["metadata"]["calculation_time_ms"] = processing_time
        result["input_params"] = get_model_dict(params, by_alias=True)
        
        logger.info(f"Thermal tunneling calculation completed in {processing_time:.2f}ms")
        return result
    
    except Exception as e:
        logger.error(f"Error in thermal tunneling calculation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")

@router.post("/impact", response_model=TunnelingResult)
async def simulate_impact_tunneling(params: ImpactSimulationParams):
    """
    Calculate impact energy (high-temperature) tunneling probability
    """
    logger.info(f"Impact tunneling simulation request with T_impact={params.T_impact}K")
    
    start_time = time.time()
    
    try:
        # Call physics engine for calculation
        result = calculate_impact_tunneling(
            T_impact=params.T_impact,
            lambda_param=params.lambda_param,
            r0=params.r0,
            k_spring=params.k_spring,
            potential_type=params.potential,
            impact_duration=params.impact_duration
        )
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # ms
        
        # Add metadata
        result["metadata"]["calculation_time_ms"] = processing_time
        result["input_params"] = get_model_dict(params, by_alias=True)
        
        logger.info(f"Impact tunneling calculation completed in {processing_time:.2f}ms")
        return result
    
    except Exception as e:
        logger.error(f"Error in impact tunneling calculation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")

@router.post("/heatmap", response_model=HeatmapResult)
async def generate_tunneling_heatmap(params: HeatmapParams, background_tasks: BackgroundTasks):
    """
    Generate 2D heatmap of tunneling probability vs temperature and lambda
    
    This can be a computationally intensive task, so we use background tasks for large calculations
    """
    logger.info(f"Heatmap generation request with resolution={params.resolution}")
    
    # If high resolution, warn about computation time
    if params.resolution > 50:
        logger.warning(f"High resolution heatmap requested: {params.resolution}x{params.resolution}")
    
    start_time = time.time()
    
    try:
        # Call physics engine for heatmap generation
        result = generate_heatmap(
            T_min=params.T_min,
            T_max=params.T_max,
            lambda_min=params.lambda_min,
            lambda_max=params.lambda_max,
            r0=params.r0,
            k_spring=params.k_spring,
            potential_type=params.potential,
            resolution=params.resolution
        )
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # ms
        
        # Add metadata
        result["metadata"]["calculation_time_ms"] = processing_time
        result["metadata"]["resolution"] = params.resolution
        
        logger.info(f"Heatmap generation completed in {processing_time:.2f}ms")
        return result
    
    except Exception as e:
        logger.error(f"Error in heatmap generation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")

@router.post("/cluster", response_model=ClusterVisualizationResult)
async def visualize_cluster(params: ClusterParams):
    """
    Generate 3D visualization data for a particle cluster
    """
    logger.info(f"Cluster visualization request with {params.num_particles} particles")
    
    start_time = time.time()
    
    try:
        # Generate unique ID for this visualization
        viz_id = str(uuid.uuid4())
        
        # File paths for output
        vtk_file_path = f"static/cluster_fields/cluster_{viz_id}.vtk"
        json_file_path = f"static/cluster_fields/cluster_{viz_id}.json"
        
        # Call visualization engine
        result = generate_cluster_vtk(
            num_particles=params.num_particles,
            charge=params.charge,
            cluster_radius=params.cluster_radius,
            grid_resolution=params.grid_resolution,
            vtk_file_path=vtk_file_path,
            json_file_path=json_file_path
        )
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # ms
        
        # Add metadata
        result["metadata"]["calculation_time_ms"] = processing_time
        result["metadata"]["grid_resolution"] = params.grid_resolution
        
        # Set file URLs
        result["vtk_file_url"] = f"/{vtk_file_path}"
        result["json_data_url"] = f"/{json_file_path}"
        
        logger.info(f"Cluster visualization completed in {processing_time:.2f}ms")
        return result
    
    except Exception as e:
        logger.error(f"Error in cluster visualization: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Visualization error: {str(e)}")

@router.post("/start", response_model=SimulationControlResult)
async def start_lattice_simulation(params: LatticeSimulationParams, background_tasks: BackgroundTasks):
    """
    Start a lattice simulation with the given parameters
    
    This runs the simulation in the background and returns a simulation ID that can be used to fetch results
    """
    try:
        logger.info(f"Starting lattice simulation with lattice size: {params.lattice_size}")
        
        # Generate a unique ID for this simulation
        sim_id = str(uuid.uuid4())
        
        # Start the simulation in the background
        background_tasks.add_task(
            start_simulation,
            sim_id=sim_id,
            lattice_size=params.lattice_size,
            temperature=params.temperature,
            potential_type=params.potential_type,
            spring_constant=params.spring_constant
        )
        
        # Record the simulation in our active simulations dictionary
        active_simulations[sim_id] = {
            "status": "running",
            "start_time": time.time(),
            "params": get_model_dict(params)
        }
        
        result = {
            "simulation_id": sim_id,
            "status": "started",
            "message": "Simulation started successfully",
            "metadata": {
                "start_time": time.time()
            }
        }
        
        logger.info(f"Lattice simulation {sim_id} started successfully")
        return result
        
    except Exception as e:
        logger.error(f"Error starting lattice simulation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")

@router.post("/stop/{simulation_id}", response_model=SimulationControlResult)
async def stop_lattice_simulation(simulation_id: str):
    """
    Stop a running lattice simulation
    """
    try:
        if simulation_id not in active_simulations:
            logger.warning(f"Attempt to stop non-existent simulation: {simulation_id}")
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        logger.info(f"Stopping lattice simulation: {simulation_id}")
        
        # Call the physics engine to stop the simulation
        stop_simulation(sim_id=simulation_id)
        
        # Update the simulation status
        active_simulations[simulation_id]["status"] = "stopped"
        active_simulations[simulation_id]["end_time"] = time.time()
        
        result = {
            "simulation_id": simulation_id,
            "status": "stopped",
            "message": "Simulation stopped successfully",
            "metadata": {
                "end_time": time.time(),
                "duration": time.time() - active_simulations[simulation_id]["start_time"]
            }
        }
        
        logger.info(f"Lattice simulation {simulation_id} stopped successfully")
        return result
        
    except Exception as e:
        logger.error(f"Error stopping lattice simulation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")

@router.post("/reset/{simulation_id}", response_model=SimulationControlResult)
async def reset_lattice_simulation(simulation_id: str):
    """
    Reset a lattice simulation to its initial state
    """
    try:
        if simulation_id not in active_simulations:
            logger.warning(f"Attempt to reset non-existent simulation: {simulation_id}")
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        logger.info(f"Resetting lattice simulation: {simulation_id}")
        
        # Call the physics engine to reset the simulation
        reset_simulation(sim_id=simulation_id)
        
        # Update the simulation status
        active_simulations[simulation_id]["status"] = "reset"
        active_simulations[simulation_id]["reset_time"] = time.time()
        
        result = {
            "simulation_id": simulation_id,
            "status": "reset",
            "message": "Simulation reset successfully",
            "metadata": {
                "reset_time": time.time()
            }
        }
        
        logger.info(f"Lattice simulation {simulation_id} reset successfully")
        return result
        
    except Exception as e:
        logger.error(f"Error resetting lattice simulation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")

@router.get("/status/{simulation_id}", response_model=SimulationControlResult)
async def get_simulation_status(simulation_id: str):
    """
    Get the current status of a simulation
    """
    try:
        if simulation_id not in active_simulations:
            logger.warning(f"Status request for non-existent simulation: {simulation_id}")
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        sim_data = active_simulations[simulation_id]
        
        result = {
            "simulation_id": simulation_id,
            "status": sim_data["status"],
            "message": f"Simulation is {sim_data['status']}",
            "metadata": {
                "start_time": sim_data["start_time"],
                "elapsed_time": time.time() - sim_data["start_time"]
            }
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting simulation status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Status error: {str(e)}")

@router.get("/data/{simulation_id}")
async def get_lattice_data(simulation_id: str):
    """
    Get the current data for a lattice simulation
    
    This includes atom positions, types, and energy data
    """
    try:
        if simulation_id not in active_simulations:
            logger.warning(f"Data request for non-existent simulation: {simulation_id}")
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        logger.info(f"Getting data for simulation: {simulation_id}")
        
        # Get the simulation data from the physics engine
        sim_data = get_simulation_data(sim_id=simulation_id)
        
        if sim_data is None:
            raise HTTPException(status_code=500, detail="Failed to get simulation data")
        
        # Add API metadata
        sim_data["metadata"] = {
            "request_time": time.time(),
            "api_version": "1.0.0"
        }
        
        return sim_data
        
    except Exception as e:
        logger.error(f"Error getting simulation data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Data error: {str(e)}")

@router.post("/enhanced-fusion", response_model=Dict[str, Any])
async def get_enhanced_fusion(request: EnhancedFusionParams = Body(...)):
    """
    Calculate enhanced fusion rates and enhancement factors
    
    Args:
        request: EnhancedFusionParams object with parameters
        
    Returns:
        Dict with enhancement factors and calculated rates
    """
    # Create a cache key based on input parameters
    cache_key = f"{request.metal}:{request.site_occupation}:{request.temperature}:{request.include_resonance}:{request.include_quantum}"
    cache_key = hashlib.md5(cache_key.encode()).hexdigest()
    
    # Check if result is in cache
    if cache_key in _fusion_cache:
        logger.info(f"Cache hit for enhanced fusion calculation: {request.metal}, {request.site_occupation}")
        return _fusion_cache[cache_key]
    
    start_time = time.time()
    
    try:
        logger.info(f"Calculating enhanced fusion for {request.metal} with {request.site_occupation} site")
        
        # Calculate the enhancement factors and fusion rates
        result = evaluate_fusion_scenario(
            metal=request.metal,
            site_type=request.site_occupation,
            temperature=request.temperature,
            include_resonance=request.include_resonance,
            include_quantum=request.include_quantum
        )
        
        # Validate the result type
        if not isinstance(result, dict):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Invalid result type from fusion calculation"
            )
        
        # Ensure all required fields are present
        required_fields = ["enhancement_factors", "enhanced_rate", "is_observable"]
        missing_fields = [field for field in required_fields if field not in result]
        if missing_fields:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Missing required fields in fusion calculation: {', '.join(missing_fields)}"
            )
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Add metadata to the result
        result["metadata"] = {
            "processing_time_ms": round(processing_time * 1000, 2),
            "input_parameters": {
                "metal": request.metal,
                "site_occupation": request.site_occupation,
                "temperature": request.temperature,
                "include_resonance": request.include_resonance,
                "include_quantum": request.include_quantum
            }
        }
        
        # Get enhancement factors for response
        enhancement_factors = result.get("enhancement_factors", {})
        if isinstance(enhancement_factors, FusionEnhancementFactors):
            enhancement_factors = enhancement_factors.to_dict()
        
        # Generate a summary of the enhancement factors
        try:
            # Check if fusion is observable
            is_observable = result.get("is_observable", False)
            
            summary = f"Enhanced fusion calculation for {request.metal} with {request.site_occupation} sites at {request.temperature}K: "
            
            if is_observable:
                summary += "Observable fusion rate achieved. "
                enhanced_rate = result.get("enhanced_rate", 0)
                if enhanced_rate > 0:
                    summary += f"Enhanced rate: {enhanced_rate:.2e} per second per pair. "
            else:
                summary += "Fusion rate below observable threshold. "
            
            # Add key enhancement factors to summary
            total_enhancement = enhancement_factors.get("total_enhancement", 1.0)
            if total_enhancement > 1.0:
                summary += f"Total enhancement: {total_enhancement:.2e} ({enhancement_factors.get('log_enhancement', 0):.1f} orders of magnitude)"
            
            result["summary"] = summary
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            result["summary"] = "Enhanced fusion calculation completed"
        
        # Store in cache (with size limiting)
        if len(_fusion_cache) >= MAX_CACHE_SIZE:
            # Remove a random key to prevent memory issues
            random_key = random.choice(list(_fusion_cache.keys()))
            _fusion_cache.pop(random_key)
            
        _fusion_cache[cache_key] = result
        
        return result
    except Exception as e:
        logger.error(f"Error calculating enhanced fusion: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating enhanced fusion: {str(e)}"
        ) 