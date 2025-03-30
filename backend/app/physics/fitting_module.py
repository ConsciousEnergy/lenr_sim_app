"""
Experimental data fitting module for LENR_Sim_App

Fits theoretical models to experimental temperature vs. power data
using optimization techniques.
"""

import numpy as np
from typing import Dict, List, Any, Literal, Optional
from scipy.optimize import curve_fit
import time
from scipy import stats
from scipy.interpolate import interp1d

from app.physics.tunneling_engine import calculate_thermal_tunneling
from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("fitting", "logs/fitting.log")

def tunneling_model(T, lambda_param, r0, k_spring):
    """
    Model function for tunneling-based power output
    
    Args:
        T: Temperature in Kelvin
        lambda_param: Tunneling parameter
        r0: Equilibrium separation
        k_spring: Spring constant
        
    Returns:
        Predicted power output
    """
    # Calculate tunneling probability
    result = calculate_thermal_tunneling(
        T=T,
        lambda_param=lambda_param,
        r0=r0,
        k_spring=k_spring,
        potential_type="harmonic"  # For now, just use harmonic
    )
    
    # Convert probability to power (simplified model)
    # In a real implementation, this would include more physics
    # like fusion energy per event, event rate, etc.
    
    # For now, assume power is proportional to tunneling probability
    power_scale = 1e20  # Scaling factor to convert to watts
    
    return result["probability"] * power_scale

def arrhenius_model(T, A, Ea):
    """
    Arrhenius model for thermally activated processes
    
    Args:
        T: Temperature in Kelvin
        A: Pre-exponential factor
        Ea: Activation energy in eV
        
    Returns:
        Predicted power output
    """
    from scipy.constants import k, e
    
    # Boltzmann constant in eV/K
    kB = k / e
    
    # Arrhenius equation
    power = A * np.exp(-Ea / (kB * T))
    
    return power

def calculate_goodness_of_fit(y_true, y_pred):
    """
    Calculate metrics for goodness of fit
    
    Args:
        y_true: True values
        y_pred: Predicted values
        
    Returns:
        Dictionary with metrics
    """
    # Calculate R^2
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    ss_res = np.sum((y_true - y_pred) ** 2)
    
    r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
    
    # Calculate Root Mean Squared Error (RMSE)
    rmse = np.sqrt(np.mean((y_true - y_pred) ** 2))
    
    # Calculate Mean Absolute Error (MAE)
    mae = np.mean(np.abs(y_true - y_pred))
    
    return {
        "r_squared": float(r_squared),
        "rmse": float(rmse),
        "mae": float(mae)
    }

def fit_experimental_data(
    experimental_data: List[Dict[str, float]],
    model: Literal["tunneling", "arrhenius", "custom"] = "tunneling",
    fixed_params: Optional[Dict[str, float]] = None,
    bounds: Optional[Dict[str, List[float]]] = None
) -> Dict[str, Any]:
    """
    Fit model to experimental temperature vs. power data
    
    Args:
        experimental_data: List of data points with temperature and power
        model: Type of model to fit
        fixed_params: Parameters to keep fixed during fitting
        bounds: Parameter bounds for optimization
        
    Returns:
        Dictionary with fitted parameters and goodness of fit metrics
    """
    # Extract temperature and power values
    temperatures = np.array([point["temperature"] for point in experimental_data])
    powers = np.array([point["power"] for point in experimental_data])
    
    # Track computation time
    start_time = time.time()
    
    # Set default fixed parameters and bounds if not provided
    fixed_params = fixed_params or {}
    bounds_dict = bounds or {}
    
    # Fit based on model type
    if model == "tunneling":
        # Set default values and bounds
        default_params = {
            "lambda_param": 1e-10,
            "r0": 1e-10,
            "k_spring": 1000
        }
        
        # Update defaults with fixed parameters
        for param, value in fixed_params.items():
            default_params[param] = value
        
        # Determine which parameters to fit
        params_to_fit = [p for p in default_params if p not in fixed_params]
        
        # Initialize parameter values and bounds
        p0 = [default_params[p] for p in params_to_fit]
        bounds_low = []
        bounds_high = []
        
        # Set bounds for each parameter
        for p in params_to_fit:
            if p in bounds_dict:
                bounds_low.append(bounds_dict[p][0])
                bounds_high.append(bounds_dict[p][1])
            else:
                # Default bounds
                if p == "lambda_param":
                    bounds_low.append(1e-12)
                    bounds_high.append(1e-8)
                elif p == "r0":
                    bounds_low.append(1e-11)
                    bounds_high.append(1e-9)
                elif p == "k_spring":
                    bounds_low.append(100)
                    bounds_high.append(10000)
                else:
                    bounds_low.append(0.1 * default_params[p])
                    bounds_high.append(10 * default_params[p])
        
        # Create wrapper function that includes fixed parameters
        def fit_func(T, *fit_params):
            # Build complete parameter set
            full_params = dict(fixed_params)
            for i, p in enumerate(params_to_fit):
                full_params[p] = fit_params[i]
            
            # Call tunneling model with all parameters
            return tunneling_model(
                T, 
                lambda_param=full_params["lambda_param"],
                r0=full_params["r0"],
                k_spring=full_params["k_spring"]
            )
        
        try:
            # Perform curve fitting
            popt, pcov = curve_fit(
                fit_func, 
                temperatures, 
                powers, 
                p0=p0, 
                bounds=(bounds_low, bounds_high),
                maxfev=10000
            )
            
            # Extract fitted parameters
            fitted_params = dict(fixed_params)
            for i, p in enumerate(params_to_fit):
                fitted_params[p] = float(popt[i])
            
            # Generate predictions using the fitted model
            y_pred = np.array([
                tunneling_model(
                    T,
                    lambda_param=fitted_params["lambda_param"],
                    r0=fitted_params["r0"],
                    k_spring=fitted_params["k_spring"]
                )
                for T in temperatures
            ])
            
        except RuntimeError as e:
            logger.error(f"Curve fitting failed: {str(e)}", exc_info=True)
            # Fallback to initial guess if fitting fails
            fitted_params = default_params
            y_pred = np.array([
                tunneling_model(
                    T,
                    lambda_param=fitted_params["lambda_param"],
                    r0=fitted_params["r0"],
                    k_spring=fitted_params["k_spring"]
                )
                for T in temperatures
            ])
    
    elif model == "arrhenius":
        # Set default values and bounds for Arrhenius model
        default_params = {
            "A": 1.0,
            "Ea": 0.5  # Activation energy in eV
        }
        
        # Update defaults with fixed parameters
        for param, value in fixed_params.items():
            default_params[param] = value
            
        # Determine which parameters to fit
        params_to_fit = [p for p in default_params if p not in fixed_params]
        
        # Initialize parameter values and bounds
        p0 = [default_params[p] for p in params_to_fit]
        bounds_low = []
        bounds_high = []
        
        # Set bounds for each parameter
        for p in params_to_fit:
            if p in bounds_dict:
                bounds_low.append(bounds_dict[p][0])
                bounds_high.append(bounds_dict[p][1])
            else:
                # Default bounds
                if p == "A":
                    bounds_low.append(1e-3)
                    bounds_high.append(1e3)
                elif p == "Ea":
                    bounds_low.append(0.1)
                    bounds_high.append(2.0)
                else:
                    bounds_low.append(0.1 * default_params[p])
                    bounds_high.append(10 * default_params[p])
        
        # Create wrapper function for Arrhenius model
        def fit_func(T, *fit_params):
            # Build complete parameter set
            full_params = dict(fixed_params)
            for i, p in enumerate(params_to_fit):
                full_params[p] = fit_params[i]
            
            # Call Arrhenius model with all parameters
            return arrhenius_model(
                T, 
                A=full_params["A"],
                Ea=full_params["Ea"]
            )
        
        try:
            # Perform curve fitting
            popt, pcov = curve_fit(
                fit_func, 
                temperatures, 
                powers, 
                p0=p0, 
                bounds=(bounds_low, bounds_high),
                maxfev=10000
            )
            
            # Extract fitted parameters
            fitted_params = dict(fixed_params)
            for i, p in enumerate(params_to_fit):
                fitted_params[p] = float(popt[i])
            
            # Generate predictions using the fitted model
            y_pred = np.array([
                arrhenius_model(
                    T,
                    A=fitted_params["A"],
                    Ea=fitted_params["Ea"]
                )
                for T in temperatures
            ])
            
        except RuntimeError as e:
            logger.error(f"Curve fitting failed: {str(e)}", exc_info=True)
            # Fallback to initial guess if fitting fails
            fitted_params = default_params
            y_pred = np.array([
                arrhenius_model(
                    T,
                    A=fitted_params["A"],
                    Ea=fitted_params["Ea"]
                )
                for T in temperatures
            ])
    
    else:
        # Custom model not implemented yet
        logger.error(f"Model type '{model}' not implemented")
        raise ValueError(f"Model type '{model}' not implemented")
    
    # Calculate goodness of fit metrics
    goodness_of_fit = calculate_goodness_of_fit(powers, y_pred)
    
    # Calculate residuals
    residuals = (powers - y_pred).tolist()
    
    # Prepare predictions for output
    predictions = [
        {"temperature": float(T), "power": float(P)}
        for T, P in zip(temperatures, y_pred)
    ]
    
    # Total computation time
    computation_time = time.time() - start_time
    
    # Prepare the result
    result = {
        "fitted_params": fitted_params,
        "goodness_of_fit": goodness_of_fit,
        "predictions": predictions,
        "residuals": residuals,
        "model_type": model,
        "metadata": {
            "computation_time_ms": computation_time * 1000,
            "num_data_points": len(experimental_data),
            "iterations": 1000  # Placeholder, real iterations would come from curve_fit
        }
    }
    
    logger.info(f"Fitting completed with R² = {goodness_of_fit['r_squared']:.4f} using {model} model")
    return result

# Add the new comparison function
def compare_data_sets(
    simulation_data: List[Dict[str, float]],
    experimental_data: List[Dict[str, float]]
) -> Dict[str, Any]:
    """
    Compare simulation results with experimental data and compute statistics
    
    Args:
        simulation_data: List of simulation data points with temperature and power
        experimental_data: List of experimental data points with temperature and power
        
    Returns:
        Dictionary with comparison metrics and processed data
    """
    # Extract temperature and power values
    sim_temps = np.array([point["temperature"] for point in simulation_data])
    sim_powers = np.array([point["power"] for point in simulation_data])
    
    exp_temps = np.array([point["temperature"] for point in experimental_data])
    exp_powers = np.array([point["power"] for point in experimental_data])
    
    # Start timing
    start_time = time.time()
    
    # Create interpolation function for simulation data
    # This allows us to compare at the same temperature points
    try:
        # Sort data by temperature first (important for interpolation)
        sim_sort_idx = np.argsort(sim_temps)
        sim_temps_sorted = sim_temps[sim_sort_idx]
        sim_powers_sorted = sim_powers[sim_sort_idx]
        
        exp_sort_idx = np.argsort(exp_temps)
        exp_temps_sorted = exp_temps[exp_sort_idx]
        exp_powers_sorted = exp_powers[exp_sort_idx]
        
        # Create interpolation function
        sim_interp = interp1d(
            sim_temps_sorted, 
            sim_powers_sorted, 
            kind='linear',
            bounds_error=False,  # Don't raise error outside bounds
            fill_value=(sim_powers_sorted[0], sim_powers_sorted[-1])  # Extrapolate using endpoints
        )
        
        # Find overlapping temperature range
        temp_min = max(sim_temps_sorted[0], exp_temps_sorted[0])
        temp_max = min(sim_temps_sorted[-1], exp_temps_sorted[-1])
        
        # If no overlap, create appropriate error message
        if temp_min >= temp_max:
            logger.warning("No temperature overlap between simulation and experimental data")
            return {
                "metrics": {
                    "r_squared": None,
                    "rmse": None,
                    "mae": None,
                    "pearson_r": None,
                    "p_value": None
                },
                "overlap_range": {
                    "min": None,
                    "max": None,
                    "overlap_percentage": 0.0
                },
                "data_points": {
                    "experimental": len(experimental_data),
                    "simulation": len(simulation_data),
                    "overlap": 0
                },
                "metadata": {
                    "calculation_time_ms": (time.time() - start_time) * 1000,
                    "error": "No temperature overlap between datasets"
                }
            }
        
        # Filter experimental data to overlapping range
        mask = (exp_temps_sorted >= temp_min) & (exp_temps_sorted <= temp_max)
        filtered_exp_temps = exp_temps_sorted[mask]
        filtered_exp_powers = exp_powers_sorted[mask]
        
        # Generate simulation power values at experimental temperature points
        interpolated_sim_powers = sim_interp(filtered_exp_temps)
        
        # Calculate basic metrics
        if len(filtered_exp_temps) > 1:
            # Calculate Pearson correlation coefficient
            pearson_r, p_value = stats.pearsonr(interpolated_sim_powers, filtered_exp_powers)
            
            # Calculate other metrics using our helper function
            goodness_metrics = calculate_goodness_of_fit(filtered_exp_powers, interpolated_sim_powers)
            
            # Add to metrics
            goodness_metrics["pearson_r"] = float(pearson_r)
            goodness_metrics["p_value"] = float(p_value)
        else:
            # Not enough data points for statistical analysis
            goodness_metrics = {
                "r_squared": None,
                "rmse": None,
                "mae": None,
                "pearson_r": None,
                "p_value": None
            }
        
        # Calculate percent of temperature range that overlaps
        total_exp_range = exp_temps_sorted[-1] - exp_temps_sorted[0]
        overlap_range = temp_max - temp_min
        overlap_percentage = (overlap_range / total_exp_range) * 100 if total_exp_range > 0 else 0
        
        # Return results
        comparison_result = {
            "metrics": goodness_metrics,
            "overlap_range": {
                "min": float(temp_min),
                "max": float(temp_max),
                "overlap_percentage": float(overlap_percentage)
            },
            "data_points": {
                "experimental": len(experimental_data),
                "simulation": len(simulation_data),
                "overlap": int(np.sum(mask))
            },
            "metadata": {
                "calculation_time_ms": (time.time() - start_time) * 1000,
            },
            "processed_data": {
                "temperature_points": filtered_exp_temps.tolist() if len(filtered_exp_temps) > 0 else [],
                "experimental_values": filtered_exp_powers.tolist() if len(filtered_exp_powers) > 0 else [],
                "simulation_values": interpolated_sim_powers.tolist() if len(interpolated_sim_powers) > 0 else []
            }
        }
        
        # Add residuals for detailed analysis
        if len(filtered_exp_temps) > 0:
            residuals = filtered_exp_powers - interpolated_sim_powers
            comparison_result["processed_data"]["residuals"] = residuals.tolist()
            
            # Add some basic statistical analysis of residuals
            comparison_result["residual_stats"] = {
                "mean": float(np.mean(residuals)),
                "std": float(np.std(residuals)),
                "max": float(np.max(np.abs(residuals))),
                "median": float(np.median(np.abs(residuals)))
            }
        
        return comparison_result
        
    except Exception as e:
        logger.error(f"Error in data comparison: {str(e)}", exc_info=True)
        return {
            "metrics": {
                "r_squared": None,
                "rmse": None,
                "mae": None,
                "pearson_r": None,
                "p_value": None
            },
            "metadata": {
                "calculation_time_ms": (time.time() - start_time) * 1000,
                "error": str(e)
            }
        } 