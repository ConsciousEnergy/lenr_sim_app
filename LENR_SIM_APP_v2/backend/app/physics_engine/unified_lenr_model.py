"""
Unified LENR Model - Comprehensive Physics Implementation

Implements the theoretical framework from:
"A Unified Theoretical and Mathematical Framework for Low-Energy Nuclear Reactions"

This module integrates all major LENR mechanisms:
- Electron Screening and Modified Rydberg Matter
- Double-Layer QED Effects
- Casimir Forces
- Quantum Coherence and Multi-body Tunneling
- Bubble Collapse Dynamics (Rayleigh-Plesset)
- Oppenheimer-Phillips Process
- Halo Electron Effects

Author: Conscious Energies
"""

import numpy as np
import logging
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field
from scipy import constants as const
from scipy.integrate import quad
from enum import Enum

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

logger = logging.getLogger(__name__)


class MaterialSystem(Enum):
    """Supported material systems for LENR"""
    PALLADIUM_DEUTERIUM = "pd_d"
    NICKEL_HYDROGEN = "ni_h"
    TITANIUM_DEUTERIUM = "ti_d"
    CUSTOM = "custom"


@dataclass
class MaterialProperties:
    """Physical properties of host material"""
    name: str
    atomic_number: int
    atomic_mass: float  # amu
    lattice_constant: float  # meters
    debye_temperature: float  # K
    work_function: float  # eV
    electron_density: float  # m^-3
    
    @classmethod
    def palladium(cls) -> 'MaterialProperties':
        return cls(
            name="Palladium",
            atomic_number=46,
            atomic_mass=106.42,
            lattice_constant=3.89e-10,
            debye_temperature=274,
            work_function=5.12,
            electron_density=6.8e28
        )
    
    @classmethod
    def nickel(cls) -> 'MaterialProperties':
        return cls(
            name="Nickel",
            atomic_number=28,
            atomic_mass=58.69,
            lattice_constant=3.52e-10,
            debye_temperature=450,
            work_function=5.15,
            electron_density=9.1e28
        )
    
    @classmethod
    def titanium(cls) -> 'MaterialProperties':
        return cls(
            name="Titanium",
            atomic_number=22,
            atomic_mass=47.87,
            lattice_constant=2.95e-10,
            debye_temperature=420,
            work_function=4.33,
            electron_density=5.7e28
        )


@dataclass
class ReactantProperties:
    """Physical properties of reactant species"""
    name: str
    atomic_number: int
    atomic_mass: float  # amu
    is_isotope: bool = False
    
    @classmethod
    def deuterium(cls) -> 'ReactantProperties':
        return cls(name="Deuterium", atomic_number=1, atomic_mass=2.014, is_isotope=True)
    
    @classmethod
    def hydrogen(cls) -> 'ReactantProperties':
        return cls(name="Hydrogen", atomic_number=1, atomic_mass=1.008, is_isotope=False)
    
    @classmethod
    def proton(cls) -> 'ReactantProperties':
        return cls(name="Proton", atomic_number=1, atomic_mass=1.007, is_isotope=False)


@dataclass
class SimulationConfig:
    """Configuration for unified LENR simulation"""
    # Material system
    host_material: MaterialProperties = field(default_factory=MaterialProperties.palladium)
    reactant: ReactantProperties = field(default_factory=ReactantProperties.deuterium)
    
    # Environmental conditions
    temperature: float = 300.0  # K
    pressure: float = 101325.0  # Pa
    electric_field: float = 1e6  # V/m
    
    # Lattice properties
    loading_ratio: float = 0.9  # H/M ratio
    defect_density: float = 1e16  # m^-3
    grain_size: float = 50e-9  # m
    surface_roughness: float = 5e-9  # m
    
    # Quantum effect toggles (legacy per-mechanism switches)
    enable_screening: bool = True
    enable_qed: bool = True
    enable_casimir: bool = True
    enable_coherence: bool = True
    enable_bubble_dynamics: bool = True
    enable_rydberg: bool = True
    
    # Theory pipeline integration (v0.3.0)
    # When True, enhancement calculations are delegated to the TheoryPipeline
    # which runs pluggable TheoryModule instances.  When False, the legacy
    # hardcoded calculation methods are used.
    use_theory_pipeline: bool = False
    enabled_theories: Optional[List[str]] = None  # None = all theories
    theory_configs: Optional[Dict[str, Dict[str, Any]]] = None
    
    # Simulation parameters
    time_steps: int = 100
    total_time: float = 10.0  # seconds
    random_seed: Optional[int] = None  # Seed for reproducible results


@dataclass
class EnhancementResult:
    """Result of enhancement calculation for a single mechanism"""
    name: str
    value: float
    threshold_met: bool
    equation: str
    parameters: Dict[str, float]
    category: str  # "primary" or "secondary"


@dataclass
class UnifiedSimulationResult:
    """Complete result from unified LENR simulation"""
    # Enhancement factors
    total_enhancement: float
    enhancement_breakdown: List[EnhancementResult]
    
    # Observables
    excess_heat_watts: float
    tunneling_probability: float
    reaction_rate: float  # reactions/s
    helium4_rate: float  # atoms/s
    neutron_rate: float  # neutrons/s
    
    # Threshold status
    thresholds_met: Dict[str, bool]
    
    # Time series data
    time_points: List[float]
    heat_output: List[float]
    enhancement_history: List[float]
    
    # Theory confidence
    confidence: float
    
    # Metadata
    config: SimulationConfig
    computation_time: float


class UnifiedLENRModel:
    """
    Comprehensive LENR physics model implementing unified theoretical framework.
    
    Integrates mechanisms from the paper:
    - Section 2.1: Electron Screening and Rydberg Matter
    - Section 2.2: Halo Electrons
    - Section 2.3: Double-Layer QED
    - Section 2.4: Neutron Formation
    - Section 2.5: Casimir Effect
    - Section 2.6: BEC (partial)
    - Section 2.7: Oppenheimer-Phillips Process
    - Section 2.8: Quantum Tunneling
    """
    
    # Physical constants
    HBAR = const.hbar  # J·s
    E_CHARGE = const.e  # C
    C = const.c  # m/s
    EPS0 = const.epsilon_0  # F/m
    ME = const.m_e  # kg
    MP = const.m_p  # kg
    KB = const.k  # J/K
    ALPHA = const.alpha  # Fine structure constant
    A0 = const.physical_constants['Bohr radius'][0]  # m
    
    def __init__(self, config: Optional[SimulationConfig] = None):
        """Initialize the unified LENR model."""
        self.config = config or SimulationConfig()
        
        # Set random seed for reproducibility if provided
        if self.config.random_seed is not None:
            np.random.seed(self.config.random_seed)
            logger.info(f"Random seed set to {self.config.random_seed} for reproducibility")
        
        # Cache for enhancement calculations (keyed by config hash)
        self._enhancement_cache = {}
        self._cache_key = None
        
        # Populated when use_theory_pipeline=True after run_simulation()
        self._last_pipeline_result = None
        
        logger.info(f"UnifiedLENRModel initialized with {self.config.host_material.name}-{self.config.reactant.name} system")
    
    def _get_cache_key(self) -> str:
        """Generate a cache key from current config values."""
        if self._cache_key is None:
            # Create hashable key from important config values
            key_parts = (
                self.config.host_material.name,
                self.config.reactant.name,
                round(self.config.temperature, 2),
                round(self.config.pressure, 2),
                round(self.config.electric_field, 2),
                round(self.config.loading_ratio, 4),
                round(self.config.defect_density, 2),
                round(self.config.surface_roughness, 12),
                self.config.enable_screening,
                self.config.enable_qed,
                self.config.enable_casimir,
                self.config.enable_coherence,
                self.config.enable_bubble_dynamics,
                self.config.enable_rydberg,
                self.config.use_theory_pipeline,
                tuple(sorted(self.config.enabled_theories)) if self.config.enabled_theories else None,
            )
            self._cache_key = str(hash(key_parts))
        return self._cache_key
    
    @property
    def last_pipeline_result(self):
        """Access the last :class:`TheoryPipelineResult` (only set when
        ``use_theory_pipeline=True`` and ``run_simulation()`` has been called).
        """
        return self._last_pipeline_result

    def run_simulation(self) -> UnifiedSimulationResult:
        """Execute full unified LENR simulation."""
        import time
        start_time = time.time()
        
        # Calculate all enhancement factors
        enhancements = self._calculate_all_enhancements()
        
        # Calculate total enhancement (geometric mean approach)
        total_enhancement = self._combine_enhancements(enhancements)
        
        # Check threshold conditions
        thresholds = self._check_thresholds()
        
        # Calculate observables
        tunneling_prob = self._calculate_tunneling_probability(total_enhancement)
        reaction_rate = self._calculate_reaction_rate(tunneling_prob)
        excess_heat = self._calculate_excess_heat(reaction_rate)
        helium4_rate = self._calculate_helium4_rate(reaction_rate)
        neutron_rate = self._calculate_neutron_rate(reaction_rate)
        
        # Generate time series
        time_points, heat_output, enhancement_history = self._generate_time_series(
            excess_heat, total_enhancement
        )
        
        # Calculate confidence based on thresholds met
        confidence = self._calculate_confidence(thresholds, enhancements)
        
        computation_time = time.time() - start_time
        
        return UnifiedSimulationResult(
            total_enhancement=total_enhancement,
            enhancement_breakdown=enhancements,
            excess_heat_watts=excess_heat,
            tunneling_probability=tunneling_prob,
            reaction_rate=reaction_rate,
            helium4_rate=helium4_rate,
            neutron_rate=neutron_rate,
            thresholds_met=thresholds,
            time_points=time_points,
            heat_output=heat_output,
            enhancement_history=enhancement_history,
            confidence=confidence,
            config=self.config,
            computation_time=computation_time
        )
    
    def _calculate_all_enhancements(self) -> List[EnhancementResult]:
        """Calculate all enhancement mechanisms with caching.
        
        When ``config.use_theory_pipeline`` is True, calculation is delegated
        to the pluggable :class:`TheoryPipeline` orchestrator (v0.3.0).
        Otherwise, the legacy hardcoded methods are used.
        """
        cache_key = self._get_cache_key()
        
        # Check cache first
        if cache_key in self._enhancement_cache:
            logger.debug("Using cached enhancement results")
            return self._enhancement_cache[cache_key]
        
        # ---- v0.3.0: Theory Pipeline delegation path ----
        if self.config.use_theory_pipeline:
            enhancements = self._calculate_enhancements_via_pipeline()
        else:
            enhancements = self._calculate_enhancements_legacy()
        
        # Cache results (limit cache size to prevent memory issues)
        if len(self._enhancement_cache) > 100:
            oldest_key = next(iter(self._enhancement_cache))
            del self._enhancement_cache[oldest_key]
        
        self._enhancement_cache[cache_key] = enhancements
        return enhancements

    # ------------------------------------------------------------------
    # Pipeline-backed enhancement calculation (v0.3.0)
    # ------------------------------------------------------------------
    def _calculate_enhancements_via_pipeline(self) -> List[EnhancementResult]:
        """Delegate enhancement calculation to the TheoryPipeline.
        
        Translates ``SimulationConfig`` into the ``conditions`` dict expected
        by :class:`TheoryPipeline`, runs the enabled theories, and converts
        each :class:`TheoryContribution` back into :class:`EnhancementResult`
        so the rest of ``run_simulation()`` works unchanged.
        """
        from app.physics_engine.theory_pipeline import get_default_pipeline

        pipeline = get_default_pipeline()

        # Build conditions dict from config
        # Derive gap/crack width from surface roughness for theories that need it
        surface_roughness_nm = self.config.surface_roughness * 1e9
        gap_width_nm = max(0.5, surface_roughness_nm)

        conditions: Dict[str, float] = {
            "temperature": self.config.temperature,
            "pressure": self.config.pressure,
            "electric_field": self.config.electric_field,
            "loading_ratio": self.config.loading_ratio,
            "defect_density": self.config.defect_density,
            "grain_size": self.config.grain_size,
            "surface_roughness": self.config.surface_roughness,
            "electron_density": self.config.host_material.electron_density,
            "debye_temperature": self.config.host_material.debye_temperature,
            "lattice_constant": self.config.host_material.lattice_constant,
            "atomic_mass": float(self.config.reactant.atomic_mass),
            "atomic_number": float(self.config.reactant.atomic_number),
            # Theory-specific conditions (Hydroton, NAE, etc.)
            "gap_width_nm": gap_width_nm,
            "crack_width_nm": gap_width_nm,
        }

        pipeline_result = pipeline.run(
            conditions=conditions,
            enabled_theories=self.config.enabled_theories,
            theory_configs=self.config.theory_configs,
        )

        # Store the full pipeline result for external consumers
        self._last_pipeline_result = pipeline_result

        # Map TheoryContribution → EnhancementResult
        enhancements: List[EnhancementResult] = []
        for contrib in pipeline_result.contributions:
            if not contrib.is_applicable:
                continue
            enhancements.append(
                EnhancementResult(
                    name=contrib.theory_name,
                    value=contrib.enhancement_factor,
                    threshold_met=contrib.confidence > 0.5,
                    equation=f"TheoryPipeline/{contrib.theory_id}",
                    parameters=contrib.parameters_used,
                    category="primary" if contrib.confidence > 0.3 else "secondary",
                )
            )

        logger.info(
            "TheoryPipeline returned %d applicable contributions "
            "(combined enhancement=%.2e, energy=%.4g W)",
            len(enhancements),
            pipeline_result.combined_enhancement,
            pipeline_result.total_energy_watts,
        )
        return enhancements

    # ------------------------------------------------------------------
    # Legacy per-toggle enhancement calculation
    # ------------------------------------------------------------------
    def _calculate_enhancements_legacy(self) -> List[EnhancementResult]:
        """Original hardcoded enhancement calculation (pre-v0.3.0)."""
        enhancements = []
        
        # Primary enhancers
        if self.config.enable_screening:
            enhancements.append(self._calculate_electron_screening())
        
        if self.config.enable_qed:
            enhancements.append(self._calculate_qed_enhancement())
        
        if self.config.enable_coherence:
            enhancements.append(self._calculate_coherence_enhancement())
        
        # Secondary contributors
        if self.config.enable_casimir:
            enhancements.append(self._calculate_casimir_enhancement())
        
        if self.config.enable_bubble_dynamics:
            enhancements.append(self._calculate_bubble_enhancement())
        
        if self.config.enable_rydberg:
            enhancements.append(self._calculate_rydberg_enhancement())
        
        return enhancements
    
    def _calculate_electron_screening(self) -> EnhancementResult:
        """
        Calculate electron screening enhancement.
        
        From paper Section 2.1:
        Screening reduces effective Coulomb barrier by 10-100 eV.
        """
        T = self.config.temperature
        n_e = self.config.host_material.electron_density
        
        # Validate inputs
        if T <= 0:
            raise ValueError(f"Temperature must be positive, got {T} K")
        if n_e <= 0:
            raise ValueError(f"Electron density must be positive, got {n_e} m^-3")
        
        # Debye screening length
        lambda_d = np.sqrt(self.EPS0 * self.KB * T / (n_e * self.E_CHARGE**2))
        
        # Check for invalid results
        if not np.isfinite(lambda_d) or lambda_d <= 0:
            raise ValueError(f"Invalid Debye screening length: {lambda_d} m")
        
        # Screening potential (simplified model)
        # U_s ≈ Z₁Z₂e²/(4πε₀λ_D)
        Z1, Z2 = 1, 1  # Both hydrogen isotopes
        U_screen_j = Z1 * Z2 * self.E_CHARGE**2 / (4 * np.pi * self.EPS0 * lambda_d)
        U_screen_ev = U_screen_j / self.E_CHARGE
        
        # Enhancement factor from screening
        # f_screen = exp(πηU_s/E) where η is Sommerfeld parameter
        E_thermal = 1.5 * self.KB * T / self.E_CHARGE  # eV
        eta = Z1 * Z2 * self.ALPHA * np.sqrt(self.MP * self.C**2 / (2 * E_thermal * self.E_CHARGE))
        
        # Validate E_thermal to avoid division by zero
        E_thermal = max(E_thermal, 0.01)
        enhancement = np.exp(np.pi * eta * U_screen_ev / E_thermal)
        
        # Validate and cap enhancement
        if not np.isfinite(enhancement):
            logger.warning(f"Non-finite enhancement calculated, capping to 1e6")
            enhancement = 1e6
        enhancement = min(enhancement, 1e6)  # Cap at reasonable value
        
        # Threshold: screening > 10 eV
        threshold_met = U_screen_ev > 10
        
        return EnhancementResult(
            name="Electron Screening",
            value=enhancement,
            threshold_met=threshold_met,
            equation="f = exp(πηUₛ/E)",
            parameters={"U_screen_eV": U_screen_ev, "lambda_D_nm": lambda_d * 1e9},
            category="primary"
        )
    
    def _calculate_qed_enhancement(self) -> EnhancementResult:
        """
        Calculate double-layer field-assisted barrier suppression enhancement.

        Distinguishes two mechanisms per paper Section 2.3:
        1. Barrier suppression (dominant at E ~ 10^8 V/m): Field lowers effective
           Coulomb barrier via Delta V = e E d, increasing tunneling probability.
        2. Vacuum polarization: Uses Schwinger limit E_cr ~ 1.3e18 V/m; negligible
           at double-layer fields (E/E_cr)^2 ~ 10^-20.

        The implementation models barrier suppression only; vacuum polarization
        is negligible at LENR-relevant field strengths.
        """
        E_field = self.config.electric_field

        # Double-layer contribution: E = Delta V / d
        d_layer = max(self.config.surface_roughness, 1e-10)
        delta_V = 0.1  # V, typical potential drop across layer
        E_double_layer = delta_V / d_layer
        E_total = E_field + E_double_layer

        # Barrier suppression: Delta V = e * E * d_eff (effective barrier lowering)
        # d_eff: screening/barrier width in condensed matter ~ 0.1-1 nm
        d_eff = min(d_layer, 1e-9)  # m
        delta_V_j = self.E_CHARGE * E_total * d_eff
        delta_V_ev = delta_V_j / self.E_CHARGE  # eV

        # Enhancement from barrier lowering: increases effective energy for Gamow factor
        # f = exp(pi * eta * Delta_V / (E_thermal + Delta_V)) for stability
        E_thermal_ev = 1.5 * self.KB * self.config.temperature / self.E_CHARGE
        E_thermal_ev = max(E_thermal_ev, 0.001)

        Z1 = Z2 = self.config.reactant.atomic_number
        m_reduced = self.config.reactant.atomic_mass * const.u / 2
        eta = Z1 * Z2 * self.ALPHA * np.sqrt(
            m_reduced * self.C**2 / (2 * E_thermal_ev * self.E_CHARGE)
        )

        exp_arg = np.pi * eta * delta_V_ev / (E_thermal_ev + delta_V_ev)
        enhancement = np.exp(min(exp_arg, 50.0))  # Cap exponent for numerical stability
        enhancement = min(enhancement, 1e4)

        # Vacuum polarization (for reference; negligible at E << E_cr)
        E_cr = 1.3e18  # V/m, Schwinger critical field
        eps_eff = 1 + (2 * self.ALPHA / (45 * np.pi)) * (E_total / E_cr) ** 2

        threshold_met = E_total > 1e8

        return EnhancementResult(
            name="Double-Layer Barrier Suppression",
            value=enhancement,
            threshold_met=threshold_met,
            equation="f = exp(pi*eta*DeltaV/(E+DeltaV)), DeltaV=eEd",
            parameters={
                "E_field_V_m": E_total,
                "d_nm": d_layer * 1e9,
                "delta_V_eV": delta_V_ev,
                "eps_vacuum_polarization": eps_eff,
            },
            category="primary",
        )
    
    def _calculate_phonon_nuclear_params(self) -> Dict[str, float]:
        """
        Compute phonon-nuclear coupling parameters per paper Section 2.8.1.

        g_ph-nuc = (d V_nuclear / du) * sqrt(hbar / (2 M omega_ph))
        Gamma_transfer = (2 pi / hbar) |g_ph-nuc|^2 rho(omega) n_ph(omega)
        P_multi-phonon propto (g_ph-nuc / (hbar omega_ph))^N, N = delta_E / (hbar omega_ph)
        """
        T = self.config.temperature
        T_debye = self.config.host_material.debye_temperature
        M = self.config.reactant.atomic_mass * const.u  # kg
        omega_ph = 1e13  # rad/s, optical phonon in Pd-D
        dV_du = 5.0  # eV/AA, lattice strain effect on nuclear potential (1-10 range)

        # g_ph-nuc in eV/AA
        g_ph_nuc_ev_aa = dV_du * np.sqrt(
            self.HBAR / (2 * M * omega_ph)
        ) * (1e10 / self.E_CHARGE)  # convert sqrt(J) to eV/AA
        g_ph_nuc_si = g_ph_nuc_ev_aa * self.E_CHARGE / 1e10  # J/m

        hbar_omega_ph_ev = self.HBAR * omega_ph / self.E_CHARGE  # ~0.066 eV
        n_ph = 1.0 / (np.exp(hbar_omega_ph_ev * self.E_CHARGE / (self.KB * T)) - 1)
        n_ph = max(n_ph, 1e-10)

        # Simplified Debye DOS: rho(omega) ~ 3 omega^2 / omega_D^3
        omega_D = self.KB * T_debye / self.HBAR
        rho_omega = 3.0 * omega_ph**2 / (omega_D**3) if omega_D > 0 else 0

        Gamma_transfer = (2 * np.pi / self.HBAR) * (g_ph_nuc_si**2) * rho_omega * n_ph

        # Multi-phonon probability for sub-barrier assist (delta_E ~ 1 eV scale)
        delta_E_ev = 1.0  # eV, typical assist energy
        N_phonons = min(delta_E_ev / hbar_omega_ph_ev, 20.0)
        x_sq = min((g_ph_nuc_ev_aa / hbar_omega_ph_ev) ** 2, 10.0)
        P_multi = min(1.0, (x_sq**min(int(N_phonons), 10)) / 1e6)
        P_multi = max(P_multi, 1e-10)

        return {
            "g_ph_nuc_eV_aa": g_ph_nuc_ev_aa,
            "hbar_omega_ph_eV": hbar_omega_ph_ev,
            "n_ph": n_ph,
            "Gamma_transfer": Gamma_transfer,
            "P_multi_phonon": P_multi,
            "N_phonons_assist": N_phonons,
        }

    def _coherence_length_nm(self) -> float:
        """
        Quantum coherence length xi = hbar * v_F / delta_E (paper Section 2.5.1).

        v_F ~ 10^6 m/s (Pd, Ni); delta_E ~ 0.1-1 eV (LENR energy scale).
        """
        v_F = 1e6  # m/s
        delta_E_ev = 0.5
        delta_E_J = delta_E_ev * self.E_CHARGE
        xi_m = self.HBAR * v_F / delta_E_J
        return xi_m * 1e9

    def _max_coherent_sites_from_xi(self) -> int:
        """
        Max coherent sites such that cluster size <= coherence length xi.

        Cluster dimension ~ lattice_constant * sqrt(N); N_max = (xi / a)^2.
        """
        xi_nm = self._coherence_length_nm()
        a_nm = self.config.host_material.lattice_constant * 1e9
        if a_nm <= 0:
            return 16
        N_max = int((xi_nm / a_nm) ** 2)
        return max(1, min(N_max, 256))

    def _calculate_coherence_enhancement(self) -> EnhancementResult:
        """
        Quantum coherence and multi-body tunneling with phonon-nuclear coupling.

        From paper Section 2.5 (Takahashi TSC) and 2.8.1 (phonon-nuclear coupling):
        - Coherent sites limited by coherence length xi = hbar v_F / delta_E
        - Phonon enhancement from g_ph-nuc, Gamma_transfer, P_multi-phonon
        """
        T = self.config.temperature
        T_debye = self.config.host_material.debye_temperature
        loading = self.config.loading_ratio

        pparams = self._calculate_phonon_nuclear_params()
        g_ph = pparams["g_ph_nuc_eV_aa"]
        hw_ph = pparams["hbar_omega_ph_eV"]
        n_ph = pparams["n_ph"]
        x = g_ph / hw_ph
        phonon_factor = 1.0 + min(x * np.sqrt(n_ph), 5.0)

        coherence_factor = loading * np.exp(-T / T_debye)
        n_sites_raw = max(1, int(4 * coherence_factor))

        n_sites_max = self._max_coherent_sites_from_xi()
        n_sites = min(n_sites_raw, n_sites_max)

        enhancement = np.sqrt(n_sites) * phonon_factor
        enhancement = max(1.0, min(enhancement, 1e3))

        threshold_met = loading > 0.9

        xi_nm = self._coherence_length_nm()
        params = {
            "n_sites": n_sites,
            "n_sites_max_xi": n_sites_max,
            "loading_ratio": loading,
            "xi_coherence_nm": xi_nm,
            "g_ph_nuc_eV_aa": pparams["g_ph_nuc_eV_aa"],
            "Gamma_transfer": pparams["Gamma_transfer"],
        }
        return EnhancementResult(
            name="Quantum Coherence",
            value=enhancement,
            threshold_met=threshold_met,
            equation="f = sqrt(N) * (1 + (g/hw)*sqrt(n_ph)), N <= (xi/a)^2",
            parameters=params,
            category="primary",
        )
    
    def _calculate_casimir_enhancement(self) -> EnhancementResult:
        """
        Calculate Casimir force contribution.
        
        From paper Section 2.5:
        F_Casimir = -π²ℏc/240 × A/d⁴
        """
        d = self.config.surface_roughness  # Characteristic separation
        A = self.config.grain_size**2  # Effective area
        
        # Casimir force
        F_casimir = np.pi**2 * self.HBAR * self.C / 240 * A / max(d, 1e-12)**4
        
        # Casimir pressure
        P_casimir = F_casimir / max(A, 1e-20)
        
        # Enhancement from confinement (energy localization)
        # Scales with pressure relative to atmospheric
        enhancement = 1 + np.log10(max(1, P_casimir / 101325))
        enhancement = max(1, min(enhancement, 100))
        
        # Threshold: separation < 10 nm
        threshold_met = d < 10e-9
        
        return EnhancementResult(
            name="Casimir Effect",
            value=enhancement,
            threshold_met=threshold_met,
            equation="F = -π²ℏc/240 × A/d⁴",
            parameters={"F_casimir_N": F_casimir, "d_nm": d * 1e9},
            category="secondary"
        )
    
    def _calculate_bubble_enhancement(self) -> EnhancementResult:
        """
        Bubble collapse enhancement via modified Rayleigh-Plesset solver.

        Paper Section 3.2:
        R*R̈ + (3/2)*Ṙ² = (1/ρ)(P_bubble - P_∞ - 2σ/R - 4μṘ/R + ε₀E²/2)

        Uses numerical solver for transient T and P; enhancement from
        temperature and pressure at maximum compression.
        """
        from app.physics_engine.bubble_solver import (
            get_bubble_enhancement_from_solver,
        )

        P = self.config.pressure
        T = self.config.temperature
        E_field = self.config.electric_field
        P_ambient = 101325.0  # Pa

        R0 = 10e-6  # m, typical electrolytic bubble
        t_collapse = 1e-6  # s

        try:
            result = get_bubble_enhancement_from_solver(
                R0=R0,
                t_collapse=t_collapse,
                E_field=E_field,
                T0=T,
                P_inf=P,
            )
            T_collapse = result["T_collapse_K"]
            P_collapse = result["P_collapse_Pa"]
            compression_ratio = result["compression_ratio"]
        except Exception:
            compression_ratio = (P / P_ambient) ** (1 / 3) if P > P_ambient else 1.0
            T_collapse = T * compression_ratio**2
            P_collapse = P * compression_ratio**3

        if T_collapse > 1000:
            enhancement = 1 + np.log10(max(1, T_collapse / T))
        else:
            enhancement = 1.0

        enhancement = max(1.0, min(enhancement, 50.0))

        threshold_met = P > 5 * P_ambient

        return EnhancementResult(
            name="Bubble Collapse",
            value=enhancement,
            threshold_met=threshold_met,
            equation="R R̈ + 3/2 Ṙ² = (P_b - P_∞)/ρ - 2σ/R - 4μṘ/R + ε₀E²/2",
            parameters={
                "T_collapse_K": T_collapse,
                "P_collapse_Pa": P_collapse,
                "compression": compression_ratio,
            },
            category="secondary",
        )
    
    def _calculate_rydberg_enhancement(self) -> EnhancementResult:
        """
        Calculate Rydberg Matter enhancement.
        
        From paper Section 2.1:
        Extended orbitals at high n states facilitate tunneling.
        E_n = -13.6 eV / n²
        """
        T = self.config.temperature
        
        # Estimate principal quantum number from temperature
        # Higher T can excite to higher n states
        E_thermal_ev = self.KB * T / self.E_CHARGE
        
        # Approximate n from energy
        # E_n = -13.6/n² → n ≈ √(13.6/|E|)
        if E_thermal_ev > 0.001:
            n_estimate = min(10, max(1, int(np.sqrt(13.6 / E_thermal_ev))))
        else:
            n_estimate = 1
        
        # Orbital extension factor
        # r_n ∝ n² × a₀
        orbital_extension = n_estimate**2
        
        # Enhancement from extended overlap
        enhancement = 1 + 0.1 * np.log(orbital_extension)
        enhancement = max(1, min(enhancement, 10))
        
        # Threshold: n > 2
        threshold_met = n_estimate > 2
        
        return EnhancementResult(
            name="Rydberg Matter",
            value=enhancement,
            threshold_met=threshold_met,
            equation="E_n = -13.6 eV / n²",
            parameters={"n_principal": n_estimate, "r_extension": orbital_extension},
            category="secondary"
        )
    
    def _combine_enhancements(self, enhancements: List[EnhancementResult]) -> float:
        """Combine enhancement factors using geometric mean approach."""
        if not enhancements:
            return 1.0
        
        # Separate primary and secondary
        primary = [e for e in enhancements if e.category == "primary"]
        secondary = [e for e in enhancements if e.category == "secondary"]
        
        # Primary factors multiply directly
        primary_product = np.prod([e.value for e in primary]) if primary else 1.0
        
        # Secondary factors contribute less (geometric mean)
        if secondary:
            secondary_values = [e.value for e in secondary]
            secondary_contribution = np.exp(np.mean(np.log(secondary_values)))
        else:
            secondary_contribution = 1.0
        
        total = primary_product * secondary_contribution
        
        # Cap at conservative maximum from Part 2 analysis (10^3-10^5, 90% CI)
        return min(total, MAX_ENHANCEMENT_FACTOR)
    
    def _check_thresholds(self) -> Dict[str, bool]:
        """Check all threshold conditions from the paper."""
        return {
            "loading_ratio_0.9": self.config.loading_ratio > 0.9,
            "surface_roughness_10nm": self.config.surface_roughness < 10e-9,
            "defect_density_1e16": self.config.defect_density > 1e16,
            "electric_field_1e8": self.config.electric_field > 1e8,
            "temperature_optimal": 200 < self.config.temperature < 1000
        }
    
    def _calculate_tunneling_probability(self, enhancement: float) -> float:
        """
        Calculate enhanced tunneling probability.
        
        From paper Section 2.8:
        P_tunnel = exp(-2S/ℏ) where S is WKB action integral.
        """
        T = self.config.temperature
        m_reduced = self.config.reactant.atomic_mass * const.u / 2  # Reduced mass
        
        # Thermal energy
        E = 1.5 * self.KB * T
        
        # Coulomb barrier parameters
        Z1 = Z2 = self.config.reactant.atomic_number
        r_nuclear = 1.2e-15 * (self.config.reactant.atomic_mass**(1/3) * 2)
        
        # Gamow factor (base tunneling)
        eta = Z1 * Z2 * self.ALPHA * np.sqrt(m_reduced * self.C**2 / (2 * E))
        P_gamow = np.exp(-2 * np.pi * eta)
        
        # Apply enhancement
        P_enhanced = P_gamow * enhancement
        
        return min(P_enhanced, 1.0)
    
    def _sigma_from_s_factor(
        self, E_keV: float, Z1: int, Z2: int, mu_kg: float, S_keV_b: float
    ) -> float:
        """
        Cross-section from astrophysical S-factor: sigma(E) = (S(E)/E) * exp(-sqrt(E_G/E)).

        E_G = 2*mu*(Z1*Z2*e^2/hbar)^2; S in keV·b, returns sigma in m².
        """
        E_J = E_keV * 1e3 * self.E_CHARGE
        E_G_J = (
            2
            * mu_kg
            * (Z1 * Z2 * self.E_CHARGE**2 / (4 * np.pi * self.EPS0 * self.HBAR)) ** 2
        )
        E_G_keV = E_G_J / (1e3 * self.E_CHARGE)
        if E_keV <= 0:
            return 0.0
        S_b = S_keV_b * 1e-3  # keV·b -> MeV·b; use S directly in keV·b
        sigma_b = (S_keV_b / E_keV) * np.exp(-np.sqrt(E_G_keV / E_keV))
        return sigma_b * 1e-28  # barns -> m²

    def _thermal_avg_sigma_v(
        self, T: float, Z1: int, Z2: int, mu_kg: float, S_keV_b: float
    ) -> float:
        """
        Thermally averaged <sigma*v> using Gamow peak approximation.

        E0 = (E_G * (k_B T/2)^2)^(1/3); <sigma*v> ~ sigma(E0) * v_thermal * (E0/(k_B T))^(1/3).
        """
        E_thermal_J = 1.5 * self.KB * T
        E_thermal_keV = E_thermal_J / (1e3 * self.E_CHARGE)
        E_G_J = (
            2
            * mu_kg
            * (Z1 * Z2 * self.E_CHARGE**2 / (4 * np.pi * self.EPS0 * self.HBAR)) ** 2
        )
        E_G_keV = E_G_J / (1e3 * self.E_CHARGE)
        E0_keV = (E_G_keV * (0.5 * E_thermal_keV) ** 2) ** (1.0 / 3.0)
        E0_keV = max(E0_keV, 0.001)
        sigma_at_E0 = self._sigma_from_s_factor(E0_keV, Z1, Z2, mu_kg, S_keV_b)
        v_thermal = np.sqrt(8 * self.KB * T / (np.pi * mu_kg))
        tau = 3 * E0_keV / (self.KB * T / (1e3 * self.E_CHARGE))
        return sigma_at_E0 * v_thermal * (2 / np.sqrt(tau)) * np.exp(-tau / 3)

    def _calculate_reaction_rate(self, tunneling_prob: float) -> float:
        """
        Fusion reaction rate using astrophysical S-factor formulation.

        R = n1 * n2 * <sigma*v>_thermal * f_enhancement
        with sigma(E) = S(E)/E * exp(-sqrt(E_G/E)).
        """
        n_host = (
            self.config.host_material.electron_density
            / self.config.host_material.atomic_number
        )
        n_reactant = n_host * self.config.loading_ratio

        T = self.config.temperature
        m = self.config.reactant.atomic_mass * const.u
        mu_kg = m / 2
        Z1 = Z2 = self.config.reactant.atomic_number

        # Astrophysical S-factor (keV·b): D+D ~ 55, p+p ~ 4e-22 (very low)
        if self.config.reactant.name == "Deuterium":
            S_keV_b = 55.0
        elif self.config.reactant.name == "Hydrogen":
            S_keV_b = 4e-22
        else:
            S_keV_b = 10.0

        sigma_v = self._thermal_avg_sigma_v(T, Z1, Z2, mu_kg, S_keV_b)

        # f_enhancement encodes screening, coherence, etc. via tunneling_prob
        # tunneling_prob = P_gamow * enhancement; use enhancement = tunneling_prob / P_gamow
        # For rate: R = 0.5 * n^2 * <sigma*v> * (tunneling_enhancement_factor)
        # The tunneling_prob passed in is P_gamow * total_enhancement; base rate uses <sigma*v>
        # which already includes Gamow. So enhancement multiplies the rate.
        eta = Z1 * Z2 * self.ALPHA * np.sqrt(
            mu_kg * self.C**2 / (2 * 1.5 * self.KB * T)
        )
        P_gamow = np.exp(-2 * np.pi * eta)
        P_gamow = max(P_gamow, 1e-100)
        enhancement = tunneling_prob / P_gamow

        rate = 0.5 * n_reactant**2 * sigma_v * enhancement
        return max(rate, 0.0)
    
    def _calculate_excess_heat(self, reaction_rate: float) -> float:
        """Calculate excess heat production."""
        # Energy per reaction (D+D fusion releases ~24 MeV)
        if self.config.reactant.name == "Deuterium":
            Q_reaction = 24e6 * self.E_CHARGE  # Joules
        else:
            Q_reaction = 6e6 * self.E_CHARGE  # Lower for p+p type
        
        # Volume (approximate)
        V = self.config.grain_size**3 * 1e6  # Many grains
        
        # Power = rate × energy × volume
        power = reaction_rate * Q_reaction * V
        
        return power
    
    def _calculate_helium4_rate(self, reaction_rate: float) -> float:
        """Calculate He-4 production rate."""
        # D+D → He-4 branch ratio ~50%
        branch_ratio = 0.5 if self.config.reactant.name == "Deuterium" else 0.0
        V = self.config.grain_size**3 * 1e6
        return reaction_rate * branch_ratio * V
    
    def _calculate_neutron_rate(self, reaction_rate: float) -> float:
        """Calculate neutron production rate."""
        # D+D → n + He-3 branch ratio ~50%
        branch_ratio = 0.5 if self.config.reactant.name == "Deuterium" else 0.0
        V = self.config.grain_size**3 * 1e6
        return reaction_rate * branch_ratio * V * 0.01  # Much suppressed in LENR
    
    def _generate_time_series(
        self, base_heat: float, base_enhancement: float
    ) -> Tuple[List[float], List[float], List[float]]:
        """
        Generate time series data for visualization.
        
        Uses deterministic noise for reproducible results.
        """
        # Pre-allocate arrays for better performance
        time_points = np.linspace(0, self.config.total_time, self.config.time_steps)
        
        # Deterministic noise using multiple sine waves (replaces np.random.randn())
        # This ensures same inputs produce same outputs
        noise = (
            1.0 
            + 0.1 * np.sin(2 * np.pi * time_points / 2)
            + 0.05 * np.sin(4 * np.pi * time_points / 2)
            + 0.03 * np.sin(6 * np.pi * time_points / 2)
            + 0.02 * np.sin(8 * np.pi * time_points / 2)
        )
        
        # Ramp up effect (vectorized)
        ramp = 1 - np.exp(-time_points / 2)
        
        # Vectorized calculations
        heat_output = (base_heat * noise * ramp).tolist()
        enhancement_history = (base_enhancement * (0.9 + 0.1 * ramp)).tolist()
        
        return time_points.tolist(), heat_output, enhancement_history
    
    def _calculate_confidence(
        self, thresholds: Dict[str, bool], enhancements: List[EnhancementResult]
    ) -> float:
        """Calculate theory confidence based on conditions met."""
        # Count thresholds met
        threshold_score = sum(thresholds.values()) / len(thresholds)
        
        # Count enhancement thresholds met
        enhancement_score = sum(1 for e in enhancements if e.threshold_met) / max(1, len(enhancements))
        
        # Combined confidence
        confidence = 0.5 * threshold_score + 0.5 * enhancement_score
        
        return confidence
    
    def get_mechanism_summary(self) -> Dict[str, Any]:
        """Get summary of all mechanisms and their current contributions."""
        # Uses cached enhancements from _calculate_all_enhancements
        enhancements = self._calculate_all_enhancements()
        
        return {
            "mechanisms": [
                {
                    "name": e.name,
                    "value": e.value,
                    "threshold_met": e.threshold_met,
                    "equation": e.equation,
                    "category": e.category,
                    "parameters": e.parameters
                }
                for e in enhancements
            ],
            "total_enhancement": self._combine_enhancements(enhancements),
            "thresholds": self._check_thresholds()
        }
    
    def clear_cache(self):
        """Clear the enhancement cache. Useful when config changes."""
        self._enhancement_cache.clear()
        self._cache_key = None
        logger.debug("Enhancement cache cleared")


def create_simulation(system_type: str = "pd_d", **kwargs) -> UnifiedLENRModel:
    """Factory function to create simulation with preset configurations."""
    config = SimulationConfig()
    
    if system_type == "pd_d":
        config.host_material = MaterialProperties.palladium()
        config.reactant = ReactantProperties.deuterium()
    elif system_type == "ni_h":
        config.host_material = MaterialProperties.nickel()
        config.reactant = ReactantProperties.hydrogen()
    elif system_type == "ti_d":
        config.host_material = MaterialProperties.titanium()
        config.reactant = ReactantProperties.deuterium()
    
    # Apply any overrides
    for key, value in kwargs.items():
        if hasattr(config, key):
            setattr(config, key, value)
    
    return UnifiedLENRModel(config)
