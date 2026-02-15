"""
Swartz NANOR / LANR Optimal Operating Point Theory Module

Physics:
    Mitchell Swartz identified an Optimal Operating Point (OOP) in the
    2D parameter space of deuterium loading ratio vs. applied current
    density.  LANR (Lattice Assisted Nuclear Reactions) excess heat is
    maximised at a specific (loading, current) coordinate, and falls
    off rapidly when either parameter deviates.

    The NANOR device (ZrO2-PdD nanomaterial) demonstrated reproducible
    excess heat at MIT for extended periods when operated near the OOP.

    The model uses a 2D Gaussian response surface centred on the OOP,
    modulated by material quality and electrochemical parameters.

References
----------
[1] Swartz, M. (2006). "Optimal Operating Point Characteristics".
    Proc. ICCF-11, 335-346.
[2] Swartz, M. & Hagelstein, P. L. (2015). "Demonstration of energy
    gain from a preloaded ZrO2-PdD nanostructured material".
    J. Condensed Matter Nucl. Sci. 15, 66.
[3] Swartz, M. (2021). "Excess heat from NANOR-type CF/LANR quantum
    electronic devices". J. Condensed Matter Nucl. Sci. 33, 1-26.
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, Optional

from scipy import constants as const

from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

logger = logging.getLogger(__name__)

E_CHARGE = const.e
KB = const.k

# Optimal Operating Point coordinates (from Swartz experimental data)
OOP_LOADING_DEFAULT = 0.90   # D/Pd ratio at OOP
OOP_CURRENT_DEFAULT = 50.0   # mA/cm² at OOP


class SwartzNanorTheory:
    """LANR Optimal Operating Point model for NANOR/ZrO2-PdD systems."""

    @property
    def theory_id(self) -> str:
        return "swartz_nanor"

    @property
    def theory_name(self) -> str:
        return "Swartz NANOR/LANR Optimal Operating Point"

    @property
    def description(self) -> str:
        return (
            "Lattice Assisted Nuclear Reactions exhibit a sharp Optimal Operating "
            "Point (OOP) in the loading-current parameter space. The NANOR device "
            "(ZrO2-PdD nanostructure) shows reproducible excess heat at the OOP "
            "with a Gaussian falloff when parameters deviate."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "oop_loading_target": {
                "default": OOP_LOADING_DEFAULT,
                "description": "Optimal loading ratio D/Pd at OOP",
            },
            "oop_current_target": {
                "default": OOP_CURRENT_DEFAULT,
                "description": "Optimal current density mA/cm² at OOP",
            },
            "loading_sigma": {
                "default": 0.05,
                "description": "Width of Gaussian in loading dimension",
            },
            "current_sigma": {
                "default": 15.0,
                "description": "Width of Gaussian in current dimension (mA/cm²)",
            },
            "max_excess_power_W": {
                "default": 0.08,
                "description": "Peak excess power at OOP in watts (NANOR scale)",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        loading = conditions.get("loading_ratio", 0)
        return loading > 0

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        T = conditions.get("temperature", 300.0)
        loading = conditions.get("loading_ratio", 0.9)
        current_density = conditions.get("current_density_mA_cm2", 50.0)
        pressure = conditions.get("pressure", 101325.0)

        if not self.is_applicable(conditions):
            return self._neutral("Loading ratio is zero")

        oop_L = config.get("oop_loading_target", OOP_LOADING_DEFAULT)
        oop_J = config.get("oop_current_target", OOP_CURRENT_DEFAULT)
        sigma_L = config.get("loading_sigma", 0.05)
        sigma_J = config.get("current_sigma", 15.0)
        P_max = config.get("max_excess_power_W", 0.08)

        # 2D Gaussian response surface: OOP model
        # P_excess = P_max × exp(-((L-L0)/(2σL))² - ((J-J0)/(2σJ))²)
        dL = (loading - oop_L) / max(sigma_L, 1e-10)
        dJ = (current_density - oop_J) / max(sigma_J, 1e-10)
        oop_response = math.exp(-0.5 * (dL**2 + dJ**2))

        excess_power_W = P_max * oop_response

        # Enhancement factor: proportional to OOP proximity
        enhancement = max(1.0, 1.0 + oop_response * 100.0)
        enhancement = min(enhancement, MAX_ENHANCEMENT_FACTOR)

        # Material quality factor: NANOR uses ZrO2-PdD nanostructure
        # which has higher surface area and more NAE sites
        nano_factor = 1.0  # baseline; could be parameterised

        # Coefficient of Performance
        input_power_est = current_density * 1e-3 * 1.5  # rough V×I estimate
        cop = (excess_power_W + input_power_est) / max(input_power_est, 1e-10)

        # Confidence: based on OOP proximity and loading quality
        oop_proximity = oop_response
        loading_quality = min(loading / oop_L, 1.0)
        confidence = 0.8 * oop_proximity * loading_quality  # 0.8 = well-replicated model

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=excess_power_W,
            observables={
                "oop_response": oop_response,
                "excess_power_W": excess_power_W,
                "distance_from_oop_loading": abs(loading - oop_L),
                "distance_from_oop_current": abs(current_density - oop_J),
                "cop": cop,
                "oop_loading_target": oop_L,
                "oop_current_target": oop_J,
                # NANOR/LANR produces He-4 (Swartz & Hagelstein 2015)
                "product_He4": 1.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": T,
                "loading_ratio": loading,
                "current_density_mA_cm2": current_density,
                "oop_loading_target": oop_L,
                "oop_current_target": oop_J,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Swartz M. (2006) Proc. ICCF-11, 335",
                "Swartz M. & Hagelstein P.L. (2015) JCMNS 15, 66",
                "Swartz M. (2021) JCMNS 33, 1",
            ],
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Swartz M. (2006) Proc. ICCF-11, 335",
                "Swartz M. & Hagelstein P.L. (2015) JCMNS 15, 66",
            ],
            category="engineering",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("SwartzNanor not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
