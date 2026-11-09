"""Radiation branching and detector-limit bookkeeping (EQ-OPEN-RAD-01).

Assumed branching fractions are scenario inputs, not derived Γ ratios.
Neutron detector UL / Cd / moderator helpers share the γ honesty class:
efficiency-corrected upper bounds are scenario diagnostics, not proof of
neutrons, neutrinos, or LENR.
"""
from __future__ import annotations

import math
from typing import Any, Dict, Mapping, Optional

Q_DD_HE4_MEV = 23.8
# Paper §5A.2 open target — not asserted as achieved.
LATTICE_GAMMA_TARGET = 1e11

# Parallel honesty class for γ and neutron detector upper limits.
DETECTOR_UL_HONESTY_CLASS = "detector_ul_not_proof"
BRANCHING_INCONSISTENT_WITH_NEUTRON_INTERPRETATION = (
    "BRANCHING_INCONSISTENT_WITH_NEUTRON_INTERPRETATION"
)
# Cd wrap that suppresses true thermal neutrons typically drops rate ~10×.
CD_RATIO_THERMAL_FLOOR = 5.0
# Removing moderator should drop thermal-neutron counts, not raise them.
MODERATOR_NULL_THERMAL_CEILING = 1.0


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


def detector_neutron_ul_log10(
    neutron_cps_ul: Optional[float],
    neutron_efficiency: Optional[float],
    he4_atoms_per_s: Optional[float],
) -> Optional[float]:
    """log10(BR_n upper bound) from neutron detector UL and He yield.

    Same honesty class as ``detector_gamma_ul_log10``: efficiency-corrected
    bookkeeping only. Does **not** prove neutrons were present.
    """
    if neutron_cps_ul is None or he4_atoms_per_s is None or he4_atoms_per_s <= 0:
        return None
    eps = max(float(neutron_efficiency or 1.0), 1e-30)
    br_n_ul = float(neutron_cps_ul) / (eps * float(he4_atoms_per_s))
    if br_n_ul <= 0:
        return None
    return math.log10(br_n_ul)


def branching_inconsistent_with_neutron_ul(
    assumed_n_fraction: float,
    detector_neutron_ul: Optional[float],
) -> bool:
    """True when assumed neutron branch exceeds efficiency-corrected UL."""
    if detector_neutron_ul is None or assumed_n_fraction <= 0:
        return False
    return math.log10(assumed_n_fraction) > detector_neutron_ul


def cd_ratio(
    bare_cps: Optional[float],
    cd_wrapped_cps: Optional[float],
) -> Optional[float]:
    """Bare / Cd-wrapped count-rate ratio (calibration observable).

    Near-thermal neutron background typically drops under Cd (~10× in
    Parkhomov SNM-14 talk). A high Cd-wrapped rate with low ratio is a
    *non-thermal-neutron interpretation* falsifier — not neutron proof.
    """
    if bare_cps is None or cd_wrapped_cps is None:
        return None
    wrapped = float(cd_wrapped_cps)
    if wrapped <= 0:
        return None
    return float(bare_cps) / wrapped


def moderator_null_ratio(
    with_moderator_cps: Optional[float],
    bare_cps: Optional[float],
) -> Optional[float]:
    """R(with moderator) / R(bare) transfer-function falsifier.

    Thermal-neutron interpretation expects ratio ≥ 1 when a moderator is
    required. Ratio ≪ 1 (removing moderator *raises* counts) falsifies a
    simple thermal-n reading.
    """
    if with_moderator_cps is None or bare_cps is None:
        return None
    bare = float(bare_cps)
    if bare <= 0:
        return None
    return float(with_moderator_cps) / bare


def branching_inconsistent_with_neutron_interpretation(
    *,
    soft_x_present: Optional[bool] = None,
    hard_gamma_absent: Optional[bool] = None,
    cd_wrapped_cps: Optional[float] = None,
    cd_ratio_value: Optional[float] = None,
    moderator_ratio: Optional[float] = None,
    cd_wrapped_high_cps: float = 1.0,
) -> bool:
    """Multi-messenger gate: soft-X ∧ ¬hard-γ ∧ Cd-wrap high / moderator null.

    Returns True when observables are inconsistent with a *thermal neutron*
    interpretation. This is a scenario diagnostic only — never proof of
    neutrinos, never EQ-OPEN-EC discharge, never ``lenr_proved``.
    """
    soft_x = bool(soft_x_present) if soft_x_present is not None else False
    hard_gamma_null = (
        bool(hard_gamma_absent) if hard_gamma_absent is not None else False
    )
    cd_high = (
        cd_wrapped_cps is not None and float(cd_wrapped_cps) >= cd_wrapped_high_cps
    )
    cd_nonthermal = (
        cd_ratio_value is not None and float(cd_ratio_value) < CD_RATIO_THERMAL_FLOOR
    )
    moderator_fails = (
        moderator_ratio is not None
        and float(moderator_ratio) < MODERATOR_NULL_THERMAL_CEILING
    )
    multi_messenger = soft_x and hard_gamma_null and (cd_high or cd_nonthermal)
    return bool(multi_messenger or (moderator_fails and (cd_high or soft_x)))


def neutron_rate_bound_payload(
    *,
    neutron_cps_ul: Optional[float] = None,
    neutron_efficiency: Optional[float] = None,
    live_time_s: Optional[float] = None,
) -> Dict[str, Any]:
    """Honesty-gated neutron rate bound (parallel to γ UL placeholder).

    When UL + efficiency + live time are absent, keep ``proxy_not_computed``.
    Never treat the value as neutron proof.
    """
    honesty = {
        "honesty_class": DETECTOR_UL_HONESTY_CLASS,
        "not_neutron_proof": True,
        "not_eq_open_discharge": True,
        "unit": "counts/s",
        "type": "upper_bound_proxy",
    }
    if neutron_cps_ul is None:
        return {
            **honesty,
            "value": 0.0,
            "proxy_not_computed": True,
            "note": (
                "Neutron transport + detector response unsolved; placeholder "
                "bound shares honesty class with γ UL (not proof of neutrons)."
            ),
        }
    eps = max(float(neutron_efficiency or 1.0), 1e-30)
    # Efficiency-corrected count-rate UL; live time is metadata only here.
    value = float(neutron_cps_ul) / eps
    return {
        **honesty,
        "value": value,
        "proxy_not_computed": False,
        "live_time_s": float(live_time_s) if live_time_s is not None else None,
        "neutron_efficiency": eps,
        "note": (
            "Efficiency-corrected detector UL bookkeeping only; Cd-wrap / "
            "moderator / soft-X gates may still falsify a neutron reading."
        ),
    }
