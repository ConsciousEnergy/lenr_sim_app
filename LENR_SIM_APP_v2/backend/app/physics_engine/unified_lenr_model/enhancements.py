"""Legacy enhancement calculations (QED, coherence, Casimir, bubble, Rydberg)."""
import numpy as np
from scipy import constants as const
from .config import (
    SimulationConfig,
    EnhancementResult,
    get_double_layer_potential,
)

HBAR = const.hbar
E_CHARGE = const.e
C = const.c
EPS0 = const.epsilon_0
KB = const.k


def calculate_qed_enhancement(config: SimulationConfig) -> EnhancementResult:
    """Double-layer QED field enhancement. From paper Section 2.3."""
    E_field = config.electric_field
    d_layer = config.surface_roughness
    n_e = config.host_material.electron_density
    T = config.temperature
    delta_V = get_double_layer_potential(config.host_material, n_e, T)
    E_double_layer = delta_V / max(d_layer, 1e-10)
    E_total = E_field + E_double_layer
    E_critical = 1e8
    enhancement = 1 + (E_total / E_critical)**2
    enhancement = min(enhancement, 1e4)
    threshold_met = E_total > 1e8
    return EnhancementResult(
        name="Double-Layer QED",
        value=enhancement,
        threshold_met=threshold_met,
        equation="E = delta_V/d",
        parameters={"E_field_V_m": E_total, "d_nm": d_layer * 1e9},
        category="primary",
    )


def calculate_coherence_enhancement(config: SimulationConfig) -> EnhancementResult:
    """Quantum coherence/multi-body tunneling. From paper Section 2.5."""
    T = config.temperature
    T_debye = config.host_material.debye_temperature
    loading = config.loading_ratio
    coherence_factor = loading * np.exp(-T / T_debye)
    n_sites = max(1, int(4 * coherence_factor))
    enhancement = np.sqrt(n_sites)
    phonon_factor = 1 + 0.5 * np.exp(-T / (0.5 * T_debye))
    enhancement *= phonon_factor
    threshold_met = loading > 0.9
    return EnhancementResult(
        name="Quantum Coherence",
        value=enhancement,
        threshold_met=threshold_met,
        equation="f = sqrt(N) * f_phonon",
        parameters={"n_sites": n_sites, "loading_ratio": loading},
        category="primary",
    )


def calculate_casimir_enhancement(config: SimulationConfig) -> EnhancementResult:
    """Casimir force contribution. From paper Section 2.5."""
    d = config.surface_roughness
    A = config.grain_size**2
    F_casimir = np.pi**2 * HBAR * C / 240 * A / max(d, 1e-12)**4
    P_casimir = F_casimir / max(A, 1e-20)
    enhancement = 1 + np.log10(max(1, P_casimir / 101325))
    enhancement = max(1, min(enhancement, 100))
    threshold_met = d < 10e-9
    return EnhancementResult(
        name="Casimir Effect",
        value=enhancement,
        threshold_met=threshold_met,
        equation="F = -pi*hbar*c/240 * A/d^4",
        parameters={"F_casimir_N": F_casimir, "d_nm": d * 1e9},
        category="secondary",
    )


def calculate_bubble_enhancement(config: SimulationConfig) -> EnhancementResult:
    """Bubble collapse enhancement. From paper Section 3.2."""
    P = config.pressure
    T = config.temperature
    P_ambient = 101325
    compression_ratio = (P / P_ambient)**(1/3) if P > P_ambient else 1
    T_collapse = T * compression_ratio**2
    if T_collapse > 1000:
        enhancement = 1 + np.log10(T_collapse / T)
    else:
        enhancement = 1.0
    enhancement = max(1, min(enhancement, 50))
    threshold_met = P > 5 * P_ambient
    return EnhancementResult(
        name="Bubble Collapse",
        value=enhancement,
        threshold_met=threshold_met,
        equation="R R'' + 3/2 R'^2 = (P_b - P_inf)/rho",
        parameters={"T_collapse_K": T_collapse, "compression": compression_ratio},
        category="secondary",
    )


def calculate_rydberg_enhancement(config: SimulationConfig) -> EnhancementResult:
    """Rydberg Matter enhancement. From paper Section 2.1."""
    T = config.temperature
    E_thermal_ev = KB * T / E_CHARGE
    if E_thermal_ev > 0.001:
        n_estimate = min(10, max(1, int(np.sqrt(13.6 / E_thermal_ev))))
    else:
        n_estimate = 1
    orbital_extension = n_estimate**2
    enhancement = 1 + 0.1 * np.log(orbital_extension)
    enhancement = max(1, min(enhancement, 10))
    threshold_met = n_estimate > 2
    return EnhancementResult(
        name="Rydberg Matter",
        value=enhancement,
        threshold_met=threshold_met,
        equation="E_n = -13.6 eV / n^2",
        parameters={"n_principal": n_estimate, "r_extension": orbital_extension},
        category="secondary",
    )


def calculate_enhancements_legacy(config: SimulationConfig):
    """Original hardcoded enhancement calculation (pre-v0.3.0)."""
    from . import screening
    enhancements = []
    if config.enable_screening:
        enhancements.append(screening.calculate_electron_screening(config))
    if config.enable_qed:
        enhancements.append(calculate_qed_enhancement(config))
    if config.enable_coherence:
        enhancements.append(calculate_coherence_enhancement(config))
    if config.enable_casimir:
        enhancements.append(calculate_casimir_enhancement(config))
    if config.enable_bubble_dynamics:
        enhancements.append(calculate_bubble_enhancement(config))
    if config.enable_rydberg:
        enhancements.append(calculate_rydberg_enhancement(config))
    return enhancements