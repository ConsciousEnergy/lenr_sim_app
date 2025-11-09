"""
Phonon Interaction Models for LENR Simulation

This module implements advanced phonon interaction models including:
1. Phonon dispersion relations
2. Density of states calculations
3. Phonon-assisted tunneling
4. Temperature-dependent effects
"""

import numpy as np
from typing import Dict, Any, Optional, Tuple, Union
import scipy.constants as const
from dataclasses import dataclass, field
from scipy.integrate import quad

# Physical constants
HBAR = const.hbar
KB = const.k
ELECTRON_MASS = const.m_e
AMU = const.u
EV_TO_J = const.e

@dataclass
class PhononParameters:
    """Parameters for phonon calculations"""
    # Basic lattice parameters
    lattice_constant: float  # in meters
    atomic_mass: float  # in AMU
    
    # Dispersion parameters
    sound_speed: float = 5000.0  # Speed of sound in m/s
    debye_temperature: float = 300.0  # Debye temperature in K
    max_frequency: float = field(init=False)  # Maximum phonon frequency
    
    # Coupling parameters
    electron_phonon_coupling: float = 0.1  # Dimensionless coupling constant
    anharmonicity: float = 0.05  # Anharmonicity parameter
    
    def __post_init__(self):
        """Calculate derived parameters"""
        # Calculate maximum phonon frequency from Debye temperature
        self.max_frequency = self.debye_temperature * KB / HBAR

def calculate_phonon_dispersion(
    wavevector: float,
    params: PhononParameters
) -> Dict[str, float]:
    """
    Calculate phonon dispersion relation for acoustic modes
    
    Args:
        wavevector: Phonon wavevector in inverse meters
        params: Phonon parameters
        
    Returns:
        Dictionary with frequencies for different modes
    """
    # Implement dispersion for acoustic modes
    omega_la = params.sound_speed * wavevector  # Longitudinal acoustic
    omega_ta = params.sound_speed * wavevector * 0.5  # Transverse acoustic
    
    # Add anharmonic corrections
    anharmonic_correction = params.anharmonicity * wavevector**2
    
    return {
        "longitudinal_acoustic_hz": float(omega_la / (2 * np.pi)),
        "transverse_acoustic_hz": float(omega_ta / (2 * np.pi)),
        "anharmonic_correction_hz": float(anharmonic_correction / (2 * np.pi))
    }

def density_of_states(
    energy: float,
    params: PhononParameters
) -> float:
    """
    Calculate phonon density of states using Debye model
    
    Args:
        energy: Energy in eV
        params: Phonon parameters
        
    Returns:
        Density of states in states/eV
    """
    # Convert energy to angular frequency
    omega = energy * EV_TO_J / HBAR
    
    # Debye model DOS: g(ω) ∝ ω² for ω < ωD
    if omega > params.max_frequency:
        return 0.0
    
    # Include anharmonic effects in DOS
    dos = (9 * omega**2) / (params.max_frequency**3)
    dos *= (1 + params.anharmonicity * (omega / params.max_frequency)**2)
    
    return float(dos)

def calculate_tunneling_enhancement(
    energy: float,
    temperature: float,
    params: PhononParameters
) -> Dict[str, float]:
    """
    Calculate phonon-assisted tunneling enhancement
    
    Args:
        energy: Particle energy in eV
        temperature: Temperature in Kelvin
        params: Phonon parameters
        
    Returns:
        Dictionary with enhancement factors
    """
    # Convert energy to Joules
    energy_j = energy * EV_TO_J
    
    # Calculate thermal occupation of phonon modes
    def n_phonon(omega):
        """Bose-Einstein distribution"""
        x = HBAR * omega / (KB * temperature)
        if x > 100:  # Prevent overflow
            return 0.0
        return 1.0 / (np.exp(x) - 1.0)
    
    # Calculate enhancement from phonon absorption/emission
    def integrand(omega):
        if omega > params.max_frequency:
            return 0.0
        n_omega = n_phonon(omega)
        dos = density_of_states(HBAR * omega / EV_TO_J, params)
        return dos * (n_omega + 0.5) * params.electron_phonon_coupling
    
    # Integrate over phonon frequencies
    enhancement, _ = quad(integrand, 0, params.max_frequency)
    
    # Calculate coherent multi-phonon processes
    coherent_enhancement = 1.0
    if temperature > 0:
        # Simplified model for coherent processes
        thermal_energy = KB * temperature
        coherent_enhancement = np.exp(
            params.electron_phonon_coupling * thermal_energy / (HBAR * params.max_frequency)
        )
    
    return {
        "single_phonon_enhancement": float(1.0 + enhancement),
        "coherent_enhancement": float(coherent_enhancement),
        "total_enhancement": float((1.0 + enhancement) * coherent_enhancement)
    }

def calculate_temperature_dependent_screening(
    temperature: float,
    params: PhononParameters
) -> Dict[str, float]:
    """
    Calculate temperature-dependent screening effects
    
    Args:
        temperature: Temperature in Kelvin
        params: Phonon parameters
        
    Returns:
        Dictionary with screening parameters
    """
    # Base screening length (Thomas-Fermi)
    base_screening = 5e-11  # 0.5 Å
    
    # Temperature dependence through phonon-modulated screening
    thermal_factor = np.sqrt(temperature / 300.0)  # Normalized to room temperature
    
    # Calculate phonon contribution to screening
    phonon_screening = params.electron_phonon_coupling * \
        np.tanh(params.debye_temperature / (2 * temperature))
    
    # Total screening length with temperature dependence
    total_screening = base_screening * (1.0 + thermal_factor * phonon_screening)
    
    return {
        "base_screening_m": float(base_screening),
        "thermal_factor": float(thermal_factor),
        "phonon_contribution": float(phonon_screening),
        "total_screening_m": float(total_screening)
    }

def calculate_thermal_properties(
    temperature: float,
    params: PhononParameters
) -> Dict[str, float]:
    """
    Calculate thermal properties based on phonon model
    
    Args:
        temperature: Temperature in Kelvin
        params: Phonon parameters
        
    Returns:
        Dictionary with thermal properties
    """
    # Calculate Debye integral for specific heat
    def debye_integral(x):
        def integrand(t):
            return (t**4 * np.exp(t)) / (np.exp(t) - 1)**2
        
        try:
            result, _ = quad(integrand, 0, x)
            return result
        except:
            return 0.0
    
    # Characteristic temperature ratio
    theta_ratio = params.debye_temperature / temperature
    
    # Specific heat calculation (normalized to classical limit)
    cv_factor = 9 * debye_integral(theta_ratio) / theta_ratio**3
    
    # Thermal conductivity estimate
    kappa = (1/3) * params.sound_speed**2 * cv_factor * \
            (1 - params.anharmonicity * (temperature / params.debye_temperature))
    
    return {
        "specific_heat_ratio": float(cv_factor),
        "thermal_conductivity_w_mk": float(kappa),
        "debye_weight": float(np.exp(-temperature / params.debye_temperature))
    } 