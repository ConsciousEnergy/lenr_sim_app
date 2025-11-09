"""
Advanced potential models for LENR simulation

This module implements enhanced potential models including:
1. Advanced Morse potential with anharmonic corrections
2. Temperature-dependent screening effects
3. Phonon-coupled potentials
4. Combined lattice-nuclear potentials
"""

import numpy as np
from typing import Dict, Any, Optional, Tuple, Union
import scipy.constants as const
from dataclasses import dataclass, field

# Physical constants
HBAR = const.hbar
KB = const.k
ELECTRON_MASS = const.m_e
ELECTRON_CHARGE = const.e
VACUUM_PERMITTIVITY = const.epsilon_0
AMU = const.u
EV_TO_J = const.e

@dataclass
class AdvancedPotentialParameters:
    """Parameters for advanced potential calculations"""
    # Basic parameters
    temperature: float  # Temperature in Kelvin
    lattice_constant: float  # Lattice constant in meters
    
    # Morse potential parameters
    morse_depth: float = 5.0  # Well depth in eV
    morse_alpha: float = 2.0  # Width parameter in inverse meters
    equilibrium_distance: float = 1.5e-10  # Equilibrium distance in meters
    
    # Anharmonic correction parameters
    include_anharmonic: bool = True
    anharmonic_order: int = 4  # Order of anharmonic correction
    anharmonic_coeffs: Dict[int, float] = field(default_factory=lambda: {
        3: 0.1,  # Cubic correction coefficient
        4: 0.05  # Quartic correction coefficient
    })
    
    # Phonon coupling parameters
    include_phonons: bool = True
    phonon_frequency: float = 1e13  # Characteristic phonon frequency in Hz
    coupling_strength: float = 0.1  # Dimensionless electron-phonon coupling
    
    # Screening parameters
    include_screening: bool = True
    screening_length: float = 5e-11  # Thomas-Fermi screening length in meters
    screening_temperature_coeff: float = 0.001  # Temperature dependence coefficient

def calculate_advanced_morse_potential(
    distance: float,
    params: AdvancedPotentialParameters
) -> Dict[str, float]:
    """
    Calculate advanced Morse potential with anharmonic corrections and phonon coupling
    
    Args:
        distance: Interatomic distance in meters
        params: Potential parameters
        
    Returns:
        Dictionary containing potential components and total potential in eV
    """
    # Basic Morse potential
    x = distance - params.equilibrium_distance
    alpha = params.morse_alpha
    depth_j = params.morse_depth * EV_TO_J
    
    # Calculate basic Morse term
    exp_term = np.exp(-alpha * x)
    morse_basic = depth_j * (1.0 - exp_term)**2
    
    # Initialize components dictionary
    components = {"morse_basic_ev": morse_basic / EV_TO_J}
    
    # Add anharmonic corrections if enabled
    if params.include_anharmonic:
        anharmonic_correction = 0.0
        for order, coeff in params.anharmonic_coeffs.items():
            if order >= 3:  # Only higher-order terms
                anharmonic_correction += coeff * depth_j * (x/params.equilibrium_distance)**order
        components["anharmonic_ev"] = anharmonic_correction / EV_TO_J
        morse_basic += anharmonic_correction
    
    # Add phonon coupling effects if enabled
    if params.include_phonons:
        # Calculate phonon contribution
        # Simple model: assume thermal population of phonon modes
        phonon_energy = HBAR * params.phonon_frequency
        n_phonons = 1.0 / (np.exp(phonon_energy / (KB * params.temperature)) - 1.0)
        
        # Phonon-induced modification of potential
        phonon_correction = params.coupling_strength * phonon_energy * n_phonons * \
                          np.exp(-abs(x) / params.lattice_constant)
        
        components["phonon_coupling_ev"] = phonon_correction / EV_TO_J
        morse_basic += phonon_correction
    
    # Add temperature-dependent screening if enabled
    if params.include_screening:
        # Calculate screening modification
        screening_length = params.screening_length * \
                         (1.0 + params.screening_temperature_coeff * (params.temperature - 300.0))
        screening_factor = np.exp(-abs(x) / screening_length)
        screening_correction = -depth_j * params.coupling_strength * screening_factor
        
        components["screening_ev"] = screening_correction / EV_TO_J
        morse_basic += screening_correction
    
    # Store total potential
    components["total_ev"] = morse_basic / EV_TO_J
    
    return components

def calculate_combined_potential(
    distance: float,
    z1: int,
    z2: int,
    params: AdvancedPotentialParameters
) -> Dict[str, float]:
    """
    Calculate combined potential including nuclear, electronic, and lattice effects
    
    Args:
        distance: Distance between nuclei in meters
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        params: Potential parameters
        
    Returns:
        Dictionary containing all potential components in eV
    """
    # Calculate Coulomb repulsion
    coulomb = (z1 * z2 * ELECTRON_CHARGE**2) / \
             (4 * np.pi * VACUUM_PERMITTIVITY * distance)
    
    # Get Morse potential components
    morse_components = calculate_advanced_morse_potential(distance, params)
    
    # Calculate screened nuclear potential (Yukawa)
    yukawa = coulomb * np.exp(-distance / params.screening_length)
    
    # Combine all components
    result = {
        "coulomb_ev": coulomb / EV_TO_J,
        "yukawa_ev": yukawa / EV_TO_J,
        **morse_components,  # Include all Morse components
        "total_ev": (yukawa + morse_components["total_ev"] * EV_TO_J) / EV_TO_J
    }
    
    return result

def calculate_potential_gradient(
    distance: float,
    z1: int,
    z2: int,
    params: AdvancedPotentialParameters,
    delta: float = 1e-12
) -> Dict[str, float]:
    """
    Calculate gradient of the combined potential for force calculations
    
    Args:
        distance: Distance between nuclei in meters
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        params: Potential parameters
        delta: Distance increment for numerical derivative
        
    Returns:
        Dictionary containing potential gradients in eV/m
    """
    # Calculate potentials at distance ± delta
    v_plus = calculate_combined_potential(distance + delta, z1, z2, params)
    v_minus = calculate_combined_potential(distance - delta, z1, z2, params)
    
    # Calculate numerical derivatives
    gradients = {}
    for key in v_plus.keys():
        if key.endswith("_ev"):
            gradient = (v_plus[key] - v_minus[key]) / (2 * delta)
            gradients[f"{key[:-3]}_gradient_ev_per_m"] = gradient
    
    return gradients 