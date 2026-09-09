"""Property tests for WH-ENP-01 v2 derived bounds (runtime mirror of Lean EQ-WH-* v2)."""
from __future__ import annotations

import math

import pytest

from app.physics_engine.many_body.fgr_model import (
    MAX_COLLECTIVE_FACTOR,
    bernoulli_p4,
    compute_fgr_volumetric_rate,
)
from app.physics_engine.many_body.wh_bounds import (
    DEFAULT_S_GRID,
    FC_TARGET_LOG10,
    PD_D_NUMBER_DENSITY_M3,
    closure_demand,
    coupling_scan,
    dicke_count,
    fc_log10_poisson,
    franck_condon_tail,
)
from app.physics_engine.working_hypothesis import (
    Q_DD_HE4_MEV,
    default_gamma_tun_by_geometry,
    default_n_sites_per_m3,
    dicke_radius_m,
)

PHONON_HZ = 1e13
GAMMAS = default_gamma_tun_by_geometry()
N_SITES = default_n_sites_per_m3(0.9)
R_OBS = 2.62e17


# --- M1 Franck-Condon tail -------------------------------------------------


def test_fc_poisson_ratio_identity_p_np1_over_p_n_is_s_over_np1() -> None:
    for n_phonons in (10.0, 1e3, 5.75e8):
        for s_val in (1.0, 100.0, 1e4):
            delta = fc_log10_poisson(n_phonons + 1.0, s_val) - fc_log10_poisson(n_phonons, s_val)
            expected = math.log10(s_val / (n_phonons + 1.0))
            # log10 P_N ~ -N/ln10 ~ -5e9 at large N, so the difference of two
            # doubles is only good to ~1e-6 absolute (cancellation, not model error).
            assert delta == pytest.approx(expected, abs=1e-5)
            # S < N + 1 <=> P_{N+1} < P_N: the tail is monotone decreasing in N.
            assert (delta < 0) == (s_val < n_phonons + 1.0)
    # Q/(hf) ~ 5.75e8 with every scanned S << N: strictly decreasing in N.
    for s_val in DEFAULT_S_GRID:
        assert fc_log10_poisson(5.75e8 + 1.0, s_val) < fc_log10_poisson(5.75e8, s_val)


def test_fc_tail_grid_all_below_target_and_finite() -> None:
    fc = franck_condon_tail(q_mev=Q_DD_HE4_MEV, phonon_hz=PHONON_HZ)
    assert fc["model"] == "displaced_oscillator_linear_coupling"
    assert fc["s_grid"] == [float(s) for s in DEFAULT_S_GRID]
    assert len(fc["log10_p_n"]) == len(fc["s_grid"])
    assert all(math.isfinite(v) for v in fc["log10_p_n"])
    assert all(v < FC_TARGET_LOG10 for v in fc["log10_p_n"])
    assert fc["meets_target"] is False
    assert fc["target_log10"] == -11.0
    assert fc["claim_tier"] == "speculative_exploratory"
    assert "model assumption" in fc["provenance"]
    assert fc["lean_theorems"] == ["EQ-WH-FC-01"]
    # log10 P_N increases with S on the S < N branch.
    assert fc["log10_p_n"] == sorted(fc["log10_p_n"])


def test_fc_phonon_order_matches_q_over_hf() -> None:
    from scipy import constants as const

    fc = franck_condon_tail(q_mev=Q_DD_HE4_MEV, phonon_hz=PHONON_HZ)
    expected_n = Q_DD_HE4_MEV * 1e6 * const.e / (const.h * PHONON_HZ)
    assert fc["phonon_order_N"] == pytest.approx(expected_n, rel=1e-12)
    assert fc["phonon_order_N"] == pytest.approx(5.75e8, rel=0.01)


def test_fc_s_min_is_near_n_and_relaxation_energy_is_near_q() -> None:
    fc = franck_condon_tail(q_mev=Q_DD_HE4_MEV, phonon_hz=PHONON_HZ)
    n_phonons = fc["phonon_order_N"]
    s_min = fc["s_min_for_target"]
    assert s_min is not None
    assert s_min == pytest.approx(n_phonons, rel=0.02)
    assert s_min < n_phonons
    analytic = n_phonons - math.sqrt(2.0 * n_phonons * 11.0 * math.log(10.0))
    assert s_min == pytest.approx(analytic, rel=1e-3)
    assert fc_log10_poisson(n_phonons, s_min) >= FC_TARGET_LOG10
    assert fc_log10_poisson(n_phonons, s_min * (1 - 1e-6)) < FC_TARGET_LOG10
    assert fc["relaxation_energy_at_s_min_mev"] == pytest.approx(Q_DD_HE4_MEV, rel=0.02)
    assert fc["relaxation_energy_at_s_min_mev"] < Q_DD_HE4_MEV


# --- M2 coupling scan --------------------------------------------------------


def test_coupling_scan_conserves_on_every_row_and_cited_row_is_zero() -> None:
    scan = coupling_scan(q_mev=Q_DD_HE4_MEV, g_cited=1e-4, n_coh_cited_cap=0)
    assert scan["default_derived_mev"] == 0.0
    assert scan["n_coh_cited_cap"] == 0
    assert scan["conservation_holds"] is True
    for row in scan["rows"]:
        assert row["derived_mev"] + row["remainder_mev"] == pytest.approx(Q_DD_HE4_MEV, abs=1e-9)
        assert row["derived_mev"] == pytest.approx(
            Q_DD_HE4_MEV * min(1.0, row["n_coh"] * row["g"] ** 2)
        )
        assert row["kind"] in {"cited", "scenario"}
    cited = [row for row in scan["rows"] if row["kind"] == "cited"]
    assert len(cited) == 1
    assert cited[0]["g"] == 1e-4
    assert cited[0]["n_coh"] == 0.0
    assert cited[0]["derived_mev"] == 0.0
    assert cited[0]["remainder_mev"] == Q_DD_HE4_MEV
    scenarios = [row for row in scan["rows"] if row["kind"] == "scenario"]
    assert len(scenarios) == 6
    assert all(row["licensed_by_dicke_count"] is False for row in scenarios)
    assert scan["lean_theorems"] == ["EQ-WH-PART-02"]


def test_coupling_scan_saturates_at_q() -> None:
    scan = coupling_scan(q_mev=Q_DD_HE4_MEV, g_cited=1e-4, n_coh_cited_cap=0)
    top = next(row for row in scan["rows"] if row["g"] == 0.1 and row["n_coh"] == 100.0)
    assert top["derived_mev"] == pytest.approx(Q_DD_HE4_MEV)
    assert top["remainder_mev"] == pytest.approx(0.0)


# --- Dicke count -------------------------------------------------------------


def test_dicke_count_less_than_one_deuteron_in_cooperation_sphere() -> None:
    radius = dicke_radius_m(PHONON_HZ)
    out = dicke_count(dicke_radius_m=radius)
    assert out["n_d_per_m3"] == PD_D_NUMBER_DENSITY_M3
    assert out["dicke_volume_m3"] == pytest.approx(4.0 / 3.0 * math.pi * radius**3)
    assert out["n_within_radius"] == pytest.approx(PD_D_NUMBER_DENSITY_M3 * out["dicke_volume_m3"])
    assert 0.0 < out["n_within_radius"] < 1.0
    assert out["n_within_radius"] == pytest.approx(0.033, rel=0.05)
    assert out["n_coh_licensed_max"] == 0
    assert "model assumption" in out["n_d_provenance"]
    assert out["lean_theorems"] == ["EQ-WH-DICKE-N-01"]


# --- M3 closure demand -------------------------------------------------------


def test_closure_demand_grid_shape_and_required_product_formula() -> None:
    out = closure_demand(
        r_obs_per_m3_s=R_OBS, n_sites_per_m3=N_SITES, gamma_tun_by_geometry=GAMMAS
    )
    grid = out["grid"]
    ratios = grid["log10_ratio"]
    assert len(ratios) == len(grid["theta"]) == 4
    assert all(len(row) == len(grid["tau_s"]) == 5 for row in ratios)
    assert all(len(cell) == len(grid["f_nuc"]) == 4 for row in ratios for cell in row)
    assert grid["geometry"] == "trap_25pm"
    assert out["required_product"] == pytest.approx(
        R_OBS / (N_SITES * GAMMAS["trap_25pm"]), rel=1e-12
    )
    # Under the engine's n_sites convention the demand exceeds the cap product:
    # even P_occ = f_nuc = 1, C_lin = 1e6, tau = 1e-20 s cannot reach 1 W / cm^3.
    assert out["required_product"] > out["caps"]["C_lin"] / out["caps"]["tau_s"]
    assert out["caps"] == {"P_occ": 1.0, "f_nuc": 1.0, "C_lin": MAX_COLLECTIVE_FACTOR, "tau_s": 1e-20}
    assert out["two_body_untouched"] is True
    assert out["kind"] == "scenario_table_not_posterior"
    assert out["lean_theorems"] == ["EQ-WH-CAP-01"]


def test_closure_demand_grid_cells_match_fgr_bookkeeping() -> None:
    out = closure_demand(
        r_obs_per_m3_s=R_OBS, n_sites_per_m3=N_SITES, gamma_tun_by_geometry=GAMMAS
    )
    grid = out["grid"]
    for i, theta in enumerate(grid["theta"]):
        for j, tau in enumerate(grid["tau_s"]):
            for k, f_nuc in enumerate(grid["f_nuc"]):
                r_mode = compute_fgr_volumetric_rate(
                    n_sites=N_SITES,
                    p_occ=bernoulli_p4(theta),
                    gamma_tun=GAMMAS["trap_25pm"],
                    f_nuc=f_nuc,
                    cluster_lifetime_s=tau,
                    n_coherent=1.0,
                )["rate_per_m3_s"]
                assert grid["log10_ratio"][i][j][k] == pytest.approx(
                    math.log10(r_mode / R_OBS), abs=1e-9
                )


def test_closure_demand_engine_cap_bounds_every_grid_cell() -> None:
    out = closure_demand(
        r_obs_per_m3_s=R_OBS, n_sites_per_m3=N_SITES, gamma_tun_by_geometry=GAMMAS
    )
    cap = out["engine_cap"]["trap_25pm"]
    assert cap["gamma_tun"] == GAMMAS["trap_25pm"]
    assert cap["r_max_per_m3_s"] == pytest.approx(
        N_SITES * GAMMAS["trap_25pm"] * MAX_COLLECTIVE_FACTOR / 1e-20, rel=1e-9
    )
    log10_r_max = math.log10(cap["r_max_per_m3_s"] / R_OBS)
    for theta_rows in out["grid"]["log10_ratio"]:
        for tau_row in theta_rows:
            for value in tau_row:
                assert value is not None
                assert value <= log10_r_max + 1e-9


def test_closure_demand_engine_cap_geometry_outcomes() -> None:
    """Recorded outcome under the engine's n_sites convention: neither geometry
    reaches the 1 W / cm^3 floor even with every FGR factor at its cap.
    trap_25pm falls short by a factor ~6; fcc_tetrahedral by ~50 decades."""
    out = closure_demand(
        r_obs_per_m3_s=R_OBS, n_sites_per_m3=N_SITES, gamma_tun_by_geometry=GAMMAS
    )
    fcc = out["engine_cap"]["fcc_tetrahedral"]
    trap = out["engine_cap"]["trap_25pm"]
    assert fcc["gamma_tun"] < trap["gamma_tun"]
    assert fcc["gamma_tun"] == pytest.approx(1.44e-85, rel=0.05)
    assert trap["gamma_tun"] == pytest.approx(6.8e-37, rel=0.05)
    assert fcc["r_max_per_m3_s"] < R_OBS
    assert fcc["crosses"] is False
    assert trap["r_max_per_m3_s"] < R_OBS
    assert trap["crosses"] is False
    assert 1.0 < R_OBS / trap["r_max_per_m3_s"] < 20.0
    cap_product = 1.0 * 1.0 * 1e6 / 1e-20
    assert out["required_product"] > cap_product


def test_closure_demand_handles_missing_r_obs() -> None:
    out = closure_demand(
        r_obs_per_m3_s=None, n_sites_per_m3=N_SITES, gamma_tun_by_geometry=GAMMAS
    )
    assert out["R_obs_per_m3_s"] is None
    assert out["required_product"] is None
    assert all(
        value is None
        for theta_rows in out["grid"]["log10_ratio"]
        for tau_row in theta_rows
        for value in tau_row
    )
    for geometry in ("fcc_tetrahedral", "trap_25pm"):
        assert out["engine_cap"][geometry]["crosses"] is None
        assert out["engine_cap"][geometry]["r_max_per_m3_s"] > 0
    assert out["two_body_untouched"] is True


def test_default_n_sites_mirrors_engine_convention() -> None:
    """0.5 * (electron_density / Z) * loading, as in compute_trapped_state_rate."""
    from app.physics_engine.unified_lenr_model.config import SimulationConfig

    host = SimulationConfig().host_material
    n_host = host.electron_density / host.atomic_number
    assert N_SITES == pytest.approx(0.5 * n_host * 0.9)
    assert default_n_sites_per_m3(2.0) == pytest.approx(0.5 * n_host)
    assert N_SITES < 0.5 * PD_D_NUMBER_DENSITY_M3 * 0.9
