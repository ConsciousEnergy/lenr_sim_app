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
    theory_group_representatives,
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
    records = literature_records()
    assert len(records) == 17
    miles = next(case for case in cases if case.get("literature_id") == "miles-1993")
    assert miles["claim_tag"] == "EMP"
    assert "EQ-OPEN-YIELD-01" in miles["open_question_ids"]
    assert "EQ-OPEN-RAD-01" in miles["open_question_ids"]
    chubb = next(
        case for case in cases if case.get("literature_id") == "chubb-lattice-tunneling-2004"
    )
    assert chubb["tag"] == "literature:chubb-lattice-tunneling-2004"
    literature_ids = {
        case.get("literature_id") for case in cases if case.get("literature_id")
    }
    assert len(literature_ids) == 17


def test_question_theories_is_designed_not_cartesian() -> None:
    from app.campaign.question_theories import (
        NULL_LITERATURE_ID,
        QUESTION_THEORY_SLICES,
        question_theories_count,
    )

    n = campaign_size("question_theories")
    assert n == question_theories_count()
    assert 20 <= n <= 45
    cases = list(iter_campaign_cases("question_theories"))
    assert len(cases) == n
    tags = {case.get("tag") for case in cases}
    assert any(str(tag).startswith("question_theories:EQ-OPEN-MEV-01:") for tag in tags)
    assert any(str(tag).startswith("question_theories:null:") for tag in tags)
    miles_heat = [
        case
        for case in cases
        if case.get("literature_id") == "miles-1993"
        and case.get("enabled_theories") == ["miles_heat_helium"]
    ]
    assert len(miles_heat) == 1
    arpa = [case for case in cases if case.get("literature_id") == NULL_LITERATURE_ID]
    assert len(arpa) == len(theory_group_representatives())
    assert all(case["claim_tag"] == "null" for case in arpa)
    isolated = {tuple(case["enabled_theories"]) for case in cases}
    assert all(len(ids) == 1 for ids in isolated)
    described = describe_preset("question_theories")
    assert described["n_question_slices"] == len(QUESTION_THEORY_SLICES)
    assert "Does not prove LENR" in described["note"]


def test_association_screen_is_designed_not_cartesian() -> None:
    from app.campaign.association_screen import (
        ANCHOR_LITERATURE_IDS,
        association_screen_count,
    )

    n = campaign_size("association_screen")
    assert n == association_screen_count()
    assert 18 <= n <= 40
    cases = list(iter_campaign_cases("association_screen"))
    assert len(cases) == n
    literature_ids = {case.get("literature_id") for case in cases}
    assert set(ANCHOR_LITERATURE_IDS) <= literature_ids
    temperatures = {case["temperature"] for case in cases}
    loadings = {case["loading_ratio"] for case in cases}
    assert temperatures == {280.0, 300.0, 350.0}
    assert loadings == {0.85, 0.95}
    assert all(case["use_theory_pipeline"] is True for case in cases)
    described = describe_preset("association_screen")
    assert described["n_cases"] == n
    assert "Does not prove LENR" in described["note"]
    assert "P(LENR)" in described["note"]


def test_testbed_review_is_designed_not_cartesian() -> None:
    from app.campaign.testbed_review import (
        ANCHOR_LITERATURE_IDS,
        testbed_review_count,
    )
    from app.physics_engine.theory_pipeline import get_default_pipeline

    n = campaign_size("testbed_review")
    assert n == testbed_review_count()
    assert 24 <= n <= 30
    cases = list(iter_campaign_cases("testbed_review"))
    assert len(cases) == n
    isolated = [case for case in cases if case.get("enabled_theories")]
    literature = [case for case in cases if not case.get("enabled_theories")]
    registered = set(get_default_pipeline().registered_ids)
    isolated_ids = {case["enabled_theories"][0] for case in isolated}
    assert isolated_ids == registered
    assert {case["literature_id"] for case in literature} == set(ANCHOR_LITERATURE_IDS)
    piantelli = next(
        case for case in isolated if case["enabled_theories"] == ["piantelli_ni_h"]
    )
    assert piantelli["host_material"] == "nickel"
    assert piantelli["reactant"] == "hydrogen"
    assert all(case["use_theory_pipeline"] is True for case in cases)
    described = describe_preset("testbed_review")
    assert described["n_cases"] == n
    assert "Does not prove LENR" in described["note"]
    assert "P(LENR)" in described["note"]


