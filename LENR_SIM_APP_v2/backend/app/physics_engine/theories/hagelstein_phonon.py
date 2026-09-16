"""
Hagelstein Phonon-Nuclear Coupling Theory Module

Physics:
    Coherent energy transfer between nuclear and phonon degrees of freedom.
    The key insight is that the 23.8 MeV from D+D -> He-4 is not released
    as a single gamma quantum, but instead transferred coherently to ~10^8
    phonons via anharmonic coupling with the host lattice.

    This explains two critical LENR observations:
    1. No gamma radiation (energy goes to phonons, not photons)
    2. Excess heat (phonons = lattice vibrations = heat)

    The coupling matrix element depends on the phonon frequency, lattice
    anharmonicity, and the number of phonon modes that participate.

References
----------
[1] Hagelstein, P. L. (2012). "Phonon-nuclear coupling". J. Condensed
    Matter Nucl. Sci. 12, 18-40.
[2] Hagelstein, P. L. & Chaudhary, I. U. (2015). "Phonon-nuclear
    coupling for anomalies in condensed matter nuclear science".
    J. Condensed Matter Nucl. Sci. 16, 46-63.
[3] Hagelstein, P. L. (2010). "Lattice-induced nuclear excitation and
    energy release". Naturwissenschaften 97, 345-352.
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional

from scipy import constants as const

from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

logger = logging.getLogger(__name__)

HBAR = const.hbar
E_CHARGE = const.e
KB = const.k
MP = const.m_p
C = const.c

# D+D -> He-4 energy
Q_VALUE_DD_HE4_MEV = 23.8
Q_VALUE_DD_HE4_J = Q_VALUE_DD_HE4_MEV * 1e6 * E_CHARGE


class HagelsteinPhononTheory:
    """Phonon-nuclear coupling model for radiationless LENR energy transfer."""

    @property
    def theory_id(self) -> str:
        return "hagelstein_phonon"

    @property
    def theory_name(self) -> str:
        return "Hagelstein Phonon-Nuclear Coupling"

    @property
    def description(self) -> str:
        return (
            "Coherent energy transfer from nuclear reactions to lattice phonons "
            "via anharmonic coupling. The 23.8 MeV from D+D->He-4 is transferred "
            "to ~10^8 phonons, explaining excess heat without gamma radiation."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "phonon_frequency_Hz": {
                "default": 1e13,
                "description": "Characteristic phonon frequency in Hz (~10 THz for Pd)",
            },
            "coupling_strength": {
                "default": 1e-4,
                "description": "Dimensionless phonon-nuclear coupling strength",
            },
            "n_phonon_modes": {
                "default": 1e8,
                "description": "Number of phonon modes participating in energy transfer",
            },
            "debye_temperature_K": {
                "default": 274.0,
                "description": "Debye temperature of host lattice (274 K for Pd)",
            },
            "mechanism": {
                "default": "coherent_raman",
                "description": "Multi-phonon mechanism",
                "options": ["naive", "stimulated_cascade", "coherent_raman", "phonon_polariton_bec"],
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        T = conditions.get("temperature", 0)
        loading = conditions.get("loading_ratio", 0)
        return T > 0 and loading > 0

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        T = conditions.get("temperature", 300.0)
        loading = conditions.get("loading_ratio", 0.9)
        n_e = conditions.get("electron_density", 6.8e28)

        if not self.is_applicable(conditions):
            return self._neutral("Temperature or loading is zero")

        omega_ph = config.get("phonon_frequency_Hz", 1e13)
        g_coupling = config.get("coupling_strength", 1e-4)
        n_modes = config.get("n_phonon_modes", 1e8)
        T_debye = config.get("debye_temperature_K", 274.0)
        mechanism = config.get("mechanism", "coherent_raman")

        # Energy per phonon (hbar * omega)
        E_phonon = HBAR * 2.0 * math.pi * omega_ph

        # Number of phonons needed to absorb Q (~2e7 for 50 meV phonons)
        N_phonons = Q_VALUE_DD_HE4_J / max(E_phonon, 1e-30)
        n_phonons_needed = N_phonons

        # Naive multi-phonon probability: P_naive = (g/(hbar*omega))^N
        # g/(hbar*omega) dimensionless: g_coupling when g_energy = g*E_phonon
        g_over_hbar_omega = min(max(g_coupling, 1e-300), 1.0 - 1e-15)
        if N_phonons < 1e6:
            P_naive = g_over_hbar_omega ** N_phonons
        else:
            log_P = N_phonons * math.log(g_over_hbar_omega)
            P_naive = math.exp(log_P) if log_P > -700 else 0.0

        # Dimensionless coupling: g/(hbar*omega); weak coupling (< 0.1) rules out naive mechanism
        naive_ruled_out = (g_over_hbar_omega < 0.1) or (P_naive < 1e-100)

        # Coupling matrix element: V_coupling ~ g × E_phonon × √n_modes
        # This is the rate at which nuclear energy transfers to phonons
        V_coupling = g_coupling * E_phonon * math.sqrt(n_modes)

        # Transition rate via Fermi's Golden Rule:
        # Gamma = (2π/ℏ) |V|² ρ(E)
        # Density of states at phonon energies
        # For Debye model: ρ(E) ~ 3N × (E/E_D)² / E_D  for E < E_D
        E_debye = KB * T_debye
        if E_phonon < E_debye:
            rho_phonon = 3.0 * n_e * (E_phonon / E_debye)**2 / E_debye
        else:
            rho_phonon = 3.0 * n_e / E_debye

        # Fermi golden rule rate
        gamma_transfer = (2.0 * math.pi / HBAR) * V_coupling**2 * rho_phonon

        # Phonon occupation number at temperature T
        x = E_phonon / (KB * T)
        if x < 50:
            n_bose = 1.0 / (math.exp(x) - 1.0) if x > 0 else 0.0
        else:
            n_bose = 0.0

        n_ph = 1.0 + n_bose
        gamma_gamma = (const.alpha / math.pi) * (Q_VALUE_DD_HE4_J / (HBAR * C))**3 * HBAR

        if mechanism == "naive":
            enhancement = 1e-50 if naive_ruled_out else min(P_naive, 1e-20)
            branching_ratio = 0.0
        elif mechanism == "stimulated_cascade":
            if N_phonons < 500:
                stim_cascade = (n_ph ** min(N_phonons, 500)) / max(math.factorial(min(int(N_phonons), 170)), 1e-300)
            else:
                log_stim = min(N_phonons, 1e4) * math.log(max(n_ph, 1e-300))
                log_N_fac = min(N_phonons, 1e4) * math.log(max(N_phonons, 1)) - min(N_phonons, 1e4)
                stim_cascade = math.exp(log_stim - log_N_fac) if (log_stim - log_N_fac) > -700 else 0.0
            branching_ratio = (gamma_transfer / max(gamma_gamma, 1e-100)) * max(stim_cascade, 1e-20)
            branching_ratio = min(branching_ratio, 1e20)
            enhancement = max(1.0, math.sqrt(branching_ratio) * loading)
        elif mechanism == "phonon_polariton_bec":
            collective_factor = math.sqrt(n_modes) / 1e4
            stimulated_factor = (1.0 + n_bose) ** min(math.log10(max(n_modes, 1)), 10) * collective_factor
            branching_ratio = (gamma_transfer / max(gamma_gamma, 1e-100)) * stimulated_factor
            branching_ratio = min(branching_ratio, 1e20)
            enhancement = max(1.0, math.sqrt(branching_ratio) * loading)
        else:
            stimulated_factor = (1.0 + n_bose) ** min(math.log10(max(n_modes, 1)), 10)
            branching_ratio = gamma_transfer / max(gamma_gamma, 1e-100)
            branching_ratio = min(branching_ratio, 1e20)
            enhancement = max(1.0, math.sqrt(branching_ratio) * loading)

        enhancement = min(enhancement, MAX_ENHANCEMENT_FACTOR)

        # Energy output: if the phonon pathway is viable, all Q goes to heat
        # Power per unit volume depends on base reaction rate × phonon fraction
        phonon_fraction = branching_ratio / (1.0 + branching_ratio)
        energy_per_phonon_eV = E_phonon / E_CHARGE

        # Confidence based on coupling quality and thermal conditions
        coupling_score = min(g_coupling / 1e-4, 1.0)
        thermal_score = min(T / T_debye, 1.0)
        confidence = 0.7 * coupling_score * thermal_score * min(loading, 1.0)

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=0.0,  # coupling model, not absolute rate
            observables={
                "naive_multi_phonon_probability": P_naive,
                "naive_ruled_out": naive_ruled_out,
                "N_phonons_needed": N_phonons,
                "mechanism": mechanism,
                "n_phonons_needed": n_phonons_needed,
                "energy_per_phonon_eV": energy_per_phonon_eV,
                "coupling_matrix_element_J": V_coupling,
                "gamma_transfer_s": gamma_transfer,
                "phonon_occupation_n_bose": n_bose,
                "branching_phonon_vs_gamma": branching_ratio,
                "phonon_fraction": phonon_fraction,
                "debye_temperature_K": T_debye,
                "product_He4": 1.0,
                "product_neutrons": 0.0,
                "product_gamma": 1.0 - phonon_fraction,
            },
            parameters_used={
                "temperature": T,
                "loading_ratio": loading,
                "phonon_frequency_Hz": omega_ph,
                "coupling_strength": g_coupling,
                "n_phonon_modes": n_modes,
                "mechanism": mechanism,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Hagelstein P.L. (2012) J. Condensed Matter Nucl. Sci. 12, 18",
                "Hagelstein P.L. & Chaudhary I.U. (2015) JCMNS 16, 46",
                "Hagelstein P.L. (2010) Naturwissenschaften 97, 345",
            ],
            primary_sources=[
                "Hagelstein P.L. (2012) J. Condensed Matter Nucl. Sci. 12, 18",
                "Hagelstein P.L. & Chaudhary I.U. (2015) JCMNS 16, 46",
            ],
            theory_model_version="hagelstein_phonon_p0_v1",
            author_equations_vs_simulator_approximations={
                "coupling_matrix_element": "simulator_approximation",
                "full_excitation_transfer": "deferred_ara_p1",
            },
            free_or_fitted_parameters=[
                {
                    "name": "coupling_strength",
                    "kind": "free",
                    "source": "simulator",
                },
            ],
            source_domain_limits=[
                "Phonon–nuclear coupling module; full coupling-matrix rebuild queued for ARA P1 (0.3.9).",
            ],
            model_fidelity="approximate",
            empirical_support="speculative",
            provenance={
                "coupling_matrix_status": "approximate_pending_p1",
                "excitation_transfer": "deferred_ara_p1",
                "implementation_role": "equation_driven_approximate",
                "p1_rebuild_status": "started_scaffold",
                "p1_rebuild_targets": [
                    "coupling_matrix_elements",
                    "excitation_transfer_expansion",
                ],
            },
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Hagelstein P.L. (2012) J. Condensed Matter Nucl. Sci. 12, 18",
                "Hagelstein P.L. & Chaudhary I.U. (2015) JCMNS 16, 46",
            ],
            category="mechanism",
            primary_sources=[
                "Hagelstein P.L. (2012) J. Condensed Matter Nucl. Sci. 12, 18",
                "Hagelstein P.L. & Chaudhary I.U. (2015) JCMNS 16, 46",
            ],
            theory_model_version="hagelstein_phonon_p0_v1",
            model_fidelity="approximate",
            empirical_support="speculative",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("HagelsteinPhonon not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
