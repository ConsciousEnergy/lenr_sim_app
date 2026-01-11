"""
Physics Engine module for LENR Simulation App v2
Includes quantum enhancement calculations, lattice dynamics,
bubble-lattice interaction, and fusion process simulations.
"""

from .bubble_lattice_interaction import (
    BubbleLatticeInteraction,
    BubbleParameters,
    LatticeParameters,
    CollapseResult
)

from .proton_phase_model import (
    ProtonPhaseModel,
    ProtonPhase,
    ProtonState,
    PhaseThresholds,
    get_phase_info
)

__all__ = [
    'BubbleLatticeInteraction',
    'BubbleParameters', 
    'LatticeParameters',
    'CollapseResult',
    'ProtonPhaseModel',
    'ProtonPhase',
    'ProtonState',
    'PhaseThresholds',
    'get_phase_info'
] 