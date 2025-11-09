"""
Phonon Modes Module for LENR Simulations

This module provides functions to calculate phonon-related effects
in LENR systems. Phonons mediate lattice dynamics which can influence
nuclear reactions by modulating potential barriers and creating
localized energy concentrations.
"""

import numpy as np
import logging
from typing import Union, Tuple, Dict, Any, Optional, List
from dataclasses import dataclass

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("phonon_modes", "logs/simulation.log")

@dataclass
class LatticeParameters:
    """
    Class representing physical parameters of a crystal lattice.
    Used for phonon calculations and other lattice-based simulations.
    """
    # Basic lattice parameters
    lattice_constant: float  # in Å or m (depends on context)
    lattice_type: str = "fcc"  # fcc, bcc, sc, etc.
    
    # Material-specific parameters
    debye_temperature: float = 300.0  # in K
    mass_density: float = 1000.0  # in kg/m³
    atomic_mass: float = 1.0  # in atomic mass units
    
    # Elastic properties
    youngs_modulus: float = 100e9  # in Pa
    poisson_ratio: float = 0.3  # dimensionless
    bulk_modulus: float = 100e9  # in Pa
    
    # Thermal properties
    thermal_conductivity: float = 10.0  # in W/(m·K)
    specific_heat: float = 300.0  # in J/(kg·K)
    thermal_expansion: float = 1e-5  # in 1/K
    
    # Calculated phonon properties (filled by functions)
    sound_velocity: Optional[float] = None  # in m/s
    debye_frequency: Optional[float] = None  # in Hz
    
    def __post_init__(self):
        """Calculate derived properties if not provided"""
        # Calculate sound velocity if not provided
        if self.sound_velocity is None:
            # Approximate from elastic properties for longitudinal waves
            # v = √(E/ρ) where E is Young's modulus, ρ is density
            self.sound_velocity = np.sqrt(self.youngs_modulus / self.mass_density)
        
        # Calculate Debye frequency if not provided
        if self.debye_frequency is None and self.debye_temperature is not None:
            # ω_D = k_B * Θ_D / ħ
            kB = 1.380649e-23  # Boltzmann constant in J/K
            hbar = 1.054571817e-34  # Reduced Planck constant in J·s
            omega_debye = kB * self.debye_temperature / hbar
            self.debye_frequency = omega_debye / (2 * np.pi)

def calculate_debye_frequency(
    debye_temperature: float
) -> float:
    """
    Calculate the Debye frequency from the Debye temperature.
    
    Args:
        debye_temperature: Debye temperature in Kelvin
        
    Returns:
        Debye frequency in Hz
    """
    # Physical constants
    kB = 1.380649e-23  # Boltzmann constant in J/K
    hbar = 1.054571817e-34  # Reduced Planck constant in J·s
    
    # ω_D = k_B * Θ_D / ħ
    omega_debye = kB * debye_temperature / hbar
    
    # Convert to Hz (ω = 2πf)
    debye_frequency = omega_debye / (2 * np.pi)
    
    logger.debug(f"Calculated Debye frequency of {debye_frequency:.2e} Hz from Θ_D={debye_temperature}K")
    
    return debye_frequency

def calculate_phonon_dispersion(
    lattice_constant: float,
    sound_velocity: float,
    max_wavevector: Optional[float] = None,
    num_points: int = 100
) -> Dict[str, np.ndarray]:
    """
    Calculate phonon dispersion relation for a simple cubic lattice.
    
    Args:
        lattice_constant: Lattice constant in meters
        sound_velocity: Sound velocity in the material in m/s
        max_wavevector: Maximum wavevector to consider (default: π/a)
        num_points: Number of points in the dispersion curve
        
    Returns:
        Dictionary with wavevectors and frequencies
    """
    # Calculate maximum wavevector if not provided
    if max_wavevector is None:
        max_wavevector = np.pi / lattice_constant
    
    # Generate wavevector points
    k_points = np.linspace(0, max_wavevector, num_points)
    
    # Calculate acoustic phonon frequencies
    # Simple model: ω = v_s * k * sin(ka/2)/(ka/2) for longitudinal acoustic mode
    # This captures the linear behavior at small k and flattening near the zone boundary
    ka_half = k_points * lattice_constant / 2
    # Avoid division by zero at k=0
    sinc = np.ones_like(ka_half)
    mask = ka_half != 0
    sinc[mask] = np.sin(ka_half[mask]) / ka_half[mask]
    
    # Longitudinal acoustic mode
    omega_la = sound_velocity * k_points * sinc
    
    # Transverse acoustic modes (two of them, slightly lower frequency)
    omega_ta1 = 0.7 * sound_velocity * k_points * sinc
    omega_ta2 = 0.7 * sound_velocity * k_points * sinc
    
    # Convert to Hz
    freq_la = omega_la / (2 * np.pi)
    freq_ta1 = omega_ta1 / (2 * np.pi)
    freq_ta2 = omega_ta2 / (2 * np.pi)
    
    # For an optical branch (if present, as in materials with multiple atoms per unit cell)
    # Simple model: constant frequency + small dispersion
    freq_optical = np.ones_like(k_points) * (sound_velocity / lattice_constant) / (2 * np.pi)
    
    return {
        "wavevector": k_points,
        "frequency_la": freq_la,
        "frequency_ta1": freq_ta1,
        "frequency_ta2": freq_ta2,
        "frequency_optical": freq_optical
    }

def calculate_phonon_density_of_states(
    dispersion: Dict[str, np.ndarray],
    energy_range: Tuple[float, float] = (0, 0.1),
    num_bins: int = 100
) -> Dict[str, np.ndarray]:
    """
    Calculate the phonon density of states from a dispersion relation.
    
    Args:
        dispersion: Phonon dispersion data from calculate_phonon_dispersion
        energy_range: Range of energies to consider in eV
        num_bins: Number of energy bins
        
    Returns:
        Dictionary with energies and density of states
    """
    # Physical constants
    hbar = 1.054571817e-34  # Reduced Planck constant in J·s
    ev_to_j = 1.602176634e-19  # Conversion from eV to J
    
    # Extract frequencies from dispersion
    frequencies = []
    for key in dispersion:
        if key.startswith("frequency_"):
            frequencies.extend(dispersion[key])
    
    # Convert frequencies to energies in eV
    energies = np.array(frequencies) * hbar * 2 * np.pi / ev_to_j
    
    # Create histogram for density of states
    energy_bins = np.linspace(energy_range[0], energy_range[1], num_bins)
    dos, edges = np.histogram(energies, bins=energy_bins, density=True)
    
    # Bin centers for plotting
    energy_points = (edges[:-1] + edges[1:]) / 2
    
    return {
        "energy": energy_points,
        "dos": dos
    }

def calculate_phonon_spectrum(
    lattice_constant: float,
    debye_temperature: float,
    mass_density: float
) -> Dict[str, Any]:
    """
    Calculate the phonon spectrum for a material.
    
    Args:
        lattice_constant: Lattice constant in meters
        debye_temperature: Debye temperature in Kelvin
        mass_density: Mass density in kg/m³
        
    Returns:
        Dictionary with phonon spectrum data
    """
    # Physical constants
    kB = 1.380649e-23  # Boltzmann constant in J/K
    hbar = 1.054571817e-34  # Reduced Planck constant in J·s
    
    # Calculate Debye frequency
    debye_freq = calculate_debye_frequency(debye_temperature)
    
    # Estimate sound velocity from Debye model
    # v_s ≈ (k_B * Θ_D) / (ħ * (6π²n)^(1/3))
    # where n is the number density of atoms
    
    # Estimate number density of atoms (n)
    # Assuming simple cubic lattice for simplicity
    n = 1 / lattice_constant**3  # atoms/m³
    
    sound_velocity = (kB * debye_temperature) / (hbar * (6 * np.pi**2 * n)**(1/3))
    
    # Calculate dispersion
    dispersion = calculate_phonon_dispersion(lattice_constant, sound_velocity)
    
    # Calculate density of states
    max_phonon_energy = hbar * 2 * np.pi * debye_freq / 1.602176634e-19  # in eV
    dos = calculate_phonon_density_of_states(
        dispersion, 
        energy_range=(0, max_phonon_energy), 
        num_bins=100
    )
    
    # Calculate some key properties
    max_frequency = debye_freq
    cutoff_energy = hbar * 2 * np.pi * max_frequency / 1.602176634e-19  # in eV
    
    # Maximum phonon wavevector (Debye wavevector)
    k_debye = (6 * np.pi**2 * n)**(1/3)
    
    results = {
        "debye_frequency": debye_freq,
        "sound_velocity": sound_velocity,
        "max_wavevector": k_debye,
        "max_energy_ev": cutoff_energy,
        "dispersion": dispersion,
        "density_of_states": dos,
        "parameters": {
            "lattice_constant": lattice_constant,
            "debye_temperature": debye_temperature,
            "mass_density": mass_density
        }
    }
    
    logger.info(f"Calculated phonon spectrum with Debye frequency {debye_freq:.2e} Hz")
    
    return results

def calculate_phonon_occupation(
    frequency: Union[float, np.ndarray],
    temperature: float
) -> Union[float, np.ndarray]:
    """
    Calculate the average phonon occupation number at a given temperature.
    
    Args:
        frequency: Phonon frequency in Hz
        temperature: Temperature in Kelvin
        
    Returns:
        Average occupation number (Bose-Einstein distribution)
    """
    # Physical constants
    hbar = 1.054571817e-34  # Reduced Planck constant in J·s
    kB = 1.380649e-23  # Boltzmann constant in J/K
    
    # Ensure temperature is positive
    temperature = max(0.1, temperature)
    
    # Energy of the phonon mode (E = ħω)
    energy = hbar * 2 * np.pi * frequency
    
    # Bose-Einstein distribution: n = 1/(exp(E/kT) - 1)
    exponent = energy / (kB * temperature)
    
    # Handle potential numerical issues
    if isinstance(exponent, np.ndarray):
        # Cap very large exponents to avoid underflow
        exponent = np.minimum(exponent, 700)
        occupation = 1.0 / (np.exp(exponent) - 1.0)
    else:
        # For scalar case
        if exponent > 700:
            occupation = 0.0  # essentially zero occupation
        else:
            occupation = 1.0 / (np.exp(exponent) - 1.0)
    
    return occupation

def calculate_phonon_assisted_tunneling(
    debye_temperature: float,
    temperature: float,
    barrier_height: float,
    barrier_width: float,
    coupling_strength: float = 0.1
) -> Dict[str, Any]:
    """
    Calculate phonon-assisted tunneling parameters for LENR.
    
    Args:
        debye_temperature: Debye temperature in Kelvin
        temperature: System temperature in Kelvin
        barrier_height: Tunneling barrier height in eV
        barrier_width: Tunneling barrier width in meters
        coupling_strength: Electron-phonon coupling strength (0-1)
        
    Returns:
        Dictionary with phonon-assisted tunneling data
    """
    # Physical constants
    hbar = 1.054571817e-34  # Reduced Planck constant in J·s
    kB = 1.380649e-23  # Boltzmann constant in J/K
    m_p = 1.67262192369e-27  # Proton mass in kg
    ev_to_j = 1.602176634e-19  # Conversion from eV to J
    
    # Calculate Debye frequency
    debye_freq = calculate_debye_frequency(debye_temperature)
    
    # Calculate characteristic phonon energy in eV
    phonon_energy_ev = hbar * 2 * np.pi * debye_freq / ev_to_j
    
    # Calculate average phonon occupation at the given temperature
    phonon_occupation = calculate_phonon_occupation(debye_freq, temperature)
    
    # Calculate effective barrier modification due to phonon assistance
    # Simple model: phonons can donate energy to tunneling particles
    effective_barrier = barrier_height - coupling_strength * phonon_energy_ev * (phonon_occupation + 0.5)
    effective_barrier = max(0.1 * barrier_height, effective_barrier)  # Ensure it's not too low
    
    # Calculate base tunneling exponent without phonon assistance
    # Using WKB approximation: -2∫√(2m(V(x)-E))/ħ dx
    base_exponent = -2 * barrier_width * np.sqrt(2 * m_p * barrier_height * ev_to_j) / hbar
    
    # Calculate modified tunneling exponent with phonon assistance
    modified_exponent = -2 * barrier_width * np.sqrt(2 * m_p * effective_barrier * ev_to_j) / hbar
    
    # Calculate enhancement factor
    enhancement = np.exp(base_exponent - modified_exponent)
    
    # Cap at reasonable values
    enhancement = min(1e6, enhancement)
    
    results = {
        "phonon_energy_ev": phonon_energy_ev,
        "phonon_occupation": phonon_occupation,
        "effective_barrier_ev": effective_barrier,
        "base_tunneling_exponent": base_exponent,
        "modified_tunneling_exponent": modified_exponent,
        "enhancement_factor": enhancement,
        "parameters": {
            "debye_temperature": debye_temperature,
            "temperature": temperature,
            "barrier_height": barrier_height,
            "barrier_width": barrier_width,
            "coupling_strength": coupling_strength
        }
    }
    
    logger.debug(f"Calculated phonon-assisted tunneling with enhancement {enhancement:.2e}")
    
    return results

def calculate_phonon_scattering_rates(
    temperature: float,
    debye_temperature: float,
    impurity_concentration: float = 0.01
) -> Dict[str, Any]:
    """
    Calculate phonon scattering rates in a material.
    
    Args:
        temperature: Temperature in Kelvin
        debye_temperature: Debye temperature in Kelvin
        impurity_concentration: Concentration of impurities (0-1)
        
    Returns:
        Dictionary with scattering rates
    """
    # Physical constants
    kB = 1.380649e-23  # Boltzmann constant in J/K
    
    # Calculate the Debye frequency
    debye_freq = calculate_debye_frequency(debye_temperature)
    
    # Calculate thermal phonon frequency
    # Characteristic frequency of thermally excited phonons
    thermal_freq = kB * temperature / (1.054571817e-34 * 2 * np.pi)
    
    # Normalized temperature
    t_norm = temperature / debye_temperature
    
    # Phonon-phonon scattering rate (Umklapp processes)
    # Simplified model: 1/τ_U ∝ ω² T exp(-Θ_D/bT)
    # where b is a constant (~3-5)
    b_factor = 3.0
    umklapp_rate = debye_freq * t_norm**2 * np.exp(-1 / (b_factor * t_norm))
    
    # Boundary scattering (independent of frequency and temperature)
    # Typically depends on sample dimensions, but using a constant here
    boundary_rate = 1e9  # 1 GHz, typical for micrometer-scale samples
    
    # Point defect scattering rate
    # 1/τ_pd ∝ ω⁴ * concentration
    defect_rate = debye_freq * (thermal_freq / debye_freq)**4 * impurity_concentration
    
    # Total scattering rate (Matthiessen's rule)
    total_rate = umklapp_rate + boundary_rate + defect_rate
    
    # Calculate mean free path and relaxation time
    sound_velocity = 5000.0  # Typical sound velocity in metals (m/s)
    mfp = sound_velocity / total_rate
    relaxation_time = 1 / total_rate
    
    results = {
        "umklapp_scattering_rate": umklapp_rate,
        "boundary_scattering_rate": boundary_rate,
        "defect_scattering_rate": defect_rate,
        "total_scattering_rate": total_rate,
        "mean_free_path": mfp,
        "relaxation_time": relaxation_time,
        "parameters": {
            "temperature": temperature,
            "debye_temperature": debye_temperature,
            "impurity_concentration": impurity_concentration
        }
    }
    
    logger.debug(f"Calculated phonon scattering rates with MFP={mfp:.2e} m at T={temperature}K")
    
    return results

def calculate_localized_phonon_modes(
    host_mass: float,
    impurity_mass: float,
    spring_constant: float,
    impurity_concentration: float = 0.01
) -> Dict[str, Any]:
    """
    Calculate localized phonon modes around impurities.
    
    Args:
        host_mass: Mass of host atoms in amu
        impurity_mass: Mass of impurity atoms in amu
        spring_constant: Effective spring constant in N/m
        impurity_concentration: Concentration of impurities (0-1)
        
    Returns:
        Dictionary with localized phonon mode data
    """
    # Convert atomic masses to kg
    amu_to_kg = 1.66053906660e-27  # Conversion factor
    m_host = host_mass * amu_to_kg
    m_impurity = impurity_mass * amu_to_kg
    
    # Calculate bulk phonon frequency
    # ω_bulk = √(k/m_host)
    omega_bulk = np.sqrt(spring_constant / m_host)
    freq_bulk = omega_bulk / (2 * np.pi)
    
    # Calculate localized mode frequency
    # For lighter impurity: ω_loc > ω_bulk
    # For heavier impurity: ω_loc < ω_bulk
    if m_impurity < m_host:
        # Lighter impurity - local mode above bulk band
        omega_loc = np.sqrt(spring_constant / m_impurity)
    else:
        # Heavier impurity - local mode below bulk band
        # Einstein model for localized mode
        omega_loc = np.sqrt(spring_constant / m_impurity)
    
    freq_loc = omega_loc / (2 * np.pi)
    
    # Estimate localization length based on mass difference
    mass_ratio = m_host / m_impurity
    localization_length = 2.0 / np.abs(1 - mass_ratio)
    
    # Calculate energy concentration factor (how much energy is concentrated)
    # More mass difference = stronger localization
    concentration_factor = np.abs(1 - mass_ratio) * impurity_concentration
    
    results = {
        "bulk_frequency": freq_bulk,
        "localized_frequency": freq_loc,
        "localization_length": localization_length,
        "concentration_factor": concentration_factor,
        "is_higher_frequency": m_impurity < m_host,
        "freq_ratio": freq_loc / freq_bulk,
        "parameters": {
            "host_mass_amu": host_mass,
            "impurity_mass_amu": impurity_mass,
            "spring_constant": spring_constant,
            "impurity_concentration": impurity_concentration
        }
    }
    
    logger.debug(f"Calculated localized phonon modes with f_loc={freq_loc:.2e} Hz")
    
    return results

def calculate_coherent_phonon_tunneling(
    lattice_params: LatticeParameters,
    temperature: float,
    barrier_height: float,
    barrier_width: float,
    coherence_length: float,
    coherence_time: float = 1e-12,  # 1 ps default coherence time
    coupling_strength: float = 0.2
) -> Dict[str, Any]:
    """
    Calculate quantum tunneling enhancement from coherent phonon effects.
    
    Coherent phonons can create synchronized oscillations of multiple
    particles/nuclei, potentially enhancing tunneling probabilities
    through cooperative effects.
    
    Args:
        lattice_params: LatticeParameters instance with material properties
        temperature: System temperature in Kelvin
        barrier_height: Tunneling barrier height in eV
        barrier_width: Tunneling barrier width in meters
        coherence_length: Spatial coherence length in nm
        coherence_time: Temporal coherence time in seconds
        coupling_strength: Phonon-nuclear coupling strength (0-1)
        
    Returns:
        Dictionary with coherent phonon tunneling data
    """
    # Physical constants
    hbar = 1.054571817e-34  # Reduced Planck constant in J·s
    kB = 1.380649e-23  # Boltzmann constant in J/K
    m_p = 1.67262192369e-27  # Proton mass in kg
    ev_to_j = 1.602176634e-19  # Conversion from eV to J
    
    # Calculate Debye frequency if not already calculated
    if lattice_params.debye_frequency is None:
        debye_freq = calculate_debye_frequency(lattice_params.debye_temperature)
    else:
        debye_freq = lattice_params.debye_frequency
    
    # Calculate thermal phonon occupation
    phonon_occupation = calculate_phonon_occupation(debye_freq, temperature)
    
    # Calculate typical phonon wavelength
    sound_speed = lattice_params.sound_velocity
    phonon_wavelength = sound_speed / debye_freq
    
    # Number of coherently oscillating atoms in the coherence volume
    coherence_volume = 4/3 * np.pi * (coherence_length * 1e-9)**3  # in m³
    atomic_volume = (lattice_params.lattice_constant * 1e-10)**3  # assuming cubic, in m³
    n_coherent = coherence_volume / atomic_volume
    
    # Energy concentration factor due to coherence
    # Simple model: coherent oscillations can concentrate energy by ~sqrt(N)
    energy_concentration = np.sqrt(n_coherent) * coupling_strength
    
    # Calculate effective barrier reduction
    # Coherent phonons can reduce the effective barrier height
    phonon_energy_j = hbar * 2 * np.pi * debye_freq
    phonon_energy_ev = phonon_energy_j / ev_to_j
    
    # Calculate effective barrier modification
    barrier_reduction = energy_concentration * phonon_energy_ev * (phonon_occupation + 0.5)
    effective_barrier = max(0.05 * barrier_height, barrier_height - barrier_reduction)
    
    # Calculate base tunneling exponent (WKB approximation)
    base_exponent = -2 * barrier_width * np.sqrt(2 * m_p * barrier_height * ev_to_j) / hbar
    
    # Calculate modified tunneling exponent
    modified_exponent = -2 * barrier_width * np.sqrt(2 * m_p * effective_barrier * ev_to_j) / hbar
    
    # Enhancement from coherent effects
    coherent_enhancement = np.exp(base_exponent - modified_exponent)
    
    # Additional enhancement from phase-matching effects
    # Coherence time relative to oscillation period
    oscillation_period = 1 / debye_freq
    phase_coherence = min(coherence_time / oscillation_period, 100)
    phase_enhancement = np.sqrt(phase_coherence)
    
    # Total enhancement with reasonable limits
    total_enhancement = min(coherent_enhancement * phase_enhancement, 1e10)
    
    results = {
        "n_coherent_atoms": n_coherent,
        "energy_concentration": energy_concentration,
        "phonon_energy_ev": phonon_energy_ev,
        "barrier_reduction_ev": barrier_reduction,
        "effective_barrier_ev": effective_barrier,
        "base_tunneling_exponent": base_exponent,
        "modified_tunneling_exponent": modified_exponent,
        "coherent_enhancement": coherent_enhancement,
        "phase_enhancement": phase_enhancement,
        "total_enhancement": total_enhancement,
        "parameters": {
            "temperature": temperature,
            "barrier_height": barrier_height,
            "barrier_width": barrier_width,
            "coherence_length_nm": coherence_length,
            "coherence_time_s": coherence_time,
            "coupling_strength": coupling_strength
        }
    }
    
    logger.debug(f"Calculated coherent phonon tunneling with enhancement {total_enhancement:.2e}")
    
    return results

def calculate_comprehensive_phonon_enhancement(
    lattice_params: LatticeParameters,
    temperature: float,
    z1: int,
    z2: int,
    a1: float,
    a2: float,
    screening_potential: float = 30.0,  # typical screening potential in eV
    coherence_length: float = 10.0,  # coherence length in nm
    impurity_concentration: float = 0.01,  # impurity concentration
    coupling_strength: float = 0.2  # phonon-nuclear coupling strength
) -> Dict[str, Any]:
    """
    Calculate a comprehensive phonon-based enhancement factor for nuclear reactions.
    
    This function combines multiple phonon-based mechanisms into a single
    enhancement factor for nuclear tunneling probability, including:
    - Phonon-assisted tunneling
    - Coherent phonon effects
    - Localized phonon modes
    - Resonant effects
    
    Args:
        lattice_params: LatticeParameters instance with material properties
        temperature: System temperature in Kelvin
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        a1: Mass number of first nucleus (u)
        a2: Mass number of second nucleus (u)
        screening_potential: Electron screening potential in eV
        coherence_length: Spatial coherence length in nm
        impurity_concentration: Impurity concentration (0-1)
        coupling_strength: Phonon-nuclear coupling strength (0-1)
        
    Returns:
        Dictionary with comprehensive enhancement data
    """
    # Physical constants
    ev_to_j = 1.602176634e-19  # Conversion from eV to J
    
    # Estimate nuclear barrier parameters
    # For fusion reactions, barrier height is approximately the Coulomb barrier
    # V_coulomb = (1/4πε₀) * Z₁Z₂e² / r
    # where r is approximately the sum of nuclear radii
    # r ≈ 1.2 fm * (A₁^(1/3) + A₂^(1/3))
    
    # Effective nuclear radius in meters
    nuclear_radius = 1.2e-15 * (a1**(1/3) + a2**(1/3))
    
    # Coulomb barrier height in eV
    barrier_height = 1.44 * z1 * z2 / (nuclear_radius * 1e15)
    
    # Effective barrier width in meters
    # Typically on the order of 1-10 fm for nuclear reactions
    barrier_width = nuclear_radius * 0.5
    
    # Calculate phonon-assisted tunneling enhancement
    phonon_assisted = calculate_phonon_assisted_tunneling(
        lattice_params.debye_temperature,
        temperature,
        barrier_height,
        barrier_width,
        coupling_strength
    )
    assisted_enhancement = phonon_assisted["enhancement_factor"]
    
    # Calculate coherent phonon tunneling enhancement
    coherent = calculate_coherent_phonon_tunneling(
        lattice_params,
        temperature,
        barrier_height,
        barrier_width,
        coherence_length,
        coupling_strength=coupling_strength
    )
    coherent_enhancement = coherent["total_enhancement"]
    
    # Calculate localized mode effects (using host vs. impurity system)
    # If the system has impurities (e.g., H/D in Pd)
    if impurity_concentration > 0:
        # For H/D in Pd-like systems
        host_mass = lattice_params.atomic_mass
        impurity_mass = min(a1, a2)  # Assuming the lighter nucleus is the impurity
        spring_constant = 100.0  # Approximate force constant in N/m
        
        localized = calculate_localized_phonon_modes(
            host_mass,
            impurity_mass,
            spring_constant,
            impurity_concentration
        )
        localization_enhancement = 1.0 + localized["concentration_factor"] * 10.0
    else:
        localization_enhancement = 1.0
    
    # Calculate screening enhancement (simplified)
    # Screening makes the barrier effectively lower
    reduced_mass = a1 * a2 / (a1 + a2)
    energy = 0.025  # Assuming thermal energy ~25 meV
    
    # Calculate Gamow factor with and without screening
    alpha = 1.0 / 137.036  # Fine structure constant
    amu_c2 = 931.494061e6  # 1 atomic mass unit in eV/c²
    reduced_mass_ev = reduced_mass * amu_c2
    eta = z1 * z2 * alpha * np.sqrt(reduced_mass_ev / (2.0 * energy * 1000.0))
    
    # Screening enhancement: exp(πηUe/E)
    screening_enhancement = np.exp(np.pi * eta * screening_potential / (energy * 1000.0))
    
    # Combine all enhancement factors
    # Note: Multiplying directly would likely overestimate the total effect
    # Use a more conservative approach with weighted geometric mean
    weights = {
        "phonon_assisted": 0.4,
        "coherent": 0.3,
        "localization": 0.2,
        "screening": 0.1
    }
    
    # Calculate weighted geometric mean
    # Taking the logarithm of the factors to avoid overflow
    log_factors = (
        weights["phonon_assisted"] * np.log(assisted_enhancement) +
        weights["coherent"] * np.log(coherent_enhancement) +
        weights["localization"] * np.log(localization_enhancement) +
        weights["screening"] * np.log(screening_enhancement)
    )
    
    total_enhancement = np.exp(log_factors)
    
    # Cap at a reasonable maximum value (based on current theoretical limits)
    max_enhancement = 1e20
    total_enhancement = min(total_enhancement, max_enhancement)
    
    results = {
        "total_enhancement": total_enhancement,
        "phonon_assisted_enhancement": assisted_enhancement,
        "coherent_enhancement": coherent_enhancement,
        "localization_enhancement": localization_enhancement,
        "screening_enhancement": screening_enhancement,
        "barrier_height_ev": barrier_height,
        "barrier_width_m": barrier_width,
        "parameters": {
            "temperature": temperature,
            "z1": z1,
            "z2": z2,
            "a1": a1,
            "a2": a2,
            "screening_potential": screening_potential,
            "coherence_length": coherence_length,
            "impurity_concentration": impurity_concentration,
            "coupling_strength": coupling_strength
        }
    }
    
    logger.info(f"Calculated comprehensive phonon enhancement: {total_enhancement:.2e}")
    
    return results 