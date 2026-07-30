"""
Electron Screening Module for LENR Simulations

This module provides functions to calculate electron screening effects
in LENR systems. Electron screening reduces the Coulomb barrier between
nuclei, enhancing fusion probabilities.

References:
- Assenbaum, H.J., et al. (1987) Z. Phys. A 327, 461-468
- Ichimaru, S. (1993) Rev. Mod. Phys. 65, 255
- Kasagi, J., et al. (2002) J. Phys. Soc. Jpn. 71, 2881
- Karahadian, M.E., et al. (2026) Nat. Commun., doi:10.1038/s41467-026-74421-1
  (heterogeneous/bi-exponential screening model; see
  ``calculate_heterogeneous_screening_enhancement``)
"""

import numpy as np
import logging
from typing import Union, Tuple, Dict

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("electron_screening", "logs/simulation.log")

# Physical constants
HBAR = 1.054571817e-34  # J·s
E_CHARGE = 1.602176634e-19  # C
EPSILON_0 = 8.8541878128e-12  # F/m
K_BOLTZMANN = 1.380649e-23  # J/K
K_BOLTZMANN_EV = 8.617333262e-5  # eV/K
M_ELECTRON = 9.1093837015e-31  # kg
A_BOHR = 5.29177210903e-11  # m
ALPHA = 1.0 / 137.036  # Fine structure constant

# Material-specific screening data from experiments
# Values in eV - based on Kasagi et al. (2002) and related work
EXPERIMENTAL_SCREENING = {
    'palladium': {'Ue': 800, 'Ue_range': (300, 800), 'electron_density': 6.8e28},
    'nickel': {'Ue': 500, 'Ue_range': (300, 600), 'electron_density': 9.1e28},
    'titanium': {'Ue': 350, 'Ue_range': (200, 450), 'electron_density': 1.0e29},
    'platinum': {'Ue': 750, 'Ue_range': (400, 800), 'electron_density': 6.6e28},
}


def calculate_screening_potential(
    electron_density: float,
    work_function: float,
    temperature: float,
    model: str = "debye",
    material: str = None
) -> float:
    """
    Calculate the electron screening potential.
    
    Args:
        electron_density: Electron density (electrons/m³)
        work_function: Material work function (eV)
        temperature: Temperature (K)
        model: Screening model to use ('debye', 'thomas_fermi', 'ichimaru', 'experimental')
        material: Material name for experimental lookup
        
    Returns:
        Screening potential in eV
        
    Physics:
        The screening potential Ue represents the reduction in the Coulomb 
        barrier due to electron cloud polarization around approaching nuclei.
        
        For D-D reactions in metals, experimental values range from 100-800 eV,
        much higher than the adiabatic limit (~25 eV) due to:
        - Dynamic screening from electron-phonon coupling
        - Surface effects and defects
        - Coherent electron motion
    """
    # Safety checks
    temperature = max(temperature, 1.0)  # Prevent division by zero
    electron_density = max(electron_density, 1e20)  # Minimum reasonable density
    
    if model.lower() == "experimental" and material:
        # Use experimental values when available
        if material.lower() in EXPERIMENTAL_SCREENING:
            data = EXPERIMENTAL_SCREENING[material.lower()]
            base_Ue = data['Ue']
            # Temperature correction: screening slightly decreases with T
            # Based on Debye-Hückel theory: Ue ∝ 1/√T at high T
            T_ref = 300.0
            temp_factor = np.sqrt(T_ref / max(temperature, T_ref))
            return base_Ue * temp_factor
    
    if model.lower() == "debye":
        # Debye-Hückel screening model
        # λ_D = √(ε₀ k_B T / (n_e e²))
        # Ue = e² / (4π ε₀ λ_D)
        
        # Convert temperature to energy (J)
        kT = K_BOLTZMANN * temperature
        
        # Debye length
        lambda_D = np.sqrt(EPSILON_0 * kT / (electron_density * E_CHARGE**2))
        
        # Screening potential in Joules, then convert to eV
        Ue_J = E_CHARGE**2 / (4 * np.pi * EPSILON_0 * lambda_D)
        Ue_eV = Ue_J / E_CHARGE
        
        return Ue_eV
        
    elif model.lower() == "thomas_fermi":
        # Thomas-Fermi screening model (better for degenerate electrons in metals)
        # λ_TF = √(2 ε₀ E_F / (3 n_e e²))  where E_F is Fermi energy (PlasmaPy/Ashcroft-Mermin)
        
        # Fermi energy (J)
        E_F = (HBAR**2 / (2 * M_ELECTRON)) * (3 * np.pi**2 * electron_density)**(2/3)
        
        # Thomas-Fermi screening length
        lambda_TF = np.sqrt(2.0 * EPSILON_0 * E_F / (3 * electron_density * E_CHARGE**2))
        
        # Screening potential
        Ue_J = E_CHARGE**2 / (4 * np.pi * EPSILON_0 * lambda_TF)
        Ue_eV = Ue_J / E_CHARGE
        
        # Temperature correction: blend to Debye at high T
        E_F_eV = E_F / E_CHARGE
        kT_eV = K_BOLTZMANN_EV * temperature
        if kT_eV > 0.1 * E_F_eV:
            # Transition to classical regime
            Ue_debye = calculate_screening_potential(electron_density, work_function, temperature, "debye")
            weight = min(1.0, kT_eV / E_F_eV)
            Ue_eV = (1 - weight) * Ue_eV + weight * Ue_debye
        
        return Ue_eV
        
    elif model.lower() == "ichimaru":
        # Ichimaru's electron screening model (1993)
        # More accurate for dense plasmas including quantum effects
        # Ue = (3/2) * E_F * ξ(rs) where ξ is a function of rs = (3/4πne)^(1/3) / a0
        
        # Wigner-Seitz radius parameter
        rs = (3 / (4 * np.pi * electron_density))**(1/3) / A_BOHR
        
        # Fermi energy
        E_F = (HBAR**2 / (2 * M_ELECTRON)) * (3 * np.pi**2 * electron_density)**(2/3)
        E_F_eV = E_F / E_CHARGE
        
        # Screening function (approximate form from Ichimaru)
        # For metallic densities (rs ~ 2-6)
        xi = 0.5 * (1 + 0.1 * rs + 0.01 * rs**2)
        
        # Temperature degeneracy parameter
        theta = K_BOLTZMANN_EV * temperature / E_F_eV
        
        # Quantum correction factor
        quantum_factor = 1.0 / (1.0 + theta**2)
        
        Ue_eV = 1.5 * E_F_eV * xi * quantum_factor
        
        # Apply reasonable bounds based on experimental data
        Ue_eV = min(Ue_eV, 1000)  # Cap at 1000 eV
        
        return Ue_eV
        
    elif model.lower() == "strong":
        # DeWitt-Graboske-Cooper strong screening
        E_F = (HBAR**2 / (2 * M_ELECTRON)) * (3 * np.pi**2 * electron_density)**(2/3)
        lambda_TF = np.sqrt(2.0 * EPSILON_0 * E_F / (3 * electron_density * E_CHARGE**2))
        U_s_J = E_CHARGE**2 / (4 * np.pi * EPSILON_0 * lambda_TF)
        return U_s_J / E_CHARGE
        
    elif model.lower() == "anomalous":
        # Anomalous screening: experimental Ue with temp factor if available, else Thomas-Fermi * 5.0
        if material and material.lower() in EXPERIMENTAL_SCREENING:
            data = EXPERIMENTAL_SCREENING[material.lower()]
            base_Ue = data['Ue']
            T_ref = 300.0
            temp_factor = np.sqrt(T_ref / max(temperature, T_ref))
            return base_Ue * temp_factor
        else:
            U_s = calculate_screening_potential(electron_density, work_function, temperature, "thomas_fermi")
            return U_s * 5.0
        
    else:
        logger.warning(f"Unknown screening model: {model}, using Thomas-Fermi model")
        return calculate_screening_potential(electron_density, work_function, temperature, "thomas_fermi")


def classify_screening_regime(screening_potential_eV: float, cm_energy_eV: float) -> Dict[str, Union[str, float, bool]]:
    if cm_energy_eV <= 0:
        return {"regime": "weak", "U_s_over_E": 0.0, "salpeter_valid": True}
    
    U_s_over_E = screening_potential_eV / cm_energy_eV
    salpeter_valid = U_s_over_E < 0.1
    
    if U_s_over_E < 0.1:
        regime = "weak"
    elif U_s_over_E < 1.0:
        regime = "intermediate"
    else:
        regime = "strong"
    
    return {"regime": regime, "U_s_over_E": U_s_over_E, "salpeter_valid": salpeter_valid}


def calculate_gamow_integral_screened(z1: int, z2: int, reduced_mass_kg: float, energy_j: float, screening_potential_j: float, r_nuclear: float = 5e-15, n_points: int = 500) -> float:
    k_coulomb = z1 * z2 * E_CHARGE**2 / (4 * np.pi * EPSILON_0)
    
    if screening_potential_j <= 0:
        r_tp = k_coulomb / energy_j
    else:
        lambda_screen = k_coulomb / screening_potential_j
        r_guess = k_coulomb / energy_j
        r_vals = np.linspace(r_nuclear, max(r_guess * 2, 1e-10), n_points * 2)
        r_tp = r_nuclear
        for r in r_vals:
            V_r = (k_coulomb / r) * np.exp(-r / lambda_screen)
            if V_r <= energy_j:
                r_tp = r
                break
        else:
            r_tp = r_vals[-1]
    
    r_grid = np.linspace(r_nuclear, r_tp, n_points)
    
    if screening_potential_j <= 0:
        V_grid = k_coulomb / r_grid
    else:
        lambda_screen = k_coulomb / screening_potential_j
        V_grid = (k_coulomb / r_grid) * np.exp(-r_grid / lambda_screen)
    
    integrand = np.sqrt(2 * reduced_mass_kg * np.maximum(V_grid - energy_j, 0)) / HBAR
    G = np.trapz(integrand, r_grid)
    
    return G


def calculate_enhancement_factor(
    z1: int,
    z2: int,
    screening_potential: float,
    energy: float,
    reduced_mass_amu: float = None
) -> float:
    """
    Calculate the fusion rate enhancement factor due to electron screening.
    
    Uses the Assenbaum formula (1987):
        f_screen = exp(π η Ue / E)
    where η is the Sommerfeld parameter.
    
    Args:
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        screening_potential: Screening potential in eV
        energy: Center-of-mass energy in keV
        reduced_mass_amu: Reduced mass in amu (default: 1 for D-D)
        
    Returns:
        Enhancement factor (dimensionless)
        
    Physics:
        The enhancement factor represents how much the fusion cross-section
        is increased due to electron screening. For low energies typical of
        LENR, this can be many orders of magnitude.
        
        Reference: Assenbaum et al., Z. Phys. A 327, 461 (1987)
    """
    # Default to D-D reduced mass
    if reduced_mass_amu is None:
        reduced_mass_amu = 2.0 * 2.0 / (2.0 + 2.0)  # D-D: μ = 1 amu
    
    # Convert energy to eV
    energy_ev = energy * 1000.0
    
    # Safety check
    if energy_ev <= 0:
        return 1.0
    
    # Calculate the Sommerfeld parameter
    # η = Z₁Z₂ α √(μc² / 2E)
    # where μc² = 931.494 MeV/amu
    mu_c2_eV = reduced_mass_amu * 931.494e6  # Convert amu to eV/c²
    
    eta = z1 * z2 * ALPHA * np.sqrt(mu_c2_eV / (2.0 * energy_ev))
    
    # Calculate the enhancement factor using Assenbaum formula
    # f = exp(π η Ue / E)
    exponent = np.pi * eta * screening_potential / energy_ev
    
    # Clip exponent to prevent overflow (exp(700) ≈ 1e304)
    exponent = np.clip(exponent, -700, 700)
    enhancement = np.exp(exponent)
    
    # Apply theory-level upper bound from constants.py (single source of truth)
    from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
    enhancement = min(enhancement, MAX_ENHANCEMENT_FACTOR)
    
    logger.debug(f"Screening enhancement: {enhancement:.2e} (η={eta:.2f}, Ue={screening_potential:.1f}eV, E={energy:.3f}keV)")
    
    return enhancement


def get_material_screening(material: str, temperature: float = 300.0) -> Dict[str, float]:
    """
    Get screening parameters for a specific material.
    
    Args:
        material: Material name (palladium, nickel, titanium, platinum)
        temperature: Temperature in K
        
    Returns:
        Dictionary with screening parameters
    """
    material_lower = material.lower()
    
    if material_lower in EXPERIMENTAL_SCREENING:
        data = EXPERIMENTAL_SCREENING[material_lower]
        Ue_exp = calculate_screening_potential(
            data['electron_density'], 
            10.0,  # Typical work function
            temperature, 
            model="experimental",
            material=material
        )
        Ue_tf = calculate_screening_potential(
            data['electron_density'],
            10.0,
            temperature,
            model="thomas_fermi"
        )
        
        return {
            'material': material,
            'experimental_Ue_eV': Ue_exp,
            'theoretical_Ue_eV': Ue_tf,
            'electron_density_m3': data['electron_density'],
            'Ue_range_eV': data['Ue_range'],
            'temperature_K': temperature
        }
    else:
        # Default parameters for unknown materials
        return {
            'material': material,
            'experimental_Ue_eV': 100.0,
            'theoretical_Ue_eV': 100.0,
            'electron_density_m3': 1e29,
            'Ue_range_eV': (50, 200),
            'temperature_K': temperature
        }


def optimize_screening_conditions(
    material_work_function: float,
    temperature_range: Tuple[float, float],
    electron_density: float = 1e29,
    model: str = "thomas_fermi"
) -> Tuple[float, float]:
    """
    Find optimal conditions for maximizing electron screening.
    
    Args:
        material_work_function: Material work function in eV
        temperature_range: (min_temp, max_temp) in K
        electron_density: Electron density in m^-3
        model: Screening model to use
        
    Returns:
        Tuple of (optimal_temperature, max_screening_potential)
        
    Note:
        For most metals, lower temperatures give higher screening potentials
        due to the 1/√T dependence in the Debye-Hückel limit.
    """
    temperatures = np.linspace(temperature_range[0], temperature_range[1], 100)
    potentials = []
    
    for temp in temperatures:
        potential = calculate_screening_potential(
            electron_density, 
            material_work_function, 
            temp,
            model=model
        )
        potentials.append(potential)
    
    potentials = np.array(potentials)
    optimal_idx = np.argmax(potentials)
    optimal_temperature = temperatures[optimal_idx]
    max_screening_potential = potentials[optimal_idx]
    
    logger.info(f"Optimal screening: T={optimal_temperature:.0f}K, Ue={max_screening_potential:.1f}eV ({model} model)")
    
    return optimal_temperature, max_screening_potential


C_LIGHT = 2.99792458e8  # m/s
AMU_TO_EV_C2 = 931.494e6  # eV/c^2 per atomic mass unit

# Fitted heterogeneous-screening parameters from Karahadian et al. (2026),
# Nat. Commun., doi:10.1038/s41467-026-74421-1. Ue values in keV (center-of-mass).
# "bulk" = high-energy / deep-implantation asymptote (measured directly from
# the Ecm = 2.5-6.5 keV data with a single constant-Ue ALR fit); "surface" =
# fitted low-energy asymptote required to reproduce the observed sub-2 keV
# fusion-yield plateau. Loaded conditions add electrochemical D-loading
# (PdD / TiD) on top of the beam-only (Pd / Ti) baseline.
KARAHADIAN_2026_HETEROGENEOUS_SCREENING_KEV = {
    "palladium": {"Ue_bulk": 0.8, "Ue_surface": 3.0},
    "palladium_loaded": {"Ue_bulk": 1.7, "Ue_surface": 3.0},
    "titanium": {"Ue_bulk": 0.3, "Ue_surface": 2.2},
    "titanium_loaded": {"Ue_bulk": 0.9, "Ue_surface": 2.2},
}
KARAHADIAN_2026_CROSSOVER_ENERGY_KEV = 0.6
KARAHADIAN_2026_SMOOTHING_WIDTH_KEV = 0.5


def calculate_gamow_energy_eV(z1: int, z2: int, reduced_mass_amu: float) -> float:
    """
    Gamow energy for a reacting pair: E_G = 2 * mu*c^2 * (pi * alpha * Z1 * Z2)^2.

    Reference: standard Gamow tunneling theory (e.g. Rolfs & Rodney,
    "Cauldrons in the Cosmos"); used directly in Karahadian et al. (2026),
    Nat. Commun., Eq. (8).
    """
    mu_c2_eV = reduced_mass_amu * AMU_TO_EV_C2
    return 2.0 * mu_c2_eV * (np.pi * ALPHA * z1 * z2) ** 2


def calculate_alr_enhancement(
    energy_cm_eV: float,
    screening_potential_eV: float,
    z1: int = 1,
    z2: int = 1,
    reduced_mass_amu: float = 1.0,
) -> float:
    """
    Homogeneous Assenbaum-Langanke-Rolfs (ALR) screening enhancement factor,
    using the exact closed-form Gamow-integral result for a constant
    effective screening potential:

        E_scr(E; Ue) = sqrt(E / (E + Ue)) * exp[sqrt(E_G/E) - sqrt(E_G/(E+Ue))]

    This is a more literal implementation of the ALR model (Assenbaum,
    Langanke & Rolfs, Z. Phys. A 327, 461 (1987)) than the eta-based
    exponential approximation in ``calculate_enhancement_factor``; it is the
    exact form used by Karahadian et al. (2026), Nat. Commun., Eq. (12), and
    is the single-environment baseline for
    ``calculate_heterogeneous_screening_enhancement`` below. It is provided
    as an ADDITIONAL, opt-in function and does not replace
    ``calculate_enhancement_factor`` as the module's default estimator.

    Args:
        energy_cm_eV: Center-of-mass reaction energy, eV (must be > 0).
        screening_potential_eV: Effective screening potential Ue, eV (>= 0).
        z1, z2: Atomic numbers of the reacting nuclei (default D-D: 1, 1).
        reduced_mass_amu: Reduced mass of the reacting pair, amu (default
            1.0 for D-D, since mu = 2*2/(2+2) = 1).

    Returns:
        Enhancement factor E(E) = Y_scr(E)/Y_bare(E), dimensionless, >= 1.

    Note:
        Unlike ``calculate_enhancement_factor``, this function does NOT
        apply ``MAX_ENHANCEMENT_FACTOR``. Karahadian et al. (2026) report
        directly measured enhancement factors exceeding 1e18 at sub-keV
        energies in Pd/Ti hydrides; a 1e5 cap would make this function
        unable to reproduce that cited experimental result. Callers that
        need the software's conservative default bound should continue to
        use ``calculate_enhancement_factor``.
    """
    if energy_cm_eV <= 0:
        raise ValueError(f"energy_cm_eV must be positive, got {energy_cm_eV}")
    if screening_potential_eV < 0:
        raise ValueError(
            f"screening_potential_eV must be non-negative, got {screening_potential_eV}"
        )

    E_G = calculate_gamow_energy_eV(z1, z2, reduced_mass_amu)
    E = energy_cm_eV
    Ue = screening_potential_eV

    prefactor = np.sqrt(E / (E + Ue))
    exponent = np.sqrt(E_G / E) - np.sqrt(E_G / (E + Ue))
    exponent = np.clip(exponent, -700, 700)  # avoid overflow in exp()

    return float(prefactor * np.exp(exponent))


def calculate_heterogeneous_screening_enhancement(
    energy_cm_keV: float,
    Ue_bulk_keV: float,
    Ue_surface_keV: float,
    crossover_energy_keV: float = KARAHADIAN_2026_CROSSOVER_ENERGY_KEV,
    smoothing_width_keV: float = KARAHADIAN_2026_SMOOTHING_WIDTH_KEV,
    z1: int = 1,
    z2: int = 1,
    reduced_mass_amu: float = 1.0,
) -> Dict[str, float]:
    """
    Bi-exponential heterogeneous screening model (Karahadian et al. 2026).

    Reproduces the sub-keV D-D fusion-yield plateau observed in Pd and Ti
    hydrides that a single, constant screening potential cannot explain.
    Instead of one Ue, the reaction environment is treated as a smooth,
    sigmoid-weighted crossover between a "bulk" (high-energy / deep-
    implantation) screening potential and a stronger "surface" (low-energy /
    near-surface, defect-rich) screening potential:

        Ue_eff(E) = Ue_b + (Ue_s - Ue_b) / (1 + exp[(E - E0) / Delta])
        E_env(E)  = E_scr(E; Ue_eff(E))   [ALR form; see calculate_alr_enhancement]

    As E -> high energy (deep implantation), Ue_eff -> Ue_bulk. As E -> low
    energy (shallow, defect-rich implantation), Ue_eff -> Ue_surface. (Note:
    this sign matches the paper's own stated physical limits; the as-
    published Nat. Commun. Eq. 16 exponent sign was transcribed from an
    explicitly-flagged "unedited version" manuscript and, taken literally,
    gives the opposite, physically-inconsistent limits. See docs Section
    5A.3.1 for the same correction applied to the theory paper.)

    This is an OPTIONAL, opt-in alternative screening model. It does not
    replace the module's default single-Ue screening calculation used
    elsewhere in the pipeline (``calculate_enhancement_factor`` /
    ``ElectronScreeningTheory``); it exists so the measured sub-keV plateau
    behavior can be explored explicitly where relevant (e.g. Pd/Ti hydride
    D-D scenarios).

    Args:
        energy_cm_keV: Center-of-mass reaction energy, keV (must be > 0).
        Ue_bulk_keV: Bulk (high-energy asymptote) screening potential, keV.
            Measured values (Karahadian et al. 2026, see
            ``KARAHADIAN_2026_HETEROGENEOUS_SCREENING_KEV``): Pd 0.8+/-0.2
            (beam-only) or 1.7+/-0.2 (electrochemically D-loaded, PdD);
            Ti 0.3+/-0.2 (beam-only) or 0.9+/-0.2 (electrochemically
            D-loaded, TiD).
        Ue_surface_keV: Surface (low-energy asymptote) screening potential,
            keV. Fitted values: ~3.0 (Pd), ~2.2 (Ti) at E_cm = 0.25 keV.
        crossover_energy_keV: E0, energy at which surface and bulk
            environments contribute equally (fitted to 0.6 keV for both
            Pd and Ti in the source paper).
        smoothing_width_keV: Delta, sigmoid transition width (fixed to
            0.5 keV in the source paper).
        z1, z2: Atomic numbers of the reacting nuclei (default D-D: 1, 1).
        reduced_mass_amu: Reduced mass of the reacting pair, amu.

    Returns:
        Dict with:
            - "enhancement_factor": E_env(E), dimensionless (uncapped; see
              note in ``calculate_alr_enhancement`` re: MAX_ENHANCEMENT_FACTOR).
            - "effective_screening_potential_keV": Ue_eff(E) at this energy.
            - "regime": "surface_dominated" | "crossover" | "bulk_dominated"
              (heuristic label for UI/reporting readability only).

    Reference:
        Karahadian, M.E. et al. (2026), "Enhanced nuclear fusion in the
        sub-keV energy regime," Nature Communications. Eqs. (12), (16).
        doi:10.1038/s41467-026-74421-1
    """
    if energy_cm_keV <= 0:
        raise ValueError(f"energy_cm_keV must be positive, got {energy_cm_keV}")
    if smoothing_width_keV <= 0:
        raise ValueError(
            f"smoothing_width_keV must be positive, got {smoothing_width_keV}"
        )

    sigmoid = 1.0 / (
        1.0 + np.exp((energy_cm_keV - crossover_energy_keV) / smoothing_width_keV)
    )
    Ue_eff_keV = Ue_bulk_keV + (Ue_surface_keV - Ue_bulk_keV) * sigmoid

    enhancement = calculate_alr_enhancement(
        energy_cm_eV=energy_cm_keV * 1000.0,
        screening_potential_eV=Ue_eff_keV * 1000.0,
        z1=z1,
        z2=z2,
        reduced_mass_amu=reduced_mass_amu,
    )

    span = Ue_surface_keV - Ue_bulk_keV
    if abs(span) < 1e-9:
        regime = "bulk_dominated"
    else:
        frac = (Ue_eff_keV - Ue_bulk_keV) / span
        if frac < 0.1:
            regime = "bulk_dominated"
        elif frac > 0.9:
            regime = "surface_dominated"
        else:
            regime = "crossover"

    return {
        "enhancement_factor": enhancement,
        "effective_screening_potential_keV": float(Ue_eff_keV),
        "regime": regime,
    }


def calculate_adiabatic_limit(z1: int, z2: int) -> float:
    """
    Calculate the adiabatic limit for electron screening.
    
    This is the minimum possible screening potential based on static
    electron cloud polarization.
    
    Args:
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        
    Returns:
        Adiabatic screening limit in eV
        
    Physics:
        Ue_adiabatic ≈ 13.6 eV * (Z1^0.687 + Z2^0.687)
        This is the absolute minimum screening from static electron clouds.
        Dynamic effects in condensed matter typically increase this by 10-30x.
        For D-D (Z1=Z2=1), this yields ~25-27 eV as expected.
    """
    # Adiabatic limit formula (Salpeter, 1954) - Rydberg-based coefficient
    Ue_adiabatic = 13.6 * (z1**0.687 + z2**0.687)
    return Ue_adiabatic