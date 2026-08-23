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
