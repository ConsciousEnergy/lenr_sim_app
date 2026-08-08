"""
Timeline vs peak thermo consistency
====================================

Guards the bugs that made Advanced Analysis / Unified Theory charts look
"mathematically off":

1. HTTP/WS reconstructed pressure as ``ambient_temperature_k * 101325 * CR**4.2``
   (~300x too high at 298 K) instead of ambient pressure.
2. ``get_collapse_phases`` used a different gamma, R floor, and no T/P ceilings
   than ``simulate_collapse``, so timeline samples disagreed with peak conditions.
3. API lattice construction dropped ``bulk_modulus``, forcing every host onto Pd.
"""

import math

import numpy as np
import pytest

from app.physics.bubble_collapse import REGIME_MAX_TEMPERATURE
from app.physics_engine.bubble_lattice_interaction import (
    BubbleLatticeInteraction,
    BubbleParameters,
    LatticeParameters,
)
from app.physics_engine.enhancement_saturation import MECHANISM_KEYS


P_CEILING_PA = 1.0e10


@pytest.fixture
def model() -> BubbleLatticeInteraction:
    bubble = BubbleParameters(
        initial_radius=5e-6,
        driving_pressure=1.5e5,
        frequency=20e3,
        ambient_temperature=298.0,
        ambient_pressure=101325.0,
    )
    lattice = LatticeParameters.for_material("palladium")
    lattice.loading_ratio = 0.95
    return BubbleLatticeInteraction(bubble, lattice)


class TestTimelineThermoMatchesPeak:
    def test_conditions_include_pressure(self, model):
        model.simulate_collapse(num_cycles=1)
        _, conditions = model.get_collapse_phases(0.55)
        assert "pressure" in conditions
        assert conditions["pressure"] > 0

    def test_temperature_uses_bubble_gamma_and_ceiling(self, model):
        model.simulate_collapse(num_cycles=1)
        _, conditions = model.get_collapse_phases(0.55)
        gamma = model.bubble.polytropic_index
        cr = conditions["compression"]
        t_raw = model.bubble.ambient_temperature * cr ** (3 * (gamma - 1))
        t_ceiling = REGIME_MAX_TEMPERATURE["single_bubble"]
        expected = min(t_raw, t_ceiling)
        assert conditions["temperature"] == pytest.approx(expected, rel=1e-9)

    def test_pressure_uses_ambient_pressure_not_temperature(self, model):
        """Regression: temperature-as-pressure overstated Casimir ~300x."""
        model.simulate_collapse(num_cycles=1)
        _, conditions = model.get_collapse_phases(0.55)
        gamma = model.bubble.polytropic_index
        cr = conditions["compression"]
        p_raw = model.bubble.ambient_pressure * cr ** (3 * gamma)
        expected = min(p_raw, P_CEILING_PA)
        assert conditions["pressure"] == pytest.approx(expected, rel=1e-9)

        # The old buggy formula must NOT equal the reported pressure at room T.
        buggy = (
            model.bubble.ambient_temperature
            * 101325.0
            * cr ** 4.2
        )
        assert not math.isclose(conditions["pressure"], buggy, rel_tol=0.05)

    def test_deep_collapse_uses_hard_core_floor_not_point_one(self, model):
        """Old path used max(0.1, radius_factor) so CR could never exceed 10."""
        R0 = model.bubble.initial_radius
        model._trajectory = {
            "t": np.array([0.0, 0.5, 1.0]),
            "R": np.array([R0, R0 * 0.001, R0]),
        }
        _, conditions = model.get_collapse_phases(0.5)
        assert conditions["compression"] == pytest.approx(
            float(model.MAX_COMPRESSION_RATIO)
        )
        assert conditions["compression"] > 10.0

    def test_instantaneous_enhancement_uses_conditions_pressure(self, model):
        model.simulate_collapse(num_cycles=1)
        instant = model.calculate_instantaneous_enhancement(0.55)
        assert instant["conditions"]["pressure"] == pytest.approx(
            model.get_collapse_phases(0.55)[1]["pressure"], rel=1e-12
        )


class TestBulkModulusMaterialPath:
    def test_lithium_bulk_modulus_softens_casimir(self):
        bubble = BubbleParameters(ambient_temperature=298.0)
        pd = BubbleLatticeInteraction(bubble, LatticeParameters.for_material("palladium"))
        li = BubbleLatticeInteraction(bubble, LatticeParameters.for_material("lithium"))
        assert li.lattice.bulk_modulus < pd.lattice.bulk_modulus

        pressure = 1.0e9  # 1 GPa, well below ceiling
        casimir_pd = pd._calculate_casimir_enhancement(pressure)
        casimir_li = li._calculate_casimir_enhancement(pressure)
        # Softer lattice → larger strain → larger Casimir enhancement.
        assert casimir_li > casimir_pd

    def test_api_style_lattice_copy_keeps_bulk_modulus(self):
        """Mirrors the HTTP reconstruct path; bulk_modulus must not drop."""
        base = LatticeParameters.for_material("lithium")
        copied = LatticeParameters(
            host_material="lithium",
            loading_ratio=0.9,
            defect_density=1e16,
            surface_roughness=5e-9,
            lattice_constant=base.lattice_constant,
            electron_density=base.electron_density,
            debye_temperature=base.debye_temperature,
            work_function=base.work_function,
            fermi_energy=base.fermi_energy,
            screening_potential=base.screening_potential,
            bulk_modulus=base.bulk_modulus,
        )
        assert copied.bulk_modulus == pytest.approx(1.10e10)


class TestElectrolyteInMechanismProduct:
    def test_electrolyte_is_a_mechanism_key(self):
        assert "electrolyte" in MECHANISM_KEYS

    def test_electrolyte_scales_reported_total(self):
        from app.physics_engine.enhancement_saturation import build_saturation_report

        raw = {
            "total": 10.0,
            "screening": 2.0,
            "phonon": 5.0,
            "qed": 1.0,
            "casimir": 1.0,
            "rydberg": 1.0,
            "compression": 1.0,
            "loading": 1.0,
            "electrolyte": 3.0,
        }
        capped, report = build_saturation_report(raw)
        # Product = 2*5*3 = 30
        assert capped["total"] == pytest.approx(30.0)
        assert report["mechanisms"]["electrolyte"]["value"] == pytest.approx(3.0)
