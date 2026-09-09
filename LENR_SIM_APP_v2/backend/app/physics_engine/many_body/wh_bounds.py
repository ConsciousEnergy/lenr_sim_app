"""WH-ENP-01 v2 derived bounds (RORO).

All outputs are additive fields under ``open_questions.working_hypothesis``.
Schema id stays ``lenr-open-questions-v1``; ``contract_version`` is unchanged.
Nothing here discharges EQ-OPEN-*; nothing sets ``lenr_proved``.

Frozen additive contract
------------------------
``q2.franck_condon`` (EQ-WH-FC-01)::

    {
      "model": "displaced_oscillator_linear_coupling",
      "phonon_order_N": float,          # Q / (hbar * 2*pi*f)
      "s_grid": [float, ...],           # Huang-Rhys factors scanned (labelled model assumption)
      "log10_p_n": [float, ...],        # log10 P_N per S (exact lgamma; finite floats, ~-1e9)
      "s_min_for_target": float,        # smallest S with log10 P_N >= target_log10 (~N)
      "target_log10": -11.0,
      "meets_target": false,
      "claim_tier": "speculative_exploratory",
      "provenance": str,
      "lean_theorems": ["EQ-WH-FC-01"]
    }

``q1.coupling_scan`` (EQ-WH-PART-02)::

    {
      "default_derived_mev": 0.0,
      "model": "first_order_fraction_n_coh_g_squared",   # derived = Q * min(1, n_coh * g^2)
      "n_coh_cited_cap": int,           # floor(dicke.n_within_radius) -> 0
      "rows": [{"g": float, "n_coh": float, "derived_mev": float,
                "remainder_mev": float, "kind": "cited" | "scenario"}],
      "conservation_holds": true,       # every row: derived + remainder == Q
      "lean_theorems": ["EQ-WH-PART-02"]
    }

``dicke`` additions (EQ-WH-DICKE-N-01)::

    "n_d_per_m3": 6.8e28, "dicke_volume_m3": float, "n_within_radius": float (<1),
    "n_coh_licensed_max": 0, "lean_theorems": [..., "EQ-WH-DICKE-N-01"]

``q3.closure_demand`` (EQ-WH-CAP-01) -- implemented in ``wh_bounds_q3.py``::

    {
      "R_obs_per_m3_s": float | null,
      "required_product": float | null, # min (P_occ * f_nuc * C_lin / tau) so that R_mode >= R_obs
      "grid": {"theta": [...], "tau_s": [...], "f_nuc": [...],
               "log10_ratio": [[[float | null]]]},   # indexed [theta][tau][f_nuc], C_lin = 1
      "engine_cap": {
        "fcc_tetrahedral": {"gamma_tun": float, "r_max_per_m3_s": float, "crosses": bool | null},
        "trap_25pm":       {"gamma_tun": float, "r_max_per_m3_s": float, "crosses": bool | null}
      },
      "caps": {"P_occ": 1.0, "f_nuc": 1.0, "C_lin": 1e6, "tau_s": 1e-20},
      "two_body_untouched": true,
      "kind": "scenario_table_not_posterior",
      "lean_theorems": ["EQ-WH-CAP-01"]
    }

Top-level ``lean_theorems`` gains EQ-WH-FC-01, EQ-WH-PART-02, EQ-WH-DICKE-N-01, EQ-WH-CAP-01.
"""
from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Sequence

from scipy import constants as const

from app.physics_engine.many_body.wh_bounds_q3 import (  # noqa: F401  (re-export)
    DEFAULT_F_NUC_GRID,
    DEFAULT_TAU_GRID_S,
    DEFAULT_THETA_GRID,
    closure_demand,
)

CLAIM_TIER = "speculative_exploratory"
# Pd atom density 6.8e28 m^-3 (matches engine electron_density default); PdD x≈1
# so n_D ≈ n_Pd is a model assumption.
PD_D_NUMBER_DENSITY_M3 = 6.8e28
FC_TARGET_LOG10 = -11.0
DEFAULT_S_GRID: Sequence[float] = (1.0, 10.0, 100.0, 1e3, 1e4)
DEFAULT_G_SCAN: Sequence[float] = (1e-4, 1e-2, 1e-1)
DEFAULT_N_COH_SCAN: Sequence[float] = (1.0, 100.0)
_LN10 = math.log(10.0)
_MEV_J = 1e6 * const.e


def fc_log10_poisson(n_phonons: float, huang_rhys_s: float) -> float:
    """log10 of the Poisson weight P_N = e^{-S} S^N / N! (displaced oscillator).

    Uses ``math.lgamma`` so the result is exact to float precision for any N;
    Stirling (ln N! ≈ N ln N - N + ½ ln 2πN) gives the same leading behaviour
    log10 P_N ≈ (N - S + N ln(S/N)) / ln 10, which is why the tail sits near
    -N/ln10 for S ≪ N.
    """
    s_val = max(float(huang_rhys_s), 1e-300)
    n_val = max(float(n_phonons), 0.0)
    return (-s_val + n_val * math.log(s_val) - math.lgamma(n_val + 1.0)) / _LN10


def _bisect_s_min(n_phonons: float, target_log10: float) -> Optional[float]:
    """Smallest S with log10 P_N(S) >= target on the rising branch S ∈ [1, N].

    P_N(S) increases in S up to S = N (mode of the Poisson weight) and decreases
    afterwards, so the rising branch [1, N] contains the minimal crossing when it
    exists (for S > N the weight only falls again). Returns None if even the
    peak S = N cannot meet the target.
    """
    lo, hi = 1.0, max(float(n_phonons), 1.0)
    if fc_log10_poisson(n_phonons, hi) < target_log10:
        return None
    if fc_log10_poisson(n_phonons, lo) >= target_log10:
        return lo
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if fc_log10_poisson(n_phonons, mid) >= target_log10:
            hi = mid
        else:
            lo = mid
        if hi - lo <= 1e-9 * hi:
            break
    return hi


def franck_condon_tail(
    *,
    q_mev: float,
    phonon_hz: float,
    s_grid: Sequence[float] = DEFAULT_S_GRID,
    target_log10: float = FC_TARGET_LOG10,
) -> Dict[str, Any]:
    """Poisson (Huang-Rhys) N-phonon emission tail for Q released into one mode.

    Model assumptions: linear nuclear–lattice coupling, a single displaced
    harmonic oscillator of frequency f (``phonon_hz``), zero temperature, so
    the N-phonon Franck-Condon weight is Poisson with mean S. N = Q/(h f).
    ``s_min_for_target`` is the smallest S reaching ``target_log10``; because it
    lies at S ≈ N - sqrt(2 N |target| ln 10), the lattice relaxation energy
    S·ħω needed is ≈ Q itself (``relaxation_energy_at_s_min_mev``). Anharmonic
    or lossy spin-boson boosts are labelled AX and are not inserted.
    """
    e_phonon_j = const.h * max(float(phonon_hz), 1e-30)
    n_phonons = float(q_mev) * _MEV_J / e_phonon_j
    grid = [float(s) for s in s_grid]
    log10_p = [fc_log10_poisson(n_phonons, s) for s in grid]
    s_min = _bisect_s_min(n_phonons, float(target_log10))
    relax_mev = None if s_min is None else s_min * e_phonon_j / _MEV_J
    meets = any(v >= float(target_log10) for v in log10_p)
    return {
        "model": "displaced_oscillator_linear_coupling",
        "phonon_order_N": n_phonons,
        "phonon_energy_mev": e_phonon_j / _MEV_J,
        "s_grid": grid,
        "log10_p_n": log10_p,
        "s_min_for_target": s_min,
        "relaxation_energy_at_s_min_mev": relax_mev,
        "q_mev": float(q_mev),
        "target_log10": float(target_log10),
        "meets_target": bool(meets),
        "claim_tier": CLAIM_TIER,
        "provenance": (
            "model assumption (linear coupling, displaced oscillator; "
            "anharmonic/lossy spin-boson boosts labeled AX, not inserted)"
        ),
        "lean_theorems": ["EQ-WH-FC-01"],
    }


def _coupling_row(q_mev: float, g: float, n_coh: float, kind: str, cap: int) -> Dict[str, Any]:
    fraction = min(1.0, float(n_coh) * float(g) ** 2)
    derived = float(q_mev) * fraction
    return {
        "g": float(g),
        "n_coh": float(n_coh),
        "derived_mev": derived,
        "remainder_mev": float(q_mev) - derived,
        "kind": kind,
        "licensed_by_dicke_count": bool(n_coh <= cap),
    }


def coupling_scan(
    *,
    q_mev: float,
    g_cited: float,
    n_coh_cited_cap: int,
    g_scan: Sequence[float] = DEFAULT_G_SCAN,
    n_coh_scan: Sequence[float] = DEFAULT_N_COH_SCAN,
) -> Dict[str, Any]:
    """Conservation-constrained derived_mev(g, n_coh) scan (EQ-WH-PART-02).

    derived = Q * min(1, n_coh * g^2) is a first-order perturbative fraction
    (model assumption): each of n_coh coherently coupled deuterons contributes
    g^2 of Q to the lattice channel. The cited row uses the cited g and the
    Dicke-licensed n_coh (floor of deuterons inside λ/2π, i.e. 0), so the
    default derived energy is 0 and the remainder stays Q. Scenario rows with
    n_coh > ``n_coh_cited_cap`` are unlicensed by EQ-WH-DICKE-N-01 and are
    never fed back into ``q1.open_remainder_mev``.
    """
    cap = max(int(n_coh_cited_cap), 0)
    rows: List[Dict[str, Any]] = [_coupling_row(q_mev, g_cited, cap, "cited", cap)]
    for g in g_scan:
        for n_coh in n_coh_scan:
            rows.append(_coupling_row(q_mev, g, n_coh, "scenario", cap))
    conserved = all(
        abs(row["derived_mev"] + row["remainder_mev"] - float(q_mev)) < 1e-9 for row in rows
    )
    return {
        "default_derived_mev": 0.0,
        "model": "first_order_fraction_n_coh_g_squared",
        "n_coh_cited_cap": cap,
        "g_cited": float(g_cited),
        "rows": rows,
        "conservation_holds": bool(conserved),
        "note": (
            "Scenario rows with n_coh > n_coh_cited_cap are unlicensed by "
            "EQ-WH-DICKE-N-01; derived fraction is a model assumption."
        ),
        "claim_tier": CLAIM_TIER,
        "lean_theorems": ["EQ-WH-PART-02"],
    }


def dicke_count(
    *,
    dicke_radius_m: float,
    n_d_per_m3: float = PD_D_NUMBER_DENSITY_M3,
) -> Dict[str, Any]:
    """Deuterons inside the cooperation sphere of radius λ/(2π) (EQ-WH-DICKE-N-01).

    V = 4/3 π r³; n_within_radius = n_D V. With r ≈ 4.9e-11 m and
    n_D = 6.8e28 m⁻³ (Pd atom density, PdD x≈1 model assumption) this is
    ≈ 0.03 < 1, so the licensed coherent count is floor(n_within_radius) = 0.
    """
    radius = max(float(dicke_radius_m), 0.0)
    volume = 4.0 / 3.0 * math.pi * radius**3
    n_within = float(n_d_per_m3) * volume
    return {
        "n_d_per_m3": float(n_d_per_m3),
        "dicke_volume_m3": volume,
        "n_within_radius": n_within,
        "n_coh_licensed_max": int(math.floor(n_within)),
        "n_d_provenance": (
            "Pd atom density 6.8e28 m^-3 (matches engine electron_density default; "
            "PdD x≈1 model assumption)"
        ),
        "lean_theorems": ["EQ-WH-DICKE-N-01"],
    }
