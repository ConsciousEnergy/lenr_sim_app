"""
Fitting API routes for LENR_Sim_App
"""

import time
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import Optional, List, Dict, Any
import json
import pandas as pd
import numpy as np
import io
from scipy.optimize import minimize
from scipy.interpolate import interp1d

from app.models.fitting import (
    ExperimentalDataSet,
    ExperimentalDataPoint,
    FittingParams,
    FittingResult
)

# Import physics modules
from app.physics.fitting_module import fit_experimental_data
from app.physics.tunneling_engine import simulate_tunneling
from app.physics.potential_models import simulate_thermal

# Import logging
from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("fitting_routes", "logs/fitting.log")

router = APIRouter()

@router.post("/experimental", response_model=FittingResult)
async def fit_experimental(
    data: ExperimentalDataSet,
    params: FittingParams
):
    """
    Fit model parameters to experimental temperature vs. power data provided as JSON
    """
    if not data.data:
        raise HTTPException(status_code=400, detail="No experimental data points provided")
    
    logger.info(f"Fitting request received with {len(data.data)} data points, model={params.model}")
    
    start_time = time.time()
    
    try:
        # Call physics engine for fitting
        result = fit_experimental_data(
            experimental_data=data.data,
            model=params.model,
            fixed_params=params.fixed_params,
            bounds=params.bounds
        )
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # ms
        
        # Add metadata
        result["metadata"]["calculation_time_ms"] = processing_time
        result["metadata"]["data_points"] = len(data.data)
        
        logger.info(f"Fitting completed in {processing_time:.2f}ms with r_squared={result['goodness_of_fit'].get('r_squared', 'N/A')}")
        return result
    
    except Exception as e:
        logger.error(f"Error in experimental data fitting: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Fitting error: {str(e)}")

@router.post("/csv-upload", response_model=FittingResult)
async def fit_csv_data(
    file: UploadFile = File(...),
    params_json: str = Form(...),
):
    """
    Upload CSV file with temperature and power data, then fit model parameters
    
    CSV format should have Temperature and Power columns
    """
    # Parse fitting parameters
    try:
        params = FittingParams.model_validate(json.loads(params_json))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid parameters JSON: {str(e)}")
    
    # Read CSV file
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Validate CSV format
        required_columns = ['Temperature', 'Power']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(
                status_code=400, 
                detail=f"CSV must contain columns: {', '.join(required_columns)}"
            )
        
        # Convert to data points
        data_points = [
            ExperimentalDataPoint(temperature=row['Temperature'], power=row['Power'])
            for _, row in df.iterrows()
        ]
        
        dataset = ExperimentalDataSet(
            data=data_points,
            metadata={"filename": file.filename}
        )
        
        logger.info(f"CSV upload: {file.filename} with {len(data_points)} data points")
        
        # Call the fitting endpoint
        return await fit_experimental(dataset, params)
    
    except pd.errors.ParserError:
        raise HTTPException(status_code=400, detail="Invalid CSV format")
    except Exception as e:
        logger.error(f"Error processing CSV upload: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@router.post("/{simulation_type}", response_model=Dict[str, Any])
async def fit_to_simulation(
    simulation_type: str,
    data: Dict[str, Any]
):
    """
    Fit experimental data against a simulation by adjusting simulation parameters.
    
    Args:
        simulation_type: Type of simulation ("tunneling" or "thermal")
        data: Dictionary containing:
            - experimental_data: List of {x, y} points
            - initial_params: Initial simulation parameters
            
    Returns:
        Dictionary containing:
            - optimized_params: Optimized simulation parameters
            - initial_params: Original parameters
            - fitted_simulation: Simulation results with optimized parameters
            - metrics: Goodness of fit metrics
    """
    start_time = time.time()
    
    # Extract data
    experimental_data = data.get("experimental_data")
    initial_params = data.get("initial_params")
    
    if not experimental_data or not initial_params:
        raise HTTPException(status_code=400, detail="Missing experimental_data or initial_params")
    
    # Convert to numpy arrays for optimization
    x_exp = np.array([point["x"] for point in experimental_data])
    y_exp = np.array([point["y"] for point in experimental_data])
    
    logger.info(f"Fitting {len(experimental_data)} experimental points against {simulation_type} simulation")
    
    try:
        # Different handling based on simulation type
        if simulation_type == "tunneling":
            # Parameters that can be optimized
            param_keys = ["barrier_width", "barrier_height", "mass"]
            initial_values = [initial_params.get(key, 1.0) for key in param_keys]
            
            # Define the objective function to minimize
            def objective(params):
                # Create parameter dictionary for simulation
                sim_params = initial_params.copy()
                for i, key in enumerate(param_keys):
                    sim_params[key] = params[i]
                
                # Run simulation
                result = simulate_tunneling(sim_params)
                
                # Get simulation data
                if "energy_levels" in result:
                    sim_data = result["energy_levels"]
                    x_sim = np.array([point["time"] for point in sim_data])
                    y_sim = np.array([point["energy"] for point in sim_data])
                else:
                    return float('inf')  # Return large value if simulation fails
                
                # Interpolate simulation data to match experimental x values
                if len(x_sim) < 2:
                    return float('inf')
                
                interp_func = interp1d(x_sim, y_sim, bounds_error=False, fill_value="extrapolate")
                y_sim_interp = interp_func(x_exp)
                
                # Calculate sum of squared errors
                mask = ~np.isnan(y_sim_interp)
                if not np.any(mask):
                    return float('inf')
                
                sse = np.sum((y_exp[mask] - y_sim_interp[mask])**2)
                return sse
            
            # Define bounds to prevent unreasonable values
            lower_bounds = [initial_values[i] * 0.5 for i in range(len(initial_values))]
            upper_bounds = [initial_values[i] * 2.0 for i in range(len(initial_values))]
            bounds = list(zip(lower_bounds, upper_bounds))
            
            # Optimize parameters
            result = minimize(
                objective,
                initial_values,
                method="L-BFGS-B",
                bounds=bounds,
                options={"maxiter": 50}
            )
            
            # Get optimized parameters
            optimized_params = {}
            for i, key in enumerate(param_keys):
                optimized_params[key] = result.x[i]
            
            # Calculate fit metrics and generate simulation with optimized parameters
            sim_params = initial_params.copy()
            sim_params.update(optimized_params)
            
            # Run final simulation with optimized parameters
            sim_result = simulate_tunneling(sim_params)
            sim_data = sim_result.get("energy_levels", [])
            
            # Calculate metrics
            x_sim = np.array([point["time"] for point in sim_data])
            y_sim = np.array([point["energy"] for point in sim_data])
            
            # Prepare output
            fitted_simulation = [{"x": float(x), "y": float(y)} for x, y in zip(x_sim, y_sim)]
            
            # Calculate metrics - R-squared, RMSE, etc.
            interp_func = interp1d(x_sim, y_sim, bounds_error=False, fill_value="extrapolate")
            y_sim_interp = interp_func(x_exp)
            mask = ~np.isnan(y_sim_interp)
            
            if np.any(mask):
                # Calculate metrics
                ss_res = np.sum((y_exp[mask] - y_sim_interp[mask])**2)
                ss_tot = np.sum((y_exp[mask] - np.mean(y_exp[mask]))**2)
                r_squared = 1 - (ss_res / ss_tot)
                rmse = np.sqrt(np.mean((y_exp[mask] - y_sim_interp[mask])**2))
                mae = np.mean(np.abs(y_exp[mask] - y_sim_interp[mask]))
                
                metrics = {
                    "r_squared": float(r_squared),
                    "rmse": float(rmse),
                    "mean_absolute_error": float(mae),
                    "data_points_compared": int(np.sum(mask))
                }
            else:
                metrics = {
                    "r_squared": 0,
                    "rmse": float('inf'),
                    "mean_absolute_error": float('inf'),
                    "data_points_compared": 0
                }
            
        elif simulation_type == "thermal":
            # Parameters that can be optimized
            param_keys = ["activation_energy", "temperature", "prefactor"]
            initial_values = [initial_params.get(key, 1.0) for key in param_keys]
            
            # Similar optimization logic as above, but for thermal simulation
            # Define the objective function to minimize
            def objective(params):
                # Create parameter dictionary for simulation
                sim_params = initial_params.copy()
                for i, key in enumerate(param_keys):
                    sim_params[key] = params[i]
                
                # Run simulation
                result = simulate_thermal(sim_params)
                
                # Get simulation data
                if "results" in result:
                    sim_data = result["results"]
                    x_sim = np.array([point["x"] for point in sim_data])
                    y_sim = np.array([point["y"] for point in sim_data])
                else:
                    return float('inf')  # Return large value if simulation fails
                
                # Interpolate simulation data to match experimental x values
                if len(x_sim) < 2:
                    return float('inf')
                
                interp_func = interp1d(x_sim, y_sim, bounds_error=False, fill_value="extrapolate")
                y_sim_interp = interp_func(x_exp)
                
                # Calculate sum of squared errors
                mask = ~np.isnan(y_sim_interp)
                if not np.any(mask):
                    return float('inf')
                
                sse = np.sum((y_exp[mask] - y_sim_interp[mask])**2)
                return sse
            
            # Define bounds to prevent unreasonable values
            lower_bounds = [initial_values[i] * 0.5 for i in range(len(initial_values))]
            upper_bounds = [initial_values[i] * 2.0 for i in range(len(initial_values))]
            bounds = list(zip(lower_bounds, upper_bounds))
            
            # Optimize parameters
            result = minimize(
                objective,
                initial_values,
                method="L-BFGS-B",
                bounds=bounds,
                options={"maxiter": 50}
            )
            
            # Get optimized parameters
            optimized_params = {}
            for i, key in enumerate(param_keys):
                optimized_params[key] = result.x[i]
            
            # Calculate fit metrics and generate simulation with optimized parameters
            sim_params = initial_params.copy()
            sim_params.update(optimized_params)
            
            # Run final simulation with optimized parameters
            sim_result = simulate_thermal(sim_params)
            sim_data = sim_result.get("results", [])
            
            # Calculate metrics
            x_sim = np.array([point["x"] for point in sim_data])
            y_sim = np.array([point["y"] for point in sim_data])
            
            # Prepare output
            fitted_simulation = [{"x": float(x), "y": float(y)} for x, y in zip(x_sim, y_sim)]
            
            # Calculate metrics - R-squared, RMSE, etc.
            interp_func = interp1d(x_sim, y_sim, bounds_error=False, fill_value="extrapolate")
            y_sim_interp = interp_func(x_exp)
            mask = ~np.isnan(y_sim_interp)
            
            if np.any(mask):
                # Calculate metrics
                ss_res = np.sum((y_exp[mask] - y_sim_interp[mask])**2)
                ss_tot = np.sum((y_exp[mask] - np.mean(y_exp[mask]))**2)
                r_squared = 1 - (ss_res / ss_tot)
                rmse = np.sqrt(np.mean((y_exp[mask] - y_sim_interp[mask])**2))
                mae = np.mean(np.abs(y_exp[mask] - y_sim_interp[mask]))
                
                metrics = {
                    "r_squared": float(r_squared),
                    "rmse": float(rmse),
                    "mean_absolute_error": float(mae),
                    "data_points_compared": int(np.sum(mask))
                }
            else:
                metrics = {
                    "r_squared": 0,
                    "rmse": float('inf'),
                    "mean_absolute_error": float('inf'),
                    "data_points_compared": 0
                }
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported simulation type: {simulation_type}")
        
        # Calculation time
        calculation_time = (time.time() - start_time) * 1000  # ms
        
        # Prepare response
        response = {
            "optimized_params": optimized_params,
            "initial_params": initial_params,
            "fitted_simulation": fitted_simulation,
            "metrics": metrics,
            "metadata": {
                "calculation_time_ms": calculation_time,
                "simulation_type": simulation_type,
                "optimization_success": bool(result.success),
                "optimization_message": str(result.message)
            }
        }
        
        logger.info(f"Fitting completed in {calculation_time:.2f}ms with r_squared={metrics['r_squared']}")
        return response
        
    except Exception as e:
        logger.error(f"Error in simulation fitting: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Fitting error: {str(e)}") 