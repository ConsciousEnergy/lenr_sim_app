"""
Result Analysis Module

This module provides comprehensive functionality for analyzing simulation results
and extracting useful data for visualization purposes.
"""

import numpy as np
from enum import Enum
from typing import Dict, List, Any, Callable, Optional, Tuple, Union
import json
import logging
from datetime import datetime
from dataclasses import dataclass, field

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("result_analysis", "logs/visualization.log")


class AnalysisMethod(Enum):
    """Enumeration of analysis methods for simulation results"""
    MEAN = "mean"
    MIN = "min"
    MAX = "max"
    STD = "std"
    VARIANCE = "variance"
    SUM = "sum"
    INTEGRAL = "integral"
    GRADIENT = "gradient"
    LAPLACIAN = "laplacian"
    HISTOGRAM = "histogram"
    CUSTOM = "custom"


@dataclass
class AnalysisConfig:
    """Configuration for result analysis"""
    # Methods to apply to each data set
    methods: List[AnalysisMethod] = field(default_factory=lambda: [AnalysisMethod.MEAN, 
                                                                   AnalysisMethod.MIN, 
                                                                   AnalysisMethod.MAX])
    # Region of interest (slice objects or indices)
    region: Optional[Tuple] = None
    # Histogram bins (if using histogram method)
    histogram_bins: int = 50
    # Custom method names and functions
    custom_methods: Dict[str, Callable] = field(default_factory=dict)
    # Time range for time series
    time_range: Optional[Tuple[float, float]] = None
    # Data normalization
    normalize: bool = False
    # Data filtering
    filter_threshold: Optional[float] = None


class ResultAnalyzer:
    """
    Class for analyzing simulation results and computing derived quantities.
    
    This class provides comprehensive functionality to extract meaningful data from 
    simulation results, compute statistics, and generate data suitable for visualization.
    """
    
    def __init__(self):
        """Initialize the result analyzer."""
        # Register standard analysis methods
        self._method_map = {
            AnalysisMethod.MEAN: np.mean,
            AnalysisMethod.MIN: np.min,
            AnalysisMethod.MAX: np.max,
            AnalysisMethod.STD: np.std,
            AnalysisMethod.VARIANCE: np.var,
            AnalysisMethod.SUM: np.sum
        }
        
        # Register special methods that require custom implementation
        self._special_methods = {
            AnalysisMethod.INTEGRAL: self._compute_integral,
            AnalysisMethod.GRADIENT: self._compute_gradient,
            AnalysisMethod.LAPLACIAN: self._compute_laplacian,
            AnalysisMethod.HISTOGRAM: self._compute_histogram
        }
        
        # Register for derived quantities (functions that compute new data from existing)
        self._derived_quantities = {}
        
        # Register common derived quantities
        self._register_common_derived_quantities()
    
    def _register_common_derived_quantities(self):
        """Register commonly used derived quantities"""
        # Reaction energy density
        self._derived_quantities["energy_density"] = lambda vars: (
            vars.get("energy_release", np.zeros_like(vars.get("temperature", 0))) * 
            vars.get("rate", np.zeros_like(vars.get("temperature", 0)))
        )
        
        # Coulomb barrier height
        self._derived_quantities["coulomb_barrier"] = lambda vars: (
            1.44 * vars.get("z1", 1) * vars.get("z2", 1) / 
            (vars.get("distance", 1e-10) + 1e-10)  # Add epsilon to avoid division by zero
        )
        
        # Total reaction rate
        self._derived_quantities["total_rate"] = lambda vars: (
            np.sum([vars.get(f"rate_{name}", np.zeros_like(vars.get("temperature", 0))) 
                   for name in vars.get("reaction_names", [])], axis=0)
        )
    
    def analyze_simulation_data(
        self, 
        simulation_results: Dict[str, Any],
        config: AnalysisConfig = None
    ) -> Dict[str, Any]:
        """
        Analyze simulation results according to the provided configuration.
        
        Args:
            simulation_results: Results from simulation
            config: Analysis configuration
            
        Returns:
            Dictionary with analysis results
        """
        if config is None:
            config = AnalysisConfig()
        
        results = {
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "methods": [method.value for method in config.methods],
                "region": str(config.region) if config.region else "full"
            },
            "summary": {},
            "time_series": {},
            "spatial": {}
        }
        
        # Process time array
        time_data = simulation_results.get("time", [])
        if config.time_range and len(time_data) > 0:
            start, end = config.time_range
            time_indices = [i for i, t in enumerate(time_data) if start <= t <= end]
        else:
            time_indices = list(range(len(time_data)))
        
        # Process concentration data
        concentration_data = simulation_results.get("concentrations", {})
        for species_name, time_series in concentration_data.items():
            # Filter by time range
            filtered_data = [time_series[i] for i in time_indices]
            
            # Analyze each time point
            time_point_results = []
            for data in filtered_data:
                # Apply region of interest if specified
                if config.region:
                    try:
                        data = data[config.region]
                    except Exception as e:
                        logger.error(f"Error applying region filter to data: {e}")
                
                # Apply normalization if requested
                if config.normalize and np.max(np.abs(data)) > 0:
                    data = data / np.max(np.abs(data))
                
                # Apply threshold filter if specified
                if config.filter_threshold is not None:
                    data = np.where(np.abs(data) >= config.filter_threshold, data, 0)
                
                # Compute metrics
                point_result = {}
                for method in config.methods:
                    try:
                        if method in self._method_map:
                            point_result[method.value] = float(self._method_map[method](data))
                        elif method in self._special_methods:
                            result = self._special_methods[method](data)
                            if isinstance(result, np.ndarray):
                                # Store arrays separately in spatial results
                                results["spatial"].setdefault(species_name, {})
                                results["spatial"][species_name][method.value] = result.tolist()
                                # Store a summary metric in the point result
                                point_result[f"{method.value}_summary"] = float(np.mean(result))
                            else:
                                point_result[method.value] = result
                        elif method == AnalysisMethod.CUSTOM:
                            for name, func in config.custom_methods.items():
                                point_result[name] = func(data)
                    except Exception as e:
                        logger.error(f"Error computing {method.value} for {species_name}: {e}")
                        point_result[method.value] = None
                
                time_point_results.append(point_result)
            
            # Store time series results
            results["time_series"][species_name] = time_point_results
            
            # Compute summary statistics across all time points
            summary = {}
            for method in config.methods:
                method_values = [point.get(method.value) for point in time_point_results 
                                if point.get(method.value) is not None]
                if method_values:
                    summary[f"{method.value}_min"] = float(np.min(method_values))
                    summary[f"{method.value}_max"] = float(np.max(method_values))
                    summary[f"{method.value}_mean"] = float(np.mean(method_values))
            
            results["summary"][species_name] = summary
        
        # Process reaction rate data in a similar way
        reaction_data = simulation_results.get("reaction_rates", {})
        # (similar processing as concentration data)
        
        # Process temperature data
        temperature_data = simulation_results.get("temperature", [])
        # (similar processing as concentration data)
        
        # Compute derived quantities
        self._add_derived_quantities(simulation_results, results, config)
        
        return results
    
    def register_derived_quantity(self, name: str, function: Callable) -> None:
        """
        Register a new derived quantity calculator.
        
        Args:
            name: Name of the derived quantity
            function: Function that computes the derived quantity from variables
        """
        self._derived_quantities[name] = function
        logger.info(f"Registered derived quantity: {name}")
    
    def _add_derived_quantities(
        self,
        simulation_results: Dict[str, Any],
        analysis_results: Dict[str, Any],
        config: AnalysisConfig
    ) -> None:
        """
        Compute and add derived quantities to the analysis results.
        
        Args:
            simulation_results: Original simulation results
            analysis_results: Analysis results dictionary to update
            config: Analysis configuration
        """
        # Prepare variables for derived quantities
        variables = {}
        
        # Add last time point data for concentration and other values
        for species, time_series in simulation_results.get("concentrations", {}).items():
            if time_series:
                variables[species] = time_series[-1]
        
        # Add reaction rates
        for reaction, time_series in simulation_results.get("reaction_rates", {}).items():
            if time_series:
                variables[f"rate_{reaction}"] = time_series[-1]
        
        # Add temperature
        temp_series = simulation_results.get("temperature", [])
        if temp_series:
            variables["temperature"] = temp_series[-1]
        
        # Add reaction names
        variables["reaction_names"] = list(simulation_results.get("reaction_rates", {}).keys())
        
        # Compute each derived quantity
        derived_results = {}
        for name, func in self._derived_quantities.items():
            try:
                result = func(variables)
                if isinstance(result, np.ndarray):
                    # Apply region of interest if specified
                    if config.region:
                        try:
                            result = result[config.region]
                        except Exception as e:
                            logger.error(f"Error applying region filter to derived quantity: {e}")
                    
                    # Apply normalization if requested
                    if config.normalize and np.max(np.abs(result)) > 0:
                        result = result / np.max(np.abs(result))
                    
                    # Apply threshold filter if specified
                    if config.filter_threshold is not None:
                        result = np.where(np.abs(result) >= config.filter_threshold, result, 0)
                    
                    # Convert to list for storage
                    derived_results[name] = result.tolist()
                    
                    # Compute summary statistics
                    derived_results[f"{name}_mean"] = float(np.mean(result))
                    derived_results[f"{name}_min"] = float(np.min(result))
                    derived_results[f"{name}_max"] = float(np.max(result))
            except Exception as e:
                logger.error(f"Error computing derived quantity {name}: {e}")
        
        # Add to results
        analysis_results["derived"] = derived_results
    
    def _compute_integral(self, data: np.ndarray) -> float:
        """Compute the integral of the data"""
        return float(np.sum(data))
    
    def _compute_gradient(self, data: np.ndarray) -> np.ndarray:
        """Compute the gradient magnitude of the data"""
        try:
            gradients = np.gradient(data)
            # Compute magnitude for multi-dimensional gradients
            if len(gradients) > 1:
                gradient_magnitude = np.sqrt(sum(g**2 for g in gradients))
            else:
                gradient_magnitude = np.abs(gradients[0])
            return gradient_magnitude
        except Exception as e:
            logger.error(f"Error computing gradient: {e}")
            return np.zeros_like(data)
    
    def _compute_laplacian(self, data: np.ndarray) -> np.ndarray:
        """Compute the Laplacian of the data"""
        try:
            if data.ndim == 1:
                # 1D case: use second derivative
                return np.gradient(np.gradient(data))
            elif data.ndim == 2:
                # 2D case: sum of second derivatives
                d2dx2 = np.gradient(np.gradient(data, axis=0), axis=0)
                d2dy2 = np.gradient(np.gradient(data, axis=1), axis=1)
                return d2dx2 + d2dy2
            elif data.ndim == 3:
                # 3D case: sum of second derivatives
                d2dx2 = np.gradient(np.gradient(data, axis=0), axis=0)
                d2dy2 = np.gradient(np.gradient(data, axis=1), axis=1)
                d2dz2 = np.gradient(np.gradient(data, axis=2), axis=2)
                return d2dx2 + d2dy2 + d2dz2
            else:
                raise ValueError(f"Unsupported data dimensionality: {data.ndim}")
        except Exception as e:
            logger.error(f"Error computing laplacian: {e}")
            return np.zeros_like(data)
    
    def _compute_histogram(self, data: np.ndarray, bins: int = 50) -> Dict[str, List]:
        """Compute a histogram of the data"""
        try:
            hist, bin_edges = np.histogram(data, bins=bins)
            return {
                "counts": hist.tolist(),
                "bin_edges": bin_edges.tolist()
            }
        except Exception as e:
            logger.error(f"Error computing histogram: {e}")
            return {"counts": [], "bin_edges": []}


class DataExporter:
    """Utility class for exporting simulation results to various formats"""
    
    @staticmethod
    def to_json(data: Dict[str, Any], indent: int = None) -> str:
        """
        Export data to JSON format.
        
        Args:
            data: Data to export
            indent: Indentation level for pretty printing
            
        Returns:
            JSON string
        """
        class NumpyEncoder(json.JSONEncoder):
            def default(self, obj):
                if isinstance(obj, np.ndarray):
                    return obj.tolist()
                if isinstance(obj, np.integer):
                    return int(obj)
                if isinstance(obj, np.floating):
                    return float(obj)
                return super().default(obj)
        
        return json.dumps(data, cls=NumpyEncoder, indent=indent)
    
    @staticmethod
    def to_csv(data: Dict[str, Any], time_series: bool = True) -> Dict[str, str]:
        """
        Export data to CSV format.
        
        Args:
            data: Data to export
            time_series: Whether to export time series data
            
        Returns:
            Dictionary mapping variable names to CSV strings
        """
        csv_data = {}
        
        # Export time series if requested
        if time_series and "time_series" in data:
            time_data = data.get("time", [])
            
            for variable, series in data["time_series"].items():
                csv_lines = ["time," + ",".join(series[0].keys())]
                
                for i, point_data in enumerate(series):
                    time_val = time_data[i] if i < len(time_data) else i
                    values = [str(time_val)] + [str(point_data.get(key, "")) for key in series[0].keys()]
                    csv_lines.append(",".join(values))
                
                csv_data[f"{variable}_time_series.csv"] = "\n".join(csv_lines)
        
        # Export summary data
        if "summary" in data:
            csv_lines = ["variable"] + list(next(iter(data["summary"].values())).keys())
            
            for variable, summary in data["summary"].items():
                values = [variable] + [str(summary.get(key, "")) for key in csv_lines[1:]]
                csv_lines.append(",".join(values))
            
            csv_data["summary.csv"] = "\n".join(csv_lines)
        
        return csv_data

# Create a default instance for convenience
default_analyzer = ResultAnalyzer() 