"""Unified many-body FGR bookkeeping (EQ-NBODY-FGR-01).

Rival rate formalisms share geometry, occupation, and collective helpers.
Modes replace; they never multiply.
"""
from app.physics_engine.many_body.branching_model import (
    compute_branching_partition,
    detector_gamma_ul_log10,
    branching_inconsistent_with_ul,
    LATTICE_GAMMA_TARGET,
)
from app.physics_engine.many_body.fgr_model import (
    GeometryMode,
    DEFAULT_FCC_A_M,
    DEFAULT_TRAP_SEP_M,
    TETRAHEDRAL_SITE_FRACTION,
    MAX_COLLECTIVE_FACTOR,
    bernoulli_p4,
    collective_linear,
    compute_fgr_volumetric_rate,
    fcc_d_dd_m,
    fgr_rate_per_cluster,
    resolve_p_occ,
    trap_separation_m,
)

__all__ = [
    "GeometryMode",
    "DEFAULT_FCC_A_M",
    "DEFAULT_TRAP_SEP_M",
    "TETRAHEDRAL_SITE_FRACTION",
    "MAX_COLLECTIVE_FACTOR",
    "LATTICE_GAMMA_TARGET",
    "bernoulli_p4",
    "collective_linear",
    "compute_fgr_volumetric_rate",
    "fcc_d_dd_m",
    "fgr_rate_per_cluster",
    "resolve_p_occ",
    "trap_separation_m",
    "compute_branching_partition",
    "detector_gamma_ul_log10",
    "branching_inconsistent_with_ul",
]
