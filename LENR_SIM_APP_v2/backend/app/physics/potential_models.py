"""
Potential Models Module for LENR_Sim_App

This module implements various potential energy models for LENR simulations,
including Coulomb potentials, nuclear potentials, and composite potentials
that incorporate quantum and relativistic corrections.
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
import math
import logging

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("potential_models", "logs/physics.log")

# Physical constants
HBAR = const.hbar  # Reduced Planck constant
KB = const.k  # Boltzmann constant
ELECTRON_MASS = const.m_e  # Electron mass
ELECTRON_CHARGE = const.e  # Elementary charge
PROTON_MASS = const.m_p  # Proton mass
NEUTRON_MASS = const.m_n  # Neutron mass
VACUUM_PERMITTIVITY = const.epsilon_0  # Vacuum permittivity
AMU = const.u  # Atomic mass unit
EV_TO_J = const.e  # Conversion factor from eV to Joules
KEV_TO_J = 1e3 * EV_TO_J  # Conversion from keV to Joules
MEV_TO_J = 1e6 * EV_TO_J  # Conversion from MeV to Joules
FERMI = 1e-15  # 1 Fermi = 1e-15 m


def calculate_coulomb_barrier(z1: int, z2: int, distance: Optional[float] = None) -> float:
    """
    Calculate the Coulomb barrier height between two nuclei
    
    Args:
        z1: Atomic number of the first nucleus
        z2: Atomic number of the second nucleus
        distance: Distance between nuclei in meters (optional)
        
    Returns:
        Coulomb barrier height in eV
    """
    # If distance not provided, use the approximate nuclear contact distance
    if distance is None:
        # Nuclear radius approximation: r ≈ 1.25 fm * A^(1/3)
        # We don't have mass numbers, so use Z as approximation
        a1_approx = max(1, 2 * z1)  # Approximate mass number
        a2_approx = max(1, 2 * z2)  # Approximate mass number
        
        r1 = 1.25 * FERMI * (a1_approx**(1/3))
        r2 = 1.25 * FERMI * (a2_approx**(1/3))
        
        # Distance at nuclear contact
        distance = r1 + r2
    
    # Coulomb potential: V(r) = (1/4πε₀) * (Z₁Z₂e²/r)
    coulomb_energy = (1 / (4 * np.pi * VACUUM_PERMITTIVITY)) * (z1 * z2 * ELECTRON_CHARGE**2 / distance)
    
    # Convert to eV
    coulomb_energy_ev = coulomb_energy / ELECTRON_CHARGE
    
    logger.debug(f"Calculated Coulomb barrier: {coulomb_energy_ev:.2f} eV for Z1={z1}, Z2={z2}")
    
    return float(coulomb_energy_ev)


def calculate_yukawa_potential(z1: int, z2: int, distance: float, screening_length: float) -> float:
    """
    Calculate the screened Coulomb (Yukawa) potential between two nuclei
    
    Args:
        z1: Atomic number of the first nucleus
        z2: Atomic number of the second nucleus
        distance: Distance between nuclei in meters
        screening_length: Screening length in meters
        
    Returns:
        Yukawa potential in eV
    """
    # Ensure positive distance and screening length
    distance = max(1e-16, distance)
    screening_length = max(1e-16, screening_length)
    
    # Yukawa potential: V(r) = (1/4πε₀) * (Z₁Z₂e²/r) * exp(-r/λ)
    coulomb_factor = (1 / (4 * np.pi * VACUUM_PERMITTIVITY)) * (z1 * z2 * ELECTRON_CHARGE**2 / distance)
    screening_factor = np.exp(-distance / screening_length)
    
    yukawa_energy = coulomb_factor * screening_factor
    
    # Convert to eV
    yukawa_energy_ev = yukawa_energy / ELECTRON_CHARGE
    
    return float(yukawa_energy_ev)


def calculate_nuclear_potential(a1: int, a2: int, distance: float, model: str = "woods-saxon") -> float:
    """
    Calculate the nuclear potential between two nuclei
    
    Args:
        a1: Mass number of the first nucleus
        a2: Mass number of the second nucleus
        distance: Distance between nuclei in meters
        model: Nuclear potential model to use
        
    Returns:
        Nuclear potential in eV
    """
    # Nuclear radius parameters
    r0 = 1.25 * FERMI  # Nuclear radius parameter
    a = 0.65 * FERMI   # Surface diffuseness
    
    # Calculate nuclear radii
    r1 = r0 * (a1**(1/3))
    r2 = r0 * (a2**(1/3))
    
    # Effective distance for potential
    effective_r = max(distance - (r1 + r2), -10 * a)  # Limit how negative it can go
    
    # Woods-Saxon potential
    if model == "woods-saxon":
        # Woods-Saxon parameters
        v0 = -50 * MEV_TO_J  # Depth of potential
        
        # Woods-Saxon form: V(r) = V₀/(1 + exp((r-R)/a))
        potential = v0 / (1 + np.exp(effective_r / a))
    
    # Square well potential
    elif model == "square-well":
        v0 = -50 * MEV_TO_J  # Depth of potential
        
        if effective_r <= 0:
            potential = v0
        else:
            potential = 0.0
    
    # Default to zero if unknown model
    else:
        potential = 0.0
    
    # Convert to eV
    potential_ev = potential / ELECTRON_CHARGE
    
    return float(potential_ev)


def calculate_total_potential(
    z1: int, 
    z2: int, 
    a1: int, 
    a2: int, 
    distance: float,
    include_nuclear: bool = True,
    include_screening: bool = False,
    screening_length: Optional[float] = None
) -> Dict[str, float]:
    """
    Calculate the total potential between two nuclei
    
    Args:
        z1: Atomic number of the first nucleus
        z2: Atomic number of the second nucleus
        a1: Mass number of the first nucleus
        a2: Mass number of the second nucleus
        distance: Distance between nuclei in meters
        include_nuclear: Whether to include nuclear potential
        include_screening: Whether to include electron screening
        screening_length: Screening length in meters (if None, estimated)
        
    Returns:
        Dictionary with potential components in eV
    """
    # Calculate Coulomb potential
    if include_screening and screening_length is not None:
        coulomb_potential = calculate_yukawa_potential(z1, z2, distance, screening_length)
    else:
        coulomb_potential = calculate_coulomb_barrier(z1, z2, distance)
    
    # Calculate nuclear potential if requested
    nuclear_potential = 0.0
    if include_nuclear:
        nuclear_potential = calculate_nuclear_potential(a1, a2, distance)
    
    # Calculate total potential
    total_potential = coulomb_potential + nuclear_potential
    
    # Prepare result
    result = {
        "distance_m": float(distance),
        "coulomb_potential_ev": float(coulomb_potential),
        "nuclear_potential_ev": float(nuclear_potential),
        "total_potential_ev": float(total_potential)
    }
    
    logger.debug(f"Calculated total potential: {total_potential:.2f} eV at r={distance:.2e} m")
    
    return result

def calculate_morse_potential(
    distance: float, 
    depth: float = 5.0, 
    equilibrium_distance: float = 1.5e-10, 
    width_parameter: float = 2.0
) -> float:
    """
    Calculate Morse potential for molecular binding.
    
    Args:
        distance: Inter-atomic distance in meters
        depth: Potential well depth in eV
        equilibrium_distance: Equilibrium bond distance in meters
        width_parameter: Parameter that controls the width of the potential well
        
    Returns:
        Morse potential in eV
    """
    # Convert depth to Joules
    depth_J = depth * EV_TO_J
    
    # Calculate Morse potential
    # V(r) = D₀ * [1 - exp(-a(r-r₀))]²
    exponent = -width_parameter * (distance - equilibrium_distance)
    morse_potential = depth_J * (1.0 - np.exp(exponent))**2
    
    # Convert back to eV
    morse_eV = morse_potential / EV_TO_J
    
    return morse_eV

def calculate_lenr_lattice_potential(
    distance: float,
    z1: int,
    z2: int,
    screening_length: float = 5e-11,
    binding_energy: float = 0.5,
    equilibrium_distance: float = 1.5e-10
) -> Dict[str, float]:
    """
    Calculate combined potential for LENR in metal lattice.
    
    Args:
        distance: Distance between nuclei in meters
        z1: Atomic number of the first nucleus
        z2: Atomic number of the second nucleus
        screening_length: Electron screening length in meters
        binding_energy: Binding energy for Morse potential in eV
        equilibrium_distance: Equilibrium distance for Morse potential in meters
        
    Returns:
        Dictionary with component potentials and total potential in eV
    """
    # Calculate Coulomb component (repulsive)
    coulomb = calculate_coulomb_barrier(z1, z2, distance)
    
    # Calculate Yukawa component (screened Coulomb)
    yukawa = calculate_yukawa_potential(z1, z2, distance, screening_length)
    
    # Calculate Morse component (attractive)
    morse = calculate_morse_potential(distance, binding_energy, equilibrium_distance)
    
    # Calculate total potential
    # For LENR, we consider the possibility of attractive components
    # reducing the effective barrier
    total = yukawa - morse  # Yukawa already includes Coulomb
    
    return {
        "coulomb_eV": coulomb,
        "yukawa_eV": yukawa,
        "morse_eV": morse,
        "total_eV": total,
        "reduction_factor": 1.0 - total / coulomb if coulomb > 0 else 0.0
    } 