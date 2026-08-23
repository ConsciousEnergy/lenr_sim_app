"""Radiation branching and detector-limit bookkeeping (EQ-OPEN-RAD-01).

Assumed branching fractions are scenario inputs, not derived Γ ratios.
"""
from __future__ import annotations

import math
from typing import Any, Dict, Mapping, Optional

Q_DD_HE4_MEV = 23.8
# Paper §5A.2 open target — not asserted as achieved.
LATTICE_GAMMA_TARGET = 1e11


def compute_branching_partition(
    assumed_branching: Mapping[str, float],
    *,
    q_total_mev: float = Q_DD_HE4_MEV,
    phonon_fraction: float = 0.0,
) -> Dict[str, Any]:
    """Map assumed branching to MeV partition sketch for Q1/Q2."""
    he4 = float(assumed_branching.get("he4", 1.0))
    n_branch = float(assumed_branching.get("n", 1e-11))
    gamma = float(assumed_branching.get("gamma", 0.0))
    total = he4 + n_branch + gamma
    if total <= 0:
        total = 1.0
    gamma_mev = q_total_mev * gamma / total
    recoil_mev = 0.0
    phonon_mev = q_total_mev * max(float(phonon_fraction), 0.0)
    return {
        "gamma_mev": gamma_mev,
        "recoil_mev": recoil_mev,
        "phonon_mev_from_branch": phonon_mev,
        "gamma_fraction": gamma / total,
        "n_fraction": n_branch / total,
        "he4_fraction": he4 / total,
        "lattice_gamma_target": LATTICE_GAMMA_TARGET,
        "lattice_gamma_target_label": (
            "OPEN target Γ_ph/Γ_γ > 1e11 (paper §5A.2); not derived here."
        ),
        "lean_theorems": ["EQ-BRANCH-LATTICE-01", "EQ-TSC-CH-01"],
    }


def detector_gamma_ul_log10(
    gamma_cps_ul: Optional[float],
    gamma_efficiency: Optional[float],
    he4_atoms_per_s: Optional[float],
) -> Optional[float]:
    """log10(BR_gamma upper bound) from detector UL and He yield."""
    if gamma_cps_ul is None or he4_atoms_per_s is None or he4_atoms_per_s <= 0:
        return None
    eps = max(float(gamma_efficiency or 1.0), 1e-30)
    br_gamma_ul = float(gamma_cps_ul) / (eps * float(he4_atoms_per_s))
    if br_gamma_ul <= 0:
        return None
    return math.log10(br_gamma_ul)


def branching_inconsistent_with_ul(
    assumed_gamma_fraction: float,
    detector_ul_log10: Optional[float],
) -> bool:
    """True when assumed γ branch exceeds efficiency-corrected UL."""
    if detector_ul_log10 is None or assumed_gamma_fraction <= 0:
        return False
    return math.log10(assumed_gamma_fraction) > detector_ul_log10
