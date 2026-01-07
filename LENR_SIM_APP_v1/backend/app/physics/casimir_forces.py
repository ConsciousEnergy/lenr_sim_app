"""
Casimir Forces calculations for LENR_Sim_App

This module implements the Casimir force calculations described in the Unified LENR Theory.
Nanoscale confinement of hydrogen/deuterium in metal lattices creates conditions
where Casimir forces become significant for nuclear interactions.

Key concepts:
- Quantum vacuum fluctuations in nanocavities induce Casimir forces
- These forces contribute to local confinement and potential barrier modifications
- In confined geometries, Casimir effects can modify nuclear interaction potentials
- These effects provide additional pressure-like enhancement factors for LENR
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
import math
import logging

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("casimir_forces", "logs/physics.log")

# Physical constants
HBAR = const.hbar  # Reduced Planck constant in J·s
SPEED_OF_LIGHT = const.c  # Speed of light in m/s
VACUUM_PERMITTIVITY = const.epsilon_0  # Vacuum permittivity
EV_TO_J = const.e  # Conversion from eV to Joules
PA_TO_GPA = 1e-9  # Convert Pascal to Gigapascal


def calculate_casimir_energy(
    distance: float,
    area: float,
    geometric_factor: float = 1.0
) -> float:
    """
    Calculate the Casimir interaction energy between two surfaces.
    
    Args:
        distance: Distance between surfaces in meters
        area: Effective interaction area in m²
        geometric_factor: Factor describing the geometric dependence
        
    Returns:
        Casimir energy in Joules
    """
    # Safety check for inputs
    if distance <= 0 or area <= 0:
        logger.warning("Distance and area must be positive")
        return 0.0
    
    # Calculate Casimir energy using formula from the paper:
    # E_Casimir = -(π²ħc/720) * (A/d³) * f(r/d)
    # where f(r/d) is a geometric factor
    
    casimir_energy = -(np.pi**2 * HBAR * SPEED_OF_LIGHT / 720) * (area / distance**3) * geometric_factor
    
    logger.debug(f"Casimir energy for d={distance:.2e} m: {casimir_energy:.2e} J")
    
    return casimir_energy


def calculate_casimir_force(
    distance: float,
    area: float
) -> float:
    """
    Calculate the Casimir force between two conducting surfaces.
    
    Args:
        distance: Distance between surfaces in meters
        area: Surface area in m²
        
    Returns:
        Casimir force in Newtons
    """
    # Safety check for inputs
    if distance <= 0 or area <= 0:
        logger.warning("Distance and area must be positive")
        return 0.0
    
    # Calculate Casimir force using formula from the paper:
    # F_Casimir = -(π²ħc/240) * (A/d⁴)
    
    casimir_force = -(np.pi**2 * HBAR * SPEED_OF_LIGHT / 240) * (area / distance**4)
    
    logger.debug(f"Casimir force for d={distance:.2e} m: {casimir_force:.2e} N")
    
    return casimir_force


def calculate_casimir_pressure(
    distance: float
) -> float:
    """
    Calculate the Casimir pressure between two parallel plates.
    
    Args:
        distance: Distance between plates in meters
        
    Returns:
        Casimir pressure in Pascals
    """
    # Safety check for distance
    if distance <= 0:
        logger.warning("Distance must be positive")
        return 0.0
    
    # Calculate Casimir pressure using formula:
    # P_Casimir = -(π²ħc/240) * (1/d⁴)
    
    casimir_pressure = -(np.pi**2 * HBAR * SPEED_OF_LIGHT / 240) * (1 / distance**4)
    
    logger.debug(f"Casimir pressure for d={distance:.2e} m: {casimir_pressure:.2e} Pa")
    
    return casimir_pressure


def geometric_function(r_ratio: float) -> float:
    """
    Calculate the geometric function f(r/d) describing how Casimir effects
    scale with the ratio of distance to characteristic dimension.
    
    Args:
        r_ratio: Ratio of r/d (e.g., ratio of nuclear distance to cavity size)
        
    Returns:
        Geometric factor (dimensionless)
    """
    # This is a model function based on the paper's description
    # For small r/d ratios, the effect is strongest
    if r_ratio <= 0:
        return 0.0
    elif r_ratio < 0.1:
        return 1.0 - r_ratio**2
    elif r_ratio < 0.5:
        return 0.5 * (1.0 - r_ratio)
    else:
        return np.exp(-r_ratio) * 0.1
    
    
def calculate_barrier_modification(
    nuclear_distance: float,
    cavity_size: float,
    area: float = 1e-18
) -> float:
    """
    Calculate the modification to the Coulomb barrier due to Casimir effects.
    
    Args:
        nuclear_distance: Distance between nuclei in meters
        cavity_size: Size of the nanocavity in meters
        area: Effective interaction area in m²
        
    Returns:
        Barrier modification in eV
    """
    # Calculate r/d ratio
    r_ratio = nuclear_distance / cavity_size
    
    # Get geometric factor
    geo_factor = geometric_function(r_ratio)
    
    # Calculate Casimir energy
    casimir_e = calculate_casimir_energy(cavity_size, area, geo_factor)
    
    # Convert to eV
    casimir_e_eV = casimir_e / EV_TO_J
    
    # The barrier modification is the contribution to the nuclear potential
    # For simplicity, we'll use the Casimir energy directly
    # In a more sophisticated model, we would integrate this into the WKB calculation
    
    return casimir_e_eV


def calculate_confinement_pressure(cavity_size: float) -> float:
    """
    Calculate the confinement pressure in a nanocavity due to Casimir effects.
    
    Args:
        cavity_size: Size of the nanocavity in meters
        
    Returns:
        Confinement pressure in GPa
    """
    # Calculate Casimir pressure
    pressure_pa = calculate_casimir_pressure(cavity_size)
    
    # Convert to GPa for easier interpretation
    pressure_gpa = abs(pressure_pa) * PA_TO_GPA
    
    return pressure_gpa


def calculate_casimir_enhancement(
    nuclear_distance: float,
    cavity_size: float,
    base_tunneling_prob: float
) -> Dict[str, Any]:
    """
    Calculate the enhancement to tunneling probability due to Casimir effects.
    
    Args:
        nuclear_distance: Distance between nuclei in meters
        cavity_size: Size of the nanocavity in meters
        base_tunneling_prob: Base tunneling probability without enhancement
        
    Returns:
        Dictionary with Casimir enhancement results
    """
    # Effective interaction area (approximate)
    effective_area = np.pi * (cavity_size * 0.5)**2
    
    # Calculate barrier modification
    barrier_mod = calculate_barrier_modification(
        nuclear_distance, cavity_size, effective_area
    )
    
    # Calculate confinement pressure
    pressure = calculate_confinement_pressure(cavity_size)
    
    # Calculate force
    force = calculate_casimir_force(cavity_size, effective_area)
    
    # Calculate enhancement factor
    # This is a simplified model - in reality, would require
    # a full quantum mechanical calculation
    
    # Enhancement has two components:
    # 1. Direct modification of the potential barrier
    # 2. Pressure/confinement effects that compress the system
    
    # 1. Direct barrier effect (simplified)
    barrier_effect = np.exp(min(20.0, abs(barrier_mod) / 0.01))
    
    # 2. Pressure effect (simplified)
    # Pressure reduces effective tunneling distance
    distance_factor = 1.0 - min(0.3, pressure / 10.0)  # max 30% reduction
    pressure_effect = np.exp(min(10.0, 1.0 / distance_factor - 1.0))
    
    # Combined enhancement
    combined_enhancement = barrier_effect * pressure_effect
    
    # Limit to realistic values based on paper
    log_enhancement = min(3.0, np.log10(combined_enhancement))
    capped_enhancement = 10**log_enhancement
    
    # Enhanced tunneling probability
    enhanced_prob = base_tunneling_prob * capped_enhancement
    
    # Prepare results
    results = {
        "barrier_modification_eV": barrier_mod,
        "confinement_pressure_GPa": pressure,
        "casimir_force_N": force,
        "barrier_effect": barrier_effect,
        "pressure_effect": pressure_effect,
        "enhancement_factor": capped_enhancement,
        "log_enhancement": log_enhancement,
        "enhanced_probability": enhanced_prob,
        "metadata": {
            "nuclear_distance_m": nuclear_distance,
            "cavity_size_m": cavity_size,
            "cavity_size_nm": cavity_size * 1e9,
            "effective_area_m2": effective_area
        }
    }
    
    return results


def analyze_nanocavity_effects(
    cavity_sizes: List[float],
    nuclear_distance: float = 1e-10,
    base_tunneling_prob: float = 1e-50
) -> Dict[str, Any]:
    """
    Analyze Casimir effects for a range of nanocavity sizes.
    
    Args:
        cavity_sizes: List of cavity sizes in meters
        nuclear_distance: Distance between nuclei in meters
        base_tunneling_prob: Base tunneling probability without enhancement
        
    Returns:
        Dictionary with analysis results
    """
    results = {
        "cavity_sizes": cavity_sizes,
        "nuclear_distance": nuclear_distance,
        "pressures": [],
        "forces": [],
        "barrier_mods": [],
        "enhancement_factors": [],
        "enhanced_probs": []
    }
    
    # Calculate effects for each cavity size
    for size in cavity_sizes:
        enhancement_data = calculate_casimir_enhancement(
            nuclear_distance, size, base_tunneling_prob
        )
        
        results["pressures"].append(enhancement_data["confinement_pressure_GPa"])
        results["forces"].append(enhancement_data["casimir_force_N"])
        results["barrier_mods"].append(enhancement_data["barrier_modification_eV"])
        results["enhancement_factors"].append(enhancement_data["enhancement_factor"])
        results["enhanced_probs"].append(enhancement_data["enhanced_probability"])
    
    # Find optimal cavity size
    if results["enhancement_factors"]:
        opt_idx = np.argmax(results["enhancement_factors"])
        results["optimal_size_m"] = cavity_sizes[opt_idx]
        results["optimal_size_nm"] = cavity_sizes[opt_idx] * 1e9
        results["max_enhancement"] = results["enhancement_factors"][opt_idx]
    else:
        results["optimal_size_m"] = 0.0
        results["optimal_size_nm"] = 0.0
        results["max_enhancement"] = 1.0
    
    return results 