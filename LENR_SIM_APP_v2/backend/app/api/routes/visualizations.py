"""
Visualization API routes for the LENR Simulation App.

This module provides endpoints for generating visualizations of simulation results.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from app.visualization.lenr_plots import (
    generate_reaction_rate_plot,
    generate_potential_plot,
    generate_enhancement_factors_plot,
    generate_parameter_sensitivity_plot,
    generate_multiple_plots
)
import logging
from app.utils.logging import setup_logger
from app.core.config import get_settings
from app.services.simulation_service import SimulationService
from app.physics.models import FusionReaction
from app.api.dependencies.simulation import get_simulation_service
from pydantic import BaseModel

# Set up logger
logger = setup_logger("visualization_api", "logs/api.log")

# Create router
router = APIRouter(prefix="/visualizations", tags=["Visualizations"])

# Response models
class VisualizationResponse(BaseModel):
    """Response model for visualization endpoints"""
    image_data: str
    content_type: str = "image/png;base64"
    title: Optional[str] = None
    
class MultipleVisualizationsResponse(BaseModel):
    """Response model for multiple visualizations endpoint"""
    plots: Dict[str, str]
    content_type: str = "image/png;base64"

@router.get("/reaction-rate/{simulation_id}", response_model=VisualizationResponse)
async def get_reaction_rate_plot(
    simulation_id: str,
    log_scale: bool = True,
    include_base_probability: bool = False,
    include_enhancement: bool = True,
    include_power: bool = True,
    simulation_service: SimulationService = Depends(get_simulation_service)
):
    """
    Generate a reaction rate plot for a given simulation.
    
    Args:
        simulation_id: ID of the simulation to plot
        log_scale: Whether to use logarithmic scales
        include_base_probability: Whether to include base tunneling probability
        include_enhancement: Whether to include enhancement factor
        include_power: Whether to include power density
    
    Returns:
        Base64-encoded PNG image data
    """
    # Get simulation results
    try:
        simulation_result = await simulation_service.get_simulation_by_id(simulation_id)
    except Exception as e:
        logger.error(f"Error retrieving simulation {simulation_id}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Simulation not found: {simulation_id}")
    
    # Check if this is an energy scan result
    if "energy_scan" not in simulation_result:
        raise HTTPException(status_code=400, 
                          detail="Simulation does not contain energy scan data. Use single-energy visualization instead.")
    
    # Generate plot
    try:
        image_data = generate_reaction_rate_plot(
            simulation_result,
            log_scale=log_scale,
            include_base_probability=include_base_probability,
            include_enhancement=include_enhancement,
            include_power=include_power
        )
        
        # Get title from result
        title = f"Reaction Analysis for {simulation_result['reaction_info']['name']}"
        
        return VisualizationResponse(
            image_data=image_data,
            title=title
        )
    except Exception as e:
        logger.error(f"Error generating reaction rate plot: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating plot: {str(e)}")

@router.get("/potential/{simulation_id}", response_model=VisualizationResponse)
async def get_potential_plot(
    simulation_id: str,
    include_components: bool = True,
    simulation_service: SimulationService = Depends(get_simulation_service)
):
    """
    Generate a potential energy plot for a given simulation.
    
    Args:
        simulation_id: ID of the simulation to plot
        include_components: Whether to include component potentials
    
    Returns:
        Base64-encoded PNG image data
    """
    # Get simulation results
    try:
        simulation_result = await simulation_service.get_simulation_by_id(simulation_id)
    except Exception as e:
        logger.error(f"Error retrieving simulation {simulation_id}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Simulation not found: {simulation_id}")
    
    # Extract potential data
    if "potential" not in simulation_result:
        raise HTTPException(status_code=400, detail="Simulation does not contain potential data")
    
    potential_data = simulation_result["potential"]
    
    # Generate plot
    try:
        # Get reaction name if available
        title = None
        if "reaction" in simulation_result:
            title = f"Potential Curves for {simulation_result['reaction']['name']}"
        elif "reaction_info" in simulation_result:
            title = f"Potential Curves for {simulation_result['reaction_info']['name']}"
        
        image_data = generate_potential_plot(
            potential_data,
            title=title,
            include_components=include_components
        )
        
        return VisualizationResponse(
            image_data=image_data,
            title=title
        )
    except Exception as e:
        logger.error(f"Error generating potential plot: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating plot: {str(e)}")

@router.get("/enhancement/{simulation_id}", response_model=VisualizationResponse)
async def get_enhancement_plot(
    simulation_id: str,
    use_log_scale: bool = True,
    simulation_service: SimulationService = Depends(get_simulation_service)
):
    """
    Generate an enhancement factors plot for a given simulation.
    
    Args:
        simulation_id: ID of the simulation to plot
        use_log_scale: Whether to use logarithmic scale for enhancement values
    
    Returns:
        Base64-encoded PNG image data
    """
    # Get simulation results
    try:
        simulation_result = await simulation_service.get_simulation_by_id(simulation_id)
    except Exception as e:
        logger.error(f"Error retrieving simulation {simulation_id}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Simulation not found: {simulation_id}")
    
    # Extract enhancement data
    if "enhancement" not in simulation_result:
        raise HTTPException(status_code=400, detail="Simulation does not contain enhancement data")
    
    enhancement_data = simulation_result["enhancement"]
    
    # Generate plot
    try:
        # Get reaction name if available
        title = None
        if "reaction" in simulation_result:
            title = f"Enhancement Factors for {simulation_result['reaction']['name']}"
        elif "reaction_info" in simulation_result:
            title = f"Enhancement Factors for {simulation_result['reaction_info']['name']}"
        
        image_data = generate_enhancement_factors_plot(
            enhancement_data,
            title=title,
            use_log_scale=use_log_scale
        )
        
        return VisualizationResponse(
            image_data=image_data,
            title=title
        )
    except Exception as e:
        logger.error(f"Error generating enhancement plot: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating plot: {str(e)}")

@router.get("/parameter-sensitivity/{simulation_id}", response_model=VisualizationResponse)
async def get_sensitivity_plot(
    simulation_id: str,
    plot_type: str = "power",
    use_log_scale: bool = True,
    simulation_service: SimulationService = Depends(get_simulation_service)
):
    """
    Generate a parameter sensitivity plot for a given simulation.
    
    Args:
        simulation_id: ID of the simulation to plot
        plot_type: Type of data to plot ("power", "rate", "probability", or "enhancement")
        use_log_scale: Whether to use logarithmic scales
    
    Returns:
        Base64-encoded PNG image data
    """
    # Get simulation results
    try:
        simulation_result = await simulation_service.get_simulation_by_id(simulation_id)
    except Exception as e:
        logger.error(f"Error retrieving simulation {simulation_id}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Simulation not found: {simulation_id}")
    
    # Check if this is a sensitivity analysis result
    if "parameter" not in simulation_result or "results" not in simulation_result:
        raise HTTPException(status_code=400, detail="Simulation does not contain parameter sensitivity data")
    
    # Validate plot_type
    valid_types = ["power", "rate", "probability", "enhancement"]
    if plot_type not in valid_types:
        raise HTTPException(status_code=400, 
                           detail=f"Invalid plot_type. Must be one of: {', '.join(valid_types)}")
    
    # Generate plot
    try:
        image_data = generate_parameter_sensitivity_plot(
            simulation_result,
            plot_type=plot_type,
            use_log_scale=use_log_scale
        )
        
        # Get title from data
        parameter = simulation_result["parameter"].replace("_", " ").title()
        reaction_name = simulation_result["reaction_info"]["name"]
        title = f"{parameter} Sensitivity for {reaction_name}"
        
        return VisualizationResponse(
            image_data=image_data,
            title=title
        )
    except Exception as e:
        logger.error(f"Error generating sensitivity plot: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating plot: {str(e)}")

@router.get("/all/{simulation_id}", response_model=MultipleVisualizationsResponse)
async def get_all_plots(
    simulation_id: str,
    simulation_service: SimulationService = Depends(get_simulation_service)
):
    """
    Generate all applicable plots for a given simulation.
    
    Args:
        simulation_id: ID of the simulation to plot
    
    Returns:
        Dictionary of base64-encoded PNG images
    """
    # Get simulation results
    try:
        simulation_result = await simulation_service.get_simulation_by_id(simulation_id)
    except Exception as e:
        logger.error(f"Error retrieving simulation {simulation_id}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Simulation not found: {simulation_id}")
    
    # Generate plots
    try:
        plots = generate_multiple_plots(simulation_result)
        
        if not plots:
            raise HTTPException(status_code=400, 
                              detail="No applicable plots could be generated for this simulation type")
        
        return MultipleVisualizationsResponse(plots=plots)
    except Exception as e:
        logger.error(f"Error generating plots: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating plots: {str(e)}") 