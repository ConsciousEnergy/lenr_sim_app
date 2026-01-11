"""
Quantum Tunneling Module for LENR Simulations

This module provides functions to calculate quantum tunneling probabilities
for nuclear reactions in LENR systems. Tunneling is a key mechanism enabling
fusion reactions at low energies.
"""

import numpy as np
import logging
from typing import Union, Tuple, Optional, Dict, Any
import scipy.constants as const
from scipy.special import gammaincc
from scipy.integrate import quad
import dataclasses
import time
import hashlib
import json
from functools import lru_cache

from app.utils.logging import setup_logger
from app.utils.performance_tracker import track_performance

# Set up logger
logger = setup_logger("quantum_tunneling", "logs/simulation.log")

# Initialize caching for tunneling calculations
TUNNELING_CACHE_SIZE = 500
tunneling_cache = {}
tunneling_stats = {"hits": 0, "misses": 0, "computation_time_saved": 0.0}

@dataclasses.dataclass
class TunnelingParameters:
    """Parameters for quantum tunneling calculations"""
    temperature: float = 300.0  # K
    potential_type: str = "coulomb"  # "coulomb", "yukawa"
    particle_mass: Optional[float] = None  # kg, defaults to deuteron mass
    barrier_width: float = 1e-10  # m
    energy_range: Tuple[float, float] = (0.01, 10.0)  # eV
    energy_points: int = 100
    electron_screening: bool = True
    screening_length: Optional[float] = None  # m, for yukawa potential
    phonon_assisted: bool = False
    lattice_sites: int = 1  # number of coherent lattice sites
    model_type: str = "wkb"  # "wkb", "gamow"
    potential_params: Dict[str, Any] = dataclasses.field(default_factory=dict)
    
    def __post_init__(self):
        # Set default mass to deuteron mass if not provided
        if self.particle_mass is None:
            self.particle_mass = 2.0 * const.m_p  # Deuteron mass
        
        # Set default screening length if not provided for yukawa potential
        if self.potential_type == "yukawa" and self.screening_length is None:
            self.screening_length = 5e-11  # Default 50 pm screening length


def generate_cache_key(params: TunnelingParameters) -> str:
    """Generate a cache key for tunneling parameters"""
    # Convert dataclass to a sorted dict for consistent hashing
    params_dict = dataclasses.asdict(params)
    
    # Remove any keys that might contain non-JSON serializable objects
    # and ensure deterministic serialization
    serializable_dict = {}
    for key, value in sorted(params_dict.items()):
        if isinstance(value, (int, float, str, bool, list, dict, tuple)) or value is None:
            serializable_dict[key] = value
    
    # Convert to a stable string representation and hash
    params_json = json.dumps(serializable_dict, sort_keys=True)
    return hashlib.sha256(params_json.encode()).hexdigest()


def clear_tunneling_cache():
    """Clear the tunneling calculation cache"""
    global tunneling_cache
    size = len(tunneling_cache)
    tunneling_cache.clear()
    tunneling_stats["hits"] = 0
    tunneling_stats["misses"] = 0
    tunneling_stats["computation_time_saved"] = 0.0
    return size


def get_tunneling_cache_stats():
    """Get statistics about the tunneling calculations cache"""
    total_requests = tunneling_stats["hits"] + tunneling_stats["misses"]
    hit_ratio = tunneling_stats["hits"] / max(1, total_requests)
    
    return {
        "cache_size": len(tunneling_cache),
        "max_size": TUNNELING_CACHE_SIZE,
        "hits": tunneling_stats["hits"],
        "misses": tunneling_stats["misses"],
        "hit_ratio": hit_ratio,
        "computation_time_saved": round(tunneling_stats["computation_time_saved"], 2)
    }


# Cache management for tunneling cache
def cache_tunneling_result(key, result, computation_time):
    """Cache tunneling calculation result"""
    global tunneling_cache
    
    # Store in cache
    tunneling_cache[key] = result
    
    # Record computation time saved for future hits
    tunneling_stats["computation_time_saved"] += computation_time
    
    # Implement LRU-like behavior by removing oldest entries if cache is too large
    if len(tunneling_cache) > TUNNELING_CACHE_SIZE:
        # Remove 20% of oldest entries
        entries_to_remove = int(TUNNELING_CACHE_SIZE * 0.2)
        keys_to_remove = list(tunneling_cache.keys())[:entries_to_remove]
        for k in keys_to_remove:
            tunneling_cache.pop(k, None)


def calculate_potential(r: np.ndarray, params: TunnelingParameters) -> np.ndarray:
    """
    Calculate potential energy as a function of distance
    
    Args:
        r: Distance array in meters
        params: Tunneling parameters
        
    Returns:
        Potential energy array in eV
    """
    # Extract Z values from potential parameters
    z1 = params.potential_params.get("Z1", 1)
    z2 = params.potential_params.get("Z2", 1)
    
    # Base Coulomb potential
    coulomb = 1.0 / (4.0 * np.pi * const.epsilon_0) * (const.e**2) * z1 * z2 / r
    
    # Convert to eV
    coulomb_ev = coulomb / const.e
    
    if params.potential_type == "coulomb":
        return coulomb_ev
    
    elif params.potential_type == "yukawa":
        # Yukawa (screened Coulomb) potential
        screening_length = params.screening_length
        return coulomb_ev * np.exp(-r / screening_length)
    
    else:
        logger.warning(f"Unknown potential type: {params.potential_type}. Using Coulomb.")
        return coulomb_ev


# Use vectorized numpy operations for better performance
def _calculate_wkb_tunneling(params: TunnelingParameters) -> Dict[str, Any]:
    """
    Calculate tunneling probability using WKB approximation
    
    This is an optimized implementation that uses vectorized numpy operations
    for better performance and reduced memory usage.
    """
    # Setup energy range
    min_ev, max_ev = params.energy_range
    energy_points = params.energy_points
    energies_ev = np.logspace(np.log10(min_ev), np.log10(max_ev), energy_points)
    
    # Convert to joules
    energies_j = energies_ev * const.e
    
    # Setup radial grid (use fewer points for lower resolution settings)
    r_min = 1e-15  # Avoid singularity at r=0
    r_max = params.barrier_width * 2
    
    # Adjust r_points based on energy_points for better performance
    r_points = min(500, max(200, energy_points * 10))  # Adaptive resolution
    
    r = np.logspace(np.log10(r_min), np.log10(r_max), r_points)
    
    # Potential energy - calculated once for all energies
    potential_ev = calculate_potential(r, params)
    
    # Pre-allocate arrays for better memory management
    tunneling_probs = np.ones(energy_points, dtype=np.float64)
    turning_points = [(0, 0) for _ in range(energy_points)]
    
    # Constants for WKB calculation
    factor = 2.0 * params.particle_mass
    
    # Process each energy using vectorized operations where possible
    for i, E in enumerate(energies_j):
        # Convert energy to eV for comparison with potential
        E_ev = E / const.e
        
        # Find classical turning points
        mask = potential_ev > E_ev
        
        # Skip computation if energy is above potential everywhere
        if not np.any(mask):
            tunneling_probs[i] = 1.0
            turning_points[i] = (0, 0)
            continue
        
        # Find turning points efficiently
        r_masked = r[mask]
        try:
            r1 = np.min(r_masked)
            r2 = np.max(r_masked)
            turning_points[i] = (r1, r2)
        except ValueError:
            # Fall back to simple estimate if turning points can't be found
            r1 = r_min
            r2 = params.barrier_width
            turning_points[i] = (r1, r2)
        
        # Calculate WKB integral more efficiently
        mask_between = (r >= r1) & (r <= r2)
        r_between = r[mask_between]
        v_between = potential_ev[mask_between] * const.e  # Convert to joules
        
        # Skip computation if we don't have enough points
        if len(r_between) < 2:
            tunneling_probs[i] = 0.1  # Default low value
            continue
        
        # Efficient vectorized calculation
        integrand = np.sqrt(2.0 * params.particle_mass * np.maximum(0, v_between - E))
        dr = np.diff(r_between)
        s = np.sum(0.5 * (integrand[:-1] + integrand[1:]) * dr)
        
        # WKB tunneling probability: exp(-2S/ħ)
        T = np.exp(-2.0 * s / const.hbar)
        
        # Apply multi-site effect if enabled
        if params.lattice_sites > 1:
            # Tunneling probability increases with number of coherent sites
            # BUT not linearly due to decoherence effects
            coherence_factor = np.sqrt(params.lattice_sites)
            T = min(1.0, T * coherence_factor)
        
        # Apply phonon-assisted tunneling if enabled
        if params.phonon_assisted:
            # Phonon assistance increases probability at low energies
            phonon_factor = 1.0 + 5.0 * np.exp(-E_ev / 0.1)  # More significant at very low E
            T = min(1.0, T * phonon_factor)
        
        tunneling_probs[i] = float(T)
    
    # Prepare result
    result = {
        "energy_ev": energies_ev.tolist(),
        "tunneling_probability": tunneling_probs.tolist(),
        "turning_points": turning_points,
        "metadata": {
            "model": "wkb",
            "particle_mass": params.particle_mass,
            "potential_type": params.potential_type,
            "electron_screening": params.electron_screening,
            "phonon_assisted": params.phonon_assisted,
            "lattice_sites": params.lattice_sites,
            "computation_points": r_points  # Add this for diagnostics
        }
    }
    
    return result


# Simpler Gamow factor calculation - much faster than WKB for spherical potentials
def _calculate_gamow_tunneling(params: TunnelingParameters) -> Dict[str, Any]:
    """
    Calculate tunneling probability using Gamow factor approximation
    
    This is a simpler, faster calculation than the full WKB approximation
    and works well for spherical Coulomb potentials.
    """
    # Setup energy range
    min_ev, max_ev = params.energy_range
    energy_points = params.energy_points
    energies_ev = np.logspace(np.log10(min_ev), np.log10(max_ev), energy_points)
    
    # Extract Z values from potential parameters
    z1 = params.potential_params.get("Z1", 1)
    z2 = params.potential_params.get("Z2", 1)
    
    # Calculate reduced mass
    reduced_mass = params.particle_mass / 2.0  # Approximation for similar particles
    
    # Gamow factor calculation
    # G = exp[-2π*η], where η = Z₁Z₂e²/(4πε₀ħv)
    # v = √(2E/μ), where μ is reduced mass
    tunneling_probs = []
    
    for E_ev in energies_ev:
        # Convert to joules
        E = E_ev * const.e
        
        # Calculate velocity
        v = np.sqrt(2.0 * E / reduced_mass)
        
        # Calculate Sommerfeld parameter η
        eta = z1 * z2 * const.e**2 / (4.0 * np.pi * const.epsilon_0 * const.hbar * v)
        
        # Apply screening if enabled
        if params.electron_screening:
            # Simple screening model reduces effective charge
            if params.screening_length:
                screening_factor = np.exp(-params.barrier_width / params.screening_length)
            else:
                screening_factor = 0.7  # Default approximate reduction
            
            eta *= screening_factor
        
        # Calculate Gamow factor
        gamow = np.exp(-2.0 * np.pi * eta)
        
        # Apply multi-site effect if enabled
        if params.lattice_sites > 1:
            coherence_factor = np.sqrt(params.lattice_sites)
            gamow = min(1.0, gamow * coherence_factor)
        
        # Apply phonon-assisted tunneling if enabled
        if params.phonon_assisted:
            phonon_factor = 1.0 + 3.0 * np.exp(-E_ev / 0.1)
            gamow = min(1.0, gamow * phonon_factor)
        
        tunneling_probs.append(float(gamow))
    
    # Prepare result
    result = {
        "energy_ev": energies_ev.tolist(),
        "tunneling_probability": tunneling_probs,
        "metadata": {
            "model": "gamow",
            "particle_mass": params.particle_mass,
            "potential_type": params.potential_type,
            "electron_screening": params.electron_screening,
            "phonon_assisted": params.phonon_assisted,
            "lattice_sites": params.lattice_sites
        }
    }
    
    return result


@track_performance("calculate_advanced_tunneling")
def calculate_advanced_tunneling(params: TunnelingParameters) -> Dict[str, Any]:
    """
    Calculate tunneling probability with advanced models
    
    Args:
        params: Tunneling parameters
        
    Returns:
        Dictionary with tunneling results
    """
    # Generate cache key
    key = generate_cache_key(params)
    
    # Check cache
    if key in tunneling_cache:
        tunneling_stats["hits"] += 1
        result = tunneling_cache[key]
        
        # Add cache hit metadata
        if "metadata" not in result:
            result["metadata"] = {}
        result["metadata"]["cache_hit"] = True
        
        return result
    
    tunneling_stats["misses"] += 1
    
    # Measure calculation time
    start_time = time.time()
    
    try:
        # Choose calculation method based on parameters
        if params.model_type == "wkb":
            result = _calculate_wkb_tunneling(params)
        elif params.model_type == "gamow":
            result = _calculate_gamow_tunneling(params)
        else:
            logger.warning(f"Unknown model type: {params.model_type}. Using WKB.")
            result = _calculate_wkb_tunneling(params)
        
        # Calculate computation time
        computation_time = time.time() - start_time
        
        # Add timing metadata
        if "metadata" not in result:
            result["metadata"] = {}
        result["metadata"]["computation_time"] = round(computation_time, 3)
        result["metadata"]["cache_hit"] = False
        
        # Cache result
        cache_tunneling_result(key, result, computation_time)
        
        return result
    except Exception as e:
        logger.error(f"Error in tunneling calculation: {str(e)}")
        raise


@track_performance("calculate_temperature_pressure_dependence")
def calculate_temperature_pressure_dependence(
    base_params: TunnelingParameters,
    temp_range: Tuple[float, float],
    pressure_range: Optional[Tuple[float, float]] = None,
    points: int = 10
) -> Dict[str, Any]:
    """
    Calculate tunneling probability as a function of temperature and pressure
    
    Args:
        base_params: Base tunneling parameters
        temp_range: Temperature range in Kelvin (min, max)
        pressure_range: Optional pressure range in Pa (min, max)
        points: Number of data points to calculate
        
    Returns:
        Dictionary with temperature and pressure dependence data
    """
    # Generate temperature array
    temp_min, temp_max = temp_range
    temperatures = np.linspace(temp_min, temp_max, points)
    
    # Initialize results arrays
    temp_results = []
    
    # Calculate enhancement at a specific energy (mid-range)
    mid_energy = np.sqrt(base_params.energy_range[0] * base_params.energy_range[1])
    
    # Measure calculation time
    start_time = time.time()
    
    # Calculate temperature dependence
    for temp in temperatures:
        # Create a copy of parameters with updated temperature
        params = dataclasses.replace(base_params, temperature=temp)
        
        # Adjust energy range based on temperature
        # At higher temperatures, tunneling at higher energies becomes more relevant
        thermal_energy_ev = temp * const.k / const.e
        params = dataclasses.replace(
            params, 
            energy_range=(params.energy_range[0], max(params.energy_range[1], 10 * thermal_energy_ev))
        )
        
        # Calculate tunneling with updated parameters
        result = calculate_advanced_tunneling(params)
        
        # Find tunneling probability at mid-energy
        energy_array = np.array(result["energy_ev"])
        idx = np.abs(energy_array - mid_energy).argmin()
        prob = result["tunneling_probability"][idx]
        
        temp_results.append({
            "temperature": temp,
            "tunneling_probability": prob
        })
    
    # Initialize pressure results if needed
    pressure_results = []
    
    if pressure_range is not None:
        pressure_min, pressure_max = pressure_range
        pressures = np.logspace(np.log10(pressure_min), np.log10(pressure_max), points)
        
        # Calculate pressure dependence
        for pressure in pressures:
            # Relate pressure to barrier width and screening
            # Higher pressure typically reduces barrier width and increases screening
            
            # Scale barrier width inversely with pressure (approximate)
            # p ∝ 1/V, and V ∝ d³, so d ∝ p^(-1/3)
            width_scaling = (pressure / 1e5) ** (-1/3)  # Normalized to 1 atm
            scaled_width = base_params.barrier_width * width_scaling
            
            # Scale screening length with pressure (approximate)
            if base_params.screening_length:
                scaled_screening = base_params.screening_length * width_scaling
            else:
                scaled_screening = None
            
            # Create updated parameters
            params = dataclasses.replace(
                base_params,
                barrier_width=scaled_width,
                screening_length=scaled_screening
            )
            
            # Calculate tunneling with updated parameters
            result = calculate_advanced_tunneling(params)
            
            # Find tunneling probability at mid-energy
            energy_array = np.array(result["energy_ev"])
            idx = np.abs(energy_array - mid_energy).argmin()
            prob = result["tunneling_probability"][idx]
            
            pressure_results.append({
                "pressure": pressure,
                "tunneling_probability": prob
            })
    
    # Prepare combined result
    result = {
        "temperature_dependence": temp_results,
        "pressure_dependence": pressure_results,
        "metadata": {
            "computation_time": round(time.time() - start_time, 3),
            "temperature_range": temp_range,
            "pressure_range": pressure_range if pressure_range else "not calculated",
            "mid_energy_ev": mid_energy
        }
    }
    
    return result

def calculate_gamow_factor(z1: int, z2: int, reduced_mass: float, energy: float) -> float:
    """
    Calculate the Gamow factor for nuclear fusion tunneling.
    
    The Gamow factor G = exp(-2πη) where η is the Sommerfeld parameter
    η = Z₁Z₂e²/(ħv)
    
    Args:
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        reduced_mass: Reduced mass in atomic mass units
        energy: Center-of-mass energy in keV
        
    Returns:
        Gamow factor (tunneling probability suppression factor)
    """
    # Physical constants
    hbar_c = 197.3269804  # ħc in eV·fm
    alpha = 1.0 / 137.036  # Fine structure constant
    amu_c2 = 931.494061e6  # 1 atomic mass unit in eV/c²
    
    # Convert energy to eV
    energy_ev = energy * 1000.0
    
    # Convert reduced mass to eV/c²
    reduced_mass_ev = reduced_mass * amu_c2
    
    # Calculate the Sommerfeld parameter η
    eta = z1 * z2 * alpha * np.sqrt(reduced_mass_ev / (2 * energy_ev))
    
    # Calculate the Gamow factor G = exp(-2πη)
    gamow_factor = np.exp(-2 * np.pi * eta)
    
    logger.debug(f"Calculated Gamow factor of {gamow_factor:.2e} for Z1={z1}, Z2={z2}, E={energy} keV")
    
    return gamow_factor

def calculate_enhanced_tunneling(
    z1: int,
    z2: int,
    a1: float,
    a2: float,
    temperature: float,
    screening_potential: float,
    energy: Optional[float] = None,
    enhancement_factor: float = 1.0
) -> float:
    """
    Calculate enhanced tunneling probability with screening and other effects.
    
    Args:
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        a1: Mass number of first nucleus (u)
        a2: Mass number of second nucleus (u)
        temperature: Temperature in K
        screening_potential: Electron screening potential in eV
        energy: Collision energy in keV (optional, calculated from temperature if not provided)
        enhancement_factor: Additional enhancement factor (coherence, resonance, etc.)
        
    Returns:
        Enhanced tunneling probability
    """
    # If energy not provided, estimate from temperature
    if energy is None:
        kB = 8.617333262e-5  # Boltzmann constant in eV/K
        energy = 1.5 * kB * temperature * 1e-3  # Convert to keV
    
    # Calculate reduced mass
    reduced_mass = a1 * a2 / (a1 + a2)
    
    # Calculate base Gamow factor
    base_probability = calculate_gamow_factor(z1, z2, reduced_mass, energy)
    
    # Calculate screening enhancement
    # Using Assenbaum et al. (1987) model: exp(πηUe/E)
    alpha = 1.0 / 137.036  # Fine structure constant
    amu_c2 = 931.494061e6  # 1 atomic mass unit in eV/c²
    reduced_mass_ev = reduced_mass * amu_c2
    
    # Sommerfeld parameter
    eta = z1 * z2 * alpha * np.sqrt(reduced_mass_ev / (2.0 * energy * 1000.0))
    
    # Screening enhancement - clip exponent to prevent overflow (max safe exp arg ~700)
    exponent = np.pi * eta * screening_potential / (energy * 1000.0)
    exponent = np.clip(exponent, -700, 700)
    screening_enhancement = np.exp(exponent)
    
    # Calculate final enhanced probability
    enhanced_probability = base_probability * screening_enhancement * enhancement_factor
    
    # Ensure probability doesn't exceed 1
    enhanced_probability = min(enhanced_probability, 1.0)
    
    logger.debug(
        f"Enhanced tunneling probability: {enhanced_probability:.2e} " +
        f"(base: {base_probability:.2e}, screening: {screening_enhancement:.2f}, " +
        f"other: {enhancement_factor:.2f})"
    )
    
    return enhanced_probability

def calculate_tunneling_probability(
    z1: int,
    z2: int,
    a1: float,
    a2: float,
    temperature: float,
    screening_potential: Optional[float] = None,
    energy: Optional[float] = None,
    model: str = "gamow"
) -> float:
    """
    Calculate the quantum tunneling probability for a fusion reaction.
    
    Args:
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        a1: Mass number of first nucleus (u)
        a2: Mass number of second nucleus (u)
        temperature: Temperature in K
        screening_potential: Electron screening potential in eV (optional)
        energy: Collision energy in keV (optional, calculated from temperature if not provided)
        model: Tunneling model to use ('gamow', 'wkb', 'exact')
        
    Returns:
        Tunneling probability (dimensionless)
    """
    # Physical constants in convenient units
    hbar_c = 197.3269804  # hbar*c in eV*nm
    alpha = 1.0 / 137.036  # Fine structure constant
    kB = 8.617333262e-5  # Boltzmann constant in eV/K
    amu_c2 = 931.494061e6  # 1 atomic mass unit in eV/c²
    
    # Calculate reduced mass
    reduced_mass = a1 * a2 / (a1 + a2) * amu_c2  # in eV/c²
    
    # If energy is not provided, estimate from temperature
    # using E = 3/2 kT (average thermal energy)
    if energy is None:
        energy = 1.5 * kB * temperature * 1e-3  # Convert to keV
    
    # Convert energy to eV
    energy_ev = energy * 1000.0
    
    # Include screening potential if provided
    if screening_potential is not None:
        effective_energy = energy_ev + screening_potential
    else:
        effective_energy = energy_ev
    
    if model.lower() == "gamow":
        # Standard Gamow tunneling formula
        # P = exp(-2πη) where η = Z₁Z₂e²/(ħv)
        
        # Calculate the Sommerfeld parameter η
        velocity = np.sqrt(2 * effective_energy / reduced_mass) * 3e8  # in m/s
        eta = z1 * z2 * alpha * hbar_c / (velocity / 3e8 * hbar_c)
        
        # Calculate the tunneling probability
        tunneling_prob = np.exp(-2 * np.pi * eta)
        
    elif model.lower() == "wkb":
        # WKB approximation for tunneling through Coulomb barrier
        # More accurate than the simple Gamow formula
        
        # Calculate the Gamow energy (height of the Coulomb barrier)
        r_nuclear = 1.2 * (a1**(1/3) + a2**(1/3)) * 1e-15  # Nuclear radius in m
        gamow_energy = 1.44 * z1 * z2 / (r_nuclear * 1e9)  # in eV
        
        # Modified tunneling probability with WKB correction
        if effective_energy >= gamow_energy:
            tunneling_prob = 1.0  # Above barrier
        else:
            # WKB approximation integration result for Coulomb potential
            eta = z1 * z2 * alpha * np.sqrt(reduced_mass / (2 * effective_energy))
            theta = np.arccos(np.sqrt(effective_energy / gamow_energy))
            tunneling_prob = np.exp(-2 * eta * (theta - np.sin(theta) * np.cos(theta)))
    
    elif model.lower() == "exact":
        # More exact tunneling calculation (still an approximation)
        # Based on numerical solution of the Schrödinger equation
        
        # Calculate the Gamow energy
        r_nuclear = 1.2 * (a1**(1/3) + a2**(1/3)) * 1e-15  # Nuclear radius in m
        gamow_energy = 1.44 * z1 * z2 / (r_nuclear * 1e9)  # in eV
        
        # Calculate the Sommerfeld parameter
        eta = z1 * z2 * alpha * np.sqrt(reduced_mass / (2 * effective_energy))
        
        # Calculate the S-factor (simplified)
        s_factor = 1.0  # A more accurate calculation would use experimental data
        
        # Penetrability factor
        penetration = np.exp(-2 * np.pi * eta)
        
        # Tunneling probability
        if effective_energy >= gamow_energy:
            tunneling_prob = s_factor  # Above barrier
        else:
            # Below barrier with S-factor correction
            e_ratio = effective_energy / gamow_energy
            tunneling_prob = s_factor * penetration * (1 - np.sqrt(1 - e_ratio))
    
    else:
        logger.warning(f"Unknown tunneling model: {model}, using Gamow model")
        return calculate_tunneling_probability(z1, z2, a1, a2, temperature, 
                                             screening_potential, energy, "gamow")
    
    # Avoid unrealistically low probabilities
    if tunneling_prob < 1e-300:
        tunneling_prob = 1e-300
    
    logger.debug(f"Calculated tunneling probability of {tunneling_prob:.2e} for Z1={z1}, Z2={z2}, E={energy} keV")
    
    return tunneling_prob

def calculate_fusion_rate(
    nuclei_density1: float,
    nuclei_density2: float,
    z1: int,
    z2: int,
    a1: float,
    a2: float,
    temperature: float,
    screening_potential: Optional[float] = None
) -> float:
    """
    Calculate the fusion reaction rate based on tunneling probability.
    
    Args:
        nuclei_density1: Number density of first reactant nuclei (nuclei/m³)
        nuclei_density2: Number density of second reactant nuclei (nuclei/m³)
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        a1: Mass number of first nucleus (u)
        a2: Mass number of second nucleus (u)
        temperature: Temperature in K
        screening_potential: Electron screening potential in eV (optional)
        
    Returns:
        Fusion rate (reactions/m³/s)
    """
    # Physical constants
    kB = 8.617333262e-5  # Boltzmann constant in eV/K
    amu_c2 = 931.494061e6  # 1 atomic mass unit in eV/c²
    
    # Calculate reduced mass
    reduced_mass_u = a1 * a2 / (a1 + a2)
    reduced_mass_kg = reduced_mass_u * 1.66053906660e-27  # kg
    
    # Calculate thermal velocity (average)
    thermal_velocity = np.sqrt(8 * kB * temperature / (np.pi * reduced_mass_u * amu_c2 / 1e6)) * 3e8  # m/s
    
    # Energy range for integration (typical thermal energies)
    energy_min = 0.001  # 1 eV
    energy_max = 10 * kB * temperature  # 10 kT in eV
    num_points = 50
    
    # Numerical integration over energy distribution
    energy_points = np.logspace(np.log10(energy_min), np.log10(energy_max), num_points)
    
    # Maxwell-Boltzmann distribution * tunneling probability * cross-section
    reaction_prob_sum = 0.0
    
    for energy_ev in energy_points:
        # Maxwell-Boltzmann energy distribution
        energy_distribution = 2 * np.sqrt(energy_ev / (np.pi * (kB * temperature)**3)) * \
                             np.exp(-energy_ev / (kB * temperature))
        
        # Convert energy to keV for tunneling calculation
        energy_kev = energy_ev / 1000.0
        
        # Calculate tunneling probability
        tunneling_prob = calculate_tunneling_probability(
            z1, z2, a1, a2, temperature, screening_potential, energy_kev
        )
        
        # Simplified nuclear cross-section (in m²)
        # In reality, this would be energy-dependent and nucleus-specific
        sigma_nuclear = 1e-28  # Simple approximation
        
        # Contribution to the integral
        reaction_prob = energy_distribution * tunneling_prob * sigma_nuclear
        
        # Add to sum (trapezoidal rule)
        if energy_points[0] != energy_ev and energy_ev != energy_points[-1]:
            reaction_prob_sum += reaction_prob
    
    # Complete the integration
    # The full integral would be ∫ v * σ(E) * f(E) dE
    energy_width = np.log10(energy_max / energy_min) / (num_points - 1)
    reaction_prob_integral = reaction_prob_sum * energy_width
    
    # Calculate reaction rate = n1 * n2 * <σv>
    # Factor of 0.5 if nuclei are identical (avoid double counting)
    if z1 == z2 and a1 == a2:
        factor = 0.5
    else:
        factor = 1.0
    
    fusion_rate = factor * nuclei_density1 * nuclei_density2 * thermal_velocity * reaction_prob_integral
    
    logger.debug(f"Calculated fusion rate of {fusion_rate:.2e} reactions/m³/s at T={temperature}K")
    
    return fusion_rate

def calculate_resonant_tunneling_enhancement(
    z1: int,
    z2: int,
    a1: float,
    a2: float,
    resonance_energy: float,
    energy: float,
    resonance_width: float = 1.0
) -> float:
    """
    Calculate the enhancement in tunneling probability due to resonant tunneling.
    
    Args:
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        a1: Mass number of first nucleus (u)
        a2: Mass number of second nucleus (u)
        resonance_energy: Energy of the resonance in keV
        energy: Collision energy in keV
        resonance_width: Width of the resonance in keV
        
    Returns:
        Enhancement factor for tunneling probability
    """
    # Calculate the standard tunneling probability
    standard_prob = calculate_tunneling_probability(
        z1, z2, a1, a2, 300.0, None, energy
    )
    
    # Calculate the resonant enhancement using a Breit-Wigner formula
    # Simplified resonant enhancement factor
    resonant_factor = (resonance_width / 2)**2 / ((energy - resonance_energy)**2 + (resonance_width / 2)**2)
    
    # The enhancement can't be infinite - cap it at a reasonable value
    max_enhancement = 1e6
    enhancement = min(max_enhancement, 1 + resonant_factor)
    
    # Calculate the enhanced probability
    enhanced_prob = standard_prob * enhancement
    
    # Ensure probability doesn't exceed 1
    if enhanced_prob > 1.0:
        enhanced_prob = 1.0
        enhancement = 1.0 / standard_prob if standard_prob > 0 else max_enhancement
    
    logger.debug(f"Resonant tunneling enhancement: {enhancement:.2e} at E={energy} keV, E_res={resonance_energy} keV")
    
    return enhancement 