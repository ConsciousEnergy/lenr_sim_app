"""
Phonon Interaction Models for LENR Simulation

This module implements advanced phonon interaction models including:
1. Phonon dispersion relations
2. Density of states calculations
3. Phonon-assisted tunneling
4. Temperature-dependent effects

**IMPORTANT: The Multi-Phonon Coherence Energy Gap Problem**

For nuclear-level energy transfer via phonons, the number of coherent
phonons required is enormous.  A single D-D fusion event releases
~23.8 MeV.  Typical lattice phonon energies are ~25-100 meV
(Debye temperature 300-600 K).  Bridging the gap requires:

    N_phonons = E_nuclear / E_phonon  ~  24e6 eV / 0.05 eV  ~  5 x 10^8

Even the more conservative estimate for 1 MeV energy transfer gives
N ~ 2 x 10^7.  The probability of this many phonons acting in quantum
coherence simultaneously is vanishingly small by standard statistical
mechanics.

This is an **open theoretical challenge** (sometimes called the
"energy gap problem" in LENR theory).  Proposed resolutions include:

- **Hagelstein's cascaded phonon-nuclear coupling** (P.L. Hagelstein,
  J. Condensed Matter Nucl. Sci., 2012): energy is transferred in a
  multi-step cascade rather than a single coherent event, with each
  step coupling a manageable number of phonons (~10^2-10^3).
- **Preparata coherent QED domains**: collective electromagnetic modes
  inside coherence domains provide a higher-energy intermediary.
- **Takahashi TSC**: tetrahedral symmetric condensates bypass the
  phonon channel entirely via direct multi-body tunneling.

The ``coherent_enhancement`` computed in this module uses a simplified
exponential model and should be interpreted as an *upper bound*.  The
true coherent multi-phonon probability remains an unresolved constraint
(see also the unified framework Part 2, Section 6.2).

References:
    - Hagelstein, P.L. "Phonon-nuclear coupling..." JCMNS (2012)
    - Preparata, G. "QED Coherence in Matter" (World Scientific, 1995)
    - Storms, E. "The Explanation of Low Energy Nuclear Reaction" (2014)
"""

import numpy as np
from typing import Dict, Any, Optional, Tuple, Union
import scipy.constants as const
from dataclasses import dataclass, field
from scipy.integrate import quad

# Physical constants
HBAR = const.hbar
KB = const.k
ELECTRON_MASS = const.m_e
AMU = const.u
EV_TO_J = const.e

@dataclass
class PhononParameters:
    """Parameters for phonon calculations"""
    # Basic lattice parameters
    lattice_constant: float  # in meters
    atomic_mass: float  # in AMU
    
    # Dispersion parameters
    sound_speed: float = 5000.0  # Speed of sound in m/s
    debye_temperature: float = 300.0  # Debye temperature in K
    max_frequency: float = field(init=False)  # Maximum phonon frequency
    
    # Coupling parameters
    electron_phonon_coupling: float = 0.1  # Dimensionless coupling constant
    anharmonicity: float = 0.05  # Anharmonicity parameter
    
    def __post_init__(self):
        """Calculate derived parameters"""
        # Calculate maximum phonon frequency from Debye temperature
        self.max_frequency = self.debye_temperature * KB / HBAR

def calculate_phonon_dispersion(
    wavevector: float,
    params: PhononParameters
) -> Dict[str, float]:
    """
    Calculate phonon dispersion relation for acoustic modes
    
    Args:
        wavevector: Phonon wavevector in inverse meters
        params: Phonon parameters
        
    Returns:
        Dictionary with frequencies for different modes
    """
    # Implement dispersion for acoustic modes
    omega_la = params.sound_speed * wavevector  # Longitudinal acoustic
    omega_ta = params.sound_speed * wavevector * 0.5  # Transverse acoustic
    
    # Add anharmonic corrections
    anharmonic_correction = params.anharmonicity * wavevector**2
    
    return {
        "longitudinal_acoustic_hz": float(omega_la / (2 * np.pi)),
        "transverse_acoustic_hz": float(omega_ta / (2 * np.pi)),
        "anharmonic_correction_hz": float(anharmonic_correction / (2 * np.pi))
    }

def density_of_states(
    energy: float,
    params: PhononParameters
) -> float:
    """
    Calculate phonon density of states using Debye model
    
    Args:
        energy: Energy in eV
        params: Phonon parameters
        
    Returns:
        Density of states in states/eV
    """
    # Convert energy to angular frequency
    omega = energy * EV_TO_J / HBAR
    
    # Debye model DOS: g(ω) ∝ ω² for ω < ωD
    if omega > params.max_frequency:
        return 0.0
    
    # Include anharmonic effects in DOS
    dos = (9 * omega**2) / (params.max_frequency**3)
    dos *= (1 + params.anharmonicity * (omega / params.max_frequency)**2)
    
    return float(dos)

def calculate_tunneling_enhancement(
    energy: float,
    temperature: float,
    params: PhononParameters
) -> Dict[str, float]:
    """
    Calculate phonon-assisted tunneling enhancement
    
    Args:
        energy: Particle energy in eV
        temperature: Temperature in Kelvin
        params: Phonon parameters
        
    Returns:
        Dictionary with enhancement factors
    """
    # Validate temperature to avoid division by zero
    if temperature <= 0:
        # Return zero enhancement for invalid temperature
        return {
            "single_phonon_enhancement": 1.0,
            "coherent_enhancement": 1.0,
            "total_enhancement": 1.0
        }
    
    # Convert energy to Joules
    energy_j = energy * EV_TO_J
    
    # Calculate thermal occupation of phonon modes
    def n_phonon(omega):
        """Bose-Einstein distribution"""
        x = HBAR * omega / (KB * temperature)
        if x > 100:  # Prevent overflow
            return 0.0
        return 1.0 / (np.exp(x) - 1.0)
    
    # Calculate enhancement from phonon absorption/emission
    def integrand(omega):
        if omega > params.max_frequency:
            return 0.0
        n_omega = n_phonon(omega)
        dos = density_of_states(HBAR * omega / EV_TO_J, params)
        return dos * (n_omega + 0.5) * params.electron_phonon_coupling
    
    # Integrate over phonon frequencies
    enhancement, _ = quad(integrand, 0, params.max_frequency)
    
    # Calculate coherent multi-phonon processes
    # NOTE (energy gap problem): This is a simplified upper-bound model.
    # True N-phonon coherence for nuclear-scale energy transfer requires
    # N ~ 10^7-10^8 phonons, which is statistically implausible without
    # a cascaded mechanism (see Hagelstein 2012).  The exponential model
    # below captures the *qualitative* enhancement trend but should not
    # be interpreted as a quantitative prediction of coherent phonon
    # coupling to nuclear degrees of freedom.
    coherent_enhancement = 1.0
    if temperature > 0 and params.max_frequency > 0:
        thermal_energy = KB * temperature
        exponent = params.electron_phonon_coupling * thermal_energy / (HBAR * params.max_frequency)
        # Clip exponent to prevent overflow
        exponent = np.clip(exponent, -700, 700)
        coherent_enhancement = np.exp(exponent)
    
    return {
        "single_phonon_enhancement": float(1.0 + enhancement),
        "coherent_enhancement": float(coherent_enhancement),
        "total_enhancement": float((1.0 + enhancement) * coherent_enhancement)
    }

def calculate_temperature_dependent_screening(
    temperature: float,
    params: PhononParameters
) -> Dict[str, float]:
    """
    Calculate temperature-dependent screening effects
    
    Args:
        temperature: Temperature in Kelvin
        params: Phonon parameters
        
    Returns:
        Dictionary with screening parameters
    """
    # Base screening length (Thomas-Fermi)
    base_screening = 5e-11  # 0.5 Å
    
    # Temperature dependence through phonon-modulated screening
    thermal_factor = np.sqrt(temperature / 300.0)  # Normalized to room temperature
    
    # Calculate phonon contribution to screening
    phonon_screening = params.electron_phonon_coupling * \
        np.tanh(params.debye_temperature / (2 * temperature))
    
    # Total screening length with temperature dependence
    total_screening = base_screening * (1.0 + thermal_factor * phonon_screening)
    
    return {
        "base_screening_m": float(base_screening),
        "thermal_factor": float(thermal_factor),
        "phonon_contribution": float(phonon_screening),
        "total_screening_m": float(total_screening)
    }

def estimate_phonon_coherence_number(
    energy_transfer_eV: float = 24e6,
    debye_temperature: float = 300.0,
) -> Dict[str, Any]:
    """
    Estimate the number of coherent phonons required to bridge the
    nuclear energy gap -- the "energy gap problem" in LENR theory.

    For nuclear-scale energy transfer (MeV) via lattice phonons (~meV),
    an enormous number of phonons must act coherently.  This function
    quantifies the gap and flags whether it is physically tractable.

    Args:
        energy_transfer_eV: Energy to transfer in eV (default: 23.8 MeV
            for D-D fusion).
        debye_temperature: Lattice Debye temperature in K (determines
            characteristic phonon energy).

    Returns:
        Dictionary with:
        - phonon_energy_eV: single phonon energy (kB * T_Debye)
        - n_phonons_required: E_nuclear / E_phonon
        - log10_n: log10 of phonon count
        - is_tractable: True if N < 10^4 (Hagelstein cascade regime)
        - note: human-readable assessment
        - hagelstein_cascade_steps: estimated cascade stages if each
          stage couples ~1000 phonons

    References:
        Hagelstein, P.L. J. Condensed Matter Nucl. Sci. (2012)
    """
    phonon_energy_eV = KB * debye_temperature / EV_TO_J  # eV
    n_phonons = energy_transfer_eV / phonon_energy_eV
    log10_n = float(np.log10(max(n_phonons, 1.0)))
    cascade_steps = int(np.ceil(log10_n / 3))  # each stage ~1000 phonons

    if n_phonons < 1e4:
        note = (
            f"N={n_phonons:.0f} phonons is within the Hagelstein cascade "
            "regime; coherent coupling is plausible."
        )
        is_tractable = True
    else:
        note = (
            f"N={n_phonons:.2e} phonons required. Simultaneous coherence "
            "is vanishingly improbable by standard statistical mechanics. "
            "Hagelstein's cascaded phonon-nuclear coupling model proposes "
            f"~{cascade_steps} cascaded stages of ~10^3 phonons each as "
            "an alternative mechanism. This remains an OPEN THEORETICAL "
            "CHALLENGE (energy gap problem)."
        )
        is_tractable = False

    return {
        "phonon_energy_eV": float(phonon_energy_eV),
        "n_phonons_required": float(n_phonons),
        "log10_n": log10_n,
        "is_tractable": is_tractable,
        "hagelstein_cascade_steps": cascade_steps,
        "note": note,
    }


def calculate_thermal_properties(
    temperature: float,
    params: PhononParameters
) -> Dict[str, float]:
    """
    Calculate thermal properties based on phonon model
    
    Args:
        temperature: Temperature in Kelvin
        params: Phonon parameters
        
    Returns:
        Dictionary with thermal properties
    """
    # Calculate Debye integral for specific heat
    def debye_integral(x):
        def integrand(t):
            return (t**4 * np.exp(t)) / (np.exp(t) - 1)**2
        
        try:
            result, _ = quad(integrand, 0, x)
            return result
        except:
            return 0.0
    
    # Characteristic temperature ratio
    theta_ratio = params.debye_temperature / temperature
    
    # Specific heat calculation (normalized to classical limit)
    cv_factor = 9 * debye_integral(theta_ratio) / theta_ratio**3
    
    # Thermal conductivity estimate
    kappa = (1/3) * params.sound_speed**2 * cv_factor * \
            (1 - params.anharmonicity * (temperature / params.debye_temperature))
    
    return {
        "specific_heat_ratio": float(cv_factor),
        "thermal_conductivity_w_mk": float(kappa),
        "debye_weight": float(np.exp(-temperature / params.debye_temperature))
    } 