"""
Simulation API routes for LENR_Sim_App
"""

import time
import uuid
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from typing import Dict, List, Any

from app.models.simulation import (
    ThermalSimulationParams,
    ImpactSimulationParams,
    HeatmapParams,
    ClusterParams,
    TunnelingResult,
    HeatmapResult,
    ClusterVisualizationResult
)

# Import physics modules (will be implemented)
from app.physics.tunneling_engine import calculate_thermal_tunneling, calculate_impact_tunneling
from app.physics.heatmap_module import generate_heatmap
from app.visualization.cluster_vtk import generate_cluster_vtk

# Import logging
from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("simulation_routes", "logs/app.log")

router = APIRouter()

@router.post("/thermal", response_model=TunnelingResult)
async def simulate_thermal_tunneling(params: ThermalSimulationParams):
    """
    Calculate thermal (Boltzmann-averaged) quantum tunneling probability
    """
    logger.info(f"Thermal tunneling simulation request with T={params.T}K, lambda={params.lambda_param}m")
    
    start_time = time.time()
    
    try:
        # Call physics engine for calculation
        result = calculate_thermal_tunneling(
            T=params.T,
            lambda_param=params.lambda_param,
            r0=params.r0,
            k_spring=params.k_spring,
            potential_type=params.potential
        )
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # ms
        
        # Add metadata
        result["metadata"]["calculation_time_ms"] = processing_time
        result["input_params"] = params.model_dump(by_alias=True)
        
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
        result["input_params"] = params.model_dump(by_alias=True)
        
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