"""Electron screening enhancement calculation for unified LENR model."""
import logging
from typing import TYPE_CHECKING

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

from .config import EnhancementResult

if TYPE_CHECKING:
    from .config import SimulationConfig

logger = logging.getLogger(__name__)


def calculate_electron_screening(config: "SimulationConfig") -> EnhancementResult:
    """
    Calculate electron screening enhancement via the shared Assenbaum–Rolfs kernel.

    Previously this path used a Debye-length potential and a hard-coded 1e6 cap,
    which disagreed with the bubble-lattice production path (cited material
    potentials + ``MAX_ENHANCEMENT_FACTOR``). Both now call
    ``compute_screening_enhancement``.

    The kernel is imported lazily to avoid a circular import through
    ``unified_lenr_model.__init__`` → ``model`` → this module.
    """
    from app.physics_engine.screening_kernel import (
        SCREENING_MODEL_ID,
        compute_screening_enhancement,
    )

    T = config.temperature
    material = getattr(config.host_material, "name", None) or getattr(
        config.host_material, "symbol", "palladium"
    )
    result = compute_screening_enhancement(
        temperature_k=T,
        material=str(material).lower(),
    )
    enhancement = float(result["enhancement"])
    if enhancement != enhancement or enhancement in (float("inf"), float("-inf")):
        logger.warning(
            "Non-finite screening enhancement; capping to MAX_ENHANCEMENT_FACTOR"
        )
        enhancement = float(MAX_ENHANCEMENT_FACTOR)
    U_screen_ev = float(result.get("screening_potential_ev") or 0.0)
    threshold_met = U_screen_ev > 10
    return EnhancementResult(
        name="Electron Screening",
        value=enhancement,
        threshold_met=threshold_met,
        equation="f = exp(pi*eta*U_s/E)",
        parameters={
            "U_screen_eV": U_screen_ev,
            "screening_model": SCREENING_MODEL_ID,
            "log10_enhancement_raw": result.get("log10_enhancement_raw"),
            # EQ-ASSEN-DOM-01 / Lean Assenbaum: formula not claimed when U_e ≥ E.
            "assenbaum_applicable": result.get("assenbaum_applicable"),
            "formula_claimed": result.get("formula_claimed"),
            "domain_equation_id": result.get("domain_equation_id"),
            "exceeds_adiabatic_limit": result.get("exceeds_adiabatic_limit"),
            "thermal_energy_ev": result.get("thermal_energy_ev"),
        },
        category="primary",
    )
