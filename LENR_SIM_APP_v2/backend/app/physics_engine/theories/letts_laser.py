"""
Letts & Cravens Dual-Laser Stimulation Theory Module

Physics:
    Dennis Letts and Dennis Cravens discovered that irradiating a
    Pd cathode during D₂O electrolysis with two lasers at specific
    wavelengths (670-685 nm range) triggers or enhances excess heat
    production.  Key findings:

    - Resonance peak at ~680-685 nm (photon energy ~1.82 eV)
    - Enhancement of 10-30× over unstimulated excess heat
    - Gold contamination on Pd surface appears to play a role
    - Magnetic field modulates the effect
    - Dual-beam (beat frequency) more effective than single beam

    The mechanism is hypothesised to involve surface plasmon
    resonance at the Au-contaminated Pd surface, coupling photon
    energy to the D-D reaction coordinate.

References
----------
[1] Letts, D. & Cravens, D. (2003). "Laser stimulation of deuterated
    palladium: past and present". Proc. ICCF-10, 159-170.
[2] Letts, D. (2006). "Dual laser stimulation and optical phonons in
    palladium deuteride". Proc. ICCF-12, 159.
[3] Letts, D. & Hagelstein, P. L. (2009). "Modified Letts-Cravens
    protocol". Proc. ICCF-14, 265-276.
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
C = const.c
H_PLANCK = const.h

# Resonance parameters from Letts' experimental data
RESONANCE_WAVELENGTH_NM = 682.0  # nm, peak response
RESONANCE_WIDTH_NM = 8.0  # nm, FWHM of spectral response


class LettsLaserTheory:
    """Dual-laser stimulation model for excess heat enhancement."""

    @property
    def theory_id(self) -> str:
        return "letts_laser"

    @property
    def theory_name(self) -> str:
        return "Letts & Cravens Dual-Laser Stimulation"

    @property
    def description(self) -> str:
        return (
            "Dual-laser irradiation at 670-685 nm triggers/enhances excess heat "
            "in Pd-D₂O electrolysis. Resonance peak at ~682 nm with 10-30× "
            "enhancement. Surface plasmon coupling at Au-contaminated Pd surface "
            "is the proposed mechanism."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "laser_wavelength_nm": {
                "default": RESONANCE_WAVELENGTH_NM,
                "description": "Laser wavelength in nm (optimal: 680-685)",
            },
            "laser_power_mW": {
                "default": 30.0,
                "description": "Total laser power in milliwatts",
            },
            "cathode_au_contamination": {
                "default": 0.5,
                "description": "Au surface contamination fraction (0-1)",
            },
            "magnetic_field_T": {
                "default": 0.0,
                "description": "Applied magnetic field in Tesla",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        T = conditions.get("temperature", 0)
        loading = conditions.get("loading_ratio", 0)
        return T > 0 and loading > 0

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        T = conditions.get("temperature", 300.0)
        loading = conditions.get("loading_ratio", 0.9)

        if not self.is_applicable(conditions):
            return self._neutral("Temperature or loading is zero")

        lambda_nm = config.get("laser_wavelength_nm", RESONANCE_WAVELENGTH_NM)
        P_laser_mW = config.get("laser_power_mW", 30.0)
        au_frac = config.get("cathode_au_contamination", 0.5)
        B_field = config.get("magnetic_field_T", 0.0)

        # Spectral resonance: Lorentzian profile centred at RESONANCE_WAVELENGTH_NM
        delta_lambda = lambda_nm - RESONANCE_WAVELENGTH_NM
        gamma = RESONANCE_WIDTH_NM / 2.0
        spectral_response = gamma**2 / (delta_lambda**2 + gamma**2)

        # Photon energy
        E_photon_J = H_PLANCK * C / (lambda_nm * 1e-9)
        E_photon_eV = E_photon_J / E_CHARGE

        # Photon flux
        P_laser_W = P_laser_mW * 1e-3
        photon_flux = P_laser_W / max(E_photon_J, 1e-30)

        # Au contamination enhances surface plasmon coupling
        # Letts observed that Au-contaminated cathodes respond better
        au_enhancement = 1.0 + 5.0 * au_frac  # up to 6× for full Au coverage

        # Magnetic field modulation (small effect)
        B_factor = 1.0 + 0.5 * min(B_field, 1.0)

        # Overall laser enhancement factor
        # At resonance with optimal conditions: 10-30× enhancement
        max_laser_enhancement = 30.0
        laser_enhancement = (
            max_laser_enhancement * spectral_response * au_enhancement
            * B_factor * min(loading, 1.0)
        )

        enhancement = max(1.0, laser_enhancement)
        enhancement = min(enhancement, MAX_ENHANCEMENT_FACTOR)

        # Power contribution: the laser itself doesn't produce excess heat,
        # it triggers/enhances the underlying LENR process
        # Estimated excess heat gain ratio: 10-100× laser input power
        gain_ratio = laser_enhancement * 10.0  # thermal gain
        excess_heat_estimate = P_laser_W * gain_ratio

        # Confidence
        spectral_score = spectral_response
        loading_score = min(loading, 1.0)
        au_score = min(au_frac / 0.5, 1.0)
        confidence = 0.65 * spectral_score * loading_score * au_score

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=excess_heat_estimate,
            observables={
                "spectral_response": spectral_response,
                "photon_energy_eV": E_photon_eV,
                "photon_flux_per_s": photon_flux,
                "au_enhancement": au_enhancement,
                "B_factor": B_factor,
                "laser_enhancement": laser_enhancement,
                "excess_heat_estimate_W": excess_heat_estimate,
                "gain_ratio": gain_ratio,
                "resonance_wavelength_nm": RESONANCE_WAVELENGTH_NM,
                "product_He4": 1.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": T,
                "loading_ratio": loading,
                "laser_wavelength_nm": lambda_nm,
                "laser_power_mW": P_laser_mW,
                "cathode_au_contamination": au_frac,
                "magnetic_field_T": B_field,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Letts D. & Cravens D. (2003) Proc. ICCF-10, 159",
                "Letts D. (2006) Proc. ICCF-12, 159",
                "Letts D. & Hagelstein P.L. (2009) Proc. ICCF-14, 265",
            ],
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Letts D. & Cravens D. (2003) Proc. ICCF-10, 159",
                "Letts D. & Hagelstein P.L. (2009) Proc. ICCF-14, 265",
            ],
            category="triggering",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("LettsLaser not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
