"""
WKB Quantum Tunneling Calculator for LENR
==========================================

This module implements the Wentzel-Kramers-Brillouin (WKB) approximation
for calculating quantum tunneling probabilities through Coulomb barriers.

The WKB method provides accurate tunneling probabilities for:
- Deuterium-deuterium fusion
- Deuterium-tritium fusion  
- Proton-boron fusion
- Other light nuclear reactions

Key features:
- Multiple potential models (Coulomb, screened Coulomb, Woods-Saxon)
- Temperature-dependent enhancement factors
- Electron screening corrections
- Phonon-assisted tunneling effects
"""

import numpy as np
from typing import Dict, Tuple, Optional, Any
from dataclasses import dataclass
from scipy import integrate

from .core_constants import (
    HBAR, E_CHARGE, EPSILON_0, M_PROTON, M_DEUTERON,
    KEV_TO_J, EV_TO_J, A_BOHR, AMU,
    SCREENING_POTENTIALS, MATERIALS,
    reduced_mass, sommerfeld_parameter, gamow_energy, coulomb_barrier
)


@dataclass
class TunnelingResult:
    """Result of a tunneling probability calculation."""
    probability: float
    gamow_factor: float
    classical_turning_point: float  # meters
    barrier_height: float  # keV
    enhancement_factor: float
    screening_energy: float  # keV
    method: str
    parameters: Dict[str, Any]


class WKBTunnelingCalculator:
    """
    Calculate quantum tunneling probabilities using the WKB approximation.
    
    The WKB approximation gives the tunneling probability as:
    
        P = exp(-2 * integral from r1 to r2 of k(r) dr)
        
    where k(r) = sqrt(2*mu*(V(r) - E)) / hbar
    """
    
    def __init__(self):
        """Initialize the WKB calculator."""
        self.potential_models = {
            'coulomb': self._coulomb_potential,
            'screened': self._screened_coulomb_potential,
            'woods_saxon': self._woods_saxon_potential,
        }
        
    def calculate_tunneling_probability(
        self,
        z1: int,
        z2: int,
        a1: float,
        a2: float,
        energy_kev: float,
        potential_type: str = 'coulomb',
        screening_energy_ev: float = 0.0,
        temperature_k: float = 300.0,
        material: str = None,
    ) -> TunnelingResult:
        """
        Calculate the tunneling probability for two nuclei.
        
        Args:
            z1: Charge number of nucleus 1
            z2: Charge number of nucleus 2
            a1: Mass number of nucleus 1
            a2: Mass number of nucleus 2
            energy_kev: Center-of-mass kinetic energy in keV
            potential_type: 'coulomb', 'screened', or 'woods_saxon'
            screening_energy_ev: Electron screening energy in eV
            temperature_k: Temperature in Kelvin
            material: Host material name for screening lookup
            
        Returns:
            TunnelingResult with probability and related quantities
        """
        # Calculate reduced mass
        m1 = a1 * AMU
        m2 = a2 * AMU
        mu = reduced_mass(m1, m2)
        
        # Get screening energy if material specified
        if material and screening_energy_ev == 0:
            screening_energy_ev = SCREENING_POTENTIALS.get(material, 0)
        
        # Convert energies to Joules
        energy_j = energy_kev * KEV_TO_J
        screening_j = screening_energy_ev * EV_TO_J
        
        # Effective energy with screening
        effective_energy_j = energy_j + screening_j
        
        # Calculate Gamow factor (analytic approximation for Coulomb barrier)
        e_g = gamow_energy(z1, z2, mu)  # Gamow energy in keV
        gamow_factor = np.sqrt(e_g / energy_kev)
        
        # Calculate classical turning point
        r_turn = self._classical_turning_point(z1, z2, effective_energy_j)
        
        # Calculate barrier height
        barrier_kev = coulomb_barrier(z1, z2)
        
        # Calculate WKB integral numerically for more accuracy
        if potential_type == 'coulomb':
            # Use analytic Gamow formula for pure Coulomb
            tunneling_prob = self._gamow_probability(z1, z2, mu, energy_kev, screening_energy_ev/1000)
        else:
            # Use numerical integration for modified potentials
            tunneling_prob = self._numerical_wkb(z1, z2, mu, energy_j, potential_type, screening_j)
        
        # Calculate enhancement factors
        enhancement = self._calculate_enhancement(
            z1, z2, mu, energy_kev, screening_energy_ev, temperature_k
        )
        
        return TunnelingResult(
            probability=float(tunneling_prob * enhancement),
            gamow_factor=float(gamow_factor),
            classical_turning_point=float(r_turn),
            barrier_height=float(barrier_kev),
            enhancement_factor=float(enhancement),
            screening_energy=float(screening_energy_ev / 1000),  # Convert to keV
            method=f'WKB-{potential_type}',
            parameters={
                'z1': z1, 'z2': z2, 'a1': a1, 'a2': a2,
                'energy_kev': energy_kev,
                'temperature_k': temperature_k,
                'material': material,
            }
        )
    
    def _gamow_probability(
        self,
        z1: int,
        z2: int,
        mu: float,
        energy_kev: float,
        screening_kev: float = 0.0
    ) -> float:
        """
        Calculate tunneling probability using the Gamow formula.
        
        P = exp(-2*pi*eta) where eta is the Sommerfeld parameter
        
        For screened Coulomb: E → E + U_e
        """
        effective_energy = energy_kev + screening_kev
        
        if effective_energy <= 0:
            return 0.0
            
        # Calculate Sommerfeld parameter
        eta = sommerfeld_parameter(z1, z2, effective_energy, mu)
        
        # Gamow penetration factor
        p = np.exp(-2 * np.pi * eta)
        
        return max(p, 1e-300)  # Avoid underflow
    
    def _classical_turning_point(self, z1: int, z2: int, energy_j: float) -> float:
        """Calculate the classical turning point for the Coulomb barrier."""
        if energy_j <= 0:
            return float('inf')
        
        # r = Z1*Z2*e^2 / (4*pi*eps0*E)
        r = (z1 * z2 * E_CHARGE**2) / (4 * np.pi * EPSILON_0 * energy_j)
        return r
    
    def _coulomb_potential(self, r: float, z1: int, z2: int, **kwargs) -> float:
        """Pure Coulomb potential V(r) = Z1*Z2*e^2/(4*pi*eps0*r)."""
        if r <= 0:
            return float('inf')
        return (z1 * z2 * E_CHARGE**2) / (4 * np.pi * EPSILON_0 * r)
    
    def _screened_coulomb_potential(
        self, 
        r: float, 
        z1: int, 
        z2: int, 
        screening_length: float = None,
        **kwargs
    ) -> float:
        """
        Screened Coulomb (Yukawa) potential.
        
        V(r) = Z1*Z2*e^2/(4*pi*eps0*r) * exp(-r/a_s)
        
        where a_s is the screening length.
        """
        if r <= 0:
            return float('inf')
            
        if screening_length is None:
            # Use Thomas-Fermi screening length as default
            screening_length = A_BOHR * (9 * np.pi**2 / 128)**(1/3) / (z1 + z2)**(1/3)
        
        v_coulomb = (z1 * z2 * E_CHARGE**2) / (4 * np.pi * EPSILON_0 * r)
        return v_coulomb * np.exp(-r / screening_length)
    
    def _woods_saxon_potential(
        self,
        r: float,
        z1: int,
        z2: int,
        a1: float = 2,
        a2: float = 2,
        **kwargs
    ) -> float:
        """
        Woods-Saxon nuclear potential combined with Coulomb.
        
        V_nuclear(r) = -V0 / (1 + exp((r-R)/a))
        
        where R is the nuclear radius and a is the surface diffuseness.
        """
        # Nuclear parameters
        R0 = 1.2e-15  # Nuclear radius constant (m)
        a_diff = 0.5e-15  # Surface diffuseness (m)
        V0 = 50 * 1.602e-13  # Well depth ~50 MeV in J
        
        R_nuclear = R0 * (a1**(1/3) + a2**(1/3))
        
        # Woods-Saxon form
        if r > 1e-16:
            v_nuclear = -V0 / (1 + np.exp((r - R_nuclear) / a_diff))
            v_coulomb = self._coulomb_potential(r, z1, z2)
            return v_coulomb + v_nuclear
        else:
            return -V0
    
    def _numerical_wkb(
        self,
        z1: int,
        z2: int,
        mu: float,
        energy_j: float,
        potential_type: str,
        screening_j: float = 0.0
    ) -> float:
        """
        Calculate tunneling probability using numerical WKB integration.
        
        P = exp(-2 * ∫ k(r) dr) where k(r) = sqrt(2*mu*(V(r)-E)) / hbar
        """
        potential_func = self.potential_models.get(potential_type, self._coulomb_potential)
        
        # Effective energy
        E_eff = energy_j + screening_j
        
        # Find classical turning points
        r_min = 1e-15  # Nuclear radius scale
        r_max = self._classical_turning_point(z1, z2, E_eff)
        
        if r_max <= r_min or r_max > 1e-9:
            # Invalid turning points
            return 1e-300
        
        def integrand(r):
            V = potential_func(r, z1, z2)
            diff = V - E_eff
            if diff <= 0:
                return 0
            return np.sqrt(2 * mu * diff) / HBAR
        
        # Numerical integration
        try:
            integral, _ = integrate.quad(integrand, r_min, r_max, limit=100)
            probability = np.exp(-2 * integral)
            return max(probability, 1e-300)
        except Exception:
            # Fall back to Gamow approximation
            return self._gamow_probability(z1, z2, mu, energy_j/KEV_TO_J, screening_j/KEV_TO_J)
    
    def _calculate_enhancement(
        self,
        z1: int,
        z2: int,
        mu: float,
        energy_kev: float,
        screening_ev: float,
        temperature_k: float
    ) -> float:
        """
        Calculate total enhancement factor from various effects.
        
        Includes:
        - Electron screening enhancement
        - Temperature-dependent effects
        """
        enhancement = 1.0
        
        # Electron screening enhancement
        if screening_ev > 0 and energy_kev > 0:
            # f = exp(π * η * Ue / E) approximately
            eta = sommerfeld_parameter(z1, z2, energy_kev, mu)
            screen_factor = np.exp(np.pi * eta * (screening_ev/1000) / energy_kev)
            enhancement *= min(screen_factor, 1e10)  # Cap enhancement
        
        # Temperature enhancement (phonon effects, very small at low T)
        if temperature_k > 0:
            # Simple model: enhancement increases with temperature
            # due to increased vibrational amplitude
            T_ref = 300.0  # Reference temperature
            temp_factor = 1.0 + 0.001 * (temperature_k - T_ref) / T_ref
            enhancement *= max(temp_factor, 0.5)
        
        return enhancement


def calculate_dd_tunneling(
    energy_kev: float,
    temperature_k: float = 300.0,
    material: str = 'palladium',
    screening_energy_ev: float = None
) -> TunnelingResult:
    """
    Convenience function for D-D fusion tunneling calculation.
    
    Args:
        energy_kev: Center-of-mass energy in keV
        temperature_k: Temperature in Kelvin
        material: Host material for screening
        screening_energy_ev: Override screening energy (eV)
        
    Returns:
        TunnelingResult
    """
    calc = WKBTunnelingCalculator()
    
    if screening_energy_ev is None:
        screening_energy_ev = SCREENING_POTENTIALS.get(material, 0)
    
    return calc.calculate_tunneling_probability(
        z1=1, z2=1,  # Deuterium-deuterium
        a1=2, a2=2,
        energy_kev=energy_kev,
        potential_type='screened',
        screening_energy_ev=screening_energy_ev,
        temperature_k=temperature_k,
        material=material
    )


def calculate_dt_tunneling(
    energy_kev: float,
    temperature_k: float = 300.0,
    material: str = 'palladium',
    screening_energy_ev: float = None
) -> TunnelingResult:
    """
    Convenience function for D-T fusion tunneling calculation.
    
    Args:
        energy_kev: Center-of-mass energy in keV
        temperature_k: Temperature in Kelvin
        material: Host material for screening
        screening_energy_ev: Override screening energy (eV)
        
    Returns:
        TunnelingResult
    """
    calc = WKBTunnelingCalculator()
    
    if screening_energy_ev is None:
        screening_energy_ev = SCREENING_POTENTIALS.get(material, 0)
    
    return calc.calculate_tunneling_probability(
        z1=1, z2=1,  # Deuterium-tritium (both Z=1)
        a1=2, a2=3,
        energy_kev=energy_kev,
        potential_type='screened',
        screening_energy_ev=screening_energy_ev,
        temperature_k=temperature_k,
        material=material
    )


# Export
__all__ = [
    'WKBTunnelingCalculator',
    'TunnelingResult',
    'calculate_dd_tunneling',
    'calculate_dt_tunneling',
]

