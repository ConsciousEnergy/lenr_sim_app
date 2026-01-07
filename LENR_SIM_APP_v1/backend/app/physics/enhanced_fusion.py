"""
Enhanced Fusion Module for LENR_Sim_App

This module implements the enhanced fusion calculations for LENR processes.
It integrates the Unified LENR Theory framework to provide a comprehensive model
for LENR reactions including multiple enhancement mechanisms.
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
import math
import logging
import importlib
from datetime import datetime

from app.utils.logging import setup_logger
from app.physics.models import FusionReaction, FusionEnhancementFactors
from app.physics.potential_models import calculate_coulomb_barrier
from app.physics.tunneling_engine import calculate_tunneling_probability
from app.physics.unified_enhancement import calculate_enhancement, get_default_configuration

# Set up logger
logger = setup_logger("enhanced_fusion", "logs/physics.log")

# Physical constants
HBAR = const.hbar  # Reduced Planck constant in J·s
KB = const.k  # Boltzmann constant in J/K
EV_TO_J = const.e  # Conversion from eV to Joules
MEV_TO_J = 1e6 * EV_TO_J  # Conversion from MeV to Joules


class EnhancedFusionCalculator:
    """
    Class for calculating enhanced fusion rates using the Unified LENR Theory.
    """
    
    def __init__(self):
        """Initialize the calculator with default values."""
        # Default configuration
        self.config = get_default_configuration()
        
        # Default reactions
        self.reactions = {
            "d-d": FusionReaction(
                name="d-d",
                reactant1_z=1, reactant1_a=2,
                reactant2_z=1, reactant2_a=2,
                products_detail=[
                    {"name": "He-3", "z": 2, "a": 3, "branch_ratio": 0.5},
                    {"name": "T", "z": 1, "a": 3, "branch_ratio": 0.5},
                    {"name": "p", "z": 1, "a": 1, "branch_ratio": 0.5},
                    {"name": "n", "z": 0, "a": 1, "branch_ratio": 0.5}
                ],
                q_value=3.27  # MeV
            ),
            "d-p": FusionReaction(
                name="d-p",
                reactant1_z=1, reactant1_a=2,
                reactant2_z=1, reactant2_a=1,
                products_detail=[
                    {"name": "He-3", "z": 2, "a": 3, "branch_ratio": 1.0}
                ],
                q_value=5.49  # MeV
            ),
            "p-Li7": FusionReaction(
                name="p-Li7",
                reactant1_z=1, reactant1_a=1,
                reactant2_z=3, reactant2_a=7,
                products_detail=[
                    {"name": "Be-8", "z": 4, "a": 8, "branch_ratio": 1.0},
                    {"name": "He-4", "z": 2, "a": 4, "branch_ratio": 2.0}  # Two alpha particles
                ],
                q_value=17.35  # MeV
            ),
            "d-Li6": FusionReaction(
                name="d-Li6",
                reactant1_z=1, reactant1_a=2,
                reactant2_z=3, reactant2_a=6,
                products_detail=[
                    {"name": "He-4", "z": 2, "a": 4, "branch_ratio": 2.0},  # Two alpha particles
                ],
                q_value=22.37  # MeV
            ),
            "p-B11": FusionReaction(
                name="p-B11",
                reactant1_z=1, reactant1_a=1,
                reactant2_z=5, reactant2_a=11,
                products_detail=[
                    {"name": "C-12", "z": 6, "a": 12, "branch_ratio": 1.0},
                    {"name": "He-4", "z": 2, "a": 4, "branch_ratio": 3.0}  # Three alpha particles
                ],
                q_value=8.68  # MeV
            )
        }
        
        # Initialize enhancement factors
        self.enhancement_factors = FusionEnhancementFactors()
        
        logger.info("Initialized EnhancedFusionCalculator")
    
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
        if reaction_name not in self.reactions:
            logger.error(f"Reaction {reaction_name} not found")
            return {"error": f"Reaction {reaction_name} not found"}
        
        reaction = self.reactions[reaction_name]
        
        # Calculate Coulomb barrier
        z1 = reaction.reactant1_z
        z2 = reaction.reactant2_z
        coulomb_barrier = calculate_coulomb_barrier(z1, z2)
        
        # Calculate base tunneling probability
        # Convert temperature to energy in eV
        energy_eV = (3/2) * KB * temperature / EV_TO_J
        
        # Get reduced mass
        a1 = reaction.reactant1_a
        a2 = reaction.reactant2_a
        reduced_mass = (a1 * a2) / (a1 + a2) * const.u  # kg
        
        # Calculate base probability
        base_probability = calculate_tunneling_probability(
            energy_eV * EV_TO_J,  # Convert to J
            coulomb_barrier * EV_TO_J,  # Convert to J
            z1, z2, reduced_mass
        )
        
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
        config["oppenheimer_phillips"]["energy_kev"] = energy_eV / 1000  # Convert eV to keV
        
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
        # <σv> = (2/√π) * (E_0/kT)^(3/2) * S(E_0) * exp(-3*E_0/kT)
        # where E_0 is the Gamow peak energy, and S(E_0) is the astrophysical S-factor
        
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
        
        for reaction_name in self.reactions:
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


def calculate_gamow_factor(z1: int, z2: int, reduced_mass: float, energy_kev: float) -> float:
    """
    Calculate the Gamow factor for fusion reactions.
    
    Args:
        z1: Atomic number of the first nucleus
        z2: Atomic number of the second nucleus
        reduced_mass: Reduced mass in kg
        energy_kev: Energy in keV
        
    Returns:
        Gamow factor (dimensionless)
    """
    # Convert energy from keV to J
    energy_j = energy_kev * 1e3 * const.e
    
    # Calculate the Gamow energy
    gamow_energy = (const.pi * z1 * z2 * const.e**2 * np.sqrt(2 * reduced_mass)) / const.hbar
    
    # Calculate the Gamow factor
    gamow_factor = gamow_energy / (2 * np.sqrt(energy_j))
    
    return float(gamow_factor)


def calculate_proximity_enhancement(z1: int, z2: int, distance: float) -> float:
    """
    Calculate the enhancement due to proximity effects.
    
    Args:
        z1: Atomic number of the first nucleus
        z2: Atomic number of the second nucleus
        distance: Distance between nuclei in meters
        
    Returns:
        Enhancement factor
    """
    # Simple model for proximity enhancement
    # The closer the nuclei, the greater the enhancement
    reference_distance = 1e-10  # Reference distance (1 Å)
    enhancement = np.exp(reference_distance / distance)
    return min(1e6, float(enhancement))  # Cap at 1e6 for numerical stability


def calculate_screening_enhancement(z1: int, z2: int, electron_density: float, temperature: float) -> float:
    """
    Calculate the enhancement due to electron screening.
    
    Args:
        z1: Atomic number of the first nucleus
        z2: Atomic number of the second nucleus
        electron_density: Electron density in m^-3
        temperature: Temperature in K
        
    Returns:
        Enhancement factor
    """
    # Calculate Debye length
    debye_length = np.sqrt(const.epsilon_0 * const.k * temperature / 
                         (electron_density * const.e**2))
    
    # Calculate screening potential
    screening_potential = (z1 * z2 * const.e**2) / (4 * np.pi * const.epsilon_0 * debye_length)
    
    # Calculate enhancement factor
    enhancement = np.exp(screening_potential / (const.k * temperature))
    
    return min(1e8, float(enhancement))  # Cap at 1e8 for numerical stability


def calculate_fluctuation_enhancement(temperature: float, frequency: float = 1e12) -> float:
    """
    Calculate the enhancement due to thermal and quantum fluctuations.
    
    Args:
        temperature: Temperature in K
        frequency: Characteristic frequency in Hz
        
    Returns:
        Enhancement factor
    """
    # Simple model based on thermal energy and characteristic frequency
    thermal_energy = const.k * temperature
    quantum_energy = const.h * frequency
    
    # Enhancement increases with temperature and frequency
    enhancement = np.exp(thermal_energy / (2 * quantum_energy))
    
    return min(1e4, float(enhancement))  # Cap at 1e4 for numerical stability


def calculate_resonance_enhancement(energy_kev: float, resonance_energy: float = 10.0, width: float = 1.0) -> float:
    """
    Calculate the enhancement due to resonance effects.
    
    Args:
        energy_kev: Particle energy in keV
        resonance_energy: Resonance energy in keV
        width: Resonance width in keV
        
    Returns:
        Enhancement factor
    """
    # Breit-Wigner resonance formula (simplified)
    enhancement = (width**2) / ((energy_kev - resonance_energy)**2 + width**2/4)
    
    return min(1e5, float(enhancement))  # Cap at 1e5 for numerical stability


def calculate_quantum_enhancement(coherence_length: float = 1e-9) -> float:
    """
    Calculate the enhancement due to quantum coherence effects.
    
    Args:
        coherence_length: Quantum coherence length in meters
        
    Returns:
        Enhancement factor
    """
    # Simple model based on coherence length
    # Enhancement increases with coherence length
    reference_length = 1e-10  # Reference length (1 Å)
    enhancement = (coherence_length / reference_length)**2
    
    return min(1e6, float(enhancement))  # Cap at 1e6 for numerical stability


def calculate_total_fusion_enhancement(
    z1: int, 
    z2: int, 
    reduced_mass: float,
    energy_kev: float,
    distance: float = 1e-10,
    electron_density: float = 1e30,
    temperature: float = 300.0,
    coherence_length: float = 1e-9,
    mechanisms: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Calculate the total enhancement factor for fusion reactions.
    
    Args:
        z1: Atomic number of the first nucleus
        z2: Atomic number of the second nucleus
        reduced_mass: Reduced mass in kg
        energy_kev: Energy in keV
        distance: Distance between nuclei in meters
        electron_density: Electron density in m^-3
        temperature: Temperature in K
        coherence_length: Quantum coherence length in meters
        mechanisms: List of mechanisms to include
        
    Returns:
        Dictionary with enhancement factors and details
    """
    # Default mechanisms
    if mechanisms is None:
        mechanisms = [
            "proximity", "screening", "fluctuation", 
            "resonance", "quantum"
        ]
    
    # Calculate individual enhancement factors
    factors = {}
    
    if "proximity" in mechanisms:
        factors["proximity"] = calculate_proximity_enhancement(z1, z2, distance)
    
    if "screening" in mechanisms:
        factors["screening"] = calculate_screening_enhancement(
            z1, z2, electron_density, temperature
        )
    
    if "fluctuation" in mechanisms:
        factors["fluctuation"] = calculate_fluctuation_enhancement(temperature)
    
    if "resonance" in mechanisms:
        factors["resonance"] = calculate_resonance_enhancement(energy_kev)
    
    if "quantum" in mechanisms:
        factors["quantum"] = calculate_quantum_enhancement(coherence_length)
    
    # Calculate total enhancement
    total_enhancement = 1.0
    for mechanism in factors:
        total_enhancement *= factors[mechanism]
    
    # Calculate Gamow factor
    gamow_factor = calculate_gamow_factor(z1, z2, reduced_mass, energy_kev)
    
    # Calculate base tunneling probability
    base_probability = np.exp(-gamow_factor)
    
    # Calculate enhanced probability
    enhanced_probability = min(1.0, base_probability * total_enhancement)
    
    # Calculate log enhancement for easier representation
    log_enhancement = np.log10(total_enhancement) if total_enhancement > 0 else 0.0
    
    return {
        "base_probability": float(base_probability),
        "enhanced_probability": float(enhanced_probability),
        "total_enhancement": float(total_enhancement),
        "log_enhancement": float(log_enhancement),
        "gamow_factor": float(gamow_factor),
        "individual_factors": factors,
        "mechanisms_used": mechanisms
    }


def evaluate_fusion_scenario(
    reaction_name: str,
    temperature: float,
    density: float,
    mechanisms: Optional[List[str]] = None,
    custom_params: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Evaluate a complete fusion scenario with all enhancement factors.
    
    Args:
        reaction_name: Name of the fusion reaction
        temperature: Temperature in K
        density: Reactant density in m^-3
        mechanisms: List of enhancement mechanisms to include
        custom_params: Custom parameters for specific enhancement calculations
        
    Returns:
        Dictionary with complete evaluation results
    """
    # Use singleton calculator for calculations
    return calculator.calculate_reaction_rate(
        reaction_name, temperature, density, density, mechanisms
    )


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