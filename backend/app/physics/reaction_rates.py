"""
Fusion reaction rate calculations with optimized implementations.
"""

import numpy as np
from typing import Dict, Any, Optional, List
import logging

from app.physics.models import FusionEnhancementFactors
from app.physics.optimizations import (
    optimized_reaction_rate,
    vectorized_cross_section,
    optimized_maxwell_boltzmann
)
from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("reaction_rates", "logs/physics.log")

def calculate_reaction_rate(
    reaction_name: str,
    temperature: float,
    density: float,
    enhancement_factors: Optional[FusionEnhancementFactors] = None,
    include_tunneling: bool = True,
    include_screening: bool = True,
    n_cores: int = 4
) -> Dict[str, Any]:
    """
    Calculate fusion reaction rate with optimized implementation.
    
    Args:
        reaction_name: Name of the fusion reaction
        temperature: Plasma temperature in keV
        density: Number density in cm^-3
        enhancement_factors: Optional enhancement factors
        include_tunneling: Whether to include tunneling effects
        include_screening: Whether to include electron screening
        n_cores: Number of CPU cores to use for parallel processing
        
    Returns:
        Dictionary with calculation results
    """
    try:
        logger.info(f"Calculating reaction rate for {reaction_name} at T={temperature} keV")
        
        result = optimized_reaction_rate(
            reaction_name=reaction_name,
            temperature=temperature,
            density=density,
            enhancement_factors=enhancement_factors,
            include_tunneling=include_tunneling,
            include_screening=include_screening,
            n_cores=n_cores
        )
        
        logger.info(f"Calculation complete. Rate: {result['rate']:.2e} cm^3/s")
        
        return result
        
    except Exception as e:
        logger.error(f"Error in reaction rate calculation: {str(e)}")
        raise 