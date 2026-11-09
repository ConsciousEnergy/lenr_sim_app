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
    diverse_theory_group_count,
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
    # One case per composition-group representative × short condition cells.
    # Grows when ARA P0 adds groups (ultra_dense, null_control, …).
    assert len(cases) == diverse_theory_group_count()
    assert len(cases) >= 20
    assert len(cases) <= 64
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
    assert len(records) == 18
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
    assert len(literature_ids) == 18
    assert "parkhomov-cd-wrapped-snm14-contested" in literature_ids


def test_question_theories_is_designed_not_cartesian() -> None:
    from app.campaign.question_theories import (
        NULL_LITERATURE_ID,
        QUESTION_THEORY_SLICES,
        question_theories_count,
    )

    n = campaign_size("question_theories")
    assert n == question_theories_count()
    # Upper bound grows when THEORY_COMPOSITION_GROUPS gains a representative
    # (each group adds one ARPA-E null case). Wave 1: historical_lattice / Schwinger.
    assert 20 <= n <= 55
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
    czerski = next(
        case for case in isolated if case["enabled_theories"] == ["czerski_thermal_spike"]
    )
    assert czerski["host_material"] == "zirconium"
    assert czerski["beam_energy_kev"] == 2.0


def test_iccf27_and_carbon_silicate_presets_are_designed() -> None:
    from app.campaign.carbon_silicate import carbon_silicate_uq_count
    from app.campaign.iccf27 import iccf27_grid_count
    from app.campaign.parameter_map import parameter_map_count
    from app.data.dataset_io import literature_records

    assert len(literature_records()) == 18
    n_iccf = campaign_size("iccf27_grid")
    assert n_iccf == iccf27_grid_count()
    assert 6 <= n_iccf <= 16
    iccf_cases = list(iter_campaign_cases("iccf27_grid"))
    iccf_hosts = {case["host_material"] for case in iccf_cases}
    assert "nickel" in iccf_hosts
    assert "zirconium" in iccf_hosts
    assert "graphite" in iccf_hosts
    assert "silicon_carbide" in iccf_hosts
    kasagi = next(
        case for case in iccf_cases if case.get("literature_id") == "kasagi-nicu-radiant-2026"
    )
    assert kasagi["host_material"] == "nickel"
    assert kasagi["radiant_calorimetry"] is True
    czerski = next(
        case
        for case in iccf_cases
        if case.get("literature_id") == "czerski-thermal-spike-zr-2024"
    )
    assert czerski["beam_energy_kev"] == 2.0
    described_iccf = describe_preset("iccf27_grid")
    assert "Does not prove LENR" in described_iccf["note"]
    assert "18-row" in described_iccf["note"]

    n_uq = campaign_size("carbon_silicate_uq")
    assert n_uq == carbon_silicate_uq_count()
    assert 6 <= n_uq <= 16
    uq_cases = list(iter_campaign_cases("carbon_silicate_uq"))
    uq_hosts = {case["host_material"] for case in uq_cases}
    assert {"palladium", "nickel", "graphite", "silicon_carbide"} <= uq_hosts
    assert any(case.get("include_uncertainty") for case in uq_cases)
    described_uq = describe_preset("carbon_silicate_uq")
    assert "Does not prove LENR" in described_uq["note"]

    n_map = campaign_size("parameter_map_grid")
    assert n_map == parameter_map_count()
    assert 5 <= n_map <= 16
    map_tags = {case.get("tag") for case in iter_campaign_cases("parameter_map_grid")}
    assert "pmap:graphite_h_hot" in map_tags
    assert "pmap:zr_d_beam" in map_tags
    described_map = describe_preset("parameter_map_grid")
    assert "Does not prove LENR" in described_map["note"]


def test_cavitation_collapse_preset_is_designed() -> None:
    from app.campaign.cavitation_collapse import cavitation_collapse_count

    n = campaign_size("cavitation_collapse")
    assert n == cavitation_collapse_count()
    assert 8 <= n <= 16
    cases = list(iter_campaign_cases("cavitation_collapse"))
    assert all(case.get("route") == "bubble_lattice" for case in cases)
    assert all(isinstance(case.get("bubble"), dict) for case in cases)
    modes = {
        (case.get("bubble") or {}).get("bubble_dynamics_mode") for case in cases
    }
    assert "rayleigh_plesset" in modes
    assert "keller_miksis" in modes
    assert any(case.get("include_uncertainty") for case in cases)
    assert any(
        case.get("literature_id") == "taleyarkhan-sonofusion-2002" for case in cases
    )
    hosts = {case["host_material"] for case in cases}
    assert {"palladium", "nickel", "titanium"} <= hosts
    assert any(case.get("claim_tag") == "null" for case in cases)
    assert any(case.get("rate_mode") == "three_body" for case in cases)
    described = describe_preset("cavitation_collapse")
    assert described["n_cases"] == n
    assert "Does not prove LENR" in described["note"]
    assert "dynamics_mode" in described["note"]


