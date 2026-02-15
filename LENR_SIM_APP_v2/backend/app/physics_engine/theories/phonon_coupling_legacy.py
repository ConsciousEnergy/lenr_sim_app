"""
Phonon-Nuclear Coupling Theory Module (Legacy Wrapper)
=======================================================

Wraps the existing ``app.physics.phonon_nuclear_coupling`` module as a
:class:`TheoryModule` implementation for the Theory Pipeline.

Physics:
    Coherent phonon modes in the host lattice create collective nuclear
    coupling via Bose-Einstein distributed vibrational modes. The
    Debye-Waller factor, phonon occupation number, and effective mass
    renormalisation combine to produce a net enhancement of nuclear
    reaction probability.

References:
    Hagelstein P.L. (2010) J. Cond. Mat. Nucl. Phys. 3, 41
    Preparata G. (1991) QED Coherence in Matter, World Scientific
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.physics_engine.theory_protocol import (
    TheoryContribution,
    TheoryMetadata,
)

logger = logging.getLogger(__name__)


class PhononCouplingLegacyTheory:
    """Phonon-nuclear coupling enhancement (legacy wrapper)."""

    @property
    def theory_id(self) -> str:
        return "phonon_coupling_legacy"

    @property
    def theory_name(self) -> str:
        return "Phonon-Nuclear Coupling"

    @property
    def description(self) -> str:
        return (
            "Coherent phonon modes in the host lattice enhance nuclear "
            "reaction rates via Debye-Waller and polaron effects."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "phonon_frequency": {
                "default": 1e13,
                "description": "Characteristic phonon frequency (Hz)",
            },
            "coupling_strength": {
                "default": 0.1,
                "description": "Dimensionless coupling strength",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        T = conditions.get("temperature", 0)
        return T > 10  # Phonon modes freeze out near 0 K

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}

        if not self.is_applicable(conditions):
            return self._neutral("Temperature too low for phonon modes")

        T = conditions.get("temperature", 300.0)
        loading = conditions.get("loading_ratio", 0.9)
        freq = config.get("phonon_frequency", 1e13)
        g = config.get("coupling_strength", 0.1)

        try:
            from app.physics.phonon_nuclear_coupling import (
                calculate_phonon_nuclear_coupling,
            )

            result = calculate_phonon_nuclear_coupling(
                temperature=T,
                phonon_frequency=freq,
                coupling_strength=g,
                loading_ratio=loading,
            )

            enhancement = result.coupling_factor
            confidence = min(1.0, 0.3 + 0.4 * (result.coherent_enhancement - 1.0))
            confidence = max(0.0, min(1.0, confidence))

            return TheoryContribution(
                theory_id=self.theory_id,
                theory_name=self.theory_name,
                enhancement_factor=enhancement,
                reaction_rate_modifier=enhancement,
                energy_output_watts=result.energy_exchange_rate * 1.6e-19,
                observables={
                    "coupling_factor": result.coupling_factor,
                    "coherent_enhancement": result.coherent_enhancement,
                    "debye_waller_factor": result.debye_waller_factor,
                    "phonon_occupation": result.phonon_occupation,
                    "effective_mass_ratio": result.effective_mass_ratio,
                    "energy_exchange_rate_eV_s": result.energy_exchange_rate,
                    "product_He4": 1.0,
                    "product_neutrons": 0.0,
                    "product_gamma": 0.0,
                },
                parameters_used={
                    "temperature": T,
                    "loading_ratio": loading,
                    "phonon_frequency": freq,
                    "coupling_strength": g,
                },
                is_applicable=True,
                confidence=confidence,
                references=[
                    "Hagelstein P.L. (2010) J. Cond. Mat. Nucl. Phys. 3, 41",
                    "Preparata G. (1991) QED Coherence in Matter, World Scientific",
                ],
            )

        except Exception as exc:
            logger.exception("PhononCouplingLegacy calculation error")
            return self._neutral(str(exc))

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Hagelstein P.L. (2010) J. Cond. Mat. Nucl. Phys. 3, 41",
                "Preparata G. (1991) QED Coherence in Matter, World Scientific",
            ],
            category="mechanism",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("PhononCouplingLegacy not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
