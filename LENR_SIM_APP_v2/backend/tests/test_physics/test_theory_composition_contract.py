"""
Theory composition contract and claim-tier resolution.

Two credibility problems are gated here:

1. Ten theories sat in the ``independent`` fallback group, so each one
   multiplied into ``combined_enhancement``. Running Takahashi, Widom-Larsen,
   Chubb, Iwamura, Letts and friends together produced a single product of
   mutually-exclusive explanations of the same effect.
2. ``TheoryPipeline.run`` overwrote every module's declared claim tier with the
   rubric's, which can only emit two of the five defined tiers. The stellar
   module's ``cross_regime_extrapolation`` evidence class was erased, and
   ``established_reference`` / ``validated_lenr_mechanism`` could never appear.
"""

import pytest

from app.physics_engine.scientific_guardrails import (
    CLAIM_TIER_STRENGTH_ORDER,
    classify_evidence_tier,
    resolve_claim_tier,
    resolve_evidence_class,
)
from app.physics_engine.theory_pipeline import (
    THEORY_COMPOSITION_GROUPS,
    UNGROUPED_FALLBACK_GROUP,
    get_default_pipeline,
)
from app.physics_engine.theory_scoring import CLAIM_TIER_MULTIPLIER


def _reference_conditions() -> dict:
    return {
        "temperature": 320.0,
        "pressure": 151987.5,
        "electron_density": 6.8e28,
        "electric_field": 1e6,
        "loading_ratio": 0.92,
        "surface_roughness": 5e-9,
        "defect_density": 1e16,
        "grain_size": 50e-9,
        "gap_width_nm": 5.0,
        "crack_width_nm": 5.0,
        "electrolyte_family": "li",
        "electrolyte_species": "lioh",
        "electrolyte_molarity_mol_l": 0.3,
    }


class TestCompositionGroupAssignment:
    def test_every_registered_theory_has_a_composition_group(self):
        """An unassigned theory lands in the fallback group and multiplies."""
        pipeline = get_default_pipeline()
        unassigned = [
            tid for tid in pipeline.registered_ids
            if tid not in THEORY_COMPOSITION_GROUPS
        ]
        assert unassigned == [], (
            "these theories would each multiply into combined_enhancement: "
            f"{unassigned}"
        )

    def test_competing_coherence_accounts_share_one_group(self):
        """Coherent QED, CCS, BEC and TSC explain the same coherence."""
        for theory_id in ("coherent_qed", "vysotskii_ccs", "kim_bec", "takahashi_tsc"):
            assert THEORY_COMPOSITION_GROUPS[theory_id] == "coherence"

    def test_weak_interaction_rivals_share_one_group(self):
        for theory_id in ("widom_larsen", "chubb_ion_band"):
            assert THEORY_COMPOSITION_GROUPS[theory_id] == "weak_interaction"

    def test_transmutation_routes_share_one_group(self):
        for theory_id in ("iwamura_transmutation", "matsumoto_enc"):
            assert THEORY_COMPOSITION_GROUPS[theory_id] == "transmutation_route"

    def test_empirical_correlations_share_one_group(self):
        """Calorimetric/stimulation correlations are observations, not
        independent barrier mechanisms."""
        for theory_id in ("miles_heat_helium", "letts_laser", "piantelli_ni_h"):
            assert THEORY_COMPOSITION_GROUPS[theory_id] == "empirical_correlation"

    def test_context_line_stays_isolated(self):
        assert THEORY_COMPOSITION_GROUPS["stellar_scaling_mhd"] == "context_line"

    def test_thermal_spike_has_its_own_group(self):
        assert THEORY_COMPOSITION_GROUPS["czerski_thermal_spike"] == "ion_track"
        assert THEORY_COMPOSITION_GROUPS["electron_screening"] == "screening"


class TestCompositionRun:
    def test_only_one_winner_per_group_contributes(self):
        pipeline = get_default_pipeline()
        result = pipeline.run(_reference_conditions())
        payload = result.to_dict()
        provenance = payload["composition_provenance"]

        groups = [entry["group"] for entry in provenance["applied_groups"]]
        assert len(groups) == len(set(groups)), "a group contributed twice"

    def test_excluded_theories_are_reported_with_their_winner(self):
        pipeline = get_default_pipeline()
        provenance = pipeline.run(_reference_conditions()).to_dict()[
            "composition_provenance"
        ]
        for excluded in provenance["excluded_theories"]:
            assert excluded["group"]
            assert excluded["excluded_by"]
            assert excluded["theory_id"] != excluded["excluded_by"]

    def test_no_theory_falls_into_the_ungrouped_bucket_at_runtime(self):
        pipeline = get_default_pipeline()
        provenance = pipeline.run(_reference_conditions()).to_dict()[
            "composition_provenance"
        ]
        assert provenance["ungrouped_theories"] == []
        assert UNGROUPED_FALLBACK_GROUP not in [
            entry["group"] for entry in provenance["applied_groups"]
        ]

    def test_composition_states_non_combinability_with_bubble_lattice(self):
        pipeline = get_default_pipeline()
        provenance = pipeline.run(_reference_conditions()).to_dict()[
            "composition_provenance"
        ]
        assert (
            "bubble_lattice.peak_conditions.enhancement_factor"
            in provenance["not_combinable_with"]
        )

    def test_grouping_reduces_the_combined_product(self):
        """Regrouping the former independent theories must not inflate the total."""
        pipeline = get_default_pipeline()
        conditions = _reference_conditions()
        result = pipeline.run(conditions)
        payload = result.to_dict()

        applicable = [c for c in payload["per_theory"] if c["is_applicable"]]
        naive_product = 1.0
        for contribution in applicable:
            naive_product *= max(float(contribution["enhancement_factor"]), 1e-30)

        # With one winner per group the total can only be <= the all-multiply
        # product that the independent fallback produced.
        assert payload["combined_enhancement"] <= naive_product * (1.0 + 1e-9)


class TestClaimTierResolution:
    def test_rubric_may_downgrade_a_declared_tier(self):
        # Weak score implies speculative, which is weaker than the declaration.
        assert resolve_claim_tier("established_reference", "speculative_exploratory") == (
            "speculative_exploratory"
        )

    def test_rubric_may_not_upgrade_a_declared_tier(self):
        """This is what erased cross_regime_extrapolation's 0.2x weighting."""
        assert resolve_claim_tier(
            "cross_regime_extrapolation", "empirical_lenr_correlation"
        ) == "cross_regime_extrapolation"

    def test_missing_declaration_defers_to_the_rubric(self):
        assert resolve_claim_tier(None, "empirical_lenr_correlation") == (
            "empirical_lenr_correlation"
        )

    def test_unknown_declaration_defers_to_the_rubric(self):
        assert resolve_claim_tier("not_a_tier", "speculative_exploratory") == (
            "speculative_exploratory"
        )

    def test_every_ordered_tier_has_a_multiplier(self):
        for tier in CLAIM_TIER_STRENGTH_ORDER:
            assert tier in CLAIM_TIER_MULTIPLIER

    def test_strength_order_matches_multiplier_ordering(self):
        multipliers = [CLAIM_TIER_MULTIPLIER[t] for t in CLAIM_TIER_STRENGTH_ORDER]
        assert multipliers == sorted(multipliers, reverse=True)

    def test_cross_regime_evidence_class_survives(self):
        assert resolve_evidence_class("cross_regime_extrapolation", "partial") == (
            "cross_regime_extrapolation"
        )

    def test_other_evidence_classes_follow_the_rubric(self):
        assert resolve_evidence_class("exploratory", "replicated") == "replicated"

    @pytest.mark.parametrize("score", [0.0, 0.44, 0.45, 0.74, 0.75, 1.0])
    def test_rubric_classification_stays_within_the_vocabulary(self, score):
        evidence_class, claim_tier = classify_evidence_tier(score)
        assert claim_tier in CLAIM_TIER_STRENGTH_ORDER
        assert evidence_class in {"replicated", "partial", "exploratory"}


class TestStellarTrackGovernance:
    def test_stellar_track_keeps_its_cross_regime_evidence_class(self):
        """The module declares cross_regime_extrapolation; the rubric used to
        overwrite it, hiding that the track is not a LENR claim."""
        pipeline = get_default_pipeline()
        conditions = {
            **_reference_conditions(),
            # Stellar regime so the track is applicable.
            "temperature": 1.5e7,
            "plasma_density_m3": 1e30,
            "mhd_field_strength_T": 100.0,
        }
        payload = pipeline.run(conditions, enabled_theories=["stellar_scaling_mhd"]).to_dict()
        stellar = payload["per_theory"][0]
        assert stellar["evidence_class"] == "cross_regime_extrapolation"

    def test_claim_tier_resolution_is_recorded_in_provenance(self):
        pipeline = get_default_pipeline()
        payload = pipeline.run(
            _reference_conditions(), enabled_theories=["electron_screening"]
        ).to_dict()
        resolution = payload["per_theory"][0]["provenance"]["claim_tier_resolution"]
        for key in ("declared_by_module", "rubric_classification", "resolved", "policy"):
            assert key in resolution
