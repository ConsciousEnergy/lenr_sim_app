"""
Expanded NAE (Nuclear Active Environment) Theory Module

Models the statistical distribution and filtering of NAE sites in a lattice.

Physics:
    - Crack-size filtering: only cracks of ~1 nm width support reaction
      (too wide → no confinement; too narrow → no H access)
    - Simultaneity requirement: multiple conditions must converge at the NAE
      site simultaneously (loading, field, temperature, oxide-free surface)
    - Site probability distribution: NAE density as a function of material
      preparation quality
    - Loading purity: continuous parameter for hydrogen density at NAE,
      oxide-free condition (not binary)

References:
    Storms E. (2007) "The Science of Low Energy Nuclear Reaction"
    Storms E. (2014) "The Explanation of Low Energy Nuclear Reaction"
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional

import numpy as np
from scipy import constants as const

from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata
from app.physics_engine.constants import (
    MAX_ENHANCEMENT_FACTOR,
    NIH_ACTIVATION_TEMPERATURE_K,
)

logger = logging.getLogger(__name__)

KB = const.k
E_CHARGE = const.e


class NAEModelTheory:
    """Nuclear Active Environment site-probability model."""

    @property
    def theory_id(self) -> str:
        return "nae_model"

    @property
    def theory_name(self) -> str:
        return "Nuclear Active Environment (NAE)"

    @property
    def description(self) -> str:
        return (
            "Statistical model of NAE site density based on crack-width "
            "filtering, hydrogen loading purity, oxide coverage, and "
            "simultaneity of multiple activation conditions."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "crack_width_nm": {
                "default": 1.0,
                "description": "Mean crack width in nm",
            },
            "crack_width_sigma_nm": {
                "default": 0.3,
                "description": "Crack width distribution σ (nm)",
            },
            "oxide_coverage_fraction": {
                "default": 0.1,
                "description": "Fraction of surface covered by oxide (0-1)",
            },
            "site_density_m2": {
                "default": 1e14,
                "description": "Potential NAE site density per m²",
            },
            "hydrogen_loading_purity": {
                "default": 0.9,
                "description": "H-accessible surface fraction (0-1)",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        loading = conditions.get("loading_ratio", 0)
        return loading > 0.3

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        T = conditions.get("temperature", 300.0)
        loading = conditions.get("loading_ratio", 0.9)
        material = conditions.get("material_system", "pd_d")

        crack_width = config.get("crack_width_nm", 1.0)
        crack_sigma = config.get("crack_width_sigma_nm", 0.3)
        oxide_frac = config.get(
            "oxide_coverage_fraction",
            conditions.get("oxide_coverage_fraction", 0.1),
        )
        site_density = config.get("site_density_m2", 1e14)
        h_purity = config.get(
            "hydrogen_loading_purity",
            conditions.get("hydrogen_loading_purity", loading),
        )

        if not self.is_applicable(conditions):
            return self._neutral("Loading ratio too low for NAE formation")

        # --- Crack-width filtering ---
        # Optimal width ~1 nm (Gaussian fitness centred at 1 nm)
        optimal_width = 1.0  # nm
        crack_fitness = math.exp(-((crack_width - optimal_width) / crack_sigma) ** 2)

        # --- Oxide-free requirement ---
        oxide_free_fraction = max(0.0, 1.0 - oxide_frac)

        # --- Loading purity ---
        h_purity = max(0.0, min(1.0, h_purity))

        # --- Ni-H thermal activation threshold ---
        # For Ni-H systems reactions only activate above ~700°C (973 K)
        thermal_activation = 1.0
        is_nih = "ni" in str(material).lower()
        if is_nih:
            if T < NIH_ACTIVATION_TEMPERATURE_K:
                thermal_activation = math.exp(
                    -(NIH_ACTIVATION_TEMPERATURE_K - T) / 100.0
                )
            # else: thermal_activation stays 1.0

        # --- Simultaneity factor ---
        # All conditions must be met simultaneously; multiply probabilities
        simultaneity = crack_fitness * oxide_free_fraction * h_purity * thermal_activation

        # Effective NAE site density
        effective_sites_m2 = site_density * simultaneity

        # --- Enhancement from NAE ---
        # More NAE sites → proportionally higher reaction rate
        # Normalise to a reference site density (1e12 m⁻²)
        reference_density = 1e12
        enhancement = 1.0 + (effective_sites_m2 / reference_density)
        enhancement = min(enhancement, MAX_ENHANCEMENT_FACTOR)

        confidence = simultaneity

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=0.0,
            observables={
                "crack_fitness": crack_fitness,
                "oxide_free_fraction": oxide_free_fraction,
                "hydrogen_loading_purity": h_purity,
                "thermal_activation_factor": thermal_activation,
                "simultaneity_factor": simultaneity,
                "effective_site_density_m2": effective_sites_m2,
                # NAE enables D+D -> He-4 (Storms 2007, 2014); primary product
                "product_He4": 1.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": T,
                "loading_ratio": loading,
                "crack_width_nm": crack_width,
                "oxide_coverage_fraction": oxide_frac,
                "site_density_m2": site_density,
                "hydrogen_loading_purity": h_purity,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Storms E. (2007) The Science of Low Energy Nuclear Reaction",
                "Storms E. (2014) The Explanation of LENR",
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
        logger.debug("NAE not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
