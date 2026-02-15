"""
Vysotskii Coherent Correlated States (CCS) Theory Module

Physics:
    Coherent Correlated States arise when particles are placed in a
    non-stationary (time-varying) potential well.  The CCS wavepacket
    develops an anomalously large overlap integral with the nuclear
    region, dramatically increasing the tunnelling probability.

    The key parameter is the correlation coefficient r_corr, which
    measures the correlation between position and momentum uncertainties.
    When |r_corr| -> 1, the Coulomb barrier penetration probability
    can increase by factors of 10^40 or more compared to standard
    Gamow tunnelling.

    This theory also applies to biological transmutation, where
    oscillating electric fields in biological membranes create
    the non-stationary potential.

References
----------
[1] Vysotskii, V. I. & Kornilova, A. A. (2009). "Nuclear Fusion and
    Transmutation of Isotopes in Biological Systems". Mir, Moscow.
[2] Vysotskii, V. I. et al. (2001). "Observation and investigation of
    nuclear transmutation of isotopes in growing biological cultures".
    Ann. Fond. L. de Broglie 26, 475.
[3] Vysotskii, V. I. & Kornilova, A. A. (2013). "Coherent correlated
    states and low-energy nuclear reactions in non-stationary systems".
    Eur. Phys. J. A 49, 99.
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional

from scipy import constants as const

from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

logger = logging.getLogger(__name__)

HBAR = const.hbar
E_CHARGE = const.e
KB = const.k
EPS0 = const.epsilon_0
MP = const.m_p
ALPHA = const.alpha
C = const.c


class VysotskiiCCSTheory:
    """Coherent Correlated States (CCS) tunnelling enhancement model."""

    @property
    def theory_id(self) -> str:
        return "vysotskii_ccs"

    @property
    def theory_name(self) -> str:
        return "Vysotskii Coherent Correlated States (CCS)"

    @property
    def description(self) -> str:
        return (
            "Coherent Correlated States in a non-stationary potential well create "
            "anomalously large nuclear overlap integrals, enhancing tunnelling by "
            "up to 10^40 compared to standard Gamow. Applies to both metal-hydride "
            "and biological transmutation systems."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "correlation_coefficient": {
                "default": 0.999,
                "description": "Position-momentum correlation |r| in [0,1). Higher = stronger CCS",
            },
            "potential_well_depth_eV": {
                "default": 30.0,
                "description": "Depth of the non-stationary potential well in eV",
            },
            "oscillation_frequency_Hz": {
                "default": 1e12,
                "description": "Frequency of potential well oscillation in Hz",
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

        if not self.is_applicable(conditions):
            return self._neutral("Temperature is zero")

        r_corr = config.get("correlation_coefficient", 0.999)
        V0_eV = config.get("potential_well_depth_eV", 30.0)
        f_osc = config.get("oscillation_frequency_Hz", 1e12)

        # Clamp correlation coefficient to avoid singularity
        r_corr = min(abs(r_corr), 0.9999999)

        # CCS effective wavepacket width:
        # In CCS, the position uncertainty can be squeezed as:
        # sigma_x_ccs = sigma_x_0 × sqrt(1 - r^2)
        # This means the wavefunction penetrates deeper into the barrier.

        # Standard thermal de Broglie wavelength for D at temperature T
        mu = MP / 2.0  # D-D reduced mass
        E_thermal = 1.5 * KB * T
        lambda_dB = HBAR / math.sqrt(2.0 * mu * max(E_thermal, 1e-30))

        # CCS-squeezed width
        squeeze_factor = math.sqrt(1.0 - r_corr**2)
        lambda_ccs = lambda_dB * squeeze_factor

        # Gamow tunnelling exponent: exp(-2πη) where η = Z₁Z₂α√(μc²/2E)
        E_eff = max(E_thermal, 1e-30)
        eta_standard = ALPHA * math.sqrt(mu * C**2 / (2.0 * E_eff))

        # CCS modification: the effective tunnelling energy is enhanced
        # because the squeezed wavepacket has higher momentum components.
        # E_eff_ccs ≈ E_thermal / (1 - r^2)
        E_eff_ccs = E_thermal / max(1.0 - r_corr**2, 1e-15)
        eta_ccs = ALPHA * math.sqrt(mu * C**2 / (2.0 * E_eff_ccs))

        # Tunnelling probabilities
        exp_standard = min(2.0 * math.pi * eta_standard, 500.0)
        exp_ccs = min(2.0 * math.pi * eta_ccs, 500.0)

        P_standard = math.exp(-exp_standard)
        P_ccs = math.exp(-exp_ccs)

        # CCS enhancement factor
        if P_standard > 0:
            enhancement = P_ccs / max(P_standard, 1e-300)
        else:
            enhancement = min(P_ccs * 1e100, MAX_ENHANCEMENT_FACTOR) if P_ccs > 0 else 1.0

        enhancement = max(1.0, min(enhancement, MAX_ENHANCEMENT_FACTOR))

        # Oscillation quality: how well the potential drives CCS formation
        # The oscillation must be faster than decoherence but slower than nuclear
        omega_osc = 2.0 * math.pi * f_osc
        tau_decoherence = HBAR / (KB * T)  # thermal decoherence time
        osc_quality = min(omega_osc * tau_decoherence, 10.0) / 10.0

        # Confidence
        corr_score = r_corr  # higher correlation = more confident
        osc_score = osc_quality
        confidence = 0.6 * corr_score * osc_score  # 0.6 base = model maturity

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=0.0,
            observables={
                "correlation_coefficient": r_corr,
                "squeeze_factor": squeeze_factor,
                "E_eff_ccs_eV": E_eff_ccs / E_CHARGE,
                "E_thermal_eV": E_thermal / E_CHARGE,
                "eta_standard": eta_standard,
                "eta_ccs": eta_ccs,
                "P_tunnel_standard": P_standard,
                "P_tunnel_ccs": P_ccs,
                "log10_enhancement": math.log10(max(enhancement, 1.0)),
                "oscillation_quality": osc_quality,
                # CCS enhances D+D -> He-4 tunneling (Vysotskii 2013)
                "product_He4": 1.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": T,
                "loading_ratio": loading,
                "correlation_coefficient": r_corr,
                "potential_well_depth_eV": V0_eV,
                "oscillation_frequency_Hz": f_osc,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Vysotskii V.I. & Kornilova A.A. (2009) Nuclear Fusion in Biological Systems",
                "Vysotskii V.I. et al. (2001) Ann. Fond. L. de Broglie 26, 475",
                "Vysotskii V.I. & Kornilova A.A. (2013) Eur. Phys. J. A 49, 99",
            ],
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Vysotskii V.I. & Kornilova A.A. (2009) Nuclear Fusion in Biological Systems",
                "Vysotskii V.I. & Kornilova A.A. (2013) Eur. Phys. J. A 49, 99",
            ],
            category="mechanism",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("VysotskiiCCS not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
