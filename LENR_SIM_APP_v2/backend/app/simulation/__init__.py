"""
Simulation Module for LENR_Sim_App

This module contains the simulation engine and related components for
running Low Energy Nuclear Reaction simulations.
"""

from .domain import SimulationDomain
from .species import Species
from .reaction import Reaction
from .engine import SimulationEngine, SimulationConfig

# Import multi-physics coupling
from .multi_physics import (
    PhysicsDomainManager,
    DomainInterface,
    StateRepository,
    DomainCoupler,
    NuclearDomain,
    ThermalDomain
)

__all__ = [
    'SimulationDomain',
    'Species',
    'Reaction',
    'SimulationEngine',
    'SimulationConfig',
    # Multi-physics coupling
    'PhysicsDomainManager',
    'DomainInterface',
    'StateRepository',
    'DomainCoupler',
    'NuclearDomain',
    'ThermalDomain'
] 