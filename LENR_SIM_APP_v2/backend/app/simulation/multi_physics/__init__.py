"""
Multi-Physics Coupling Interface

This package provides interfaces and implementations for coupling multiple physics domains
in LENR simulations, allowing for interactions between nuclear, thermal, mechanical, and
electromagnetic phenomena.
"""

from .interface import DomainInterface
from .domain_manager import PhysicsDomainManager
from .state_repository import StateRepository
from .domain_coupler import DomainCoupler
from .nuclear_domain import NuclearDomain
from .thermal_domain import ThermalDomain
from .visualization_hooks import (
    VisualizationEventType,
    VisualizationEvent,
    VisualizationEventListener,
    ResultAnalyzer,
    EventSystem,
    VisualizationHooks,
    default_hooks
)
from .visualization_utils import (
    extract_slice,
    extract_point,
    extract_line,
    extract_box,
    extract_sphere,
    compute_temperature_gradient,
    compute_reaction_energy_density,
    compute_heat_flux,
    compute_reaction_potential,
    compute_energy_distribution_entropy,
    register_default_extractors_and_quantities
)

__all__ = [
    # Core interfaces and domain management
    'DomainInterface',
    'PhysicsDomainManager',
    'StateRepository',
    'DomainCoupler',
    'NuclearDomain',
    'ThermalDomain',
    
    # Visualization hooks
    'VisualizationEventType',
    'VisualizationEvent',
    'VisualizationEventListener',
    'ResultAnalyzer',
    'EventSystem',
    'VisualizationHooks',
    'default_hooks',
    
    # Visualization utilities
    'extract_slice',
    'extract_point',
    'extract_line',
    'extract_box',
    'extract_sphere',
    'compute_temperature_gradient',
    'compute_reaction_energy_density',
    'compute_heat_flux',
    'compute_reaction_potential',
    'compute_energy_distribution_entropy',
    'register_default_extractors_and_quantities'
]
