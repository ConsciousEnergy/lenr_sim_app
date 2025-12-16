"""
Double-Layer QED Effects calculations for LENR_Sim_App

This module implements the Double-Layer Quantum Electrodynamic (QED) effects
described in the Unified LENR Theory.

Key concepts:
- QED effects at material interfaces influence nuclear interactions
- Modified vacuum energy density at interfaces affects the effective nuclear potential
- Boundary conditions for electromagnetic fields at interfaces create unique conditions
- These effects contribute to enhanced tunneling probabilities in LENR
- QED Lagrangian formulation provides rigorous foundation for field-matter coupling

New in v2 (based on theoretical paper Section 2.3.1):
- Full QED Lagrangian density calculation
- Vacuum polarization corrections in strong fields
- Electron-phonon-photon coupling terms
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
from dataclasses import dataclass, field
import math
import logging

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("qed_effects", "logs/physics.log")

# Physical constants
HBAR = const.hbar  # Reduced Planck constant in J·s
SPEED_OF_LIGHT = const.c  # Speed of light in m/s
FINE_STRUCTURE = const.alpha  # Fine structure constant (~1/137)
ELECTRON_CHARGE = const.e  # Elementary charge in C
ELECTRON_MASS = const.m_e  # Electron mass in kg
VACUUM_PERMITTIVITY = const.epsilon_0  # Vacuum permittivity
EV_TO_J = const.e  # Conversion from eV to Joules

# Critical field strength (Schwinger limit)
# E_critical = m_e^2 * c^3 / (e * hbar) ≈ 1.3e18 V/m
E_CRITICAL = (ELECTRON_MASS**2 * SPEED_OF_LIGHT**3) / (ELECTRON_CHARGE * HBAR)


@dataclass
class QEDLagrangianComponents:
    """Components of the QED Lagrangian density."""
    dirac_kinetic: float  # ψ̄(iγᵘDμ - m)ψ term
    electromagnetic: float  # -1/4 FμνFᵘᵛ term
    interaction: float  # Additional interaction terms
    total_density: float  # Total Lagrangian density in J/m³
    
    # Derived quantities
    vacuum_polarization: float  # Vacuum polarization correction
    effective_dielectric: float  # Effective dielectric constant
    field_matter_coupling: float  # Coupling strength


@dataclass
class QEDEnhancementResult:
    """Results from QED enhancement calculations."""
    lagrangian: QEDLagrangianComponents
    enhancement_factor: float
    barrier_modification_eV: float
    tunneling_enhancement: float
    metadata: Dict[str, Any] = field(default_factory=dict)


def calculate_qed_lagrangian(
    electric_field: float,
    magnetic_field: float = 0.0,
    electron_density: float = 1e29,
    fermi_energy_eV: float = 5.0
) -> QEDLagrangianComponents:
    """
    Calculate the QED Lagrangian density components.
    
    The QED Lagrangian is:
    L = ψ̄(iγᵘDμ - m)ψ - (1/4)FμνFᵘᵛ + L_int
    
    Args:
        electric_field: Electric field strength in V/m
        magnetic_field: Magnetic field strength in Tesla
        electron_density: Electron number density in m⁻³
        fermi_energy_eV: Fermi energy in eV
        
    Returns:
        QEDLagrangianComponents with all terms calculated
    """
    # Convert Fermi energy to Joules
    fermi_energy_J = fermi_energy_eV * EV_TO_J
    
    # Dirac kinetic term (fermion kinetic energy density)
    # Approximate as electron density times Fermi energy
    dirac_kinetic = electron_density * fermi_energy_J  # J/m³
    
    # Electromagnetic field tensor contribution
    # -1/4 FμνFᵘᵛ = (1/2)(ε₀E² - B²/μ₀)
    em_energy_density = 0.5 * (
        VACUUM_PERMITTIVITY * electric_field**2 - 
        magnetic_field**2 / const.mu_0
    )
    electromagnetic = -em_energy_density  # Note: negative in Lagrangian
    
    # Interaction terms (electron-phonon-photon coupling)
    # L_int = g_e-ph * ψ̄ψφ + g_ph-γ * φAμAᵘ
    # Simplified: estimate from coupling constants
    g_e_ph = 0.1  # Electron-phonon coupling (dimensionless)
    interaction = g_e_ph * electron_density * HBAR * 1e13  # Approximate
    
    # Total Lagrangian density
    total_density = dirac_kinetic + electromagnetic + interaction
    
    # Vacuum polarization correction
    # ε_eff = 1 + (2α/45π)(E/E_cr)²
    vacuum_polarization = (2 * FINE_STRUCTURE / (45 * np.pi)) * (electric_field / E_CRITICAL)**2
    
    # Effective dielectric constant
    effective_dielectric = 1.0 + vacuum_polarization
    
    # Field-matter coupling strength
    # Proportional to α * (E/E_cr) for weak fields
    field_matter_coupling = FINE_STRUCTURE * min(1.0, electric_field / E_CRITICAL)
    
    logger.debug(f"QED Lagrangian: total={total_density:.2e} J/m³, ε_eff={effective_dielectric:.6f}")
    
    return QEDLagrangianComponents(
        dirac_kinetic=dirac_kinetic,
        electromagnetic=electromagnetic,
        interaction=interaction,
        total_density=total_density,
        vacuum_polarization=vacuum_polarization,
        effective_dielectric=effective_dielectric,
        field_matter_coupling=field_matter_coupling
    )


def vacuum_polarization_correction(
    electric_field: float,
    temperature: float = 300.0
) -> Dict[str, float]:
    """
    Calculate vacuum polarization effects in strong electric fields.
    
    In strong fields, the vacuum becomes polarized, modifying the effective
    dielectric constant:
    ε_eff = 1 + (2α/45π)(E/E_cr)²
    
    Args:
        electric_field: Electric field strength in V/m
        temperature: Temperature in Kelvin (for thermal corrections)
        
    Returns:
        Dictionary with vacuum polarization results
    """
    # Basic vacuum polarization
    field_ratio = electric_field / E_CRITICAL
    
    # Leading order correction (Euler-Heisenberg)
    correction_factor = (2 * FINE_STRUCTURE / (45 * np.pi)) * field_ratio**2
    
    # Thermal correction (small at LENR temperatures)
    thermal_energy = const.k * temperature
    electron_rest_energy = ELECTRON_MASS * SPEED_OF_LIGHT**2
    thermal_correction = (thermal_energy / electron_rest_energy)**2
    
    # Total effective dielectric
    epsilon_effective = 1.0 + correction_factor * (1.0 + thermal_correction)
    
    # Refractive index modification
    n_effective = np.sqrt(epsilon_effective)
    
    # Energy density modification
    vacuum_energy_modification = 0.5 * VACUUM_PERMITTIVITY * electric_field**2 * correction_factor
    
    return {
        "field_ratio": field_ratio,
        "correction_factor": correction_factor,
        "thermal_correction": thermal_correction,
        "epsilon_effective": epsilon_effective,
        "n_effective": n_effective,
        "vacuum_energy_modification_J_m3": vacuum_energy_modification,
        "E_critical_V_m": E_CRITICAL
    }


def field_matter_coupling(
    electric_field: float,
    electron_density: float,
    phonon_frequency: float = 1e13,
    coupling_g_e_ph: float = 0.1,
    coupling_g_ph_gamma: float = 0.01
) -> Dict[str, float]:
    """
    Calculate electron-phonon-photon coupling in condensed systems.
    
    The coupling Lagrangian is:
    L_int = g_e-ph * ψ̄ψφ + g_ph-γ * φAμAᵘ
    
    Args:
        electric_field: Electric field strength in V/m
        electron_density: Electron number density in m⁻³
        phonon_frequency: Characteristic phonon frequency in rad/s
        coupling_g_e_ph: Electron-phonon coupling constant
        coupling_g_ph_gamma: Phonon-photon coupling constant
        
    Returns:
        Dictionary with coupling parameters and rates
    """
    # Phonon energy
    phonon_energy = HBAR * phonon_frequency
    
    # Electron-phonon interaction energy density
    # E_e-ph ~ g_e-ph * n_e * ℏω_ph
    e_ph_energy_density = coupling_g_e_ph * electron_density * phonon_energy
    
    # Photon energy density in field
    photon_energy_density = 0.5 * VACUUM_PERMITTIVITY * electric_field**2
    
    # Phonon-photon coupling contribution
    # Scaled by the coupling constant and field strength
    ph_gamma_coupling = coupling_g_ph_gamma * np.sqrt(photon_energy_density * phonon_energy)
    
    # Total interaction strength
    total_coupling = np.sqrt(e_ph_energy_density**2 + ph_gamma_coupling**2)
    
    # Energy transfer rate (Fermi's golden rule approximation)
    # Γ ~ (2π/ℏ) |M|² ρ(E)
    # Simplified estimate
    matrix_element_squared = (coupling_g_e_ph * phonon_energy)**2
    density_of_states = electron_density / (HBAR * phonon_frequency)
    transfer_rate = (2 * np.pi / HBAR) * matrix_element_squared * density_of_states
    
    return {
        "phonon_energy_eV": phonon_energy / EV_TO_J,
        "e_ph_energy_density_J_m3": e_ph_energy_density,
        "photon_energy_density_J_m3": photon_energy_density,
        "ph_gamma_coupling_J_m3": ph_gamma_coupling,
        "total_coupling_J_m3": total_coupling,
        "energy_transfer_rate_Hz": transfer_rate,
        "coupling_g_e_ph": coupling_g_e_ph,
        "coupling_g_ph_gamma": coupling_g_ph_gamma
    }


def calculate_interface_function(epsilon1: float, epsilon2: float) -> float:
    """
    Calculate the interface function that depends on dielectric constants.
    
    Args:
        epsilon1: Dielectric constant of first material
        epsilon2: Dielectric constant of second material
        
    Returns:
        Interface function value (dimensionless)
    """
    # This function represents f(ε₁, ε₂) in the paper's formula
    # A simplified model based on the difference in dielectric constants
    
    # Prevent division by zero
    if epsilon1 <= 0 or epsilon2 <= 0:
        logger.warning("Dielectric constants must be positive")
        return 0.0
    
    # Calculate the interface function
    # Greater contrast in dielectric constants strengthens the effect
    contrast_factor = abs(epsilon1 - epsilon2) / (epsilon1 + epsilon2)
    
    # Apply non-linear scaling based on theory
    f_value = contrast_factor**2 * (1 + 2 * contrast_factor)
    
    return f_value


def calculate_qed_potential_modification(
    distance: float,
    epsilon1: float,
    epsilon2: float
) -> float:
    """
    Calculate the modification to the nuclear potential due to QED effects.
    
    Args:
        distance: Characteristic distance in meters
        epsilon1: Dielectric constant of first material
        epsilon2: Dielectric constant of second material
        
    Returns:
        Potential modification in eV
    """
    # Safety check for distance
    if distance <= 0:
        logger.warning("Distance must be positive")
        return 0.0
    
    # Calculate interface function
    f_interface = calculate_interface_function(epsilon1, epsilon2)
    
    # Calculate the QED potential modification using formula from the paper:
    # ΔV_QED = α (ħc/d³) f(ε₁, ε₂)
    # where α is the fine structure constant
    
    delta_V_J = FINE_STRUCTURE * (HBAR * SPEED_OF_LIGHT / distance**3) * f_interface
    
    # Convert from J to eV
    delta_V_eV = delta_V_J / EV_TO_J
    
    logger.debug(f"QED potential modification: {delta_V_eV:.2e} eV")
    
    return delta_V_eV


def calculate_electric_field(
    potential_difference: float,
    distance: float
) -> float:
    """
    Calculate the electric field strength for a given potential difference and distance.
    
    Args:
        potential_difference: Potential difference in volts
        distance: Distance in meters
        
    Returns:
        Electric field strength in V/m
    """
    # Safety check
    if distance <= 0:
        logger.warning("Distance must be positive")
        return 0.0
    
    # Calculate electric field: E = ΔV/d
    field_strength = potential_difference / distance
    
    return field_strength


def calculate_field_enhancement_factor(
    geometry_factor: float,
    material_factor: float = 1.0
) -> float:
    """
    Calculate the field enhancement factor due to nanostructure geometry.
    
    Args:
        geometry_factor: Factor representing sharpness (>1 for nanoscale features)
        material_factor: Material-dependent factor
        
    Returns:
        Field enhancement factor
    """
    # Simplified model for field enhancement
    # In real systems, this would be calculated using finite element analysis
    
    # Basic enhancement from geometry
    enhancement = geometry_factor * material_factor
    
    # Limit to reasonable values
    enhancement = min(1000.0, enhancement)
    
    return enhancement


def calculate_double_layer_properties(
    temperature: float,
    material: str,
    electrolyte_concentration: float,
    applied_voltage: float
) -> Dict[str, Any]:
    """
    Calculate properties of an electrochemical double layer.
    
    Args:
        temperature: Temperature in Kelvin
        material: Electrode material
        electrolyte_concentration: Concentration in mol/L
        applied_voltage: Applied voltage in V
        
    Returns:
        Dictionary with double layer properties
    """
    # Material-specific dielectric constants (approximate values)
    material_dielectric = {
        "pd": 12.0,
        "ni": 10.0,
        "pt": 8.0,
        "ti": 86.0,
        "water": 80.0,
        "d2o": 78.0
    }
    
    # Get dielectric constant for the material
    epsilon_material = material_dielectric.get(material.lower(), 10.0)
    
    # Electrolyte dielectric constant (approximate, depends on concentration)
    epsilon_electrolyte = material_dielectric.get("water", 80.0) * (1.0 - 0.05 * electrolyte_concentration)
    
    # Debye length in electrolyte (simplified)
    # λD = √(ε₀εᵣkBT / (2NAe²I))
    # where I is the ionic strength in mol/m³
    
    # Convert concentration from mol/L to mol/m³
    concentration_m3 = electrolyte_concentration * 1000
    
    # Calculate Debye length
    debye_length = np.sqrt(VACUUM_PERMITTIVITY * epsilon_electrolyte * const.k * temperature / 
                          (2 * const.N_A * ELECTRON_CHARGE**2 * concentration_m3))
    
    # Double layer thickness (approximate)
    double_layer_thickness = debye_length
    
    # Field strength in the double layer
    field_strength = calculate_electric_field(applied_voltage, double_layer_thickness)
    
    # QED potential modification
    qed_modification = calculate_qed_potential_modification(
        double_layer_thickness, epsilon_material, epsilon_electrolyte
    )
    
    # Prepare results
    results = {
        "debye_length_m": debye_length,
        "double_layer_thickness_m": double_layer_thickness,
        "field_strength_V_m": field_strength,
        "qed_potential_eV": qed_modification,
        "epsilon_material": epsilon_material,
        "epsilon_electrolyte": epsilon_electrolyte,
        "metadata": {
            "temperature_K": temperature,
            "material": material,
            "electrolyte_concentration_mol_L": electrolyte_concentration,
            "applied_voltage_V": applied_voltage
        }
    }
    
    return results


def calculate_qed_enhancement(
    distance: float,
    epsilon1: float, 
    epsilon2: float,
    temperature: float,
    applied_field: float
) -> Dict[str, Any]:
    """
    Calculate the enhancement factor due to QED effects.
    
    Args:
        distance: Characteristic distance in meters
        epsilon1: Dielectric constant of first material
        epsilon2: Dielectric constant of second material
        temperature: Temperature in Kelvin
        applied_field: Applied electric field in V/m
        
    Returns:
        Dictionary with QED enhancement results
    """
    # Calculate QED potential modification
    qed_potential = calculate_qed_potential_modification(distance, epsilon1, epsilon2)
    
    # Convert to barrier reduction factor
    # This is a simplification - in reality would use WKB approximation
    # to calculate tunneling through modified potential
    
    # Typical Coulomb barrier at this distance (approximate)
    coulomb_barrier = ELECTRON_CHARGE**2 / (4 * np.pi * VACUUM_PERMITTIVITY * distance) / EV_TO_J
    
    # Energy available from thermal fluctuations
    thermal_energy = const.k * temperature / EV_TO_J
    
    # Calculate relative reduction in barrier
    if coulomb_barrier > 0:
        barrier_reduction_factor = qed_potential / coulomb_barrier
    else:
        barrier_reduction_factor = 0.0
    
    # Field contribution to enhancement
    field_contribution = min(10.0, np.sqrt(applied_field / 1e8))
    
    # Calculate enhancement factor
    # Base enhancement from exponential of barrier reduction
    base_enhancement = np.exp(min(50.0, barrier_reduction_factor * 100))
    
    # Combined enhancement with field effects
    total_enhancement = base_enhancement * field_contribution
    
    # Limit to realistic values based on paper (up to 10^3)
    log_enhancement = min(3.0, np.log10(total_enhancement) if total_enhancement > 0 else 0)
    capped_enhancement = 10**log_enhancement
    
    # Prepare results
    results = {
        "qed_potential_eV": qed_potential,
        "barrier_reduction_factor": barrier_reduction_factor,
        "field_contribution": field_contribution,
        "enhancement_factor": capped_enhancement,
        "log_enhancement": log_enhancement,
        "metadata": {
            "distance_m": distance,
            "epsilon1": epsilon1,
            "epsilon2": epsilon2,
            "temperature_K": temperature,
            "applied_field_V_m": applied_field
        }
    }
    
    return results


def calculate_full_qed_enhancement(
    distance: float,
    epsilon1: float,
    epsilon2: float,
    temperature: float,
    applied_field: float,
    electron_density: float = 1e29,
    phonon_frequency: float = 1e13
) -> QEDEnhancementResult:
    """
    Calculate comprehensive QED enhancement using Lagrangian formulation.
    
    This function combines all QED effects:
    1. QED Lagrangian density calculation
    2. Vacuum polarization corrections
    3. Field-matter coupling
    4. Interface effects
    
    Args:
        distance: Characteristic distance in meters
        epsilon1: Dielectric constant of first material
        epsilon2: Dielectric constant of second material
        temperature: Temperature in Kelvin
        applied_field: Applied electric field in V/m
        electron_density: Electron number density in m⁻³
        phonon_frequency: Characteristic phonon frequency in rad/s
        
    Returns:
        QEDEnhancementResult with full analysis
    """
    # Calculate QED Lagrangian components
    lagrangian = calculate_qed_lagrangian(
        electric_field=applied_field,
        magnetic_field=0.0,
        electron_density=electron_density,
        fermi_energy_eV=5.0
    )
    
    # Get vacuum polarization effects
    vac_pol = vacuum_polarization_correction(applied_field, temperature)
    
    # Get field-matter coupling
    coupling = field_matter_coupling(
        electric_field=applied_field,
        electron_density=electron_density,
        phonon_frequency=phonon_frequency
    )
    
    # Calculate interface function
    f_interface = calculate_interface_function(epsilon1, epsilon2)
    
    # Calculate QED potential modification
    qed_potential = calculate_qed_potential_modification(distance, epsilon1, epsilon2)
    
    # Coulomb barrier at this distance
    coulomb_barrier = ELECTRON_CHARGE**2 / (4 * np.pi * VACUUM_PERMITTIVITY * distance) / EV_TO_J
    
    # Barrier modification from all effects
    barrier_mod_vacuum = qed_potential * lagrangian.vacuum_polarization
    barrier_mod_interface = qed_potential * f_interface
    barrier_mod_coupling = coupling["total_coupling_J_m3"] * distance**3 / EV_TO_J
    
    total_barrier_modification = qed_potential + barrier_mod_vacuum + barrier_mod_coupling
    
    # Enhancement factor calculation
    if coulomb_barrier > 0:
        barrier_ratio = total_barrier_modification / coulomb_barrier
    else:
        barrier_ratio = 0.0
    
    # Tunneling enhancement (WKB-like)
    # P ~ exp(-2∫√(2m(V-E))/ℏ dx)
    # Enhancement ≈ exp(barrier_reduction * characteristic_scale)
    tunneling_enhancement = np.exp(min(50.0, barrier_ratio * 100))
    
    # Total enhancement factor
    field_factor = min(10.0, 1.0 + np.sqrt(applied_field / 1e8))
    coupling_factor = 1.0 + lagrangian.field_matter_coupling
    
    total_enhancement = tunneling_enhancement * field_factor * coupling_factor
    
    # Cap to realistic values
    log_enhancement = min(8.0, np.log10(max(1.0, total_enhancement)))
    capped_enhancement = 10**log_enhancement
    
    logger.info(f"Full QED enhancement: {capped_enhancement:.2e} (log={log_enhancement:.2f})")
    
    return QEDEnhancementResult(
        lagrangian=lagrangian,
        enhancement_factor=capped_enhancement,
        barrier_modification_eV=total_barrier_modification,
        tunneling_enhancement=tunneling_enhancement,
        metadata={
            "distance_m": distance,
            "epsilon1": epsilon1,
            "epsilon2": epsilon2,
            "temperature_K": temperature,
            "applied_field_V_m": applied_field,
            "electron_density_m3": electron_density,
            "phonon_frequency_rad_s": phonon_frequency,
            "vacuum_polarization": vac_pol,
            "field_matter_coupling": coupling,
            "interface_function": f_interface,
            "coulomb_barrier_eV": coulomb_barrier
        }
    ) 