#!/usr/bin/env python3
"""CLI gate for IR/Python numeric literals and legacy semantic snippets."""
from __future__ import annotations

import math
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required", file=sys.stderr)
    sys.exit(2)

if __package__:
    from .code_symbol_bindings import (
        BindingError,
        coerce_numeric,
        declared_binding_errors,
        python_numeric_literal,
    )
else:
    from code_symbol_bindings import (
        BindingError,
        coerce_numeric,
        declared_binding_errors,
        python_numeric_literal,
    )

ROOT = Path(__file__).resolve().parents[2]
IR_DIR = ROOT / "formalization" / "ir" / "equations"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def _ir_adopted_number(ir_name: str, key: str) -> int | float:
    ir_path = IR_DIR / ir_name
    equation = yaml.safe_load(ir_path.read_text(encoding="utf-8"))
    try:
        value = equation["adopted_value"][key]
    except (KeyError, TypeError) as exc:
        raise BindingError(
            f"{ir_path.relative_to(ROOT)}: missing adopted value {key!r}"
        ) from exc
    return coerce_numeric(
        value,
        context=f"{ir_path.relative_to(ROOT)}: adopted value {key!r}",
    )


def _legacy_literal_errors() -> list[str]:
    """Keep the original two literal checks until IR rows adopt code_symbols."""
    errors: list[str] = []
    constants_path = "LENR_SIM_APP_v2/backend/app/physics_engine/constants.py"
    for symbol, ir_name, tolerance in (
        ("MAX_ENHANCEMENT_FACTOR", "EQ-COMP-01.yaml", 0.0),
        ("MILES_HEAT_HELIUM_RATE", "EQ-MILES-CONV-01.yaml", 1e-6),
    ):
        try:
            code_value = python_numeric_literal(ROOT, constants_path, symbol)
            expected = _ir_adopted_number(ir_name, symbol)
        except (BindingError, OSError, yaml.YAMLError) as exc:
            errors.append(str(exc))
            continue
        agrees = (
            code_value == expected
            if tolerance == 0.0
            else math.isclose(
                float(code_value),
                float(expected),
                rel_tol=tolerance,
                abs_tol=0.0,
            )
        )
        if not agrees:
            errors.append(f"{symbol} code={code_value} IR={expected}")
    return errors


def _semantic_snippet_errors() -> list[str]:
    """Preserve the existing formula/reference checks as a regression floor."""
    errors: list[str] = []

    casimir = read(
        "LENR_SIM_APP_v2/backend/app/physics_engine/theories/casimir_confinement.py"
    )
    if (
        "pi**2 * HBAR * C / 240" not in casimir
        and "pi**2 * HBAR * C / 240.0" not in casimir
        and not re.search(
            r"pi\*\*2\s*\*\s*HBAR\s*\*\s*C\s*/\s*240", casimir
        )
    ):
        errors.append(
            "Casimir pi^2 hbar c / 240 fragment missing in "
            "casimir_confinement.py"
        )

    screening_kernel = read(
        "LENR_SIM_APP_v2/backend/app/physics_engine/screening_kernel.py"
    )
    if (
        "Assenbaum" not in screening_kernel
        and "assenbaum" not in screening_kernel.lower()
    ):
        errors.append("Assenbaum reference missing in screening_kernel.py")
    if "exp" not in screening_kernel:
        errors.append("exp enhancement missing in screening_kernel.py")

    pipeline = read("LENR_SIM_APP_v2/backend/app/physics_engine/theory_pipeline.py")
    if "grouped_max_confidence_product" not in pipeline:
        errors.append("grouped_max_confidence_product missing in theory_pipeline.py")
    if "THEORY_COMPOSITION_GROUPS" not in pipeline:
        errors.append("THEORY_COMPOSITION_GROUPS missing in theory_pipeline.py")
    return errors


def main() -> int:
    errors = [
        *_legacy_literal_errors(),
        *declared_binding_errors(ROOT, IR_DIR),
        *_semantic_snippet_errors(),
    ]
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print("diff_code_literals: FAIL")
        return 1
    print("diff_code_literals: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
