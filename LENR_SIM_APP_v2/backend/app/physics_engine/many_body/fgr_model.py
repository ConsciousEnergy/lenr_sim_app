"""Fermi golden-rule bookkeeping for many-body LENR rates (EQ-NBODY-FGR-01).

R = n_sites * P_occ * Gamma_tun * |V_nuc|^2 / hbar * C_lin

``fusion_probability`` / ``f_nuc`` absorbs |V_nuc|^2 in the rate engine.
Occupation and geometry are rival models — never multiplied across paths.
"""
from __future__ import annotations

import math
from enum import Enum
from typing import Dict, Optional, Tuple

import numpy as np

# Re-export cap used by reaction_rate_engine (single source of truth).
MAX_COLLECTIVE_FACTOR: float = 1e6
DEFAULT_FCC_A_M: float = 3.89e-10
DEFAULT_TRAP_SEP_M: float = 25e-12
TETRAHEDRAL_SITE_FRACTION: float = 0.25


class GeometryMode(str, Enum):
    """Rival trap geometries (EQ-TSC-GEOM-01 vs EQ-TRAP-SEP-01)."""

    FCC_TETRAHEDRAL = "fcc_tetrahedral"
    TRAP_25PM = "trap_25pm"


def fcc_d_dd_m(a_m: float = DEFAULT_FCC_A_M) -> float:
    """FCC tetrahedral nearest-neighbour D-D spacing: a/(2√2)."""
    return a_m / (2.0 * math.sqrt(2.0))


def trap_separation_m(geometry: GeometryMode | str) -> float:
    """Separation used for WKB penetration at the named geometry."""
    key = geometry.value if isinstance(geometry, GeometryMode) else str(geometry)
    if key == GeometryMode.FCC_TETRAHEDRAL.value:
        return fcc_d_dd_m()
    return DEFAULT_TRAP_SEP_M


def bernoulli_p4(
    loading_ratio: float,
    tetrahedral_fraction: float = TETRAHEDRAL_SITE_FRACTION,
) -> float:
    """Bernoulli P4 = θ^4 f_tet (EQ-TSC-OCC-01, OPEN)."""
    loading = max(0.0, min(float(loading_ratio), 1.0))
    return loading**4 * float(tetrahedral_fraction)


def resolve_p_occ(
    loading_ratio: float,
    *,
    p4_occupation: Optional[float] = None,
) -> Tuple[float, str]:
    """Return (P_occ, model_id). User ingest selects correlated_condensate."""
    if p4_occupation is not None:
        return float(np.clip(p4_occupation, 0.0, 1.0)), "correlated_condensate"
    return bernoulli_p4(loading_ratio), "bernoulli_p4"


def collective_linear(n_coherent: float) -> float:
    """Linear collective clamp min(N, 10^6) — EQ-COLL-LIN-01."""
    if n_coherent <= 1.0:
        return 1.0
    return float(min(n_coherent, MAX_COLLECTIVE_FACTOR))


def fgr_rate_per_cluster(
    gamma_tun: float,
    f_nuc: float,
    cluster_lifetime_s: float,
) -> float:
    """Per-cluster rate ≈ Gamma_tun * f_nuc / tau."""
    lifetime = max(float(cluster_lifetime_s), 1e-30)
    f_nuc_clipped = float(np.clip(f_nuc, 0.0, 1.0))
    return float(gamma_tun) * f_nuc_clipped / lifetime


def compute_fgr_volumetric_rate(
    *,
    n_sites: float,
    p_occ: float,
    gamma_tun: float,
    f_nuc: float,
    cluster_lifetime_s: float,
    n_coherent: float = 1.0,
) -> Dict[str, float]:
    """Assemble volumetric FGR rate and parameter ledger for virtual lab ``how`` block."""
    per_cluster = fgr_rate_per_cluster(gamma_tun, f_nuc, cluster_lifetime_s)
    c_lin = collective_linear(n_coherent)
    rate = float(n_sites) * float(p_occ) * per_cluster * c_lin
    f_nuc_clipped = float(np.clip(f_nuc, 0.0, 1.0))
    return {
        "rate_per_m3_s": rate,
        "n_sites": float(n_sites),
        "P_occ": float(p_occ),
        "Gamma_tun": float(gamma_tun),
        "f_nuc": f_nuc_clipped,
        "V_nuc_bookkeeping": math.sqrt(max(f_nuc_clipped, 0.0)),
        "C_lin": c_lin,
        "per_cluster_rate": per_cluster,
        "cluster_lifetime_s": max(float(cluster_lifetime_s), 1e-30),
    }
