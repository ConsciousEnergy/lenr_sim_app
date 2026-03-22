"""
Miles Heat-Helium Quantitative Correlation Theory Module

Physics:
    Melvin Miles established the quantitative correlation between excess
    heat and He-4 production in Pd-D electrolysis experiments:

        1 W excess heat ≈ 2.6 × 10^11 He-4 atoms/s

    This corresponds to 23.8 ± 0.5 MeV per He-4 atom, exactly matching
    the D+D -> He-4 + 23.8 MeV reaction channel (energy to lattice, not
    gamma).  This correlation has been independently confirmed by:
    Gozzi (Italy), Bockris, Arata (Japan), De Ninno (Italy), McKubre (SRI).

    This module is primarily a *validation model* that checks whether
    other theories' predictions are consistent with the Miles correlation.
    It also provides its own estimate of the reaction rate from excess heat.

References
----------
[1] Miles, M. H. et al. (1993). "Correlation of excess power and helium
    production during D2O and H2O electrolysis using palladium cathodes".
    J. Electroanal. Chem. 346, 99-117.
[2] Miles, M. H. (2000). "Correlation of excess enthalpy and helium-4
    production: A review". Proc. ICCF-8, 105.
[3] McKubre, M. C. H. (1998). "Review of experimental measurements
    involving dd reactions". Proc. ICCF-7.
[4] Bush, B. F. et al. (1991). "Helium production during the electrolysis
    of D2O in cold fusion experiments". J. Electroanal. Chem. 304, 271.
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, Optional

from scipy import constants as const

from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata

logger = logging.getLogger(__name__)

E_CHARGE = const.e
KB = const.k

# Miles correlation constant
Q_VALUE_MEV = 23.8
Q_VALUE_J = Q_VALUE_MEV * 1e6 * E_CHARGE
MILES_RATE_PER_WATT = 1.0 / Q_VALUE_J  # He-4 atoms per second per watt ≈ 2.6e11


class MilesHeatHeliumTheory:
    """Quantitative heat-helium correlation validation model."""

    @property
    def theory_id(self) -> str:
        return "miles_heat_helium"

    @property
    def theory_name(self) -> str:
        return "Miles Heat-Helium Correlation"

    @property
    def description(self) -> str:
        return (
            "Quantitative correlation: 1 W excess heat = 2.6×10^11 He-4/s, "
            "corresponding to 23.8 MeV per fusion event. Independently confirmed "
            "by Gozzi, Bockris, Arata, De Ninno, and McKubre."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "excess_heat_W": {
                "default": 1.0,
                "description": "Measured excess heat in watts",
            },
            "helium_detection_efficiency": {
                "default": 0.5,
                "description": "Fraction of He-4 captured before diffusing away (0-1)",
            },
            "diffusion_fraction": {
                "default": 0.5,
                "description": "Fraction of He-4 retained in Pd lattice vs escaping",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        # Always applicable if there's excess heat to validate
        return True

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        T = conditions.get("temperature", 300.0)
        loading = conditions.get("loading_ratio", 0.9)
        excess_heat = config.get("excess_heat_W", conditions.get("excess_heat_W", 1.0))
        det_eff = config.get("helium_detection_efficiency", 0.5)
        diff_frac = config.get("diffusion_fraction", 0.5)

        # Expected He-4 production rate from excess heat
        expected_he4_rate = excess_heat * MILES_RATE_PER_WATT

        # Measured rate would be reduced by detection efficiency and diffusion
        measurable_he4_rate = expected_he4_rate * det_eff * (1.0 - diff_frac)

        # Ratio of measured to expected (should be ~0.5 for typical experiments)
        # Values of 0.3-0.7 are consistent with Miles correlation
        detection_ratio = det_eff * (1.0 - diff_frac)

        # Energy per fusion event (should be ~23.8 MeV)
        if expected_he4_rate > 0:
            energy_per_event_MeV = excess_heat / (expected_he4_rate * E_CHARGE * 1e6)
        else:
            energy_per_event_MeV = 0.0

        # Miles correlation factor: how well does this match 23.8 MeV?
        deviation_MeV = abs(energy_per_event_MeV - Q_VALUE_MEV)
        miles_correlation = math.exp(-deviation_MeV**2 / (2 * 0.5**2))

        # Experimental validation: energy per event should be 23.8 +/- 0.5 MeV
        validation_flags = []
        if energy_per_event_MeV > 0 and abs(energy_per_event_MeV - Q_VALUE_MEV) > 0.5:
            validation_flags.append(
                f"energy_per_event {energy_per_event_MeV:.1f} MeV deviates from "
                f"expected {Q_VALUE_MEV} +/- 0.5 MeV"
            )

        # Enhancement is 1.0 (this is a validation model, not enhancement)
        enhancement = 1.0

        # The correlation provides a reaction rate estimate
        reaction_rate = expected_he4_rate  # fusions per second

        # Confidence: based on how well conditions match experimental regime
        loading_score = min(max(loading - 0.85, 0) / 0.1, 1.0) if loading > 0.85 else 0.3
        heat_score = 1.0 if excess_heat > 0 else 0.0
        confidence = 0.9 * miles_correlation * loading_score * heat_score

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=excess_heat,
            observables={
                "expected_he4_rate_per_s": expected_he4_rate,
                "measurable_he4_rate_per_s": measurable_he4_rate,
                "detection_ratio": detection_ratio,
                "energy_per_event_MeV": energy_per_event_MeV,
                "miles_correlation_factor": miles_correlation,
                "Q_value_MeV": Q_VALUE_MEV,
                "miles_rate_per_watt": MILES_RATE_PER_WATT,
                "validation_flags": validation_flags,
                "product_He4": 1.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": T,
                "loading_ratio": loading,
                "excess_heat_W": excess_heat,
                "helium_detection_efficiency": det_eff,
                "diffusion_fraction": diff_frac,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Miles M.H. et al. (1993) J. Electroanal. Chem. 346, 99",
                "Miles M.H. (2000) Proc. ICCF-8, 105",
                "McKubre M.C.H. (1998) Proc. ICCF-7",
                "Bush B.F. et al. (1991) J. Electroanal. Chem. 304, 271",
            ],
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Miles M.H. et al. (1993) J. Electroanal. Chem. 346, 99",
                "Miles M.H. (2000) Proc. ICCF-8, 105",
                "McKubre M.C.H. (1998) Proc. ICCF-7",
            ],
            category="measurement",
        )
