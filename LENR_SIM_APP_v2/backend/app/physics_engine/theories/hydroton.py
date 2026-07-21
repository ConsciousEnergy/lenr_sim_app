"""
Storms' Hydroton Theory Module

.. deprecated:: v0.3.6-beta
    DEPRECATED (RR-015). Disabled by default; only registered when
    ``settings.ENABLE_LEGACY_HYDROTON`` is true. Its gradual-photon-emission /
    down-conversion narrative overlaps the maintained ``hagelstein_phonon``
    module and the NAE confinement captured by ``nae_model``; prefer those.
    Retained behind the flag for backward compatibility and historical
    comparison only. Do not add new physics here.

Implements Edmund Storms' Hydroton model: a linear covalent H-e-H-e-H chain
forming in Nuclear Active Environment (NAE) nano-gaps.

Physics:
    - Linear chain of hydrogen atoms with shared electrons forming in nano-gaps
    - Resonance fusion: the chain vibrates and when kinetic energy aligns,
      fusion occurs at a node
    - Gradual photon emission: energy released as a cascade of photons
      (not a single 24 MeV gamma), explaining absence of energetic radiation
    - Key parameters: chain_length (2-5 atoms), gap_width (nm),
      resonance_frequency (Hz)
    - Observable: heat output with suppressed neutron/gamma ratio

References:
    Storms E. (2007) "The Science of Low Energy Nuclear Reaction", World Scientific
    Storms E. (2014) "The Explanation of Low Energy Nuclear Reaction", Infinite Energy Press
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
MP = const.m_p
ALPHA = const.alpha


class HydrotonTheory:
    """Storms' Hydroton (H-e-H-e-H covalent chain) LENR mechanism."""

    @property
    def theory_id(self) -> str:
        return "hydroton"

    @property
    def theory_name(self) -> str:
        return "Storms' Hydroton Model"

    @property
    def description(self) -> str:
        return (
            "Linear covalent H-e-H-e-H chain forming in NAE nano-gaps. "
            "Resonance vibration drives fusion at chain nodes with energy "
            "released as a photon cascade (no single high-energy gamma)."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "chain_length": {
                "default": 4,
                "description": "Number of hydrogen atoms in the chain (2-5)",
            },
            "gap_width_nm": {
                "default": 1.0,
                "description": "NAE gap width in nanometres",
            },
            "resonance_frequency_Hz": {
                "default": 1e12,
                "description": "Resonance vibration frequency (Hz)",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        """Hydroton requires nano-scale gaps and hydrogen loading."""
        gap = conditions.get("gap_width_nm", conditions.get("crack_width_nm", 0))
        loading = conditions.get("loading_ratio", 0)
        # Applicable if a gap exists and there is some hydrogen loading
        return gap > 0.1 and loading > 0.5

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        T = conditions.get("temperature", 300.0)
        loading = conditions.get("loading_ratio", 0.9)
        gap_nm = config.get(
            "gap_width_nm",
            conditions.get("gap_width_nm", conditions.get("crack_width_nm", 1.0)),
        )
        chain_length = int(config.get("chain_length", 4))
        chain_length = max(2, min(chain_length, 5))
        resonance_freq = config.get("resonance_frequency_Hz", 1e12)

        if not self.is_applicable(conditions):
            return self._neutral("NAE gap or loading too low")

        gap_m = gap_nm * 1e-9

        # --- Chain formation probability ---
        # Optimal gap width ~1 nm; falls off away from that
        gap_fitness = math.exp(-((gap_nm - 1.0) / 0.5) ** 2)

        # Loading contribution: chain can only form with sufficient H density
        loading_factor = max(0.0, (loading - 0.5) / 0.5)  # 0 at 0.5, 1 at 1.0

        formation_prob = gap_fitness * loading_factor

        # --- Resonance fusion probability ---
        # Energy per oscillation node
        phonon_energy = HBAR * resonance_freq  # J
        phonon_eV = phonon_energy / E_CHARGE

        # Kinetic energy alignment probability (thermal Boltzmann factor)
        kB_T = KB * T
        alignment_factor = math.exp(-phonon_energy / max(kB_T, 1e-30))

        # Chain length effect: longer chains have more nodes → higher rate
        chain_factor = chain_length - 1  # number of fusion-capable nodes

        # Resonance enhancement (simplified standing-wave factor)
        resonance_enhancement = chain_factor * alignment_factor * 1e3

        # --- Energy release model ---
        # D+D → He-4 releases ~23.8 MeV, emitted as photon cascade
        Q_MeV = 23.8
        Q_J = Q_MeV * 1e6 * E_CHARGE
        # Number of photons in cascade (each ~1-5 MeV)
        n_photons = max(1, int(Q_MeV / 3.0))

        # Rate: formation probability × resonance rate
        reaction_rate_per_site = formation_prob * resonance_enhancement * resonance_freq
        # Scale by a physically conservative prefactor
        reaction_rate_per_site *= 1e-20  # dimensionless pre-factor

        energy_per_site_W = reaction_rate_per_site * Q_J

        # --- Enhancement factor (relative to bare tunnelling) ---
        enhancement = 1.0 + formation_prob * resonance_enhancement
        enhancement = min(enhancement, MAX_ENHANCEMENT_FACTOR)

        confidence = formation_prob * min(1.0, loading_factor)

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=energy_per_site_W,
            observables={
                "gap_fitness": gap_fitness,
                "formation_probability": formation_prob,
                "chain_length": chain_length,
                "resonance_enhancement": resonance_enhancement,
                "phonon_energy_eV": phonon_eV,
                "photon_cascade_count": n_photons,
                "neutron_rate_suppression": 0.01,  # Hydroton predicts very low n
                "reaction_rate_per_site_Hz": reaction_rate_per_site,
                # D+D -> He-4 via photon cascade (Storms 2014); primary product
                "product_He4": 1.0,
                # Very low neutron emission predicted (suppressed branch)
                "product_neutrons": 0.01,
                # No single high-energy gamma; energy released as photon cascade
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": T,
                "loading_ratio": loading,
                "gap_width_nm": gap_nm,
                "chain_length": chain_length,
                "resonance_frequency_Hz": resonance_freq,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Storms E. (2007) The Science of Low Energy Nuclear Reaction, World Scientific",
                "Storms E. (2014) The Explanation of LENR, Infinite Energy Press",
            ],
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Storms E. (2007) The Science of Low Energy Nuclear Reaction",
                "Storms E. (2014) The Explanation of LENR",
            ],
            category="primary",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("Hydroton not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
