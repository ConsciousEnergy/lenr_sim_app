"""
Rydberg Matter (RM) calculations for LENR_Sim_App

This module implements the Rydberg Matter calculations described in the Unified LENR Theory.
Rydberg Matter plays a central role in LENR processes, functioning as both an energy 
mediator and a catalyst for nuclear reactions.

Functions:
- Calculate energy levels and properties of Rydberg atoms
- Model formation of Rydberg Matter at metal-hydrogen interfaces
- Calculate enhancement factors due to RM effects
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
import math
import logging

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("rydberg_matter", "logs/physics.log")

# Physical constants
RYDBERG_ENERGY = 13.6  # eV
BOHR_RADIUS = const.physical_constants["Bohr radius"][0]  # in meters
BOLTZMANN = const.k  # Boltzmann constant in J/K
EV_TO_J = const.e  # Conversion from eV to Joules


def calculate_rydberg_energy(n: int) -> float:
    """
    Calculate the energy level of a Rydberg atom at principal quantum number n.
    
    Args:
        n: Principal quantum number
        
    Returns:
        Energy in eV
    """
    if n <= 0:
        logger.warning(f"Invalid principal quantum number: {n}, using n=1")
        n = 1
        
    # E_n = -13.6 eV / n^2
    return -RYDBERG_ENERGY / (n**2)


def calculate_orbital_radius(n: int) -> float:
    """
    Calculate the orbital radius of a Rydberg atom at principal quantum number n.
    
    Args:
        n: Principal quantum number
        
    Returns:
        Orbital radius in meters
    """
    if n <= 0:
        logger.warning(f"Invalid principal quantum number: {n}, using n=1")
        n = 1
        
    # r_n = a_0 * n^2, where a_0 is the Bohr radius
    return BOHR_RADIUS * (n**2)


def calculate_binding_energy(n: int) -> float:
    """
    Calculate the binding energy of an electron in a Rydberg state.
    
    Args:
        n: Principal quantum number
        
    Returns:
        Binding energy in eV (absolute value)
    """
    return abs(calculate_rydberg_energy(n))


def calculate_formation_probability(
    temperature: float,
    surface_field: float,
    material: str = "Pd"
) -> float:
    """
    Calculate the probability of Rydberg Matter formation at a metal-hydrogen interface.
    
    Args:
        temperature: Temperature in Kelvin
        surface_field: Electric field at the surface in V/m
        material: Host material ("Pd", "Ni", etc.)
        
    Returns:
        Formation probability (0-1)
    """
    # Base formation probability depends on material
    if material.lower() == "pd":
        base_prob = 0.8
    elif material.lower() == "ni":
        base_prob = 0.7
    else:
        base_prob = 0.5
        
    # Temperature effect: formation is more likely in a specific range
    # Optimal temperature around 300-500K
    temp_factor = np.exp(-(temperature - 400)**2 / 40000)
    
    # Field effect: higher fields promote formation
    # Field threshold around 10^7 V/m
    field_threshold = 1e7
    field_factor = min(1.0, surface_field / field_threshold)
    
    # Combined probability
    probability = base_prob * temp_factor * field_factor
    
    return min(1.0, probability)


def calculate_rydberg_enhancement(
    n: int,
    density: float,
    temperature: float
) -> float:
    """
    Calculate the tunneling enhancement factor due to Rydberg Matter effects.
    
    Args:
        n: Principal quantum number of Rydberg atoms
        density: Density of Rydberg Matter in atoms/m^3
        temperature: Temperature in Kelvin
        
    Returns:
        Enhancement factor (multiplier)
    """
    # Enhancement increases with principal quantum number
    # Higher n means more extended orbitals and stronger enhancement
    n_factor = n**2
    
    # Density effect: higher density means more collective effects
    # Density threshold for collective effects
    density_threshold = 1e24  # atoms/m^3
    density_factor = min(100.0, density / density_threshold)
    
    # Temperature effect: lower temperatures stabilize Rydberg Matter
    temp_factor = 300.0 / temperature if temperature > 0 else 1.0
    
    # Base enhancement calculation
    # This model combines theories from the paper:
    # - Extended electron orbitals create effective screening
    # - Collective quantum behaviors enhance tunneling
    base_enhancement = n_factor * density_factor * temp_factor
    
    # Limit enhancement to reasonable values
    # The paper suggests enhancements of 10^3-10^5 are possible
    log_enhancement = min(5.0, np.log10(base_enhancement))
    
    # Final enhancement factor
    enhancement = 10**log_enhancement
    
    logger.debug(f"Rydberg enhancement: n={n}, factor={enhancement:.2e}")
    
    return enhancement


def calculate_energy_transfer_efficiency(
    n: int,
    coupling_strength: float
) -> float:
    """
    Calculate the efficiency of energy transfer in Rydberg Matter.
    
    Args:
        n: Principal quantum number
        coupling_strength: Coupling strength parameter (0-1)
        
    Returns:
        Energy transfer efficiency (0-1)
    """
    # Basic efficiency calculation based on quantum number
    # Higher n states have more efficient energy transfer
    n_efficiency = 1.0 - 1.0/n
    
    # Coupling effect
    coupling_effect = coupling_strength**2
    
    # Combined efficiency
    efficiency = n_efficiency * coupling_effect
    
    return min(1.0, efficiency)


def estimate_coherent_domain_size(
    n: int,
    density: float,
    temperature: float
) -> float:
    """
    Estimate the size of coherent domains in Rydberg Matter.
    
    Args:
        n: Principal quantum number
        density: Density of Rydberg Matter in atoms/m^3
        temperature: Temperature in Kelvin
        
    Returns:
        Domain size in meters
    """
    # Base domain size related to orbital radius
    base_size = calculate_orbital_radius(n) * 10.0
    
    # Density effect: higher density can increase domain size
    density_factor = (density / 1e24)**0.333  # cubic root for 3D scaling
    
    # Temperature effect: lower temperatures favor larger domains
    temp_factor = (300.0 / temperature)**0.5 if temperature > 0 else 1.0
    
    # Combined domain size
    domain_size = base_size * density_factor * temp_factor
    
    return domain_size


def analyze_rydberg_system(
    n_range: List[int],
    temperature: float,
    surface_field: float,
    material: str = "Pd"
) -> Dict[str, Any]:
    """
    Perform a comprehensive analysis of a Rydberg Matter system.
    
    Args:
        n_range: List of principal quantum numbers to analyze
        temperature: Temperature in Kelvin
        surface_field: Electric field at the surface in V/m
        material: Host material
        
    Returns:
        Dictionary with analysis results
    """
    results = {
        "formation_probability": calculate_formation_probability(
            temperature, surface_field, material
        ),
        "energy_levels": [],
        "enhancement_factors": [],
        "domain_sizes": []
    }
    
    # Density estimate based on material and conditions
    if material.lower() == "pd":
        density_base = 5e24  # atoms/m^3
    elif material.lower() == "ni":
        density_base = 4e24  # atoms/m^3
    else:
        density_base = 3e24  # atoms/m^3
        
    # Adjust density based on conditions
    density = density_base * results["formation_probability"]
    
    # Calculate properties for each quantum number
    for n in n_range:
        energy = calculate_rydberg_energy(n)
        enhancement = calculate_rydberg_enhancement(n, density, temperature)
        domain_size = estimate_coherent_domain_size(n, density, temperature)
        
        results["energy_levels"].append({
            "n": n,
            "energy_eV": energy,
            "binding_energy_eV": abs(energy),
            "orbital_radius_m": calculate_orbital_radius(n)
        })
        
        results["enhancement_factors"].append({
            "n": n,
            "enhancement": enhancement,
            "log_enhancement": np.log10(enhancement) if enhancement > 0 else 0
        })
        
        results["domain_sizes"].append({
            "n": n,
            "domain_size_m": domain_size,
            "domain_size_nm": domain_size * 1e9
        })
    
    # Calculate optimal n value
    if results["enhancement_factors"]:
        opt_idx = np.argmax([ef["enhancement"] for ef in results["enhancement_factors"]])
        results["optimal_n"] = n_range[opt_idx]
        results["max_enhancement"] = results["enhancement_factors"][opt_idx]["enhancement"]
    else:
        results["optimal_n"] = 0
        results["max_enhancement"] = 1.0
    
    return results 