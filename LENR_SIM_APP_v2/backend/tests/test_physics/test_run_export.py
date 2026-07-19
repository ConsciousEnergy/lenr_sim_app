"""Tests for the lenr-run-export-v1 reproducibility envelope (Phase 10)."""

from app.physics_engine.run_export import build_run_export, SCHEMA_VERSION


def _results() -> dict:
    return {
        "reaction_rate_engine": {
            "rate": {
                "mode": "trapped_state",
                "claim_tier": "speculative_exploratory",
                "references": ["takahashi2016", "floquetwkb2026"],
            },
            "uncertainty": {
                "interval_kind": "posterior_credible",
                "credible_interval": {"p05": 1.0, "p50": 2.0, "p95": 3.0},
                "n_samples": 256,
                "seed": 11,
                "references": ["takahashi2016", "raiola2002"],
            },
            "shell_pairing_branching": {
                "claim_tier": "speculative_exploratory",
                "references": ["nguyen2026"],
            },
        },
        "uncertainty_interval": {"low": 0.5, "high": 5.0},
    }


def test_envelope_has_schema_and_required_metadata() -> None:
    env = build_run_export(
        simulation_parameters={"temperature": 320.0, "rate_mode": "trapped_state"},
        results=_results(),
        environment="test",
        seed=11,
        model_version="v0.3.6-beta",
    )
    assert env["schema_version"] == SCHEMA_VERSION
    assert env["environment"] == "test"
    assert "exported_at" in env
    assert env["simulation_parameters"]["temperature"] == 320.0
    assert env["results"]


def test_envelope_aggregates_unique_citations() -> None:
    env = build_run_export(
        simulation_parameters={}, results=_results(), seed=1,
        extra_citations=["mulnix2026", "takahashi2016"],
    )
    cites = env["citations"]
    # Deduplicated across rate, uncertainty, branching, and extras.
    assert cites.count("takahashi2016") == 1
    assert "nguyen2026" in cites
    assert "mulnix2026" in cites
    assert "floquetwkb2026" in cites


def test_envelope_records_seed_and_claim_tiers() -> None:
    env = build_run_export(simulation_parameters={}, results=_results(), seed=11)
    assert env["reproducibility"]["seed"] == 11
    assert env["reproducibility"]["deterministic"] is True
    assert "speculative_exploratory" in env["claim_tiers_present"]
    assert env["uncertainty"]["interval_kind"] == "posterior_credible"


def test_deterministic_flag_false_when_no_seed() -> None:
    env = build_run_export(simulation_parameters={}, results={}, seed=None)
    assert env["reproducibility"]["deterministic"] is False
    assert env["citations"] == []
