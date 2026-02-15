"""
Oppenheimer-Phillips Process calculations for LENR_Sim_App

This module implements the Oppenheimer-Phillips (OP) process calculations 
described in the Unified LENR Theory.

The Oppenheimer-Phillips process provides a framework for understanding deuteron-based
reactions in LENR systems, where the neutron component of a deuteron can penetrate
the Coulomb barrier more easily than the proton component.

Key concepts:
- Neutron stripping reactions where the neutron component tunnels into the target nucleus
- Enhanced tunneling probabilities due to the neutral nature of the neutron
- Position-dependent nuclear forces enhance the probability of neutron transfer
- Modification of conventional fusion pathways through this alternative mechanism
"""

import numpy as np
import scipy.constants as const
from typing import Dict, List, Tuple, Any, Optional, Union
import math
import logging

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("oppenheimer_phillips", "logs/physics.log")

# Physical constants
HBAR = const.hbar  # Reduced Planck constant in J·s
NEUTRON_MASS = const.m_n  # Neutron mass in kg
PROTON_MASS = const.m_p  # Proton mass in kg
DEUTERON_MASS = 2.01410178 * const.u  # Deuteron mass in kg
ELECTRON_CHARGE = const.e  # Elementary charge in C
VACUUM_PERMITTIVITY = const.epsilon_0  # Vacuum permittivity
NUCLEAR_RADIUS_FACTOR = 1.2e-15  # Nuclear radius factor (1.2 fm)
EV_TO_J = const.e  # Conversion from eV to Joules
MEV_TO_J = 1e6 * EV_TO_J  # Conversion from MeV to Joules


def calculate_nuclear_radius(mass_number: int) -> float:
    """
    Calculate the nuclear radius for a given isotope.
    
    Args:
        mass_number: Mass number (A) of the isotope
        
    Returns:
        Nuclear radius in meters
    """
    # R = r0 * A^(1/3), where r0 ≈ 1.2 fm
    radius = NUCLEAR_RADIUS_FACTOR * mass_number**(1/3)
    
    return radius


def calculate_deuteron_binding_energy() -> float:
    """
    Calculate the binding energy of a deuteron (n-p system).
    
    Returns:
        Binding energy in MeV
    """
    # The binding energy of deuteron is ~2.224 MeV
    return 2.224  # MeV


def calculate_neutron_penetration_probability(
    distance: float,
    target_mass: int,
    energy: float,
    screening_potential: float = 0.0
) -> float:
    """
    Calculate the probability of neutron penetration in an OP process.
    
    Args:
        distance: Distance between deuteron and target nucleus in meters
        target_mass: Mass number of target nucleus
        energy: Energy of the deuteron in eV
        screening_potential: Screening potential in eV
        
    Returns:
        Penetration probability
    """
    # Nuclear radius of target
    target_radius = calculate_nuclear_radius(target_mass)
    
    # Deuteron radius
    deuteron_radius = calculate_nuclear_radius(2)
    
    # Calculate center-to-center distance
    center_distance = distance + deuteron_radius
    
    # Calculate effective barrier parameters
    # For neutron penetration, there's no Coulomb barrier, but there is
    # a centrifugal barrier and nuclear potential
    
    # For simplicity, we'll use a model specific to OP process
    # This is based on the exponential decay of the neutron wavefunction
    
    # Characteristic neutron penetration length
    # This increases with energy and decreases with target mass
    neutron_length = 2e-15 * np.sqrt(energy / 1000) * (50 / target_mass)**0.25
    
    # Penetration probability
    # P ~ exp(-2(r-R)/λ) where λ is the penetration length
    penetration_distance = max(0, center_distance - target_radius)
    probability = np.exp(-2 * penetration_distance / neutron_length)
    
    # Apply enhancement from screening if present
    if screening_potential > 0:
        # Screening increases penetration probability
        energy_factor = min(10.0, screening_potential / energy)
        probability *= np.exp(energy_factor)
    
    # Limit to maximum of 1
    probability = min(1.0, probability)
    
    return probability


def calculate_proton_hindrance(
    z_target: int,
    distance: float,
    screening_potential: float = 0.0
) -> float:
    """
    Calculate the hindrance factor for the proton due to Coulomb repulsion.
    
    Args:
        z_target: Atomic number of target nucleus
        distance: Distance in meters
        screening_potential: Screening potential in eV
        
    Returns:
        Hindrance factor (0-1)
    """
    # Calculate Coulomb potential
    coulomb_factor = ELECTRON_CHARGE**2 / (4 * np.pi * VACUUM_PERMITTIVITY)
    coulomb_potential_J = coulomb_factor * z_target / distance
    coulomb_potential_eV = coulomb_potential_J / EV_TO_J
    
    # Apply screening reduction
    effective_potential = max(0, coulomb_potential_eV - screening_potential)
    
    # Calculate hindrance factor
    # This is a simplified model - in reality would use quantum mechanical calculation
    hindrance = np.exp(-effective_potential / 1000)  # Normalized to a 1 keV scale
    
    # Limit to range [0, 1]
    hindrance = max(0, min(1, hindrance))
    
    return hindrance


def calculate_op_probability(
    deuteron_energy: float,
    distance: float,
    z_target: int,
    a_target: int,
    screening_potential: float = 0.0
) -> float:
    """
    Calculate the probability of the Oppenheimer-Phillips process.
    
    Args:
        deuteron_energy: Energy of the deuteron in eV
        distance: Distance between deuteron and target nucleus in meters
        z_target: Atomic number of target nucleus
        a_target: Mass number of target nucleus
        screening_potential: Screening potential in eV
        
    Returns:
        OP process probability
    """
    # Neutron penetration probability
    neutron_prob = calculate_neutron_penetration_probability(
        distance, a_target, deuteron_energy, screening_potential
    )
    
    # Proton hindrance factor
    proton_hindrance = calculate_proton_hindrance(
        z_target, distance, screening_potential
    )
    
    # Deuteron polarization factor
    # This accounts for the distortion of the deuteron as it approaches the nucleus
    # which makes neutron transfer more likely
    polarization_factor = 1.0 + 0.5 * z_target / np.sqrt(a_target)
    
    # Calculate the final OP probability
    # This combines the neutron penetration, proton hindrance, and polarization effects
    op_probability = neutron_prob * proton_hindrance * polarization_factor
    
    # Limit to range [0, 1]
    op_probability = min(1.0, op_probability)
    
    logger.debug(f"OP probability: {op_probability:.2e} for Z={z_target}, A={a_target}")
    
    return op_probability


def calculate_op_enhancement(
    deuteron_energy: float,
    nuclear_distance: float,
    z_target: int,
    a_target: int,
    screening_potential: float = 0.0,
    base_tunneling_prob: float = 1e-50
) -> Dict[str, Any]:
    """
    Calculate the enhancement factor due to the Oppenheimer-Phillips process.
    
    Args:
        deuteron_energy: Energy of the deuteron in eV
        nuclear_distance: Distance between nuclei in meters
        z_target: Atomic number of target nucleus
        a_target: Mass number of target nucleus
        screening_potential: Screening potential in eV
        base_tunneling_prob: Base tunneling probability without enhancement
        
    Returns:
        Dictionary with OP enhancement results
    """
    # Calculate OP probability
    op_prob = calculate_op_probability(
        deuteron_energy, nuclear_distance, z_target, a_target, screening_potential
    )
    
    # The enhancement is the ratio of OP probability to base tunneling probability
    # We need to be careful with very small denominators
    if base_tunneling_prob < 1e-100:
        # If base probability is extremely small, use a minimum value
        enhancement_factor = op_prob / 1e-100
    else:
        enhancement_factor = op_prob / base_tunneling_prob
    
    # Limit to realistic values based on paper
    log_enhancement = min(5.0, np.log10(enhancement_factor) if enhancement_factor > 0 else 0)
    capped_enhancement = 10**log_enhancement
    
    # Prepare results
    results = {
        "op_probability": op_prob,
        "enhancement_factor": capped_enhancement,
        "log_enhancement": log_enhancement,
        "enhanced_probability": base_tunneling_prob * capped_enhancement,
        "metadata": {
            "deuteron_energy_eV": deuteron_energy,
            "nuclear_distance_m": nuclear_distance,
            "z_target": z_target,
            "a_target": a_target,
            "screening_potential_eV": screening_potential
        }
    }
    
    return results


def analyze_op_process(
    energies: List[float],
    distance: float,
    z_target: int,
    a_target: int,
    screening_potential: float = 0.0
) -> Dict[str, Any]:
    """
    Analyze the Oppenheimer-Phillips process over a range of energies.
    
    Args:
        energies: List of deuteron energies in eV
        distance: Distance between deuteron and target nucleus in meters
        z_target: Atomic number of target nucleus
        a_target: Mass number of target nucleus
        screening_potential: Screening potential in eV
        
    Returns:
        Dictionary with analysis results
    """
    results = {
        "energies_eV": energies,
        "op_probabilities": [],
        "enhancement_factors": [],
        "metadata": {
            "distance_m": distance,
            "z_target": z_target,
            "a_target": a_target,
            "screening_potential_eV": screening_potential
        }
    }
    
    # Base fusion probability derived from Gamow tunneling factor.
    # For conventional charged-particle fusion (d + target at charge Z),
    # the tunneling probability through the bare Coulomb barrier is:
    #   P_Gamow(E) = exp(-2*pi*eta)
    # where the Sommerfeld parameter eta = Z1*Z2*alpha * sqrt(m_r*c^2/(2*E))
    # At eV-scale energies this yields extremely small probabilities
    # (10^-100 to 10^-300), which is the baseline the OP process enhances.
    #
    # Ref: Gamow, G. Z. Physik 51, 204 (1928);
    #      Raiola et al., Eur. Phys. J. A 19, 283 (2004) for screened
    #      low-energy cross-sections on metal targets.

    alpha = const.alpha  # fine structure constant
    m_r = DEUTERON_MASS * (a_target * const.u) / (DEUTERON_MASS + a_target * const.u)

    # Calculate effects for each energy
    for energy in energies:
        # Gamow tunneling probability at this CM energy
        E_J = max(energy * EV_TO_J, 1e-30)  # guard against zero
        eta = z_target * 1.0 * alpha * np.sqrt(m_r * const.c**2 / (2 * E_J))
        gamow_exponent = 2 * np.pi * eta
        # Clamp exponent to avoid underflow; exp(-1500) ≈ 10^-652
        gamow_exponent = min(gamow_exponent, 1500.0)
        base_prob = float(np.exp(-gamow_exponent))

        enhancement_data = calculate_op_enhancement(
            energy, distance, z_target, a_target, screening_potential, base_prob
        )
        
        results["op_probabilities"].append(enhancement_data["op_probability"])
        results["enhancement_factors"].append(enhancement_data["enhancement_factor"])
    
    # Find optimal energy
    if results["enhancement_factors"]:
        opt_idx = np.argmax(results["enhancement_factors"])
        results["optimal_energy_eV"] = energies[opt_idx]
        results["max_enhancement"] = results["enhancement_factors"][opt_idx]
    else:
        results["optimal_energy_eV"] = 0.0
        results["max_enhancement"] = 1.0
    
    return results


def predict_product_distribution(
    target_element: str,
    target_mass: int
) -> Dict[str, float]:
    """
    Predict the distribution of reaction products from OP process.
    
    Args:
        target_element: Chemical symbol of target element
        target_mass: Mass number of target isotope
        
    Returns:
        Dictionary mapping product isotopes to their relative probabilities
    """
    # This function provides probability distributions for the products
    # of the Oppenheimer-Phillips process with different target nuclei
    
    # Initialize product distribution
    products = {}
    
    # For common targets in LENR experiments
    target_key = f"{target_element}-{target_mass}"
    
    if target_key == "Pd-106":  # Example for Pd-106
        products = {
            "Pd-107": 0.7,  # Neutron capture
            "Ag-107": 0.2,  # Proton emission after neutron capture
            "Rh-105": 0.1   # Alpha emission after neutron capture
        }
    elif target_key == "Ni-58":  # Example for Ni-58
        products = {
            "Ni-59": 0.65,  # Neutron capture
            "Cu-59": 0.25,  # Proton emission after neutron capture
            "Fe-57": 0.1    # Alpha emission after neutron capture
        }
    else:
        # Default distribution for unknown targets
        products = {
            f"{target_element}-{target_mass+1}": 0.7,  # Neutron capture
            f"{next_element(target_element)}-{target_mass+1-1}": 0.2,  # (n,p) reaction
            f"{prev_element(target_element, 2)}-{target_mass+1-4}": 0.1  # (n,α) reaction
        }
    
    return products


def next_element(element: str, steps: int = 1) -> str:
    """
    Get the element with atomic number Z+steps.
    
    Args:
        element: Chemical symbol
        steps: Number of steps in Z (default=1)
        
    Returns:
        Chemical symbol of the element with Z+steps
    """
    # Simplified version - in a real implementation, would use a periodic table lookup
    elements = [
        "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne",
        "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca",
        "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
        "Ga", "Ge", "As", "Se", "Br", "Kr", "Rb", "Sr", "Y", "Zr",
        "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn"
    ]
    
    try:
        current_index = elements.index(element)
        next_index = current_index + steps
        if 0 <= next_index < len(elements):
            return elements[next_index]
        else:
            return "Unknown"
    except ValueError:
        return "Unknown"


def prev_element(element: str, steps: int = 1) -> str:
    """
    Get the element with atomic number Z-steps.
    
    Args:
        element: Chemical symbol
        steps: Number of steps in Z (default=1)
        
    Returns:
        Chemical symbol of the element with Z-steps
    """
    return next_element(element, -steps) 