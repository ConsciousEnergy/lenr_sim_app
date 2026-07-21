"""
Enhanced Fusion Module for LENR_Sim_App

This module implements the enhanced fusion calculations for LENR processes.
It integrates the Unified LENR Theory framework to provide a comprehensive model
for LENR reactions including multiple enhancement mechanisms.
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union, Set
import math
import logging
import importlib
from datetime import datetime

from app.utils.logging import setup_logger
from app.physics.models import FusionReaction, FusionEnhancementFactors
from app.physics.potential_models import calculate_coulomb_barrier
from app.physics.tunneling_engine import calculate_tunneling_probability
from app.physics.unified_enhancement import calculate_enhancement, get_default_configuration
from .models import FusionReaction
from ..core.config import get_settings

# Set up logger
logger = setup_logger("enhanced_fusion", "logs/physics.log")

# Physical constants
HBAR = const.hbar  # Reduced Planck constant in J·s
KB = const.k  # Boltzmann constant in J/K
EV_TO_J = const.e  # Conversion from eV to Joules
MEV_TO_J = 1e6 * EV_TO_J  # Conversion from MeV to Joules


class EnhancedFusionCalculator:
    """Calculator for enhanced fusion reactions with support for custom reactions"""
    
    # Default reactions defined as class constants
    DEFAULT_REACTIONS: Set[str] = {
        "D-D", "D-T", "D-He3", "p-B11", "p-Li6", "p-Li7"
    }
    
    def __init__(self, storage=None):
        """
        Initialize the calculator with default reactions and optional storage.
        
        Args:
            storage: Optional storage object for loading/saving custom reactions
        """
        self.available_reactions: Dict[str, FusionReaction] = {}
        self.storage = storage
        self.config = get_default_configuration()
        self._initialize_default_reactions()
        
        # Load custom reactions from storage if provided
        if self.storage is not None:
            self._load_custom_reactions_from_storage()
        
    def _initialize_default_reactions(self):
        """Initialize the default fusion reactions"""
        # D-D reaction (two branches)
        self.available_reactions["D-D"] = FusionReaction(
            name="D-D",
            reactant1_z=1, 
            reactant1_a=2,
            reactant2_z=1, 
            reactant2_a=2,
            products=[
                {"name": "He3", "z": 2, "a": 3, "branch_ratio": 0.5},
                {"name": "n", "z": 0, "a": 1, "branch_ratio": 0.5},
                {"name": "T", "z": 1, "a": 3, "branch_ratio": 0.5},
                {"name": "p", "z": 1, "a": 1, "branch_ratio": 0.5}
            ],
            q_value=4.03  # Average of both branches
        )
        
        # D-T reaction
        self.available_reactions["D-T"] = FusionReaction(
            name="D-T",
            reactant1_z=1, 
            reactant1_a=2,
            reactant2_z=1, 
            reactant2_a=3,
            products=[
                {"name": "He4", "z": 2, "a": 4, "branch_ratio": 1.0},
                {"name": "n", "z": 0, "a": 1, "branch_ratio": 1.0}
            ],
            q_value=17.59
        )
        
        # Add other default reactions here...
        
    def _load_custom_reactions_from_storage(self):
        """Load custom reactions from storage"""
        if self.storage is None:
            logger.warning("Cannot load custom reactions: storage not initialized")
            return
        
        try:
            custom_reactions = self.storage.load_reactions()
            for reaction in custom_reactions:
                if not self.is_default_reaction(reaction.name):
                    self.available_reactions[reaction.name] = reaction
                    logger.info(f"Loaded custom reaction from storage: {reaction.name}")
            
            logger.info(f"Loaded {len(custom_reactions)} custom reactions from storage")
        except Exception as e:
            logger.error(f"Error loading custom reactions from storage: {str(e)}")
            
    def is_default_reaction(self, reaction_name: str) -> bool:
        """Check if a reaction is one of the default reactions"""
        return reaction_name in self.DEFAULT_REACTIONS
        
    def get_reaction(self, reaction_name: str) -> FusionReaction:
        """Get a reaction by name"""
        if reaction_name not in self.available_reactions:
            raise ValueError(f"Unknown reaction: {reaction_name}")
        return self.available_reactions[reaction_name]
        
    def add_custom_reaction(self, reaction: FusionReaction) -> FusionReaction:
        """Add a custom reaction to the available reactions"""
        if self.is_default_reaction(reaction.name):
            raise ValueError(f"Cannot override default reaction: {reaction.name}")
        
        self.available_reactions[reaction.name] = reaction
        logger.info(f"Added custom reaction: {reaction.name}")
        
        # Save to storage if available
        if self.storage is not None:
            if self.storage.add_reaction(reaction):
                logger.info(f"Saved custom reaction to storage: {reaction.name}")
            else:
                logger.error(f"Failed to save custom reaction to storage: {reaction.name}")
                
        return reaction
        
    def remove_custom_reaction(self, reaction_name: str) -> None:
        """Remove a custom reaction from available reactions"""
        if self.is_default_reaction(reaction_name):
            raise ValueError(f"Cannot remove default reaction: {reaction_name}")
        if reaction_name not in self.available_reactions:
            raise ValueError(f"Unknown reaction: {reaction_name}")
            
        # Remove from memory
        del self.available_reactions[reaction_name]
        logger.info(f"Removed custom reaction: {reaction_name}")
        
        # Remove from storage if available
        if self.storage is not None:
            if self.storage.remove_reaction(reaction_name):
                logger.info(f"Removed custom reaction from storage: {reaction_name}")
            else:
                logger.error(f"Failed to remove custom reaction from storage: {reaction_name}")
        
    def list_custom_reactions(self) -> List[FusionReaction]:
        """List all custom reactions"""
        return [
            reaction for name, reaction in self.available_reactions.items()
            if not self.is_default_reaction(name)
        ]
        
    def list_default_reactions(self) -> List[FusionReaction]:
        """List all default reactions"""
        return [
            reaction for name, reaction in self.available_reactions.items()
            if self.is_default_reaction(name)
        ]
        
    def list_all_reactions(self) -> List[FusionReaction]:
        """List all available reactions (both default and custom)"""
        return list(self.available_reactions.values())
    
    def set_config(self, config: Dict[str, Any]):
        """
        Set the configuration for enhancement calculations.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        logger.debug(f"Updated configuration: {len(config)} mechanisms")
    
    def calculate_reaction_rate(
        self,
        reaction_name: str,
        temperature: float,
        density1: float,
        density2: float,
        mechanisms: Optional[List[str]] = None,
        custom_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Calculate the reaction rate for a specific fusion reaction.
        
        Args:
            reaction_name: Name of the reaction (e.g., "d-d")
            temperature: Temperature in Kelvin
            density1: Number density of reactant 1 in m^-3
            density2: Number density of reactant 2 in m^-3
            mechanisms: List of enhancement mechanisms to include
            custom_config: Custom configuration to override defaults
            
        Returns:
            Dictionary with reaction rate results
        """
        # Get the reaction
        if reaction_name not in self.available_reactions:
            logger.error(f"Reaction {reaction_name} not found")
            return {"error": f"Reaction {reaction_name} not found"}
        
        reaction = self.available_reactions[reaction_name]
        
        # Calculate Coulomb barrier
        z1 = reaction.reactant1_z
        z2 = reaction.reactant2_z
        coulomb_barrier = calculate_coulomb_barrier(z1, z2)
        
        # Calculate base tunneling probability
        # Convert temperature to energy in keV
        energy_keV = (3/2) * KB * temperature / (EV_TO_J * 1000)
        
        # Get mass numbers
        a1 = reaction.reactant1_a
        a2 = reaction.reactant2_a
        reduced_mass = (a1 * a2) / (a1 + a2) * const.u  # kg
        
        # Calculate base probability using the tunneling engine
        tunneling_result = calculate_tunneling_probability(
            z1, z2, a1, a2, energy_keV, temperature
        )
        if isinstance(tunneling_result, dict):
            base_probability = tunneling_result.get("total_probability", 0.0)
        else:
            base_probability = float(tunneling_result)
        
        # Prepare configuration
        config = self.config.copy()
        if custom_config:
            # Update with custom configuration
            for mechanism, params in custom_config.items():
                if mechanism in config:
                    config[mechanism].update(params)
        
        # Update configuration with reaction-specific parameters
        config["oppenheimer_phillips"]["projectile_z"] = z1
        config["oppenheimer_phillips"]["target_z"] = z2
        config["oppenheimer_phillips"]["projectile_a"] = a1
        config["oppenheimer_phillips"]["target_a"] = a2
        config["oppenheimer_phillips"]["energy_kev"] = energy_keV
        
        config["electron_screening"]["atomic_number_1"] = z1
        config["electron_screening"]["atomic_number_2"] = z2
        config["electron_screening"]["temperature"] = temperature
        
        # Set temperature for all mechanisms
        for mechanism in config:
            if "temperature" in config[mechanism]:
                config[mechanism]["temperature"] = temperature
        
        # Calculate enhancement
        enhancement_result = calculate_enhancement(config, mechanisms)
        
        # Enhanced probability
        enhancement_factor = enhancement_result["combined_enhancement_factor"]
        enhanced_probability = base_probability * enhancement_factor
        
        # Calculate reaction rate coefficient
        # Derive energy_eV from energy_keV for velocity and output
        energy_eV = energy_keV * 1000
        
        # Simplified calculation using the enhanced probability
        # Velocity estimation from thermal energy
        velocity = np.sqrt(2 * energy_eV * EV_TO_J / reduced_mass)  # m/s
        
        # Reaction cross-section from probability (simplified)
        # Cross-section ≈ π * (nuclear radius)^2 * probability
        nuclear_radius = 1.25e-15 * (a1**(1/3) + a2**(1/3))  # m
        cross_section = np.pi * nuclear_radius**2 * enhanced_probability  # m^2
        
        # Reaction rate coefficient
        rate_coefficient = cross_section * velocity  # m^3/s
        
        # Total reaction rate
        reaction_rate = rate_coefficient * density1 * density2  # reactions/s/m^3
        
        # Power density
        power_density = reaction_rate * reaction.q_value * MEV_TO_J  # W/m^3
        
        # Prepare results
        results = {
            "reaction_name": reaction_name,
            "temperature_K": temperature,
            "density1_m3": density1,
            "density2_m3": density2,
            "coulomb_barrier_eV": coulomb_barrier,
            "energy_eV": energy_eV,
            "base_probability": base_probability,
            "enhancement_factor": enhancement_factor,
            "log_enhancement": enhancement_result["log_combined_enhancement"],
            "enhanced_probability": enhanced_probability,
            "cross_section_m2": cross_section,
            "rate_coefficient_m3_s": rate_coefficient,
            "reaction_rate_m3_s": reaction_rate,
            "power_density_W_m3": power_density,
            "q_value_MeV": reaction.q_value,
            "timestamp": datetime.now().isoformat(),
            "enhancement_details": enhancement_result
        }
        
        # Log the results
        logger.info(f"Calculated reaction rate for {reaction_name}: "
                   f"enhancement = {enhancement_factor:.2e}, "
                   f"reaction rate = {reaction_rate:.2e} m^-3 s^-1, "
                   f"power density = {power_density:.2e} W/m^3")
        
        return results
    
    def calculate_multiple_temperatures(
        self,
        reaction_name: str,
        temperatures: List[float],
        density1: float,
        density2: float,
        mechanisms: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Calculate reaction rates across multiple temperatures.
        
        Args:
            reaction_name: Name of the reaction
            temperatures: List of temperatures in Kelvin
            density1: Number density of reactant 1 in m^-3
            density2: Number density of reactant 2 in m^-3
            mechanisms: List of enhancement mechanisms to include
            
        Returns:
            Dictionary with results for all temperatures
        """
        results = {
            "reaction_name": reaction_name,
            "temperatures": temperatures,
            "enhancement_factors": [],
            "reaction_rates": [],
            "power_densities": []
        }
        
        for temp in temperatures:
            # Calculate for this temperature
            result = self.calculate_reaction_rate(
                reaction_name, temp, density1, density2, mechanisms
            )
            
            # Store the results
            if "error" not in result:
                results["enhancement_factors"].append(result["enhancement_factor"])
                results["reaction_rates"].append(result["reaction_rate_m3_s"])
                results["power_densities"].append(result["power_density_W_m3"])
            else:
                results["enhancement_factors"].append(1.0)
                results["reaction_rates"].append(0.0)
                results["power_densities"].append(0.0)
        
        return results

    def calculate_temperature_scan(
        self,
        reaction_name: str,
        temperatures: List[float],
        density: float,
        enhancement_factors: Optional[Any] = None
    ) -> Dict[str, List[float]]:
        """
        Calculate fusion rates across multiple temperatures.

        Adapter for the legacy route interface. Delegates to
        calculate_multiple_temperatures using a single density for both
        reactants (symmetric reaction assumption).
        """
        result = self.calculate_multiple_temperatures(
            reaction_name=reaction_name,
            temperatures=temperatures,
            density1=density,
            density2=density,
            mechanisms=None
        )
        return {
            "temperatures": result["temperatures"],
            "reaction_rates": result["reaction_rates"],
            "enhancement_factors": result["enhancement_factors"],
            "power_densities": result["power_densities"]
        }

    def compare_reactions(
        self,
        temperature: float,
        density: float,
        mechanisms: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Compare different fusion reactions under the same conditions.
        
        Args:
            temperature: Temperature in Kelvin
            density: Number density of reactants in m^-3
            mechanisms: List of enhancement mechanisms to include
    
    Returns:
            Dictionary with comparison results
        """
        results = {
            "temperature": temperature,
            "density": density,
            "reactions": [],
            "enhancement_factors": [],
            "reaction_rates": [],
            "power_densities": []
        }
        
        for reaction_name in self.available_reactions:
            # Calculate for this reaction
            result = self.calculate_reaction_rate(
                reaction_name, temperature, density, density, mechanisms
            )
            
            # Store the results
            if "error" not in result:
                results["reactions"].append(reaction_name)
                results["enhancement_factors"].append(result["enhancement_factor"])
                results["reaction_rates"].append(result["reaction_rate_m3_s"])
                results["power_densities"].append(result["power_density_W_m3"])
        
        return results
    
    def optimize_conditions(
        self,
        reaction_name: str,
        temp_range: Tuple[float, float],
        density_range: Tuple[float, float],
        mechanisms: Optional[List[str]] = None,
        num_points: int = 10
    ) -> Dict[str, Any]:
        """
        Find optimal conditions for a specific reaction.
        
        Args:
            reaction_name: Name of the reaction
            temp_range: Temperature range (min, max) in Kelvin
            density_range: Density range (min, max) in m^-3
            mechanisms: List of enhancement mechanisms to include
            num_points: Number of points to evaluate in each dimension
            
        Returns:
            Dictionary with optimization results
        """
        # Generate temperature and density points
        temperatures = np.linspace(temp_range[0], temp_range[1], num_points)
        densities = np.logspace(np.log10(density_range[0]), np.log10(density_range[1]), num_points)
        
        # Initialize results
        power_matrix = np.zeros((num_points, num_points))
        enhancement_matrix = np.zeros((num_points, num_points))
        
        # Calculate for each combination
        for i, temp in enumerate(temperatures):
            for j, density in enumerate(densities):
                # Calculate reaction rate
                result = self.calculate_reaction_rate(
                    reaction_name, temp, density, density, mechanisms
                )
                
                # Store results
                if "error" not in result:
                    power_matrix[i, j] = result["power_density_W_m3"]
                    enhancement_matrix[i, j] = result["enhancement_factor"]
        
        # Find optimal conditions
        max_idx = np.unravel_index(np.argmax(power_matrix), power_matrix.shape)
        optimal_temp = temperatures[max_idx[0]]
        optimal_density = densities[max_idx[1]]
        max_power = power_matrix[max_idx]
        max_enhancement = enhancement_matrix[max_idx]
        
        # Prepare results
        results = {
            "reaction_name": reaction_name,
            "temperatures": temperatures.tolist(),
            "densities": densities.tolist(),
            "power_matrix": power_matrix.tolist(),
            "enhancement_matrix": enhancement_matrix.tolist(),
            "optimal_temperature": optimal_temp,
            "optimal_density": optimal_density,
            "max_power_density": float(max_power),
            "max_enhancement": float(max_enhancement)
        }
        
        return results
    
    def analyze_mechanism_contributions(
        self,
        reaction_name: str,
        temperature: float,
        density: float,
        mechanisms: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Analyze the contribution of each mechanism to the total enhancement.
    
        Args:
            reaction_name: Name of the reaction
            temperature: Temperature in Kelvin
            density: Number density of reactants in m^-3
            mechanisms: List of mechanisms to analyze
    
        Returns:
            Dictionary with analysis results
        """
        # Calculate full enhancement
        full_result = self.calculate_reaction_rate(
            reaction_name, temperature, density, density, mechanisms
        )
        
        if "error" in full_result:
            return full_result
        
        full_enhancement = full_result["enhancement_factor"]
        
        # Analyze individual mechanisms
        individual_results = {}
        
        # If mechanisms not specified, use all from full result
        if mechanisms is None and "enhancement_details" in full_result:
            if "mechanisms_used" in full_result["enhancement_details"]:
                mechanisms = full_result["enhancement_details"]["mechanisms_used"]
        
        # Calculate enhancement with each mechanism individually
        for mechanism in mechanisms:
            # Calculate with only this mechanism
            single_result = self.calculate_reaction_rate(
                reaction_name, temperature, density, density, [mechanism]
            )
            
            if "error" not in single_result:
                individual_results[mechanism] = {
                    "enhancement_factor": single_result["enhancement_factor"],
                    "log_enhancement": single_result["log_enhancement"],
                    "contribution_ratio": np.log10(single_result["enhancement_factor"]) / 
                                         np.log10(full_enhancement) if full_enhancement > 1 else 0
                }
        
        # Prepare results
        results = {
            "reaction_name": reaction_name,
            "temperature": temperature,
            "density": density,
            "full_enhancement": full_enhancement,
            "log_full_enhancement": np.log10(full_enhancement) if full_enhancement > 0 else 0,
            "individual_results": individual_results,
        }
        
        # Find dominant mechanism
        if individual_results:
            max_mechanism = max(individual_results.keys(), 
                               key=lambda k: individual_results[k]["enhancement_factor"])
            results["dominant_mechanism"] = max_mechanism
            results["dominant_enhancement"] = individual_results[max_mechanism]["enhancement_factor"]
        
        return results


# Create a singleton instance
calculator = EnhancedFusionCalculator()


def calculate_fusion_rate(
    reaction_name: str,
    temperature: float,
    density1: float,
    density2: float,
    mechanisms: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Calculate fusion reaction rate using the singleton calculator.
    
    Args:
        reaction_name: Name of the reaction
        temperature: Temperature in Kelvin
        density1: Number density of reactant 1 in m^-3
        density2: Number density of reactant 2 in m^-3
        mechanisms: List of enhancement mechanisms to include
        
    Returns:
        Dictionary with reaction rate results
    """
    return calculator.calculate_reaction_rate(
        reaction_name, temperature, density1, density2, mechanisms
    ) 