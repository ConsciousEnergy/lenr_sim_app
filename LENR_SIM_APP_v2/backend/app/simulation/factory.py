"""
Simulation Factory Module

This module provides factory methods for creating different types of simulations.
"""

import logging
from typing import Dict, Any, Optional

from app.utils.logging import setup_logger
from app.simulation.domain import SimulationDomain
from app.simulation.engine import SimulationEngine, SimulationConfig
from app.simulation.engines.simple import SimpleSimulationEngine
from app.simulation.engines.advanced import AdvancedSimulationEngine
from app.simulation.multi_physics.fem_simulation import FEMSimulationEngine, create_fem_engine

# Set up logger
logger = setup_logger("simulation_factory", "logs/simulation.log")

def create_simulation_engine(
    engine_type: str,
    config: Optional[Dict[str, Any]] = None
) -> SimulationEngine:
    """
    Create a simulation engine of the specified type.
    
    Args:
        engine_type: Type of simulation engine to create
        config: Configuration for the simulation engine
        
    Returns:
        Simulation engine instance
    """
    # Create simulation config from dictionary
    sim_config = SimulationConfig(**(config or {}))
    
    # Create engine based on type
    if engine_type.lower() == "simple":
        logger.info("Creating simple simulation engine")
        return SimpleSimulationEngine(sim_config)
    elif engine_type.lower() == "advanced":
        logger.info("Creating advanced simulation engine")
        return AdvancedSimulationEngine(sim_config)
    elif engine_type.lower() == "fem":
        logger.info("Creating FEM simulation engine")
        return create_fem_engine(sim_config)
    else:
        logger.warning(f"Unknown engine type: {engine_type}, defaulting to simple")
        return SimpleSimulationEngine(sim_config)

def create_simulation(
    engine_type: str,
    domain: SimulationDomain,
    config: Optional[Dict[str, Any]] = None
) -> SimulationEngine:
    """
    Create and initialize a simulation with the specified domain.
    
    Args:
        engine_type: Type of simulation engine to create
        domain: Simulation domain
        config: Configuration for the simulation engine
        
    Returns:
        Initialized simulation engine
    """
    # Create engine
    engine = create_simulation_engine(engine_type, config)
    
    # Initialize with domain
    engine.initialize(domain)
    
    return engine 