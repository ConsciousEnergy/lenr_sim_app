"""Tests for the shell-structure nucleon-pairing branching prior (Phase 7)."""

import pytest

from app.physics_engine.shell_pairing_prior import (
    pairing_preference,
    annotate_branching,
    CLAIM_TIER,
)
from app.physics_engine.parkhomov_validation import validate_transmutation


def test_he4_doubly_magic_is_favoured_over_odd_odd() -> None:
    """He-4 (doubly magic, even-even) must outweigh an odd-odd product."""
    he4 = pairing_preference([("He", 4)])
    # Li-6 is odd-odd (Z=3, N=3).
    li6 = pairing_preference([("Li", 6)])
    assert he4.is_even_even is True
    assert he4.magic_closures >= 2
    assert he4.weight > li6.weight


def test_even_even_beats_odd_mass() -> None:
    c12 = pairing_preference([("C", 12)])   # even-even
    c13 = pairing_preference([("C", 13)])   # odd-mass (N=7)
    assert c12.weight > c13.weight


def test_annotate_branching_normalises_to_one() -> None:
    rows = [
        {"products": [{"symbol": "He", "A": 4}], "energy_mev": 23.8},
        {"products": [{"symbol": "He", "A": 3}, {"symbol": "n", "A": 1}], "energy_mev": 3.27},
    ]
    out = annotate_branching(rows)
    priors = [r["shell_pairing_prior"] for r in out["matching_reactions"]]
    assert sum(priors) == pytest.approx(1.0, abs=1e-6)
    # He-4 channel should carry the larger structural prior.
    assert out["matching_reactions"][0]["shell_pairing_prior"] > priors[1]
    assert out["claim_tier"] == CLAIM_TIER


def test_prior_does_not_modify_energy_or_rate_fields() -> None:
    """Guardrail: annotation must not touch Q-values / rate-bearing fields."""
    rows = [{"products": [{"symbol": "He", "A": 4}], "energy_mev": 23.847}]
    out = annotate_branching(rows)
    annotated = out["matching_reactions"][0]
    assert annotated["energy_mev"] == 23.847
    assert "shell_pairing_prior" in annotated


def test_integration_with_parkhomov_validation() -> None:
    res = validate_transmutation([("H", 1), ("Li", 7)], [("He", 4), ("He", 4)])
    out = annotate_branching(res["matching_reactions"])
    assert out["matching_reactions"]
    for row in out["matching_reactions"]:
        assert 0.0 <= row["shell_pairing_prior"] <= 1.0
