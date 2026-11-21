"""HIP-01 / ENG-HS-01…03: coupled heat/He bridge + Letts mode-gate.

Locks:
- Unified pipeline path exposes non-zero model_output heat/He
- Theory-pipeline energy bridges into unified observables
- letts_laser gated off non-photonic regimes (joule / radiant / resistive)
- Honesty stamps stay model_output; never discovery / lenr_proved
"""

from __future__ import annotations

import pytest

from app.physics_engine.constants import MILES_HEAT_HELIUM_RATE
from app.physics_engine.coupled_heat_he import (
    CLAIM_TIER_MODEL_OUTPUT,
    HONESTY_CLASS_MODEL_OUTPUT,
    couple_pipeline_heat_he,
)
from app.physics_engine.heating_mode import is_photonic_stimulation, resolve_heating_mode
from app.physics_engine.theories.letts_laser import LettsLaserTheory
from app.physics_engine.theory_pipeline import get_default_pipeline
from app.physics_engine.unified_lenr_model import (
    MaterialProperties,
    ReactantProperties,
    SimulationConfig,
    UnifiedLENRModel,
)


def _kasagi_like_conditions(**overrides):
    bag = {
        "temperature": 1100.0,
        "loading_ratio": 0.4,
        "pressure": 101325.0,
        "electric_field": 1e6,
        "defect_density": 1e16,
        "grain_size": 1e-6,
        "surface_roughness": 1e-8,
        "host_material": "nickel",
        "radiant_calorimetry": 1.0,
    }
    bag.update(overrides)
    return bag


def _miles_like_conditions(**overrides):
    bag = {
        "temperature": 300.0,
        "loading_ratio": 0.95,
        "pressure": 101325.0,
        "electric_field": 1e6,
        "defect_density": 1e16,
        "grain_size": 50e-9,
        "surface_roughness": 5e-9,
        "host_material": "palladium",
        "electrolyte_family": "li",
        "electrolyte_species": "lioh",
        "electrolyte_molarity_mol_l": 0.3,
    }
    bag.update(overrides)
    return bag


# ---------------------------------------------------------------------------
# Heating-mode resolution
# ---------------------------------------------------------------------------


def test_heating_mode_defaults_to_joule() -> None:
    assert resolve_heating_mode({}) == "joule"
    assert resolve_heating_mode({"temperature": 300.0}) == "joule"


def test_radiant_calorimetry_is_not_photonic() -> None:
    mode = resolve_heating_mode({"radiant_calorimetry": 1.0})
    assert mode == "radiant"
    assert is_photonic_stimulation({"radiant_calorimetry": 1.0}) is False


def test_letts_flag_and_p_photonic_arm_photonic() -> None:
    assert resolve_heating_mode({"letts_laser": 1}) == "photonic"
    assert resolve_heating_mode({"P_photonic": 0.03}) == "photonic"
    assert resolve_heating_mode({"heating_mode": "laser"}) == "photonic"


def test_resistive_and_joule_aliases() -> None:
    assert resolve_heating_mode({"P_resistive": 10.0}) == "resistive"
    assert resolve_heating_mode({"heating_mode": "electrolytic"}) == "joule"


# ---------------------------------------------------------------------------
# Letts mode-gate (ENG-HS-03)
# ---------------------------------------------------------------------------


def test_letts_gated_off_on_kasagi_radiant() -> None:
    theory = LettsLaserTheory()
    contrib = theory.calculate(_kasagi_like_conditions())
    assert contrib.is_applicable is False
    assert contrib.energy_output_watts == 0.0


def test_letts_gated_off_on_miles_electrolytic() -> None:
    theory = LettsLaserTheory()
    contrib = theory.calculate(_miles_like_conditions())
    assert contrib.is_applicable is False
    assert contrib.energy_output_watts == 0.0


def test_letts_armed_under_photonic_mode() -> None:
    theory = LettsLaserTheory()
    contrib = theory.calculate(
        _miles_like_conditions(letts_laser=1.0, heating_mode="photonic")
    )
    assert contrib.is_applicable is True
    assert contrib.energy_output_watts > 0.0


def test_pipeline_total_energy_drops_without_letts_on_radiant() -> None:
    pipeline = get_default_pipeline()
    gated = pipeline.run(_kasagi_like_conditions())
    armed = pipeline.run(_kasagi_like_conditions(letts_laser=1.0))

    letts_gated = next(c for c in gated.contributions if c.theory_id == "letts_laser")
    letts_armed = next(c for c in armed.contributions if c.theory_id == "letts_laser")
    assert letts_gated.is_applicable is False
    assert letts_armed.is_applicable is True
    assert gated.total_energy_watts < armed.total_energy_watts
    # Off-protocol Letts must not dominate radiant Kasagi-class cells.
    assert gated.total_energy_watts < 5.0
    assert armed.total_energy_watts > 10.0


# ---------------------------------------------------------------------------
# Coupled heat/He helper (ENG-HS-01/02)
# ---------------------------------------------------------------------------


def test_couple_pipeline_heat_he_uses_miles_rate() -> None:
    coupled = couple_pipeline_heat_he(
        pipeline_total_energy_watts=1.0,
        volumetric_excess_heat_watts=0.0,
        volumetric_helium4_rate=0.0,
        volumetric_neutron_rate=0.0,
        heating_mode="joule",
        letts_applicable=False,
    )
    assert coupled["excess_heat_watts"] == pytest.approx(1.0)
    assert coupled["helium4_rate"] == pytest.approx(MILES_HEAT_HELIUM_RATE)
    bridge = coupled["bridge"]
    assert bridge["bridged"] is True
    assert bridge["honesty_class"] == HONESTY_CLASS_MODEL_OUTPUT
    assert bridge["claim_tier"] == CLAIM_TIER_MODEL_OUTPUT
    assert bridge["is_model_output"] is True
    assert bridge["not_discovery_claim"] is True
    assert bridge["lenr_proved"] is False
    assert bridge["letts_gated_off_non_laser"] is True


def test_couple_falls_back_to_volumetric_without_pipeline() -> None:
    coupled = couple_pipeline_heat_he(
        pipeline_total_energy_watts=None,
        volumetric_excess_heat_watts=0.0,
        volumetric_helium4_rate=0.0,
        volumetric_neutron_rate=0.0,
        heating_mode="joule",
    )
    assert coupled["bridge"]["bridged"] is False
    assert coupled["bridge"]["source"] == "volumetric_reaction_rate"


# ---------------------------------------------------------------------------
# Unified model bridge
# ---------------------------------------------------------------------------


def _pipeline_model(*, host: str, reactant: str, **cfg_kw) -> UnifiedLENRModel:
    config = SimulationConfig()
    config.host_material = MaterialProperties.from_name(host)
    if reactant.lower().startswith("deut"):
        config.reactant = ReactantProperties.deuterium()
    else:
        config.reactant = ReactantProperties.hydrogen()
    config.use_theory_pipeline = True
    config.time_steps = 20
    config.total_time = 1.0
    for key, value in cfg_kw.items():
        setattr(config, key, value)
    return UnifiedLENRModel(config)


def test_unified_pipeline_bridges_nonzero_heat_he_miles_cell() -> None:
    model = _pipeline_model(
        host="palladium",
        reactant="deuterium",
        temperature=300.0,
        loading_ratio=0.95,
        electrolyte_family="li",
        electrolyte_species="lioh",
        electrolyte_molarity_mol_l=0.3,
    )
    result = model.run_simulation()
    assert result.excess_heat_watts > 0.0
    assert result.helium4_rate > 0.0
    bridge = result.observables_bridge
    assert bridge["excess_heat"]["honesty_class"] == "model_output"
    assert bridge["excess_heat"]["is_model_output"] is True
    assert bridge["excess_heat"]["not_discovery_claim"] is True
    assert bridge["excess_heat"]["lenr_proved"] is False
    coupled = bridge["coupled_heat_he"]
    assert coupled["bridged"] is True
    assert coupled["source"] == "theory_pipeline.total_energy_watts"
    assert coupled["heating_mode"] == "joule"
    assert coupled["letts_gated_off_non_laser"] is True
    # Miles correlation lock on bridged path
    assert result.helium4_rate == pytest.approx(
        result.excess_heat_watts * MILES_HEAT_HELIUM_RATE, rel=1e-9
    )


def test_unified_kasagi_radiant_bridges_without_letts_dominance() -> None:
    model = _pipeline_model(
        host="nickel",
        reactant="hydrogen",
        temperature=1100.0,
        loading_ratio=0.4,
        radiant_calorimetry=True,
    )
    result = model.run_simulation()
    assert result.excess_heat_watts > 0.0
    assert result.observables_bridge["coupled_heat_he"]["heating_mode"] == "radiant"
    assert result.observables_bridge["coupled_heat_he"]["letts_gated_off_non_laser"] is True
    # Must stay well below historical Letts-dominated ~13 W artifact.
    assert result.excess_heat_watts < 5.0


def test_unified_photonic_arm_allows_letts_contribution() -> None:
    gated = _pipeline_model(
        host="palladium",
        reactant="deuterium",
        temperature=300.0,
        loading_ratio=0.9,
        letts_laser=False,
    ).run_simulation()
    armed = _pipeline_model(
        host="palladium",
        reactant="deuterium",
        temperature=300.0,
        loading_ratio=0.9,
        letts_laser=True,
        heating_mode="photonic",
    ).run_simulation()
    assert armed.excess_heat_watts > gated.excess_heat_watts
    assert armed.observables_bridge["coupled_heat_he"]["heating_mode"] == "photonic"
    assert armed.observables_bridge["coupled_heat_he"]["letts_gated_off_non_laser"] is False


def test_legacy_path_stays_volumetric_and_stamped() -> None:
    config = SimulationConfig()
    config.use_theory_pipeline = False
    config.time_steps = 20
    config.total_time = 1.0
    result = UnifiedLENRModel(config).run_simulation()
    bridge = result.observables_bridge["coupled_heat_he"]
    assert bridge["bridged"] is False
    assert bridge["honesty_class"] == "model_output"
    assert bridge["is_model_output"] is True
