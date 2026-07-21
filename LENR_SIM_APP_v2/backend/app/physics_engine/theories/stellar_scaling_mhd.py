"""
Stellar-Scaling MHD Context Line (v0.3.6-beta)
==============================================

Physics
-------
Astrophysical MHD scaling laws (e.g., Hartmann number ``Ha``, magnetic
Reynolds number ``Rm``, Lundquist number ``S``) are standard dimensionless
groups that describe plasma confinement in stars and tokamaks.  Parkin
& Pudritz (``astro-ph/0410075``) use the same framework to analyse
radiatively-cooled magnetised flows on parsec scales.

This module is a **context track** that asks: if we naively port the
stellar/astrophysical MHD scaling relationships into the LENR-regime
conditions we are simulating, what enhancement factor would they imply?
The answer is almost always a quantitatively strong but
*scientifically inadmissible* factor for room-temperature, condensed-
matter physics, because stellar densities, fields, and plasma
temperatures differ from LENR experimental conditions by many orders
of magnitude.

Purpose in the scoring mix
--------------------------
The track is included so users can *see* the stellar-scaling value for
comparison, but it is:

1. **Class-aware weighted**: ``claim_tier = speculative_exploratory``
   and ``evidence_class = cross_regime_extrapolation`` so the scoring
   engine down-weights its contribution against empirically-grounded
   LENR theories.
2. **Heavy uncertainty penalty** outside the astrophysical validity
   window (T > 1e6 K, n > 1e24 m⁻³, B > 1e4 T).  Outside that window
   the enhancement factor is clamped and the confidence is collapsed.
3. **Explicit falsification criteria**: the track fails if its
   extrapolated enhancement ever exceeds ``MAX_ENHANCEMENT_FACTOR`` by
   more than one decade or if it remains internally inconsistent with
   the LENR energy scale.
4. Transparent ``stellar_contribution`` observable that records how
   much the final aggregated score would shift if this line were
   toggled off.

References
----------
[1] Parkin, E.R., Pudritz, R.E. (2004). "Magnetohydrodynamic processes
    in astrophysical flows." astro-ph/0410075.
[2] Shercliff J.A. (1953). "Steady motion of conducting fluids in
    pipes under transverse magnetic fields." Proc. Camb. Phil. Soc.
    49, 136-144.  (Hartmann-number origin.)
[3] Pouquet A. et al. (1976). "Strong MHD helical turbulence and the
    nonlinear dynamo effect." J. Fluid Mech. 77, 321.
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, Optional

from scipy import constants as const

from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

logger = logging.getLogger(__name__)

MU_0 = const.mu_0
KB = const.k

# Applicability gate thresholds (astrophysical MHD regime)
STELLAR_MIN_TEMPERATURE_K = 1.0e6
STELLAR_MIN_DENSITY_M3 = 1.0e24
STELLAR_MIN_FIELD_T = 1.0e4

# Terrestrial / LENR regime ceiling used to compute extrapolation penalty.
LENR_REGIME_MAX_TEMPERATURE_K = 5.0e3
LENR_REGIME_MAX_FIELD_T = 1.0e2

# Claim-tier down-weighting applied unconditionally — stellar line is an
# exploratory comparative signal, not an LENR mechanism prediction.
CLAIM_TIER_WEIGHT = 0.25


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _stellar_extrapolation_penalty(temperature_k: float, field_t: float) -> float:
    """Penalty factor in [0, 1] based on distance from stellar regime.

    Returns 1.0 inside the stellar regime and decays toward 0 for
    terrestrial conditions.  A value of 0 means the stellar-scaling
    line provides *no* admissible signal.
    """
    t_norm = math.log10(max(temperature_k, 1.0))
    b_norm = math.log10(max(field_t, 1e-6))
    # Stellar reference: log10(T) ~ 6, log10(B) ~ 4.
    stellar_ref = (6.0, 4.0)
    dist = math.hypot(stellar_ref[0] - t_norm, stellar_ref[1] - b_norm)
    # Distance 0 -> factor 1.  Distance 10 (deep LENR) -> ~0.006.
    return float(math.exp(-dist / 2.0))


class StellarScalingMHDTheory:
    """Astrophysical MHD context line included as a comparative track."""

    @property
    def theory_id(self) -> str:
        return "stellar_scaling_mhd"

    @property
    def theory_name(self) -> str:
        return "Stellar-Scaling MHD (Context Line)"

    @property
    def description(self) -> str:
        return (
            "Astrophysical MHD scaling applied as a comparative context "
            "line.  NOT a claim about LENR mechanisms.  Used to expose "
            "the quantitative gap between stellar plasma confinement "
            "and terrestrial electrochemical conditions."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "plasma_density_m3": {
                "default": 1.0e20,
                "description": "Local plasma ion density in m^-3",
            },
            "mhd_field_strength_T": {
                "default": 1.0,
                "description": "Magnetic field magnitude in Tesla",
            },
            "characteristic_length_m": {
                "default": 1.0e-6,
                "description": "Flow length-scale in meters",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        """Strict gate: require astrophysical regime.

        The stellar-scaling track is only *formally* applicable under
        stellar plasma conditions.  Under LENR conditions the method
        returns ``False``, so the scoring engine applies the neutral
        inapplicable-theory path (claim_tier drives visibility without
        contaminating the aggregated LENR signal).
        """
        T = float(conditions.get("temperature", 300.0))
        B = float(conditions.get("mhd_field_strength_T", conditions.get("magnetic_field_T", 0.0)))
        n = float(conditions.get("plasma_density_m3", conditions.get("electron_density", 0.0)))
        return (
            T >= STELLAR_MIN_TEMPERATURE_K
            and B >= STELLAR_MIN_FIELD_T
            and n >= STELLAR_MIN_DENSITY_M3
        )

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        T = float(conditions.get("temperature", 300.0))
        B = float(
            config.get(
                "mhd_field_strength_T",
                conditions.get("mhd_field_strength_T", conditions.get("magnetic_field_T", 1.0)),
            )
        )
        n = float(
            config.get(
                "plasma_density_m3",
                conditions.get("plasma_density_m3", conditions.get("electron_density", 1.0e20)),
            )
        )
        L = float(
            config.get(
                "characteristic_length_m",
                conditions.get("characteristic_length_m", 1.0e-6),
            )
        )

        # Magnetic pressure and thermal pressure balance (rough stellar scale).
        p_mag = (B ** 2) / (2.0 * MU_0)
        p_thermal = n * KB * T
        beta = p_thermal / max(p_mag, 1e-30)

        # Naive stellar-scaling enhancement (e.g., Alfven-speed confinement
        # amplification).  This is intentionally large to reflect the raw
        # scaling law *before* the extrapolation penalty.
        v_alfven = B / math.sqrt(max(MU_0 * n * const.m_p, 1e-30))
        alfven_ratio = v_alfven / max(math.sqrt(KB * T / const.m_p), 1.0)
        raw_enhancement = 1.0 + alfven_ratio

        # Extrapolation penalty heavily attenuates contribution in LENR regime.
        penalty = _stellar_extrapolation_penalty(T, B)
        penalised_enhancement = 1.0 + (raw_enhancement - 1.0) * penalty * CLAIM_TIER_WEIGHT
        clamped_enhancement = _clamp(penalised_enhancement, 1.0, MAX_ENHANCEMENT_FACTOR)

        applicable = self.is_applicable(conditions)

        # Confidence collapses away from stellar regime.
        confidence = _clamp(penalty * CLAIM_TIER_WEIGHT, 0.0, 1.0)
        if not applicable:
            confidence = min(confidence, 0.15)

        # Transparency: how much would the final score shift if the
        # stellar track were toggled off?  Since the enhancement is
        # multiplicative, the contribution is ``log10(enhancement)``.
        stellar_contribution_log10 = math.log10(max(clamped_enhancement, 1.0))

        validation_flags = []
        if not applicable:
            validation_flags.append(
                "stellar-scaling track is outside astrophysical regime; "
                "treated as comparative context only"
            )
        if clamped_enhancement > MAX_ENHANCEMENT_FACTOR * 0.1:
            validation_flags.append(
                "stellar-scaling enhancement dominates; check applicability gates"
            )

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=float(clamped_enhancement),
            reaction_rate_modifier=float(clamped_enhancement),
            energy_output_watts=0.0,
            observables={
                "plasma_beta": float(beta),
                "alfven_speed_m_s": float(v_alfven),
                "alfven_thermal_ratio": float(alfven_ratio),
                "raw_stellar_enhancement": float(raw_enhancement),
                "extrapolation_penalty": float(penalty),
                "class_aware_weight": float(CLAIM_TIER_WEIGHT),
                "stellar_contribution_log10": float(stellar_contribution_log10),
                "regime_applicable": bool(applicable),
                "validation_flags": validation_flags,
                "product_He4": 0.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": T,
                "mhd_field_strength_T": B,
                "plasma_density_m3": n,
                "characteristic_length_m": L,
            },
            is_applicable=applicable,
            confidence=float(confidence),
            references=[
                "Parkin & Pudritz (2004) astro-ph/0410075",
                "Shercliff J.A. (1953) Proc. Camb. Phil. Soc. 49, 136",
                "Pouquet A. et al. (1976) J. Fluid Mech. 77, 321",
            ],
            evidence_class="cross_regime_extrapolation",
            reproducibility_tier="exploratory",
            claim_tier="speculative_exploratory",
            falsification_conditions=[
                "Invalid if stellar-scaling enhancement exceeds MAX_ENHANCEMENT_FACTOR by more than a decade.",
                "Invalid under LENR regime: track produces no admissible claim, only comparative context.",
                "Invalid if observed He-4 / radiation balance contradicts stellar plasma ratios.",
            ],
            provenance={
                "scaling_basis": "Alfven speed vs ion thermal speed",
                "regime_gate": {
                    "min_temperature_k": STELLAR_MIN_TEMPERATURE_K,
                    "min_density_m3": STELLAR_MIN_DENSITY_M3,
                    "min_field_t": STELLAR_MIN_FIELD_T,
                },
                "class_aware_weight": CLAIM_TIER_WEIGHT,
                "note": (
                    "Included for transparency only.  Stellar scaling is "
                    "quantitatively strong but not a valid LENR mechanism."
                ),
            },
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Parkin & Pudritz (2004) astro-ph/0410075",
                "Shercliff J.A. (1953) Proc. Camb. Phil. Soc. 49, 136",
            ],
            category="context_line",
        )
