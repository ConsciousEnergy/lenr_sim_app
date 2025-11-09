"""
Advanced Simulation Engine

This module provides an advanced simulation engine for LENR simulations.
It implements more sophisticated physics models than the simple engine.
"""

import numpy as np
import logging
import time
from typing import Dict, List, Any, Optional
import uuid
from datetime import datetime
import os

from app.utils.logging import setup_logger
from app.simulation.domain import SimulationDomain
from app.simulation.engine import SimulationEngine, SimulationConfig

# Set up logger
logger = setup_logger("advanced_engine", "logs/simulation.log")

class AdvancedSimulationEngine(SimulationEngine):
    """
    Advanced simulation engine for LENR simulations.
    
    This engine implements more sophisticated physics models than the simple engine,
    including better nuclear reaction models, thermal effects, and material interactions.
    """
    
    def __init__(self, config: SimulationConfig = None):
        """
        Initialize the advanced simulation engine.
        
        Args:
            config: Simulation configuration
        """
        super().__init__(config)
        self.simulation_id = str(uuid.uuid4())
        self.result_cache = {}
        self.domain = None
        self.output_dir = "output/advanced_results"
        
        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
        
        logger.info(f"Initialized advanced simulation engine with ID {self.simulation_id}")
    
    def initialize(self, domain: SimulationDomain) -> None:
        """
        Initialize the simulation with a domain.
        
        Args:
            domain: Simulation domain
        """
        self.domain = domain
        logger.info(f"Initialized advanced simulation with domain: {domain.geometry}, dims: {domain.dimensions}")
    
    def run(self) -> Dict[str, Any]:
        """
        Run the simulation and return results.
        
        Returns:
            Dictionary with simulation results
        """
        if not self.domain:
            raise ValueError("Simulation not initialized with a domain")
        
        logger.info("Starting advanced simulation")
        start_time = time.time()
        
        try:
            # Extract parameters from domain
            dimensions = self.domain.dimensions
            properties = self.domain.properties
            
            # Extract material information
            material_type = properties.get("material", "palladium").lower()
            loading_type = properties.get("loading", "deuterium").lower()
            
            # Default parameters
            temperature = properties.get("temperature", 300.0)  # K
            pressure = properties.get("pressure", 101325.0)     # Pa
            loading_ratio = properties.get("loading_ratio", 0.7) # D/Pd or H/Ni ratio
            input_power = properties.get("input_power", 100.0)  # W
            duration = properties.get("simulation_duration", 1000.0)  # s
            time_step = properties.get("time_step", 1.0)        # s
            
            # Material-specific parameters
            if material_type in ["pd", "palladium"] and loading_type in ["d", "deuterium"]:
                # Palladium-Deuterium system
                lattice_constant = 3.89e-10  # m
                work_function = 5.12  # eV
                debye_temperature = 275.0  # K
                diffusion_coefficient = 2.5e-7  # m²/s
                bulk_modulus = 180e9  # Pa
                electron_density = 1.36e29  # electrons/m³
                quantum_enhancement = 2.0  # factor for quantum effects
            elif material_type in ["ni", "nickel"] and loading_type in ["h", "hydrogen"]:
                # Nickel-Hydrogen system
                lattice_constant = 3.52e-10  # m
                work_function = 5.15  # eV
                debye_temperature = 450.0  # K
                diffusion_coefficient = 3.0e-7  # m²/s
                bulk_modulus = 200e9  # Pa
                electron_density = 1.1e29  # electrons/m³
                quantum_enhancement = 1.8  # factor for quantum effects
            else:
                # Default values
                lattice_constant = 4.0e-10  # m
                work_function = 5.0  # eV
                debye_temperature = 300.0  # K
                diffusion_coefficient = 1.0e-7  # m²/s
                bulk_modulus = 150e9  # Pa
                electron_density = 1.0e29  # electrons/m³
                quantum_enhancement = 1.5  # factor for quantum effects
            
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
            
            # Temperature evolution with realistic heating model
            # Includes heating time constant based on material properties
            heating_time_constant = properties.get("heating_time_constant", 100.0)  # s
            temperature_rise = properties.get("temperature_rise", 50.0)  # K
            
            # Temperature response to input power with oscillations from feedback
            temperature_data = temperature + temperature_rise * (1 - np.exp(-time_points / heating_time_constant)) + \
                              3.0 * np.sin(0.02 * time_points) * (1 - np.exp(-time_points / (heating_time_constant / 2)))
            
            # Pressure evolution with thermal expansion effects
            # P₂ = P₁ * (T₂/T₁)  assuming constant volume
            pressure_data = pressure * (temperature_data / temperature)
            
            # Loading ratio evolution with desorption model
            # D/Pd ratio decreases with temperature according to Sievert's law
            desorption_factor = 0.001 * (temperature_data - temperature) / 100.0
            loading_data = loading_ratio * np.exp(-desorption_factor * time_points)
            
            # Calculate electron screening potential (eV)
            # Simple model: U_e ~ ne^(1/3) * exp(-T/T_0)
            temp_factor = np.exp(-temperature_data / 1000.0)
            screening_potential = 10.0 * (electron_density / 1e29)**(1/3) * temp_factor * loading_data
            
            # Calculate fusion rate using screening-enhanced tunneling
            # Based on loading, temperature, and screening
            tunneling_factor = 1e-30
            if loading_type in ["d", "deuterium"]:
                # D-D fusion basic rate
                tunneling_factor = 1e-25
            elif loading_type in ["h", "hydrogen"]:
                # Ni-H fusion basic rate
                tunneling_factor = 1e-27
            
            # Tunneling probability increases with screening and temperature
            tunneling_probability = tunneling_factor * np.exp(10.0 * screening_potential / temperature_data) * \
                                 quantum_enhancement * loading_data**2
            
            # Fusion rate: reactions per second
            fusion_rate = volume * electron_density * loading_ratio * tunneling_probability
            
            # Energy per fusion event
            energy_per_fusion = 0.0
            if material_type in ["pd", "palladium"] and loading_type in ["d", "deuterium"]:
                # D-D fusion: ~3.27 MeV
                energy_per_fusion = 3.27e6 * 1.602e-19  # J
            elif material_type in ["ni", "nickel"] and loading_type in ["h", "hydrogen"]:
                # Ni-H fusion: variable by isotope, using average ~5 MeV
                energy_per_fusion = 5.0e6 * 1.602e-19  # J
            else:
                # General estimation
                energy_per_fusion = 4.0e6 * 1.602e-19  # J
            
            # Power from fusion (W)
            fusion_power = fusion_rate * energy_per_fusion
            
            # Excess power (W) with efficiency factor
            efficiency = 0.5  # Heat extraction efficiency
            excess_power_data = fusion_power * efficiency
            
            # COP (Coefficient of Performance)
            cop_data = 1.0 + excess_power_data / input_power
            
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
                    "dimensions": self.domain.dimensions,
                    "material_type": material_type,
                    "loading_type": loading_type,
                    "lattice_constant": lattice_constant,
                    "work_function": work_function,
                    "debye_temperature": debye_temperature
                },
                "results": [
                    {
                        "time": float(t),
                        "temperature": float(temperature_data[i]),
                        "pressure": float(pressure_data[i]),
                        "loading_ratio": float(loading_data[i]),
                        "screening_potential": float(screening_potential[i]),
                        "tunneling_probability": float(tunneling_probability[i]),
                        "fusion_rate": float(fusion_rate[i]),
                        "excess_power": float(excess_power_data[i]),
                        "cop": float(cop_data[i]),
                        "energy": float(energy_data[i])
                    }
                    for i, t in enumerate(time_points)
                ],
                "summary": {
                    "max_temperature": float(np.max(temperature_data)),
                    "max_pressure": float(np.max(pressure_data)),
                    "min_loading_ratio": float(np.min(loading_data)),
                    "max_screening_potential": float(np.max(screening_potential)),
                    "max_tunneling_probability": float(np.max(tunneling_probability)),
                    "max_fusion_rate": float(np.max(fusion_rate)),
                    "max_excess_power": float(np.max(excess_power_data)),
                    "total_energy": float(energy_data[-1]),
                    "average_cop": float(np.mean(cop_data)),
                    "peak_cop": float(np.max(cop_data))
                }
            }
            
            # Save results to file
            self._save_results(results)
            
            elapsed_time = time.time() - start_time
            logger.info(f"Advanced simulation completed in {elapsed_time:.2f} seconds")
            
            # Store results in cache
            self.result_cache = results
            
            return results
            
        except Exception as e:
            logger.error(f"Error during advanced simulation: {str(e)}", exc_info=True)
            elapsed_time = time.time() - start_time
            
            return {
                "simulation_id": self.simulation_id,
                "status": "error",
                "error": str(e),
                "elapsed_time": elapsed_time
            }
    
    def _save_results(self, results: Dict[str, Any]) -> None:
        """
        Save results to a file.
        
        Args:
            results: Simulation results
        """
        try:
            import json
            
            # Create filename with simulation ID
            filename = os.path.join(self.output_dir, f"sim_{self.simulation_id[:8]}_results.json")
            
            # Save results as JSON
            with open(filename, "w") as f:
                json.dump(results, f, indent=2)
                
            logger.info(f"Saved results to {filename}")
            
        except Exception as e:
            logger.error(f"Error saving results: {str(e)}")
    
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
        # Clear cache to free memory
        self.result_cache = {}
        logger.info(f"Cleaned up resources for simulation {self.simulation_id}") 