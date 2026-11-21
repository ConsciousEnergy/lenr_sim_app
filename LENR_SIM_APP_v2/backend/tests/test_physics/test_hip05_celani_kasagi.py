"""HIP-05 / ENG-HS-06/07: Celani constantan host + Kasagi radiant pathway."""

from __future__ import annotations

from app.campaign.celani_constantan import (
    CELANI_LITERATURE_ID,
    celani_constantan_count,
    iter_celani_constantan_cases,
)
from app.campaign.grid import campaign_size, describe_preset, iter_campaign_cases
from app.physics_engine.theories.kasagi_radiant import KasagiRadiantTheory
from app.physics_engine.theories.miles_heat_helium import MilesHeatHeliumTheory
from app.physics_engine.theory_pipeline import (
    THEORY_COMPOSITION_GROUPS,
    get_default_pipeline,
)
from app.physics_engine.unified_lenr_model import (
    MaterialProperties,
    SimulationConfig,
    UnifiedLENRModel,
)


def test_celani_constantan_preset_schedules_constantan_host() -> None:
    cases = list(iter_campaign_cases("celani_constantan"))
    assert len(cases) == celani_constantan_count() == campaign_size("celani_constantan")
    assert any(c["host_material"] == "constantan" for c in cases)
    celani = next(c for c in cases if c.get("literature_id") == CELANI_LITERATURE_ID)
    assert celani["claim_tag"] == "contested"
    assert celani["discovery_refuse"] == "REFUSE_FABRICATED_SIGMA_Q"
    assert celani["moe_provenance"] == "literature_reported_instrument_precision"
    assert celani["stimulation"]["heating_mode"] == "resistive"
    described = describe_preset("celani_constantan")
    assert "refuse discovery" in described["note"].lower() or "REFUSE" in described["note"]


def test_celani_cases_refuse_discovery_sigma() -> None:
    for case in iter_celani_constantan_cases():
        assert case.get("discovery_refuse") in (
            None,
            "REFUSE_FABRICATED_SIGMA_Q",
        ) or case.get("claim_tag") == "null"
        if case.get("literature_id") == CELANI_LITERATURE_ID:
            assert case["discovery_refuse"] == "REFUSE_FABRICATED_SIGMA_Q"
            assert case["moe_provenance"] != "literature_reported"


def test_kasagi_radiant_inactive_without_radiant_flag() -> None:
    theory = KasagiRadiantTheory()
    contrib = theory.calculate(
        {"temperature": 1100.0, "loading_ratio": 0.4, "host_material": "nickel"}
    )
    assert contrib.is_applicable is False
    assert contrib.energy_output_watts == 0.0


def test_kasagi_radiant_couples_multilayer_and_pressure() -> None:
    theory = KasagiRadiantTheory()
    nicu = theory.calculate(
        {
            "temperature": 1100.0,
            "loading_ratio": 0.40,
            "host_material": "nickel",
            "radiant_calorimetry": 1.0,
            "h2_absorb_pressure_pa": 250.0,
            "multilayer_stack": "6x(Cu 3.8 nm / Ni 20 nm)",
        }
    )
    ni = theory.calculate(
        {
            "temperature": 1100.0,
            "loading_ratio": 0.35,
            "host_material": "nickel",
            "radiant_calorimetry": 1.0,
            "h2_absorb_pressure_pa": 250.0,
        }
    )
    assert nicu.is_applicable is True
    assert ni.is_applicable is True
    assert nicu.energy_output_watts > 0.5
    assert ni.energy_output_watts > 0.4
    assert nicu.energy_output_watts > ni.energy_output_watts
    assert nicu.observables["has_multilayer"] is True
    assert nicu.observables["bilayer_count"] == 6
    assert nicu.observables["not_discovery_moe"] is True
    assert nicu.claim_tier == "speculative_exploratory"
    assert nicu.provenance.get("honesty_class") == "model_output"
    assert nicu.provenance.get("lenr_proved") is False
    assert nicu.provenance.get("discovery_moe") is False


def test_miles_gated_off_under_radiant() -> None:
    miles = MilesHeatHeliumTheory()
    assert miles.is_applicable({"radiant_calorimetry": 1.0}) is False
    contrib = miles.calculate({"temperature": 1100.0, "radiant_calorimetry": 1.0})
    assert contrib.is_applicable is False
    assert contrib.energy_output_watts == 0.0
    # Electrolytic default still applies.
    assert miles.is_applicable({"temperature": 300.0, "loading_ratio": 0.95}) is True


def test_pipeline_registers_kasagi_radiant_group() -> None:
    import app.physics_engine.theory_pipeline as tp

    tp._default_pipeline = None
    ids = get_default_pipeline().registered_ids
    assert "kasagi_radiant" in ids
    assert THEORY_COMPOSITION_GROUPS["kasagi_radiant"] == "radiant_calorimetry"


def test_unified_kasagi_radiant_model_output_uses_brems_path() -> None:
    config = SimulationConfig(
        host_material=MaterialProperties.nickel(),
        temperature=1100.0,
        loading_ratio=0.40,
        use_theory_pipeline=True,
        radiant_calorimetry=True,
        h2_absorb_pressure_pa=250.0,
        multilayer_stack="6x(Cu 3.8 nm / Ni 20 nm)",
        heating_mode="radiant",
        time_steps=10,
        total_time=1.0,
    )
    # Hydrogen reactant for Kasagi Ni–H.
    from app.physics_engine.unified_lenr_model import ReactantProperties

    config.reactant = ReactantProperties.hydrogen()
    model = UnifiedLENRModel(config)
    result = model.run_simulation()
    assert result.excess_heat_watts > 0.0
    assert result.excess_heat_watts < 5.0
    bridge = result.observables_bridge
    assert bridge["excess_heat"]["honesty_class"] == "model_output"
    assert bridge["excess_heat"]["is_model_output"] is True
    assert bridge["coupled_heat_he"]["heating_mode"] == "radiant"
    pipeline = model.last_pipeline_result
    assert pipeline is not None
    kasagi = next(
        c for c in pipeline.contributions if c.theory_id == "kasagi_radiant"
    )
    assert kasagi.is_applicable is True
    assert kasagi.energy_output_watts > 0.5
    miles = next(
        c for c in pipeline.contributions if c.theory_id == "miles_heat_helium"
    )
    assert miles.is_applicable is False


def test_unified_celani_constantan_runs_model_output() -> None:
    config = SimulationConfig(
        host_material=MaterialProperties.from_name("constantan"),
        temperature=900.0,
        loading_ratio=0.50,
        use_theory_pipeline=True,
        heating_mode="resistive",
        p_resistive_watts=90.0,
        time_steps=10,
        total_time=1.0,
    )
    from app.physics_engine.unified_lenr_model import ReactantProperties

    config.reactant = ReactantProperties.deuterium()
    result = UnifiedLENRModel(config).run_simulation()
    assert result.config.host_material.name == "Constantan"
    assert result.observables_bridge["excess_heat"]["honesty_class"] == "model_output"
    assert result.observables_bridge["excess_heat"]["lenr_proved"] is False
