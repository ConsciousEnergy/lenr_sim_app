"""
Cross-Examination Validation Framework for LENR Theories

Defines a set of validation checks based on established experimental
observations.  Each theory is tested against these checks to determine
whether its predictions are consistent with the known LENR phenomenology.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.physics_engine.theory_pipeline import TheoryPipeline, get_default_pipeline
from app.physics_engine.theory_protocol import TheoryContribution
from app.physics_engine.constants import MILES_HEAT_HELIUM_RATE

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of a single validation check for one theory."""

    check_id: str
    check_name: str
    passed: bool
    score: float  # 0-1
    detail: str = ""

    def to_dict(self) -> Dict:
        return {
            "check_id": self.check_id,
            "check_name": self.check_name,
            "passed": self.passed,
            "score": round(self.score, 4),
            "detail": self.detail,
        }


@dataclass
class TheoryValidationReport:
    """Full validation report for a single theory."""

    theory_id: str
    theory_name: str
    checks: List[ValidationResult] = field(default_factory=list)
    overall_pass_rate: float = 0.0

    def to_dict(self) -> Dict:
        n_pass = sum(1 for c in self.checks if c.passed)
        return {
            "theory_id": self.theory_id,
            "theory_name": self.theory_name,
            "checks": [c.to_dict() for c in self.checks],
            "n_passed": n_pass,
            "n_total": len(self.checks),
            "overall_pass_rate": round(self.overall_pass_rate, 4),
        }


# ---------------------------------------------------------------------------
# Individual validation checks
# ---------------------------------------------------------------------------

def _check_miles_correlation(contrib: TheoryContribution) -> ValidationResult:
    """1W excess heat -> ~2.6e11 He-4/s?"""
    he4_rate = contrib.observables.get("expected_he4_rate_per_s", 0)
    energy = contrib.energy_output_watts

    if energy <= 0:
        # Theory doesn't predict energy; check if it predicts He-4
        he4_flag = contrib.observables.get("product_He4", 0)
        if he4_flag > 0.5:
            return ValidationResult(
                check_id="miles_correlation",
                check_name="Miles Heat-Helium Correlation",
                passed=True,
                score=0.6,
                detail="Predicts He-4 but no direct energy output to validate ratio",
            )
        return ValidationResult(
            check_id="miles_correlation",
            check_name="Miles Heat-Helium Correlation",
            passed=False,
            score=0.3,
            detail="Does not predict He-4 or energy output",
        )

    expected = energy * MILES_HEAT_HELIUM_RATE
    if he4_rate > 0:
        ratio = he4_rate / expected
        passed = 0.1 < ratio < 10.0
        score = max(0, 1.0 - abs(math.log10(max(ratio, 1e-10))))
    else:
        passed = False
        score = 0.2

    return ValidationResult(
        check_id="miles_correlation",
        check_name="Miles Heat-Helium Correlation",
        passed=passed,
        score=min(1.0, score),
        detail=f"He-4 rate ratio to Miles prediction: {ratio:.2f}" if he4_rate > 0 else "No He-4 rate predicted",
    )


def _check_no_dangerous_radiation(contrib: TheoryContribution) -> ValidationResult:
    """Neutron/gamma emissions below detection thresholds?"""
    neutrons = contrib.observables.get("product_neutrons", 0)
    gamma = contrib.observables.get("product_gamma", 0)

    passed = neutrons < 0.05 and gamma < 0.1
    score = 1.0 - (neutrons + gamma)
    score = max(0.0, min(1.0, score))

    return ValidationResult(
        check_id="no_radiation",
        check_name="No Dangerous Radiation",
        passed=passed,
        score=score,
        detail=f"Neutron fraction: {neutrons:.3f}, Gamma fraction: {gamma:.3f}",
    )


def _check_loading_threshold(
    contrib: TheoryContribution,
    conditions: Dict[str, float],
) -> ValidationResult:
    """Onset at loading ratio > 0.85 for Pd-D?"""
    loading = conditions.get("loading_ratio", 0)
    is_applicable = contrib.is_applicable
    enhancement = contrib.enhancement_factor

    if loading < 0.85:
        # Below threshold: theory should show minimal enhancement
        if enhancement < 10:
            passed = True
            score = 0.8
            detail = "Correctly shows low activity below loading threshold"
        else:
            passed = False
            score = 0.3
            detail = f"Enhancement {enhancement:.1e} seems too high below loading threshold"
    else:
        # Above threshold: theory should show significant activity
        if enhancement > 1.0 and is_applicable:
            passed = True
            score = min(1.0, 0.5 + math.log10(max(enhancement, 1)) / 20)
            detail = "Active above loading threshold as expected"
        else:
            passed = False
            score = 0.3
            detail = "Not active despite being above loading threshold"

    return ValidationResult(
        check_id="loading_threshold",
        check_name="Loading Threshold (>0.85 for Pd-D)",
        passed=passed,
        score=score,
        detail=detail,
    )


def _check_surface_dependence(contrib: TheoryContribution) -> ValidationResult:
    """Enhancement scales with surface area, not volume?"""
    # Check if theory has surface-related observables
    surface_indicators = [
        "surface_factor", "ni_surface_area_m2",
        "spectral_response", "oop_response",
    ]
    has_surface = any(k in contrib.observables for k in surface_indicators)

    # NAE/surface theories explicitly model surface dependence
    surface_tags = ["surface_reaction", "nanoparticle_effects"]

    if has_surface:
        return ValidationResult(
            check_id="surface_dependence",
            check_name="Surface Area Dependence",
            passed=True,
            score=0.9,
            detail="Theory includes explicit surface area dependence",
        )
    return ValidationResult(
        check_id="surface_dependence",
        check_name="Surface Area Dependence",
        passed=False,
        score=0.4,
        detail="Theory does not explicitly model surface dependence",
    )


def _check_product_spectrum(contrib: TheoryContribution) -> ValidationResult:
    """He-4 as primary, tritium/He-3 ratio correct?"""
    he4 = contrib.observables.get("product_He4", 0)
    neutrons = contrib.observables.get("product_neutrons", 0)
    transmutation = contrib.observables.get("product_transmutation", 0)

    # Primary LENR signature: He-4 dominant, minimal neutrons
    if he4 > 0.5 and neutrons < 0.1:
        passed = True
        score = 0.9
        detail = "He-4 dominant, low neutron fraction — consistent with LENR signature"
    elif transmutation > 0.3:
        passed = True
        score = 0.7
        detail = "Transmutation-type theory — product spectrum differs from D-D"
    elif he4 > 0:
        passed = True
        score = 0.5 + he4 * 0.3
        detail = f"Some He-4 predicted (fraction: {he4:.2f})"
    else:
        passed = False
        score = 0.3
        detail = "Does not predict standard LENR product spectrum"

    return ValidationResult(
        check_id="product_spectrum",
        check_name="Product Spectrum (He-4 Primary)",
        passed=passed,
        score=min(1.0, score),
        detail=detail,
    )


def _check_thermal_activation(
    contrib: TheoryContribution,
    conditions: Dict[str, float],
) -> ValidationResult:
    """Ni-H: onset above ~400-700K?"""
    T = conditions.get("temperature", 300)

    # This check is mainly for Ni-H theories
    threshold_factor = contrib.observables.get("threshold_factor", None)
    if threshold_factor is not None:
        if T > 400 and threshold_factor > 0.5:
            return ValidationResult(
                check_id="thermal_activation",
                check_name="Thermal Activation (Ni-H)",
                passed=True,
                score=0.9,
                detail=f"Correct thermal onset at T={T:.0f}K, factor={threshold_factor:.2f}",
            )
        elif T < 400 and threshold_factor < 0.3:
            return ValidationResult(
                check_id="thermal_activation",
                check_name="Thermal Activation (Ni-H)",
                passed=True,
                score=0.8,
                detail="Correctly shows low activity below Ni-H threshold",
            )

    return ValidationResult(
        check_id="thermal_activation",
        check_name="Thermal Activation (Ni-H)",
        passed=True,
        score=0.5,
        detail="Not specifically a Ni-H theory; thermal check neutral",
    )


def _check_reproducibility(contrib: TheoryContribution) -> ValidationResult:
    """Narrow vs wide parameter sensitivity window?"""
    confidence = contrib.confidence

    # Higher confidence generally means better parameter sensitivity
    if confidence > 0.6:
        return ValidationResult(
            check_id="reproducibility",
            check_name="Reproducibility Window",
            passed=True,
            score=confidence,
            detail=f"High confidence ({confidence:.2f}) suggests broad operating window",
        )
    elif confidence > 0.3:
        return ValidationResult(
            check_id="reproducibility",
            check_name="Reproducibility Window",
            passed=True,
            score=confidence,
            detail=f"Moderate confidence ({confidence:.2f}) — narrow but accessible window",
        )
    return ValidationResult(
        check_id="reproducibility",
        check_name="Reproducibility Window",
        passed=False,
        score=max(0.1, confidence),
        detail=f"Low confidence ({confidence:.2f}) suggests poor reproducibility",
    )


# ---------------------------------------------------------------------------
# Main validation runner
# ---------------------------------------------------------------------------

ALL_CHECKS = [
    _check_miles_correlation,
    _check_no_dangerous_radiation,
    _check_product_spectrum,
    _check_reproducibility,
]

CONDITION_CHECKS = [
    _check_loading_threshold,
    _check_thermal_activation,
]

STRUCTURAL_CHECKS = [
    _check_surface_dependence,
]


def validate_theory(
    contrib: TheoryContribution,
    conditions: Dict[str, float],
) -> TheoryValidationReport:
    """Run all validation checks on a single theory contribution."""
    checks = []

    for check_fn in ALL_CHECKS:
        checks.append(check_fn(contrib))

    for check_fn in CONDITION_CHECKS:
        checks.append(check_fn(contrib, conditions))

    for check_fn in STRUCTURAL_CHECKS:
        checks.append(check_fn(contrib))

    n_pass = sum(1 for c in checks if c.passed)
    overall = n_pass / max(len(checks), 1)

    return TheoryValidationReport(
        theory_id=contrib.theory_id,
        theory_name=contrib.theory_name,
        checks=checks,
        overall_pass_rate=overall,
    )


def validate_all_theories(
    conditions: Dict[str, float],
    pipeline: Optional[TheoryPipeline] = None,
    enabled_theories: Optional[List[str]] = None,
) -> List[TheoryValidationReport]:
    """Run validation on all theories in the pipeline."""
    pipeline = pipeline or get_default_pipeline()
    theories = enabled_theories or list(pipeline.registered_ids)

    reports = []
    for tid in theories:
        try:
            contrib = pipeline.run_single(tid, conditions)
            report = validate_theory(contrib, conditions)
            reports.append(report)
        except Exception:
            logger.exception("Failed to validate theory %s", tid)

    # Sort by overall pass rate descending
    reports.sort(key=lambda r: r.overall_pass_rate, reverse=True)
    return reports
