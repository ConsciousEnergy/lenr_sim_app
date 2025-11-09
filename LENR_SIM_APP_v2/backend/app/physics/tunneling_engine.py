"""
Tunneling Engine Module for LENR_Sim_App

This module implements an integrated tunneling calculation engine that combines
quantum tunneling with various enhancement mechanisms including phonon modes,
electron screening, and coherent effects for LENR simulations.
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
import math
import time
import logging

from app.utils.logging import setup_logger
from app.physics.quantum_tunneling import (
    calculate_tunneling_probability,
    calculate_gamow_factor,
    calculate_enhanced_tunneling
)
from app.physics.phonon_modes import (
    LatticeParameters,
    calculate_phonon_assisted_tunneling,
    calculate_coherent_phonon_tunneling,
    calculate_comprehensive_phonon_enhancement
)
from app.physics.models import FusionEnhancementFactors
from app.physics.optimizations import (
    optimized_integrated_tunneling,
    vectorized_gamow_factor,
    optimized_tunneling_probability
)
from app.physics.parallel_engine import (
    parallel_tunneling_calculation,
    parallel_phonon_calculation
)

# Set up logger
logger = setup_logger("tunneling_engine", "logs/physics.log")

# Physical constants
HBAR = const.hbar  # Reduced Planck constant
KB = const.k  # Boltzmann constant
ELECTRON_MASS = const.m_e  # Electron mass
PROTON_MASS = const.m_p  # Proton mass
NEUTRON_MASS = const.m_n  # Neutron mass
ELECTRON_CHARGE = const.e  # Elementary charge
VACUUM_PERMITTIVITY = const.epsilon_0  # Vacuum permittivity
AMU = const.u  # Atomic mass unit
EV_TO_J = const.e  # Conversion factor from eV to Joules
KEV_TO_J = 1e3 * EV_TO_J  # Conversion from keV to Joules
MEV_TO_J = 1e6 * EV_TO_J  # Conversion from MeV to Joules


def calculate_reduced_mass(mass1: float, mass2: float) -> float:
    """
    Calculate reduced mass of two particles
    
    Args:
        mass1: Mass of first particle in kg
        mass2: Mass of second particle in kg
        
    Returns:
        Reduced mass in kg
    """
    return (mass1 * mass2) / (mass1 + mass2)


def get_isotope_mass(atomic_number: int, mass_number: int) -> float:
    """
    Get approximate mass of an isotope in kg
    
    Args:
        atomic_number: Atomic number (Z)
        mass_number: Mass number (A)
        
    Returns:
        Mass in kg
    """
    # Simplified mass calculation - just use mass number * AMU
    # For more accurate values, a lookup table would be needed
    return mass_number * AMU


def calculate_integrated_tunneling(
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
    correlation_sites: int = 100,
    correlation_length_m: float = 1e-9,
    electron_screening_potential_ev: float = 100.0
) -> Dict[str, Any]:
    """
    Calculate integrated tunneling probability with all enhancement mechanisms
    
    Args:
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        a1: Mass number of first nucleus
        a2: Mass number of second nucleus
        energy_kev: Collision energy in keV
        temperature: Temperature in Kelvin
        barrier_width: Barrier width in meters (if None, estimated)
        lattice_params: Lattice parameters for phonon calculations
        enhancement_factors: Enhancement factors from other mechanisms
        include_phonons: Whether to include phonon enhancement
        include_coherent: Whether to include coherent tunneling effects
        include_electron_screening: Whether to include electron screening
        correlation_sites: Number of correlated sites for coherent tunneling
        correlation_length_m: Correlation length for coherent tunneling
        electron_screening_potential_ev: Electron screening potential in eV
        
    Returns:
        Dictionary with integrated tunneling calculation results
    """
    # Start timing
    start_time = time.time()
    
    # Safety checks
    energy_kev = max(1e-6, energy_kev)
    temperature = max(0.1, temperature)
    
    # Convert energy to eV
    energy_ev = energy_kev * 1e3
    
    # Get particle masses
    mass1 = get_isotope_mass(z1, a1)
    mass2 = get_isotope_mass(z2, a2)
    
    # Calculate reduced mass
    reduced_mass = calculate_reduced_mass(mass1, mass2)
    
    # Estimate Coulomb barrier height
    # V_C = (1/4πε₀) * (Z₁Z₂e²/r)
    # Estimated nuclear contact distance
    r1 = 1.25e-15 * (a1**(1/3))  # Nuclear radius in m
    r2 = 1.25e-15 * (a2**(1/3))  # Nuclear radius in m
    nuclear_distance = r1 + r2
    
    coulomb_factor = (1 / (4 * np.pi * VACUUM_PERMITTIVITY)) * (z1 * z2 * ELECTRON_CHARGE**2 / nuclear_distance)
    barrier_height_j = coulomb_factor
    barrier_height_ev = barrier_height_j / EV_TO_J
    
    # If barrier width not provided, estimate it
    if barrier_width is None:
        # Approximation: barrier width is distance from classical turning point to nuclear radius
        # Classical turning point is where E = V(r)
        # r_turning = Z₁Z₂e²/(4πε₀E)
        if energy_ev > 0:
            turning_point = (1 / (4 * np.pi * VACUUM_PERMITTIVITY)) * (z1 * z2 * ELECTRON_CHARGE**2 / (energy_ev * EV_TO_J))
            barrier_width = turning_point - nuclear_distance
            barrier_width = max(1e-15, barrier_width)  # Ensure positive width
        else:
            # Default value if energy is too low
            barrier_width = 1e-12  # 1 picometer default
    
    # Calculate base tunneling probability using the Gamow factor
    gamow = calculate_gamow_factor(z1, z2, reduced_mass, energy_ev)
    base_probability = np.exp(-gamow) if gamow < 700 else 0.0
    
    # Initialize enhancement mechanisms dictionary
    mechanism_factors = {}
    
    # Electron screening enhancement
    e_screening_factor = 1.0
    if include_electron_screening:
        # Calculate enhancement using the Salpeter formula
        sommerfeld_param = z1 * z2 * 0.157 / np.sqrt(energy_kev)  # Approximate Sommerfeld parameter
        screen_exponent = min(700, np.pi * sommerfeld_param * electron_screening_potential_ev / energy_ev)
        e_screening_factor = np.exp(screen_exponent)
        
        # Correction for very low energies
        if energy_kev < 0.1:
            correction = 0.2 + 0.8 * energy_kev / 0.1
            e_screening_factor = 1.0 + (e_screening_factor - 1.0) * correction
        
        e_screening_factor = max(1.0, min(1e6, e_screening_factor))
        mechanism_factors["electron_screening"] = float(e_screening_factor)
    
    # Phonon-assisted tunneling
    phonon_factor = 1.0
    coherent_factor = 1.0
    
    if include_phonons and lattice_params is not None:
        # Comprehensive phonon enhancement calculation
        phonon_result = calculate_comprehensive_phonon_enhancement(
            params=lattice_params,
            barrier_height_ev=barrier_height_ev,
            incident_energy_ev=energy_ev,
            barrier_width=barrier_width,
            correlation_sites=correlation_sites if include_coherent else 1,
            correlation_length_m=correlation_length_m,
            particle_mass=reduced_mass
        )
        
        # Extract enhancement factors
        total_phonon_factor = phonon_result["total_enhancement_factor"]
        phonon_factor = phonon_result["component_factors"]["phonon_assisted"]
        coherent_factor = phonon_result["component_factors"]["coherent_tunneling"]
        
        mechanism_factors["phonon_assisted"] = float(phonon_factor)
        mechanism_factors["coherent_tunneling"] = float(coherent_factor) if include_coherent else 1.0
        mechanism_factors["phonon_nuclear_coupling"] = float(phonon_result["component_factors"]["nuclear_coupling"])
    
    # Include additional enhancement factors if provided
    if enhancement_factors is not None:
        for key, value in enhancement_factors.to_dict().items():
            if key not in ["total", "log_enhancement"]:
                mechanism_factors[key] = float(value)
    
    # Calculate total enhancement
    total_enhancement = 1.0
    for factor in mechanism_factors.values():
        total_enhancement *= factor
    
    # Apply reasonable limits
    total_enhancement = min(1e20, max(1.0, total_enhancement))
    
    # Calculate enhanced probability
    enhanced_probability = min(1.0, base_probability * total_enhancement)
    
    # Logarithmic representation of enhancement (useful for large values)
    log_enhancement = np.log10(total_enhancement) if total_enhancement > 0 else 0.0
    
    # Prepare result
    result = {
        "base_probability": float(base_probability),
        "enhanced_probability": float(enhanced_probability),
        "total_enhancement_factor": float(total_enhancement),
        "log_enhancement": float(log_enhancement),
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
            "include_electron_screening": include_electron_screening,
            "processing_time_ms": (time.time() - start_time) * 1000
        }
    }
    
    # Add phonon-specific data if calculated
    if include_phonons and lattice_params is not None:
        result["phonon_data"] = {
            "lattice_type": lattice_params.lattice_type,
            "debye_temperature": lattice_params.debye_temperature,
            "correlation_sites": correlation_sites if include_coherent else 0,
            "correlation_length_m": correlation_length_m if include_coherent else 0.0
        }
    
    logger.info(f"Integrated tunneling calculation completed for Z1={z1}, Z2={z2}, E={energy_kev} keV: " +
               f"enhancement={total_enhancement:.2e}, probability={enhanced_probability:.2e}")
    
    return result


def calculate_reaction_rate(
    integrated_tunneling: Dict[str, Any],
    z1: int,
    z2: int,
    a1: int,
    a2: int,
    number_density1: float,
    number_density2: float,
    nuclear_cross_section: float,
    temperature: float,
    relative_velocity: Optional[float] = None
) -> Dict[str, Any]:
    """
    Calculate reaction rate using the enhanced tunneling probability
    
    Args:
        integrated_tunneling: Result from calculate_integrated_tunneling
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        a1: Mass number of first nucleus
        a2: Mass number of second nucleus
        number_density1: Number density of first reactant in m^-3
        number_density2: Number density of second reactant in m^-3
        nuclear_cross_section: Nuclear reaction cross section in barns (1 barn = 1e-28 m^2)
        temperature: Temperature in Kelvin
        relative_velocity: Relative velocity of particles in m/s (if None, calculated from temperature)
        
    Returns:
        Dictionary with reaction rate calculation results
    """
    # Start timing
    start_time = time.time()
    
    # Extract tunneling probability
    enhanced_probability = integrated_tunneling["enhanced_probability"]
    
    # Convert cross section from barns to m^2
    cross_section_m2 = nuclear_cross_section * 1e-28
    
    # Calculate enhanced cross section
    enhanced_cross_section = cross_section_m2 * enhanced_probability
    
    # Calculate relative velocity if not provided
    if relative_velocity is None:
        # Get particle masses
        mass1 = get_isotope_mass(z1, a1)
        mass2 = get_isotope_mass(z2, a2)
        
        # Calculate reduced mass
        reduced_mass = calculate_reduced_mass(mass1, mass2)
        
        # Calculate average relative velocity from Maxwell-Boltzmann distribution
        # v = √(8kT/πμ)
        relative_velocity = np.sqrt(8 * KB * temperature / (np.pi * reduced_mass))
    
    # Calculate reaction rate coefficient <σv>
    rate_coefficient = enhanced_cross_section * relative_velocity  # m^3/s
    
    # Calculate reaction rate density r = n1 * n2 * <σv>
    # Correct for identical particles: r = (1/2) * n1 * n2 * <σv> if identical
    identical_particles = (z1 == z2) and (a1 == a2)
    rate_density = 0.5 * number_density1 * number_density2 * rate_coefficient if identical_particles else number_density1 * number_density2 * rate_coefficient
    
    # Calculate power density (W/m^3)
    # P = r * Q, where Q is energy released per reaction
    q_value_mev = integrated_tunneling.get("q_value_mev", 0.0)
    if q_value_mev <= 0:
        # Estimate based on typical fusion reactions
        if (z1 == 1 and z2 == 1):  # H-H fusion
            q_value_mev = 17.6  # D-D fusion (average)
        elif (z1 == 1 and z2 == 2) or (z1 == 2 and z2 == 1):  # H-He or He-H
            q_value_mev = 18.3  # D-T fusion
        elif (z1 == 1 and z2 > 2) or (z1 > 2 and z2 == 1):  # p-metal or metal-p
            q_value_mev = 8.0  # p-Li7 average
        else:
            q_value_mev = 10.0  # Default estimate
    
    q_value_j = q_value_mev * MEV_TO_J
    power_density = rate_density * q_value_j  # W/m^3
    
    # Prepare result
    result = {
        "rate_coefficient_m3_s": float(rate_coefficient),
        "reaction_rate_density_m3_s": float(rate_density),
        "power_density_w_m3": float(power_density),
        "enhanced_cross_section_m2": float(enhanced_cross_section),
        "relative_velocity_m_s": float(relative_velocity),
        "q_value_mev": float(q_value_mev),
        "metadata": {
            "z1": z1,
            "z2": z2,
            "a1": a1,
            "a2": a2,
            "number_density1_m3": float(number_density1),
            "number_density2_m3": float(number_density2),
            "nuclear_cross_section_barns": float(nuclear_cross_section),
            "temperature_k": float(temperature),
            "tunneling_probability": float(enhanced_probability),
            "identical_particles": identical_particles,
            "processing_time_ms": (time.time() - start_time) * 1000
        }
    }
    
    logger.info(f"Reaction rate calculation completed: " +
               f"rate={rate_density:.2e} m^-3s^-1, power={power_density:.2e} W/m^3")
    
    return result


def calculate_tunneling_probability(
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
    Calculate tunneling probability with all enhancement mechanisms.
    
    This is a wrapper around the optimized implementation that handles
    logging and error checking.
    
    Args:
        [Same as optimized_integrated_tunneling]
        
    Returns:
        Dictionary with calculation results
    """
    try:
        logger.info(f"Calculating tunneling probability for Z1={z1}, Z2={z2}, E={energy_kev} keV")
        
        result = optimized_integrated_tunneling(
            z1=z1,
            z2=z2,
            a1=a1,
            a2=a2,
            energy_kev=energy_kev,
            temperature=temperature,
            barrier_width=barrier_width,
            lattice_params=lattice_params,
            enhancement_factors=enhancement_factors,
            include_phonons=include_phonons,
            include_coherent=include_coherent,
            include_electron_screening=include_electron_screening,
            n_cores=n_cores
        )
        
        logger.info(f"Calculation complete. Base probability: {result['base_probability']:.2e}, "
                   f"Enhanced: {result['enhanced_probability']:.2e}, "
                   f"Total enhancement: {result['total_enhancement_factor']:.2e}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error in tunneling calculation: {str(e)}")
        raise


class TunnelingEngine:
    def calculate_integrated_tunneling(self, energy_range: np.ndarray) -> np.ndarray:
        """Calculate tunneling probabilities across an energy range in parallel."""
        return parallel_tunneling_calculation(
            self._calculate_single_energy_tunneling,
            energy_range,
            self.barrier_params
        )
    
    def _calculate_single_energy_tunneling(self, energy: float, barrier_params: Dict) -> float:
        """Calculate tunneling probability at a single energy."""
        k = np.sqrt(2 * self.reduced_mass * energy) / self.hbar
        transmission = self._calculate_transmission(k, barrier_params)
        return transmission
    
    def calculate_phonon_assisted_tunneling(
        self, 
        energy_range: np.ndarray,
        phonon_modes: List[Dict[str, float]]
    ) -> np.ndarray:
        """Calculate phonon-assisted tunneling probabilities in parallel."""
        return parallel_phonon_calculation(
            self._calculate_single_phonon_contribution,
            energy_range,
            phonon_modes,
            self.barrier_params
        )
    
    def _calculate_single_phonon_contribution(
        self,
        energy: float,
        phonon_mode: Dict[str, float],
        barrier_params: Dict
    ) -> float:
        """Calculate contribution from a single phonon mode at given energy."""
        phonon_energy = phonon_mode['energy']
        coupling = phonon_mode['coupling']
        modified_energy = energy + phonon_energy
        base_probability = self._calculate_single_energy_tunneling(modified_energy, barrier_params)
        return coupling * base_probability 