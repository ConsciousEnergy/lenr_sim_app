"""
Simple Simulation Engine

This module provides a simple simulation engine for LENR simulations.
It implements basic physics models for testing and quick simulations.
"""

import numpy as np
import logging
import time
from typing import Dict, List, Any, Optional
import uuid
from datetime import datetime

from app.utils.logging import setup_logger
from app.simulation.domain import SimulationDomain
from app.simulation.engine import SimulationEngine, SimulationConfig

# Set up logger
logger = setup_logger("simple_engine", "logs/simulation.log")

class SimpleSimulationEngine(SimulationEngine):
    """
    Simple simulation engine for LENR simulations.
    
    This engine implements basic physics models for testing and quick simulations.
    It's suitable for rapid prototyping and testing the simulation framework.
    """
    
    def __init__(self, config: SimulationConfig = None):
        """
        Initialize the simple simulation engine.
        
        Args:
            config: Simulation configuration
        """
        super().__init__(config)
        self.simulation_id = str(uuid.uuid4())
        self.result_cache = {}
        self.domain = None
        
        logger.info(f"Initialized simple simulation engine with ID {self.simulation_id}")
    
    def initialize(self, domain: SimulationDomain) -> None:
        """
        Initialize the simulation with a domain.
        
        Args:
            domain: Simulation domain
        """
        self.domain = domain
        logger.info(f"Initialized simple simulation with domain: {domain.geometry}, dims: {domain.dimensions}")
    
    def run(self) -> Dict[str, Any]:
        """
        Run the simulation and return results.
        
        Returns:
            Dictionary with simulation results
        """
        if not self.domain:
            raise ValueError("Simulation not initialized with a domain")
        
        logger.info("Starting simple simulation")
        start_time = time.time()
        
        try:
            # Extract parameters from domain
            dimensions = self.domain.dimensions
            properties = self.domain.properties
            
            # Default parameters
            temperature = properties.get("temperature", 300.0)  # K
            pressure = properties.get("pressure", 101325.0)     # Pa
            loading_ratio = properties.get("loading_ratio", 0.7) # D/Pd or H/Ni ratio
            input_power = properties.get("input_power", 100.0)  # W
            duration = properties.get("simulation_duration", 1000.0)  # s
            time_step = properties.get("time_step", 1.0)        # s
            
            # Calculate domain volume
            if self.domain.geometry == "cylinder":
                radius = dimensions[0] / 2
                height = dimensions[1]
                volume = np.pi * radius**2 * height
            elif self.domain.geometry == "box" or self.domain.geometry == "rectangle":
                if len(dimensions) == 3:
                    # 3D box
                    volume = dimensions[0] * dimensions[1] * dimensions[2]
                else:
                    # 2D rectangle with unit depth
                    volume = dimensions[0] * dimensions[1] * 0.01
            elif self.domain.geometry == "sphere":
                radius = dimensions[0]
                volume = (4/3) * np.pi * radius**3
            else:
                volume = 1.0  # Default fallback
            
            # Generate time series data
            time_points = np.arange(0, duration + time_step, time_step)
            n_points = len(time_points)
            
            # Temperature evolution (oscillating with slight rise)
            temperature_rise = properties.get("temperature_rise", 10.0)  # K
            temperature_data = temperature + temperature_rise * (1 - np.exp(-0.001 * time_points)) + \
                              2.0 * np.sin(0.01 * time_points)
            
            # Pressure evolution
            pressure_data = pressure * (1 + 0.05 * np.sin(0.005 * time_points))
            
            # Loading ratio evolution (slight decrease over time)
            loading_data = loading_ratio * (1 - 0.1 * (1 - np.exp(-0.0005 * time_points)))
            
            # Simple COP model based on loading and temperature
            cop_factor = 0.1 * loading_ratio * (temperature / 300.0)**2
            cop_data = 1.0 + cop_factor * (1 - np.exp(-0.001 * time_points))
            
            # Excess power (W)
            excess_power_data = input_power * (cop_data - 1.0)
            
            # Cumulative energy (J)
            energy_data = np.cumsum(excess_power_data) * time_step
            
            # Generate results dictionary
            results = {
                "simulation_id": self.simulation_id,
                "parameters": {
                    "temperature": temperature,
                    "pressure": pressure,
                    "loading_ratio": loading_ratio,
                    "input_power": input_power,
                    "simulation_duration": duration,
                    "time_step": time_step,
                    "volume": volume,
                    "geometry": self.domain.geometry,
                    "dimensions": self.domain.dimensions
                },
                "results": [
                    {
                        "time": float(t),
                        "temperature": float(temperature_data[i]),
                        "pressure": float(pressure_data[i]),
                        "loading_ratio": float(loading_data[i]),
                        "cop": float(cop_data[i]),
                        "excess_power": float(excess_power_data[i]),
                        "energy": float(energy_data[i])
                    }
                    for i, t in enumerate(time_points)
                ],
                "summary": {
                    "max_temperature": float(np.max(temperature_data)),
                    "max_pressure": float(np.max(pressure_data)),
                    "min_loading_ratio": float(np.min(loading_data)),
                    "max_cop": float(np.max(cop_data)),
                    "max_excess_power": float(np.max(excess_power_data)),
                    "total_energy": float(energy_data[-1]),
                    "average_cop": float(np.mean(cop_data))
                }
            }
            
            elapsed_time = time.time() - start_time
            logger.info(f"Simple simulation completed in {elapsed_time:.2f} seconds")
            
            # Store results in cache
            self.result_cache = results
            
            return results
            
        except Exception as e:
            logger.error(f"Error during simple simulation: {str(e)}", exc_info=True)
            elapsed_time = time.time() - start_time
            
            return {
                "simulation_id": self.simulation_id,
                "status": "error",
                "error": str(e),
                "elapsed_time": elapsed_time
            }
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get the current status of the simulation.
        
        Returns:
            Dictionary with simulation status
        """
        if not self.domain:
            return {
                "simulation_id": self.simulation_id,
                "status": "not_initialized"
            }
        
        if self.result_cache:
            return {
                "simulation_id": self.simulation_id,
                "status": "completed",
                "domain": str(self.domain)
            }
        
        return {
            "simulation_id": self.simulation_id,
            "status": "initialized",
            "domain": str(self.domain)
        }
    
    def get_results(self) -> Dict[str, Any]:
        """
        Get the current simulation results.
        
        Returns:
            Dictionary with simulation results
        """
        return self.result_cache if self.result_cache else {
            "simulation_id": self.simulation_id,
            "status": "no_results"
        }
    
    def cleanup(self) -> None:
        """
        Clean up resources used by the simulation.
        """
        # Nothing to clean up for simple simulation
        self.result_cache = {}
        logger.info(f"Cleaned up resources for simulation {self.simulation_id}") 