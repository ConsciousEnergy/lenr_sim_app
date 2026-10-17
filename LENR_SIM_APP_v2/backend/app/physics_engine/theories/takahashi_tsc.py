"""
Takahashi Tetrahedral Symmetric Condensate (TSC) Theory Module

Physics:
    Four deuterons simultaneously tunnel at a tetrahedral interstitial site
    in the FCC metal lattice.  The 4-body coherent quantum state dramatically
    reduces the effective Coulomb barrier via multi-body screening.

    Reaction: 4D -> 2 He-4 + 47.6 MeV  (no neutrons, no gamma)

    The TSC model explains why He-4 is the primary product without dangerous
    radiation: the 4-body simultaneous fusion bypasses the 2-body D+D channels
    that produce neutrons/protons, and the energy is shared among two alpha
    particles plus lattice phonons.

References
----------
[1] Takahashi, A. (2004). "Deuteron cluster fusion and related nuclear
    reactions in metal-deuterium/hydrogen systems". Proc. ICCF-10, 809.
    — takahashi2004
[2] Takahashi, A. (2008). "TSC-induced nuclear reactions and cold
    transmutations". J. Condensed Matter Nucl. Sci. 1, 86-96.
    — takahashi2008
[3] Takahashi, A. (2013). "Nuclear Products of Cold Fusion by TSC Theory".
    J. Condensed Matter Nucl. Sci. 12, 26-34. — takahashi2013
[4] Takahashi, A. (2014). "Physics of Cold Fusion by TSC Theory".
    J. Condensed Matter Nucl. Sci. — takahashi2014
[5] Takahashi, A. (2016). "Fundamental of Rate Theory for CMNS".
    J. Condensed Matter Nucl. Sci. 19, 298-315. — takahashi2016
[6] Takahashi, A. (2026). "4HTSC WS Fusion Theory in brief view".
    ResearchGate 412949900. Weak-Strong (not Woods-Saxon) protium channel
    is literature context; this module remains the 4D surrogate.
    — takahashi2026brief
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional

from scipy import constants as const

from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.many_body.fgr_model import (
    TETRAHEDRAL_SITE_FRACTION,
    bernoulli_p4,
    fcc_d_dd_m,
)

logger = logging.getLogger(__name__)

# Physical constants
HBAR = const.hbar
E_CHARGE = const.e
KB = const.k
EPS0 = const.epsilon_0
MP = const.m_p
MN = const.m_n
MD = MP + MN  # deuteron mass (approx)
ALPHA = const.alpha
C = const.c

# TSC specific constants
Q_VALUE_4D_MEV = 47.6  # 4D -> 2He4 Q-value in MeV
Q_VALUE_4D_J = Q_VALUE_4D_MEV * 1e6 * E_CHARGE


class TakahashiTSCTheory:
    """Tetrahedral Symmetric Condensate (TSC) multi-body fusion model."""

    @property
    def theory_id(self) -> str:
        return "takahashi_tsc"

    @property
    def theory_name(self) -> str:
        return "Takahashi TSC (Tetrahedral Symmetric Condensate)"

    @property
    def description(self) -> str:
        return (
            "Four deuterons simultaneously tunnel at a tetrahedral interstitial "
            "site in the FCC lattice via a coherent 4-body quantum state (TSC). "
            "Produces 2 He-4 + 47.6 MeV with no neutrons or gamma rays."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "site_type": {
                "default": "tetrahedral",
                "description": "Interstitial site type (tetrahedral or octahedral)",
            },
            "coherence_factor": {
                "default": 1.0,
                "description": "Coherence quality 0-1 (1 = perfect 4-body coherence)",
            },
            "lattice_constant_A": {
                "default": 3.89,
                "description": "Host lattice constant in Angstroms (3.89 for Pd)",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        T = conditions.get("temperature", 0)
        loading = conditions.get("loading_ratio", 0)
        return T > 0 and loading > 0.8  # TSC requires high D loading

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        T = conditions.get("temperature", 300.0)
        loading = conditions.get("loading_ratio", 0.9)
        pressure = conditions.get("pressure", 101325.0)
        n_ion = conditions.get("electron_density", 6.8e28)

        if not self.is_applicable(conditions):
            return self._neutral("Loading ratio < 0.8 or temperature <= 0")

        site_type = config.get("site_type", "tetrahedral")
        coherence = config.get("coherence_factor", 1.0)
        a_lattice = config.get("lattice_constant_A", 3.89) * 1e-10  # -> metres

        # Tetrahedral site geometry via shared FGR library (EQ-TSC-GEOM-01).
        d_DD = fcc_d_dd_m(a_lattice)

        site_fraction = TETRAHEDRAL_SITE_FRACTION if site_type == "tetrahedral" else 0.5
        p_4_occupation = bernoulli_p4(loading, site_fraction)

        # 4-body Gamow factor: coherent tunnelling reduces the effective
        # barrier because the 4 deuterons share the Coulomb cost.
        # Standard 2-body Gamow: E_G = 2μc²(πZ₁Z₂α)²
        # For 4-body coherent: effective Z is reduced by ~1/√4 = 1/2
        # (each pair shares screening from the other pairs)
        mu_2body = MD / 2.0  # reduced mass for D-D
        E_thermal_J = 1.5 * KB * T
        E_thermal_keV = E_thermal_J / (1e3 * E_CHARGE)

        # Standard 2-body Gamow energy
        E_gamow_2body = 2.0 * mu_2body * C**2 * (math.pi * ALPHA)**2

        # TSC coherence reduces effective Gamow energy
        # Takahashi's key insight: 4-body condensate barrier ~ E_G / 4
        coherence_reduction = 1.0 / (4.0 * max(coherence, 0.01))
        E_gamow_tsc = E_gamow_2body * coherence_reduction

        # Tunnelling probability: P ∝ exp(-π√(E_G/E))
        if E_thermal_J > 0:
            gamow_exponent = math.pi * math.sqrt(E_gamow_tsc / max(E_thermal_J, 1e-30))
            gamow_exponent = min(gamow_exponent, 200.0)  # prevent overflow
            P_tunnel_tsc = math.exp(-gamow_exponent)
        else:
            P_tunnel_tsc = 0.0

        # Standard 2-body for comparison
        gamow_exp_2body = math.pi * math.sqrt(E_gamow_2body / max(E_thermal_J, 1e-30))
        gamow_exp_2body = min(gamow_exp_2body, 200.0)
        P_tunnel_2body = math.exp(-gamow_exp_2body)

        # Enhancement = TSC tunnelling / bare 2-body tunnelling
        if P_tunnel_2body > 0:
            enhancement = P_tunnel_tsc / max(P_tunnel_2body, 1e-300)
        else:
            enhancement = P_tunnel_tsc * 1e100 if P_tunnel_tsc > 0 else 1.0

        enhancement *= p_4_occupation
        enhancement = max(1.0, min(enhancement, MAX_ENHANCEMENT_FACTOR))

        # Reaction rate estimate (per site per second)
        # Rate = n_sites × P_4_occupation × tunnelling_rate × nuclear_S_factor
        n_sites_per_m3 = 4.0 / a_lattice**3  # 4 tetrahedral sites per unit cell
        attempt_frequency = KB * T / HBAR  # thermal attempt frequency
        rate_per_m3 = n_sites_per_m3 * p_4_occupation * P_tunnel_tsc * attempt_frequency

        # Energy output
        energy_per_reaction = Q_VALUE_4D_J
        volume_m3 = 1e-6  # reference 1 mm³
        power_W = rate_per_m3 * energy_per_reaction * volume_m3

        # Confidence: based on loading quality and coherence
        loading_score = min((loading - 0.8) / 0.15, 1.0) if loading > 0.8 else 0.0
        coherence_score = coherence
        confidence = loading_score * coherence_score * 0.85  # 0.85 = TSC model maturity

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=power_W,
            observables={
                "d_DD_separation_pm": d_DD * 1e12,
                "p_4_occupation": p_4_occupation,
                "P_tunnel_tsc": P_tunnel_tsc,
                "P_tunnel_2body": P_tunnel_2body,
                "gamow_energy_tsc_keV": E_gamow_tsc / (1e3 * E_CHARGE),
                "gamow_energy_2body_keV": E_gamow_2body / (1e3 * E_CHARGE),
                "reaction_rate_per_m3_s": rate_per_m3,
                "Q_value_MeV": Q_VALUE_4D_MEV,
                "power_density_W_m3": rate_per_m3 * energy_per_reaction,
                "product_He4": 1.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": T,
                "loading_ratio": loading,
                "site_type": 1.0 if site_type == "tetrahedral" else 0.0,
                "coherence_factor": coherence,
                "lattice_constant_A": a_lattice * 1e10,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Takahashi A. (2004) Proc. ICCF-10, 809 — takahashi2004",
                "Takahashi A. (2008) J. Condensed Matter Nucl. Sci. 1, 86 — takahashi2008",
                "Takahashi A. (2013) J. Condensed Matter Nucl. Sci. 12, 26 — takahashi2013",
                "Takahashi A. (2014) Physics of Cold Fusion by TSC Theory — takahashi2014",
                "Takahashi A. (2016) JCMNS 19, 298 — takahashi2016",
                "Takahashi A. (2026) 4HTSC WS Fusion Theory in brief view — takahashi2026brief",
            ],
            primary_sources=[
                "Takahashi A. (2011) JCMNS 4 — Progress in Condensed Cluster Fusion Theory",
                "Takahashi A. (2016) JCMNS 19, 298",
                "Takahashi A. (2026) 4HTSC WS Fusion Theory in brief view",
            ],
            theory_model_version="takahashi_tsc_p0_approx_rate_v1",
            author_equations_vs_simulator_approximations={
                "tetrahedral_4D_geometry": "author_hypothesis",
                "rate_path": "simulator_approximation_not_full_Langevin",
                "not_generic_BEC_rate": "taxonomy_guard",
            },
            free_or_fitted_parameters=[
                {"name": "cluster_parameters", "kind": "mixed", "source": "module"},
            ],
            source_domain_limits=[
                "P0 uses approximate TSC rate path; full Langevin condensation dynamics = 0.3.9 P1.",
                "Not a generic Gibbs BEC condensate rate (see kim_bec for Kim BECNF).",
            ],
            model_fidelity="approximate",
            empirical_support="speculative",
            falsification_conditions=[
                "Failure to form the tetrahedral TSC state must suppress the claimed 4D pathway.",
            ],
            provenance={
                "geometry": "tetrahedral_4D_TSC",
                "dynamics_status": "approximate_rate_pending_Langevin_p1",
                "not_generic_bec": True,
                "implementation_role": "equation_driven_approximate",
                "p1_rebuild_status": "started_scaffold",
                "p1_rebuild_targets": [
                    "langevin_tsc_condensation_trajectory",
                    "4D_geometry_observables",
                ],
            },
        )

    def get_metadata(self) -> TheoryMetadata:
        from app.physics_engine.workbench_enrichment import catalog_entry

        wb = catalog_entry("takahashi_tsc")
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Takahashi A. (2004) Proc. ICCF-10, 809 — takahashi2004",
                "Takahashi A. (2008) J. Condensed Matter Nucl. Sci. 1, 86 — takahashi2008",
                "Takahashi A. (2016) JCMNS 19, 298 — takahashi2016",
                "Takahashi A. (2026) 4HTSC WS Fusion Theory in brief view — takahashi2026brief",
            ],
            category="mechanism",
            primary_sources=[
                "Takahashi A. (2016) JCMNS 19, 298",
                "Takahashi A. (2026) 4HTSC WS Fusion Theory in brief view",
            ],
            theory_model_version="takahashi_tsc_p0_approx_rate_v1",
            model_fidelity="approximate",
            empirical_support="speculative",
            taxonomy_kind="named_theory",
            display_model_version=str(wb.get("display_model_version", "")),
            historical_parents=list(wb.get("historical_parents", [])),
            predicted_signatures=list(wb.get("predicted_signatures", [])),
            falsifiers=list(wb.get("falsifiers", [])),
            equation_citations=list(wb.get("equation_citations", [])),
            identifiability_warnings=list(wb.get("identifiability_warnings", [])),
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("TakahashiTSC not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
