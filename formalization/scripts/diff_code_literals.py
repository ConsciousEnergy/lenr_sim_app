#!/usr/bin/env python3
"""Diff key Python literals against IR adopted_value / expected snippets."""
from __future__ import annotations

import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required", file=sys.stderr)
    sys.exit(2)

ROOT = Path(__file__).resolve().parents[2]
IR_DIR = ROOT / "formalization" / "ir" / "equations"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def main() -> int:
    errors: list[str] = []

    # MAX_ENHANCEMENT_FACTOR
    const_py = read("LENR_SIM_APP_v2/backend/app/physics_engine/constants.py")
    m = re.search(r"MAX_ENHANCEMENT_FACTOR:\s*float\s*=\s*([0-9.eE+-]+)", const_py)
    if not m:
        errors.append("MAX_ENHANCEMENT_FACTOR not found in constants.py")
    else:
        code_val = float(m.group(1))
        ir = yaml.safe_load((IR_DIR / "EQ-COMP-01.yaml").read_text(encoding="utf-8"))
        expected = float(ir["adopted_value"]["MAX_ENHANCEMENT_FACTOR"])
        if code_val != expected:
            errors.append(f"MAX_ENHANCEMENT_FACTOR code={code_val} IR={expected}")

    # Miles rate
    m = re.search(r"MILES_HEAT_HELIUM_RATE:\s*float\s*=\s*([0-9.eE+-]+)", const_py)
    if not m:
        errors.append("MILES_HEAT_HELIUM_RATE not found")
    else:
        code_val = float(m.group(1))
        ir = yaml.safe_load((IR_DIR / "EQ-MILES-CONV-01.yaml").read_text(encoding="utf-8"))
        expected = float(ir["adopted_value"]["MILES_HEAT_HELIUM_RATE"])
        if abs(code_val - expected) / expected > 1e-6:
            errors.append(f"MILES_HEAT_HELIUM_RATE code={code_val} IR={expected}")

    # Casimir formula fragment in theory module
    cas = read(
        "LENR_SIM_APP_v2/backend/app/physics_engine/theories/casimir_confinement.py"
    )
    if "pi**2 * HBAR * C / 240" not in cas and "pi**2 * HBAR * C / 240.0" not in cas:
        # allow either spacing
        if not re.search(r"pi\*\*2\s*\*\s*HBAR\s*\*\s*C\s*/\s*240", cas):
            errors.append("Casimir pi^2 hbar c / 240 fragment missing in casimir_confinement.py")

    # Assenbaum form documented in screening_kernel
    sk = read("LENR_SIM_APP_v2/backend/app/physics_engine/screening_kernel.py")
    if "Assenbaum" not in sk and "assenbaum" not in sk.lower():
        errors.append("Assenbaum reference missing in screening_kernel.py")
    if "exp" not in sk:
        errors.append("exp enhancement missing in screening_kernel.py")

    # Composition rule name
    pipe = read("LENR_SIM_APP_v2/backend/app/physics_engine/theory_pipeline.py")
    if "grouped_max_confidence_product" not in pipe:
        errors.append("grouped_max_confidence_product missing in theory_pipeline.py")
    if "THEORY_COMPOSITION_GROUPS" not in pipe:
        errors.append("THEORY_COMPOSITION_GROUPS missing in theory_pipeline.py")

    if errors:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        print("diff_code_literals: FAIL")
        return 1
    print("diff_code_literals: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
