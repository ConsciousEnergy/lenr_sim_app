"""
Scientific guardrails for confidence, uncertainty, and evidence metadata.

This module centralizes rubric-oriented outputs so backend endpoints expose a
stable contract that frontend views can render without re-deriving science logic.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import math


CONFIDENCE_WEIGHTS: Dict[str, float] = {
    "replication_depth": 0.24,
    "measurement_quality": 0.22,
    "parameter_proximity": 0.20,
    "mechanistic_maturity": 0.18,
    "radiation_consistency": 0.16,
}

VALIDATED_MOLARITY_MIN = 0.01
VALIDATED_MOLARITY_MAX = 1.0
SOFT_EXTRAPOLATION_MAX = 2.0


ELECTROLYTE_EVIDENCE_WEIGHT: Dict[str, float] = {
    "li": 1.0,
    "na": 0.82,
    "k": 0.76,
    "rb": 0.45,
    "cs": 0.40,
    "mixed": 0.70,
    "other": 0.55,
}

ELECTROLYTE_SPECIES_TO_FAMILY: Dict[str, str] = {
    "lioh": "li",
    "li2co3": "li",
    "naoh": "na",
    "na2co3": "na",
    "koh": "k",
    "k2co3": "k",
    "mixed": "mixed",
    "other": "other",
}

DEFAULT_SPECIES_BY_FAMILY: Dict[str, str] = {
    "li": "lioh",
    "na": "naoh",
    "k": "koh",
    "rb": "other",
    "cs": "other",
    "mixed": "mixed",
    "other": "other",
}

ELECTROLYTE_SPECIES_WEIGHT: Dict[str, float] = {
    "lioh": 1.00,
    "li2co3": 0.92,
    "naoh": 0.90,
    "na2co3": 0.84,
    "koh": 0.88,
    "k2co3": 0.82,
    "mixed": 0.78,
    "other": 0.70,
}


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def build_confidence_breakdown(
    *,
    confidence: float,
    is_applicable: bool,
    loading_ratio: float,
    electrolyte_family: str,
    electrolyte_molarity_mol_l: float,
) -> Dict[str, Any]:
    """
    Decompose confidence into rubric dimensions and preserve weighting metadata.
    """
    base = _clamp01(confidence) if is_applicable else 0.0
    loading = _clamp01(loading_ratio)
    evidence_weight = ELECTROLYTE_EVIDENCE_WEIGHT.get(electrolyte_family, 0.55)

    # Parameter-proximity follows bounded evidence window from v0.3.6 plan.
    if VALIDATED_MOLARITY_MIN <= electrolyte_molarity_mol_l <= VALIDATED_MOLARITY_MAX:
        proximity = 1.0
    elif VALIDATED_MOLARITY_MAX < electrolyte_molarity_mol_l <= SOFT_EXTRAPOLATION_MAX:
        proximity = 0.65
    else:
        proximity = 0.35

    dimensions = {
        "replication_depth": _clamp01(base * evidence_weight),
        "measurement_quality": _clamp01(base * 0.92),
        "parameter_proximity": _clamp01(base * proximity),
        "mechanistic_maturity": _clamp01(base * (0.8 if is_applicable else 0.3)),
        "radiation_consistency": _clamp01(base * (0.85 + 0.15 * loading)),
    }
    weighted = sum(dimensions[k] * CONFIDENCE_WEIGHTS[k] for k in dimensions)
    return {
        "weights": CONFIDENCE_WEIGHTS,
        "dimensions": dimensions,
        "weighted_score": _clamp01(weighted),
        "evidence_weight": float(evidence_weight),
    }


def build_uncertainty_interval(score: float) -> Dict[str, float]:
    """
    Attach deterministic uncertainty bounds for UI/result cards.
    """
    width = 0.08 + (1.0 - _clamp01(score)) * 0.18
    lower = _clamp01(score - width)
    upper = _clamp01(score + width)
    return {
        "lower_95": float(lower),
        "upper_95": float(upper),
        "interval_width": float(upper - lower),
    }


def build_falsification_conditions(theory_id: str) -> List[str]:
    """
    Minimal theory-level disconfirmation criteria for display and testing.
    """
    defaults = [
        "Confidence is materially reduced if predicted observables are not reproduced within uncertainty bounds.",
        "Confidence is reduced when operating parameters are outside validated electrolyte/loading windows.",
    ]
    by_theory = {
        "miles_heat_helium": [
            "Invalid if sustained excess heat does not correlate with He-4 proxy within uncertainty.",
            "Invalid if inferred nuclear power implies radiation signatures above measured detector bounds.",
        ],
        "electron_screening": [
            "Invalid if inferred screening potential remains below barrier-lowering threshold under claimed gains.",
        ],
        "bubble_mhd_confinement": [
            "Invalid if collapse compression and field estimates fail to exceed modeled confinement threshold.",
        ],
    }
    return by_theory.get(theory_id, defaults)


#: Claim tiers ordered from strongest to weakest. Used to decide whether the
#: rubric may override a module's declared tier: the rubric can only downgrade.
CLAIM_TIER_STRENGTH_ORDER: Tuple[str, ...] = (
    "validated_lenr_mechanism",
    "established_reference",
    "empirical_lenr_correlation",
    "speculative_exploratory",
    "cross_regime_extrapolation",
)


def classify_evidence_tier(confidence_score: float) -> Tuple[str, str]:
    """Map a rubric confidence score to an (evidence_class, claim_tier) pair.

    This is the *rubric's* opinion only. It can emit two of the five defined
    tiers; see :func:`resolve_claim_tier` for combining it with a module's own
    declaration.
    """
    score = _clamp01(confidence_score)
    if score >= 0.75:
        return "replicated", "empirical_lenr_correlation"
    if score >= 0.45:
        return "partial", "empirical_lenr_correlation"
    return "exploratory", "speculative_exploratory"


def resolve_claim_tier(declared_tier: Optional[str], rubric_tier: str) -> str:
    """Combine a module's declared claim tier with the rubric's classification.

    The rubric only ever emits ``empirical_lenr_correlation`` or
    ``speculative_exploratory``, so overwriting the module's declaration erased
    tiers the governance vocabulary defines: ``cross_regime_extrapolation`` was
    silently promoted to ``speculative_exploratory`` (0.2x -> 0.3x weighting),
    and ``established_reference`` / ``validated_lenr_mechanism`` could never be
    reported at all.

    Policy: the rubric may **downgrade** a declared tier when the score is weak,
    but never upgrade it. A module that declares a weak tier keeps it.

    Args:
        declared_tier: Tier declared by the theory module, if any.
        rubric_tier: Tier implied by the confidence rubric.

    Returns:
        The tier to report.
    """
    if not declared_tier:
        return rubric_tier
    if declared_tier not in CLAIM_TIER_STRENGTH_ORDER:
        return rubric_tier
    if rubric_tier not in CLAIM_TIER_STRENGTH_ORDER:
        return declared_tier
    # Larger index == weaker claim. Keep whichever is weaker.
    declared_rank = CLAIM_TIER_STRENGTH_ORDER.index(declared_tier)
    rubric_rank = CLAIM_TIER_STRENGTH_ORDER.index(rubric_tier)
    return declared_tier if declared_rank >= rubric_rank else rubric_tier


def resolve_evidence_class(declared_class: Optional[str], rubric_class: str) -> str:
    """Preserve a module's declared evidence class where it is meaningful.

    ``cross_regime_extrapolation`` in particular is a statement about which
    physical regime the track comes from, which no confidence score can infer.
    """
    if declared_class and declared_class == "cross_regime_extrapolation":
        return declared_class
    return rubric_class


def build_observables_bridge(
    *,
    total_energy_watts: float,
    expected_he4_rate_per_s: float,
) -> Dict[str, Any]:
    """
    Canonical observable map with explicit units and provenance class.
    """
    return {
        "excess_heat": {
            "value": float(total_energy_watts),
            "unit": "W",
            "type": "predicted",
        },
        "helium4_rate": {
            "value": float(expected_he4_rate_per_s),
            "unit": "atoms/s",
            "type": "predicted_proxy",
        },
        "neutron_rate_bound": {
            "value": 0.0,
            "unit": "counts/s",
            "type": "upper_bound_proxy",
            "proxy_not_computed": True,
            "note": "Neutron transport is not solved in this route; treat value as placeholder.",
        },
        "gamma_rate_bound": {
            "value": 0.0,
            "unit": "counts/s",
            "type": "upper_bound_proxy",
            "proxy_not_computed": True,
            "note": "Gamma transport is not solved in this route; treat value as placeholder.",
        },
        "isotopic_shift_indicator": {
            "value": 0.0,
            "unit": "arb",
            "type": "indicator",
        },
    }


def get_electrolyte_evidence_weight(electrolyte_family: str) -> float:
    """
    Return the evidence weight for an electrolyte family.
    """
    family = (electrolyte_family or "other").strip().lower()
    return float(ELECTROLYTE_EVIDENCE_WEIGHT.get(family, ELECTROLYTE_EVIDENCE_WEIGHT["other"]))


def normalize_electrolyte_species(electrolyte_family: str, electrolyte_species: str | None) -> str:
    """
    Resolve species with deterministic family fallback for backward compatibility.
    """
    family = (electrolyte_family or "other").strip().lower()
    species = (electrolyte_species or "").strip().lower()
    if species:
        return species
    return DEFAULT_SPECIES_BY_FAMILY.get(family, "other")


def get_electrolyte_species_weight(electrolyte_species: str) -> float:
    """
    Return species-level evidence weight.
    """
    species = (electrolyte_species or "other").strip().lower()
    return float(ELECTROLYTE_SPECIES_WEIGHT.get(species, ELECTROLYTE_SPECIES_WEIGHT["other"]))


def check_species_family_consistency(electrolyte_family: str, electrolyte_species: str) -> bool:
    """
    Return True when species maps to the selected family.
    """
    family = (electrolyte_family or "other").strip().lower()
    species = normalize_electrolyte_species(family, electrolyte_species)
    mapped_family = ELECTROLYTE_SPECIES_TO_FAMILY.get(species, family)
    if mapped_family in {"mixed", "other"}:
        return True
    if family in {"mixed", "other"}:
        return True
    return mapped_family == family


def classify_molarity_window(electrolyte_molarity_mol_l: float) -> Tuple[bool, bool, bool]:
    """
    Return (validated_window, soft_window, outside_supported_range).
    """
    molarity = float(electrolyte_molarity_mol_l or 0.0)
    validated_window = VALIDATED_MOLARITY_MIN <= molarity <= VALIDATED_MOLARITY_MAX
    soft_window = VALIDATED_MOLARITY_MAX < molarity <= SOFT_EXTRAPOLATION_MAX
    outside_supported_range = molarity <= 0.0 or molarity > SOFT_EXTRAPOLATION_MAX
    return validated_window, soft_window, outside_supported_range


def compute_alkali_activity_factor(electrolyte_molarity_mol_l: float) -> float:
    """
    Compute bounded alkali activity scaling from molarity.
    """
    molarity = float(electrolyte_molarity_mol_l or 0.0)
    bounded_molarity = max(0.0, min(molarity, SOFT_EXTRAPOLATION_MAX))
    return float(1.0 + 0.2 * math.tanh(bounded_molarity))


def compute_electrolyte_activity_multiplier(
    electrolyte_family: str,
    electrolyte_molarity_mol_l: float,
    electrolyte_species: str | None = None,
) -> float:
    """
    Compute bounded total activity multiplier using family/species evidence and molarity activity.
    """
    evidence_weight = get_electrolyte_evidence_weight(electrolyte_family)
    species = normalize_electrolyte_species(electrolyte_family, electrolyte_species)
    species_weight = get_electrolyte_species_weight(species)
    activity = compute_alkali_activity_factor(electrolyte_molarity_mol_l)
    return float(max(0.7, min(activity * evidence_weight * species_weight, 1.2)))


def build_electrolyte_diagnostics(
    *,
    electrolyte_family: str,
    electrolyte_species: str | None,
    electrolyte_molarity_mol_l: float,
) -> Dict[str, Any]:
    """
    Build canonical diagnostics payload for API transparency and UI rendering.
    """
    family = (electrolyte_family or "other").strip().lower()
    species = normalize_electrolyte_species(family, electrolyte_species)
    family_weight = get_electrolyte_evidence_weight(family)
    species_weight = get_electrolyte_species_weight(species)
    validated_window, soft_window, outside_supported_range = classify_molarity_window(electrolyte_molarity_mol_l)
    is_consistent = check_species_family_consistency(family, species)
    activity_multiplier = compute_electrolyte_activity_multiplier(
        family,
        electrolyte_molarity_mol_l,
        species,
    )
    support_level = "validated"
    if outside_supported_range:
        support_level = "unsupported"
    elif soft_window:
        support_level = "soft_extrapolation"
    elif not is_consistent:
        support_level = "inconsistent_pairing"
    return {
        "electrolyte_family": family,
        "electrolyte_species": species,
        "electrolyte_molarity_mol_l": float(electrolyte_molarity_mol_l),
        "family_evidence_weight": float(family_weight),
        "species_evidence_weight": float(species_weight),
        "activity_multiplier": float(activity_multiplier),
        "species_family_consistent": bool(is_consistent),
        "support_level": support_level,
        "validated_window": validated_window,
        "soft_window": soft_window,
        "outside_supported_range": outside_supported_range,
    }

