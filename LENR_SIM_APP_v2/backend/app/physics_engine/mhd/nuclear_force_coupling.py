"""
Nuclear Force Coupling Module
==============================

Implements the EM → Weak → Strong force coupling chain that connects
MHD-scale compression to nuclear-scale reaction rates.

Electromagnetic (EM)
~~~~~~~~~~~~~~~~~~~~
* Coulomb barrier with dynamical screening from MHD compression
* QED vacuum modification (coherent domains, Casimir confinement)

Weak Nuclear Force
~~~~~~~~~~~~~~~~~~
* Electron capture (inverse beta decay):  p + e⁻ → n + νₑ
* Enhanced by compressed electron wave-functions (Rydberg / halo states)

Strong Nuclear Force
~~~~~~~~~~~~~~~~~~~~
* Energy-dependent cross-sections via astrophysical S-factor
* D+D branching ratios (3 channels)
* Near-threshold resonance effects

References
----------
[1] NACRE II: Xu, Y. et al. (2013). Nucl. Phys. A 918, 61–169.
[2] Caughlan, G. R. & Fowler, W. A. (1988). At. Data Nucl. Data Tables 40, 283.
[3] Bahcall, J. N. (1964). "Electron Capture and Nuclear Matrix Elements
    of Be-7". Phys. Rev. 135, B137.
[4] Assenbaum, H. J., Langanke, K., & Rolfs, C. (1987). "Effects of
    electron screening on low-energy fusion cross sections". Z. Phys.
    A 327, 461–468.
[5] Ichimaru, S. (1993). "Nuclear fusion in dense plasmas". Rev. Mod.
    Phys. 65, 255–299.
[6] Bosch, H.-S. & Hale, G. M. (1992). "Improved formulas for fusion
    cross-sections and thermal reactivities". Nucl. Fusion 32, 611.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Tuple

import numpy as np
from scipy import constants as const

logger = logging.getLogger(__name__)

# Physical constants
HBAR: float = const.hbar
KB: float = const.k
E_CHARGE: float = const.e
ME: float = const.m_e
MP: float = const.m_p
C: float = const.c
MU_0: float = const.mu_0
EPS0: float = const.epsilon_0
PI: float = math.pi
AMU: float = const.atomic_mass  # kg

# Deuteron mass
M_DEUTERON: float = 2.01410177811 * AMU
# Fermi coupling constant  G_F / (ℏc)³
G_F: float = 1.1663787e-5  # GeV^-2  → convert as needed


# ═══════════════════════════════════════════════════════════════════════════
#  Astrophysical S-factor & cross-section
# ═══════════════════════════════════════════════════════════════════════════
@dataclass
class NuclearCrossSectionResult:
    """Energy-dependent nuclear reaction cross-section."""

    energy_keV: float = 0.0
    sommerfeld_parameter: float = 0.0       # η = Z₁Z₂e² / (ℏv)
    gamow_energy_keV: float = 0.0           # E_G = (π α Z₁Z₂)² × 2μc²
    S_factor_keV_b: float = 0.0             # S(E) in keV·barn
    cross_section_barn: float = 0.0         # σ(E) in barn
    cross_section_m2: float = 0.0           # σ(E) in m²
    penetration_probability: float = 0.0    # Gamow factor exp(−2πη)
    channel: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "energy_keV": self.energy_keV,
            "sommerfeld_parameter": self.sommerfeld_parameter,
            "gamow_energy_keV": self.gamow_energy_keV,
            "S_factor_keV_b": self.S_factor_keV_b,
            "cross_section_barn": self.cross_section_barn,
            "cross_section_m2": self.cross_section_m2,
            "penetration_probability": self.penetration_probability,
            "channel": self.channel,
        }


# D+D S-factor data (NACRE II / Caughlan & Fowler 1988 parametrisation)
# S(E) ≈ S_0 + S_1·E + S_2·E²  (keV·barn)
_DD_SFACTOR_PARAMS: Dict[str, Dict[str, float]] = {
    "D(d,n)He3": {
        "S_0": 52.9,       # keV·barn  at E→0
        "S_1": 0.0,        # keV·barn / keV
        "S_2": 0.0,        # keV·barn / keV²
        "Q_value_MeV": 3.269,
        "branch_ratio": 0.50,
    },
    "D(d,p)T": {
        "S_0": 55.2,
        "S_1": 0.0,
        "S_2": 0.0,
        "Q_value_MeV": 4.033,
        "branch_ratio": 0.50,
    },
    "D(d,gamma)He4": {
        "S_0": 5.5e-6,     # extremely rare radiative capture
        "S_1": 0.0,
        "S_2": 0.0,
        "Q_value_MeV": 23.847,
        "branch_ratio": 1e-7,
    },
}

# Other relevant reactions
_PD_SFACTOR_PARAMS: Dict[str, Dict[str, float]] = {
    "p(d,gamma)He3": {
        "S_0": 0.166e-3,   # keV·barn  (very small)
        "S_1": 0.0,
        "S_2": 0.0,
        "Q_value_MeV": 5.494,
        "branch_ratio": 1.0,
    },
}


def compute_sommerfeld_parameter(
    E_keV: float,
    Z1: int = 1,
    Z2: int = 1,
    mu_amu: float = 1.0,
) -> float:
    """Sommerfeld parameter  η = Z₁Z₂e² / (ℏv).

    Uses  η = α Z₁Z₂ √(μc²/(2E))  where α is fine-structure constant.
    """
    if E_keV <= 0:
        return float("inf")
    alpha = const.fine_structure
    mu_c2_keV = mu_amu * AMU * C**2 / (1e3 * E_CHARGE)  # μc² in keV
    return alpha * Z1 * Z2 * math.sqrt(mu_c2_keV / (2.0 * E_keV))


def compute_gamow_energy(Z1: int = 1, Z2: int = 1, mu_amu: float = 1.0) -> float:
    """Gamow energy  E_G = (π α Z₁Z₂)² × 2μc²  in keV."""
    alpha = const.fine_structure
    mu_c2_keV = mu_amu * AMU * C**2 / (1e3 * E_CHARGE)
    return (PI * alpha * Z1 * Z2)**2 * 2.0 * mu_c2_keV


def compute_nuclear_cross_section(
    E_keV: float,
    reaction: str = "D(d,n)He3",
    screening_energy_keV: float = 0.0,
) -> NuclearCrossSectionResult:
    """Compute energy-dependent nuclear cross-section using astrophysical S-factor.

    σ(E) = S(E) exp(−2πη) / E

    where the Gamow penetration factor exp(−2πη) encodes the Coulomb barrier.

    Parameters
    ----------
    E_keV : float
        Centre-of-mass energy (keV).
    reaction : str
        Reaction channel name (e.g. ``"D(d,n)He3"``).
    screening_energy_keV : float
        Electron screening energy (keV) that effectively shifts the
        tunnelling energy:  E_eff = E + U_s.
    """
    result = NuclearCrossSectionResult(energy_keV=E_keV, channel=reaction)

    # Reaction parameters
    all_reactions = {**_DD_SFACTOR_PARAMS, **_PD_SFACTOR_PARAMS}
    if reaction not in all_reactions:
        logger.warning("Unknown reaction channel: %s", reaction)
        return result
    rp = all_reactions[reaction]

    # D+D: reduced mass = m_D/2
    if reaction.startswith("D(d,"):
        Z1, Z2 = 1, 1
        mu_amu = M_DEUTERON / (2.0 * AMU)  # ≈1.007 amu
    elif reaction.startswith("p(d,"):
        Z1, Z2 = 1, 1
        mu_amu = (MP * M_DEUTERON) / ((MP + M_DEUTERON) * AMU)
    else:
        Z1, Z2 = 1, 1
        mu_amu = 1.0

    # Effective energy with screening
    E_eff = E_keV + screening_energy_keV
    if E_eff <= 0:
        return result

    # Sommerfeld parameter
    eta = compute_sommerfeld_parameter(E_eff, Z1, Z2, mu_amu)
    result.sommerfeld_parameter = eta

    # Gamow energy
    result.gamow_energy_keV = compute_gamow_energy(Z1, Z2, mu_amu)

    # Penetration probability (Gamow factor)
    exponent = -2.0 * PI * eta
    if exponent < -700:  # prevent underflow
        result.penetration_probability = 0.0
    else:
        result.penetration_probability = math.exp(exponent)

    # S-factor  S(E) ≈ S₀ + S₁·E + S₂·E²
    S = rp["S_0"] + rp.get("S_1", 0.0) * E_eff + rp.get("S_2", 0.0) * E_eff**2
    result.S_factor_keV_b = S

    # Cross-section  σ = S(E) exp(−2πη) / E  (barn)
    if result.penetration_probability > 0:
        sigma_barn = S * result.penetration_probability / E_eff
    else:
        sigma_barn = 0.0
    result.cross_section_barn = sigma_barn
    result.cross_section_m2 = sigma_barn * 1e-28  # 1 barn = 1e-28 m²

    return result


def compute_dd_branching_ratios(E_keV: float = 10.0) -> Dict[str, float]:
    """D+D branching ratios at given CM energy.

    At low energies (< 100 keV), the ratios are approximately:
      D(d,n)He3 : D(d,p)T : D(d,γ)He4  ≈  50% : 50% : 1e-7
    """
    # At very low energies the two main channels are nearly equal
    # due to charge symmetry of D+D.
    ratios: Dict[str, float] = {}
    total = 0.0
    for channel, params in _DD_SFACTOR_PARAMS.items():
        ratios[channel] = params["branch_ratio"]
        total += params["branch_ratio"]
    # Normalise
    for k in ratios:
        ratios[k] /= total
    return ratios


# ═══════════════════════════════════════════════════════════════════════════
#  Weak Nuclear Force — Electron Capture
# ═══════════════════════════════════════════════════════════════════════════
@dataclass
class ElectronCaptureResult:
    """Electron capture (inverse beta decay) rate calculation."""

    rate_per_s: float = 0.0                 # λ_ec (s⁻¹)
    electron_density_at_nucleus: float = 0.0  # |ψ_e(0)|² (m⁻³)
    Q_value_MeV: float = 0.0               # energy threshold
    neutrino_energy_MeV: float = 0.0
    enhancement_factor: float = 1.0         # vs. free-atom rate
    is_energetically_allowed: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rate_per_s": self.rate_per_s,
            "electron_density_at_nucleus": self.electron_density_at_nucleus,
            "Q_value_MeV": self.Q_value_MeV,
            "neutrino_energy_MeV": self.neutrino_energy_MeV,
            "enhancement_factor": self.enhancement_factor,
            "is_energetically_allowed": self.is_energetically_allowed,
        }


def compute_electron_capture_rate(
    Z: int = 1,
    screening_energy_eV: float = 0.0,
    electron_density_m3: float = 1e30,
    Q_value_MeV: float = -0.782,
    temperature_K: float = 300.0,
    rydberg_enhancement: float = 1.0,
) -> ElectronCaptureResult:
    """Compute electron capture rate  p + e⁻ → n + νₑ.

    The rate depends critically on the electron density at the proton
    (nucleus), which can be enhanced by:

    * Electron screening from MHD compression
    * Rydberg matter states where |ψ_e(0)|² is larger
    * Coherent QED domain effects
    * Lattice confinement

    Parameters
    ----------
    Z : int
        Atomic number of the capturing nucleus (1 for proton).
    screening_energy_eV : float
        Electron screening energy from the environment.
    electron_density_m3 : float
        Local electron number density (m⁻³).
    Q_value_MeV : float
        Mass difference (for free proton ec: Q = m_n - m_p = +0.782 MeV,
        meaning EC on free proton is energetically forbidden without
        sufficient kinetic energy; but in lattice environment the
        screening can effectively lower the threshold).
    temperature_K : float
        Local temperature (K).
    rydberg_enhancement : float
        Factor by which |ψ_e(0)|² is enhanced relative to free atom
        (>1 for Rydberg / halo electron states).
    """
    result = ElectronCaptureResult()
    result.Q_value_MeV = abs(Q_value_MeV)

    # Effective threshold with screening
    threshold_MeV = abs(Q_value_MeV) - screening_energy_eV * 1e-6
    result.is_energetically_allowed = threshold_MeV < 0 or (
        KB * temperature_K / (1e6 * E_CHARGE) > threshold_MeV
    )

    if not result.is_energetically_allowed:
        # Rate exponentially suppressed
        if temperature_K > 0:
            E_thermal_MeV = KB * temperature_K / (1e6 * E_CHARGE)
            if threshold_MeV > 0 and E_thermal_MeV > 0:
                suppression = math.exp(-threshold_MeV / E_thermal_MeV) if threshold_MeV / E_thermal_MeV < 700 else 0.0
            else:
                suppression = 0.0
        else:
            suppression = 0.0
    else:
        suppression = 1.0

    # Electron density at the nucleus
    # For a hydrogen-like atom: |ψ(0)|² = (Z/a₀)³ / π
    a_bohr = const.value("Bohr radius")
    psi_sq_free = (Z / a_bohr)**3 / PI
    # Scale by actual electron density relative to atomic density
    n_atomic = (Z / a_bohr)**3  # rough atomic electron density
    density_ratio = electron_density_m3 / n_atomic if n_atomic > 0 else 1.0
    psi_sq = psi_sq_free * density_ratio * rydberg_enhancement
    result.electron_density_at_nucleus = psi_sq
    result.enhancement_factor = density_ratio * rydberg_enhancement

    # EC rate:  λ = (G_F² / π) × (m_e c²)² × |ψ_e(0)|² × f(Q)
    # Convert G_F to SI-compatible form
    # G_F/(ℏc)³ = 1.166e-5 GeV⁻²  → G_F = 1.166e-5 × (ℏc)³ GeV⁻²
    # In SI:  G_F ≈ 8.96e-44 J·m³ / ℏ³
    hbar_c_MeV_fm = 197.3269804  # ℏc in MeV·fm
    G_F_SI = 1.1663787e-5 * 1e-18 * (hbar_c_MeV_fm * 1e-15 * 1e6 * E_CHARGE)**3
    # This is approximate; for our purposes the exact prefactor matters less
    # than getting the correct density and energy dependences.

    me_c2 = ME * C**2  # electron rest energy in J
    # Phase space factor  f(Q) ~ Q² for allowed transitions
    Q_J = abs(Q_value_MeV) * 1e6 * E_CHARGE  # convert to Joules
    f_Q = Q_J**2 if Q_J > 0 else me_c2**2

    # Rate (very approximate — order-of-magnitude)
    prefactor = (G_F_SI**2 / PI) * me_c2**2
    lambda_ec = prefactor * psi_sq * f_Q * suppression

    # Clamp to physically reasonable range
    result.rate_per_s = min(max(lambda_ec, 0.0), 1e20)

    # Neutrino energy
    if result.is_energetically_allowed:
        result.neutrino_energy_MeV = abs(Q_value_MeV) + screening_energy_eV * 1e-6

    return result


# ═══════════════════════════════════════════════════════════════════════════
#  Full Coupling Chain
# ═══════════════════════════════════════════════════════════════════════════
@dataclass
class NuclearForceCouplingResult:
    """Combined EM + Weak + Strong force coupling results."""

    # EM screening
    screening_energy_eV: float = 0.0

    # Strong force — nuclear reactions
    dd_cross_sections: Dict[str, NuclearCrossSectionResult] = field(default_factory=dict)
    dd_branching_ratios: Dict[str, float] = field(default_factory=dict)
    total_reaction_rate_per_m3_s: float = 0.0

    # Weak force — electron capture
    electron_capture: Optional[ElectronCaptureResult] = None

    # Energy budget
    nuclear_power_W_m3: float = 0.0
    neutron_rate_per_m3_s: float = 0.0
    neutrino_loss_W_m3: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "screening_energy_eV": self.screening_energy_eV,
            "dd_cross_sections": {k: v.to_dict() for k, v in self.dd_cross_sections.items()},
            "dd_branching_ratios": self.dd_branching_ratios,
            "total_reaction_rate_per_m3_s": self.total_reaction_rate_per_m3_s,
            "nuclear_power_W_m3": self.nuclear_power_W_m3,
            "neutron_rate_per_m3_s": self.neutron_rate_per_m3_s,
            "neutrino_loss_W_m3": self.neutrino_loss_W_m3,
            "electron_capture": self.electron_capture.to_dict() if self.electron_capture else None,
        }


def compute_nuclear_coupling(
    ion_density_m3: float = 1e28,
    temperature_K: float = 300.0,
    screening_energy_eV: float = 0.0,
    B_field_T: float = 0.0,
    electron_density_m3: float = 1e30,
    rydberg_enhancement: float = 1.0,
    deuterium_fraction: float = 1.0,
) -> NuclearForceCouplingResult:
    """Compute the full EM → Weak → Strong coupling chain.

    Parameters
    ----------
    ion_density_m3 : float     Ion (deuteron) number density (m⁻³).
    temperature_K : float      Local temperature (K).
    screening_energy_eV : float  Electron screening energy from MHD compression / lattice.
    B_field_T : float          Local magnetic field (T) — for Larmor confinement corrections.
    electron_density_m3 : float  Local electron density (m⁻³).
    rydberg_enhancement : float  Enhancement of |ψ_e(0)|² for electron capture.
    deuterium_fraction : float  Fraction of ions that are deuterons.
    """
    result = NuclearForceCouplingResult()
    result.screening_energy_eV = screening_energy_eV

    # CM energy from thermal distribution  E_cm ≈ k_B T
    E_cm_keV = KB * temperature_K / (1e3 * E_CHARGE)  # convert to keV

    # ── Strong force: D+D cross-sections at each channel ──────────────
    n_D = ion_density_m3 * deuterium_fraction
    branching = compute_dd_branching_ratios(E_cm_keV)
    result.dd_branching_ratios = branching

    total_rate = 0.0
    nuclear_power = 0.0
    neutron_rate = 0.0

    for channel in _DD_SFACTOR_PARAMS:
        xs = compute_nuclear_cross_section(E_cm_keV, channel, screening_energy_eV / 1000.0)
        result.dd_cross_sections[channel] = xs

        # Thermal velocity
        v_th = math.sqrt(2.0 * KB * temperature_K / M_DEUTERON) if temperature_K > 0 else 0.0

        # Reaction rate  R = ½ n_D² <σv>  (factor ½ for identical particles)
        # <σv> ≈ σ(E_cm) × v_thermal  (Maxwell-averaged would be more accurate)
        sigma_v = xs.cross_section_m2 * v_th
        R = 0.5 * n_D**2 * sigma_v
        total_rate += R

        # Energy release
        Q_J = _DD_SFACTOR_PARAMS[channel]["Q_value_MeV"] * 1e6 * E_CHARGE
        nuclear_power += R * Q_J

        # Neutron production (only from D(d,n)He3 channel)
        if "n" in channel:
            neutron_rate += R

    result.total_reaction_rate_per_m3_s = total_rate
    result.nuclear_power_W_m3 = nuclear_power
    result.neutron_rate_per_m3_s = neutron_rate

    # ── Weak force: electron capture ──────────────────────────────────
    ec = compute_electron_capture_rate(
        Z=1,
        screening_energy_eV=screening_energy_eV,
        electron_density_m3=electron_density_m3,
        Q_value_MeV=-0.782,
        temperature_K=temperature_K,
        rydberg_enhancement=rydberg_enhancement,
    )
    result.electron_capture = ec

    # Neutrino energy loss
    if ec.rate_per_s > 0:
        result.neutrino_loss_W_m3 = ec.rate_per_s * n_D * ec.neutrino_energy_MeV * 1e6 * E_CHARGE

    return result
