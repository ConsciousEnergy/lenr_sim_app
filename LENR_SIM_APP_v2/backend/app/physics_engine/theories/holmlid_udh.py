"""
Holmlid ultra-dense hydrogen/deuterium (H(0)/D(0)) — phenomenological module.

LENR-ARA P0 taxonomy: Holmlid must NOT be represented as a generic BEC
critical-temperature equation. Kim BECNF lives in ``kim_bec``. This module
exposes preparation / laser / TOF-oriented state variables and phenomenological
regime flags only until a source-paper TOF benchmark is wired (P1).

References (primary):
  Holmlid L. arXiv:1302.2781; arXiv:1508.01332 (TOF / ultra-dense D).
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, Optional

from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata

logger = logging.getLogger(__name__)

_PRIMARY = [
    "Holmlid L. (2013) arXiv:1302.2781 — Direct observation of particles >10 MeV/u from ultra-dense deuterium",
    "Holmlid L. (2015) arXiv:1508.01332 — Neutral multi-MeV/u particles from laser-induced processes in D(0)",
]


class HolmlidUDHTheory:
    """Phenomenological H(0)/D(0) ultra-dense hydrogen module (not Kim BECNF)."""

    @property
    def theory_id(self) -> str:
        return "holmlid_udh"

    @property
    def theory_name(self) -> str:
        return "Holmlid ultra-dense H(0)/D(0)"

    @property
    def description(self) -> str:
        return (
            "Phenomenological representation of Holmlid ultra-dense hydrogen/"
            "deuterium H(0)/D(0): preparation, laser stimulation, and TOF/"
            "particle-signature regime flags. Not a Bose–Einstein condensate "
            "critical-temperature model (see kim_bec for Kim BECNF)."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "isotope": {
                "default": "deuterium",
                "description": "Working isotope (hydrogen|deuterium)",
            },
            "internuclear_pm": {
                "default": 2.3,
                "description": "Source-claimed internuclear spacing scale (pm) — exploratory",
            },
            "laser_pulse_energy_j": {
                "default": 0.1,
                "description": "Laser pulse energy (J)",
            },
            "tof_path_m": {
                "default": 1.0,
                "description": "TOF flight path length (m)",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        return True

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        isotope = str(config.get("isotope", "deuterium")).lower()
        r_pm = float(config.get("internuclear_pm", 2.3))
        e_laser = float(config.get("laser_pulse_energy_j", 0.1))
        tof_m = float(config.get("tof_path_m", 1.0))
        T = float(conditions.get("temperature", 300.0))

        # Phenomenological regime only — no invented nuclear rate law.
        dense_regime = 1.0 if r_pm <= 5.0 else 0.0
        laser_on = 1.0 if e_laser > 0.0 else 0.0
        # TOF peak time scales ~ path / v; expose path dependence for discriminators.
        tof_scale_us = (tof_m / max(1e4, 1.0)) * 1e6  # placeholder scale for UI

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=1.0,
            reaction_rate_modifier=1.0,
            energy_output_watts=0.0,
            observables={
                "udh_dense_regime": dense_regime,
                "laser_stimulated": laser_on,
                "tof_path_m": tof_m,
                "tof_scale_us": tof_scale_us,
                "internuclear_pm": r_pm,
                "isotope_is_deuterium": 1.0 if "deut" in isotope else 0.0,
                # Phenomenological: no invented nuclear branching attributed to Holmlid.
                "product_He4": 0.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": T,
                "internuclear_pm": r_pm,
                "laser_pulse_energy_j": e_laser,
                "tof_path_m": tof_m,
            },
            is_applicable=True,
            confidence=0.25,
            claim_tier="speculative_exploratory",
            references=list(_PRIMARY),
            primary_sources=list(_PRIMARY),
            theory_model_version="holmlid_udh_p0_pheno_v1",
            author_equations_vs_simulator_approximations={
                "H(0)/D(0)_state": "author_hypothesis",
                "internuclear_pm": "exploratory_free_parameter",
                "tof_scale_us": "simulator_approximation",
                "nuclear_rate_law": "not_implemented_use_source_paper_benchmark",
            },
            free_or_fitted_parameters=[
                {"name": "internuclear_pm", "kind": "free", "source": "simulator"},
                {"name": "laser_pulse_energy_j", "kind": "experimental_input", "source": "user"},
                {"name": "tof_path_m", "kind": "experimental_input", "source": "user"},
            ],
            source_domain_limits=[
                "Laser-stimulated ultra-dense H/D claims; not electrochemical Pd-D baseline.",
                "Do not use ideal-gas BEC Tc as Holmlid mathematics.",
            ],
            model_fidelity="phenomenological",
            empirical_support="speculative",
            falsification_conditions=[
                "TOF peak times must scale with flight-path length under fixed interpretation.",
                "Magnetic deflection / charged vs neutral fractions must match selected source geometry.",
            ],
            provenance={
                "implementation_role": "phenomenological_state_module",
                "not_kim_becnf": True,
                "entrance_channel": "ultra_dense_hydrogen_laser_stimulation",
            },
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=list(_PRIMARY),
            category="phenomenological",
            primary_sources=list(_PRIMARY),
            theory_model_version="holmlid_udh_p0_pheno_v1",
            model_fidelity="phenomenological",
            empirical_support="speculative",
            control_role="",
        )
