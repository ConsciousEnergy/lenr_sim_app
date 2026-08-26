"""Diverse campaign grid: designed size, theory groups, failed persist. No full run."""

import asyncio
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.campaign.grid import (
    ALL_CLAIMS_OCCURRENCE_CASES,
    DIVERSE_EXTRA_CASES,
    DIVERSE_THEORY_GROUPS,
    PRESETS,
    campaign_size,
    describe_preset,
    iter_all_claims_single_theory_cases,
    iter_campaign_cases,
    iter_diverse_theory_group_cases,
)
from app.physics_engine.theory_pipeline import THEORY_COMPOSITION_GROUPS, get_default_pipeline
from app.campaign.runner import run_campaign


def test_diverse_unified_size_is_designed_not_full_cartesian() -> None:
    spec = PRESETS["diverse"]
    cartesian = 1
    for values in spec.values():
        cartesian *= len(values)
    assert cartesian == 4 * 4 * 3 * 2 * 2
    assert campaign_size("diverse") == cartesian + len(DIVERSE_EXTRA_CASES)
    assert 100 <= campaign_size("diverse") <= 200
    assert campaign_size("smoke") == 4
    extras = {case.get("tag") for case in DIVERSE_EXTRA_CASES}
    assert "copper_host_control" in extras
    assert "trapped_state_slice" in extras
    assert "efield_on" in extras


def test_diverse_theory_group_axis_hits_multiple_theory_ids() -> None:
    cases = list(iter_diverse_theory_group_cases())
    theory_ids = {
        case["enabled_theories"][0]
        for case in cases
        if case.get("enabled_theories")
    }
    groups = {case["composition_group"] for case in cases}
    assert len(cases) >= 20
    assert len(cases) <= 40
    assert len(theory_ids) > 1
    assert len(groups) > 1
    assert groups == set(THEORY_COMPOSITION_GROUPS.values())
    assert set(DIVERSE_THEORY_GROUPS) == set(THEORY_COMPOSITION_GROUPS.values())
    described = describe_preset("diverse")
    assert described["n_theory_group_runs"] == len(cases)
    assert described["n_cases"] == campaign_size("diverse")


def test_failed_campaign_case_persists_failed_status(monkeypatch) -> None:
    boom = AsyncMock(side_effect=RuntimeError("simulated campaign failure"))
    monkeypatch.setattr("app.campaign.runner.run_unified_simulation", boom)

    from app.main import app

    with TestClient(app) as client:
        result = asyncio.run(run_campaign("smoke", include_theory_pipeline=False))
        assert result["n_unified_runs"] == 0
        assert result["n_exception_runs"] == 4
        assert result["n_attempted_runs"] == 4
        assert result["lenr_proved"] is False
        assert result["empirical_claim_tiers_raised"] is False
        persisted = [row for row in result["persistence"] if row.get("experiment_id")]
        assert len(persisted) == 4

        listed = client.get(
            "/api/analytics/experiments",
            params={
                "session_id": "ui-session",
                "include_baseline": True,
                "status": "failed",
                "limit": 100,
            },
        )
        assert listed.status_code == 200
        failed_rows = [
            row
            for row in listed.json()["experiments"]
            if row["status"] == "failed"
            and row["id"] in {item["experiment_id"] for item in persisted}
        ]
        assert len(failed_rows) == 4
        assert all(row["results"].get("scientific_outcome") == "failed" for row in failed_rows)


def test_all_claims_grid_covers_registered_theories() -> None:
    cartesian = 1
    for values in PRESETS["all_claims"].values():
        cartesian *= len(values)
    assert cartesian == 2 * 2
    assert campaign_size("all_claims") == cartesian + len(ALL_CLAIMS_OCCURRENCE_CASES)
    assert campaign_size("all_claims") == 6
    unified_tags = {case.get("tag") for case in iter_campaign_cases("all_claims")}
    assert "occurrence_anchored_pd_d" in unified_tags
    assert "occurrence_anchored_pd_d_warm" in unified_tags

    registered = set(get_default_pipeline().registered_ids)
    cases = list(iter_all_claims_single_theory_cases())
    theory_ids = {
        case["enabled_theories"][0]
        for case in cases
        if case.get("enabled_theories")
    }
    assert theory_ids == registered
    described = describe_preset("all_claims")
    assert described["n_cases"] == 6
    assert described["n_occurrence_anchored"] == 2
    assert described["n_single_theory_runs"] == len(registered)
    assert "Does not prove LENR" in described["note"]


def test_literature_grid_is_designed_not_cartesian() -> None:
    from app.campaign.literature import LITERATURE_NEGATIVE_CONTROLS, literature_grid_count
    from app.data.dataset_io import literature_records

    n = campaign_size("literature_grid")
    assert n == literature_grid_count()
    assert 16 <= n <= 32
    cases = list(iter_campaign_cases("literature_grid"))
    tags = {case.get("tag") for case in cases}
    assert any(str(tag).startswith("literature:") for tag in tags)
    assert "literature_copper_host_control" in tags
    assert "literature_trapped_state_slice" in tags
    arpa = next(case for case in cases if case.get("literature_id") == "berlinguette-arpa-e-2019")
    assert arpa["claim_tag"] == "null"
    hosts = {case["host_material"] for case in cases}
    assert "palladium" in hosts
    assert "copper" in hosts
    described = describe_preset("literature_grid")
    assert described["n_negative_controls"] == len(LITERATURE_NEGATIVE_CONTROLS)
    assert "Does not prove LENR" in described["note"]
    assert len(literature_records()) == 16

