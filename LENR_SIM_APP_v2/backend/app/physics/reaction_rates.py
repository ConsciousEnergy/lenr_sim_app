"""
Fusion reaction rate calculations with optimized implementations.

Enhanced with statistical mechanics treatment from Section 5.1.1 of the
Unified LENR Theoretical Framework paper.

Key additions:
- Thermal averaging of cross-sections over Maxwell-Boltzmann distribution
- Enhancement factor decomposition (screening, coherence, field, phonon)
- Error propagation and uncertainty quantification
- Statistical significance criteria (5σ standard)
- Monte Carlo validation for parameter space exploration
"""

import numpy as np
import scipy.constants as const
from scipy.integrate import quad
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field
import logging

from app.physics.models import FusionEnhancementFactors
from app.physics.optimizations import (
    optimized_reaction_rate,
    vectorized_cross_section,
    optimized_maxwell_boltzmann
)
from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("reaction_rates", "logs/physics.log")

# Physical constants
HBAR = const.hbar
KB = const.k
EV_TO_J = const.e
AMU = const.u


@dataclass
class EnhancementFactors:
    """Decomposed enhancement factors for reaction rate."""
    screening: float = 1.0
    coherence: float = 1.0
    field: float = 1.0
    phonon: float = 1.0
    
    @property
    def total(self) -> float:
        """Total enhancement factor."""
        return self.screening * self.coherence * self.field * self.phonon


@dataclass
class UncertaintyBudget:
    """Uncertainty contributions to reaction rate."""
    density_uncertainty: float
    cross_section_uncertainty: float
    enhancement_uncertainty: float
    temperature_uncertainty: float
    total_relative_uncertainty: float


@dataclass
class StatisticalReactionRateResult:
    """Results from statistical reaction rate calculation."""
    rate_per_m3_s: float
    rate_uncertainty: float
    thermal_averaged_sigma_v: float
    enhancement_factors: EnhancementFactors
    uncertainty_budget: UncertaintyBudget
    gamow_energy_keV: float
    gamow_peak_keV: float
    statistical_significance: float
    monte_carlo_results: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


def calculate_gamow_energy(
    z1: int,
    z2: int,
    reduced_mass_amu: float
) -> float:
    """
    Calculate Gamow energy for nuclear reaction.
    
    E_G = 2μ(Z₁Z₂e²/ℏ)² = (πα)²·2μc²·(Z₁Z₂)²
    
    Args:
        z1: Atomic number of first nucleus
        z2: Atomic number of second nucleus
        reduced_mass_amu: Reduced mass in atomic mass units
        
    Returns:
        Gamow energy in keV
    """
    alpha = const.alpha  # Fine structure constant
    reduced_mass = reduced_mass_amu * AMU
    
    # E_G = 2μ(Z₁Z₂e²/4πε₀ℏ)²
    e2_over_4pi_eps0 = const.e**2 / (4 * np.pi * const.epsilon_0)
    E_G_J = 2 * reduced_mass * (z1 * z2 * e2_over_4pi_eps0 / HBAR)**2
    
    # Convert to keV
    E_G_keV = E_G_J / EV_TO_J / 1000
    
    return E_G_keV


def tunneling_cross_section(
    energy_keV: float,
    gamow_energy_keV: float,
    s_factor_keV_barn: float = 50.0
) -> float:
    """
    Calculate tunneling-dominated cross-section.
    
    σ(E) = S(E)/E · exp(-√(E_G/E))
    
    Args:
        energy_keV: Center-of-mass energy in keV
        gamow_energy_keV: Gamow energy in keV
        s_factor_keV_barn: Astrophysical S-factor in keV·barn
        
    Returns:
        Cross-section in barns (1 barn = 1e-28 m²)
    """
    if energy_keV <= 0:
        return 0.0
    
    # Gamow factor
    gamow_factor = np.exp(-np.sqrt(gamow_energy_keV / energy_keV))
    
    # Cross-section
    sigma = (s_factor_keV_barn / energy_keV) * gamow_factor
    
    return sigma


def thermal_average_cross_section(
    temperature_keV: float,
    z1: int,
    z2: int,
    reduced_mass_amu: float,
    s_factor_keV_barn: float = 50.0,
    n_points: int = 100
) -> Tuple[float, float]:
    """
    Calculate thermally-averaged cross-section velocity product.
    
    <σv> = √(8/πμ(k_B T)³) ∫₀^∞ σ(E)·E·exp(-E/k_B T) dE
    
    Args:
        temperature_keV: Temperature in keV
        z1, z2: Atomic numbers
        reduced_mass_amu: Reduced mass in AMU
        s_factor_keV_barn: S-factor in keV·barn
        n_points: Number of integration points
        
    Returns:
        Tuple of (<σv> in cm³/s, Gamow peak energy in keV)
    """
    # Gamow energy
    E_G = calculate_gamow_energy(z1, z2, reduced_mass_amu)
    
    # Gamow peak energy (most probable energy for reaction)
    E_peak = (E_G * temperature_keV**2 / 4)**(1/3)
    
    # Reduced mass in kg
    mu = reduced_mass_amu * AMU
    
    # Temperature in J
    kT_J = temperature_keV * 1000 * EV_TO_J
    
    # Prefactor: √(8/πμ(k_B T)³)
    prefactor = np.sqrt(8 / (np.pi * mu * kT_J**3))
    
    # Integration
    def integrand(E_keV):
        if E_keV <= 0:
            return 0.0
        E_J = E_keV * 1000 * EV_TO_J
        sigma_barn = tunneling_cross_section(E_keV, E_G, s_factor_keV_barn)
        sigma_m2 = sigma_barn * 1e-28
        return sigma_m2 * E_J * np.exp(-E_J / kT_J)
    
    # Integrate from 0 to several times the Gamow peak
    E_max = max(10 * E_peak, 10 * temperature_keV)
    result, error = quad(integrand, 0, E_max, limit=100)
    
    sigma_v_m3_s = prefactor * result
    
    # Convert to cm³/s
    sigma_v_cm3_s = sigma_v_m3_s * 1e6
    
    return sigma_v_cm3_s, E_peak


def calculate_enhancement_factors(
    screening_potential_eV: float = 0.0,
    coherence_factor: float = 1.0,
    field_strength_V_m: float = 0.0,
    phonon_coupling: float = 0.0,
    temperature_keV: float = 0.1
) -> EnhancementFactors:
    """
    Calculate decomposed enhancement factors.
    
    f_enhancement = f_screening × f_coherence × f_field × f_phonon
    
    Args:
        screening_potential_eV: Electron screening potential in eV
        coherence_factor: Quantum coherence enhancement
        field_strength_V_m: Electric field strength in V/m
        phonon_coupling: Phonon coupling strength
        temperature_keV: Temperature in keV
        
    Returns:
        EnhancementFactors object
    """
    # Screening enhancement
    # f_screening ≈ exp(U_screening / kT)
    kT_eV = temperature_keV * 1000
    if kT_eV > 0:
        f_screening = np.exp(min(50, screening_potential_eV / kT_eV))
    else:
        f_screening = 1.0
    
    # Coherence enhancement (already provided)
    f_coherence = max(1.0, coherence_factor)
    
    # Field enhancement
    # Scales with field strength above threshold
    E_threshold = 1e8  # V/m
    if field_strength_V_m > E_threshold:
        f_field = 1.0 + np.log10(field_strength_V_m / E_threshold)
    else:
        f_field = 1.0
    
    # Phonon enhancement
    # Based on phonon coupling strength
    f_phonon = 1.0 + phonon_coupling
    
    return EnhancementFactors(
        screening=f_screening,
        coherence=f_coherence,
        field=f_field,
        phonon=f_phonon
    )


def error_propagation(
    density1_uncertainty: float,
    density2_uncertainty: float,
    sigma_v_uncertainty: float,
    enhancement_uncertainty: float
) -> UncertaintyBudget:
    """
    Calculate uncertainty propagation for reaction rate.
    
    δR/R = √[(δn₁/n₁)² + (δn₂/n₂)² + (δ<σv>/<σv>)² + (δf/f)²]
    
    Args:
        density1_uncertainty: Relative uncertainty in n₁
        density2_uncertainty: Relative uncertainty in n₂
        sigma_v_uncertainty: Relative uncertainty in <σv>
        enhancement_uncertainty: Relative uncertainty in enhancement
        
    Returns:
        UncertaintyBudget object
    """
    # Combined density uncertainty
    density_unc = np.sqrt(density1_uncertainty**2 + density2_uncertainty**2)
    
    # Total relative uncertainty
    total = np.sqrt(
        density_unc**2 +
        sigma_v_uncertainty**2 +
        enhancement_uncertainty**2
    )
    
    return UncertaintyBudget(
        density_uncertainty=density_unc,
        cross_section_uncertainty=sigma_v_uncertainty,
        enhancement_uncertainty=enhancement_uncertainty,
        temperature_uncertainty=0.0,  # Can be added
        total_relative_uncertainty=total
    )


def statistical_significance(
    observed: float,
    background: float,
    background_uncertainty: float
) -> float:
    """
    Calculate statistical significance using Poisson statistics.
    
    S = (n_observed - n_background) / √(n_background)
    
    For continuous measurements:
    S = excess / σ_total
    
    Args:
        observed: Observed signal
        background: Expected background
        background_uncertainty: Uncertainty in background
        
    Returns:
        Statistical significance in σ
    """
    if background_uncertainty <= 0:
        if background > 0:
            return (observed - background) / np.sqrt(background)
        return 0.0
    
    excess = observed - background
    sigma_total = np.sqrt(background + background_uncertainty**2)
    
    if sigma_total > 0:
        return excess / sigma_total
    return 0.0


def monte_carlo_validation(
    base_params: Dict[str, Any],
    param_uncertainties: Dict[str, float],
    n_samples: int = 1000,
    z1: int = 1,
    z2: int = 1,
    reduced_mass_amu: float = 1.0
) -> Dict[str, Any]:
    """
    Perform Monte Carlo validation of reaction rate.
    
    Args:
        base_params: Base parameters (temperature_keV, density_m3, etc.)
        param_uncertainties: Relative uncertainties for each parameter
        n_samples: Number of Monte Carlo samples
        z1, z2: Atomic numbers
        reduced_mass_amu: Reduced mass
        
    Returns:
        Dictionary with Monte Carlo results
    """
    rates = []
    
    for _ in range(n_samples):
        # Sample parameters
        T = base_params.get('temperature_keV', 0.1)
        T_sample = T * (1 + np.random.normal(0, param_uncertainties.get('temperature', 0.1)))
        T_sample = max(0.001, T_sample)
        
        n = base_params.get('density_m3', 1e28)
        n_sample = n * (1 + np.random.normal(0, param_uncertainties.get('density', 0.1)))
        n_sample = max(0, n_sample)
        
        # Calculate rate
        sigma_v, _ = thermal_average_cross_section(
            T_sample, z1, z2, reduced_mass_amu
        )
        
        # Rate R = n₁n₂<σv>
        rate = n_sample**2 * sigma_v * 1e-6  # Convert to m³/s
        rates.append(rate)
    
    rates = np.array(rates)
    
    return {
        "mean": np.mean(rates),
        "std": np.std(rates),
        "median": np.median(rates),
        "percentile_5": np.percentile(rates, 5),
        "percentile_95": np.percentile(rates, 95),
        "n_samples": n_samples
    }


def statistical_reaction_rate(
    temperature_keV: float,
    density_m3: float,
    z1: int = 1,
    z2: int = 1,
    reduced_mass_amu: float = 1.0,
    s_factor_keV_barn: float = 50.0,
    screening_potential_eV: float = 0.0,
    coherence_factor: float = 1.0,
    field_strength_V_m: float = 0.0,
    phonon_coupling: float = 0.0,
    density_uncertainty: float = 0.1,
    run_monte_carlo: bool = False,
    n_mc_samples: int = 1000
) -> StatisticalReactionRateResult:
    """
    Calculate reaction rate with full statistical mechanics treatment.
    
    R = n₁n₂<σv>_thermal × f_enhancement × P_threshold
    
    Args:
        temperature_keV: Temperature in keV
        density_m3: Number density in m⁻³
        z1, z2: Atomic numbers of reacting nuclei
        reduced_mass_amu: Reduced mass in AMU
        s_factor_keV_barn: Astrophysical S-factor
        screening_potential_eV: Screening potential in eV
        coherence_factor: Coherence enhancement factor
        field_strength_V_m: Electric field strength
        phonon_coupling: Phonon coupling strength
        density_uncertainty: Relative uncertainty in density
        run_monte_carlo: Whether to run Monte Carlo validation
        n_mc_samples: Number of MC samples
        
    Returns:
        StatisticalReactionRateResult with full analysis
    """
    # Calculate Gamow energy
    E_G = calculate_gamow_energy(z1, z2, reduced_mass_amu)
    
    # Thermal averaged cross-section
    sigma_v, E_peak = thermal_average_cross_section(
        temperature_keV, z1, z2, reduced_mass_amu, s_factor_keV_barn
    )
    
    # Enhancement factors
    enhancements = calculate_enhancement_factors(
        screening_potential_eV=screening_potential_eV,
        coherence_factor=coherence_factor,
        field_strength_V_m=field_strength_V_m,
        phonon_coupling=phonon_coupling,
        temperature_keV=temperature_keV
    )
    
    # Reaction rate R = n²<σv>f (for identical particles)
    # Convert σv from cm³/s to m³/s
    sigma_v_m3_s = sigma_v * 1e-6
    
    rate = density_m3**2 * sigma_v_m3_s * enhancements.total
    
    # Error propagation
    sigma_v_uncertainty = 0.2  # Typical 20% uncertainty in S-factor
    enhancement_uncertainty = 0.3  # 30% uncertainty in enhancement
    
    uncertainty = error_propagation(
        density_uncertainty,
        density_uncertainty,
        sigma_v_uncertainty,
        enhancement_uncertainty
    )
    
    rate_uncertainty = rate * uncertainty.total_relative_uncertainty
    
    # Statistical significance (assuming background of 0)
    significance = statistical_significance(rate, 0, rate_uncertainty)
    
    # Monte Carlo validation
    mc_results = None
    if run_monte_carlo:
        mc_results = monte_carlo_validation(
            base_params={
                'temperature_keV': temperature_keV,
                'density_m3': density_m3
            },
            param_uncertainties={
                'temperature': 0.1,
                'density': density_uncertainty
            },
            n_samples=n_mc_samples,
            z1=z1,
            z2=z2,
            reduced_mass_amu=reduced_mass_amu
        )
    
    logger.info(f"Statistical rate: R={rate:.2e} ± {rate_uncertainty:.2e} m⁻³s⁻¹, "
                f"enhancement={enhancements.total:.2e}")
    
    return StatisticalReactionRateResult(
        rate_per_m3_s=rate,
        rate_uncertainty=rate_uncertainty,
        thermal_averaged_sigma_v=sigma_v,
        enhancement_factors=enhancements,
        uncertainty_budget=uncertainty,
        gamow_energy_keV=E_G,
        gamow_peak_keV=E_peak,
        statistical_significance=significance,
        monte_carlo_results=mc_results,
        metadata={
            "temperature_keV": temperature_keV,
            "density_m3": density_m3,
            "z1": z1,
            "z2": z2,
            "reduced_mass_amu": reduced_mass_amu,
            "s_factor_keV_barn": s_factor_keV_barn,
            "screening_potential_eV": screening_potential_eV
        }
    )


def calculate_reaction_rate(
    reaction_name: str,
    temperature: float,
    density: float,
    enhancement_factors: Optional[FusionEnhancementFactors] = None,
    include_tunneling: bool = True,
    include_screening: bool = True,
    n_cores: int = 4
) -> Dict[str, Any]:
    """
    Calculate fusion reaction rate with optimized implementation.
    
    Args:
        reaction_name: Name of the fusion reaction
        temperature: Plasma temperature in keV
        density: Number density in cm^-3
        enhancement_factors: Optional enhancement factors
        include_tunneling: Whether to include tunneling effects
        include_screening: Whether to include electron screening
        n_cores: Number of CPU cores to use for parallel processing
        
    Returns:
        Dictionary with calculation results
    """
    try:
        logger.info(f"Calculating reaction rate for {reaction_name} at T={temperature} keV")
        
        result = optimized_reaction_rate(
            reaction_name=reaction_name,
            temperature=temperature,
            density=density,
            enhancement_factors=enhancement_factors,
            include_tunneling=include_tunneling,
            include_screening=include_screening,
            n_cores=n_cores
        )
        
        logger.info(f"Calculation complete. Rate: {result['rate']:.2e} cm^3/s")
        
        return result
        
    except Exception as e:
        logger.error(f"Error in reaction rate calculation: {str(e)}")
        raise 