"""WS7 weight-surface honesty: score-gaming, literature overfit, avenue re-rank.

Approximate / Aspirational toy weights are not laboratory posteriors.
Never flips EQ-OPEN-* or sets lenr_proved.
"""

from __future__ import annotations

import json
from pathlib import Path

from app.campaign.avenue_ranking import assert_ranking_honesty, rank_avenues
from app.campaign.detector_weak_screen import (
    DETECTOR_LITERATURE_IDS,
    MODERATOR_NULL_LITERATURE_ID,
    WEAK_EC_LITERATURE_ID,
    detector_weak_screen_count,
    iter_detector_weak_screen_cases,
)
from app.campaign.grid import campaign_size, describe_preset, iter_campaign_cases
from app.data.dataset_io import datasets_root
from app.physics_engine.decision_oracle import ANCHORED_PRIORS, DEFAULT_PRIORS
from app.physics_engine.literature_likelihood import (
    SCORE_MODE_FIVE_FACTOR,
    SCORE_MODE_PLUS_LITERATURE,
)
from app.physics_engine.theory_scoring import (
    CLAIM_TIER_MULTIPLIER,
    W_COMPLETENESS,
    W_CROSS_THEORY,
    W_EXPERIMENTAL,
    W_PHYSICAL,
    W_SENSITIVITY,
    compute_theory_scores,
)
from app.services.reviewer_pack import PACK_SCHEMA

_CONDITIONS = {
    "temperature": 300.0,
    "loading_ratio": 0.9,
    "pressure": 101325.0,
    "electron_density": 6.8e28,
}

OPEN_IDS = {
    "EQ-OPEN-MEV-01",
    "EQ-OPEN-RAD-01",
    "EQ-OPEN-RATE-01",
    "EQ-OPEN-EC-01",
    "EQ-OPEN-YIELD-01",
}


def test_weight_surfaces_are_approximate_toy_coefficients() -> None:
    """Inventory lock: fixed W_* and claim-tier multipliers sum / bound honestly."""
    weights = (
        W_PHYSICAL,
        W_EXPERIMENTAL,
        W_SENSITIVITY,
        W_CROSS_THEORY,
        W_COMPLETENESS,
    )
    assert abs(sum(weights) - 1.0) < 1e-9
    assert all(w > 0.0 for w in weights)
    assert CLAIM_TIER_MULTIPLIER["validated_lenr_mechanism"] == 1.0
    assert CLAIM_TIER_MULTIPLIER["speculative_exploratory"] == 0.30
    assert CLAIM_TIER_MULTIPLIER["cross_regime_extrapolation"] == 0.20
    assert all(0.0 < m <= 1.0 for m in CLAIM_TIER_MULTIPLIER.values())
    assert abs(sum(DEFAULT_PRIORS.values()) - 1.0) < 1e-9
    assert abs(sum(ANCHORED_PRIORS.values()) - 1.0) < 1e-9
    # Anchored priors are a scenario table, not P(LENR).
    assert ANCHORED_PRIORS["chemical_null"] < DEFAULT_PRIORS["chemical_null"]
    assert ANCHORED_PRIORS != DEFAULT_PRIORS


def test_score_gaming_skip_sensitivity_still_applies_claim_tier() -> None:
    """Floors + skip_sensitivity must not erase claim-tier multiply honesty."""
    scores = compute_theory_scores(
        _CONDITIONS,
        enabled_theories=["stellar_scaling_mhd", "electron_screening", "miles_heat_helium"],
        skip_sensitivity=True,
    )
    stellar = scores["stellar_scaling_mhd"]
    assert stellar["parameter_sensitivity"] == 0.5
    assert stellar["claim_tier"] == "speculative_exploratory"
    assert stellar["claim_tier_multiplier"] == CLAIM_TIER_MULTIPLIER["speculative_exploratory"]
    assert stellar["final_score"] <= stellar["raw_score_pre_tier"] + 1e-6
    assert (
        abs(
            stellar["final_score"]
            - stellar["raw_score_pre_tier"] * stellar["claim_tier_multiplier"]
        )
        < 1e-3
    )
    # Speculative track remains down-weighted relative to its raw geometric mean.
    assert stellar["final_score"] < stellar["raw_score_pre_tier"] * 0.5


def test_literature_mode_cannot_promote_claim_tier_or_prove_lenr() -> None:
    """five_factor_plus_literature must not overfit EMP heat into tier promotion."""
    baseline = compute_theory_scores(
        _CONDITIONS,
        enabled_theories=["miles_heat_helium", "widom_larsen"],
        skip_sensitivity=True,
        score_mode=SCORE_MODE_FIVE_FACTOR,
    )
    literature = compute_theory_scores(
        _CONDITIONS,
        enabled_theories=["miles_heat_helium", "widom_larsen"],
        skip_sensitivity=True,
        score_mode=SCORE_MODE_PLUS_LITERATURE,
    )
    for theory_id in baseline:
        assert literature[theory_id]["claim_tier"] == baseline[theory_id]["claim_tier"]
        assert literature[theory_id]["score_mode"] == SCORE_MODE_PLUS_LITERATURE
        # Dual honesty: final_score present; literature cannot invent proof flags.
        assert "final_score" in literature[theory_id]
        assert literature[theory_id].get("lenr_proved") is not True


def test_dual_score_fields_remain_distinct_on_persist_shape() -> None:
    """Guardrails-like score and five-factor final_score stay dual / additive."""
    scores = compute_theory_scores(
        _CONDITIONS,
        enabled_theories=["electron_screening"],
        skip_sensitivity=True,
    )
    entry = scores["electron_screening"]
    assert "final_score" in entry
    assert "raw_score_pre_tier" in entry
    assert "claim_tier_multiplier" in entry
    # confidence (rubric-adjacent) is not rewritten into final_score.
    assert entry["final_score"] != entry.get("confidence") or entry["claim_tier_multiplier"] == 1.0


def test_detector_weak_screen_preset_is_designed_not_cartesian() -> None:
    n = campaign_size("detector_weak_screen")
    assert n == detector_weak_screen_count()
    assert 8 <= n <= 30
    cases = list(iter_campaign_cases("detector_weak_screen"))
    assert len(cases) == n
    assert cases == list(iter_detector_weak_screen_cases())
    literature_ids = {case.get("literature_id") for case in cases}
    assert set(DETECTOR_LITERATURE_IDS) <= literature_ids
    assert WEAK_EC_LITERATURE_ID in literature_ids
    assert MODERATOR_NULL_LITERATURE_ID in literature_ids
    assert "parkhomov-cd-wrapped-snm14-contested" in literature_ids
    tags = {str(case.get("tag")) for case in cases}
    assert any("detector_cd_ratio" in tag for tag in tags)
    assert any("weak_ec_threshold" in tag for tag in tags)
    assert any("moderator_null" in tag for tag in tags)
    assert any("parkhomov-cd-wrapped-snm14-contested" in tag for tag in tags)
    assert all(case.get("lenr_proved") is False for case in cases)
    assert all(
        case.get("scenario_kind") == "scenario_table_not_posterior" for case in cases
    )
    stressed = {
        oid for case in cases for oid in (case.get("open_question_ids") or [])
    }
    assert "EQ-OPEN-RAD-01" in stressed
    assert "EQ-OPEN-EC-01" in stressed
    assert "EQ-OPEN-RATE-01" in stressed
    described = describe_preset("detector_weak_screen")
    assert described["n_cases"] == n
    assert "Does not prove LENR" in described["note"]
    assert "P(LENR)" in described["note"]


def test_detector_weak_pack_honesty_and_avenue_rerank() -> None:
    root = datasets_root() / "reviewer_packs" / "detector_weak_screen"
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["schema"] == PACK_SCHEMA
    assert manifest["lenr_proved"] is False
    assert manifest["empirical_claim_tiers_raised"] is False
    assert manifest["kind"] == "scenario_table_not_posterior"
    assert manifest["preset"] == "detector_weak_screen"
    assert set(manifest["open_ids"]) == OPEN_IDS
    assert manifest["n_experiments"] == detector_weak_screen_count()
    assert manifest["n_theory_runs"] == manifest["n_experiments"]
    assert "speculative_exploratory" in (manifest.get("claim_tier_histogram") or {}) or (
        manifest.get("claim_tier_histogram")
    )

    experiments = [
        json.loads(line)
        for line in (root / "experiments.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert len(experiments) == manifest["n_experiments"]
    assert all((row.get("results") or {}).get("lenr_proved") is False for row in experiments)

    theory_runs = [
        json.loads(line)
        for line in (root / "theory_runs.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert len(theory_runs) == manifest["n_theory_runs"]
    assert all(run.get("is_empirical_confidence") is False for run in theory_runs)
    for run in theory_runs:
        for entry in (run.get("theory_scores") or {}).values():
            assert isinstance(entry, dict)
            assert "final_score" in entry
            assert "score" in entry
            # Dual honesty: score (confidence/weighted stand-in) coexists with final_score.
            assert entry.get("score_formula") == "five_factor_gm_x_claim_tier"

    payload = rank_avenues(pack_ids=["detector_weak_screen"], n_uq_samples=8, seed=11)
    assert_ranking_honesty(payload)
    assert payload["lenr_proved"] is False
    assert payload["kind"] == "scenario_table_not_posterior"
    assert set(payload["open_ids"]) == OPEN_IDS
    assert all(payload["open_status"][oid] == "OPEN" for oid in OPEN_IDS)
    assert payload["pack_sources"] == ["detector_weak_screen"]
    # Oracle priors exposed as scenario aids, not P(LENR).
    assert payload["priors"]["default_skeptical"] == dict(DEFAULT_PRIORS)
    assert payload["priors"]["occurrence_anchored"] == dict(ANCHORED_PRIORS)
    assert "LENR_PROVED" in payload["forbidden"]


def test_weight_surface_doc_inventory_exists() -> None:
    # .../LENR_SIM_APP_v2/backend/tests/test_integration → parents[3] = LENR_SIM_APP_v2
    doc = (
        Path(__file__).resolve().parents[3]
        / "docs"
        / "v0.3.9-beta"
        / "THEORY_WEIGHT_SURFACES.md"
    )
    text = doc.read_text(encoding="utf-8")
    assert "CLAIM_TIER_MULTIPLIER" in text
    assert "W_PHYSICAL" in text
    assert "Approximate" in text
    assert "Aspirational" in text
    assert "scenario_table_not_posterior" in text
    assert "not laboratory Bayesian" in text.lower() or "not a lab posterior" in text.lower()
    assert "final_score" in text
    assert "lenr_proved" in text
