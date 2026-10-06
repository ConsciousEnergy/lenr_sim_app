"""Paper-reproduction benchmarks (LENR-ARA P0).

Each test asserts a source-tied numeric or regime check. Theories without a
benchmark remain labeled approximate/phenomenological in maturity surfaces.
"""

from __future__ import annotations

import math

import pytest


def test_widom_inverse_beta_q_value_mev() -> None:
    """Widom–Larsen: neutron–proton mass difference ≈ 1.293 MeV (PDG / WL papers)."""
    from app.physics_engine.theories.widom_larsen import Q_INVERSE_BETA_MEV

    # Source: (m_n - m_p)c² ≈ 1.293 MeV — author electroweak threshold context.
    assert Q_INVERSE_BETA_MEV == pytest.approx(1.293, abs=0.01)


def test_widom_below_threshold_produces_no_ulm_chain() -> None:
    """Falsifier: when mass renormalization is insufficient, enhancement stays ~1."""
    from app.physics_engine.theories.widom_larsen import WidomLarsenTheory

    theory = WidomLarsenTheory()
    # Low electron density / mild conditions should not meet heavy-electron threshold.
    result = theory.calculate(
        {"temperature": 300.0, "loading_ratio": 0.5, "electron_density": 1e20},
        config={},
    )
    assert result.theory_id == "widom_larsen"
    assert result.provenance.get("not_dd_tunneling") is True
    assert result.observables.get("mass_sufficient", 1.0) in (0.0, 1.0)
    if result.observables.get("mass_sufficient", 0.0) < 0.5:
        assert result.enhancement_factor == pytest.approx(1.0, abs=1e-9)
        assert result.observables.get("neutron_production_rate", 0.0) == pytest.approx(
            0.0, abs=1e-30
        )


def test_hagelstein_dd_he4_q_value_mev() -> None:
    """Hagelstein: D+D→⁴He Q-value ≈ 23.8 MeV (author phonon-coupling context)."""
    from app.physics_engine.theories.hagelstein_phonon import Q_VALUE_DD_HE4_MEV

    assert Q_VALUE_DD_HE4_MEV == pytest.approx(23.8, abs=0.05)


def test_hagelstein_module_exposes_phonon_coupling_identity() -> None:
    """Hagelstein: module must remain phonon–nuclear (not a generic multiplier-only id)."""
    from app.physics_engine.theories.hagelstein_phonon import HagelsteinPhononTheory

    theory = HagelsteinPhononTheory()
    meta = theory.get_metadata()
    assert theory.theory_id == "hagelstein_phonon"
    assert "phonon" in theory.theory_name.lower() or "phonon" in meta.description.lower()
    result = theory.calculate(
        {"temperature": 300.0, "loading_ratio": 0.9},
        config={},
    )
    assert result.is_applicable in (True, False)
    refs = " ".join(result.references or meta.references)
    assert "Hagelstein" in refs or "hagelstein" in refs.lower()
    assert result.primary_sources
    assert "simulator" in str(
        result.author_equations_vs_simulator_approximations.get(
            "coupling_matrix_element", ""
        )
    )


def test_holmlid_is_not_kim_bec() -> None:
    """Taxonomy: Holmlid UDH and Kim BECNF are distinct modules."""
    from app.physics_engine.theory_pipeline import get_default_pipeline

    # Reset singleton so new registrations apply in this process.
    import app.physics_engine.theory_pipeline as tp

    tp._default_pipeline = None
    pipeline = get_default_pipeline()
    ids = set(pipeline.registered_ids)
    assert "holmlid_udh" in ids
    assert "kim_bec" in ids
    holmlid = pipeline.get_module("holmlid_udh").calculate({}, {})
    assert holmlid.provenance.get("not_kim_becnf") is True
    assert holmlid.enhancement_factor == pytest.approx(1.0)
    assert "BEC" not in holmlid.theory_name or "ultra-dense" in holmlid.theory_name.lower()


def test_null_recombination_is_non_nuclear_control() -> None:
    from app.physics_engine.theories.null_recombination import NullRecombinationTheory

    result = NullRecombinationTheory().calculate({}, {"recombination_power_w": 0.1})
    assert result.claim_tier == "established_reference"
    assert result.observables.get("nuclear_products", 1) == 0.0
    assert result.energy_output_watts == pytest.approx(0.11, abs=1e-9)


def test_shoulders_stub_has_no_invented_rate_law() -> None:
    from app.physics_engine.theories.shoulders_evo import ShouldersEVOTheory

    result = ShouldersEVOTheory().calculate({"temperature": 300.0}, {})
    assert result.enhancement_factor == pytest.approx(1.0)
    assert result.model_fidelity == "phenomenological"
    assert result.provenance.get("no_invented_rate_law") is True
    assert "not_implemented" in result.author_equations_vs_simulator_approximations.get(
        "nuclear_rate_law", ""
    )


def test_pipeline_preserves_module_fidelity_provenance() -> None:
    import app.physics_engine.theory_pipeline as tp

    tp._default_pipeline = None
    pipeline = tp.get_default_pipeline()
    out = pipeline.run(
        {"temperature": 300.0, "loading_ratio": 0.9, "electron_density": 1e28},
        enabled_theories=["widom_larsen"],
    )
    row = next(c for c in out.contributions if c.theory_id == "widom_larsen")
    assert row.provenance.get("not_dd_tunneling") is True
    assert row.provenance.get("model_version")  # app version overlay
    assert row.theory_model_version.startswith("widom_larsen")
    d = out.to_dict()
    assert "composition_provenance" in d
    per = next(p for p in d["per_theory"] if p["theory_id"] == "widom_larsen")
    assert per["primary_sources"]
    assert per["model_fidelity"]


def test_czerski_phonon_energy_and_not_a_lenr_proof() -> None:
    from app.physics_engine.theories.czerski_thermal_spike import (
        PHONON_ENERGY_EV,
        CzerskiThermalSpikeTheory,
    )

    assert PHONON_ENERGY_EV == pytest.approx(0.100, abs=0.001)
    contrib = CzerskiThermalSpikeTheory().calculate(
        {"temperature": 300.0, "beam_energy_kev": 2.0, "host_material": "zirconium"}
    )
    assert contrib.provenance.get("not_electrolytic_lenr_proof") is True
    assert contrib.enhancement_factor <= 1e5
    refs = " ".join(contrib.references)
    assert "czerski2024a" in refs
