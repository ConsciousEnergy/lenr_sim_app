"""
Kim Bose-Einstein Condensate (BEC) Nuclear Fusion Theory Module

Physics:
    Yeong Kim proposes that deuterons (bosons) trapped in nano-scale
    metal grains can form a Bose-Einstein condensate at sufficiently
    low temperatures (relative to the trap depth).  The BEC dramatically
    suppresses the Coulomb barrier because all N deuterons occupy the
    same quantum ground state, and nuclear fusion occurs as a collective
    N-body process.

    Key prediction: The fusion rate scales as N² (not N) due to the
    BEC coherence, making nano-grains with high deuteron count very
    efficient.  Products are primarily He-4 + heat (energy shared
    among condensate).

References
----------
[1] Kim, Y. E. (2009). "Theory of Bose-Einstein condensation mechanism
    for deuteron-induced nuclear reactions in micro/nano-scale metal
    grains and particles". Naturwissenschaften 96, 803-811.
[2] Kim, Y. E. (2013). "Generalized theory of Bose-Einstein condensation
    nuclear fusion for hydrogen-metal system". J. Condensed Matter
    Nucl. Sci. 13, 265-276.
[3] Kim, Y. E. & Ward, T. E. (2012). "Bose-Einstein condensate theory
    of deuteron fusion in metal". J. Condensed Matter Nucl. Sci. 6, 101.
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
MP = const.m_p
MN = const.m_n
MD = MP + MN
ALPHA = const.alpha
C = const.c
EPS0 = const.epsilon_0

# D+D -> He-4 Q-value
Q_VALUE_MEV = 23.8
Q_VALUE_J = Q_VALUE_MEV * 1e6 * E_CHARGE


class KimBECTheory:
    """Bose-Einstein condensate nuclear fusion in nano-grains."""

    @property
    def theory_id(self) -> str:
        return "kim_bec"

    @property
    def theory_name(self) -> str:
        return "Kim BEC Nuclear Fusion"

    @property
    def description(self) -> str:
        return (
            "Deuterons trapped in nano-scale metal grains form a Bose-Einstein "
            "condensate, enabling collective N-body fusion with N²-enhanced rates. "
            "The BEC coherence suppresses the Coulomb barrier, producing He-4 + heat."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "grain_size_nm": {
                "default": 5.0,
                "description": "Metal grain diameter in nanometres",
            },
            "bec_temperature_K": {
                "default": 300.0,
                "description": "Temperature for BEC formation (effective, including trap)",
            },
            "trap_potential_eV": {
                "default": 0.5,
                "description": "Effective trapping potential depth in eV",
            },
            "deuteron_count": {
                "default": 100,
                "description": "Number of deuterons in the BEC trap",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        T = conditions.get("temperature", 0)
        return T > 0

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
            return self._neutral("Temperature is zero")

        d_grain_nm = config.get("grain_size_nm", 5.0)
        T_bec = config.get("bec_temperature_K", T)
        V_trap = config.get("trap_potential_eV", 0.5) * E_CHARGE
        N_d = int(config.get("deuteron_count", 100))

        d_grain = d_grain_nm * 1e-9

        # BEC critical temperature for N deuterons in a 3D harmonic trap:
        # T_c = (ℏω/k_B) × (N/ζ(3))^(1/3)
        # where ω = √(2V_trap / (m_D × (d/2)²))
        omega_trap = math.sqrt(2.0 * V_trap / (MD * (d_grain / 2.0)**2))
        zeta_3 = 1.202  # Riemann zeta(3)
        T_critical = (HBAR * omega_trap / KB) * (N_d / zeta_3)**(1.0 / 3.0)

        # BEC fraction: below T_c, fraction in ground state = 1 - (T/T_c)^3
        if T_bec < T_critical and T_critical > 0:
            bec_fraction = 1.0 - (T_bec / T_critical)**3
        else:
            # Above T_c: small residual coherence from finite-size effects
            bec_fraction = max(0.0, (T_critical / max(T_bec, 1))**3 * 0.1)

        # BEC-enhanced tunnelling:
        # In the condensate, the effective de Broglie wavelength is enhanced
        # by √N (all particles coherent), so the Gamow exponent is reduced.
        # Standard: exp(-2πη), η = Z²α√(μc²/2E)
        E_thermal = 1.5 * KB * T_bec
        mu = MD / 2.0
        eta_standard = ALPHA * math.sqrt(mu * C**2 / (2.0 * max(E_thermal, 1e-30)))

        # BEC-modified: coherent N-body process reduces effective η
        # by factor ~1/N^(1/6) (Kim's result for N-body barrier)
        if N_d > 1:
            eta_bec = eta_standard / (N_d**(1.0 / 6.0))
        else:
            eta_bec = eta_standard

        # Tunnelling probabilities
        exp_std = min(2.0 * math.pi * eta_standard, 500.0)
        exp_bec = min(2.0 * math.pi * eta_bec, 500.0)
        P_standard = math.exp(-exp_std)
        P_bec = math.exp(-exp_bec)

        # N²-enhanced rate (BEC coherence)
        # Rate ∝ N² × P_bec × bec_fraction
        rate_enhancement = N_d**2 * bec_fraction if bec_fraction > 0 else 1.0

        if P_standard > 0:
            tunnel_enhancement = P_bec / max(P_standard, 1e-300)
        else:
            tunnel_enhancement = 1.0

        enhancement = max(1.0, rate_enhancement * tunnel_enhancement)
        enhancement = min(enhancement, MAX_ENHANCEMENT_FACTOR)

        # Estimate grain density and power
        grain_volume = (4.0 / 3.0) * math.pi * (d_grain / 2.0)**3
        grains_per_m3 = loading / max(grain_volume * 1e28, 1e-10)

        # Confidence
        bec_score = bec_fraction
        size_score = min(10.0 / max(d_grain_nm, 0.1), 1.0)  # smaller = better
        confidence = 0.5 * bec_score * size_score  # 0.5 = theoretical model maturity

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=0.0,
            observables={
                "T_critical_K": T_critical,
                "bec_fraction": bec_fraction,
                "omega_trap_Hz": omega_trap / (2.0 * math.pi),
                "eta_standard": eta_standard,
                "eta_bec": eta_bec,
                "P_tunnel_standard": P_standard,
                "P_tunnel_bec": P_bec,
                "N_squared_enhancement": N_d**2,
                "deuteron_count": N_d,
                "grain_size_nm": d_grain_nm,
                "product_He4": 1.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": T,
                "loading_ratio": loading,
                "grain_size_nm": d_grain_nm,
                "trap_potential_eV": V_trap / E_CHARGE,
                "deuteron_count": N_d,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Kim Y.E. (2009) Naturwissenschaften 96, 803",
                "Kim Y.E. (2013) J. Condensed Matter Nucl. Sci. 13, 265",
                "Kim Y.E. & Ward T.E. (2012) JCMNS 6, 101",
            ],
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Kim Y.E. (2009) Naturwissenschaften 96, 803",
                "Kim Y.E. (2013) J. Condensed Matter Nucl. Sci. 13, 265",
            ],
            category="mechanism",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("KimBEC not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
