"""
Comprehensive Tests for All 19 Theory Modules + Scoring/Validation

Tests cover:
- Module import and instantiation
- Protocol compliance (TheoryModule interface)
- Calculation under standard conditions
- Boundary conditions and edge cases
- Pipeline integration (all 19 theories)
- Scoring engine
- Validation framework
- Theory relationships graph
"""

import math
import pytest
from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata


# =====================================================
# Standard test conditions
# =====================================================

STANDARD_CONDITIONS = {
    "temperature": 300.0,
    "loading_ratio": 0.9,
    "pressure": 101325.0,
    "electron_density": 6.8e28,
}

HIGH_LOADING_CONDITIONS = {
    "temperature": 350.0,
    "loading_ratio": 0.95,
    "pressure": 200000.0,
    "electron_density": 7.0e28,
}


# =====================================================
# Helper: verify TheoryModule protocol compliance
# =====================================================

def assert_theory_protocol(theory):
    """Verify a theory instance satisfies the TheoryModule protocol."""
    assert hasattr(theory, "theory_id")
    assert hasattr(theory, "theory_name")
    assert hasattr(theory, "description")
    assert hasattr(theory, "configurable_parameters")
    assert callable(getattr(theory, "is_applicable", None))
    assert callable(getattr(theory, "calculate", None))
    assert callable(getattr(theory, "get_metadata", None))

    assert isinstance(theory.theory_id, str) and len(theory.theory_id) > 0
    assert isinstance(theory.theory_name, str) and len(theory.theory_name) > 0
    assert isinstance(theory.description, str) and len(theory.description) > 0
    assert isinstance(theory.configurable_parameters, dict)


def assert_valid_contribution(contrib):
    """Verify a TheoryContribution has valid fields."""
    assert isinstance(contrib, TheoryContribution)
    assert isinstance(contrib.theory_id, str)
    assert isinstance(contrib.enhancement_factor, (int, float))
    assert contrib.enhancement_factor >= 0
    assert isinstance(contrib.confidence, (int, float))
    assert 0.0 <= contrib.confidence <= 1.0
    assert isinstance(contrib.observables, dict)
    # Check no NaN/Inf in numeric observables
    for k, v in contrib.observables.items():
        if isinstance(v, float):
            assert not math.isnan(v), f"NaN in observable {k}"
            assert not math.isinf(v), f"Inf in observable {k}"


# =====================================================
# Phase 1A: Core new theories
# =====================================================

class TestTakahashiTSC:
    def setup_method(self):
        from app.physics_engine.theories.takahashi_tsc import TakahashiTSCTheory
        self.theory = TakahashiTSCTheory()

    def test_protocol_compliance(self):
        assert_theory_protocol(self.theory)

    def test_theory_id(self):
        assert self.theory.theory_id == "takahashi_tsc"

    def test_standard_calculation(self):
        result = self.theory.calculate(STANDARD_CONDITIONS)
        assert_valid_contribution(result)
        assert result.is_applicable

    def test_low_loading_not_applicable(self):
        low = {**STANDARD_CONDITIONS, "loading_ratio": 0.5}
        result = self.theory.calculate(low)
        assert not result.is_applicable

    def test_enhancement_increases_with_loading(self):
        r1 = self.theory.calculate({**STANDARD_CONDITIONS, "loading_ratio": 0.85})
        r2 = self.theory.calculate({**STANDARD_CONDITIONS, "loading_ratio": 0.95})
        assert r2.enhancement_factor >= r1.enhancement_factor

    def test_predicts_he4(self):
        r = self.theory.calculate(STANDARD_CONDITIONS)
        assert r.observables.get("product_He4", 0) > 0
        assert r.observables.get("product_neutrons", 0) == 0

    def test_metadata(self):
        m = self.theory.get_metadata()
        assert isinstance(m, TheoryMetadata)
        assert m.category == "mechanism"


class TestHagelsteinPhonon:
    def setup_method(self):
        from app.physics_engine.theories.hagelstein_phonon import HagelsteinPhononTheory
        self.theory = HagelsteinPhononTheory()

    def test_protocol_compliance(self):
        assert_theory_protocol(self.theory)

    def test_standard_calculation(self):
        result = self.theory.calculate(STANDARD_CONDITIONS)
        assert_valid_contribution(result)
        assert result.is_applicable

    def test_phonon_fraction_positive(self):
        r = self.theory.calculate(STANDARD_CONDITIONS)
        assert r.observables.get("phonon_fraction", 0) > 0

    def test_no_gamma_dominant(self):
        r = self.theory.calculate(STANDARD_CONDITIONS)
        gamma = r.observables.get("product_gamma", 1.0)
        assert gamma < 1.0  # phonon pathway reduces gamma fraction


class TestVysotskiiCCS:
    def setup_method(self):
        from app.physics_engine.theories.vysotskii_ccs import VysotskiiCCSTheory
        self.theory = VysotskiiCCSTheory()

    def test_protocol_compliance(self):
        assert_theory_protocol(self.theory)

    def test_standard_calculation(self):
        result = self.theory.calculate(STANDARD_CONDITIONS)
        assert_valid_contribution(result)

    def test_high_correlation_enhances(self):
        r1 = self.theory.calculate(STANDARD_CONDITIONS, {"correlation_coefficient": 0.5})
        r2 = self.theory.calculate(STANDARD_CONDITIONS, {"correlation_coefficient": 0.999})
        assert r2.enhancement_factor >= r1.enhancement_factor

    def test_squeeze_factor(self):
        r = self.theory.calculate(STANDARD_CONDITIONS, {"correlation_coefficient": 0.99})
        assert r.observables.get("squeeze_factor", 1.0) < 1.0


class TestSwartzNanor:
    def setup_method(self):
        from app.physics_engine.theories.swartz_nanor import SwartzNanorTheory
        self.theory = SwartzNanorTheory()

    def test_protocol_compliance(self):
        assert_theory_protocol(self.theory)

    def test_at_oop(self):
        conds = {**STANDARD_CONDITIONS, "current_density_mA_cm2": 50.0}
        r = self.theory.calculate(conds)
        assert_valid_contribution(r)
        assert r.observables.get("oop_response", 0) > 0.5

    def test_away_from_oop(self):
        conds = {**STANDARD_CONDITIONS, "loading_ratio": 0.5, "current_density_mA_cm2": 200.0}
        r = self.theory.calculate(conds)
        assert r.observables.get("oop_response", 0) < 0.5

    def test_excess_power_at_oop(self):
        r = self.theory.calculate(STANDARD_CONDITIONS)
        assert r.energy_output_watts > 0


class TestMilesHeatHelium:
    def setup_method(self):
        from app.physics_engine.theories.miles_heat_helium import MilesHeatHeliumTheory
        self.theory = MilesHeatHeliumTheory()

    def test_protocol_compliance(self):
        assert_theory_protocol(self.theory)

    def test_standard_calculation(self):
        result = self.theory.calculate(STANDARD_CONDITIONS)
        assert_valid_contribution(result)

    def test_miles_rate(self):
        r = self.theory.calculate(STANDARD_CONDITIONS, {"excess_heat_W": 1.0})
        rate = r.observables.get("expected_he4_rate_per_s", 0)
        # 1W should give ~2.6e11 He-4/s
        assert 1e11 < rate < 1e12

    def test_q_value(self):
        r = self.theory.calculate(STANDARD_CONDITIONS)
        assert abs(r.observables.get("Q_value_MeV", 0) - 23.8) < 0.1


# =====================================================
# Phase 1B: Complementary theories
# =====================================================

class TestWidomLarsen:
    def setup_method(self):
        from app.physics_engine.theories.widom_larsen import WidomLarsenTheory
        self.theory = WidomLarsenTheory()

    def test_protocol_compliance(self):
        assert_theory_protocol(self.theory)

    def test_standard_calculation(self):
        result = self.theory.calculate(STANDARD_CONDITIONS)
        assert_valid_contribution(result)

    def test_mass_threshold(self):
        r = self.theory.calculate(STANDARD_CONDITIONS)
        assert r.observables.get("mass_threshold_ratio", 0) > 2.5

    def test_predicts_transmutation(self):
        r = self.theory.calculate(STANDARD_CONDITIONS)
        assert r.observables.get("product_transmutation", 0) > 0


class TestKimBEC:
    def setup_method(self):
        from app.physics_engine.theories.kim_bec import KimBECTheory
        self.theory = KimBECTheory()

    def test_protocol_compliance(self):
        assert_theory_protocol(self.theory)

    def test_standard_calculation(self):
        result = self.theory.calculate(STANDARD_CONDITIONS)
        assert_valid_contribution(result)

    def test_n_squared_in_observables(self):
        r = self.theory.calculate(STANDARD_CONDITIONS, {"deuteron_count": 50})
        assert r.observables.get("N_squared_enhancement", 0) == 2500

    def test_predicts_he4(self):
        r = self.theory.calculate(STANDARD_CONDITIONS)
        assert r.observables.get("product_He4", 0) > 0


class TestMatsumotoENC:
    def setup_method(self):
        from app.physics_engine.theories.matsumoto_enc import MatsumotoENCTheory
        self.theory = MatsumotoENCTheory()

    def test_protocol_compliance(self):
        assert_theory_protocol(self.theory)

    def test_standard_calculation(self):
        result = self.theory.calculate(STANDARD_CONDITIONS)
        assert_valid_contribution(result)

    def test_collapse_threshold(self):
        r = self.theory.calculate(STANDARD_CONDITIONS)
        assert "threshold_ratio" in r.observables


# =====================================================
# Phase 1C: Extended theories
# =====================================================

class TestChubbIonBand:
    def setup_method(self):
        from app.physics_engine.theories.chubb_ion_band import ChubbIonBandTheory
        self.theory = ChubbIonBandTheory()

    def test_protocol_compliance(self):
        assert_theory_protocol(self.theory)

    def test_standard_calculation(self):
        result = self.theory.calculate(STANDARD_CONDITIONS)
        assert_valid_contribution(result)

    def test_low_loading_not_applicable(self):
        low = {**STANDARD_CONDITIONS, "loading_ratio": 0.5}
        result = self.theory.calculate(low)
        assert not result.is_applicable

    def test_predicts_he4_no_neutrons(self):
        r = self.theory.calculate(STANDARD_CONDITIONS)
        assert r.observables.get("product_He4", 0) > 0
        assert r.observables.get("product_neutrons", 0) == 0


class TestPiantelliNiH:
    def setup_method(self):
        from app.physics_engine.theories.piantelli_ni_h import PiantelliNiHTheory
        self.theory = PiantelliNiHTheory()

    def test_protocol_compliance(self):
        assert_theory_protocol(self.theory)

    def test_below_threshold_low_power(self):
        cold = {**STANDARD_CONDITIONS, "temperature": 300.0}
        r = self.theory.calculate(cold)
        assert r.observables.get("threshold_factor", 0) < 0.5

    def test_above_threshold_active(self):
        hot = {**STANDARD_CONDITIONS, "temperature": 700.0}
        r = self.theory.calculate(hot)
        assert r.observables.get("threshold_factor", 0) > 0.5
        assert r.energy_output_watts > 0

    def test_excess_power_positive(self):
        hot = {**STANDARD_CONDITIONS, "temperature": 600.0}
        r = self.theory.calculate(hot)
        assert r.energy_output_watts >= 0


class TestIwamuraTransmutation:
    def setup_method(self):
        from app.physics_engine.theories.iwamura_transmutation import IwamuraTransmutationTheory
        self.theory = IwamuraTransmutationTheory()

    def test_protocol_compliance(self):
        assert_theory_protocol(self.theory)

    def test_standard_calculation(self):
        result = self.theory.calculate(STANDARD_CONDITIONS)
        assert_valid_contribution(result)

    def test_predicts_transmutation(self):
        r = self.theory.calculate(STANDARD_CONDITIONS)
        assert r.observables.get("product_transmutation", 0) > 0

    def test_cs_to_pr(self):
        r = self.theory.calculate(STANDARD_CONDITIONS, {"target_element_Z": 55})
        assert r.observables.get("delta_Z", 0) == 4


class TestLettsLaser:
    def setup_method(self):
        from app.physics_engine.theories.letts_laser import LettsLaserTheory
        self.theory = LettsLaserTheory()

    def test_protocol_compliance(self):
        assert_theory_protocol(self.theory)

    def test_at_resonance(self):
        r = self.theory.calculate(STANDARD_CONDITIONS, {"laser_wavelength_nm": 682.0})
        assert r.observables.get("spectral_response", 0) > 0.9

    def test_off_resonance(self):
        r = self.theory.calculate(STANDARD_CONDITIONS, {"laser_wavelength_nm": 500.0})
        assert r.observables.get("spectral_response", 0) < 0.1

    def test_excess_heat(self):
        r = self.theory.calculate(STANDARD_CONDITIONS)
        assert r.energy_output_watts > 0


# =====================================================
# Pipeline integration: all 19 theories
# =====================================================

class TestPipelineAll19:
    def setup_method(self):
        from app.physics_engine.theory_pipeline import get_default_pipeline
        # Reset singleton so we get a fresh pipeline
        import app.physics_engine.theory_pipeline as tp
        tp._default_pipeline = None
        self.pipeline = get_default_pipeline()

    def test_19_theories_registered(self):
        assert len(self.pipeline.registered_ids) >= 19  # 19 original + 2 legacy wrappers

    def test_run_all(self):
        result = self.pipeline.run(STANDARD_CONDITIONS)
        assert len(result.contributions) > 0
        assert result.combined_enhancement >= 1.0

    def test_each_theory_runs(self):
        for tid in self.pipeline.registered_ids:
            r = self.pipeline.run_single(tid, STANDARD_CONDITIONS)
            assert isinstance(r, TheoryContribution), f"{tid} failed"


# =====================================================
# Scoring engine
# =====================================================

class TestScoringEngine:
    def test_scores_all_theories(self):
        from app.physics_engine.theory_scoring import compute_theory_scores
        scores = compute_theory_scores(STANDARD_CONDITIONS)
        assert len(scores) >= 19  # 19 original + 2 legacy wrappers

    def test_score_fields(self):
        from app.physics_engine.theory_scoring import compute_theory_scores
        scores = compute_theory_scores(STANDARD_CONDITIONS)
        for tid, s in scores.items():
            assert "final_score" in s
            assert "physical_consistency" in s
            assert "experimental_agreement" in s
            assert 0.0 <= s["final_score"] <= 1.0

    def test_parameter_sweep(self):
        from app.physics_engine.theory_scoring import parameter_sweep
        results = parameter_sweep(
            STANDARD_CONDITIONS,
            "temperature",
            [200.0, 300.0, 500.0],
            enabled_theories=["electron_screening", "takahashi_tsc"],
        )
        assert "electron_screening" in results
        assert len(results["electron_screening"]) == 3


# =====================================================
# Validation framework
# =====================================================

class TestValidation:
    def test_validates_all_theories(self):
        from app.physics_engine.theory_validation import validate_all_theories
        reports = validate_all_theories(STANDARD_CONDITIONS)
        assert len(reports) >= 19  # 19 original + 2 legacy wrappers

    def test_report_fields(self):
        from app.physics_engine.theory_validation import validate_all_theories
        reports = validate_all_theories(STANDARD_CONDITIONS)
        for r in reports:
            assert hasattr(r, "theory_id")
            assert hasattr(r, "checks")
            assert len(r.checks) > 0
            assert 0.0 <= r.overall_pass_rate <= 1.0


# =====================================================
# Theory relationships graph
# =====================================================

class TestTheoryGraph:
    def test_19_nodes(self):
        from app.physics_engine.theory_relationships import TheoryGraph
        g = TheoryGraph()
        assert len(g.nodes) >= 19  # 19 original + 2 legacy wrappers

    def test_edges_exist(self):
        from app.physics_engine.theory_relationships import TheoryGraph
        g = TheoryGraph()
        assert len(g.edges) > 20

    def test_filter_by_category(self):
        from app.physics_engine.theory_relationships import TheoryGraph
        g = TheoryGraph()
        mechanisms = g.filter_by_category("mechanism")
        assert len(mechanisms) > 5

    def test_filter_by_property(self):
        from app.physics_engine.theory_relationships import TheoryGraph
        g = TheoryGraph()
        he4 = g.filter_by_property("he4_production")
        assert len(he4) >= 5

    def test_serialisation(self):
        from app.physics_engine.theory_relationships import TheoryGraph
        g = TheoryGraph()
        d = g.to_dict()
        assert "nodes" in d
        assert "edges" in d
        assert "properties_taxonomy" in d


# =====================================================
# Product observables completeness (v0.3.2-beta)
# =====================================================

# Conditions that include gap_width_nm for Hydroton/NAE applicability
FULL_CONDITIONS = {
    **STANDARD_CONDITIONS,
    "gap_width_nm": 1.0,
    "crack_width_nm": 1.0,
    "current_density_mA_cm2": 50.0,
    "excess_heat_W": 1.0,
}


class TestProductObservables:
    """Verify all theories output product_He4/neutrons/gamma."""

    THEORIES_WITH_PRODUCTS = [
        "electron_screening", "coherent_qed", "hydroton", "nae_model",
        "bubble_mhd_confinement", "casimir_confinement", "quantum_tunneling",
        "vysotskii_ccs", "swartz_nanor",
        "takahashi_tsc", "hagelstein_phonon", "miles_heat_helium",
        "widom_larsen", "kim_bec", "matsumoto_enc", "chubb_ion_band",
        "piantelli_ni_h", "iwamura_transmutation", "letts_laser",
    ]

    def test_all_theories_have_product_keys(self):
        """Every applicable theory must output product_He4, product_neutrons,
        and product_gamma in its observables dict."""
        from app.physics_engine.theory_pipeline import get_default_pipeline
        pipeline = get_default_pipeline()
        result = pipeline.run(FULL_CONDITIONS)
        for contrib in result.contributions:
            if not contrib.is_applicable:
                continue
            obs = contrib.observables
            assert "product_He4" in obs, (
                f"{contrib.theory_id} missing product_He4"
            )
            assert "product_neutrons" in obs, (
                f"{contrib.theory_id} missing product_neutrons"
            )
            assert "product_gamma" in obs, (
                f"{contrib.theory_id} missing product_gamma"
            )

    def test_hydroton_applicable_with_gap(self):
        """Hydroton must be applicable when gap_width_nm is provided."""
        from app.physics_engine.theories.hydroton import HydrotonTheory
        h = HydrotonTheory()
        assert h.is_applicable(FULL_CONDITIONS)
        result = h.calculate(FULL_CONDITIONS)
        assert result.is_applicable
        assert result.observables["product_He4"] == 1.0
        assert result.observables["product_neutrons"] == 0.01
        assert result.observables["product_gamma"] == 0.0


class TestScoringFairness:
    """Verify the improved scoring engine does not catastrophically
    penalise theories with missing sub-scores."""

    def test_no_theory_below_10_percent(self):
        """Under standard conditions no applicable theory should score < 10%."""
        from app.physics_engine.theory_scoring import compute_theory_scores
        scores = compute_theory_scores(FULL_CONDITIONS)
        for tid, s in scores.items():
            if s["is_applicable"]:
                assert s["final_score"] >= 0.10, (
                    f"{tid} scored {s['final_score']:.2%}, expected >= 10%"
                )

    def test_hydroton_scores_above_40_percent(self):
        """Hydroton with proper conditions should score reasonably."""
        from app.physics_engine.theory_scoring import compute_theory_scores
        scores = compute_theory_scores(FULL_CONDITIONS)
        hydroton = scores.get("hydroton", {})
        assert hydroton.get("final_score", 0) >= 0.40, (
            f"Hydroton scored {hydroton.get('final_score', 0):.2%}"
        )

    def test_inapplicable_theories_get_neutral_score(self):
        """Theories that are not applicable should get a neutral 0.5 score."""
        from app.physics_engine.theory_scoring import compute_theory_scores
        # Use conditions with no gap to make Hydroton inapplicable
        no_gap = {**STANDARD_CONDITIONS}
        scores = compute_theory_scores(no_gap)
        hydroton = scores.get("hydroton", {})
        if not hydroton.get("is_applicable", True):
            assert hydroton["final_score"] == 0.5

    def test_scoring_floor_prevents_near_zero(self):
        """Even with zero completeness the floor should prevent < 5%."""
        from app.physics_engine.theory_scoring import compute_theory_scores
        scores = compute_theory_scores(FULL_CONDITIONS)
        for tid, s in scores.items():
            if s["is_applicable"]:
                assert s["final_score"] >= 0.05, (
                    f"{tid} scored below geometric mean floor"
                )


# =====================================================
# v0.3.3-beta: Coupled Pipeline and New Theories
# =====================================================

class TestTopologicalSort:
    """Test the topological sort added to TheoryGraph."""

    def test_returns_all_theories(self):
        from app.physics_engine.theory_relationships import TheoryGraph
        graph = TheoryGraph()
        order = graph.topological_sort()
        # Should contain all theory IDs (21 now with legacy wrappers)
        assert len(order) >= 19

    def test_respects_dependency_order(self):
        from app.physics_engine.theory_relationships import TheoryGraph
        graph = TheoryGraph()
        order = graph.topological_sort()
        # phonon_coupling_legacy "extends" hagelstein_phonon,
        # so phonon_coupling_legacy should come BEFORE hagelstein_phonon
        if "phonon_coupling_legacy" in order and "hagelstein_phonon" in order:
            assert order.index("phonon_coupling_legacy") < order.index("hagelstein_phonon")

    def test_subset_filter(self):
        from app.physics_engine.theory_relationships import TheoryGraph
        graph = TheoryGraph()
        order = graph.topological_sort(["electron_screening", "hydroton"])
        assert set(order) == {"electron_screening", "hydroton"}

    def test_coupling_map(self):
        from app.physics_engine.theory_relationships import TheoryGraph
        graph = TheoryGraph()
        cmap = graph.get_coupling_map()
        # hagelstein_phonon should have phonon_coupling_legacy as upstream
        assert "hagelstein_phonon" in cmap
        sources = [c["source_id"] for c in cmap["hagelstein_phonon"]]
        assert "phonon_coupling_legacy" in sources


class TestCoupledPipeline:
    """Test the coupled (sequential dependency) pipeline."""

    def setup_method(self):
        from app.physics_engine.theory_pipeline import get_default_pipeline
        import app.physics_engine.theory_pipeline as tp
        tp._default_pipeline = None
        self.pipeline = get_default_pipeline()

    def test_coupled_runs_all_theories(self):
        result = self.pipeline.run_coupled(FULL_CONDITIONS)
        assert len(result.contributions) >= 19
        assert result.combined_enhancement >= 1.0

    def test_coupled_enriches_conditions(self):
        result = self.pipeline.run_coupled(FULL_CONDITIONS)
        # At least some theories should have injected outputs
        enriched_keys = [k for k in result.conditions if "__" in k]
        assert len(enriched_keys) > 0

    def test_coupled_subset(self):
        result = self.pipeline.run_coupled(
            STANDARD_CONDITIONS,
            enabled_theories=["electron_screening", "coherent_qed"],
        )
        assert len(result.contributions) == 2
        ids = [c.theory_id for c in result.contributions]
        assert "electron_screening" in ids
        assert "coherent_qed" in ids


class TestPhononCouplingLegacy:
    """Test the phonon-nuclear coupling legacy wrapper."""

    def setup_method(self):
        from app.physics_engine.theories.phonon_coupling_legacy import PhononCouplingLegacyTheory
        self.theory = PhononCouplingLegacyTheory()

    def test_protocol_compliance(self):
        assert_theory_protocol(self.theory)

    def test_standard_calculation(self):
        result = self.theory.calculate(STANDARD_CONDITIONS)
        assert_valid_contribution(result)
        assert result.is_applicable

    def test_enhancement_positive(self):
        r = self.theory.calculate(STANDARD_CONDITIONS)
        assert r.enhancement_factor >= 1.0

    def test_product_observables(self):
        r = self.theory.calculate(FULL_CONDITIONS)
        assert "product_He4" in r.observables
        assert "product_neutrons" in r.observables
        assert "product_gamma" in r.observables

    def test_not_applicable_at_zero_kelvin(self):
        r = self.theory.calculate({"temperature": 0})
        assert not r.is_applicable


class TestNonEquilibriumThermo:
    """Test the non-equilibrium thermodynamics legacy wrapper."""

    def setup_method(self):
        from app.physics_engine.theories.non_equilibrium_thermo import NonEquilibriumThermoTheory
        self.theory = NonEquilibriumThermoTheory()

    def test_protocol_compliance(self):
        assert_theory_protocol(self.theory)

    def test_standard_calculation(self):
        result = self.theory.calculate(FULL_CONDITIONS)
        assert_valid_contribution(result)
        assert result.is_applicable

    def test_cop_observable(self):
        r = self.theory.calculate(FULL_CONDITIONS)
        assert "cop" in r.observables

    def test_entropy_observable(self):
        r = self.theory.calculate(FULL_CONDITIONS)
        assert "entropy_rate_W_K" in r.observables

    def test_product_observables(self):
        r = self.theory.calculate(FULL_CONDITIONS)
        assert "product_He4" in r.observables


class TestPipelineWith21Theories:
    """Test that the pipeline now has 21 theories (19 + 2 legacy wrappers)."""

    def setup_method(self):
        from app.physics_engine.theory_pipeline import get_default_pipeline
        import app.physics_engine.theory_pipeline as tp
        tp._default_pipeline = None
        self.pipeline = get_default_pipeline()

    def test_21_registered(self):
        assert len(self.pipeline.registered_ids) >= 21

    def test_new_theories_registered(self):
        ids = self.pipeline.registered_ids
        assert "phonon_coupling_legacy" in ids
        assert "non_equilibrium_thermo" in ids
