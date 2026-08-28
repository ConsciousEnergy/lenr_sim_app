"""History honesty contract: capped enhancement, null keV, watts, no engine mix."""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.services.simulation_persistence import SOURCE_AUTO_PERSIST


def _client() -> TestClient:
    from app.main import app

    return TestClient(app)


def _persistence(body: dict) -> dict:
    return (
        (body.get("validation") or {}).get("persistence")
        or (body.get("analytics_transparency") or {}).get("persistence")
        or {}
    )


def test_list_exposes_saturation_watts_and_null_kev() -> None:
    session_id = f"hist-honesty-{uuid.uuid4().hex}"
    created_id = None
    with _client() as client:
        created = client.post(
            "/api/analytics/experiments",
            json={
                "name": "capped bubble-like",
                "experiment_type": "bubble_fusion",
                "session_id": session_id,
                "status": "completed",
                "material": "palladium",
                "temperature_k": 300.0,
                "enhancement_factor": MAX_ENHANCEMENT_FACTOR,
                "energy_output_kev": None,
                "excess_heat_watts": 0.012,
                "results": {
                    "is_model_output": True,
                    "enhancement_saturation": {
                        "is_saturated": True,
                        "log10_value_raw": 18.4,
                        "ceiling": MAX_ENHANCEMENT_FACTOR,
                    },
                },
            },
        )
        assert created.status_code == 201
        body = created.json()
        created_id = body["id"]
        assert body["energy_output_kev"] is None
        assert body["enhancementSaturated"] is True
        assert body["log10EnhancementRaw"] == 18.4
        assert body["excessHeatWatts"] == 0.012
        assert body.get("claim_tiers_raised") is not True
        try:
            listed = client.get(
                "/api/analytics/experiments",
                params={"session_id": session_id, "include_baseline": False, "limit": 50},
            )
            assert listed.status_code == 200
            row = next(
                item
                for item in listed.json()["experiments"]
                if item["id"] == created_id
            )
            assert row["energy_output_kev"] is None
            assert row["enhancementSaturated"] is True
            assert row["excessHeatWatts"] == 0.012
            assert "enhancementSaturated" in row
            assert "log10EnhancementRaw" in row
            assert "excessHeatWatts" in row
        finally:
            if created_id:
                client.delete(f"/api/analytics/experiments/{created_id}")


def test_bubble_persist_without_scores_still_lists() -> None:
    session_id = f"bubble-bare-{uuid.uuid4().hex}"
    with _client() as client:
        resp = client.post(
            "/api/unified/bubble-lattice",
            json={
                "bubble": {
                    "initial_radius_um": 10.0,
                    "driving_pressure_bar": 1.5,
                    "frequency_khz": 20.0,
                    "ambient_temperature_k": 298.0,
                },
                "material": {"host_material": "palladium", "reactant": "deuterium"},
                "lattice": {"loading_ratio": 0.9},
                "num_cycles": 2,
                "persist_session_id": session_id,
                "persist_source": SOURCE_AUTO_PERSIST,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        peak = (data.get("peak_conditions") or {}).get("enhancement_factor")
        experiment_id = _persistence(data).get("experiment_id")
        assert experiment_id
        try:
            listed = client.get(
                "/api/analytics/experiments",
                params={"session_id": session_id, "include_baseline": False, "limit": 50},
            )
            row = next(
                item
                for item in listed.json()["experiments"]
                if item["id"] == experiment_id
            )
            assert row["enhancement_factor"] == peak
            assert row["energy_output_kev"] is None
            assert row["meanFinalScore"] is None
            assert row["literatureId"] is None
            assert not (row.get("results") or {}).get("pipeline_scores")
            sat = (row.get("results") or {}).get("enhancement_saturation") or {}
            assert "is_saturated" in sat
            if peak is not None and float(peak) >= MAX_ENHANCEMENT_FACTOR * (1.0 - 1e-9):
                assert row["enhancementSaturated"] is True
            assert data["open_questions"]["lenr_proved"] is False
        finally:
            client.delete(f"/api/analytics/experiments/{experiment_id}")


def test_bubble_persist_attaches_scores_without_changing_peak() -> None:
    session_id = f"bubble-attach-{uuid.uuid4().hex}"
    with _client() as client:
        resp = client.post(
            "/api/unified/bubble-lattice",
            json={
                "bubble": {
                    "initial_radius_um": 10.0,
                    "driving_pressure_bar": 1.5,
                    "frequency_khz": 20.0,
                    "ambient_temperature_k": 298.0,
                },
                "material": {"host_material": "palladium", "reactant": "deuterium"},
                "lattice": {"loading_ratio": 0.9},
                "num_cycles": 2,
                "persist_session_id": session_id,
                "persist_source": SOURCE_AUTO_PERSIST,
                "literature_id": "miles-1993",
                "theory_result": {
                    "combined_enhancement": 12.0,
                    "total_energy_watts": 0.003,
                    "enabled_theories": ["electron_screening"],
                    "per_theory": [
                        {
                            "theory_id": "electron_screening",
                            "enhancement_factor": 4.0,
                            "confidence": 0.5,
                            "claim_tier": "speculative_exploratory",
                            "is_applicable": True,
                            "confidence_breakdown": {"weighted_score": 0.42},
                        }
                    ],
                },
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        peak = (data.get("peak_conditions") or {}).get("enhancement_factor")
        experiment_id = _persistence(data).get("experiment_id")
        assert experiment_id
        try:
            listed = client.get(
                "/api/analytics/experiments",
                params={"session_id": session_id, "include_baseline": False, "limit": 50},
            )
            row = next(
                item
                for item in listed.json()["experiments"]
                if item["id"] == experiment_id
            )
            assert row["enhancement_factor"] == peak
            assert row["enhancement_factor"] != 12.0
            assert row["literatureId"] == "miles-1993"
            assert row["energy_output_kev"] is None
            assert row["topTheoryId"] == "electron_screening"
            assert row["excessHeatWatts"] == 0.003
            scores = (row.get("results") or {}).get("pipeline_scores") or {}
            assert "electron_screening" in scores
            assert row["results"]["composition_contract"]["not_combinable_with"] == [
                "peak_conditions.enhancement_factor"
            ]
            assert data["open_questions"]["lenr_proved"] is False
            assert row.get("claim_tiers_raised") is not True
        finally:
            client.delete(f"/api/analytics/experiments/{experiment_id}")


def test_unified_persist_keeps_kev_null_and_stamps_saturation() -> None:
    session_id = f"unified-watts-{uuid.uuid4().hex}"
    with _client() as client:
        resp = client.post(
            "/api/unified/simulate",
            json={
                "material": {"host_material": "palladium", "reactant": "deuterium"},
                "environmental": {"temperature": 320.0, "pressure": 101325.0},
                "lattice": {"loading_ratio": 0.9},
                "time_steps": 10,
                "total_time": 1.0,
                "use_theory_pipeline": True,
                "persist_session_id": session_id,
                "persist_source": SOURCE_AUTO_PERSIST,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["open_questions"]["lenr_proved"] is False
        experiment_id = _persistence(data).get("experiment_id")
        assert experiment_id
        try:
            listed = client.get(
                "/api/analytics/experiments",
                params={"session_id": session_id, "include_baseline": False, "limit": 50},
            )
            row = next(
                item
                for item in listed.json()["experiments"]
                if item["id"] == experiment_id
            )
            assert row["energy_output_kev"] is None
            sat = (row.get("results") or {}).get("enhancement_saturation") or {}
            assert "is_saturated" in sat
            assert "excessHeatWatts" in row
            heat = (data.get("observables") or {}).get("excess_heat_watts") or 0.0
            if float(heat or 0.0) <= 0.0:
                pipeline_watts = data.get("total_energy_watts")
                if pipeline_watts is None:
                    pipeline_watts = (data.get("observables") or {}).get("total_energy_watts")
                if pipeline_watts is not None and float(pipeline_watts) > 0.0:
                    assert row["excessHeatWatts"] == float(pipeline_watts)
            if row.get("enhancement_factor") is not None and float(
                row["enhancement_factor"]
            ) >= MAX_ENHANCEMENT_FACTOR * (1.0 - 1e-9):
                assert row["enhancementSaturated"] is True
            assert row.get("claim_tiers_raised") is not True
        finally:
            client.delete(f"/api/analytics/experiments/{experiment_id}")


def test_theory_pipeline_persist_accepts_literature_id() -> None:
    session_id = f"theory-lit-{uuid.uuid4().hex}"
    with _client() as client:
        resp = client.post(
            "/api/physics/theories/run",
            json={
                "conditions": {"temperature": 300.0, "loading_ratio": 0.9},
                "enabled_theories": ["electron_screening"],
                "persist_session_id": session_id,
                "persist_source": SOURCE_AUTO_PERSIST,
                "literature_id": "miles-1993",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        experiment_id = _persistence(data).get("experiment_id")
        assert experiment_id
        try:
            listed = client.get(
                "/api/analytics/experiments",
                params={"session_id": session_id, "include_baseline": False, "limit": 50},
            )
            row = next(
                item
                for item in listed.json()["experiments"]
                if item["id"] == experiment_id
            )
            assert row["literatureId"] == "miles-1993"
            assert row["energy_output_kev"] is None
            assert data.get("open_questions", {}).get("lenr_proved") is not True
        finally:
            client.delete(f"/api/analytics/experiments/{experiment_id}")
