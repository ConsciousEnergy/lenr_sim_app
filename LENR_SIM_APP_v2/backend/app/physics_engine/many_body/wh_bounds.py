"""WH-ENP-01 v2 derived bounds (RORO). Contract stub — bodies filled by the backend track.

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
      "log10_p_n": [float, ...],        # log10 P_N per S via Stirling (finite floats, may be ~-1e6)
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

``q3.closure_demand`` (EQ-WH-CAP-01)::

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

from typing import Any, Dict, Optional, Sequence

PD_D_NUMBER_DENSITY_M3 = 6.8e28  # PdD (x≈1) deuteron density; matches engine electron_density default.
FC_TARGET_LOG10 = -11.0
DEFAULT_S_GRID: Sequence[float] = (1.0, 10.0, 100.0, 1e3, 1e4)
DEFAULT_THETA_GRID: Sequence[float] = (0.6, 0.8, 0.9, 1.0)
DEFAULT_TAU_GRID_S: Sequence[float] = (1e-20, 1e-18, 1e-16, 1e-14, 1e-12)
DEFAULT_F_NUC_GRID: Sequence[float] = (1e-6, 1e-4, 1e-2, 1.0)


def franck_condon_tail(
    *,
    q_mev: float,
    phonon_hz: float,
    s_grid: Sequence[float] = DEFAULT_S_GRID,
    target_log10: float = FC_TARGET_LOG10,
) -> Dict[str, Any]:
    """Poisson (Huang-Rhys) N-phonon emission tail; see module contract."""
    raise NotImplementedError("WH-ENP-01 v2 backend track")


def coupling_scan(
    *,
    q_mev: float,
    g_cited: float,
    n_coh_cited_cap: int,
) -> Dict[str, Any]:
    """Conservation-constrained derived_mev(g, n_coh) scan; see module contract."""
    raise NotImplementedError("WH-ENP-01 v2 backend track")


def dicke_count(
    *,
    dicke_radius_m: float,
    n_d_per_m3: float = PD_D_NUMBER_DENSITY_M3,
) -> Dict[str, Any]:
    """Deuterons inside the cooperation sphere; see module contract."""
    raise NotImplementedError("WH-ENP-01 v2 backend track")


def closure_demand(
    *,
    r_obs_per_m3_s: Optional[float],
    n_sites_per_m3: float,
    gamma_tun_by_geometry: Dict[str, float],
    theta_grid: Sequence[float] = DEFAULT_THETA_GRID,
    tau_grid_s: Sequence[float] = DEFAULT_TAU_GRID_S,
    f_nuc_grid: Sequence[float] = DEFAULT_F_NUC_GRID,
) -> Dict[str, Any]:
    """Deterministic Q3 scenario grid plus engine-cap upper bound; see module contract."""
    raise NotImplementedError("WH-ENP-01 v2 backend track")
