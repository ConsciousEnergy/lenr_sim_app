#!/usr/bin/env python3
"""Validate equation IR YAML against schema and taxonomy completeness."""
from __future__ import annotations

import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required (pip install pyyaml)", file=sys.stderr)
    sys.exit(2)

ROOT = Path(__file__).resolve().parents[2]
IR_DIR = ROOT / "formalization" / "ir" / "equations"
TAXONOMY = ROOT / "docs" / "FORMALIZATION" / "CLAIM_TAXONOMY.md"

REQUIRED = {"id", "latex", "symbols", "units", "tag", "paper_ref", "code_refs", "citation_keys", "lean_target"}
VALID_TAGS = {"THM", "DEF", "AX", "EMP", "OPEN", "SPEC"}


def load_equations() -> list[dict]:
    eqs = []
    for path in sorted(IR_DIR.glob("*.yaml")):
        with path.open(encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        if not isinstance(data, dict):
            raise SystemExit(f"Invalid YAML object in {path}")
        data["_path"] = str(path.relative_to(ROOT))
        eqs.append(data)
    return eqs


def taxonomy_ids() -> set[str]:
    text = TAXONOMY.read_text(encoding="utf-8")
    return set(re.findall(r"\bEQ-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+\b", text))


def main() -> int:
    if not IR_DIR.is_dir():
        print(f"ERROR: missing {IR_DIR}", file=sys.stderr)
        return 1

    eqs = load_equations()
    errors: list[str] = []
    warnings: list[str] = []
    ir_ids: set[str] = set()

    for eq in eqs:
        path = eq["_path"]
        missing = REQUIRED - set(eq)
        if missing:
            errors.append(f"{path}: missing fields {sorted(missing)}")
            continue
        eid = eq["id"]
        ir_ids.add(eid)
        if eq["tag"] not in VALID_TAGS:
            errors.append(f"{path}: invalid tag {eq['tag']!r}")
        if not eq["lean_target"]:
            errors.append(f"{path}: empty lean_target")
        code_refs = eq.get("code_refs") or []
        paper_only = bool(eq.get("paper_only"))
        if eq["tag"] in {"THM", "DEF"} and not code_refs and not paper_only:
            errors.append(f"{path}: THM/DEF needs code_refs or paper_only: true")
        for ref in code_refs:
            if not (ROOT / ref).exists():
                errors.append(f"{path}: code_ref missing on disk: {ref}")

    tax = taxonomy_ids()
    # Every IR id must appear in taxonomy
    for eid in sorted(ir_ids - tax):
        errors.append(f"IR id {eid} not found in CLAIM_TAXONOMY.md")

    # Pilot THM/DEF ids expected in IR
    pilot = {
        "EQ-RYD-01",
        "EQ-CAS-01",
        "EQ-CAS-02",
        "EQ-GAMOW-01",
        "EQ-ASSEN-01",
        "EQ-ASSEN-DOM-01",
        "EQ-COMP-01",
        "EQ-COMP-02",
        "EQ-MILES-CONV-01",
        "EQ-QDD-01",
        "EQ-TUN-BAND-01",
        "EQ-FIELD-01",
    }
    for eid in sorted(pilot - ir_ids):
        errors.append(f"pilot equation {eid} missing from IR")

    print(f"IR equations: {len(eqs)}")
    print(f"Taxonomy IDs mentioned: {len(tax)}")
    for w in warnings:
        print(f"WARN: {w}")
    if errors:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        print("check_ir: FAIL")
        return 1
    print("check_ir: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
