"""
Electron Screening and Halo Electron calculations for LENR_Sim_App

This module implements electron screening effects and halo electron calculations
described in the Unified LENR Theory.

Key concepts:
- Electron screening reduces the effective Coulomb barrier between nuclei
- Halo electrons are weakly bound, spatially extended electron states
- The wavefunction of halo electrons extends significantly beyond classical orbital boundaries
- These effects contribute to enhanced tunneling probabilities in LENR
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
import math
import logging

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("electron_screening", "logs/physics.log")

# Physical constants
HBAR = const.hbar  # Reduced Planck constant
ELECTRON_MASS = const.m_e  # Electron mass in kg
ELECTRON_CHARGE = const.e  # Elementary charge in C
VACUUM_PERMITTIVITY = const.epsilon_0  # Vacuum permittivity
EV_TO_J = const.e  # Conversion from eV to Joules


def calculate_decay_length(binding_energy_eV: float) -> float:
    """
    Calculate the characteristic decay length of a halo electron wavefunction.
    
    Args:
        binding_energy_eV: Binding energy in eV
        
    Returns:
        Decay length in meters
    """
    # Convert binding energy from eV to J
    binding_energy_J = binding_energy_eV * EV_TO_J
    
    # Ensure binding energy is positive
    binding_energy_J = abs(binding_energy_J)
    
    # Prevent division by zero or very small values
    if binding_energy_J < 1e-10 * EV_TO_J:
        binding_energy_J = 1e-10 * EV_TO_J
        logger.warning(f"Binding energy too small, using minimum value")
    
    # Calculate decay length using formula from paper:
    # λ = ħ/√(2m_e E_b)
    decay_length = HBAR / np.sqrt(2 * ELECTRON_MASS * binding_energy_J)
    
    logger.debug(f"Decay length for binding energy {binding_energy_eV} eV: {decay_length:.2e} m")
    
    return decay_length


def calculate_screening_potential(distance: float, screening_length: float) -> float:
    """
    Calculate the screened potential between two charged particles.
    
    Args:
        distance: Distance between particles in meters
        screening_length: Screening length in meters
        
    Returns:
        Screened potential in eV
    """
    # Prevent division by zero
    if distance < 1e-15:
        distance = 1e-15
        logger.warning("Distance too small, using minimum value")
    
    # Calculate Coulomb potential with exponential screening:
    # V_screen(r) = (e^2)/(4πε₀r) * exp(-r/λ_s)
    coulomb_factor = ELECTRON_CHARGE**2 / (4 * np.pi * VACUUM_PERMITTIVITY)
    
    # Calculate screened potential
    potential_J = coulomb_factor / distance * np.exp(-distance / screening_length)
    
    # Convert from J to eV
    potential_eV = potential_J / EV_TO_J
    
    return potential_eV


def calculate_screening_length(
    temperature: float,
    electron_density: float,
    material_type: str = "metal"
) -> float:
    """
    Calculate the screening length for a given material and conditions.
    
    Args:
        temperature: Temperature in Kelvin
        electron_density: Electron density in electrons/m^3
        material_type: Type of material ("metal", "semiconductor", "insulator")
        
    Returns:
        Screening length in meters
    """
    # For metals, use Thomas-Fermi screening length
    # For semiconductors and insulators, use Debye-Hückel screening length
    
    if material_type.lower() == "metal":
        # Thomas-Fermi screening length
        # λ_TF = √(ε₀ π ħ^2 / (me e^2 k_F))
        # where k_F is the Fermi wavevector: k_F = (3π^2 n_e)^(1/3)
        
        # Calculate Fermi wavevector
        k_F = (3 * np.pi**2 * electron_density)**(1/3)
        
        # Calculate Thomas-Fermi screening length
        screening_length = np.sqrt(VACUUM_PERMITTIVITY * np.pi * HBAR**2 / 
                                  (ELECTRON_MASS * ELECTRON_CHARGE**2 * k_F))
    else:
        # Debye-Hückel screening length
        # λ_D = √(ε₀ k_B T / (n_e e^2))
        
        # Prevent division by zero or negative temperature
        if temperature <= 0:
            temperature = 300  # Default to room temperature
            logger.warning("Temperature must be positive, using 300K")
        
        # Calculate Debye screening length
        screening_length = np.sqrt(VACUUM_PERMITTIVITY * const.k * temperature / 
                                  (electron_density * ELECTRON_CHARGE**2))
    
    logger.debug(f"Screening length for {material_type}: {screening_length:.2e} m")
    
    return screening_length


def calculate_wavefunction_overlap(
    nuclear_radius: float,
    decay_length: float
) -> float:
    """
    Calculate the probability of wavefunction overlap between an electron and nucleus.
    
    Args:
        nuclear_radius: Radius of the nucleus in meters
        decay_length: Decay length of the electron wavefunction in meters
        
    Returns:
        Overlap probability
    """
    # This is a simplified model based on the paper's formula:
    # P_overlap = ∫ |ψ_interface(r) ψ_nucleus(r)|^2 dr
    
    # For simplicity, we'll use an approximation based on penetration into nuclear radius
    # P ~ exp(-2r_nucleus/λ)
    overlap_prob = np.exp(-2 * nuclear_radius / decay_length)
    
    # Log for small values
    if overlap_prob < 1e-10:
        logger.debug(f"Very small wavefunction overlap: {overlap_prob:.2e}")
    
    return overlap_prob


def calculate_barrier_reduction(
    distance: float,
    screening_length: float,
    z1: int = 1,
    z2: int = 1
) -> float:
    """
    Calculate the reduction in the Coulomb barrier due to electron screening.
    
    Args:
        distance: Distance between nuclei in meters
        screening_length: Screening length in meters
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        
    Returns:
        Barrier reduction in eV
    """
    # Calculate unscreened Coulomb potential
    coulomb_factor = ELECTRON_CHARGE**2 / (4 * np.pi * VACUUM_PERMITTIVITY)
    unscreened_pot_J = z1 * z2 * coulomb_factor / distance
    
    # Calculate screened potential
    screened_pot_J = unscreened_pot_J * np.exp(-distance / screening_length)
    
    # Barrier reduction is the difference
    reduction_J = unscreened_pot_J - screened_pot_J
    
    # Convert to eV
    reduction_eV = reduction_J / EV_TO_J
    
    return reduction_eV


def calculate_screening_enhancement(
    temperature: float,
    distance: float,
    electron_density: float,
    z1: int = 1,
    z2: int = 1,
    material: str = "pd"
) -> Dict[str, Any]:
    """
    Calculate the overall enhancement factor due to electron screening.
    
    Args:
        temperature: Temperature in Kelvin
        distance: Distance between nuclei in meters
        electron_density: Electron density in electrons/m^3
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        material: Host material ("pd", "ni", etc.)
        
    Returns:
        Dictionary with screening results including enhancement factor
    """
    # Determine material type
    material = material.lower()
    if material in ["pd", "ni", "pt", "ti"]:
        material_type = "metal"
    else:
        material_type = "other"
    
    # Calculate screening length for the given conditions
    screening_length = calculate_screening_length(
        temperature, electron_density, material_type
    )
    
    # Calculate binding energy (material-dependent)
    # These are approximate values for weakly bound electrons
    if material == "pd":
        binding_energy_eV = 0.2
    elif material == "ni":
        binding_energy_eV = 0.25
    else:
        binding_energy_eV = 0.3
    
    # Calculate decay length of electron wavefunction
    decay_length = calculate_decay_length(binding_energy_eV)
    
    # Calculate barrier reduction
    barrier_reduction = calculate_barrier_reduction(
        distance, screening_length, z1, z2
    )
    
    # Nuclear radius (approximate)
    nuclear_radius = 1.2e-15 * (z1**(1/3) + z2**(1/3))
    
    # Calculate wavefunction overlap probability
    overlap_prob = calculate_wavefunction_overlap(nuclear_radius, decay_length)
    
    # Base tunneling probability (simplified)
    # Will be replaced by proper calculation from tunneling_engine.py
    base_tunneling_prob = np.exp(-2 * np.pi * z1 * z2 * ELECTRON_CHARGE**2 / 
                               (HBAR * np.sqrt(2 * const.m_p * 1 * EV_TO_J)))
    
    # Enhanced tunneling probability with screening
    gamow_factor = 2 * np.pi * z1 * z2 * ELECTRON_CHARGE**2 / HBAR
    tunneling_reduction = (barrier_reduction * EV_TO_J / 
                          (np.sqrt(2 * const.m_p * 1 * EV_TO_J)))
    
    enhanced_tunneling_prob = np.exp(-gamow_factor * (1 - tunneling_reduction))
    
    # Calculate enhancement factor
    enhancement_factor = enhanced_tunneling_prob / base_tunneling_prob
    
    # Limit to realistic values based on paper (10^3-10^5)
    log_enhancement = min(5.0, np.log10(enhancement_factor) if enhancement_factor > 0 else 0)
    capped_enhancement = 10**log_enhancement
    
    # Prepare results
    results = {
        "screening_length_m": screening_length,
        "decay_length_m": decay_length,
        "barrier_reduction_eV": barrier_reduction,
        "overlap_probability": overlap_prob,
        "enhancement_factor": capped_enhancement,
        "log_enhancement": log_enhancement,
        "metadata": {
            "temperature_K": temperature,
            "distance_m": distance,
            "electron_density_m3": electron_density,
            "material": material,
            "z1": z1,
            "z2": z2
        }
    }
    
    return results 