"""
Matsumoto Electro-Nuclear Collapse (ENC) Theory Module

Physics:
    Takaaki Matsumoto proposed that intense electromagnetic fields can
    drive hydrogen/deuterium clusters into collapsed nuclear states
    called "itonic clusters".  These microscopic structures undergo
    electro-nuclear collapse where electromagnetic and nuclear forces
    combine, producing nuclear fragments, particle emissions, and in
    some cases micro-scale ball lightning.

    The theory predicts:
    - Nuclear products from multi-body collapse
    - Characteristic track patterns in nuclear emulsions
    - Possible creation of microscopic composite objects ("itons")

References
----------
[1] Matsumoto, T. (1995). "Observation of new particles emitted during
    cold fusion". Fusion Technology 27, 235-238.
[2] Matsumoto, T. (1992). "Cold fusion experiments with ordinary water
    and thin nickel wire". Fusion Technology 22, 164-167.
[3] Matsumoto, T. (2000). "Nuclear fusion in a micro-ball lightning".
    J. New Energy 5(1), 23-30.
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, Optional

from scipy import constants as const

from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

logger = logging.getLogger(__name__)

HBAR = const.hbar
E_CHARGE = const.e
KB = const.k
EPS0 = const.epsilon_0
ME = const.m_e
MP = const.m_p
C = const.c
ALPHA = const.alpha


class MatsumotoENCTheory:
    """Electro-Nuclear Collapse (ENC) and itonic cluster formation model."""

    @property
    def theory_id(self) -> str:
        return "matsumoto_enc"

    @property
    def theory_name(self) -> str:
        return "Matsumoto Electro-Nuclear Collapse"

    @property
    def description(self) -> str:
        return (
            "Intense EM fields drive hydrogen clusters into nuclear collapse "
            "states (itonic clusters). Electromagnetic and nuclear forces combine "
            "to produce nuclear fragments, particle emissions, and micro ball "
            "lightning phenomena."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "cluster_size": {
                "default": 10,
                "description": "Number of hydrogen/deuterium atoms in the cluster",
            },
            "em_field_strength_V_m": {
                "default": 1e8,
                "description": "Applied electromagnetic field strength in V/m",
            },
            "collapse_threshold_energy_eV": {
                "default": 100.0,
                "description": "Energy threshold for electro-nuclear collapse in eV",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        T = conditions.get("temperature", 0)
        return T > 0

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
            return self._neutral("Temperature is zero")

        N_cluster = int(config.get("cluster_size", 10))
        E_field = config.get("em_field_strength_V_m", 1e8)
        E_threshold = config.get("collapse_threshold_energy_eV", 100.0) * E_CHARGE

        # EM energy density in the field: u = ε₀E²/2
        u_em = 0.5 * EPS0 * E_field**2

        # Energy delivered to cluster: E_cluster = u_em × V_cluster
        # Cluster radius ~ N^(1/3) × r_atom
        r_atom = 0.53e-10  # Bohr radius
        r_cluster = N_cluster**(1.0 / 3.0) * r_atom
        V_cluster = (4.0 / 3.0) * math.pi * r_cluster**3
        E_cluster = u_em * V_cluster

        # Is threshold exceeded?
        threshold_ratio = E_cluster / max(E_threshold, 1e-30)
        collapse_triggered = threshold_ratio > 1.0

        if collapse_triggered:
            # Electro-nuclear collapse: multi-body nuclear reaction
            # Energy released scales with cluster size
            E_nuclear_per_pair = 5.0 * 1e6 * E_CHARGE  # ~5 MeV per nucleon pair
            n_pairs = N_cluster * (N_cluster - 1) / 2
            effective_pairs = min(n_pairs, N_cluster)  # limited by geometry

            # Collapse probability: Boltzmann-like with threshold
            P_collapse = math.exp(-E_threshold / max(E_cluster, 1e-30))
            P_collapse = min(P_collapse, 1.0)

            # Enhancement from multi-body EM driving
            enhancement = max(1.0, threshold_ratio * N_cluster * P_collapse)
            enhancement = min(enhancement, MAX_ENHANCEMENT_FACTOR)

            # Estimated power
            rate_per_collapse = P_collapse * KB * T / HBAR
            power_per_collapse = rate_per_collapse * effective_pairs * E_nuclear_per_pair
        else:
            enhancement = 1.0
            P_collapse = 0.0
            power_per_collapse = 0.0

        # Products: fragments, some conventional nuclear products
        fragment_fraction = 0.5 if collapse_triggered else 0.0
        micro_bl_probability = P_collapse * 0.01 if collapse_triggered else 0.0

        # Confidence: lower due to controversial nature
        em_score = min(threshold_ratio, 1.0)
        confidence = 0.3 * em_score * min(loading, 1.0)  # 0.3 = low model maturity

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=0.0,
            observables={
                "cluster_size": N_cluster,
                "em_energy_density_J_m3": u_em,
                "E_cluster_eV": E_cluster / E_CHARGE,
                "threshold_ratio": threshold_ratio,
                "collapse_triggered": 1.0 if collapse_triggered else 0.0,
                "P_collapse": P_collapse,
                "r_cluster_pm": r_cluster * 1e12,
                "micro_ball_lightning_prob": micro_bl_probability,
                "product_fragments": fragment_fraction,
                "product_He4": 0.3 if collapse_triggered else 0.0,
                "product_neutrons": 0.1 if collapse_triggered else 0.0,
                "product_gamma": 0.05 if collapse_triggered else 0.0,
                "product_transmutation": fragment_fraction,
            },
            parameters_used={
                "temperature": T,
                "loading_ratio": loading,
                "cluster_size": N_cluster,
                "em_field_strength_V_m": E_field,
                "collapse_threshold_energy_eV": E_threshold / E_CHARGE,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Matsumoto T. (1995) Fusion Technology 27, 235",
                "Matsumoto T. (1992) Fusion Technology 22, 164",
                "Matsumoto T. (2000) J. New Energy 5(1), 23",
            ],
            primary_sources=[
                "Matsumoto T. collected Nattoh / ENR / ENC papers (1989–1999)",
            ],
            theory_model_version="matsumoto_enc_p0_pheno_v1",
            author_equations_vs_simulator_approximations={
                "branch_network": "phenomenological",
                "transmutation_cross_section": "simulator_approximation_not_author_formula",
            },
            free_or_fitted_parameters=[
                {"name": "enc_parameters", "kind": "free", "source": "simulator"},
            ],
            source_domain_limits=[
                "Phenomenological branching; black-hole/white-hole interpretation is author speculation.",
                "Do not invent a de Broglie/threshold formula and attribute it to Matsumoto.",
            ],
            model_fidelity="phenomenological",
            empirical_support="speculative",
            claim_tier="speculative_exploratory",
            falsification_conditions=[
                "Compare claimed signatures against contamination, EDX/SEM artifacts, and ordinary discharge controls.",
            ],
            provenance={
                "implementation_role": "phenomenological_branch_network",
                "epistemic_warning": "highly_speculative_author_interpretation",
            },
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Matsumoto T. (1995) Fusion Technology 27, 235",
                "Matsumoto T. (1992) Fusion Technology 22, 164",
            ],
            category="triggering",
            primary_sources=[
                "Matsumoto T. collected Nattoh / ENR / ENC papers (1989–1999)",
            ],
            theory_model_version="matsumoto_enc_p0_pheno_v1",
            model_fidelity="phenomenological",
            empirical_support="speculative",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("MatsumotoENC not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
