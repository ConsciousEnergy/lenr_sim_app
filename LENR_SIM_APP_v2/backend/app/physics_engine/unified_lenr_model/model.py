"""
Core UnifiedLENRModel class - comprehensive LENR physics model.
"""
import numpy as np
import logging
import time
from typing import Dict, Any, Optional, List, Tuple

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR

from .config import (
    SimulationConfig,
    EnhancementResult,
    UnifiedSimulationResult,
    MaterialProperties,
    ReactantProperties,
)
from .screening import calculate_electron_screening
from .cross_sections import calculate_tunneling_probability, calculate_reaction_rate
from . import enhancements

logger = logging.getLogger(__name__)


class UnifiedLENRModel:
    """
    Comprehensive LENR physics model implementing unified theoretical framework.
    Integrates mechanisms from the paper Sections 2.1-2.8.
    """
    def __init__(self, config: Optional[SimulationConfig] = None):
        self.config = config or SimulationConfig()
        if self.config.random_seed is not None:
            np.random.seed(self.config.random_seed)
            logger.info("Random seed set to %s for reproducibility", self.config.random_seed)
        self._enhancement_cache = {}
        self._cache_key = None
        self._last_pipeline_result = None
        logger.info("UnifiedLENRModel initialized with %s-%s system",
            self.config.host_material.name, self.config.reactant.name)

    def _get_cache_key(self) -> str:
        if self._cache_key is None:
            key_parts = (
                self.config.host_material.name,
                self.config.reactant.name,
                round(self.config.temperature, 2),
                round(self.config.pressure, 2),
                round(self.config.electric_field, 2),
                round(self.config.loading_ratio, 4),
                round(self.config.defect_density, 2),
                round(self.config.surface_roughness, 12),
                self.config.enable_screening,
                self.config.enable_qed,
                self.config.enable_casimir,
                self.config.enable_coherence,
                self.config.enable_bubble_dynamics,
                self.config.enable_rydberg,
                self.config.use_theory_pipeline,
                tuple(sorted(self.config.enabled_theories)) if self.config.enabled_theories else None,
            )
            self._cache_key = str(hash(key_parts))
        return self._cache_key

    @property
    def last_pipeline_result(self):
        return self._last_pipeline_result

    def run_simulation(self) -> UnifiedSimulationResult:
        start_time = time.time()
        enhancements_list = self._calculate_all_enhancements()
        total_enhancement = self._combine_enhancements(enhancements_list)
        thresholds = self._check_thresholds()
        tunneling_prob = calculate_tunneling_probability(self.config, total_enhancement)
        reaction_rate = calculate_reaction_rate(self.config, tunneling_prob)
        excess_heat = self._calculate_excess_heat(reaction_rate)
        helium4_rate = self._calculate_helium4_rate(reaction_rate)
        neutron_rate = self._calculate_neutron_rate(reaction_rate)
        time_points, heat_output, enhancement_history = self._generate_time_series(
            excess_heat, total_enhancement)
        confidence = self._calculate_confidence(thresholds, enhancements_list)
        computation_time = time.time() - start_time
        return UnifiedSimulationResult(
            total_enhancement=total_enhancement,
            enhancement_breakdown=enhancements_list,
            excess_heat_watts=excess_heat,
            tunneling_probability=tunneling_prob,
            reaction_rate=reaction_rate,
            helium4_rate=helium4_rate,
            neutron_rate=neutron_rate,
            thresholds_met=thresholds,
            time_points=time_points,
            heat_output=heat_output,
            enhancement_history=enhancement_history,
            confidence=confidence,
            config=self.config,
            computation_time=computation_time,
        )

    def _calculate_all_enhancements(self) -> List[EnhancementResult]:
        cache_key = self._get_cache_key()
        if cache_key in self._enhancement_cache:
            logger.debug("Using cached enhancement results")
            return self._enhancement_cache[cache_key]
        if self.config.use_theory_pipeline:
            enhancements_list = self._calculate_enhancements_via_pipeline()
        else:
            enhancements_list = enhancements.calculate_enhancements_legacy(self.config)
        if len(self._enhancement_cache) > 100:
            oldest_key = next(iter(self._enhancement_cache))
            del self._enhancement_cache[oldest_key]
        self._enhancement_cache[cache_key] = enhancements_list
        return enhancements_list

    def _calculate_enhancements_via_pipeline(self) -> List[EnhancementResult]:
        from app.physics_engine.theory_pipeline import get_default_pipeline
        pipeline = get_default_pipeline()
        surface_roughness_nm = self.config.surface_roughness * 1e9
        gap_width_nm = max(0.5, surface_roughness_nm)
        conditions = {
            "temperature": self.config.temperature,
            "pressure": self.config.pressure,
            "electric_field": self.config.electric_field,
            "loading_ratio": self.config.loading_ratio,
            "defect_density": self.config.defect_density,
            "grain_size": self.config.grain_size,
            "surface_roughness": self.config.surface_roughness,
            "electron_density": self.config.host_material.electron_density,
            "debye_temperature": self.config.host_material.debye_temperature,
            "lattice_constant": self.config.host_material.lattice_constant,
            "atomic_mass": float(self.config.reactant.atomic_mass),
            "atomic_number": float(self.config.reactant.atomic_number),
            "gap_width_nm": gap_width_nm,
            "crack_width_nm": gap_width_nm,
        }
        pipeline_result = pipeline.run(
            conditions=conditions,
            enabled_theories=self.config.enabled_theories,
            theory_configs=self.config.theory_configs,
        )
        self._last_pipeline_result = pipeline_result
        enhancements_list = []
        for contrib in pipeline_result.contributions:
            if not contrib.is_applicable:
                continue
            enhancements_list.append(EnhancementResult(
                name=contrib.theory_name,
                value=contrib.enhancement_factor,
                threshold_met=contrib.confidence > 0.5,
                equation=f"TheoryPipeline/{contrib.theory_id}",
                parameters=contrib.parameters_used,
                category="primary" if contrib.confidence > 0.3 else "secondary",
            ))
        logger.info("TheoryPipeline returned %d applicable contributions", len(enhancements_list))
        return enhancements_list

    def _combine_enhancements(self, enhancements_list: List[EnhancementResult]) -> float:
        if not enhancements_list:
            return 1.0
        primary = [e for e in enhancements_list if e.category == "primary"]
        secondary = [e for e in enhancements_list if e.category == "secondary"]
        primary_product = np.prod([e.value for e in primary]) if primary else 1.0
        if secondary:
            secondary_contribution = np.exp(np.mean(np.log([e.value for e in secondary])))
        else:
            secondary_contribution = 1.0
        return min(primary_product * secondary_contribution, MAX_ENHANCEMENT_FACTOR)

    def _check_thresholds(self) -> Dict[str, bool]:
        return {
            "loading_ratio_0.9": self.config.loading_ratio > 0.9,
            "surface_roughness_10nm": self.config.surface_roughness < 10e-9,
            "defect_density_1e16": self.config.defect_density > 1e16,
            "electric_field_1e8": self.config.electric_field > 1e8,
            "temperature_optimal": 200 < self.config.temperature < 1000,
        }

    def _calculate_excess_heat(self, reaction_rate: float) -> float:
        if self.config.reactant.name == "Deuterium":
            Q_reaction = 24e6 * 1.602e-19
        else:
            Q_reaction = 6e6 * 1.602e-19
        V = self.config.grain_size**3 * 1e6
        return reaction_rate * Q_reaction * V

    def _calculate_helium4_rate(self, reaction_rate: float) -> float:
        branch_ratio = 0.5 if self.config.reactant.name == "Deuterium" else 0.0
        V = self.config.grain_size**3 * 1e6
        return reaction_rate * branch_ratio * V

    def _calculate_neutron_rate(self, reaction_rate: float) -> float:
        branch_ratio = 0.5 if self.config.reactant.name == "Deuterium" else 0.0
        V = self.config.grain_size**3 * 1e6
        return reaction_rate * branch_ratio * V * 0.01

    def _generate_time_series(self, base_heat: float, base_enhancement: float
    ) -> Tuple[List[float], List[float], List[float]]:
        time_points = np.linspace(0, self.config.total_time, self.config.time_steps)
        noise = (1.0 + 0.1 * np.sin(2 * np.pi * time_points / 2) +
            0.05 * np.sin(4 * np.pi * time_points / 2) +
            0.03 * np.sin(6 * np.pi * time_points / 2) +
            0.02 * np.sin(8 * np.pi * time_points / 2))
        ramp = 1 - np.exp(-time_points / 2)
        heat_output = (base_heat * noise * ramp).tolist()
        enhancement_history = (base_enhancement * (0.9 + 0.1 * ramp)).tolist()
        return time_points.tolist(), heat_output, enhancement_history

    def _calculate_confidence(self, thresholds: Dict[str, bool],
        enhancements_list: List[EnhancementResult]) -> float:
        threshold_score = sum(thresholds.values()) / len(thresholds)
        enhancement_score = sum(1 for e in enhancements_list if e.threshold_met) / max(1, len(enhancements_list))
        return 0.5 * threshold_score + 0.5 * enhancement_score

    def get_mechanism_summary(self) -> Dict[str, Any]:
        enhancements_list = self._calculate_all_enhancements()
        return {
            "mechanisms": [{"name": e.name, "value": e.value, "threshold_met": e.threshold_met,
                "equation": e.equation, "category": e.category, "parameters": e.parameters}
                for e in enhancements_list],
            "total_enhancement": self._combine_enhancements(enhancements_list),
            "thresholds": self._check_thresholds(),
        }

    def clear_cache(self):
        self._enhancement_cache.clear()
        self._cache_key = None
        logger.debug("Enhancement cache cleared")