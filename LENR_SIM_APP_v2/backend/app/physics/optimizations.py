"""
Optimizations module for physics calculations.

This module provides optimized implementations of computationally intensive
physics calculations using techniques like vectorization, caching, and
parallel processing.
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
import functools
import numba
from numba import jit, vectorize
import concurrent.futures
from functools import lru_cache
import logging

from app.utils.logging import setup_logger
from app.physics.models import FusionEnhancementFactors
from app.physics.quantum_tunneling import calculate_gamow_factor
from app.physics.phonon_modes import LatticeParameters

# Set up logger
logger = setup_logger("optimizations", "logs/physics.log")

# Physical constants
HBAR = const.hbar
KB = const.k
ELECTRON_MASS = const.m_e
PROTON_MASS = const.m_p
ELECTRON_CHARGE = const.e
VACUUM_PERMITTIVITY = const.epsilon_0
EV_TO_J = const.e

# Cache configuration
CACHE_SIZE = 1024  # Size of LRU cache for expensive calculations

@vectorize(['float64(float64, float64, float64, float64)'])
def vectorized_gamow_factor(z1: float, z2: float, reduced_mass: float, energy_ev: float) -> float:
    """
    Vectorized implementation of Gamow factor calculation.
    
    Args:
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        reduced_mass: Reduced mass in kg
        energy_ev: Energy in eV
        
    Returns:
        Gamow factor (dimensionless)
    """
    # Convert energy to Joules
    energy_j = energy_ev * EV_TO_J
    
    # Calculate Gamow factor
    # G = (π * α * Z₁Z₂ * √(2μ/E))
    # where α is the fine structure constant
    alpha = ELECTRON_CHARGE**2 / (4 * np.pi * VACUUM_PERMITTIVITY * HBAR * const.c)
    
    if energy_j <= 0:
        return np.inf
        
    return np.pi * alpha * z1 * z2 * np.sqrt(2 * reduced_mass / energy_j)

@jit(nopython=True)
def optimized_tunneling_probability(
    gamow_factor: float,
    barrier_height_ev: float,
    barrier_width: float,
    energy_ev: float
) -> float:
    """
    JIT-compiled tunneling probability calculation.
    
    Args:
        gamow_factor: Calculated Gamow factor
        barrier_height_ev: Barrier height in eV
        barrier_width: Barrier width in meters
        energy_ev: Incident energy in eV
        
    Returns:
        Tunneling probability
    """
    if energy_ev >= barrier_height_ev:
        return 1.0
        
    if gamow_factor >= 700:  # Numerical limit for exp
        return 0.0
        
    return np.exp(-gamow_factor)

@lru_cache(maxsize=CACHE_SIZE)
def cached_phonon_spectrum(
    lattice_constant: float,
    temperature: float,
    debye_temperature: float
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Cached calculation of phonon spectrum.
    
    Args:
        lattice_constant: Lattice constant in meters
        temperature: Temperature in Kelvin
        debye_temperature: Debye temperature in Kelvin
        
    Returns:
        Tuple of (frequencies, densities)
    """
    # Calculate maximum frequency (Debye frequency)
    omega_d = KB * debye_temperature / HBAR
    
    # Create frequency array
    frequencies = np.linspace(0, omega_d, 1000)
    
    # Calculate density of states (simplified Debye model)
    densities = frequencies**2 / omega_d**3
    densities *= 9 * temperature**3 / debye_temperature**3
    
    # Apply Bose-Einstein distribution with overflow protection
    x = HBAR * frequencies / (KB * temperature)
    # Clip to prevent overflow in exp
    x_safe = np.clip(x, 0, 100)
    # For large x, use low-temperature approximation (exp(-x))
    occupation = np.where(x > 100, np.exp(-np.clip(x, 0, 700)), 1 / (np.exp(x_safe) - 1 + 1e-30))
    densities *= occupation
    
    return frequencies, densities

def parallel_tunneling_calculation(
    energies: np.ndarray,
    z1: int,
    z2: int,
    reduced_mass: float,
    barrier_height_ev: float,
    barrier_width: float,
    n_cores: int = 4
) -> np.ndarray:
    """
    Parallel implementation of tunneling calculations.
    
    Args:
        energies: Array of energies to calculate for
        z1, z2: Atomic numbers
        reduced_mass: Reduced mass in kg
        barrier_height_ev: Barrier height in eV
        barrier_width: Barrier width in meters
        n_cores: Number of CPU cores to use
        
    Returns:
        Array of tunneling probabilities
    """
    def chunk_calculation(energy_chunk: np.ndarray) -> np.ndarray:
        gamow_factors = vectorized_gamow_factor(z1, z2, reduced_mass, energy_chunk)
        return np.array([
            optimized_tunneling_probability(g, barrier_height_ev, barrier_width, e)
            for g, e in zip(gamow_factors, energy_chunk)
        ])
    
    # Split energies into chunks
    chunks = np.array_split(energies, n_cores)
    
    # Calculate in parallel
    with concurrent.futures.ProcessPoolExecutor(max_workers=n_cores) as executor:
        results = list(executor.map(chunk_calculation, chunks))
    
    # Combine results
    return np.concatenate(results)

def optimized_integrated_tunneling(
    z1: int,
    z2: int,
    a1: int,
    a2: int,
    energy_kev: float,
    temperature: float,
    barrier_width: Optional[float] = None,
    lattice_params: Optional[LatticeParameters] = None,
    enhancement_factors: Optional[FusionEnhancementFactors] = None,
    include_phonons: bool = True,
    include_coherent: bool = True,
    include_electron_screening: bool = True,
    n_cores: int = 4
) -> Dict[str, Any]:
    """
    Optimized version of integrated tunneling calculation.
    
    This implementation uses:
    - Vectorized Gamow factor calculation
    - JIT-compiled tunneling probability
    - Cached phonon spectrum
    - Parallel processing for energy ranges
    
    Args:
        [Same as original integrated_tunneling function]
        n_cores: Number of CPU cores to use
        
    Returns:
        Dictionary with calculation results
    """
    # Convert energy to eV
    energy_ev = energy_kev * 1e3
    
    # Calculate reduced mass (cached)
    @lru_cache(maxsize=100)
    def get_cached_reduced_mass(a1: int, a2: int) -> float:
        mass1 = a1 * const.u
        mass2 = a2 * const.u
        return (mass1 * mass2) / (mass1 + mass2)
    
    reduced_mass = get_cached_reduced_mass(a1, a2)
    
    # Calculate barrier parameters
    if barrier_width is None:
        # Optimized barrier width calculation
        nuclear_distance = 1.25e-15 * (a1**(1/3) + a2**(1/3))
        if energy_ev > 0:
            turning_point = (z1 * z2 * ELECTRON_CHARGE**2) / (4 * np.pi * VACUUM_PERMITTIVITY * energy_ev * EV_TO_J)
            barrier_width = max(1e-15, turning_point - nuclear_distance)
        else:
            barrier_width = 1e-12
    
    # Calculate Coulomb barrier height (cached)
    @lru_cache(maxsize=100)
    def get_cached_barrier_height(z1: int, z2: int, a1: int, a2: int) -> float:
        nuclear_distance = 1.25e-15 * (a1**(1/3) + a2**(1/3))
        coulomb_factor = (1 / (4 * np.pi * VACUUM_PERMITTIVITY)) * (z1 * z2 * ELECTRON_CHARGE**2 / nuclear_distance)
        return coulomb_factor / EV_TO_J
    
    barrier_height_ev = get_cached_barrier_height(z1, z2, a1, a2)
    
    # Calculate base tunneling probability
    gamow = vectorized_gamow_factor(z1, z2, reduced_mass, energy_ev)
    base_probability = optimized_tunneling_probability(
        float(gamow), barrier_height_ev, barrier_width, energy_ev
    )
    
    # Initialize enhancement mechanisms
    mechanism_factors = {}
    
    # Electron screening (vectorized)
    if include_electron_screening:
        sommerfeld_param = z1 * z2 * 0.157 / np.sqrt(energy_kev)
        screen_exponent = min(700, np.pi * sommerfeld_param * 100.0 / energy_ev)
        e_screening_factor = np.exp(screen_exponent)
        
        if energy_kev < 0.1:
            correction = 0.2 + 0.8 * energy_kev / 0.1
            e_screening_factor = 1.0 + (e_screening_factor - 1.0) * correction
        
        e_screening_factor = max(1.0, min(1e6, e_screening_factor))
        mechanism_factors["electron_screening"] = float(e_screening_factor)
    
    # Phonon-assisted tunneling
    if include_phonons and lattice_params is not None:
        # Get cached phonon spectrum
        frequencies, densities = cached_phonon_spectrum(
            lattice_params.lattice_constant,
            temperature,
            lattice_params.debye_temperature
        )
        
        # Calculate enhancement factors using parallel processing
        energy_range = np.linspace(0.1, energy_ev, 100)
        tunneling_probs = parallel_tunneling_calculation(
            energy_range,
            z1, z2,
            reduced_mass,
            barrier_height_ev,
            barrier_width,
            n_cores
        )
        
        # Calculate phonon enhancement
        phonon_factor = np.sum(densities * tunneling_probs) / np.sum(densities)
        mechanism_factors["phonon_assisted"] = float(max(1.0, phonon_factor))
        
        if include_coherent:
            # Simplified coherent enhancement
            coherent_factor = phonon_factor * np.sqrt(lattice_params.dimensions[0] * 
                                                    lattice_params.dimensions[1] * 
                                                    lattice_params.dimensions[2])
            mechanism_factors["coherent_tunneling"] = float(max(1.0, min(1e6, coherent_factor)))
    
    # Include additional enhancement factors
    if enhancement_factors is not None:
        for key, value in enhancement_factors.to_dict().items():
            if key not in ["total", "log_enhancement"]:
                mechanism_factors[key] = float(value)
    
    # Calculate total enhancement
    total_enhancement = np.prod(list(mechanism_factors.values()))
    total_enhancement = min(1e20, max(1.0, total_enhancement))
    
    # Calculate enhanced probability
    enhanced_probability = min(1.0, base_probability * total_enhancement)
    
    # Prepare result
    return {
        "base_probability": float(base_probability),
        "enhanced_probability": float(enhanced_probability),
        "total_enhancement_factor": float(total_enhancement),
        "log_enhancement": float(np.log10(total_enhancement)) if total_enhancement > 0 else 0.0,
        "mechanism_factors": mechanism_factors,
        "barrier_data": {
            "barrier_height_ev": float(barrier_height_ev),
            "barrier_width_m": float(barrier_width),
            "gamow_factor": float(gamow)
        },
        "energy_data": {
            "energy_kev": float(energy_kev),
            "energy_ev": float(energy_ev),
            "thermal_energy_ev": float(KB * temperature / EV_TO_J)
        },
        "metadata": {
            "z1": z1,
            "z2": z2,
            "a1": a1,
            "a2": a2,
            "reduced_mass_kg": float(reduced_mass),
            "temperature_k": temperature,
            "include_phonons": include_phonons,
            "include_coherent": include_coherent,
            "include_electron_screening": include_electron_screening
        }
    }


@vectorize(['float64(float64, float64, float64)'])
def vectorized_cross_section(
    energy_ev: float,
    s_factor: float,
    sommerfeld_param: float
) -> float:
    """
    Vectorized implementation of nuclear cross section calculation.
    
    σ(E) = S(E)/E * exp(-2πη)
    
    Args:
        energy_ev: Energy in eV
        s_factor: Astrophysical S-factor in keV·b
        sommerfeld_param: Sommerfeld parameter
        
    Returns:
        Cross section in barns
    """
    if energy_ev <= 0:
        return 0.0
    
    # Convert energy to keV for S-factor
    energy_kev = energy_ev / 1000.0
    
    # Calculate Gamow factor
    gamow_factor = 2 * np.pi * sommerfeld_param
    
    # Limit to prevent overflow
    if gamow_factor > 700:
        return 0.0
    
    # Cross section: σ = S(E)/E * exp(-2πη)
    cross_section = (s_factor / energy_kev) * np.exp(-gamow_factor)
    
    return cross_section


@jit(nopython=True)
def optimized_maxwell_boltzmann(
    energy_ev: float,
    temperature: float
) -> float:
    """
    JIT-compiled Maxwell-Boltzmann distribution calculation.
    
    f(E) = 2π/(πkT)^(3/2) * √E * exp(-E/kT)
    
    Args:
        energy_ev: Energy in eV
        temperature: Temperature in Kelvin
        
    Returns:
        Maxwell-Boltzmann distribution value
    """
    # kT in eV
    kt_ev = 8.617333262e-5 * temperature  # KB in eV/K * T
    
    if energy_ev <= 0 or kt_ev <= 0:
        return 0.0
    
    # Exponent limit to prevent overflow
    exp_arg = -energy_ev / kt_ev
    if exp_arg < -700:
        return 0.0
    
    # Normalization factor: 2π/(πkT)^(3/2)
    norm = 2 * np.pi / (np.pi * kt_ev) ** 1.5
    
    return norm * np.sqrt(energy_ev) * np.exp(exp_arg)


def optimized_reaction_rate(
    temperature: float,
    density: float,
    z1: int,
    z2: int,
    a1: int,
    a2: int,
    s_factor: float = 5.5e-25,  # keV·b for D-D
    energy_range_kev: Tuple[float, float] = (0.1, 100.0),
    n_points: int = 1000,
    enhancement_factor: float = 1.0
) -> Dict[str, Any]:
    """
    Optimized calculation of thermonuclear reaction rate.
    
    R = n1 * n2 * <σv>
    
    where <σv> is the thermally averaged cross section times velocity.
    
    Args:
        temperature: Temperature in Kelvin
        density: Number density in m^-3
        z1, z2: Atomic numbers
        a1, a2: Mass numbers
        s_factor: Astrophysical S-factor in keV·b
        energy_range_kev: Energy range for integration
        n_points: Number of integration points
        enhancement_factor: Enhancement factor from screening etc.
        
    Returns:
        Dictionary with reaction rate and intermediate values
    """
    # Calculate reduced mass
    mass1 = a1 * const.u
    mass2 = a2 * const.u
    reduced_mass = (mass1 * mass2) / (mass1 + mass2)
    
    # Create energy grid
    energies_kev = np.logspace(
        np.log10(energy_range_kev[0]),
        np.log10(energy_range_kev[1]),
        n_points
    )
    energies_ev = energies_kev * 1000.0
    
    # Calculate Sommerfeld parameter array
    sommerfeld_params = z1 * z2 * 0.157 / np.sqrt(energies_kev)
    
    # Vectorized cross section calculation
    cross_sections = vectorized_cross_section(energies_ev, s_factor, sommerfeld_params)
    
    # Maxwell-Boltzmann distribution
    mb_distribution = np.array([
        optimized_maxwell_boltzmann(float(e), temperature) 
        for e in energies_ev
    ])
    
    # Calculate velocity from energy
    velocities = np.sqrt(2 * energies_ev * EV_TO_J / reduced_mass)
    
    # Thermal average of sigma*v using trapezoidal integration
    integrand = cross_sections * velocities * mb_distribution
    sigma_v = np.trapz(integrand, energies_ev)
    
    # Apply enhancement factor
    sigma_v_enhanced = sigma_v * enhancement_factor
    
    # Calculate reaction rate R = n1 * n2 * <σv> / (1 + δ12)
    # δ12 = 1 for identical particles, 0 otherwise
    delta = 1.0 if (z1 == z2 and a1 == a2) else 0.0
    reaction_rate = density * density * sigma_v_enhanced / (1 + delta)
    
    # Calculate Gamow peak energy
    # E_G = (kT/2)^(2/3) * E_gamow^(1/3)
    kt_ev = 8.617333262e-5 * temperature
    gamow_energy_ev = (z1 * z2 * 0.157) ** 2 * 1000  # Approximate
    gamow_peak_ev = (kt_ev / 2) ** (2/3) * gamow_energy_ev ** (1/3)
    
    return {
        "reaction_rate": float(reaction_rate),
        "reaction_rate_per_cm3_s": float(reaction_rate * 1e-6),  # Convert to cm^-3 s^-1
        "sigma_v": float(sigma_v),
        "sigma_v_enhanced": float(sigma_v_enhanced),
        "enhancement_factor": float(enhancement_factor),
        "gamow_peak_ev": float(gamow_peak_ev),
        "temperature_k": float(temperature),
        "density_m3": float(density),
        "metadata": {
            "z1": z1,
            "z2": z2,
            "a1": a1,
            "a2": a2,
            "reduced_mass_kg": float(reduced_mass),
            "s_factor_kevb": float(s_factor),
            "n_integration_points": n_points
        }
    }