"""
MHD (Magnetohydrodynamics) sub-package for the LENR Theory Testbed.

Provides:
  - dimensionless_parameters: Rm, Ha, S, v_A, beta, beta_H, N, Pm
  - mhd_induction_solver: Full induction equation with Hall & resistive terms
  - hartmann_flow: Hartmann channel-flow profiles & boundary layers
  - hall_faraday_channels: Hall conductivity tensor, Faraday EMF & loading
  - multiscale_bridge: Scale hierarchy bridging macro → nuclear
  - nuclear_force_coupling: EM / Weak / Strong force coupling chain
"""

from .dimensionless_parameters import (
    MHDDimensionlessParameters,
    MHDRegimeClassification,
    compute_mhd_parameters,
)

__all__ = [
    "MHDDimensionlessParameters",
    "MHDRegimeClassification",
    "compute_mhd_parameters",
]
