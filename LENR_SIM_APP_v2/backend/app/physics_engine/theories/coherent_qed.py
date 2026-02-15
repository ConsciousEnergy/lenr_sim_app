"""
Confined-Mode QED / Coherent Domain Theory Module

Implements Del Giudice / Preparata coherent EM domains with geometry-dependent
vacuum modification, replacing the Schwinger bulk vacuum polarisation (which
gives negligible ~10^-23 corrections at LENR fields).

Physics:
    - In nano-gaps, photon modes with λ > 2d are excluded, modifying virtual
      photon exchange (analogous to Casimir but for exchange photons).
    - In coherent EM domains, N particles collectively couple to the radiation
      field producing superradiant energy scaling.
    - Subsumes BEC-like effects: coherent domains form at room temperature,
      avoiding the implausible T_c ~ 7.9 K requirement for deuteron BEC.

References:
    Del Giudice & Preparata (1998), J. Biol. Phys. 24, 121-137
    Preparata G. (1995) "QED Coherence in Matter", World Scientific
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
ME = const.m_e
ALPHA = const.alpha


class CoherentQEDTheory:
    """Confined-mode QED and Del Giudice / Preparata coherent domain theory."""

    @property
    def theory_id(self) -> str:
        return "coherent_qed"

    @property
    def theory_name(self) -> str:
        return "Confined-Mode QED / Coherent Domains"

    @property
    def description(self) -> str:
        return (
            "Geometry-dependent vacuum modification in nano-gaps and "
            "Del Giudice/Preparata coherent EM domains with collective "
            "N-particle coupling. Replaces Schwinger bulk vacuum polarisation."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "gap_width_m": {
                "default": 1e-9,
                "description": "Confinement gap width in metres (0.5-5 nm typical)",
            },
            "coherence_domain_radius_m": {
                "default": 50e-9,
                "description": "Radius of the coherent EM domain (m)",
            },
            "particle_count_N": {
                "default": None,
                "description": "Override for N (computed from density if None)",
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
        n_e = conditions.get("electron_density", 6.8e28)
        gap_width = config.get("gap_width_m", conditions.get("gap_width_m", 1e-9))
        domain_radius = config.get(
            "coherence_domain_radius_m",
            conditions.get("coherence_domain_radius_m", 50e-9),
        )
        particle_override = config.get("particle_count_N")
        phonon_freq = conditions.get("phonon_frequency", 1e13)

        if not self.is_applicable(conditions):
            return self._neutral("Temperature must be > 0")

        gap_width = max(gap_width, 1e-12)
        domain_radius = max(domain_radius, 1e-9)

        # --- Confined-mode QED contribution ---
        lambda_c = HBAR / (ME * C)  # Compton wavelength ~3.86e-13 m
        mode_suppression = min(lambda_c / (2.0 * gap_width), 0.5)

        vacuum_energy_density = (
            math.pi**2 * HBAR * C / (720.0 * gap_width**3)
        )

        domain_volume = (4.0 / 3.0) * math.pi * domain_radius**3
        N = particle_override if particle_override else n_e * domain_volume
        N = max(N, 1.0)
        collective_factor = math.sqrt(N)

        barrier_reduction_eV = (
            vacuum_energy_density * gap_width**3 / E_CHARGE
        ) * mode_suppression * min(collective_factor, 1e12)

        kB_T = KB * T
        coherence_energy = HBAR * C / domain_radius
        decoherence_factor = math.exp(-kB_T / max(coherence_energy, 1e-30))

        confined_enhancement = 1.0 + barrier_reduction_eV * decoherence_factor
        confined_enhancement = min(confined_enhancement, MAX_ENHANCEMENT_FACTOR)

        # --- Coherent domain contribution ---
        phonon_energy = HBAR * phonon_freq
        coherent_energy = N * ALPHA * phonon_energy
        coherence_fraction = math.exp(-kB_T / max(coherent_energy, 1e-30))
        coherence_fraction = max(coherence_fraction, 1e-20)

        N_eff = max(N * coherence_fraction, 1.0)
        domain_enhancement = 1.0 + math.sqrt(N_eff) * ALPHA
        domain_enhancement = min(domain_enhancement, MAX_ENHANCEMENT_FACTOR)

        formation_energy_eV = -coherent_energy * coherence_fraction / E_CHARGE

        # Combined enhancement (multiplicative)
        total_enhancement = min(
            confined_enhancement * domain_enhancement, MAX_ENHANCEMENT_FACTOR
        )

        # Confidence: higher when gap is small and domain is large
        gap_score = min(1.0, 1e-9 / gap_width)
        domain_score = min(1.0, domain_radius / 100e-9)
        confidence = (gap_score + domain_score) / 2.0

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=total_enhancement,
            reaction_rate_modifier=total_enhancement,
            energy_output_watts=0.0,
            observables={
                "mode_suppression_fraction": mode_suppression,
                "vacuum_energy_density_J_m3": vacuum_energy_density,
                "N_particles_in_domain": N,
                "effective_coherent_N": N_eff,
                "barrier_reduction_eV": barrier_reduction_eV,
                "decoherence_factor": decoherence_factor,
                "formation_energy_eV": formation_energy_eV,
                "confined_enhancement": confined_enhancement,
                "domain_enhancement": domain_enhancement,
                # Coherent domains favor He-4 channel (Del Giudice & Preparata)
                "product_He4": 1.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": T,
                "electron_density": n_e,
                "gap_width_m": gap_width,
                "coherence_domain_radius_m": domain_radius,
                "phonon_frequency": phonon_freq,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Del Giudice & Preparata (1998), J. Biol. Phys. 24, 121-137",
                "Preparata G. (1995) QED Coherence in Matter, World Scientific",
                "Del Giudice E. et al. (2005), Electromagnetic Biology and Medicine",
            ],
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Del Giudice & Preparata (1998), J. Biol. Phys. 24, 121-137",
                "Preparata G. (1995) QED Coherence in Matter, World Scientific",
            ],
            category="primary",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("CoherentQED not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
