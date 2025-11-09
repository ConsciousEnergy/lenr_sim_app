"""
Double-Layer QED Effects calculations for LENR_Sim_App

This module implements the Double-Layer Quantum Electrodynamic (QED) effects
described in the Unified LENR Theory.

Key concepts:
- QED effects at material interfaces influence nuclear interactions
- Modified vacuum energy density at interfaces affects the effective nuclear potential
- Boundary conditions for electromagnetic fields at interfaces create unique conditions
- These effects contribute to enhanced tunneling probabilities in LENR
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
import math
import logging

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("qed_effects", "logs/physics.log")

# Physical constants
HBAR = const.hbar  # Reduced Planck constant in J·s
SPEED_OF_LIGHT = const.c  # Speed of light in m/s
FINE_STRUCTURE = const.alpha  # Fine structure constant
ELECTRON_CHARGE = const.e  # Elementary charge in C
VACUUM_PERMITTIVITY = const.epsilon_0  # Vacuum permittivity
EV_TO_J = const.e  # Conversion from eV to Joules


def calculate_interface_function(epsilon1: float, epsilon2: float) -> float:
    """
    Calculate the interface function that depends on dielectric constants.
    
    Args:
        epsilon1: Dielectric constant of first material
        epsilon2: Dielectric constant of second material
        
    Returns:
        Interface function value (dimensionless)
    """
    # This function represents f(ε₁, ε₂) in the paper's formula
    # A simplified model based on the difference in dielectric constants
    
    # Prevent division by zero
    if epsilon1 <= 0 or epsilon2 <= 0:
        logger.warning("Dielectric constants must be positive")
        return 0.0
    
    # Calculate the interface function
    # Greater contrast in dielectric constants strengthens the effect
    contrast_factor = abs(epsilon1 - epsilon2) / (epsilon1 + epsilon2)
    
    # Apply non-linear scaling based on theory
    f_value = contrast_factor**2 * (1 + 2 * contrast_factor)
    
    return f_value


def calculate_qed_potential_modification(
    distance: float,
    epsilon1: float,
    epsilon2: float
) -> float:
    """
    Calculate the modification to the nuclear potential due to QED effects.
    
    Args:
        distance: Characteristic distance in meters
        epsilon1: Dielectric constant of first material
        epsilon2: Dielectric constant of second material
        
    Returns:
        Potential modification in eV
    """
    # Safety check for distance
    if distance <= 0:
        logger.warning("Distance must be positive")
        return 0.0
    
    # Calculate interface function
    f_interface = calculate_interface_function(epsilon1, epsilon2)
    
    # Calculate the QED potential modification using formula from the paper:
    # ΔV_QED = α (ħc/d³) f(ε₁, ε₂)
    # where α is the fine structure constant
    
    delta_V_J = FINE_STRUCTURE * (HBAR * SPEED_OF_LIGHT / distance**3) * f_interface
    
    # Convert from J to eV
    delta_V_eV = delta_V_J / EV_TO_J
    
    logger.debug(f"QED potential modification: {delta_V_eV:.2e} eV")
    
    return delta_V_eV


def calculate_electric_field(
    potential_difference: float,
    distance: float
) -> float:
    """
    Calculate the electric field strength for a given potential difference and distance.
    
    Args:
        potential_difference: Potential difference in volts
        distance: Distance in meters
        
    Returns:
        Electric field strength in V/m
    """
    # Safety check
    if distance <= 0:
        logger.warning("Distance must be positive")
        return 0.0
    
    # Calculate electric field: E = ΔV/d
    field_strength = potential_difference / distance
    
    return field_strength


def calculate_field_enhancement_factor(
    geometry_factor: float,
    material_factor: float = 1.0
) -> float:
    """
    Calculate the field enhancement factor due to nanostructure geometry.
    
    Args:
        geometry_factor: Factor representing sharpness (>1 for nanoscale features)
        material_factor: Material-dependent factor
        
    Returns:
        Field enhancement factor
    """
    # Simplified model for field enhancement
    # In real systems, this would be calculated using finite element analysis
    
    # Basic enhancement from geometry
    enhancement = geometry_factor * material_factor
    
    # Limit to reasonable values
    enhancement = min(1000.0, enhancement)
    
    return enhancement


def calculate_double_layer_properties(
    temperature: float,
    material: str,
    electrolyte_concentration: float,
    applied_voltage: float
) -> Dict[str, Any]:
    """
    Calculate properties of an electrochemical double layer.
    
    Args:
        temperature: Temperature in Kelvin
        material: Electrode material
        electrolyte_concentration: Concentration in mol/L
        applied_voltage: Applied voltage in V
        
    Returns:
        Dictionary with double layer properties
    """
    # Material-specific dielectric constants (approximate values)
    material_dielectric = {
        "pd": 12.0,
        "ni": 10.0,
        "pt": 8.0,
        "ti": 86.0,
        "water": 80.0,
        "d2o": 78.0
    }
    
    # Get dielectric constant for the material
    epsilon_material = material_dielectric.get(material.lower(), 10.0)
    
    # Electrolyte dielectric constant (approximate, depends on concentration)
    epsilon_electrolyte = material_dielectric.get("water", 80.0) * (1.0 - 0.05 * electrolyte_concentration)
    
    # Debye length in electrolyte (simplified)
    # λD = √(ε₀εᵣkBT / (2NAe²I))
    # where I is the ionic strength in mol/m³
    
    # Convert concentration from mol/L to mol/m³
    concentration_m3 = electrolyte_concentration * 1000
    
    # Calculate Debye length
    debye_length = np.sqrt(VACUUM_PERMITTIVITY * epsilon_electrolyte * const.k * temperature / 
                          (2 * const.N_A * ELECTRON_CHARGE**2 * concentration_m3))
    
    # Double layer thickness (approximate)
    double_layer_thickness = debye_length
    
    # Field strength in the double layer
    field_strength = calculate_electric_field(applied_voltage, double_layer_thickness)
    
    # QED potential modification
    qed_modification = calculate_qed_potential_modification(
        double_layer_thickness, epsilon_material, epsilon_electrolyte
    )
    
    # Prepare results
    results = {
        "debye_length_m": debye_length,
        "double_layer_thickness_m": double_layer_thickness,
        "field_strength_V_m": field_strength,
        "qed_potential_eV": qed_modification,
        "epsilon_material": epsilon_material,
        "epsilon_electrolyte": epsilon_electrolyte,
        "metadata": {
            "temperature_K": temperature,
            "material": material,
            "electrolyte_concentration_mol_L": electrolyte_concentration,
            "applied_voltage_V": applied_voltage
        }
    }
    
    return results


def calculate_qed_enhancement(
    distance: float,
    epsilon1: float, 
    epsilon2: float,
    temperature: float,
    applied_field: float
) -> Dict[str, Any]:
    """
    Calculate the enhancement factor due to QED effects.
    
    Args:
        distance: Characteristic distance in meters
        epsilon1: Dielectric constant of first material
        epsilon2: Dielectric constant of second material
        temperature: Temperature in Kelvin
        applied_field: Applied electric field in V/m
        
    Returns:
        Dictionary with QED enhancement results
    """
    # Calculate QED potential modification
    qed_potential = calculate_qed_potential_modification(distance, epsilon1, epsilon2)
    
    # Convert to barrier reduction factor
    # This is a simplification - in reality would use WKB approximation
    # to calculate tunneling through modified potential
    
    # Typical Coulomb barrier at this distance (approximate)
    coulomb_barrier = ELECTRON_CHARGE**2 / (4 * np.pi * VACUUM_PERMITTIVITY * distance) / EV_TO_J
    
    # Energy available from thermal fluctuations
    thermal_energy = const.k * temperature / EV_TO_J
    
    # Calculate relative reduction in barrier
    if coulomb_barrier > 0:
        barrier_reduction_factor = qed_potential / coulomb_barrier
    else:
        barrier_reduction_factor = 0.0
    
    # Field contribution to enhancement
    field_contribution = min(10.0, np.sqrt(applied_field / 1e8))
    
    # Calculate enhancement factor
    # Base enhancement from exponential of barrier reduction
    base_enhancement = np.exp(min(50.0, barrier_reduction_factor * 100))
    
    # Combined enhancement with field effects
    total_enhancement = base_enhancement * field_contribution
    
    # Limit to realistic values based on paper (up to 10^3)
    log_enhancement = min(3.0, np.log10(total_enhancement) if total_enhancement > 0 else 0)
    capped_enhancement = 10**log_enhancement
    
    # Prepare results
    results = {
        "qed_potential_eV": qed_potential,
        "barrier_reduction_factor": barrier_reduction_factor,
        "field_contribution": field_contribution,
        "enhancement_factor": capped_enhancement,
        "log_enhancement": log_enhancement,
        "metadata": {
            "distance_m": distance,
            "epsilon1": epsilon1,
            "epsilon2": epsilon2,
            "temperature_K": temperature,
            "applied_field_V_m": applied_field
        }
    }
    
    return results 