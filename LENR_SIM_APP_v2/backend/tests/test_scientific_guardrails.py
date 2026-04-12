"""
Unit tests for scientific guardrail helper utilities.
"""

from app.physics_engine.scientific_guardrails import (
    build_electrolyte_diagnostics,
    check_species_family_consistency,
    classify_molarity_window,
    compute_alkali_activity_factor,
    compute_electrolyte_activity_multiplier,
    get_electrolyte_evidence_weight,
    normalize_electrolyte_species,
)


def test_electrolyte_evidence_weight_defaults_to_other() -> None:
    assert get_electrolyte_evidence_weight("unknown_family") == get_electrolyte_evidence_weight("other")


def test_classify_molarity_window_ranges() -> None:
    validated, soft, outside = classify_molarity_window(0.3)
    assert validated is True
    assert soft is False
    assert outside is False

    validated, soft, outside = classify_molarity_window(1.5)
    assert validated is False
    assert soft is True
    assert outside is False

    validated, soft, outside = classify_molarity_window(2.5)
    assert validated is False
    assert soft is False
    assert outside is True


def test_compute_alkali_activity_factor_is_bounded() -> None:
    low = compute_alkali_activity_factor(0.0)
    high = compute_alkali_activity_factor(2.0)
    assert 1.0 <= low <= 1.2
    assert 1.0 <= high <= 1.2
    assert high >= low


def test_compute_electrolyte_activity_multiplier_is_bounded() -> None:
    li_mid = compute_electrolyte_activity_multiplier("li", 0.3, "lioh")
    cs_mid = compute_electrolyte_activity_multiplier("cs", 0.3, "other")
    assert 0.7 <= li_mid <= 1.2
    assert 0.7 <= cs_mid <= 1.2
    assert li_mid >= cs_mid


def test_normalize_species_defaults_from_family() -> None:
    assert normalize_electrolyte_species("li", None) == "lioh"
    assert normalize_electrolyte_species("na", "") == "naoh"


def test_species_family_consistency_checks() -> None:
    assert check_species_family_consistency("k", "k2co3") is True
    assert check_species_family_consistency("li", "k2co3") is False


def test_electrolyte_diagnostics_marks_inconsistent_pairing() -> None:
    diagnostics = build_electrolyte_diagnostics(
        electrolyte_family="li",
        electrolyte_species="k2co3",
        electrolyte_molarity_mol_l=0.3,
    )
    assert diagnostics["species_family_consistent"] is False
    assert diagnostics["support_level"] == "inconsistent_pairing"
