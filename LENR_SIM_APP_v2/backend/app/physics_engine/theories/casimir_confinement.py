"""
Casimir Confinement Theory Module

Refactored from ``unified_lenr_model._calculate_casimir_enhancement()`` and
``casimir_forces.py`` with the addition of Lifshitz finite-conductivity
corrections.

Physics:
    Casimir force F = -π²ħc/(240 d⁴) × A creates an attractive pressure
    between closely spaced surfaces.  At nano-scale separations during bubble
    collapse or in lattice nano-cracks this effect provides additional
    confinement energy.  The Lifshitz correction accounts for the finite
    conductivity of real metals.

References:
    Casimir H.B.G. (1948), Proc. Kon. Ned. Akad. Wet. 51, 793
    Lifshitz E.M. (1956), Sov. Phys. JETP 2, 73
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
C = const.c
KB = const.k
EPS0 = const.epsilon_0
E_CHARGE = const.e


class CasimirConfinementTheory:
    """Casimir vacuum-fluctuation confinement with Lifshitz correction."""

    @property
    def theory_id(self) -> str:
        return "casimir_confinement"

    @property
    def theory_name(self) -> str:
        return "Casimir Confinement"

    @property
    def description(self) -> str:
        return (
            "Quantum vacuum fluctuation force between closely spaced surfaces "
            "provides confinement energy at nano-scale separations, with "
            "Lifshitz finite-conductivity correction for real metals."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "separation_nm": {
                "default": 5.0,
                "description": "Surface separation distance (nm)",
            },
            "effective_area_nm2": {
                "default": 2500.0,
                "description": "Effective interaction area (nm²)",
            },
            "plasma_frequency_rad_s": {
                "default": 1.37e16,
                "description": "Metal plasma frequency for Lifshitz correction (rad/s, Pd default)",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        # Casimir is relevant when nano-scale separations exist
        sep = conditions.get("surface_roughness", conditions.get("separation_nm", 50))
        # If surface_roughness is in metres, convert
        if sep < 1e-6:  # likely metres
            sep_nm = sep * 1e9
        else:
            sep_nm = sep
        return sep_nm < 100.0  # only relevant below 100 nm

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        T = conditions.get("temperature", 300.0)

        # Separation: prefer config, then conditions in nm, then surface_roughness in m
        sep_nm = config.get("separation_nm")
        if sep_nm is None:
            sr = conditions.get("surface_roughness", 5e-9)
            sep_nm = sr * 1e9 if sr < 1e-6 else sr

        area_nm2 = config.get("effective_area_nm2", 2500.0)
        plasma_freq = config.get("plasma_frequency_rad_s", 1.37e16)

        sep_m = sep_nm * 1e-9
        area_m2 = area_nm2 * 1e-18

        if sep_m <= 0:
            return self._neutral("Separation must be positive")

        # --- Ideal Casimir force & pressure ---
        F_casimir = math.pi**2 * HBAR * C / 240.0 * area_m2 / sep_m**4
        P_casimir = math.pi**2 * HBAR * C / (240.0 * sep_m**4)

        # --- Lifshitz finite-conductivity correction ---
        skin_depth = C / plasma_freq  # δ = c/ω_p
        correction_ratio = 1.0 - (16.0 / 3.0) * (skin_depth / sep_m)
        correction_ratio = max(correction_ratio, 0.01)

        F_corrected = F_casimir * correction_ratio
        P_corrected = P_casimir * correction_ratio

        # --- Confinement energy ---
        # Energy ∝ F × d
        confinement_energy_J = F_corrected * sep_m
        confinement_energy_eV = confinement_energy_J / E_CHARGE

        # --- Enhancement factor ---
        # Compare Casimir pressure to atmospheric and scale logarithmically
        P_atm = 101325.0
        if P_corrected > P_atm:
            enhancement = 1.0 + math.log10(P_corrected / P_atm)
        else:
            enhancement = 1.0

        enhancement = max(1.0, min(enhancement, MAX_ENHANCEMENT_FACTOR))

        # Confidence: inversely proportional to separation
        confidence = min(1.0, 10.0 / max(sep_nm, 0.1))

        # Thermal regime flag
        thermal_length = HBAR * C / (2.0 * math.pi * KB * T)
        in_thermal_regime = sep_m > thermal_length

        # Domain validity: Lifshitz model extrapolated below ~2 nm
        domain_valid = sep_nm >= 2.0
        warning = (
            "Lifshitz model extrapolated below 2 nm; surface roughness and "
            "non-locality effects may dominate"
            if not domain_valid
            else None
        )

        observables: Dict[str, Any] = {
            "F_casimir_ideal_N": F_casimir,
            "F_casimir_corrected_N": F_corrected,
            "P_casimir_corrected_Pa": P_corrected,
            "skin_depth_nm": skin_depth * 1e9,
            "lifshitz_correction_ratio": correction_ratio,
            "confinement_energy_eV": confinement_energy_eV,
            "in_thermal_regime": float(in_thermal_regime),
            "domain_valid": domain_valid,
            # Casimir confinement supports D+D -> He-4 pathway
            "product_He4": 1.0,
            "product_neutrons": 0.0,
            "product_gamma": 0.0,
        }
        if warning is not None:
            observables["warning"] = warning

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=0.0,
            observables=observables,
            parameters_used={
                "temperature": T,
                "separation_nm": sep_nm,
                "effective_area_nm2": area_nm2,
                "plasma_frequency_rad_s": plasma_freq,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Casimir H.B.G. (1948), Proc. Kon. Ned. Akad. Wet. 51, 793",
                "Lifshitz E.M. (1956), Sov. Phys. JETP 2, 73",
                "Klimchitskaya G.L. et al. (2009), Rev. Mod. Phys. 81, 1827",
            ],
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Casimir (1948)",
                "Lifshitz (1956)",
                "Klimchitskaya et al. (2009)",
            ],
            category="secondary",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("CasimirConfinement not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
