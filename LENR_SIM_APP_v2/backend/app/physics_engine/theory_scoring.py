"""
Predictive Probability Scoring Engine for LENR Theories

Runs all enabled theories under identical conditions and computes a
multi-factor score measuring each theory's physical consistency,
experimental agreement, parameter sensitivity, cross-theory agreement,
and observables completeness.

The final score is a weighted geometric mean of the 5 sub-scores.
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional, Tuple

from app.physics_engine.theory_pipeline import TheoryPipeline, get_default_pipeline
from app.physics_engine.theory_protocol import TheoryContribution
from app.physics_engine.constants import MILES_HEAT_HELIUM_RATE

logger = logging.getLogger(__name__)

# Sub-score weights (must sum to 1)
W_PHYSICAL = 0.25
W_EXPERIMENTAL = 0.25
W_SENSITIVITY = 0.15
W_CROSS_THEORY = 0.15
W_COMPLETENESS = 0.20

# v0.3.6-beta claim-tier down-weighting.
# Applied as a multiplicative factor on the final score so exploratory
# cross-regime tracks (e.g. stellar-scaling) are visible in the output but
# cannot silently dominate empirically-grounded LENR tracks.
CLAIM_TIER_MULTIPLIER: Dict[str, float] = {
    "validated_lenr_mechanism": 1.00,
    "established_reference": 1.00,  # textbook formalism; not lattice-LENR validation
    "empirical_lenr_correlation": 0.90,
    "speculative_exploratory": 0.30,
    "cross_regime_extrapolation": 0.20,
}


def _claim_tier_multiplier(contrib: TheoryContribution) -> float:
    """Return a bounded multiplier in (0, 1] from the contribution's claim tier."""
    tier = getattr(contrib, "claim_tier", None) or "speculative_exploratory"
    return float(CLAIM_TIER_MULTIPLIER.get(tier, CLAIM_TIER_MULTIPLIER["speculative_exploratory"]))


# ---------------------------------------------------------------------------
# Sub-score calculators
# ---------------------------------------------------------------------------

def _physical_consistency_score(contrib: TheoryContribution) -> float:
    """Check energy conservation, reasonable enhancement, and no NaN/Inf."""
    score = 1.0

    # Enhancement factor sanity
    if contrib.enhancement_factor < 1.0:
        score *= 0.5
    if contrib.enhancement_factor > 1e50:
        score *= 0.3

    # Energy output sanity (not negative)
    if contrib.energy_output_watts < 0:
        score *= 0.1

    # No NaN in observables
    for v in contrib.observables.values():
        if isinstance(v, (int, float)):
            if math.isnan(v) or math.isinf(v):
                score *= 0.5
                break

    # Product spectrum conservation: sum of product fractions <= 1
    product_keys = [k for k in contrib.observables if k.startswith("product_")]
    product_sum = sum(
        contrib.observables.get(k, 0) for k in product_keys
        if isinstance(contrib.observables.get(k, 0), (int, float))
    )
    if product_sum > 1.5:  # allow small numerical slack
        score *= 0.7

    return max(0.0, min(1.0, score))


def _experimental_agreement_score(contrib: TheoryContribution) -> float:
    """Compare predicted outputs to the Miles heat-helium correlation."""
    score = 0.5  # baseline

    # Check He-4 production
    he4 = contrib.observables.get("product_He4", 0)
    if he4 > 0.5:
        score += 0.2  # predicts He-4

    # No dangerous radiation
    neutrons = contrib.observables.get("product_neutrons", 0)
    gamma = contrib.observables.get("product_gamma", 0)
    if neutrons < 0.05 and gamma < 0.1:
        score += 0.2  # matches LENR signature

    # Miles correlation check (if energy output is available)
    if contrib.energy_output_watts > 0:
        expected_he4 = contrib.energy_output_watts * MILES_HEAT_HELIUM_RATE
        actual_he4 = contrib.observables.get("expected_he4_rate_per_s", 0)
        if actual_he4 > 0:
            ratio = actual_he4 / expected_he4
            if 0.3 < ratio < 3.0:
                score += 0.1  # consistent with Miles

    return max(0.0, min(1.0, score))


def _parameter_sensitivity_score(
    pipeline: TheoryPipeline,
    theory_id: str,
    base_conditions: Dict[str, float],
    config: Optional[Dict[str, Any]] = None,
) -> float:
    """Measure robustness to ±10% parameter variation."""
    try:
        base_result = pipeline.run_single(theory_id, base_conditions, config)
        base_enhancement = base_result.enhancement_factor
    except Exception:
        return 0.5

    if base_enhancement <= 1.0:
        return 0.5

    variations = []
    for key in ["temperature", "loading_ratio", "pressure", "electron_density"]:
        if key not in base_conditions:
            continue
        for delta in [-0.1, 0.1]:
            perturbed = dict(base_conditions)
            perturbed[key] = perturbed[key] * (1.0 + delta)
            if perturbed[key] <= 0:
                continue
            try:
                result = pipeline.run_single(theory_id, perturbed, config)
                ratio = result.enhancement_factor / max(base_enhancement, 1e-300)
                variations.append(abs(math.log10(max(ratio, 1e-300))))
            except Exception:
                variations.append(2.0)

    if not variations:
        return 0.5

    # Average log-variation: lower = more robust
    avg_variation = sum(variations) / len(variations)
    # Map: 0 variation -> 1.0, 2+ decades variation -> 0.1
    score = max(0.1, 1.0 - avg_variation / 2.0)
    return min(1.0, score)


def _cross_theory_agreement_score(
    contrib: TheoryContribution,
    all_contribs: List[TheoryContribution],
) -> float:
    """Measure how well this theory agrees with others."""
    if len(all_contribs) <= 1:
        return 0.5

    agrees = 0
    total = 0

    for other in all_contribs:
        if other.theory_id == contrib.theory_id:
            continue
        if not other.is_applicable:
            continue
        total += 1

        # Check product agreement
        this_he4 = contrib.observables.get("product_He4", 0) > 0.5
        other_he4 = other.observables.get("product_He4", 0) > 0.5
        this_no_rad = (
            contrib.observables.get("product_neutrons", 0) < 0.1
            and contrib.observables.get("product_gamma", 0) < 0.1
        )
        other_no_rad = (
            other.observables.get("product_neutrons", 0) < 0.1
            and other.observables.get("product_gamma", 0) < 0.1
        )

        agreement = 0
        checks = 0
        if this_he4 == other_he4:
            agreement += 1
        checks += 1
        if this_no_rad == other_no_rad:
            agreement += 1
        checks += 1

        # Enhancement direction agreement
        if (contrib.enhancement_factor > 1) == (other.enhancement_factor > 1):
            agreement += 1
        checks += 1

        agrees += agreement / max(checks, 1)

    if total == 0:
        return 0.5

    return agrees / total


def _observables_completeness_score(contrib: TheoryContribution) -> float:
    """Check if the theory explains all key LENR observables.

    Recognises alternative observable keys that convey equivalent
    information (e.g. ``neutron_rate_suppression`` maps to
    ``product_neutrons``).
    """
    expected_keys = [
        "product_He4", "product_neutrons", "product_gamma",
    ]

    # Alternative key mappings: if the primary key is absent, these
    # equivalent keys count toward completeness.
    alt_mappings = {
        "product_He4": ["branch_Dd_pT", "branch_Ddp_T"],
        "product_neutrons": ["neutron_rate_suppression", "neutron_rate_m3_s",
                             "branch_Dd_nHe3", "branch_Ddn_He3"],
        "product_gamma": ["photon_cascade_count"],
    }

    present = 0
    for key in expected_keys:
        if key in contrib.observables:
            present += 1
        else:
            # Check alternative keys
            alt_keys = alt_mappings.get(key, [])
            if any(ak in contrib.observables for ak in alt_keys):
                present += 1

    completeness = present / len(expected_keys)

    # Bonus for additional observables (theory richness)
    extra_obs = len(contrib.observables) - present
    bonus = min(extra_obs / 10.0, 0.2)

    return min(1.0, completeness + bonus)


# ---------------------------------------------------------------------------
# Main scoring function
# ---------------------------------------------------------------------------

def compute_theory_scores(
    conditions: Dict[str, float],
    pipeline: Optional[TheoryPipeline] = None,
    enabled_theories: Optional[List[str]] = None,
    config: Optional[Dict[str, Any]] = None,
    skip_sensitivity: bool = False,
) -> Dict[str, Dict[str, float]]:
    """Run all theories and compute probability scores.

    skip_sensitivity:
        Persist/campaign paths pass True so ``parameter_sensitivity`` is
        the neutral 0.5 instead of the expensive perturbation loop.
        Live Relevance Map scoring keeps the default False.

    Returns:
        Dict mapping theory_id -> {
            "physical_consistency": float,
            "experimental_agreement": float,
            "parameter_sensitivity": float,
            "cross_theory_agreement": float,
            "observables_completeness": float,
            "final_score": float,
            "confidence": float,
            "enhancement_factor": float,
        }
    """
    pipeline = pipeline or get_default_pipeline()
    theories = enabled_theories or list(pipeline.registered_ids)

    # Run all theories
    all_contribs: List[TheoryContribution] = []
    for tid in theories:
        try:
            contrib = pipeline.run_single(tid, conditions, config)
            all_contribs.append(contrib)
        except Exception:
            logger.exception("Failed to run theory %s for scoring", tid)

    # Separate applicable from inapplicable for fairer scoring
    applicable_contribs = [c for c in all_contribs if c.is_applicable]

    results = {}
    for contrib in all_contribs:
        # Inapplicable theories get a neutral score rather than being
        # penalised by the full scoring pipeline with empty observables.
        if not contrib.is_applicable:
            tier_multiplier = _claim_tier_multiplier(contrib)
            raw_neutral = 0.5
            results[contrib.theory_id] = {
                "physical_consistency": 0.5,
                "experimental_agreement": 0.5,
                "parameter_sensitivity": 0.5,
                "cross_theory_agreement": 0.5,
                "observables_completeness": 0.0,
                "final_score": round(raw_neutral * tier_multiplier, 4),
                "raw_score_pre_tier": raw_neutral,
                "claim_tier": getattr(contrib, "claim_tier", "speculative_exploratory"),
                "claim_tier_multiplier": round(tier_multiplier, 4),
                "confidence": 0.0,
                "enhancement_factor": contrib.enhancement_factor,
                "is_applicable": False,
                "energy_output_watts": contrib.energy_output_watts,
            }
            continue

        phys = _physical_consistency_score(contrib)
        exper = _experimental_agreement_score(contrib)
        sens = (
            0.5
            if skip_sensitivity
            else _parameter_sensitivity_score(pipeline, contrib.theory_id, conditions, config)
        )
        cross = _cross_theory_agreement_score(contrib, applicable_contribs)
        compl = _observables_completeness_score(contrib)

        # Weighted geometric mean with a floor of 0.05 per sub-score.
        # This prevents a single weak sub-score from collapsing the
        # entire final score to near-zero (the "geometric mean catastrophe").
        FLOOR = 0.05
        scores = [
            (max(phys, FLOOR), W_PHYSICAL),
            (max(exper, FLOOR), W_EXPERIMENTAL),
            (max(sens, FLOOR), W_SENSITIVITY),
            (max(cross, FLOOR), W_CROSS_THEORY),
            (max(compl, FLOOR), W_COMPLETENESS),
        ]
        log_sum = sum(w * math.log(s) for s, w in scores)
        raw_final = math.exp(log_sum)

        # Apply claim-tier multiplier so cross-regime / exploratory tracks
        # are visible but cannot silently dominate LENR-grounded scores.
        tier_multiplier = _claim_tier_multiplier(contrib)
        final = raw_final * tier_multiplier

        results[contrib.theory_id] = {
            "physical_consistency": round(phys, 4),
            "experimental_agreement": round(exper, 4),
            "parameter_sensitivity": round(sens, 4),
            "cross_theory_agreement": round(cross, 4),
            "observables_completeness": round(compl, 4),
            "final_score": round(final, 4),
            "raw_score_pre_tier": round(raw_final, 4),
            "claim_tier": getattr(contrib, "claim_tier", "speculative_exploratory"),
            "claim_tier_multiplier": round(tier_multiplier, 4),
            "confidence": round(contrib.confidence, 4),
            "enhancement_factor": contrib.enhancement_factor,
            "is_applicable": contrib.is_applicable,
            "energy_output_watts": contrib.energy_output_watts,
        }

    return results


def parameter_sweep(
    base_conditions: Dict[str, float],
    sweep_param: str,
    sweep_values: List[float],
    pipeline: Optional[TheoryPipeline] = None,
    enabled_theories: Optional[List[str]] = None,
) -> Dict[str, List[Dict[str, float]]]:
    """Sweep a parameter across all theories and collect results.

    Returns:
        Dict mapping theory_id -> list of {sweep_value, enhancement, confidence, score}
    """
    pipeline = pipeline or get_default_pipeline()
    theories = enabled_theories or list(pipeline.registered_ids)

    results: Dict[str, List[Dict[str, float]]] = {tid: [] for tid in theories}

    for val in sweep_values:
        conditions = dict(base_conditions)
        conditions[sweep_param] = val

        scores = compute_theory_scores(conditions, pipeline, theories)

        for tid in theories:
            entry = {
                "sweep_value": val,
                "enhancement_factor": scores.get(tid, {}).get("enhancement_factor", 1.0),
                "confidence": scores.get(tid, {}).get("confidence", 0.0),
                "final_score": scores.get(tid, {}).get("final_score", 0.0),
            }
            results[tid].append(entry)

    return results
