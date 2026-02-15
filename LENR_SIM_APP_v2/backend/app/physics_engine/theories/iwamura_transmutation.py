"""
Iwamura Transmutation via Multi-body D Permeation Theory Module

Physics:
    Yasuhiro Iwamura demonstrated nuclear transmutations when D₂ gas
    permeates through multilayer Pd/CaO/Pd thin film structures.
    Specific transmutations observed:
    - Cs (Z=55) → Pr (Z=59): ΔZ = +4  (4 deuterons absorbed)
    - Ba (Z=56) → Sm (Z=62): ΔZ = +6
    - Sr (Z=38) → Mo (Z=42): ΔZ = +4

    The CaO interlayer acts as a deuterium concentrator, creating
    extremely high local D densities at the interface.  The mechanism
    is consistent with multi-body deuteron absorption by the target
    nucleus, mediated by the nanostructured interface.

References
----------
[1] Iwamura, Y. et al. (2002). "Elemental Analysis of Pd Complexes:
    Effects of D₂ Gas Permeation". Jpn. J. Appl. Phys. 41, 4642.
[2] Iwamura, Y. et al. (2004). "Observation of nuclear transmutation
    reactions induced by D₂ gas permeation through Pd complexes".
    Proc. ICCF-11, 339-350.
[3] Higashizono, Y. et al. (2009). "Replication of Iwamura
    transmutation experiment". Proc. ICCF-15, 435.
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

# Transmutation reactions and their Q-values (approximate, from mass tables)
TRANSMUTATION_REACTIONS = {
    55: {"product_Z": 59, "product_name": "Pr", "delta_Z": 4, "Q_MeV": 50.5},   # Cs->Pr
    56: {"product_Z": 62, "product_name": "Sm", "delta_Z": 6, "Q_MeV": 55.0},   # Ba->Sm
    38: {"product_Z": 42, "product_name": "Mo", "delta_Z": 4, "Q_MeV": 45.0},   # Sr->Mo
}


class IwamuraTransmutationTheory:
    """Multi-body D permeation transmutation in Pd/CaO/Pd multilayers."""

    @property
    def theory_id(self) -> str:
        return "iwamura_transmutation"

    @property
    def theory_name(self) -> str:
        return "Iwamura Transmutation (D Permeation)"

    @property
    def description(self) -> str:
        return (
            "Nuclear transmutations via D₂ permeation through Pd/CaO/Pd multilayer "
            "structures. Observed: Cs→Pr (ΔZ=4), Ba→Sm (ΔZ=6), Sr→Mo (ΔZ=4). "
            "The CaO interlayer concentrates deuterium at the interface, enabling "
            "multi-body deuteron absorption."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "d2_flux_rate": {
                "default": 1e18,
                "description": "D₂ flux rate through membrane (atoms/m²/s)",
            },
            "cao_layer_thickness_nm": {
                "default": 40.0,
                "description": "CaO interlayer thickness in nm",
            },
            "target_element_Z": {
                "default": 55,
                "description": "Atomic number of target element (55=Cs, 56=Ba, 38=Sr)",
            },
            "permeation_time_s": {
                "default": 3600.0,
                "description": "Total permeation time in seconds",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        T = conditions.get("temperature", 0)
        return T > 200  # permeation requires elevated temperature

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        T = conditions.get("temperature", 300.0)
        loading = conditions.get("loading_ratio", 0.9)
        pressure = conditions.get("pressure", 101325.0)

        if not self.is_applicable(conditions):
            return self._neutral("Temperature too low for D permeation")

        flux = config.get("d2_flux_rate", 1e18)
        t_cao_nm = config.get("cao_layer_thickness_nm", 40.0)
        Z_target = int(config.get("target_element_Z", 55))
        t_perm = config.get("permeation_time_s", 3600.0)

        t_cao = t_cao_nm * 1e-9

        # Get reaction data for target element
        rxn = TRANSMUTATION_REACTIONS.get(Z_target, {
            "product_Z": Z_target + 4,
            "product_name": f"Z={Z_target+4}",
            "delta_Z": 4,
            "Q_MeV": 50.0,
        })
        delta_Z = rxn["delta_Z"]
        Q_MeV = rxn["Q_MeV"]
        n_deuterons = delta_Z  # number of D absorbed

        # Local D density at CaO interface: enhanced by concentration effect
        # Deuterium accumulates in the CaO layer, creating a dense D "pocket"
        D_accumulated = flux * t_perm  # atoms/m²
        n_D_local = D_accumulated / max(t_cao, 1e-15)  # atoms/m³

        # Multi-body reaction probability:
        # P ∝ (n_D)^n_deuterons × σ_nuclear × exp(-Coulomb_barrier)
        # Coulomb barrier for multi-D absorption is partially screened
        # by the metallic electron gas
        E_thermal = 1.5 * KB * T

        # Effective Coulomb barrier for D + target(Z)
        # V_C = Z × e² / (4πε₀ × R_nuclear)
        R_nuclear = 1.2e-15 * (Z_target**(1.0/3.0) + 2.0**(1.0/3.0))
        V_coulomb = Z_target * E_CHARGE**2 / (4.0 * math.pi * EPS0 * R_nuclear)
        V_coulomb_eV = V_coulomb / E_CHARGE

        # Screening from electron gas (Debye-like)
        n_e = conditions.get("electron_density", 6.8e28)
        lambda_d = math.sqrt(EPS0 * KB * T / (max(n_e, 1e20) * E_CHARGE**2))
        screening_factor = math.exp(-R_nuclear / max(lambda_d, 1e-15))

        V_screened = V_coulomb * screening_factor
        V_screened_eV = V_screened / E_CHARGE

        # Tunnelling through screened barrier
        mu = MD * Z_target * MP / (MD + Z_target * MP)  # reduced mass (approx)
        eta = Z_target * ALPHA * math.sqrt(mu * C**2 / (2.0 * max(E_thermal, 1e-30)))
        eta = min(eta, 250.0)
        P_tunnel = math.exp(-2.0 * math.pi * eta)

        # Multi-body concentration factor: (n_D / n_ref)^n_deuterons
        n_ref = 6.8e28  # reference D density
        conc_factor = (n_D_local / max(n_ref, 1.0))**min(n_deuterons, 4)
        conc_factor = min(conc_factor, 1e20)

        # Enhancement
        enhancement = max(1.0, conc_factor * 1e6)  # CaO concentration effect
        enhancement = min(enhancement, MAX_ENHANCEMENT_FACTOR)

        # Transmutation rate estimate
        sigma_nuclear = 1e-28  # 1 barn (rough nuclear cross-section)
        rate_per_m2 = n_D_local * P_tunnel * sigma_nuclear * flux * conc_factor
        rate_per_m2 = min(rate_per_m2, 1e30)

        # Confidence: based on experimental replication
        flux_score = min(flux / 1e18, 1.0)
        loading_score = min(loading, 1.0)
        confidence = 0.75 * flux_score * loading_score  # 0.75 = well-replicated

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=0.0,
            observables={
                "target_Z": Z_target,
                "product_Z": rxn["product_Z"],
                "product_name": 0.0,  # numeric only
                "delta_Z": delta_Z,
                "Q_MeV": Q_MeV,
                "n_D_local_per_m3": n_D_local,
                "V_coulomb_screened_eV": V_screened_eV,
                "V_coulomb_bare_eV": V_coulomb_eV,
                "P_tunnel": P_tunnel,
                "concentration_factor": conc_factor,
                "transmutation_rate_per_m2_s": rate_per_m2,
                "product_He4": 0.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
                "product_transmutation": 1.0,
            },
            parameters_used={
                "temperature": T,
                "loading_ratio": loading,
                "d2_flux_rate": flux,
                "cao_layer_thickness_nm": t_cao_nm,
                "target_element_Z": Z_target,
                "permeation_time_s": t_perm,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Iwamura Y. et al. (2002) Jpn. J. Appl. Phys. 41, 4642",
                "Iwamura Y. et al. (2004) Proc. ICCF-11, 339",
                "Higashizono Y. et al. (2009) Proc. ICCF-15, 435",
            ],
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Iwamura Y. et al. (2002) Jpn. J. Appl. Phys. 41, 4642",
                "Iwamura Y. et al. (2004) Proc. ICCF-11, 339",
            ],
            category="mechanism",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("IwamuraTransmutation not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
