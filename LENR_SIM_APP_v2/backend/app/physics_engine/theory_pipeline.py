"""
Theory Pipeline Orchestrator for LENR Theory Testbed

Maintains a registry of TheoryModule instances and provides methods to:
- List registered theories with metadata
- Run a subset of theories against a set of physical conditions
- Combine contributions: multiplicative for enhancement factors,
  additive for energy outputs
- Validate conditions against theory applicability

This module is consumed by the API layer (``api/routes/physics.py``) and
by the frontend via the ``/api/physics/theories`` endpoints.
"""

from __future__ import annotations

import logging
from typing import Dict, Any, List, Optional

from app.physics_engine.theory_protocol import (
    TheoryContribution,
    TheoryMetadata,
    TheoryModule,
)
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR, MILES_HEAT_HELIUM_RATE
from app.utils.json_safe import to_json_safe

logger = logging.getLogger(__name__)


class TheoryPipelineResult:
    """Unified result from running one or more theories."""

    def __init__(
        self,
        contributions: List[TheoryContribution],
        combined_enhancement: float,
        combined_reaction_rate_modifier: float,
        total_energy_watts: float,
        conditions: Dict[str, float],
        enabled_theories: List[str],
    ):
        self.contributions = contributions
        self.combined_enhancement = combined_enhancement
        self.combined_reaction_rate_modifier = combined_reaction_rate_modifier
        self.total_energy_watts = total_energy_watts
        self.conditions = conditions
        self.enabled_theories = enabled_theories

    def to_dict(self) -> Dict[str, Any]:
        """Serialise to a JSON-friendly dictionary."""
        # Miles heat-helium cross-check (Phase 5.1)
        # 1 W excess heat ≈ 2.6×10^11 He-4 atoms/s
        expected_he4_rate = self.total_energy_watts * MILES_HEAT_HELIUM_RATE

        return {
            "combined_enhancement": float(self.combined_enhancement),
            "combined_reaction_rate_modifier": float(self.combined_reaction_rate_modifier),
            "total_energy_watts": float(self.total_energy_watts),
            "conditions": to_json_safe(self.conditions),
            "enabled_theories": self.enabled_theories,
            "validation": {
                "miles_heat_helium": {
                    "expected_he4_rate_per_s": expected_he4_rate,
                    "rate_constant": MILES_HEAT_HELIUM_RATE,
                    "note": "1 W excess heat = 2.6e11 He-4/s (Miles 1993)",
                },
            },
            "per_theory": [
                {
                    "theory_id": c.theory_id,
                    "theory_name": c.theory_name,
                    "enhancement_factor": float(c.enhancement_factor),
                    "reaction_rate_modifier": float(c.reaction_rate_modifier),
                    "energy_output_watts": float(c.energy_output_watts),
                    "observables": to_json_safe(c.observables),
                    "parameters_used": to_json_safe(c.parameters_used),
                    "is_applicable": bool(c.is_applicable),
                    "confidence": float(c.confidence),
                    "references": list(c.references),
                }
                for c in self.contributions
            ],
        }


class TheoryPipeline:
    """Orchestrator that manages and runs theory modules."""

    def __init__(self) -> None:
        self._registry: Dict[str, TheoryModule] = {}

    # ------------------------------------------------------------------
    # Registry management
    # ------------------------------------------------------------------

    def register(self, module: TheoryModule) -> None:
        """Register a theory module."""
        tid = module.theory_id
        if tid in self._registry:
            logger.warning("Overwriting theory module '%s'", tid)
        self._registry[tid] = module
        logger.info("Registered theory module '%s' (%s)", tid, module.theory_name)

    def unregister(self, theory_id: str) -> None:
        """Remove a theory module from the registry."""
        self._registry.pop(theory_id, None)

    def get_module(self, theory_id: str) -> Optional[TheoryModule]:
        """Return a single module by id, or ``None``."""
        return self._registry.get(theory_id)

    @property
    def registered_ids(self) -> List[str]:
        return list(self._registry.keys())

    # ------------------------------------------------------------------
    # Metadata / listing
    # ------------------------------------------------------------------

    def list_theories(self) -> List[Dict[str, Any]]:
        """Return metadata for every registered theory (JSON-serialisable)."""
        results: List[Dict[str, Any]] = []
        for module in self._registry.values():
            meta = module.get_metadata()
            results.append(
                {
                    "theory_id": meta.theory_id,
                    "theory_name": meta.theory_name,
                    "description": meta.description,
                    "configurable_parameters": meta.configurable_parameters,
                    "references": meta.references,
                    "category": meta.category,
                }
            )
        return results

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    def run(
        self,
        conditions: Dict[str, float],
        enabled_theories: Optional[List[str]] = None,
        theory_configs: Optional[Dict[str, Dict[str, Any]]] = None,
    ) -> TheoryPipelineResult:
        """Run selected (or all) theories and combine their contributions.

        Args:
            conditions: Physical conditions (temperature, pressure, etc.).
            enabled_theories: List of ``theory_id`` strings to run.  If
                ``None``, all registered theories are run.
            theory_configs: Optional per-theory configuration overrides,
                keyed by ``theory_id``.

        Returns:
            A :class:`TheoryPipelineResult` with per-theory breakdown and
            combined totals.
        """
        if enabled_theories is None:
            enabled_theories = list(self._registry.keys())

        theory_configs = theory_configs or {}

        contributions: List[TheoryContribution] = []

        for tid in enabled_theories:
            module = self._registry.get(tid)
            if module is None:
                logger.warning("Theory '%s' not found in registry -- skipping", tid)
                continue

            config = theory_configs.get(tid)

            try:
                contribution = module.calculate(conditions, config)
                contributions.append(contribution)
            except Exception:
                logger.exception("Error running theory '%s'", tid)
                # Append a neutral contribution so the caller sees the error
                contributions.append(
                    TheoryContribution(
                        theory_id=tid,
                        theory_name=module.theory_name,
                        is_applicable=False,
                        confidence=0.0,
                    )
                )

        # ----- Combine contributions -----
        combined_enhancement = 1.0
        combined_rate_modifier = 1.0
        total_energy = 0.0

        for c in contributions:
            if c.is_applicable:
                combined_enhancement *= c.enhancement_factor
                combined_rate_modifier *= c.reaction_rate_modifier
                total_energy += c.energy_output_watts

        # Cap combined enhancement at the theory-level ceiling
        combined_enhancement = min(combined_enhancement, MAX_ENHANCEMENT_FACTOR)

        return TheoryPipelineResult(
            contributions=contributions,
            combined_enhancement=combined_enhancement,
            combined_reaction_rate_modifier=combined_rate_modifier,
            total_energy_watts=total_energy,
            conditions=conditions,
            enabled_theories=enabled_theories,
        )

    def run_single(
        self,
        theory_id: str,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        """Run a single theory in isolation.

        Raises:
            KeyError: If the theory is not registered.
        """
        module = self._registry.get(theory_id)
        if module is None:
            raise KeyError(f"Theory '{theory_id}' not found in registry")

        return module.calculate(conditions, config)

    # -- Coupled pipeline (v0.3.3-beta) ------------------------------------

    def run_coupled(
        self,
        conditions: Dict[str, float],
        enabled_theories: Optional[List[str]] = None,
        theory_configs: Optional[Dict[str, Dict[str, Any]]] = None,
    ) -> TheoryPipelineResult:
        """Run theories in dependency order, injecting outputs downstream.

        Uses the :class:`TheoryGraph` topological sort to determine
        execution order.  After each theory runs, its observable outputs
        are merged into the conditions dict so downstream theories can
        use them.  Namespaced as ``{theory_id}__{key}`` to avoid
        collisions, with select high-value keys also promoted to the
        top-level conditions.

        Returns a standard :class:`TheoryPipelineResult` whose
        ``.conditions`` contains the fully enriched dict.
        """
        from app.physics_engine.theory_relationships import TheoryGraph

        if enabled_theories is None:
            enabled_theories = list(self._registry.keys())

        theory_configs = theory_configs or {}

        graph = TheoryGraph()
        execution_order = graph.topological_sort(enabled_theories)

        # Filter to only registered theories (in order)
        execution_order = [
            tid for tid in execution_order if tid in self._registry
        ]

        enriched = dict(conditions)
        contributions: List[TheoryContribution] = []

        # Key observables that are promoted to top-level conditions
        # so downstream theories can consume them without knowing
        # which upstream produced them.
        PROMOTED_KEYS = {
            "screening_potential_eV",
            "T_peak_K",
            "P_peak_Pa",
            "B_compressed_T",
            "he4_production_rate",
            "excess_power_W",
            "effective_site_density_m2",
            "correlation_coefficient",
        }

        for tid in execution_order:
            module = self._registry.get(tid)
            if module is None:
                continue

            config = theory_configs.get(tid)

            try:
                contrib = module.calculate(enriched, config)
            except Exception:
                logger.exception("Coupled pipeline: error in '%s'", tid)
                contrib = TheoryContribution(
                    theory_id=tid,
                    theory_name=module.theory_name,
                    is_applicable=False,
                    confidence=0.0,
                )

            contributions.append(contrib)

            # Inject outputs into enriched conditions for downstream use
            if contrib.is_applicable:
                for key, value in contrib.observables.items():
                    if isinstance(value, (int, float)):
                        enriched[f"{tid}__{key}"] = value
                        if key in PROMOTED_KEYS:
                            enriched[key] = value

        # Combine
        combined_enhancement = 1.0
        combined_rate = 1.0
        total_energy = 0.0
        for c in contributions:
            if c.is_applicable:
                combined_enhancement *= c.enhancement_factor
                combined_rate *= c.reaction_rate_modifier
                total_energy += c.energy_output_watts

        combined_enhancement = min(combined_enhancement, MAX_ENHANCEMENT_FACTOR)

        return TheoryPipelineResult(
            contributions=contributions,
            combined_enhancement=combined_enhancement,
            combined_reaction_rate_modifier=combined_rate,
            total_energy_watts=total_energy,
            conditions=enriched,
            enabled_theories=execution_order,
        )


# ---------------------------------------------------------------------------
# Singleton pipeline with auto-registration of built-in theories
# ---------------------------------------------------------------------------

_default_pipeline: Optional[TheoryPipeline] = None


def get_default_pipeline() -> TheoryPipeline:
    """Return (and lazily create) the default pipeline with all built-in theories."""
    global _default_pipeline
    if _default_pipeline is not None:
        return _default_pipeline

    pipeline = TheoryPipeline()

    # Import and register each built-in theory module
    try:
        from app.physics_engine.theories.electron_screening import ElectronScreeningTheory
        pipeline.register(ElectronScreeningTheory())
    except Exception:
        logger.exception("Failed to register ElectronScreeningTheory")

    try:
        from app.physics_engine.theories.coherent_qed import CoherentQEDTheory
        pipeline.register(CoherentQEDTheory())
    except Exception:
        logger.exception("Failed to register CoherentQEDTheory")

    try:
        from app.physics_engine.theories.hydroton import HydrotonTheory
        pipeline.register(HydrotonTheory())
    except Exception:
        logger.exception("Failed to register HydrotonTheory")

    try:
        from app.physics_engine.theories.nae_model import NAEModelTheory
        pipeline.register(NAEModelTheory())
    except Exception:
        logger.exception("Failed to register NAEModelTheory")

    try:
        from app.physics_engine.theories.bubble_mhd_confinement import BubbleMHDConfinementTheory
        pipeline.register(BubbleMHDConfinementTheory())
    except Exception:
        logger.exception("Failed to register BubbleMHDConfinementTheory")

    try:
        from app.physics_engine.theories.casimir_confinement import CasimirConfinementTheory
        pipeline.register(CasimirConfinementTheory())
    except Exception:
        logger.exception("Failed to register CasimirConfinementTheory")

    try:
        from app.physics_engine.theories.quantum_tunneling_theory import QuantumTunnelingTheory
        pipeline.register(QuantumTunnelingTheory())
    except Exception:
        logger.exception("Failed to register QuantumTunnelingTheory")

    # --- Phase 1A: Core New Theories ---

    try:
        from app.physics_engine.theories.takahashi_tsc import TakahashiTSCTheory
        pipeline.register(TakahashiTSCTheory())
    except Exception:
        logger.exception("Failed to register TakahashiTSCTheory")

    try:
        from app.physics_engine.theories.hagelstein_phonon import HagelsteinPhononTheory
        pipeline.register(HagelsteinPhononTheory())
    except Exception:
        logger.exception("Failed to register HagelsteinPhononTheory")

    try:
        from app.physics_engine.theories.vysotskii_ccs import VysotskiiCCSTheory
        pipeline.register(VysotskiiCCSTheory())
    except Exception:
        logger.exception("Failed to register VysotskiiCCSTheory")

    try:
        from app.physics_engine.theories.swartz_nanor import SwartzNanorTheory
        pipeline.register(SwartzNanorTheory())
    except Exception:
        logger.exception("Failed to register SwartzNanorTheory")

    try:
        from app.physics_engine.theories.miles_heat_helium import MilesHeatHeliumTheory
        pipeline.register(MilesHeatHeliumTheory())
    except Exception:
        logger.exception("Failed to register MilesHeatHeliumTheory")

    # --- Phase 1B: Complementary Theories ---

    try:
        from app.physics_engine.theories.widom_larsen import WidomLarsenTheory
        pipeline.register(WidomLarsenTheory())
    except Exception:
        logger.exception("Failed to register WidomLarsenTheory")

    try:
        from app.physics_engine.theories.kim_bec import KimBECTheory
        pipeline.register(KimBECTheory())
    except Exception:
        logger.exception("Failed to register KimBECTheory")

    try:
        from app.physics_engine.theories.matsumoto_enc import MatsumotoENCTheory
        pipeline.register(MatsumotoENCTheory())
    except Exception:
        logger.exception("Failed to register MatsumotoENCTheory")

    # --- Phase 1C: Extended Theories ---

    try:
        from app.physics_engine.theories.chubb_ion_band import ChubbIonBandTheory
        pipeline.register(ChubbIonBandTheory())
    except Exception:
        logger.exception("Failed to register ChubbIonBandTheory")

    try:
        from app.physics_engine.theories.piantelli_ni_h import PiantelliNiHTheory
        pipeline.register(PiantelliNiHTheory())
    except Exception:
        logger.exception("Failed to register PiantelliNiHTheory")

    try:
        from app.physics_engine.theories.iwamura_transmutation import IwamuraTransmutationTheory
        pipeline.register(IwamuraTransmutationTheory())
    except Exception:
        logger.exception("Failed to register IwamuraTransmutationTheory")

    try:
        from app.physics_engine.theories.letts_laser import LettsLaserTheory
        pipeline.register(LettsLaserTheory())
    except Exception:
        logger.exception("Failed to register LettsLaserTheory")

    # --- Phase 2: Legacy Module Wrappers (v0.3.3-beta) ---

    try:
        from app.physics_engine.theories.phonon_coupling_legacy import PhononCouplingLegacyTheory
        pipeline.register(PhononCouplingLegacyTheory())
    except Exception:
        logger.exception("Failed to register PhononCouplingLegacyTheory")

    try:
        from app.physics_engine.theories.non_equilibrium_thermo import NonEquilibriumThermoTheory
        pipeline.register(NonEquilibriumThermoTheory())
    except Exception:
        logger.exception("Failed to register NonEquilibriumThermoTheory")

    _default_pipeline = pipeline
    logger.info(
        "Default pipeline initialised with %d theories: %s",
        len(pipeline.registered_ids),
        pipeline.registered_ids,
    )
    return _default_pipeline
