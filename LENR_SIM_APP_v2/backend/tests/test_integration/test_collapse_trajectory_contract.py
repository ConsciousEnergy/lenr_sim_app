"""
Contract tests for the additive ``collapse_trajectory`` block.

``simulate_collapse`` integrates R(t) and dR/dt, but only scalar peak conditions
were ever reported, so no client could draw the actual collapse curve. The block
is additive: every previously locked field must survive unchanged.
"""

from fastapi.testclient import TestClient


def _client() -> TestClient:
    from app.main import app

    return TestClient(app)


def _bubble_payload() -> dict:
    return {
        "bubble": {
            "initial_radius_um": 10.0,
            "driving_pressure_bar": 1.5,
            "frequency_khz": 20.0,
            "ambient_temperature_k": 298.0,
        },
        "material": {"host_material": "palladium", "reactant": "deuterium"},
        "lattice": {"loading_ratio": 0.9},
        "num_cycles": 2,
    }


def test_collapse_trajectory_is_present_and_plottable() -> None:
    resp = _client().post("/api/unified/bubble-lattice", json=_bubble_payload())
    assert resp.status_code == 200
    trajectory = resp.json()["collapse_trajectory"]

    assert trajectory, "collapse_trajectory must be populated by default"
    for key in ("time_s", "radius_um", "sample_count", "source"):
        assert key in trajectory, f"missing trajectory field: {key}"

    assert trajectory["source"] == "rayleigh_plesset_trajectory"
    assert len(trajectory["time_s"]) == len(trajectory["radius_um"])
    assert trajectory["sample_count"] == len(trajectory["time_s"])
    assert trajectory["sample_count"] > 1


def test_collapse_trajectory_is_bounded_for_transport() -> None:
    """A 200-point cap keeps the payload plottable without shipping the raw grid."""
    trajectory = (
        _client()
        .post("/api/unified/bubble-lattice", json=_bubble_payload())
        .json()["collapse_trajectory"]
    )
    assert trajectory["sample_count"] <= 201  # cap plus the retained minimum
    assert trajectory["downsample_step"] >= 1


def test_trajectory_minimum_matches_reported_min_radius() -> None:
    """The collapse instant must survive downsampling, since every peak
    quantity is evaluated there."""
    data = _client().post("/api/unified/bubble-lattice", json=_bubble_payload()).json()
    trajectory = data["collapse_trajectory"]
    reported_min_um = data["collapse_results"]["min_radius_um"]

    idx = trajectory["min_radius_sample_index"]
    assert 0 <= idx < len(trajectory["radius_um"])
    sampled_min = trajectory["radius_um"][idx]

    assert sampled_min == min(trajectory["radius_um"])
    assert sampled_min == abs(sampled_min)
    # Same collapse, so the sampled minimum agrees with the headline value.
    assert abs(sampled_min - reported_min_um) <= max(1e-9, 0.01 * reported_min_um)


def test_trajectory_radii_are_finite_and_positive() -> None:
    trajectory = (
        _client()
        .post("/api/unified/bubble-lattice", json=_bubble_payload())
        .json()["collapse_trajectory"]
    )
    for radius in trajectory["radius_um"]:
        assert radius > 0.0
        assert radius == radius  # not NaN
    times = trajectory["time_s"]
    assert times == sorted(times), "time samples must stay monotonic"


def test_wall_velocity_is_reported_when_available() -> None:
    trajectory = (
        _client()
        .post("/api/unified/bubble-lattice", json=_bubble_payload())
        .json()["collapse_trajectory"]
    )
    velocities = trajectory.get("wall_velocity_m_s")
    assert velocities is not None, "wall velocity should accompany the radius series"
    assert len(velocities) == len(trajectory["radius_um"])


def test_bubble_dynamics_diagnostics_are_reported() -> None:
    """Solver, mode and peak Mach so a client can tell whether the incompressible
    model was admissible at the wall speeds reached."""
    data = _client().post("/api/unified/bubble-lattice", json=_bubble_payload()).json()
    dynamics = data["collapse_results"]["bubble_dynamics"]

    assert dynamics["mode"] == "rayleigh_plesset"  # opt-in stays opt-in
    assert dynamics["solver"] == "scipy.integrate.solve_ivp(LSODA)"
    assert dynamics["peak_mach"] >= 0.0
    assert dynamics["compressibility_regime"] in {
        "incompressible_valid",
        "compressibility_marginal",
        "compressibility_significant",
    }


def test_keller_miksis_mode_is_selectable() -> None:
    payload = _bubble_payload()
    payload["bubble"]["bubble_dynamics_mode"] = "keller_miksis"
    data = _client().post("/api/unified/bubble-lattice", json=payload).json()

    assert data["success"] is True
    assert data["collapse_results"]["bubble_dynamics"]["mode"] == "keller_miksis"


def test_invalid_dynamics_mode_falls_back_not_500() -> None:
    payload = _bubble_payload()
    payload["bubble"]["bubble_dynamics_mode"] = "nonsense_mode"
    response = _client().post("/api/unified/bubble-lattice", json=payload)

    assert response.status_code == 200
    assert response.json()["collapse_results"]["bubble_dynamics"]["mode"] == (
        "rayleigh_plesset"
    )


def test_mechanism_provenance_names_the_screening_kernel() -> None:
    data = _client().post("/api/unified/bubble-lattice", json=_bubble_payload()).json()
    provenance = data["collapse_results"]["mechanism_provenance"]

    assert provenance["screening"]["model"] == "assenbaum_rolfs_gamow_cited_range_v1"
    assert provenance["screening"]["citations"], "screening potential needs citations"
    assert provenance["screening"]["screening_potential_ev"] > 0
    # Casimir at collapse pressures is outside its continuum domain, and says so.
    assert provenance["casimir"]["domain_valid"] is False
    assert "warning" in provenance["casimir"]


def test_existing_bubble_lattice_contract_is_unchanged() -> None:
    """Additivity guard: the trajectory block must not disturb locked fields."""
    data = _client().post("/api/unified/bubble-lattice", json=_bubble_payload()).json()

    assert data["success"] is True
    assert data["contract_version"].endswith("-science-gate-1")
    for field in (
        "collapse_results",
        "peak_conditions",
        "proton_phases",
        "enhancement_timeline",
        "reaction_rate_engine",
        "validation",
    ):
        assert field in data, f"missing locked field: {field}"

    # Reporting limits and saturation provenance stay where clients expect them.
    assert "limits" in data["collapse_results"]
    assert "saturation" in data["peak_conditions"]["enhancement_breakdown"]
