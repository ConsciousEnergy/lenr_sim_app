"""
Physics / theory / legacy calculation HTTP debug suite.

Run:

    pytest -m simulation_debug -q --no-cov
"""

from __future__ import annotations

import pytest

from .simulation_debug_helpers import (
    assert_finite,
    assert_non_negative,
    assert_positive,
    client,
    theory_conditions,
)

pytestmark = [pytest.mark.integration, pytest.mark.simulation_debug, pytest.mark.api]


class TestTheoryPipelineSimulationsDebug:
    def test_list_and_run_all_registered_theories(self) -> None:
        api = client()
        listed = api.get("/api/physics/theories")
        assert listed.status_code == 200, listed.text
        theory_ids = [row["theory_id"] for row in listed.json()]
        assert theory_ids

        run = api.post(
            "/api/physics/theories/run",
            json={"conditions": theory_conditions(), "enabled_theories": theory_ids},
        )
        assert run.status_code == 200, run.text
        body = run.json()
        assert_positive(body["combined_enhancement"], "combined_enhancement")
        assert len(body["per_theory"]) == len(theory_ids)
        for row in body["per_theory"]:
            assert_finite(
                row.get("enhancement_factor", row.get("enhancement", 1.0)),
                row["theory_id"],
            )

    @pytest.mark.parametrize(
        "theory_id",
        [
            "electron_screening",
            "hagelstein_phonon",
            "casimir_confinement",
            "takahashi_tsc",
        ],
    )
    def test_single_theory_run(self, theory_id: str) -> None:
        resp = client().post(
            f"/api/physics/theories/{theory_id}/run",
            json={"conditions": theory_conditions()},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        enh = data.get("enhancement_factor", data.get("enhancement"))
        if enh is not None:
            assert_finite(enh, f"{theory_id}.enhancement")

    def test_coupled_analytics_run(self) -> None:
        resp = client().post(
            "/api/analytics/theories/run-coupled",
            json={
                "conditions": theory_conditions(),
                "enabled_theories": ["electron_screening", "casimir_confinement"],
            },
        )
        assert resp.status_code == 200, resp.text
        assert_positive(resp.json()["combined_enhancement"], "coupled.combined_enhancement")


class TestPhysicsTestbedSimulationsDebug:
    def _physics_config(self) -> dict:
        return {
            "temperature": 300.0,
            "pressure": 101325.0,
            "electron_density": 6.8e28,
            "lattice_constant": 3.89e-10,
            "dimensions": [8, 8, 8],
            "max_steps": 5,
        }

    def test_initialize_enhancement_lattice_fusion(self) -> None:
        api = client()
        init = api.post("/api/physics/initialize", json=self._physics_config())
        assert init.status_code == 200, init.text

        enh = api.post(
            "/api/physics/enhancement",
            json={
                "temperature": 300.0,
                "electron_density": 6.8e28,
                "electric_field": 1e6,
                "lattice_constant": 3.89e-10,
            },
        )
        assert enh.status_code == 200, enh.text
        enh_body = enh.json()
        total = enh_body.get("total_enhancement", enh_body.get("total"))
        if total is not None:
            assert_positive(total, "physics.enhancement.total")

        lattice = api.post(
            "/api/physics/lattice/simulate",
            json={"config": self._physics_config(), "time_steps": 3},
        )
        assert lattice.status_code == 200, lattice.text

        rate = api.post(
            "/api/physics/fusion/reaction-rate",
            json={
                "reaction_type": "DD",
                "density": 1e28,
                "temperature": 1000.0,
                "enhancement_factor": 1.0,
            },
        )
        assert rate.status_code == 200, rate.text
        rate_body = rate.json()
        value = rate_body.get("reaction_rate", rate_body.get("rate"))
        if value is not None:
            assert_non_negative(value, "fusion.reaction_rate")

        status = api.get("/api/physics/status")
        assert status.status_code == 200, status.text


class TestLegacyPhysicsSimulationsDebug:
    def test_quantum_tunneling(self) -> None:
        resp = client().post(
            "/api/physics/quantum-tunneling",
            json={
                "z1": 1,
                "z2": 1,
                "a1": 2.0,
                "a2": 2.0,
                "energy_kev": 0.1,
                "temperature_k": 300.0,
                "material": "palladium",
            },
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        prob = assert_positive(data["tunneling_probability"], "tunneling_probability")
        assert prob < 1.0

    def test_lenr_enhancement_and_rate(self) -> None:
        api = client()
        enh = api.post(
            "/api/physics/lenr-enhancement",
            json={
                "energy_kev": 0.025,
                "temperature_k": 350.0,
                "loading_ratio": 0.85,
                "material": "palladium",
            },
        )
        assert enh.status_code == 200, enh.text
        assert_positive(enh.json()["total_enhancement"], "legacy.total_enhancement")

        rate = api.post(
            "/api/physics/lenr-reaction-rate",
            json={
                "temperature_k": 400.0,
                "loading_ratio": 0.9,
                "material": "palladium",
                "volume_cm3": 1.0,
            },
        )
        assert rate.status_code == 200, rate.text
        assert_non_negative(
            rate.json()["reaction_rate_per_cm3_s"], "legacy.reaction_rate_per_cm3_s"
        )

    def test_bubble_fusion(self) -> None:
        resp = client().post(
            "/api/physics/bubble-fusion",
            json={
                "initial_radius_um": 10.0,
                "acoustic_pressure_bar": 1.2,
                "frequency_khz": 20.0,
                "gas_type": "deuterium",
            },
        )
        assert resp.status_code == 200, resp.text
        results = resp.json()["collapse_results"]
        assert_positive(results["min_radius_um"], "legacy.bubble.min_radius_um")
        assert_positive(results["max_temperature_k"], "legacy.bubble.max_temperature_k")

    def test_fusion_rate(self) -> None:
        resp = client().post(
            "/api/physics/fusion-rate",
            json={
                "reaction_type": "d-d",
                "temperature_k": 1000.0,
                "density_per_cm3": 1e22,
                "material": "palladium",
            },
        )
        assert resp.status_code == 200, resp.text
        assert_non_negative(resp.json()["reaction_rate_per_s"], "legacy.fusion_rate")


def test_health_and_openapi_expose_simulation_paths() -> None:
    api = client()
    health = api.get("/api/health")
    assert health.status_code == 200, health.text
    schema = api.get("/api/openapi.json")
    assert schema.status_code == 200
    paths = schema.json()["paths"]
    for required in (
        "/api/unified/simulate",
        "/api/unified/bubble-lattice",
        "/api/physics/theories/run",
        "/api/physics/quantum-tunneling",
        "/api/physics/bubble-fusion",
    ):
        assert required in paths, f"missing OpenAPI path: {required}"
