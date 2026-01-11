"""
Physics Module

This package provides physics models and calculations for LENR simulations.
"""

# Avoid circular imports by not importing everything at module level
# Individual modules should be imported as needed

__all__ = [
    # Core physics
    "electron_screening",
    "quantum_tunneling",
    "casimir_forces",
    "quantum_coherence",
    "phonon_modes",
    
    # FEM
    "fem_solver",
    "fem_mesh",
    "fem_lenr"
] 