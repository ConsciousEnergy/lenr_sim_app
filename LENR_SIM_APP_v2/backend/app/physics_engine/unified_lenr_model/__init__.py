"""
Unified LENR Model - Comprehensive Physics Implementation

Implements the theoretical framework from:
"A Unified Theoretical and Mathematical Framework for Low-Energy Nuclear Reactions"

Backward compatibility: from app.physics_engine.unified_lenr_model import UnifiedLENRModel
"""

from .model import UnifiedLENRModel
from .config import (
    SimulationConfig,
    MaterialProperties,
    ReactantProperties,
    MaterialSystem,
    EnhancementResult,
    UnifiedSimulationResult,
    get_material_work_function,
    get_double_layer_potential,
)


def create_simulation(system_type: str = "pd_d", **kwargs) -> UnifiedLENRModel:
    """Factory function to create simulation with preset configurations."""
    config = SimulationConfig()
    if system_type == "pd_d":
        config.host_material = MaterialProperties.palladium()
        config.reactant = ReactantProperties.deuterium()
    elif system_type == "ni_h":
        config.host_material = MaterialProperties.nickel()
        config.reactant = ReactantProperties.hydrogen()
    elif system_type == "ti_d":
        config.host_material = MaterialProperties.titanium()
        config.reactant = ReactantProperties.deuterium()
    elif system_type == "pd_h":
        config.host_material = MaterialProperties.palladium()
        config.reactant = ReactantProperties.hydrogen()
    elif system_type == "ni_d":
        config.host_material = MaterialProperties.nickel()
        config.reactant = ReactantProperties.deuterium()
    elif system_type == "li_h":
        config.host_material = MaterialProperties.lithium()
        config.reactant = ReactantProperties.hydrogen()
    elif system_type == "zro2_pd":
        config.host_material = MaterialProperties.palladium()
        config.reactant = ReactantProperties.deuterium()
    else:
        config.host_material = MaterialProperties.generic(system_type)
        config.reactant = ReactantProperties.deuterium()
    for key, value in kwargs.items():
        if hasattr(config, key):
            setattr(config, key, value)
    return UnifiedLENRModel(config)


__all__ = [
    "UnifiedLENRModel",
    "SimulationConfig",
    "MaterialProperties",
    "ReactantProperties",
    "MaterialSystem",
    "EnhancementResult",
    "UnifiedSimulationResult",
    "get_material_work_function",
    "get_double_layer_potential",
    "create_simulation",
]