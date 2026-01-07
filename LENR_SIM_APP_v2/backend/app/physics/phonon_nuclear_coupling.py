"""
Phonon-Nuclear Coupling Module

Implements phonon-mediated nuclear reaction rate calculations based on
coherent phonon modes in lattice-loaded materials.
"""

import numpy as np
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

# Physical constants
HBAR = 1.054571817e-34  # Reduced Planck constant (J·s)
KB = 1.380649e-23  # Boltzmann constant (J/K)
EV_TO_J = 1.602176634e-19  # eV to Joules conversion


class PhononNuclearParameters(BaseModel):
    """Parameters for phonon-nuclear coupling calculation."""
    temperature: float = Field(default=300.0, ge=1, le=2000, description="Temperature in Kelvin")
    phonon_frequency: float = Field(default=1e13, ge=1e10, le=1e15, description="Characteristic phonon frequency (Hz)")
    coupling_strength: float = Field(default=0.1, ge=0, le=1, description="Coupling strength parameter")
    debye_temperature: float = Field(default=275.0, ge=50, le=1000, description="Debye temperature (K)")
    lattice_constant: float = Field(default=3.89e-10, ge=1e-10, le=1e-8, description="Lattice constant (m)")
    loading_ratio: float = Field(default=0.9, ge=0, le=2, description="H/M loading ratio")
    host_material: str = Field(default="palladium", description="Host material type")


class PhononNuclearCouplingResult(BaseModel):
    """Result of phonon-nuclear coupling calculation."""
    coupling_factor: float = Field(description="Total phonon-nuclear coupling enhancement factor")
    coherent_enhancement: float = Field(description="Enhancement from coherent phonon modes")
    debye_waller_factor: float = Field(description="Debye-Waller factor")
    phonon_occupation: float = Field(description="Average phonon occupation number")
    effective_mass_ratio: float = Field(description="Effective mass ratio due to phonon coupling")
    energy_exchange_rate: float = Field(description="Phonon-nuclear energy exchange rate (eV/s)")


def calculate_phonon_nuclear_coupling(
    temperature: float = 300.0,
    phonon_frequency: float = 1e13,
    coupling_strength: float = 0.1,
    debye_temperature: float = 275.0,
    lattice_constant: float = 3.89e-10,
    loading_ratio: float = 0.9,
    **kwargs
) -> PhononNuclearCouplingResult:
    """
    Calculate phonon-nuclear coupling enhancement factor.
    
    Args:
        temperature: Temperature in Kelvin
        phonon_frequency: Characteristic phonon frequency in Hz
        coupling_strength: Dimensionless coupling strength parameter
        debye_temperature: Debye temperature of the host lattice in K
        lattice_constant: Lattice constant in meters
        loading_ratio: Hydrogen to metal loading ratio
        
    Returns:
        PhononNuclearCouplingResult with calculated values
    """
    try:
        # Calculate phonon occupation number (Bose-Einstein)
        phonon_energy = HBAR * phonon_frequency * 2 * np.pi
        n_phonon = 1.0 / (np.exp(phonon_energy / (KB * temperature)) - 1) if temperature > 0 else 0
        
        # Debye-Waller factor
        # W = <u^2> * q^2 / 2 where <u^2> is mean square displacement
        thermal_factor = temperature / debye_temperature if debye_temperature > 0 else 1.0
        debye_waller = np.exp(-thermal_factor * 0.1)  # Simplified DW factor
        
        # Coherent enhancement from phonon mode coupling
        # Higher at optimal loading ratios
        loading_factor = np.exp(-((loading_ratio - 0.9) / 0.2) ** 2)
        coherent_enhancement = 1.0 + coupling_strength * (n_phonon + 0.5) * loading_factor * 10
        
        # Effective mass reduction due to phonon polaron effects
        effective_mass_ratio = 1.0 / (1.0 + coupling_strength * n_phonon * 0.1)
        
        # Energy exchange rate between phonon bath and nuclear system
        energy_exchange = coupling_strength * phonon_energy * n_phonon / EV_TO_J  # in eV/s
        
        # Total coupling factor
        coupling_factor = coherent_enhancement * debye_waller * effective_mass_ratio
        
        return PhononNuclearCouplingResult(
            coupling_factor=float(coupling_factor),
            coherent_enhancement=float(coherent_enhancement),
            debye_waller_factor=float(debye_waller),
            phonon_occupation=float(n_phonon),
            effective_mass_ratio=float(effective_mass_ratio),
            energy_exchange_rate=float(energy_exchange)
        )
        
    except Exception as e:
        logger.error(f"Error in phonon-nuclear coupling calculation: {e}")
        # Return default values on error
        return PhononNuclearCouplingResult(
            coupling_factor=1.0,
            coherent_enhancement=1.0,
            debye_waller_factor=1.0,
            phonon_occupation=0.0,
            effective_mass_ratio=1.0,
            energy_exchange_rate=0.0
        )


def calculate_for_material(
    material: str,
    temperature: float = 300.0,
    loading_ratio: float = 0.9,
    **kwargs
) -> PhononNuclearCouplingResult:
    """
    Calculate phonon-nuclear coupling for a specific material.
    
    Args:
        material: Material name (palladium, nickel, titanium)
        temperature: Temperature in Kelvin
        loading_ratio: H/M loading ratio
        
    Returns:
        PhononNuclearCouplingResult with material-specific values
    """
    # Material-specific parameters
    material_params = {
        "palladium": {
            "phonon_frequency": 4.5e12,
            "coupling_strength": 0.15,
            "debye_temperature": 275.0,
            "lattice_constant": 3.89e-10
        },
        "nickel": {
            "phonon_frequency": 6.0e12,
            "coupling_strength": 0.12,
            "debye_temperature": 375.0,
            "lattice_constant": 3.52e-10
        },
        "titanium": {
            "phonon_frequency": 4.8e12,
            "coupling_strength": 0.10,
            "debye_temperature": 420.0,
            "lattice_constant": 2.95e-10
        }
    }
    
    params = material_params.get(material.lower(), material_params["palladium"])
    
    return calculate_phonon_nuclear_coupling(
        temperature=temperature,
        loading_ratio=loading_ratio,
        **params
    )

