"""
Chubb & Chubb Ion Band State Theory Module

Physics:
    Scott and Talbot Chubb proposed that deuterons loaded into a
    palladium lattice occupy Bloch-wave ion band states (similar to
    electrons in semiconductors).  In these delocalised band states,
    deuteron pairs can fuse via resonant energy minimisation because
    the periodic lattice potential allows the wavefunction to extend
    over many unit cells, increasing the overlap integral.

    The theory addresses the "three miracles" of cold fusion:
    1. Overcoming the Coulomb barrier (delocalised band state)
    2. No energetic radiation (energy distributed to lattice)
    3. He-4 as primary product (resonant de-excitation)

References
----------
[1] Chubb, T. A. & Chubb, S. R. (1990). "Cold fusion as an interaction
    between ion band states". Fusion Technology 17, 710.
[2] Chubb, S. R. & Chubb, T. A. (1994). "Relationship between
    ion band state and possible mechanism for cold fusion".
    Trans. Am. Nucl. Soc. 71, 302.
[3] Chubb, S. R. (2005). "Roles of Bloch and resonance states in
    cold fusion". Proc. ICCF-11, 646-660.
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, Optional

from scipy import constants as const

from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

logger = logging.getLogger(__name__)

HBAR = const.hbar
E_CHARGE = const.e
KB = const.k
EPS0 = const.epsilon_0
MP = const.m_p
MN = const.m_n
MD = MP + MN
ALPHA = const.alpha
C = const.c

# D+D -> He-4 Q-value
Q_VALUE_MEV = 23.8


class ChubbIonBandTheory:
    """Ion band state theory for deuteron fusion in periodic lattice potential."""

    @property
    def theory_id(self) -> str:
        return "chubb_ion_band"

    @property
    def theory_name(self) -> str:
        return "Chubb & Chubb Ion Band State"

    @property
    def description(self) -> str:
        return (
            "Deuterons in Bloch-wave ion band states within the periodic lattice "
            "potential fuse via resonant energy minimisation. The delocalised band "
            "state addresses the Coulomb barrier, radiation absence, and He-4 "
            "production — the 'three miracles' of cold fusion."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "band_energy_eV": {
                "default": 0.3,
                "description": "Ion band state energy relative to band minimum (eV)",
            },
            "lattice_periodicity_A": {
                "default": 3.89,
                "description": "Lattice constant in Angstroms (3.89 for Pd-FCC)",
            },
            "pair_correlation_length": {
                "default": 10,
                "description": "Number of lattice sites over which D-D pair is correlated",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        T = conditions.get("temperature", 0)
        loading = conditions.get("loading_ratio", 0)
        return T > 0 and loading > 0.7  # requires substantial loading for band formation

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        T = conditions.get("temperature", 300.0)
        loading = conditions.get("loading_ratio", 0.9)
        n_e = conditions.get("electron_density", 6.8e28)

        if not self.is_applicable(conditions):
            return self._neutral("Loading < 0.7 or temperature <= 0")

        E_band = config.get("band_energy_eV", 0.3) * E_CHARGE
        a_lattice = config.get("lattice_periodicity_A", 3.89) * 1e-10
        L_corr = config.get("pair_correlation_length", 10)

        # Bloch wave delocalisation length: L = L_corr × a
        L_deloc = L_corr * a_lattice

        # Effective overlap volume: the D-D wavefunction extends over
        # L_deloc³, but the nuclear interaction only occurs within
        # the nuclear radius R_n ~ 1.5 fm
        R_nuclear = 1.5e-15
        V_nuclear = (4.0 / 3.0) * math.pi * R_nuclear**3
        V_deloc = L_deloc**3

        # Overlap probability: fraction of delocalised wavefunction
        # within nuclear interaction range
        P_overlap = V_nuclear / max(V_deloc, V_nuclear)

        # Band state enhancement: compared to localised deuterons,
        # the band state modifies the effective kinetic energy.
        # The band energy acts as an effective kinetic energy for tunnelling.
        E_eff = E_band + 1.5 * KB * T

        # Standard Gamow factor for comparison
        mu = MD / 2.0
        eta_standard = ALPHA * math.sqrt(mu * C**2 / (2.0 * 1.5 * KB * T))
        eta_band = ALPHA * math.sqrt(mu * C**2 / (2.0 * max(E_eff, 1e-30)))

        exp_std = min(2.0 * math.pi * eta_standard, 500.0)
        exp_band = min(2.0 * math.pi * eta_band, 500.0)
        P_std = math.exp(-exp_std)
        P_band = math.exp(-exp_band)

        # Resonant de-excitation factor: the lattice periodicity enables
        # coherent energy transfer to the lattice (like Hagelstein phonons)
        # This is what addresses the "no gamma" miracle
        resonant_factor = L_corr**2  # coherence-enhanced de-excitation

        # Total enhancement
        if P_std > 0:
            tunnel_enhancement = P_band / max(P_std, 1e-300)
        else:
            tunnel_enhancement = 1.0

        enhancement = max(1.0, tunnel_enhancement * resonant_factor * loading)
        enhancement = min(enhancement, MAX_ENHANCEMENT_FACTOR)

        # Confidence
        loading_score = min((loading - 0.7) / 0.25, 1.0) if loading > 0.7 else 0.0
        band_score = min(E_band / (0.3 * E_CHARGE), 1.0)
        confidence = 0.55 * loading_score * band_score  # 0.55 = model maturity

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=0.0,
            observables={
                "band_energy_eV": E_band / E_CHARGE,
                "delocalisation_length_nm": L_deloc * 1e9,
                "P_overlap": P_overlap,
                "eta_standard": eta_standard,
                "eta_band": eta_band,
                "P_tunnel_standard": P_std,
                "P_tunnel_band": P_band,
                "resonant_factor": resonant_factor,
                "pair_correlation_length": L_corr,
                "product_He4": 1.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": T,
                "loading_ratio": loading,
                "band_energy_eV": E_band / E_CHARGE,
                "lattice_periodicity_A": a_lattice * 1e10,
                "pair_correlation_length": L_corr,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Chubb T.A. & Chubb S.R. (1990) Fusion Technology 17, 710",
                "Chubb S.R. & Chubb T.A. (1994) Trans. Am. Nucl. Soc. 71, 302",
                "Chubb S.R. (2005) Proc. ICCF-11, 646",
            ],
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Chubb T.A. & Chubb S.R. (1990) Fusion Technology 17, 710",
                "Chubb S.R. (2005) Proc. ICCF-11, 646",
            ],
            category="mechanism",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("ChubbIonBand not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
