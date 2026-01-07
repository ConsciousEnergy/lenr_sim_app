"""
Physics package for LENR_Sim_App

Contains modules for quantum calculations, potential models, and data fitting.
"""

from app.physics.tunneling_engine import (
    calculate_thermal_tunneling,
    calculate_impact_tunneling,
    calculate_energy_levels
)

from app.physics.potential_models import (
    harmonic_potential,
    morse_potential,
    coulomb_barrier,
    combined_potential,
    get_potential_function,
    find_classical_turning_points,
    PotentialParameters
)

from app.physics.heatmap_module import generate_heatmap

from app.physics.fitting_module import (
    fit_experimental_data,
    tunneling_model,
    arrhenius_model
)

from app.physics.enhanced_fusion import (
    calculate_gamow_factor,
    calculate_proximity_enhancement,
    calculate_screening_enhancement,
    calculate_fluctuation_enhancement,
    calculate_resonance_enhancement,
    calculate_quantum_enhancement,
    calculate_total_fusion_enhancement,
    evaluate_fusion_scenario,
    FusionEnhancementFactors
)

__all__ = [
    # Tunneling engine
    'calculate_thermal_tunneling',
    'calculate_impact_tunneling',
    'calculate_energy_levels',
    
    # Potential models
    'harmonic_potential',
    'morse_potential',
    'coulomb_barrier',
    'combined_potential',
    'get_potential_function',
    'find_classical_turning_points',
    'PotentialParameters',
    
    # Heatmap generation
    'generate_heatmap',
    
    # Fitting
    'fit_experimental_data',
    'tunneling_model',
    'arrhenius_model',
    
    # Enhanced fusion
    'calculate_gamow_factor',
    'calculate_proximity_enhancement',
    'calculate_screening_enhancement',
    'calculate_fluctuation_enhancement',
    'calculate_resonance_enhancement',
    'calculate_quantum_enhancement',
    'calculate_total_fusion_enhancement',
    'evaluate_fusion_scenario',
    'FusionEnhancementFactors'
] 