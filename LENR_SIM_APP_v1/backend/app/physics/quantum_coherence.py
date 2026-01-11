"""
Quantum Coherence and Lattice Effects for LENR_Sim_App

This module implements the Local Quantum Coherence and Lattice Effects calculations
described in the Unified LENR Theory.

Following the work of Preparata and Del Giudice, this module models nuclear activation
not as a random tunneling event, but as a threshold-triggered collective phenomenon.

Key concepts:
- Coherent deuteron oscillations coupled to electromagnetic fields
- Energy concentration and phase coherence across lattice regions
- Dynamic modulation of potential landscapes
- Phonon-nuclear coupling
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
import math
import logging

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("quantum_coherence", "logs/physics.log")

# Physical constants
HBAR = const.hbar  # Reduced Planck constant in J·s
ELECTRON_CHARGE = const.e  # Elementary charge in C
ELECTRON_MASS = const.m_e  # Electron mass in kg
DEUTERON_MASS = 2.01410178 * const.u  # Deuteron mass in kg
VACUUM_PERMITTIVITY = const.epsilon_0  # Vacuum permittivity
BOLTZMANN = const.k  # Boltzmann constant in J/K
EV_TO_J = const.e  # Conversion from eV to Joules
MEV_TO_J = 1e6 * EV_TO_J  # Conversion from MeV to Joules


def calculate_phonon_frequency(
    spring_constant: float,
    effective_mass: float
) -> float:
    """
    Calculate the phonon frequency in a lattice.
    
    Args:
        spring_constant: Spring constant in N/m
        effective_mass: Effective mass in kg
        
    Returns:
        Phonon frequency in Hz
    """
    # ω = √(k/m)
    omega = np.sqrt(spring_constant / effective_mass)
    
    # Convert to Hz
    frequency = omega / (2 * np.pi)
    
    return frequency


def calculate_coherence_length(
    temperature: float,
    phonon_frequency: float
) -> float:
    """
    Calculate the coherence length in a lattice.
    
    Args:
        temperature: Temperature in Kelvin
        phonon_frequency: Phonon frequency in Hz
        
    Returns:
        Coherence length in meters
    """
    # Thermal de Broglie wavelength approximation for coherence length
    # λ_c ~ hbar * √(D/kT)
    # where D is related to phonon frequency: D ~ ħω
    
    # Thermal energy
    kT = BOLTZMANN * temperature
    
    # Phonon energy
    phonon_energy = HBAR * 2 * np.pi * phonon_frequency
    
    # Coherence length
    coherence_length = HBAR * np.sqrt(phonon_energy / kT)
    
    # Limit to reasonable values
    coherence_length = min(1e-6, max(1e-12, coherence_length))
    
    logger.debug(f"Coherence length: {coherence_length:.2e} m at T={temperature} K")
    
    return coherence_length


def calculate_coherent_domain_population(
    coherence_length: float,
    lattice_constant: float
) -> int:
    """
    Calculate the number of atoms/deuterons in a coherent domain.
    
    Args:
        coherence_length: Coherence length in meters
        lattice_constant: Lattice constant in meters
        
    Returns:
        Number of atoms in the coherent domain
    """
    # Volume of coherent domain (approximated as a sphere)
    volume_domain = (4/3) * np.pi * coherence_length**3
    
    # Volume per atom (approximated from lattice constant)
    volume_per_atom = lattice_constant**3
    
    # Number of atoms in the domain
    n_atoms = int(volume_domain / volume_per_atom)
    
    # Ensure at least 1 atom
    n_atoms = max(1, n_atoms)
    
    return n_atoms


def calculate_energy_localization(
    coherent_domain_size: int,
    phonon_energy: float,
    coupling_strength: float
) -> float:
    """
    Calculate the energy localization in a coherent domain.
    
    Args:
        coherent_domain_size: Number of atoms in the coherent domain
        phonon_energy: Phonon energy in eV
        coupling_strength: Coupling strength factor (0-1)
        
    Returns:
        Localized energy in eV
    """
    # This is a simplified model for energy localization due to coherence
    # In a fully coherent system, energy can be concentrated by N for N oscillators
    
    # Base energy concentration from coherent oscillators
    base_concentration = coherent_domain_size * phonon_energy
    
    # Apply coupling efficiency (how effectively energy transfers)
    localized_energy = base_concentration * coupling_strength
    
    # Apply nonlinear scaling to account for decoherence effects
    # Saturation at large domain sizes
    if coherent_domain_size > 100:
        localized_energy *= np.sqrt(100 / coherent_domain_size)
    
    logger.debug(f"Localized energy: {localized_energy:.2f} eV in domain of {coherent_domain_size} atoms")
    
    return localized_energy


def calculate_scalar_field_coupling(
    electric_field: float
) -> float:
    """
    Calculate the coupling strength for the scalar field model from the paper.
    
    Args:
        electric_field: Electric field strength in V/m
        
    Returns:
        Coupling strength (g in the Lagrangian)
    """
    # This is based on the Lagrangian from the paper:
    # L = (1/2)(∂μΦ)² - (1/2)m²Φ² - gΦ²AμAμ
    
    # Simple model for coupling strength based on field strength
    # Calibrated to give reasonable values
    coupling_strength = 1e-10 * (electric_field / 1e6)**2
    
    # Limit to reasonable range
    coupling_strength = min(1e-8, max(1e-12, coupling_strength))
    
    return coupling_strength


def calculate_potential_flattening(
    electric_field: float,
    coherence_length: float
) -> float:
    """
    Calculate the potential barrier flattening due to coherent field effects.
    
    Args:
        electric_field: Electric field strength in V/m
        coherence_length: Coherence length in meters
        
    Returns:
        Potential flattening in eV
    """
    # Electric potential across coherence length
    potential_V = electric_field * coherence_length
    
    # Convert to eV
    potential_eV = potential_V
    
    # Apply nonlinear scaling for coherence effects
    # This models the barrier flattening from the paper
    flattening_eV = potential_eV * np.sqrt(coherence_length / 1e-9)
    
    # Limit to reasonable values
    flattening_eV = min(100.0, flattening_eV)
    
    return flattening_eV


def calculate_mass_renormalization(
    coherent_domain_size: int,
    phonon_energy_eV: float
) -> float:
    """
    Calculate the effective mass renormalization factor due to coherent effects.
    
    Args:
        coherent_domain_size: Number of atoms in the coherent domain
        phonon_energy_eV: Phonon energy in eV
        
    Returns:
        Mass renormalization factor (m_eff/m)
    """
    # This models the mass renormalization effect described in the paper
    # where coherent modes can modify the effective mass of particles
    
    # Base renormalization from coherent modes
    base_factor = 1.0 - 0.01 * np.log10(max(1, coherent_domain_size))
    
    # Energy-dependent component
    energy_factor = 1.0 - 0.05 * np.log10(max(0.001, phonon_energy_eV))
    
    # Combined factor (limited to range [0.1, 1.0])
    combined_factor = max(0.1, min(1.0, base_factor * energy_factor))
    
    return combined_factor


def calculate_coherence_enhancement(
    temperature: float,
    lattice_constant: float,
    electric_field: float,
    spring_constant: float = 50.0,
    base_tunneling_prob: float = 1e-50
) -> Dict[str, Any]:
    """
    Calculate the enhancement factor due to quantum coherence effects.
    
    Args:
        temperature: Temperature in Kelvin
        lattice_constant: Lattice constant in meters
        electric_field: Electric field in V/m
        spring_constant: Spring constant in N/m
        base_tunneling_prob: Base tunneling probability without enhancement
        
    Returns:
        Dictionary with coherence enhancement results
    """
    # Effective mass for deuterons in the lattice
    effective_mass = DEUTERON_MASS
    
    # Calculate phonon frequency
    phonon_freq = calculate_phonon_frequency(spring_constant, effective_mass)
    
    # Calculate phonon energy
    phonon_energy_J = 2 * np.pi * HBAR * phonon_freq
    phonon_energy_eV = phonon_energy_J / EV_TO_J
    
    # Calculate coherence length
    coherence_length = calculate_coherence_length(temperature, phonon_freq)
    
    # Calculate coherent domain population
    domain_size = calculate_coherent_domain_population(coherence_length, lattice_constant)
    
    # Coupling strength
    coupling = min(0.5, 0.1 * np.sqrt(electric_field / 1e6))
    
    # Calculate energy localization
    localized_energy = calculate_energy_localization(domain_size, phonon_energy_eV, coupling)
    
    # Calculate potential flattening
    flattening = calculate_potential_flattening(electric_field, coherence_length)
    
    # Calculate mass renormalization
    mass_factor = calculate_mass_renormalization(domain_size, phonon_energy_eV)
    
    # Combined enhancement calculation
    # 1. Energy localization contribution
    energy_enhancement = np.exp(min(20.0, localized_energy / 5.0))
    
    # 2. Barrier flattening contribution
    barrier_enhancement = np.exp(min(20.0, flattening / 10.0))
    
    # 3. Mass renormalization contribution
    # Tunneling probability scales as exp(-√(m)) so lighter mass enhances tunneling
    mass_enhancement = np.exp(min(10.0, 5.0 * (1.0 - mass_factor)))
    
    # 4. Coherent domain size contribution
    # For very large domains, this can be significant
    if domain_size > 100:
        domain_enhancement = np.sqrt(domain_size / 100)
    else:
        domain_enhancement = 1.0
    
    # Combined enhancement factor
    combined_enhancement = (
        energy_enhancement * 
        barrier_enhancement * 
        mass_enhancement * 
        domain_enhancement
    )
    
    # Limit to realistic values based on paper (10^3-10^5)
    log_enhancement = min(5.0, np.log10(combined_enhancement) if combined_enhancement > 0 else 0)
    capped_enhancement = 10**log_enhancement
    
    # Enhanced tunneling probability
    enhanced_prob = base_tunneling_prob * capped_enhancement
    
    # Prepare results
    results = {
        "coherence_length_m": coherence_length,
        "coherent_domain_size": domain_size,
        "phonon_frequency_Hz": phonon_freq,
        "phonon_energy_eV": phonon_energy_eV,
        "localized_energy_eV": localized_energy,
        "potential_flattening_eV": flattening,
        "mass_renormalization_factor": mass_factor,
        "energy_enhancement": energy_enhancement,
        "barrier_enhancement": barrier_enhancement,
        "mass_enhancement": mass_enhancement,
        "domain_enhancement": domain_enhancement,
        "enhancement_factor": capped_enhancement,
        "log_enhancement": log_enhancement,
        "enhanced_probability": enhanced_prob,
        "metadata": {
            "temperature_K": temperature,
            "lattice_constant_m": lattice_constant,
            "electric_field_V_m": electric_field,
            "spring_constant_N_m": spring_constant
        }
    }
    
    return results


def analyze_coherence_effects(
    temperatures: List[float],
    lattice_constant: float,
    electric_field: float,
    spring_constant: float = 50.0
) -> Dict[str, Any]:
    """
    Analyze quantum coherence effects over a range of temperatures.
    
    Args:
        temperatures: List of temperatures in Kelvin
        lattice_constant: Lattice constant in meters
        electric_field: Electric field in V/m
        spring_constant: Spring constant in N/m
        
    Returns:
        Dictionary with analysis results
    """
    results = {
        "temperatures": temperatures,
        "coherence_lengths": [],
        "domain_sizes": [],
        "localized_energies": [],
        "enhancement_factors": [],
        "metadata": {
            "lattice_constant_m": lattice_constant,
            "electric_field_V_m": electric_field,
            "spring_constant_N_m": spring_constant
        }
    }
    
    # Base fusion probability (approximate)
    base_prob = 1e-60  # Placeholder for conventional fusion probability
    
    # Calculate effects for each temperature
    for temp in temperatures:
        enhancement_data = calculate_coherence_enhancement(
            temp, lattice_constant, electric_field, spring_constant, base_prob
        )
        
        results["coherence_lengths"].append(enhancement_data["coherence_length_m"])
        results["domain_sizes"].append(enhancement_data["coherent_domain_size"])
        results["localized_energies"].append(enhancement_data["localized_energy_eV"])
        results["enhancement_factors"].append(enhancement_data["enhancement_factor"])
    
    # Find optimal temperature
    if results["enhancement_factors"]:
        opt_idx = np.argmax(results["enhancement_factors"])
        results["optimal_temperature"] = temperatures[opt_idx]
        results["max_enhancement"] = results["enhancement_factors"][opt_idx]
    else:
        results["optimal_temperature"] = 0.0
        results["max_enhancement"] = 1.0
    
    return results


def model_phonon_dynamics(
    lattice_size: int,
    temperature: float,
    excitation_amplitude: float,
    time_steps: int = 100
) -> Dict[str, Any]:
    """
    Model the dynamics of phonons in a lattice over time.
    
    Args:
        lattice_size: Size of the lattice grid (N×N×N)
        temperature: Temperature in Kelvin
        excitation_amplitude: Amplitude of initial excitation
        time_steps: Number of time steps to simulate
        
    Returns:
        Dictionary with simulation results
    """
    # Simplified model for phonon dynamics
    # In reality, would use molecular dynamics or more sophisticated approaches
    
    # Initialize lattice with thermal fluctuations
    thermal_energy = BOLTZMANN * temperature / EV_TO_J  # in eV
    lattice = np.random.normal(0, np.sqrt(thermal_energy), (lattice_size, lattice_size, lattice_size))
    
    # Add excitation at the center
    center = lattice_size // 2
    excitation_radius = lattice_size // 10
    for i in range(lattice_size):
        for j in range(lattice_size):
            for k in range(lattice_size):
                distance = np.sqrt((i-center)**2 + (j-center)**2 + (k-center)**2)
                if distance < excitation_radius:
                    lattice[i,j,k] += excitation_amplitude * (1 - distance/excitation_radius)
    
    # Track energy over time
    energy_history = []
    localization_history = []
    coherence_history = []
    
    # Simple time evolution
    for step in range(time_steps):
        # Calculate total energy
        total_energy = np.sum(lattice**2)
        energy_history.append(total_energy)
        
        # Calculate energy localization (max / average)
        max_energy = np.max(lattice**2)
        avg_energy = np.mean(lattice**2)
        localization = max_energy / avg_energy if avg_energy > 0 else 1.0
        localization_history.append(localization)
        
        # Calculate coherence (simplified)
        # Using spatial correlation as a proxy for coherence
        coherence = 0.0
        if step > 0:
            coherence = np.corrcoef(lattice.flatten(), np.roll(lattice, 1).flatten())[0, 1]
        coherence_history.append(coherence)
        
        # Update lattice (simple diffusion model)
        new_lattice = np.copy(lattice)
        for i in range(1, lattice_size-1):
            for j in range(1, lattice_size-1):
                for k in range(1, lattice_size-1):
                    # Average with nearest neighbors
                    new_lattice[i,j,k] = 0.7 * lattice[i,j,k] + 0.05 * (
                        lattice[i+1,j,k] + lattice[i-1,j,k] +
                        lattice[i,j+1,k] + lattice[i,j-1,k] +
                        lattice[i,j,k+1] + lattice[i,j,k-1]
                    )
        lattice = new_lattice
    
    # Prepare results
    results = {
        "energy_history": energy_history,
        "localization_history": localization_history,
        "coherence_history": coherence_history,
        "final_max_energy": np.max(lattice**2),
        "metadata": {
            "lattice_size": lattice_size,
            "temperature_K": temperature,
            "excitation_amplitude": excitation_amplitude,
            "time_steps": time_steps
        }
    }
    
    return results 