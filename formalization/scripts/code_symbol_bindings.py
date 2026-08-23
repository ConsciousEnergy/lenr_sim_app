"""Parse and compare optional IR ``code_symbols`` numeric bindings.

Supported declarations bind an ``adopted_value`` key to a top-level Python
numeric literal. ``path`` may be omitted when the IR row has one ``code_refs``
entry.

.. code-block:: yaml

   code_symbols:
     MAX_ENHANCEMENT_FACTOR:
       path: path/to/constants.py
       symbol: MAX_ENHANCEMENT_FACTOR

   code_symbols:
     - adopted_key: MAX_ENHANCEMENT_FACTOR
       path: path/to/constants.py
       symbol: MAX_ENHANCEMENT_FACTOR

Mapping values and list items may be symbol-name strings when the adopted key
and sole code reference are unambiguous.
"""
from __future__ import annotations

import ast
import math
from collections.abc import Mapping
from dataclasses import dataclass
from functools import lru_cache
from numbers import Real
from pathlib import Path
from typing import Any

import yaml


class BindingError(ValueError):
    """An IR code binding cannot be resolved or compared."""


@dataclass(frozen=True)
class CodeBinding:
    """One adopted-value key bound to one top-level Python symbol."""

    adopted_key: str
    path: str
    symbol: str


def _repo_file(root: Path, path: str) -> Path:
    candidate = (root / path).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise BindingError(f"code path escapes repository root: {path!r}") from exc
    if not candidate.is_file():
        raise BindingError(f"code path does not exist: {path!r}")
    return candidate


@lru_cache(maxsize=None)
def _python_module(root: Path, path: str) -> ast.Module:
    code_path = _repo_file(root, path)
    try:
        source = code_path.read_text(encoding="utf-8")
        return ast.parse(source, filename=str(code_path))
    except (OSError, SyntaxError) as exc:
        raise BindingError(f"cannot parse Python code at {path!r}: {exc}") from exc


def python_numeric_literal(root: Path, path: str, symbol: str) -> int | float:
    """Read one top-level numeric assignment without importing application code."""
    assignments: list[ast.expr] = []
    for statement in _python_module(root, path).body:
        if (
            isinstance(statement, ast.AnnAssign)
            and isinstance(statement.target, ast.Name)
            and statement.target.id == symbol
            and statement.value is not None
        ):
            assignments.append(statement.value)
        elif isinstance(statement, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == symbol
            for target in statement.targets
        ):
            assignments.append(statement.value)

    if not assignments:
        raise BindingError(f"{path}: top-level symbol {symbol!r} not found")
    if len(assignments) > 1:
        raise BindingError(
            f"{path}: top-level symbol {symbol!r} is assigned more than once"
        )
    try:
        value = ast.literal_eval(assignments[0])
    except (ValueError, TypeError) as exc:
        raise BindingError(
            f"{path}: symbol {symbol!r} is not a static Python literal"
        ) from exc
    if isinstance(value, bool) or not isinstance(value, Real):
        raise BindingError(
            f"{path}: symbol {symbol!r} must be numeric, got {type(value).__name__}"
        )
    return int(value) if isinstance(value, int) else float(value)


def _sole_code_ref(equation: Mapping[str, Any], adopted_key: str) -> str:
    code_refs = equation.get("code_refs") or []
    if (
        not isinstance(code_refs, list)
        or len(code_refs) != 1
        or not isinstance(code_refs[0], str)
    ):
        raise BindingError(
            f"binding for adopted value {adopted_key!r} must declare path because "
            "the IR row does not have exactly one code_refs entry"
        )
    return code_refs[0]


def _binding_from_spec(
    equation: Mapping[str, Any],
    default_adopted_key: str | None,
    spec: Any,
) -> CodeBinding:
    if isinstance(spec, str):
        adopted_key = default_adopted_key or spec
        return CodeBinding(
            adopted_key=adopted_key,
            path=_sole_code_ref(equation, adopted_key),
            symbol=spec,
        )
    if spec is None and default_adopted_key is not None:
        return CodeBinding(
            adopted_key=default_adopted_key,
            path=_sole_code_ref(equation, default_adopted_key),
            symbol=default_adopted_key,
        )
    if not isinstance(spec, Mapping):
        raise BindingError(f"code binding must be a string or mapping, got {spec!r}")

    adopted_key = spec.get(
        "adopted_key", spec.get("adopted_value", default_adopted_key)
    )
    if not isinstance(adopted_key, str) or not adopted_key:
        raise BindingError(f"code binding needs a non-empty adopted_key: {spec!r}")
    symbol = spec.get("symbol", adopted_key)
    if not isinstance(symbol, str) or not symbol:
        raise BindingError(f"code binding needs a non-empty symbol: {spec!r}")
    path = spec.get("path", spec.get("code_ref"))
    if path is None:
        path = _sole_code_ref(equation, adopted_key)
    if not isinstance(path, str) or not path:
        raise BindingError(f"code binding needs a non-empty path: {spec!r}")
    return CodeBinding(adopted_key=adopted_key, path=path, symbol=symbol)


def parse_code_bindings(equation: Mapping[str, Any]) -> list[CodeBinding]:
    """Normalize mapping/list ``code_symbols`` declarations."""
    declared = equation.get("code_symbols")
    if declared is None:
        return []
    if isinstance(declared, Mapping):
        bindings: list[CodeBinding] = []
        for adopted_key, spec in declared.items():
            if not isinstance(adopted_key, str) or not adopted_key:
                raise BindingError(
                    "code_symbols mapping key must be a non-empty string: "
                    f"{adopted_key!r}"
                )
            bindings.append(_binding_from_spec(equation, adopted_key, spec))
        return bindings
    if isinstance(declared, list):
        return [_binding_from_spec(equation, None, spec) for spec in declared]
    raise BindingError("code_symbols must be a mapping or list")


def coerce_numeric(value: Any, *, context: str) -> int | float:
    """Accept YAML numeric scalars, including scientific notation strings."""
    if isinstance(value, bool):
        raise BindingError(f"{context} must be numeric, got {value!r}")
    if isinstance(value, Real):
        return int(value) if isinstance(value, int) else float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError as exc:
            raise BindingError(f"{context} must be numeric, got {value!r}") from exc
    raise BindingError(f"{context} must be numeric, got {value!r}")


def _numbers_agree(actual: Real, expected: Real) -> bool:
    if type(actual) is int and type(expected) is int:
        return actual == expected
    return math.isclose(
        float(actual), float(expected), rel_tol=1e-12, abs_tol=0.0
    )


def declared_binding_errors(root: Path, ir_dir: Path) -> list[str]:
    """Compare every optional IR code binding and return actionable errors."""
    errors: list[str] = []
    for ir_path in sorted(ir_dir.glob("*.yaml")):
        relative_path = ir_path.relative_to(root)
        try:
            equation = yaml.safe_load(ir_path.read_text(encoding="utf-8"))
        except (OSError, yaml.YAMLError) as exc:
            errors.append(f"{relative_path}: cannot load IR YAML: {exc}")
            continue
        if not isinstance(equation, Mapping):
            errors.append(f"{relative_path}: IR entry must be a mapping")
            continue
        if equation.get("code_symbols") is None:
            continue

        adopted_values = equation.get("adopted_value")
        if not isinstance(adopted_values, Mapping):
            errors.append(
                f"{relative_path}: code_symbols requires an adopted_value mapping"
            )
            continue
        try:
            bindings = parse_code_bindings(equation)
        except BindingError as exc:
            errors.append(f"{relative_path}: {exc}")
            continue

        for binding in bindings:
            if binding.adopted_key not in adopted_values:
                errors.append(
                    f"{relative_path}: adopted_value has no key "
                    f"{binding.adopted_key!r} declared by code_symbols"
                )
                continue
            raw_expected = adopted_values[binding.adopted_key]
            try:
                expected = coerce_numeric(
                    raw_expected,
                    context=(
                        f"{relative_path}: "
                        f"adopted_value[{binding.adopted_key!r}]"
                    ),
                )
            except BindingError as exc:
                errors.append(str(exc))
                continue
            try:
                actual = python_numeric_literal(root, binding.path, binding.symbol)
            except BindingError as exc:
                errors.append(f"{relative_path}: {exc}")
                continue
            if not _numbers_agree(actual, expected):
                errors.append(
                    f"{relative_path}: {binding.path}:{binding.symbol} "
                    f"code={actual!r} IR adopted_value[{binding.adopted_key!r}]="
                    f"{expected!r}"
                )
    return errors
