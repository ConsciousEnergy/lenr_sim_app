"""
Quantum Tunneling Theory Module

Wraps the existing ``physics.quantum_tunneling`` module into the
TheoryModule interface.  This provides the *base tunnelling rate* that
other theories (screening, QED, etc.) modify multiplicatively.

Physics (Section 2.8):
    P_tunnel = exp(-2S/ħ) where S is the WKB action integral through the
    Coulomb barrier.  This module also provides the Gamow factor calculation.

References:
    Gamow G. (1928), Z. Phys. 51, 204
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional

import numpy as np
from scipy import constants as const

from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

logger = logging.getLogger(__name__)

HBAR = const.hbar
E_CHARGE = const.e
KB = const.k
C = const.c
MP = const.m_p
ALPHA = const.alpha
EPS0 = const.epsilon_0


class QuantumTunnelingTheory:
    """Base quantum tunnelling rate (Gamow / WKB)."""

    @property
    def theory_id(self) -> str:
        return "quantum_tunneling"

    @property
    def theory_name(self) -> str:
        return "Quantum Tunneling (Base Rate)"

    @property
    def description(self) -> str:
        return (
            "WKB / Gamow calculation of the bare Coulomb barrier tunnelling "
            "probability.  This provides the base rate that other theories modify."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "Z1": {"default": 1, "description": "Charge number of reactant 1"},
            "Z2": {"default": 1, "description": "Charge number of reactant 2"},
            "A1": {"default": 2.014, "description": "Mass number of reactant 1 (amu)"},
            "A2": {"default": 2.014, "description": "Mass number of reactant 2 (amu)"},
            "model": {
                "default": "gamow",
                "description": "Tunnelling model: 'gamow' or 'wkb'",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        temperature = conditions.get("temperature", 0)
        return temperature > 0

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        T = conditions.get("temperature", 300.0)
        Z1 = int(config.get("Z1", 1))
        Z2 = int(config.get("Z2", 1))
        A1 = config.get("A1", 2.014)
        A2 = config.get("A2", 2.014)

        if not self.is_applicable(conditions):
            return self._neutral("Temperature must be > 0")

        # Reduced mass
        amu_kg = const.u
        m_reduced = (A1 * A2 / (A1 + A2)) * amu_kg  # kg

        # Thermal energy
        E_thermal = 1.5 * KB * T  # Joules
        E_thermal_eV = E_thermal / E_CHARGE

        # Sommerfeld parameter η = Z₁Z₂α √(m_r c² / 2E)
        m_r_c2 = m_reduced * C**2  # Joules
        eta = Z1 * Z2 * ALPHA * math.sqrt(m_r_c2 / (2.0 * E_thermal))

        # Gamow tunnelling probability
        gamow_exponent = 2.0 * math.pi * eta
        # Clip to avoid underflow (exp(-700) ~ 1e-304)
        gamow_exponent = min(gamow_exponent, 700.0)
        P_gamow = math.exp(-gamow_exponent)

        # Coulomb barrier height (for info)
        r_nuclear = 1.2e-15 * (A1 ** (1.0 / 3.0) + A2 ** (1.0 / 3.0))
        V_coulomb_J = Z1 * Z2 * E_CHARGE**2 / (4 * math.pi * EPS0 * r_nuclear)
        V_coulomb_eV = V_coulomb_J / E_CHARGE

        # The tunnelling probability IS the base rate; enhancement = 1
        # since this IS the base.  Other theories multiply on top.
        enhancement = 1.0

        confidence = 1.0  # Always applicable given T > 0

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=1.0,
            energy_output_watts=0.0,
            observables={
                "gamow_probability": P_gamow,
                "sommerfeld_parameter": eta,
                "gamow_exponent": gamow_exponent,
                "coulomb_barrier_eV": V_coulomb_eV,
                "thermal_energy_eV": E_thermal_eV,
                "nuclear_radius_fm": r_nuclear * 1e15,
                # Base tunneling for D+D -> He-4 fusion pathway
                "product_He4": 1.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": T,
                "Z1": Z1,
                "Z2": Z2,
                "A1": A1,
                "A2": A2,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Gamow G. (1928), Z. Phys. 51, 204",
                "Wentzel G. (1926), Z. Phys. 38, 518 (WKB)",
            ],
            primary_sources=[
                "Gamow G. (1928), Z. Phys. 51, 204",
                "Wentzel G. (1926), Z. Phys. 38, 518 (WKB)",
            ],
            theory_model_version="quantum_tunneling_baseline_v1",
            author_equations_vs_simulator_approximations={
                "gamow_wkb": "author_equations",
                "role": "conventional_dd_baseline",
            },
            source_domain_limits=[
                "Identity enhancement (baseline); not a LENR mechanism claim.",
            ],
            model_fidelity="high",
            empirical_support="established",
            claim_tier="established_reference",
            evidence_class="established_physics",
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Gamow (1928)",
                "Wentzel (1926) WKB",
            ],
            category="base",
            primary_sources=[
                "Gamow G. (1928), Z. Phys. 51, 204",
                "Wentzel G. (1926), Z. Phys. 38, 518 (WKB)",
            ],
            theory_model_version="quantum_tunneling_baseline_v1",
            model_fidelity="high",
            empirical_support="established",
            control_role="baseline",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("QuantumTunneling not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
