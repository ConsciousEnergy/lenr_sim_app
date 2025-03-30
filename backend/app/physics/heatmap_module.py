"""
Heatmap generation module for LENR_Sim_App

Generates 2D parameter sweeps to visualize tunneling probability
landscapes as a function of various parameters
"""

import numpy as np
from typing import Dict, List, Any, Literal
import time

from app.physics.tunneling_engine import calculate_thermal_tunneling, PotentialParameters
from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("heatmap", "logs/app.log")

def generate_heatmap(
    T_min: float,
    T_max: float,
    lambda_min: float,
    lambda_max: float,
    r0: float,
    k_spring: float,
    potential_type: Literal["harmonic", "morse"],
    resolution: int = 20
) -> Dict[str, Any]:
    """
    Generate a 2D heatmap of tunneling probability vs temperature and lambda
    
    Args:
        T_min: Minimum temperature in Kelvin
        T_max: Maximum temperature in Kelvin
        lambda_min: Minimum tunneling parameter in meters
        lambda_max: Maximum tunneling parameter in meters
        r0: Equilibrium separation in meters
        k_spring: Spring constant in N/m
        potential_type: Type of potential model
        resolution: Grid resolution for each dimension
        
    Returns:
        Dictionary with grid values and axis data
    """
    # Create parameter grids
    T_values = np.linspace(T_min, T_max, resolution)
    lambda_values = np.linspace(lambda_min, lambda_max, resolution)
    
    # Initialize the result grid
    grid_values = np.zeros((resolution, resolution))
    
    # Track computation time
    start_time = time.time()
    
    # Create base parameters for the potential model
    base_params = PotentialParameters(
        r0=r0,
        k_spring=k_spring,
        potential_type=potential_type
    )
    
    # Loop through parameter space
    for i, T in enumerate(T_values):
        for j, lambda_param in enumerate(lambda_values):
            # Calculate tunneling probability at this point
            result = calculate_thermal_tunneling(
                T=T,
                lambda_param=lambda_param,
                r0=r0,
                k_spring=k_spring,
                potential_type=potential_type
            )
            
            # Store the probability
            grid_values[i, j] = result["probability"]
            
    # Total computation time
    computation_time = time.time() - start_time
    
    # Apply log scale for better visualization (probabilities can span many orders of magnitude)
    # Replace zeros with minimum non-zero value to avoid log(0)
    min_nonzero = np.min(grid_values[grid_values > 0]) if np.any(grid_values > 0) else 1e-30
    grid_values_safe = np.maximum(grid_values, min_nonzero)
    log_grid = np.log10(grid_values_safe)
    
    # Prepare result
    result = {
        "grid_values": log_grid.tolist(),  # Convert to list for JSON serialization
        "x_values": lambda_values.tolist(),
        "y_values": T_values.tolist(),
        "x_label": "Lambda (m)",
        "y_label": "Temperature (K)",
        "metadata": {
            "computation_time_s": computation_time,
            "resolution": resolution,
            "potential_type": potential_type,
            "r0": r0,
            "k_spring": k_spring,
            "log_scale": True
        }
    }
    
    logger.info(f"Generated heatmap with {resolution}x{resolution} points in {computation_time:.2f}s")
    return result 