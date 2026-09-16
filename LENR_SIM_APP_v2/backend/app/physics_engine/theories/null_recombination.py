"""
Non-nuclear null control: chemical recombination / calibration-style heat.

LENR-ARA P0: elevate chemical/mechanical/EM alternatives as null models that
can run under the same experiment inputs as LENR hypotheses. This module does
not claim LENR; enhancement stays 1.0 and products are labeled chemical.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata

logger = logging.getLogger(__name__)


class NullRecombinationTheory:
    """Non-nuclear recombination / artifact heat null control."""

    @property
    def theory_id(self) -> str:
        return "null_recombination"

    @property
    def theory_name(self) -> str:
        return "Null: chemical recombination / artifact heat"

    @property
    def description(self) -> str:
        return (
            "Control model for non-nuclear heat from H/D recombination and "
            "simple calibration drift. Use under the same experiment template "
            "as LENR hypotheses. Not a LENR theory."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "recombination_power_w": {
                "default": 0.05,
                "description": "Assumed chemical recombination heat (W)",
            },
            "calibration_drift_w": {
                "default": 0.01,
                "description": "Assumed calorimeter drift (W)",
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
        p_chem = float(config.get("recombination_power_w", 0.05))
        p_drift = float(config.get("calibration_drift_w", 0.01))
        total_w = max(0.0, p_chem + p_drift)

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=1.0,
            reaction_rate_modifier=1.0,
            energy_output_watts=total_w,
            observables={
                "chemical_heat_w": p_chem,
                "calibration_drift_w": p_drift,
                "nuclear_products": 0.0,
                "product_He4": 0.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": float(conditions.get("temperature", 300.0)),
                "recombination_power_w": p_chem,
                "calibration_drift_w": p_drift,
            },
            is_applicable=True,
            confidence=0.9,
            claim_tier="established_reference",
            evidence_class="established",
            reproducibility_tier="established",
            references=[
                "Standard chemical recombination enthalpy (control baseline)",
            ],
            primary_sources=[
                "Conventional chemistry / calorimetry control — not a LENR author theory",
            ],
            theory_model_version="null_recombination_v1",
            author_equations_vs_simulator_approximations={
                "heat_budget": "simulator_approximation",
            },
            free_or_fitted_parameters=[
                {"name": "recombination_power_w", "kind": "free", "source": "user"},
                {"name": "calibration_drift_w", "kind": "free", "source": "user"},
            ],
            source_domain_limits=[
                "Non-nuclear null only; never cite as LENR evidence.",
            ],
            model_fidelity="established_control",
            empirical_support="established",
            falsification_conditions=[
                "If measured excess heat remains after subtracting this null budget and "
                "controls, do not attribute the residual to this module.",
            ],
            provenance={
                "control_role": "null",
                "implementation_role": "non_nuclear_control",
            },
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=["Chemical recombination / calorimetry control"],
            category="null_control",
            primary_sources=["Conventional chemistry control"],
            theory_model_version="null_recombination_v1",
            model_fidelity="established_control",
            empirical_support="established",
            control_role="null",
        )
