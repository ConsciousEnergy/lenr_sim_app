"""
Unified simulation HTTP debug suite (``/api/unified/*``).

Run:

    pytest -m simulation_debug -q --no-cov
"""

from __future__ import annotations

from typing import Mapping

import pytest

from .simulation_debug_helpers import (
    assert_all_finite,
    assert_non_negative,
    assert_positive,
    bubble_payload,
    client,
    unified_payload,
)

pytestmark = [pytest.mark.integration, pytest.mark.simulation_debug, pytest.mark.api]


class TestUnifiedSimulationsDebug:
    def test_simulate_returns_physical_enhancement(self) -> None:
        resp = client().post("/api/unified/simulate", json=unified_payload())
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("success") is True
        assert data["contract_version"].endswith("-science-gate-1")
        assert_positive(data["enhancement"]["total"], "enhancement.total")
        rate = data["reaction_rate_engine"]["rate"]
        assert_non_negative(
            rate["rate_per_m3_s"], "reaction_rate_engine.rate.rate_per_m3_s"
        )
        assert rate["claim_tier"]

    def test_export_envelope_is_finite(self) -> None:
        payload = {
            **unified_payload(),
            "include_uncertainty": True,
            "uncertainty_samples": 32,
            "random_seed": 3,
        }
        resp = client().post("/api/unified/export", json=payload)
        assert resp.status_code == 200, resp.text
        env = resp.json()
        assert env["schema_version"] == "lenr-run-export-v1"
        assert env["reproducibility"]["deterministic"] is True
        results = env["results"]
        enhancement = results.get("enhancement") or {}
        total = enhancement.get("total", results.get("total_enhancement"))
        assert_positive(total, "export.results.enhancement.total")

    def test_bubble_lattice_windows_repro_payload(self) -> None:
        resp = client().post("/api/unified/bubble-lattice", json=bubble_payload())
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["success"] is True
        collapse = data["collapse_results"]
        assert_positive(collapse["min_radius_um"], "min_radius_um")
        assert_positive(collapse["max_temperature_k"], "max_temperature_k")
        pressure = collapse.get("max_pressure_bar", collapse.get("max_pressure_pa"))
        assert_positive(pressure, "max_pressure")
        dynamics = collapse["bubble_dynamics"]
        assert dynamics["solver"] in {
            "scipy.integrate.solve_ivp(LSODA)",
            "scipy.integrate.solve_ivp(BDF)",
        }
        peak = data["peak_conditions"]
        assert_positive(peak["temperature_k"], "peak_conditions.temperature_k")
        traj = data["collapse_trajectory"]
        assert traj["sample_count"] > 1
        assert_all_finite(traj["radius_um"], "collapse_trajectory.radius_um")
        assert all(r > 0 for r in traj["radius_um"])
        rate = data["reaction_rate_engine"]["rate"]
        assert_non_negative(rate["rate_per_m3_s"], "bubble.reaction_rate")

    def test_compare_systems_both_sides_finite(self) -> None:
        resp = client().post(
            "/api/unified/compare",
            json={"system1": "pd_d", "system2": "ni_h", "temperature": 300.0},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert_positive(data["system1"]["total_enhancement"], "system1.total_enhancement")
        assert_positive(data["system2"]["total_enhancement"], "system2.total_enhancement")

    def test_metadata_endpoints(self) -> None:
        api = client()
        for path in (
            "/api/unified/mechanisms",
            "/api/unified/presets",
            "/api/unified/equations",
        ):
            resp = api.get(path)
            assert resp.status_code == 200, f"{path}: {resp.text}"
            assert resp.json()

    def test_bubble_lattice_instant(self) -> None:
        resp = client().get(
            "/api/unified/bubble-lattice/instant",
            params={
                "normalized_time": 0.5,
                "initial_radius_um": 10.0,
                "driving_pressure_bar": 1.5,
                "frequency_khz": 20.0,
                "loading_ratio": 0.9,
            },
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        enhancement = data["enhancement"]
        if isinstance(enhancement, Mapping):
            enhancement = enhancement.get("total", enhancement.get("value"))
        assert_positive(enhancement, "instant.enhancement")
        assert_positive(data["conditions"]["temperature"], "instant.temperature")

    def test_bubble_lattice_websocket_stream(self) -> None:
        payload = bubble_payload()
        payload["num_cycles"] = 1
        with client().websocket_connect("/api/unified/bubble-lattice/stream") as ws:
            ws.send_json(payload)
            frames = [ws.receive_json() for _ in range(3)]
            assert frames[0].get("type") != "error", frames[0]
            physics = [f for f in frames if f.get("type") == "physics_update"]
            assert physics, f"expected physics_update frames, got {frames}"
            assert_positive(physics[0]["enhancement"], "stream.enhancement")
            assert_positive(physics[0]["temperature_k"], "stream.temperature_k")
