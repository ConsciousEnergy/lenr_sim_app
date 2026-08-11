"""
Widom-Larsen Ultra-Low Momentum Neutron Theory Module

Physics:
    Collective surface plasmon polariton (SPP) modes on metal hydride
    surfaces can renormalize the electron mass upward.  When the
    effective mass exceeds the Q-value for inverse beta decay:

        eâ» + pâº â†’ n + Î½_e

    ultra-low momentum (ULM) neutrons are produced.  These ULM neutrons
    have enormous capture cross-sections (1/v law) and are absorbed
    locally, producing transmutation products and heat without
    penetrating radiation escaping the lattice.

    Key prediction: transmutation products (not just He-4), tritium
    production via n + D â†’ T, and characteristic X-ray signatures.

References
----------
[1] Widom, A. & Larsen, L. (2006). "Ultra low momentum neutron catalyzed
    nuclear reactions on metallic hydride surfaces". Eur. Phys. J. C 46,
    107-111.
[2] Widom, A. & Larsen, L. (2007). "Theoretical Standard Model rates
    of proton to neutron conversions near metallic hydride surfaces".
    arXiv:nucl-th/0608059v2.
[3] Larsen, L. & Widom, A. (2008). "Nuclear abundances in metallic
    hydride electrodes of electrolytic chemical cells". arXiv:0709.3905.
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, Optional

from scipy import constants as const

from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

from app.physics.weak_interaction import (
    calculate_weak_interaction_cross_section,
    calculate_neutron_formation_rate,
    THRESHOLD_ELECTRON_MEV,
)

logger = logging.getLogger(__name__)

HBAR = const.hbar
E_CHARGE = const.e
KB = const.k
ME = const.m_e
MP = const.m_p
MN = const.m_n
C = const.c

# Inverse beta decay threshold: Q = (m_n - m_p)cÂ² = 1.293 MeV
Q_INVERSE_BETA_J = (MN - MP) * C**2
Q_INVERSE_BETA_MEV = Q_INVERSE_BETA_J / (1e6 * E_CHARGE)

# Dimensional bridge from (neutron production rate x capture cross-section)
# to the pipeline's dimensionless rate modifier. Model assumption (uncited):
# the WL papers derive no such conversion, so this scale only sets where the
# ULM chain saturates against the governance MAX_ENHANCEMENT_FACTOR ceiling.
ULM_CHAIN_RATE_TO_ENHANCEMENT = 1e10  # model assumption


class WidomLarsenTheory:
    """Ultra-low momentum neutron production via weak interaction on surfaces."""

    @property
    def theory_id(self) -> str:
        return "widom_larsen"

    @property
    def theory_name(self) -> str:
        return "Widom-Larsen ULM Neutrons"

    @property
    def description(self) -> str:
        return (
            "Collective surface plasmon oscillations renormalize the electron mass, "
            "enabling inverse beta decay (eâ» + pâº â†’ n + Î½_e) on metal hydride "
            "surfaces. The resulting ultra-low momentum neutrons have enormous "
            "capture cross-sections, producing transmutations and heat."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "surface_plasmon_energy_eV": {
                "default": 10.0,
                "description": "Surface plasmon polariton energy in eV",
            },
            "electron_mass_renormalization": {
                "default": 4.0,
                "description": "Ratio m*/m_e (threshold ~2.53 for inverse beta decay)",
            },
            "neutron_capture_cross_section_barn": {
                "default": 1e6,
                "description": "ULM neutron capture cross-section in barns (1/v enhanced)",
            },
            "m_e_star_over_m_e": {
                "default": 4.0,
                "description": "Alias for electron_mass_renormalization (m*/m_e)",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        T = conditions.get("temperature", 0)
        n_e = conditions.get("electron_density", 0)
        return T > 0 and n_e > 0

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        T = conditions.get("temperature", 300.0)
        n_e = conditions.get("electron_density", 6.8e28)
        loading = conditions.get("loading_ratio", 0.9)

        if not self.is_applicable(conditions):
            return self._neutral("Temperature or electron density is zero")

        E_spp = config.get("surface_plasmon_energy_eV", 10.0) * E_CHARGE
        mass_ratio = config.get("electron_mass_renormalization", config.get("m_e_star_over_m_e", 4.0))
        sigma_capture_barn = config.get("neutron_capture_cross_section_barn", 1e6)

        # Mass renormalization condition (Widom & Larsen 2006, beta_0 ~ 2.531):
        # energy conservation for e- + p+ -> n + nu_e requires
        # m* + m_p >= m_n, i.e. m* >= (m_n - m_p) ~ 2.531 m_e.
        # (A previous version added an extra m_e, using ~3.531 m_e.)
        m_star = mass_ratio * ME
        m_threshold = MN - MP  # ~2.531 m_e

        # Is renormalization sufficient?
        mass_sufficient = m_star >= m_threshold
        # Weak cross-section and Boltzmann suppression (for observables)
        sigma_weak = calculate_weak_interaction_cross_section(1e6)
        boltzmann_suppression = math.exp(-THRESHOLD_ELECTRON_MEV * 1e6 * E_CHARGE / (KB * T)) if T > 0 else 0.0

        if not mass_sufficient:
            # Below threshold: no ULM neutron production
            enhancement = 1.0
            n_production_rate = 0.0
        else:
            # Kinetic energy of produced neutron: E_n = (m* - m_n + m_p - m_e) Ã— cÂ²
            # For ULM neutrons: E_n â†’ 0  (ultra-low momentum)
            excess_mass_energy = (m_star - m_threshold) * C**2
            E_neutron = max(excess_mass_energy, 0.0)

            # ULM neutron velocity
            v_neutron = math.sqrt(2.0 * max(E_neutron, 1e-30) / MN)

            # Neutron capture cross-section: Ïƒ âˆ 1/v for thermal/ULM neutrons
            sigma_capture_m2 = sigma_capture_barn * 1e-28
            v_thermal = math.sqrt(2.0 * KB * T / MN)
            if v_neutron > 0:
                sigma_ulm = sigma_capture_m2 * v_thermal / v_neutron
            else:
                sigma_ulm = sigma_capture_m2 * 1e6  # effectively infinite

            # Surface proton density (protons on surface ~ loading * e- density)
            n_surface = n_e * loading
            # Weak interaction rate via p + e- -> n + nu_e (cross-section + Boltzmann)
            n_production_rate = calculate_neutron_formation_rate(n_surface, n_e, T, sigma=sigma_weak)


            # Enhancement through neutron capture chain
            # Each captured ULM neutron releases ~6-8 MeV binding energy as heat
            capture_energy_MeV = 6.0
            capture_energy_J = capture_energy_MeV * 1e6 * E_CHARGE

            enhancement = max(1.0, min(
                n_production_rate * sigma_ulm * ULM_CHAIN_RATE_TO_ENHANCEMENT,
                MAX_ENHANCEMENT_FACTOR
            ))

        # Products: transmutations, some tritium, heat
        transmutation_fraction = 0.7 if mass_sufficient else 0.0
        tritium_fraction = 0.2 if mass_sufficient else 0.0

        # Confidence: depends on mass renormalization quality
        mass_score = min(mass_ratio / 2.531, 1.0) if mass_sufficient else 0.3
        loading_score = min(loading, 1.0)
        confidence = 0.5 * mass_score * loading_score  # 0.5 = theoretical model

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=0.0,
            observables={
                "mass_renormalization_ratio": mass_ratio,
                "mass_threshold_ratio": m_threshold / ME,
                "mass_sufficient": 1.0 if mass_sufficient else 0.0,
                "Q_inverse_beta_MeV": Q_INVERSE_BETA_MEV,
                "weak_cross_section_m2": sigma_weak,
                "boltzmann_suppression": boltzmann_suppression,
                "threshold_MeV": THRESHOLD_ELECTRON_MEV,
                "neutron_production_rate": n_production_rate,
                "transmutation_fraction": transmutation_fraction,
                "tritium_fraction": tritium_fraction,
                "product_He4": 0.1,  # secondary
                "product_neutrons": 0.0,  # ULM neutrons absorbed locally
                "product_gamma": 0.0,  # gamma shielded by heavy electrons
                "product_transmutation": transmutation_fraction,
            },
            parameters_used={
                "temperature": T,
                "electron_density": n_e,
                "loading_ratio": loading,
                "surface_plasmon_energy_eV": E_spp / E_CHARGE,
                "electron_mass_renormalization": mass_ratio,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Widom A. & Larsen L. (2006) Eur. Phys. J. C 46, 107",
                "Widom A. & Larsen L. (2007) arXiv:nucl-th/0608059v2",
                "Larsen L. & Widom A. (2008) arXiv:0709.3905",
                # Contested: principal critique cited per RR-008 / citation policy.
                "Tennfors E. (2013) Eur. Phys. J. Plus 128, 15 [critique] "
                "doi:10.1140/epjp/i2013-13015-3",
            ],
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Widom A. & Larsen L. (2006) Eur. Phys. J. C 46, 107",
                "Widom A. & Larsen L. (2007) arXiv:nucl-th/0608059v2",
                "Tennfors E. (2013) Eur. Phys. J. Plus 128, 15 [critique] "
                "doi:10.1140/epjp/i2013-13015-3",
            ],
            category="mechanism",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("WidomLarsen not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )

