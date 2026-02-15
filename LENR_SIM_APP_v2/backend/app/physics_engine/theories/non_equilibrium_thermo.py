"""
Non-Equilibrium Thermodynamics Theory Module (Legacy Wrapper)
=============================================================

Wraps the existing ``app.physics.non_equilibrium_thermo`` module as a
:class:`TheoryModule` implementation for the Theory Pipeline.

Physics:
    Analyses LENR systems as open non-equilibrium thermodynamic systems.
    Excess power analysis, energy balance, and entropy production provide
    cross-cutting diagnostics that complement mechanism-specific theories.

    COP > 1 signals anomalous heat production; entropy production rate
    quantifies how far the system is from equilibrium.

References:
    de Groot S.R. & Mazur P. (1962) Non-Equilibrium Thermodynamics
    Fleischmann M. & Pons S. (1989) J. Electroanal. Chem. 261, 301
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.physics_engine.theory_protocol import (
    TheoryContribution,
    TheoryMetadata,
)

logger = logging.getLogger(__name__)


class NonEquilibriumThermoTheory:
    """Non-equilibrium thermodynamic analysis (legacy wrapper)."""

    @property
    def theory_id(self) -> str:
        return "non_equilibrium_thermo"

    @property
    def theory_name(self) -> str:
        return "Non-Equilibrium Thermodynamics"

    @property
    def description(self) -> str:
        return (
            "Open-system thermodynamic analysis: excess power detection, "
            "energy balance, entropy production, and COP estimation."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "input_power_W": {
                "default": 5.0,
                "description": "Electrical input power (W)",
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

        if not self.is_applicable(conditions):
            return self._neutral("Temperature must be > 0")

        T = conditions.get("temperature", 300.0)
        loading = conditions.get("loading_ratio", 0.9)
        excess_heat = conditions.get("excess_heat_W", 1.0)
        input_power = config.get("input_power_W", 5.0)

        try:
            from app.physics.non_equilibrium_thermo import (
                excess_power_analysis,
                entropy_production_rate,
            )

            # Measured output is input + excess
            measured_output = input_power + excess_heat
            epa = excess_power_analysis(
                input_power=input_power,
                measured_output=measured_output,
                temperature=T,
            )

            entropy = entropy_production_rate(
                temperature=T,
                temperature_gradient=excess_heat * 100,  # rough gradient
                loading_rate=loading * 1e-4,
            )

            # COP as enhancement factor (≥1 means excess heat detected)
            enhancement = max(1.0, epa.cop)

            # Confidence based on how anomalous the excess is
            confidence = 0.0
            if epa.is_anomalous:
                confidence = min(1.0, 0.5 + 0.5 * (epa.cop - 1.0))

            return TheoryContribution(
                theory_id=self.theory_id,
                theory_name=self.theory_name,
                enhancement_factor=enhancement,
                reaction_rate_modifier=1.0,  # Thermo is diagnostic, not rate-modifying
                energy_output_watts=epa.excess_power,
                observables={
                    "cop": epa.cop,
                    "excess_power_W": epa.excess_power,
                    "efficiency": epa.efficiency,
                    "is_anomalous": 1.0 if epa.is_anomalous else 0.0,
                    "entropy_rate_W_K": entropy.entropy_rate,
                    "irreversibility": entropy.irreversibility,
                    "product_He4": 1.0 if epa.is_anomalous else 0.0,
                    "product_neutrons": 0.0,
                    "product_gamma": 0.0,
                },
                parameters_used={
                    "temperature": T,
                    "loading_ratio": loading,
                    "input_power_W": input_power,
                    "excess_heat_W": excess_heat,
                },
                is_applicable=True,
                confidence=confidence,
                references=[
                    "de Groot S.R. & Mazur P. (1962) Non-Equilibrium Thermodynamics",
                    "Fleischmann M. & Pons S. (1989) J. Electroanal. Chem. 261, 301",
                ],
            )

        except Exception as exc:
            logger.exception("NonEquilibriumThermo calculation error")
            return self._neutral(str(exc))

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "de Groot S.R. & Mazur P. (1962) Non-Equilibrium Thermodynamics",
                "Fleischmann M. & Pons S. (1989) J. Electroanal. Chem. 261, 301",
            ],
            category="measurement",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("NonEquilibriumThermo not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
