"""Numeric agreement gates between Lean anchors and the canonical Python engine."""
from __future__ import annotations

import ast
import math
from pathlib import Path

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.decision_oracle import (
    Q_DD_HE4_MEV,
    TWO_BODY_LOG10_N_EVENTS,
    evaluate_determination,
)
from app.physics_engine.many_body.fgr_model import MAX_COLLECTIVE_FACTOR
from app.physics_engine.open_questions import TRAP_SEP_M


def _find_repo_root(start: Path) -> Path:
    """Find the checkout root from a test path without relying on cwd."""
    for candidate in (start, *start.parents):
        lean_dir = candidate / "formalization" / "lean" / "LenrFormal"
        backend_dir = candidate / "LENR_SIM_APP_v2" / "backend"
        if lean_dir.is_dir() and backend_dir.is_dir():
            return candidate
    raise RuntimeError(
        f"Could not locate repository root from {start}; expected both "
        "formalization/lean/LenrFormal and LENR_SIM_APP_v2/backend"
    )


REPO_ROOT = _find_repo_root(Path(__file__).resolve())
LEAN_DIR = REPO_ROOT / "formalization" / "lean" / "LenrFormal"


def _lean_definition_rhs(path: Path, symbol: str) -> str:
    """Return the right-hand side of one top-level Lean ``def`` declaration."""
    matches: list[tuple[int, str]] = []
    for line_number, raw_line in enumerate(
        path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        declaration, separator, rhs = raw_line.partition(":=")
        if not separator:
            continue
        words = declaration.strip().split(maxsplit=2)
        if len(words) >= 2 and words[0] == "def" and words[1] == symbol:
            matches.append((line_number, rhs.split("--", maxsplit=1)[0].strip()))

    location = path.relative_to(REPO_ROOT)
    assert matches, f"Lean definition {symbol!r} not found in {location}"
    assert len(matches) == 1, (
        f"Lean definition {symbol!r} appears multiple times in {location}: "
        f"lines {[line for line, _ in matches]}"
    )
    line_number, rhs = matches[0]
    assert rhs, f"Lean definition {symbol!r} has no RHS at {location}:{line_number}"
    return rhs


def _evaluate_lean_integer(path: Path, symbol: str) -> int:
    """Evaluate the integer-only expression subset used by numeric Lean anchors."""
    expression = _lean_definition_rhs(path, symbol).replace(": Int", "")
    try:
        parsed = ast.parse(expression, mode="eval")
    except SyntaxError as exc:
        raise AssertionError(
            f"Lean definition {symbol!r} is not a supported integer expression: "
            f"{expression!r}"
        ) from exc

    def evaluate(node: ast.AST) -> int:
        if isinstance(node, ast.Expression):
            return evaluate(node.body)
        if isinstance(node, ast.Constant) and type(node.value) is int:
            return node.value
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
            return -evaluate(node.operand)
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.UAdd):
            return evaluate(node.operand)
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
            return evaluate(node.left) + evaluate(node.right)
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Sub):
            return evaluate(node.left) - evaluate(node.right)
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Mult):
            return evaluate(node.left) * evaluate(node.right)
        raise AssertionError(
            f"Lean definition {symbol!r} uses an unsupported integer expression: "
            f"{expression!r}"
        )

    return evaluate(parsed)


def _lean_nat_min_cap(path: Path, symbol: str) -> int:
    """Read the cap from a ``Nat.min <argument> <integer>`` Lean definition."""
    rhs = _lean_definition_rhs(path, symbol)
    words = rhs.split()
    assert len(words) == 3 and words[0] == "Nat.min", (
        f"Lean definition {symbol!r} must have form "
        f"'Nat.min <argument> <integer>', got {rhs!r}"
    )
    try:
        return int(words[2])
    except ValueError as exc:
        raise AssertionError(
            f"Lean definition {symbol!r} has a non-integer Nat.min cap: {words[2]!r}"
        ) from exc


def _scaled_python_integer(value: float, scale: float, symbol: str) -> int:
    """Scale a Python engine value while rejecting silent truncation."""
    scaled = float(value) * scale
    rounded = round(scaled)
    assert math.isclose(scaled, rounded, rel_tol=0.0, abs_tol=1e-9), (
        f"{symbol} * {scale:g} must be integral for Lean comparison, got {scaled!r}"
    )
    return int(rounded)


def _assert_agreement(
    *,
    lean_path: Path,
    lean_symbol: str,
    lean_value: int,
    python_symbol: str,
    python_value: int,
    expected_value: int,
) -> None:
    assert python_value == expected_value, (
        f"{python_symbol} = {python_value}, expected canonical anchor {expected_value}"
    )
    assert lean_value == python_value, (
        f"{lean_path.relative_to(REPO_ROOT)}::{lean_symbol} = {lean_value}, "
        f"but {python_symbol} = {python_value}"
    )


def test_max_enhancement_factor_agrees_with_lean() -> None:
    lean_path = LEAN_DIR / "Constants.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="maxEnhancementFactor",
        lean_value=_evaluate_lean_integer(lean_path, "maxEnhancementFactor"),
        python_symbol="MAX_ENHANCEMENT_FACTOR",
        python_value=_scaled_python_integer(
            MAX_ENHANCEMENT_FACTOR, 1.0, "MAX_ENHANCEMENT_FACTOR"
        ),
        expected_value=100_000,
    )


def test_max_collective_factor_agrees_with_lean() -> None:
    lean_path = LEAN_DIR / "NBody.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="collective",
        lean_value=_lean_nat_min_cap(lean_path, "collective"),
        python_symbol="MAX_COLLECTIVE_FACTOR",
        python_value=_scaled_python_integer(
            MAX_COLLECTIVE_FACTOR, 1.0, "MAX_COLLECTIVE_FACTOR"
        ),
        expected_value=1_000_000,
    )


def test_dd_he4_q_value_agrees_with_lean_kev_anchor() -> None:
    lean_path = LEAN_DIR / "Constants.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="qDD_He4_keV",
        lean_value=_evaluate_lean_integer(lean_path, "qDD_He4_keV"),
        python_symbol="Q_DD_HE4_MEV * 1000",
        python_value=_scaled_python_integer(
            Q_DD_HE4_MEV, 1_000.0, "Q_DD_HE4_MEV"
        ),
        expected_value=23_800,
    )


def test_trap_separation_agrees_with_lean_pm_anchor() -> None:
    lean_path = LEAN_DIR / "NBody.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="trapSep_pm",
        lean_value=_evaluate_lean_integer(lean_path, "trapSep_pm"),
        python_symbol="TRAP_SEP_M * 1e12",
        python_value=_scaled_python_integer(TRAP_SEP_M, 1e12, "TRAP_SEP_M"),
        expected_value=25,
    )


def test_two_body_event_budget_agrees_with_lean() -> None:
    lean_path = LEAN_DIR / "RateBudget.lean"
    oracle_result = evaluate_determination(rate_mode="two_body")
    python_budget = oracle_result["oracle_a"]["log10_n_events_two_body"]
    assert python_budget == TWO_BODY_LOG10_N_EVENTS, (
        "The two-body decision result drifted from TWO_BODY_LOG10_N_EVENTS: "
        f"{python_budget!r} != {TWO_BODY_LOG10_N_EVENTS!r}"
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="log10NEvents",
        lean_value=_evaluate_lean_integer(lean_path, "log10NEvents"),
        python_symbol="two-body decision-oracle log10 event budget",
        python_value=_scaled_python_integer(
            python_budget, 1.0, "two-body log10 event budget"
        ),
        expected_value=-40,
    )


def test_q4_double_layer_deficit_agrees_with_lean() -> None:
    from app.physics.weak_interaction import THRESHOLD_ELECTRON_MEV
    from app.physics_engine.open_question_details import (
        DOUBLE_LAYER_STATED_MEV,
        ELECTRON_CAPTURE_THRESHOLD_MEV,
    )

    lean_path = LEAN_DIR / "OpenQuestionBounds.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="doubleLayer_meV",
        lean_value=_evaluate_lean_integer(lean_path, "doubleLayer_meV"),
        python_symbol="DOUBLE_LAYER_STATED_MEV",
        python_value=DOUBLE_LAYER_STATED_MEV,
        expected_value=100,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="ecThreshold_meV",
        lean_value=_evaluate_lean_integer(lean_path, "ecThreshold_meV"),
        python_symbol="ELECTRON_CAPTURE_THRESHOLD_MEV",
        python_value=ELECTRON_CAPTURE_THRESHOLD_MEV,
        expected_value=782_000_000,
    )
    assert round(THRESHOLD_ELECTRON_MEV * 1e9) == ELECTRON_CAPTURE_THRESHOLD_MEV


def test_q5_integrated_yield_band_agrees_with_lean() -> None:
    from app.physics_engine.open_question_details import (
        INTEGRATED_YIELD_DISCREPANCY_HI,
        INTEGRATED_YIELD_DISCREPANCY_LO,
    )

    lean_path = LEAN_DIR / "OpenQuestionBounds.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="integratedYieldDiscrepancyLo",
        lean_value=_evaluate_lean_integer(lean_path, "integratedYieldDiscrepancyLo"),
        python_symbol="INTEGRATED_YIELD_DISCREPANCY_LO",
        python_value=INTEGRATED_YIELD_DISCREPANCY_LO,
        expected_value=100,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="integratedYieldDiscrepancyHi",
        lean_value=_evaluate_lean_integer(lean_path, "integratedYieldDiscrepancyHi"),
        python_symbol="INTEGRATED_YIELD_DISCREPANCY_HI",
        python_value=INTEGRATED_YIELD_DISCREPANCY_HI,
        expected_value=10_000,
    )


def test_collapse_bound_ceilings_agree_with_lean() -> None:
    from app.physics_engine.collapse_calculated_bounds import (
        COMPRESSIBILITY_MACH_THRESHOLD,
        EMISSION_BAND_UPPER_K,
        MOSS_ION_CEILING_K,
        SHOCK_PRESSURE_CEILING_PA,
    )

    lean_path = LEAN_DIR / "CollapseBounds.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="emissionBandUpper_K",
        lean_value=_evaluate_lean_integer(lean_path, "emissionBandUpper_K"),
        python_symbol="EMISSION_BAND_UPPER_K",
        python_value=_scaled_python_integer(
            EMISSION_BAND_UPPER_K, 1.0, "EMISSION_BAND_UPPER_K"
        ),
        expected_value=15_000,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="mossIonCeiling_K",
        lean_value=_evaluate_lean_integer(lean_path, "mossIonCeiling_K"),
        python_symbol="MOSS_ION_CEILING_K",
        python_value=_scaled_python_integer(
            MOSS_ION_CEILING_K, 1.0, "MOSS_ION_CEILING_K"
        ),
        expected_value=2_000_000,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="shockPressureCeiling_Pa",
        lean_value=_evaluate_lean_integer(lean_path, "shockPressureCeiling_Pa"),
        python_symbol="SHOCK_PRESSURE_CEILING_PA",
        python_value=_scaled_python_integer(
            SHOCK_PRESSURE_CEILING_PA, 1.0, "SHOCK_PRESSURE_CEILING_PA"
        ),
        expected_value=10_000_000_000,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="compressibilityMachThreshold_x10",
        lean_value=_evaluate_lean_integer(
            lean_path, "compressibilityMachThreshold_x10"
        ),
        python_symbol="COMPRESSIBILITY_MACH_THRESHOLD * 10",
        python_value=_scaled_python_integer(
            COMPRESSIBILITY_MACH_THRESHOLD, 10.0, "COMPRESSIBILITY_MACH_THRESHOLD"
        ),
        expected_value=3,
    )


def test_collapse_uq_percentiles_agree_with_lean() -> None:
    from app.physics_engine.collapse_uq import (
        COMPRESSION_RATIO_TOLERANCE,
        PERCENTILES,
        POLYTROPIC_INDEX_TOLERANCE,
    )

    lean_path = LEAN_DIR / "CollapseBounds.lean"
    lean_percentiles = [
        _evaluate_lean_integer(lean_path, "uqPercentileP05"),
        _evaluate_lean_integer(lean_path, "uqPercentileP25"),
        _evaluate_lean_integer(lean_path, "uqPercentileP50"),
        _evaluate_lean_integer(lean_path, "uqPercentileP75"),
        _evaluate_lean_integer(lean_path, "uqPercentileP95"),
    ]
    python_percentiles = [
        _scaled_python_integer(value, 1.0, f"PERCENTILES[{index}]")
        for index, value in enumerate(PERCENTILES)
    ]
    assert python_percentiles == [5, 25, 50, 75, 95]
    assert lean_percentiles == python_percentiles

    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="compressionRatioTolerancePct",
        lean_value=_evaluate_lean_integer(lean_path, "compressionRatioTolerancePct"),
        python_symbol="COMPRESSION_RATIO_TOLERANCE * 100",
        python_value=_scaled_python_integer(
            COMPRESSION_RATIO_TOLERANCE, 100.0, "COMPRESSION_RATIO_TOLERANCE"
        ),
        expected_value=20,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="polytropicIndexTolerancePct",
        lean_value=_evaluate_lean_integer(lean_path, "polytropicIndexTolerancePct"),
        python_symbol="POLYTROPIC_INDEX_TOLERANCE * 100",
        python_value=_scaled_python_integer(
            POLYTROPIC_INDEX_TOLERANCE, 100.0, "POLYTROPIC_INDEX_TOLERANCE"
        ),
        expected_value=5,
    )
