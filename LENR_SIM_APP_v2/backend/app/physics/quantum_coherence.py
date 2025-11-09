"""
Quantum Coherence Module for LENR Simulations

This module provides functions to calculate quantum coherence effects
in LENR systems. Coherence effects may play a significant role in
enhancing nuclear reaction rates at low energies.
"""

import numpy as np
import logging
from typing import Union, Tuple, Dict, Any, Optional

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("quantum_coherence", "logs/simulation.log")

def calculate_coherence_length(
    temperature: float,
    particle_type: str = "electron",
    material_type: str = "metal"
) -> float:
    """
    Calculate the quantum coherence length for particles in a material.
    
    Args:
        temperature: Temperature in Kelvin
        particle_type: Type of particle ('electron', 'deuteron', 'proton', etc.)
        material_type: Type of material ('metal', 'semiconductor', etc.)
        
    Returns:
        Coherence length in meters
    """
    # Physical constants
    hbar = 1.054571817e-34  # Reduced Planck constant in J·s
    kB = 1.380649e-23  # Boltzmann constant in J/K
    c = 299792458  # Speed of light in m/s
    
    # Particle masses in kg
    masses = {
        "electron": 9.1093837015e-31,
        "proton": 1.67262192369e-27,
        "deuteron": 3.3435837724e-27,  # Deuteron mass (approx. 2*proton)
        "triton": 5.0082766586e-27,    # Triton mass (approx. 3*proton)
        "helium3": 5.0082766586e-27,   # Helium-3 nucleus
        "helium4": 6.6465345738e-27,   # Alpha particle (helium-4 nucleus)
        "lithium": 1.1650605197e-26    # Lithium-7 nucleus (approx.)
    }
    
    # Get particle mass
    if particle_type.lower() in masses:
        mass = masses[particle_type.lower()]
    else:
        logger.warning(f"Unknown particle type: {particle_type}, using proton mass")
        mass = masses["proton"]
    
    # Calculate thermal de Broglie wavelength
    # λ = h/√(2πmkT)
    thermal_wavelength = hbar * np.sqrt(2 * np.pi / (mass * kB * temperature))
    
    # For electrons in metals, account for Fermi energy (approximate)
    if particle_type.lower() == "electron" and material_type.lower() == "metal":
        # Typical Fermi energy for metals ~ 5-10 eV
        fermi_energy = 8.0  # eV
        fermi_energy_joules = fermi_energy * 1.602176634e-19  # Convert to Joules
        
        # For degenerate electron gas, coherence length is related to Fermi wavelength
        fermi_wavelength = hbar * np.sqrt(2 * np.pi / (mass * fermi_energy_joules))
        
        # Interpolate between thermal and Fermi wavelengths
        # At low T, coherence length approaches Fermi wavelength
        # At high T, it approaches thermal wavelength
        fermi_temperature = fermi_energy_joules / kB  # Temperature scale for Fermi energy
        weight = np.exp(-temperature / fermi_temperature)
        coherence_length = weight * fermi_wavelength + (1 - weight) * thermal_wavelength
    else:
        # For other particles, just use thermal wavelength
        coherence_length = thermal_wavelength
    
    logger.debug(f"Calculated coherence length of {coherence_length:.2e} m for {particle_type} at T={temperature}K")
    
    return coherence_length

def calculate_coherence_time(
    temperature: float,
    system_coupling: float = 0.1,
    particle_type: str = "electron"
) -> float:
    """
    Calculate the quantum coherence time for particles in a material.
    
    Args:
        temperature: Temperature in Kelvin
        system_coupling: Coupling strength to environment (0-1)
        particle_type: Type of particle
        
    Returns:
        Coherence time in seconds
    """
    # Physical constants
    hbar = 1.054571817e-34  # Reduced Planck constant in J·s
    kB = 1.380649e-23  # Boltzmann constant in J/K
    
    # Base thermal decoherence time (simple model)
    # τ ~ ħ/(k_B T)
    base_decoherence_time = hbar / (kB * temperature)
    
    # Scale by coupling to environment (stronger coupling = faster decoherence)
    # Weak coupling preserves coherence longer
    coupling_factor = np.exp(-10 * system_coupling)  # Exponential scaling
    
    # Particle-specific factors
    particle_factors = {
        "electron": 10.0,  # Electrons maintain coherence longer
        "proton": 1.0,
        "deuteron": 0.8,
        "triton": 0.7,
        "helium3": 0.5,
        "helium4": 0.4,
        "lithium": 0.2
    }
    
    # Get particle-specific factor
    if particle_type.lower() in particle_factors:
        particle_factor = particle_factors[particle_type.lower()]
    else:
        logger.warning(f"Unknown particle type: {particle_type}, using default factor")
        particle_factor = 1.0
    
    # Calculate coherence time
    coherence_time = base_decoherence_time * coupling_factor * particle_factor
    
    logger.debug(f"Calculated coherence time of {coherence_time:.2e} s for {particle_type} at T={temperature}K")
    
    return coherence_time

def calculate_coherent_domains(
    material_density: float,
    coherence_length: float,
    lattice_constant: float
) -> Dict[str, Any]:
    """
    Calculate properties of coherent domains in a material.
    
    Args:
        material_density: Material density in kg/m³
        coherence_length: Quantum coherence length in meters
        lattice_constant: Lattice constant in meters
        
    Returns:
        Dictionary with coherent domain properties
    """
    # Calculate coherent domain volume
    coherent_volume = (4/3) * np.pi * coherence_length**3
    
    # Calculate number of lattice sites in coherent domain
    volume_per_site = lattice_constant**3
    sites_per_domain = coherent_volume / volume_per_site
    
    # Calculate mass of coherent domain
    domain_mass = coherent_volume * material_density
    
    # Calculate approximate number of atoms in domain
    # Assuming simple cubic lattice with one atom per site
    atoms_per_domain = sites_per_domain
    
    results = {
        "coherence_length": coherence_length,
        "coherent_volume": coherent_volume,
        "sites_per_domain": sites_per_domain,
        "atoms_per_domain": atoms_per_domain,
        "domain_mass": domain_mass,
        "parameters": {
            "material_density": material_density,
            "lattice_constant": lattice_constant
        }
    }
    
    logger.debug(f"Calculated coherent domain with {atoms_per_domain:.1f} atoms at L={coherence_length*1e9:.2f} nm")
    
    return results

def calculate_coherent_tunneling_enhancement(
    coherence_length: float,
    inter_nucleus_distance: float,
    particle_density: float,
    temperature: float
) -> float:
    """
    Calculate the enhancement factor for tunneling due to quantum coherence.
    
    Args:
        coherence_length: Quantum coherence length in meters
        inter_nucleus_distance: Distance between nuclei in meters
        particle_density: Number density of particles in particles/m³
        temperature: Temperature in Kelvin
        
    Returns:
        Enhancement factor (dimensionless)
    """
    # Physical constants
    hbar = 1.054571817e-34  # Reduced Planck constant in J·s
    kB = 1.380649e-23  # Boltzmann constant in J/K
    
    # Effective number of coherently coupled particles
    # N ~ (coherence_length/inter_nuclear_distance)³
    coherently_coupled = (coherence_length / inter_nucleus_distance)**3
    
    # Constraint: can't have more coupled particles than are actually present
    volume = coherence_length**3
    max_particles = volume * particle_density
    coherently_coupled = min(coherently_coupled, max_particles)
    
    # If no coherence, no enhancement
    if coherently_coupled <= 1:
        return 1.0
    
    # Simplified model: enhancement scales as √N
    # This represents the amplitude enhancement from coherent superposition
    amplitude_enhancement = np.sqrt(coherently_coupled)
    
    # Temperature-dependent reduction factor
    # Coherence effects decrease with temperature
    temperature_factor = np.exp(-temperature / 300.0)  # Normalized to room temp
    
    # Final enhancement calculation
    enhancement = 1.0 + (amplitude_enhancement - 1.0) * temperature_factor
    
    # Cap at realistic values
    max_enhancement = 1e3
    enhancement = min(enhancement, max_enhancement)
    
    logger.debug(f"Calculated coherent tunneling enhancement: {enhancement:.2e}")
    
    return enhancement

def calculate_many_body_coherence(
    density: float,
    temperature: float,
    lattice_constant: float,
    n_particles: int = 2
) -> Dict[str, Any]:
    """
    Calculate many-body coherence effects for LENR.
    
    Args:
        density: Particle density in particles/m³
        temperature: Temperature in Kelvin
        lattice_constant: Lattice constant in meters
        n_particles: Number of particles in coherent state
        
    Returns:
        Dictionary with many-body coherence properties
    """
    # Physical constants
    hbar = 1.054571817e-34  # Reduced Planck constant in J·s
    kB = 1.380649e-23  # Boltzmann constant in J/K
    
    # Calculate average inter-particle distance
    inter_particle_distance = (1.0 / density)**(1/3)
    
    # Calculate coherence length for relevant particles
    if n_particles == 2:
        # For 2-body coherence, use deuterons or protons
        coherence_length = calculate_coherence_length(temperature, "deuteron", "metal")
        particle_type = "deuteron"
    else:
        # For many-body, use electrons as mediators
        coherence_length = calculate_coherence_length(temperature, "electron", "metal")
        particle_type = "electron"
    
    # Calculate coherence time
    coherence_time = calculate_coherence_time(temperature, 0.1, particle_type)
    
    # Calculate coherent domain properties
    coherent_domains = calculate_coherent_domains(
        1000.0,  # Generic density kg/m³
        coherence_length,
        lattice_constant
    )
    
    # Calculate effective interaction distance during coherence time
    # Simple model: d ~ √(D*τ) where D is diffusion coefficient and τ is coherence time
    diffusion_coeff = 1e-9  # m²/s (typical for hydrogen in metals)
    interaction_distance = np.sqrt(diffusion_coeff * coherence_time)
    
    # Calculate probability of n_particles being in coherent state
    # P ~ (V_coherent/V_total)^(n-1) where V_total = 1/density
    v_coherent = (4/3) * np.pi * coherence_length**3
    v_total = 1.0 / density
    coherent_probability = (v_coherent / v_total)**(n_particles - 1)
    
    # Cap at 1.0
    coherent_probability = min(1.0, coherent_probability)
    
    results = {
        "coherence_length": coherence_length,
        "coherence_time": coherence_time,
        "inter_particle_distance": inter_particle_distance,
        "interaction_distance": interaction_distance,
        "coherent_probability": coherent_probability,
        "coherent_domains": coherent_domains,
        "parameters": {
            "density": density,
            "temperature": temperature,
            "lattice_constant": lattice_constant,
            "n_particles": n_particles
        }
    }
    
    logger.debug(f"Calculated {n_particles}-body coherence with P={coherent_probability:.2e}")
    
    return results 