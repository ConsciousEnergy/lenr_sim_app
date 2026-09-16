"""
Electron Screening Theory Module

Refactored from ``unified_lenr_model._calculate_electron_screening()`` into a
standalone :class:`TheoryModule` implementation.

Physics (Section 2.1):
    Electron screening in the host lattice reduces the effective Coulomb
    barrier by a material-dependent potential (tens to hundreds of eV; cited
    ranges in screening_data.py, e.g. Pd typical 800 eV), exponentially
    enhancing low-energy tunnelling rates.

    U_s = Z₁Z₂e² / (4πε₀ λ_D)
    f_screen = exp(π η U_s / E)
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional

import numpy as np
from scipy import constants as const

from app.physics_engine.theory_protocol import (
    TheoryContribution,
    TheoryMetadata,
)
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics.electron_screening import (
    calculate_screening_potential,
    classify_screening_regime,
    calculate_enhancement_factor,
)

logger = logging.getLogger(__name__)

# Physical constants
HBAR = const.hbar
E_CHARGE = const.e
KB = const.k
EPS0 = const.epsilon_0
ME = const.m_e
MP = const.m_p
ALPHA = const.alpha
C = const.c


class ElectronScreeningTheory:
    """Debye electron screening enhancement for LENR tunnelling."""

    # -- TheoryModule protocol properties ----------------------------------

    @property
    def theory_id(self) -> str:
        return "electron_screening"

    @property
    def theory_name(self) -> str:
        return "Electron Screening"

    @property
    def description(self) -> str:
        return (
            "Electron screening in the host lattice reduces the effective "
            "Coulomb barrier by a material-dependent cited potential (tens to "
            "hundreds of eV), exponentially enhancing low-energy tunnelling."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "Z1": {"default": 1, "description": "Charge number of reactant 1"},
            "Z2": {"default": 1, "description": "Charge number of reactant 2"},
            "screening_model": {
                "default": "thomas_fermi",
                "description": "Screening model",
                "options": ["debye", "thomas_fermi", "strong", "anomalous"],
            },
            "material": {"default": "palladium", "description": "Host material"},
        }

    # -- TheoryModule protocol methods -------------------------------------

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        temperature = conditions.get("temperature", 0)
        electron_density = conditions.get("electron_density", 0)
        return temperature > 0 and electron_density > 0

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        T = conditions.get("temperature", 300.0)
        n_e = conditions.get("electron_density", 6.8e28)
        Z1 = config.get("Z1", 1)
        Z2 = config.get("Z2", 1)

        if not self.is_applicable(conditions):
            return self._neutral("Conditions outside applicability range")

        # Screening potential (physics module)
        U_unit_ev = calculate_screening_potential(
            n_e, 5.0, T,
            model=config.get("screening_model", "thomas_fermi"),
            material=config.get("material", "palladium"),
        )
        U_screen_ev = Z1 * Z2 * U_unit_ev
        lambda_d = math.sqrt(EPS0 * KB * T / (n_e * E_CHARGE**2))

        # --- Rydberg matter enhancement (integrated from legacy module) ---
        # High-n Rydberg states create extended electron orbitals that
        # further reduce the effective Coulomb barrier.
        rydberg_enh_factor = 1.0
        try:
            from app.physics.rydberg_matter import (
                calculate_rydberg_enhancement,
                calculate_formation_probability,
            )
            n_rydberg = config.get("rydberg_n", 10)
            rm_density = config.get("rydberg_density", 1e24)
            rm_prob = calculate_formation_probability(T, 1e7)
            if rm_prob > 0.01:
                rm_enh = calculate_rydberg_enhancement(n_rydberg, rm_density, T)
                # Modulate by formation probability; cap contribution
                rydberg_enh_factor = 1.0 + min(rm_enh * rm_prob, 1e4) * 0.001
                U_screen_ev *= rydberg_enh_factor
        except Exception:
            logger.debug("Rydberg matter integration unavailable, skipping")

        # Enhancement factor via physics module
        E_thermal_ev = max(1.5 * KB * T / E_CHARGE, 0.01)
        enhancement = calculate_enhancement_factor(
            int(Z1), int(Z2), U_screen_ev, E_thermal_ev / 1000.0, 1.0
        )
        enhancement = min(enhancement, MAX_ENHANCEMENT_FACTOR)

        threshold_met = U_screen_ev > 10.0
        confidence = min(1.0, U_screen_ev / 100.0) if threshold_met else U_screen_ev / 100.0

        regime = classify_screening_regime(U_screen_ev, E_thermal_ev)

        # Experimental validation: anomalous screening > 800 eV is outside
        # measured ranges (Kasagi et al. 2002 report ~300-800 eV for Pd-D)
        validation_flags: list[str] = []
        if U_screen_ev > 800:
            validation_flags.append(
                f"screening potential {U_screen_ev:.0f} eV exceeds experimental "
                f"range (max ~800 eV for Pd-D, Kasagi et al.)"
            )

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=0.0,
            observables={
                "screening_potential_eV": float(U_screen_ev),
                "debye_length_nm": float(lambda_d * 1e9),
                "screening_regime": str(regime["regime"]),
                "salpeter_valid": bool(regime["salpeter_valid"]),
                "rydberg_enhancement_factor": rydberg_enh_factor,
                "validation_flags": validation_flags,
                # Screening enhances D+D -> He-4 pathway (dominant LENR channel)
                "product_He4": 1.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": T,
                "electron_density": n_e,
                "Z1": Z1,
                "Z2": Z2,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Assenbaum H.J. et al. (1987), Z. Phys. A 327, 461",
                "Ichimaru S. (1993), Rev. Mod. Phys. 65, 255",
            ],
            primary_sources=[
                "Assenbaum H.J. et al. (1987), Z. Phys. A 327, 461",
                "Ichimaru S. (1993), Rev. Mod. Phys. 65, 255",
            ],
            theory_model_version="electron_screening_shared_v1",
            author_equations_vs_simulator_approximations={
                "salpeter_screening": "author_equations_approx",
                "role": "shared_mechanism_not_named_lenr_author",
            },
            source_domain_limits=[
                "Shared condensed-matter screening layer; not a named LENR author theory.",
                "Anomalous U_e > ~800 eV flagged outside Kasagi Pd-D range.",
            ],
            model_fidelity="approximate",
            empirical_support="domain_limited",
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Assenbaum H.J. et al. (1987), Z. Phys. A 327, 461",
                "Ichimaru S. (1993), Rev. Mod. Phys. 65, 255",
            ],
            category="primary",
            primary_sources=[
                "Assenbaum H.J. et al. (1987), Z. Phys. A 327, 461",
                "Ichimaru S. (1993), Rev. Mod. Phys. 65, 255",
            ],
            theory_model_version="electron_screening_shared_v1",
            model_fidelity="approximate",
            empirical_support="domain_limited",
            control_role="shared_mechanism",
        )

    # -- Helpers -----------------------------------------------------------

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("ElectronScreening not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
