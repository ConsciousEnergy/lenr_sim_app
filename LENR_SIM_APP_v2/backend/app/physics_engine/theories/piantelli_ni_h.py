"""
Piantelli Ni-H Theory Module

Physics:
    Francesco Piantelli demonstrated excess heat in Ni-H systems with
    a critical thermal activation threshold at approximately 400-700 K.
    Gaseous H₂ at sub-atmospheric pressures interacts with nickel
    surfaces (preferably nanostructured) to produce excess heat when
    the system is activated above the threshold temperature.

    Key features:
    - Arrhenius-type onset above thermal threshold
    - Excess heat scales with Ni surface area (not volume)
    - H₂ gas at ~0.1-1 bar pressure
    - No dangerous radiation detected
    - Prolonged operation demonstrated

References
----------
[1] Focardi, S. & Piantelli, F. (1998). "Anomalous heat production
    in Ni-H systems". Nuovo Cimento A 111, 1233-1242.
[2] Piantelli, F. (2012). Patent WO2012147045A1 "Method and apparatus
    for generating energy by nuclear reactions of hydrogen adsorbed by
    orbital capture on a nanocrystalline structure of a metal".
[3] Focardi, S. et al. (1994). "Anomalous heat production in Ni-H
    systems". Proc. ICCF-4, EPRI TR-104188.
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
HBAR = const.hbar
MP = const.m_p
C = const.c
ALPHA = const.alpha


class PiantelliNiHTheory:
    """Ni-H thermal activation model for excess heat generation."""

    @property
    def theory_id(self) -> str:
        return "piantelli_ni_h"

    @property
    def theory_name(self) -> str:
        return "Piantelli Ni-H Thermal Activation"

    @property
    def description(self) -> str:
        return (
            "Ni-H system with critical thermal activation threshold (~400-700 K). "
            "Gaseous H₂ at sub-atmospheric pressures interacts with nanostructured "
            "Ni surfaces to produce excess heat via Arrhenius-type onset. "
            "Excess heat scales with surface area."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "activation_energy_eV": {
                "default": 0.5,
                "description": "Activation energy for excess heat onset (eV)",
            },
            "h2_pressure_Pa": {
                "default": 50000.0,
                "description": "H₂ gas pressure in Pascals (0.5 bar default)",
            },
            "ni_surface_area_m2": {
                "default": 0.01,
                "description": "Effective Ni surface area in m²",
            },
            "threshold_temperature_K": {
                "default": 500.0,
                "description": "Thermal activation threshold temperature in K",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        T = conditions.get("temperature", 0)
        return T > 200  # minimum for Ni-H system

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        T = conditions.get("temperature", 300.0)
        loading = conditions.get("loading_ratio", 0.5)
        pressure = conditions.get("pressure", 50000.0)

        if not self.is_applicable(conditions):
            return self._neutral("Temperature too low for Ni-H system")

        E_act = config.get("activation_energy_eV", 0.5) * E_CHARGE
        P_h2 = config.get("h2_pressure_Pa", pressure)
        A_surface = config.get("ni_surface_area_m2", 0.01)
        T_threshold = config.get("threshold_temperature_K", 500.0)

        # Arrhenius activation: rate ∝ exp(-E_act / k_B T)
        arrhenius_factor = math.exp(-E_act / (KB * T))

        # Threshold function: smooth onset above T_threshold
        # Using a sigmoid: f(T) = 1 / (1 + exp(-(T - T_thresh) / width))
        sigmoid_width = 50.0  # K, transition width
        threshold_factor = 1.0 / (1.0 + math.exp(-(T - T_threshold) / sigmoid_width))

        # Pressure dependence: optimal at ~0.5 bar
        P_optimal = 50000.0  # Pa
        pressure_factor = math.exp(-((P_h2 - P_optimal) / P_optimal)**2)

        # Surface area scaling (key Piantelli prediction)
        A_reference = 0.01  # m², reference area
        surface_factor = A_surface / A_reference

        # Combined excess heat estimate
        # Base power: ~10 W for reference conditions (from Focardi/Piantelli)
        P_base = 10.0  # W
        excess_power = (
            P_base * arrhenius_factor * threshold_factor
            * pressure_factor * surface_factor
        )

        # Enhancement factor
        enhancement = max(1.0, threshold_factor * arrhenius_factor * 1e3)
        enhancement = min(enhancement, MAX_ENHANCEMENT_FACTOR)

        # Confidence
        temp_score = threshold_factor
        pressure_score = pressure_factor
        confidence = 0.7 * temp_score * pressure_score  # 0.7 = experimentally demonstrated

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=excess_power,
            observables={
                "arrhenius_factor": arrhenius_factor,
                "threshold_factor": threshold_factor,
                "pressure_factor": pressure_factor,
                "surface_factor": surface_factor,
                "excess_power_W": excess_power,
                "T_threshold_K": T_threshold,
                "activation_energy_eV": E_act / E_CHARGE,
                "h2_pressure_bar": P_h2 / 1e5,
                "product_He4": 0.0,  # Ni-H: proton reactions, not D-D
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": T,
                "loading_ratio": loading,
                "h2_pressure_Pa": P_h2,
                "ni_surface_area_m2": A_surface,
                "threshold_temperature_K": T_threshold,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Focardi S. & Piantelli F. (1998) Nuovo Cimento A 111, 1233",
                "Piantelli F. (2012) Patent WO2012147045A1",
                "Focardi S. et al. (1994) Proc. ICCF-4, EPRI TR-104188",
            ],
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Focardi S. & Piantelli F. (1998) Nuovo Cimento A 111, 1233",
                "Piantelli F. (2012) Patent WO2012147045A1",
            ],
            category="engineering",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("PiantelliNiH not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
