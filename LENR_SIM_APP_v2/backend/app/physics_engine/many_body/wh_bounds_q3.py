"""WH-ENP-01 v2 Q3 closure demand (EQ-WH-CAP-01), RORO.

Deterministic scenario table for the rate budget: how large must the FGR
product P_occ * f_nuc * C_lin / tau be for the same-cluster rate to reach the
calorimetric floor R_obs = P_W/(Q V), and can the engine caps ever get there.
This is a scenario table, not a posterior; the two-body baseline is untouched.
Contract documented in ``wh_bounds.py``.
"""
from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Sequence

from app.physics_engine.many_body.fgr_model import (
    MAX_COLLECTIVE_FACTOR,
    bernoulli_p4,
    compute_fgr_volumetric_rate,
)

DEFAULT_THETA_GRID: Sequence[float] = (0.6, 0.8, 0.9, 1.0)
DEFAULT_TAU_GRID_S: Sequence[float] = (1e-20, 1e-18, 1e-16, 1e-14, 1e-12)
DEFAULT_F_NUC_GRID: Sequence[float] = (1e-6, 1e-4, 1e-2, 1.0)
GRID_GEOMETRY = "trap_25pm"
# Engine caps (model assumptions): P_occ ≤ 1, f_nuc ≤ 1, C_lin ≤ 1e6 (EQ-COLL-LIN-01),
# tau ≥ DEFAULT_CLUSTER_LIFETIME_S = 1e-20 s (reaction_rate_engine collapse timescale).
CAPS: Dict[str, float] = {
    "P_occ": 1.0,
    "f_nuc": 1.0,
    "C_lin": float(MAX_COLLECTIVE_FACTOR),
    "tau_s": 1e-20,
}


def _log10_ratio(r_mode: float, r_obs: Optional[float]) -> Optional[float]:
    if r_obs is None or r_obs <= 0 or r_mode <= 0:
        return None
    return math.log10(r_mode / r_obs)


def _engine_cap_row(
    n_sites: float, gamma_tun: float, r_obs: Optional[float]
) -> Dict[str, Any]:
    """Upper bound with every FGR factor at its cap: r_max = n_sites * Γ_tun * 1e6 / 1e-20."""
    r_max = compute_fgr_volumetric_rate(
        n_sites=n_sites,
        p_occ=CAPS["P_occ"],
        gamma_tun=gamma_tun,
        f_nuc=CAPS["f_nuc"],
        cluster_lifetime_s=CAPS["tau_s"],
        n_coherent=CAPS["C_lin"],
    )["rate_per_m3_s"]
    return {
        "gamma_tun": float(gamma_tun),
        "r_max_per_m3_s": float(r_max),
        "crosses": None if r_obs is None else bool(r_max >= r_obs),
    }


def closure_demand(
    *,
    r_obs_per_m3_s: Optional[float],
    n_sites_per_m3: float,
    gamma_tun_by_geometry: Dict[str, float],
    theta_grid: Sequence[float] = DEFAULT_THETA_GRID,
    tau_grid_s: Sequence[float] = DEFAULT_TAU_GRID_S,
    f_nuc_grid: Sequence[float] = DEFAULT_F_NUC_GRID,
) -> Dict[str, Any]:
    """Deterministic Q3 scenario grid plus engine-cap upper bound (EQ-WH-CAP-01).

    Grid: R_mode(θ, τ, f_nuc) = n_sites · P4(θ) · Γ_tun(trap_25pm) · f_nuc / τ with
    C_lin = 1 (same FGR bookkeeping as ``compute_fgr_volumetric_rate``);
    ``log10_ratio[i][j][k]`` = log10(R_mode / R_obs), None when R_obs is None.
    ``required_product`` = R_obs / (n_sites · Γ_tun(trap_25pm)) is the minimum
    P_occ · f_nuc · C_lin / τ (units s⁻¹) for R_mode ≥ R_obs.
    ``engine_cap[geometry]`` sets every factor to its cap (P_occ = f_nuc = 1,
    C_lin = 1e6, τ = 1e-20 s) with the geometry's own Γ_tun; ``crosses`` says
    whether even that ceiling reaches R_obs. n_sites = 0.5 n_D (model
    assumption, mirrors reaction_rate_engine's site count). Γ_tun values are
    supplied by the caller (Gamow WKB at each geometry's separation).
    """
    r_obs = None if r_obs_per_m3_s is None else float(r_obs_per_m3_s)
    if r_obs is not None and r_obs <= 0:
        r_obs = None
    n_sites = max(float(n_sites_per_m3), 0.0)
    gammas = {str(k): float(v) for k, v in gamma_tun_by_geometry.items()}
    grid_gamma = gammas.get(GRID_GEOMETRY, next(iter(gammas.values()), 0.0))

    ratios: List[List[List[Optional[float]]]] = []
    for theta in theta_grid:
        p_occ = bernoulli_p4(theta)
        theta_rows: List[List[Optional[float]]] = []
        for tau in tau_grid_s:
            tau_row: List[Optional[float]] = []
            for f_nuc in f_nuc_grid:
                r_mode = compute_fgr_volumetric_rate(
                    n_sites=n_sites,
                    p_occ=p_occ,
                    gamma_tun=grid_gamma,
                    f_nuc=f_nuc,
                    cluster_lifetime_s=tau,
                    n_coherent=1.0,
                )["rate_per_m3_s"]
                tau_row.append(_log10_ratio(r_mode, r_obs))
            theta_rows.append(tau_row)
        ratios.append(theta_rows)

    denom = n_sites * grid_gamma
    required = None if (r_obs is None or denom <= 0) else r_obs / denom
    return {
        "R_obs_per_m3_s": r_obs,
        "n_sites_per_m3": n_sites,
        "required_product": required,
        "required_product_geometry": GRID_GEOMETRY,
        "grid": {
            "geometry": GRID_GEOMETRY,
            "gamma_tun": grid_gamma,
            "theta": [float(t) for t in theta_grid],
            "tau_s": [float(t) for t in tau_grid_s],
            "f_nuc": [float(f) for f in f_nuc_grid],
            "log10_ratio": ratios,
        },
        "engine_cap": {
            geom: _engine_cap_row(n_sites, gamma, r_obs) for geom, gamma in gammas.items()
        },
        "caps": dict(CAPS),
        "two_body_untouched": True,
        "kind": "scenario_table_not_posterior",
        "claim_tier": "speculative_exploratory",
        "n_sites_convention": (
            "reaction_rate_engine: 0.5 * (electron_density / Z) * loading; "
            "~46x below 0.5 * n_D at the physical Pd atom density used by the Dicke count"
        ),
        "provenance": (
            "model assumption (FGR scenario grid; n_sites follows the engine's "
            "_reactant_number_density convention; caps from reaction_rate_engine)"
        ),
        "lean_theorems": ["EQ-WH-CAP-01"],
    }
