"""
Physical bounds and provenance for the bubble-lattice enhancement mechanisms.

Four mechanisms were wrong or unbounded at peak collapse conditions:

* **QED** used a 1e8 V/m stand-in for the critical field instead of the Schwinger
  limit 1.323e18 V/m, turning a ~1e-13 correction into a ~1e12 factor and making
  the most negligible effect the largest term in the product.
* **Rydberg** grew linearly as ``1 + 0.5*cr*(E/1e8)``, reaching ~5e8, while the
  unified model bounded the same physics at 10.
* **Screening** derived its potential from a Debye length and capped the exponent
  at a magic 9.2, so ``LatticeParameters.screening_potential`` was never read and
  every host material screened identically.
* **Casimir** had a continuum-validity floor constant that was never enforced or
  reported, while the strained spacing at collapse is a few angstroms.
"""

import math

import pytest
from scipy import constants as const

from app.physics_engine.bubble_lattice_interaction import (
    QED_VACUUM_COEFFICIENT,
    RYDBERG_GROUND_STATE_EV,
    SCHWINGER_CRITICAL_FIELD_V_M,
    BubbleLatticeInteraction,
    BubbleParameters,
    LatticeParameters,
)
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.screening_kernel import (
    SCREENING_MODEL_ID,
    compute_screening_enhancement,
    sommerfeld_parameter,
    thermal_energy_ev,
)


def _model(material: str = "palladium") -> BubbleLatticeInteraction:
    bubble = BubbleParameters(
        initial_radius=10e-6,
        driving_pressure=1.5e5,
        frequency=20e3,
        ambient_temperature=298.0,
    )
    return BubbleLatticeInteraction(bubble, LatticeParameters.for_material(material))


# Representative peak-collapse conditions.
PEAK_TEMPERATURE_K = 1.16e6
PEAK_PRESSURE_PA = 1.0e10
PEAK_FIELD_V_M = 1.0e14
PEAK_COMPRESSION = 1000.0


class TestSchwingerCriticalField:
    def test_matches_the_standard_value(self):
        """E_cr = m_e^2 c^3 / (e hbar); CODATA-derived reference 1.323285e18 V/m."""
        assert SCHWINGER_CRITICAL_FIELD_V_M == pytest.approx(1.323285e18, rel=1e-5)

    def test_is_derived_not_hardcoded(self):
        expected = const.m_e**2 * const.c**3 / (const.e * const.hbar)
        assert SCHWINGER_CRITICAL_FIELD_V_M == pytest.approx(expected, rel=1e-12)

    def test_qed_coefficient_is_the_heisenberg_euler_value(self):
        assert QED_VACUUM_COEFFICIENT == pytest.approx(
            2.0 * const.alpha / (45.0 * math.pi), rel=1e-12
        )
        assert QED_VACUUM_COEFFICIENT == pytest.approx(1.0324e-4, rel=1e-3)


class TestQedIsNegligibleAtAttainableFields:
    def test_qed_is_essentially_unity_at_peak_field(self):
        model = _model()
        breakdown = model._calculate_enhancement_breakdown(
            PEAK_TEMPERATURE_K, PEAK_PRESSURE_PA, PEAK_FIELD_V_M, PEAK_COMPRESSION
        )
        # Old form gave ~1e12 here.
        assert breakdown["qed"] == pytest.approx(1.0, abs=1e-9)

    def test_qed_never_dominates_the_product(self):
        model = _model()
        breakdown = model._calculate_enhancement_breakdown(
            PEAK_TEMPERATURE_K, PEAK_PRESSURE_PA, PEAK_FIELD_V_M, PEAK_COMPRESSION
        )
        mechanisms = {k: v for k, v in breakdown.items() if k != "total"}
        largest = max(mechanisms, key=mechanisms.get)
        assert largest != "qed"

    def test_qed_only_grows_near_the_schwinger_limit(self):
        model = _model()
        at_critical = model._calculate_enhancement_breakdown(
            PEAK_TEMPERATURE_K,
            PEAK_PRESSURE_PA,
            SCHWINGER_CRITICAL_FIELD_V_M,
            PEAK_COMPRESSION,
        )
        # At E = E_cr the correction is the bare coefficient.
        assert at_critical["qed"] == pytest.approx(1.0 + QED_VACUUM_COEFFICIENT, rel=1e-6)

    def test_qed_is_monotonic_in_field(self):
        model = _model()
        values = [
            model._calculate_enhancement_breakdown(
                PEAK_TEMPERATURE_K, PEAK_PRESSURE_PA, field, PEAK_COMPRESSION
            )["qed"]
            for field in (1e10, 1e14, 1e17)
        ]
        assert values == sorted(values)


class TestRydbergIsBounded:
    def test_never_exceeds_the_documented_bound(self):
        model = _model()
        for temperature in (100.0, 300.0, 1e4, 1e6, 2e6):
            factor = model._calculate_rydberg_enhancement(temperature)
            assert 1.0 <= factor <= BubbleLatticeInteraction.RYDBERG_MAX_ENHANCEMENT

    def test_peak_conditions_no_longer_produce_1e8(self):
        model = _model()
        breakdown = model._calculate_enhancement_breakdown(
            PEAK_TEMPERATURE_K, PEAK_PRESSURE_PA, PEAK_FIELD_V_M, PEAK_COMPRESSION
        )
        assert breakdown["rydberg"] <= BubbleLatticeInteraction.RYDBERG_MAX_ENHANCEMENT

    def test_cold_lattice_admits_high_n_states(self):
        """Rydberg states need thermal energy below the level spacing."""
        model = _model()
        cold = model._calculate_rydberg_enhancement(100.0)
        hot = model._calculate_rydberg_enhancement(1e6)
        # At a million kelvin no bound Rydberg state survives, so no gain.
        assert cold > hot
        assert hot == pytest.approx(1.0, abs=1e-12)

    def test_matches_the_unified_model_functional_form(self):
        model = _model()
        temperature = 320.0
        thermal_ev = thermal_energy_ev(temperature)
        n = min(10, max(1, int(math.sqrt(RYDBERG_GROUND_STATE_EV / thermal_ev))))
        expected = max(1.0, min(1.0 + 0.1 * math.log(n**2), 10.0))
        assert model._calculate_rydberg_enhancement(temperature) == pytest.approx(expected)


class TestScreeningKernel:
    def test_uses_the_cited_material_potential(self):
        pd = compute_screening_enhancement(temperature_k=320.0, material="palladium")
        assert pd["screening_potential_ev"] == pytest.approx(800.0)
        assert pd["citations"], "screening potential must carry citations"
        assert pd["model"] == SCREENING_MODEL_ID

    def test_materials_are_distinguishable_below_saturation(self):
        """The Debye form ignored screening_potential, so every host matched."""
        # High enough temperature that the exponent stays under the cap.
        kwargs = {"temperature_k": 4.0e6}
        pd = compute_screening_enhancement(material="palladium", **kwargs)
        li = compute_screening_enhancement(material="lithium", **kwargs)
        assert pd["screening_potential_ev"] != li["screening_potential_ev"]
        assert pd["log10_enhancement_raw"] != li["log10_enhancement_raw"]

    def test_exponent_cap_is_tied_to_the_governance_ceiling(self):
        report = compute_screening_enhancement(temperature_k=300.0, material="palladium")
        assert report["exponent_cap"] == pytest.approx(math.log(MAX_ENHANCEMENT_FACTOR))
        # The old cap was a magic 9.2 (exp -> 1e4), unrelated to the 1e5 ceiling.
        assert report["exponent_cap"] != pytest.approx(9.2)

    def test_enhancement_never_exceeds_the_ceiling(self):
        for temperature in (10.0, 300.0, 1e4, 1e6):
            report = compute_screening_enhancement(
                temperature_k=temperature, material="palladium"
            )
            assert report["enhancement"] <= MAX_ENHANCEMENT_FACTOR

    def test_saturation_is_reported_with_the_uncapped_magnitude(self):
        report = compute_screening_enhancement(temperature_k=300.0, material="palladium")
        assert report["is_saturated"] is True
        # log space, because exp(exponent_raw) overflows float64.
        assert report["log10_enhancement_raw"] > math.log10(MAX_ENHANCEMENT_FACTOR)

    def test_metal_host_potentials_are_flagged_above_the_adiabatic_limit(self):
        report = compute_screening_enhancement(temperature_k=320.0, material="palladium")
        assert report["exceeds_adiabatic_limit"] is True
        assert report["adiabatic_limit_ev"] == pytest.approx(25.0)

    def test_gas_target_potential_is_not_flagged(self):
        report = compute_screening_enhancement(
            temperature_k=320.0, material="palladium", screening_potential_ev=20.0
        )
        assert report["exceeds_adiabatic_limit"] is False

    def test_sommerfeld_parameter_falls_with_energy(self):
        assert sommerfeld_parameter(1.0) > sommerfeld_parameter(100.0)

    def test_thermal_energy_matches_three_halves_kt(self):
        assert thermal_energy_ev(300.0) == pytest.approx(
            1.5 * const.k * 300.0 / const.e, rel=1e-12
        )

    def test_zero_temperature_does_not_divide_by_zero(self):
        report = compute_screening_enhancement(temperature_k=0.0, material="palladium")
        assert math.isfinite(report["enhancement"])


class TestCasimirDomainValidity:
    def test_collapse_pressure_is_outside_the_continuum_domain(self):
        """Strained spacing is angstrom-scale, far below the 2 nm floor."""
        model = _model()
        report = model.casimir_domain_validity(PEAK_PRESSURE_PA)
        assert report["domain_valid"] is False
        assert report["spacing_m"] < report["threshold_m"]
        assert "warning" in report

    def test_threshold_is_shared_with_the_casimir_module(self):
        from app.physics.casimir_forces import DOMAIN_VALIDITY_THRESHOLD_M

        assert BubbleLatticeInteraction.CASIMIR_CONTINUUM_FLOOR_M == (
            DOMAIN_VALIDITY_THRESHOLD_M
        )

    def test_unstrained_lattice_reports_its_spacing(self):
        model = _model()
        report = model.casimir_domain_validity(0.0)
        assert report["spacing_m"] == pytest.approx(model.lattice.lattice_constant)

    def test_softer_host_strains_further(self):
        pd = _model("palladium").casimir_domain_validity(1e9)
        li = _model("lithium").casimir_domain_validity(1e9)
        # Li's bulk modulus is ~16x smaller, so the same pressure compresses more.
        assert li["spacing_m"] < pd["spacing_m"]


class TestSingleEnhancementCeiling:
    def test_cross_sections_reexports_the_canonical_constant(self):
        from app.physics_engine.unified_lenr_model import cross_sections

        assert cross_sections.MAX_ENHANCEMENT_FACTOR is MAX_ENHANCEMENT_FACTOR


class TestOverlapProbability:
    def test_is_dimensionless_and_small(self):
        from app.physics_engine.proton_phase_model import ProtonPhaseModel

        probability = ProtonPhaseModel().calculate_overlap_probability(
            screening_energy=10.0, temperature=320.0, orbital_extension=10.0
        )
        # Old implementation returned a number density (~2e27) that always clipped
        # to the 0.1 guard, making the value constant.
        assert 0.0 < probability < 1e-10

    def test_scales_as_the_cube_of_the_orbital_ratio(self):
        from app.physics_engine.proton_phase_model import ProtonPhaseModel

        model = ProtonPhaseModel()
        small = model.calculate_overlap_probability(
            screening_energy=0.0, temperature=320.0, orbital_extension=10.0
        )
        large = model.calculate_overlap_probability(
            screening_energy=0.0, temperature=320.0, orbital_extension=20.0
        )
        # Doubling the orbital radius reduces overlap by 2^3.
        assert small / large == pytest.approx(8.0, rel=1e-6)

    def test_responds_to_orbital_extension_at_all(self):
        from app.physics_engine.proton_phase_model import ProtonPhaseModel

        model = ProtonPhaseModel()
        values = {
            model.calculate_overlap_probability(
                screening_energy=0.0, temperature=320.0, orbital_extension=n
            )
            for n in (5.0, 10.0, 20.0)
        }
        assert len(values) == 3, "overlap must not be constant across orbitals"

    def test_stays_a_probability(self):
        from app.physics_engine.proton_phase_model import ProtonPhaseModel

        probability = ProtonPhaseModel().calculate_overlap_probability(
            screening_energy=1e4, temperature=1.0, orbital_extension=1.0
        )
        assert 0.0 <= probability <= 1.0


class TestBreakdownStaysDefensible:
    def test_raw_total_is_far_below_the_old_1e38(self):
        model = _model()
        model.simulate_collapse(num_cycles=2)
        breakdown = model._calculate_enhancement_breakdown(
            PEAK_TEMPERATURE_K, PEAK_PRESSURE_PA, PEAK_FIELD_V_M, PEAK_COMPRESSION
        )
        from app.physics_engine.enhancement_saturation import build_saturation_report

        _, report = build_saturation_report(breakdown)
        log10_total = report["mechanisms"]["total"]["log10_value_raw"]
        assert log10_total < 20.0, "unbounded mechanisms have returned"

    def test_fewer_mechanisms_saturate_than_before(self):
        model = _model()
        breakdown = model._calculate_enhancement_breakdown(
            PEAK_TEMPERATURE_K, PEAK_PRESSURE_PA, PEAK_FIELD_V_M, PEAK_COMPRESSION
        )
        from app.physics_engine.enhancement_saturation import build_saturation_report

        _, report = build_saturation_report(breakdown)
        saturated = set(report["saturated_mechanisms"]) - {"total"}
        # qed, casimir and rydberg used to saturate here purely from bad formulae.
        assert "qed" not in saturated
        assert "rydberg" not in saturated
        assert "casimir" not in saturated

    def test_material_changes_the_breakdown(self):
        """bulk_modulus and screening_potential must both bite."""
        pd = _model("palladium")._calculate_enhancement_breakdown(
            PEAK_TEMPERATURE_K, PEAK_PRESSURE_PA, PEAK_FIELD_V_M, PEAK_COMPRESSION
        )
        li = _model("lithium")._calculate_enhancement_breakdown(
            PEAK_TEMPERATURE_K, PEAK_PRESSURE_PA, PEAK_FIELD_V_M, PEAK_COMPRESSION
        )
        assert pd["casimir"] != li["casimir"]
