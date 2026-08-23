#!/usr/bin/env python3
"""Validate equation IR against source, taxonomy, and Lean declarations."""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required (pip install pyyaml)", file=sys.stderr)
    sys.exit(2)

from ir_lean import declarations_in, direct_imports, module_name, module_path


ROOT = Path(__file__).resolve().parents[2]
IR_DIR = ROOT / "formalization" / "ir" / "equations"
TAXONOMY = ROOT / "docs" / "FORMALIZATION" / "CLAIM_TAXONOMY.md"
LEAN_ROOT = ROOT / "formalization" / "lean"
LEAN_AGGREGATOR = LEAN_ROOT / "LenrFormal.lean"
LEAN_MODULE_DIR = LEAN_ROOT / "LenrFormal"
RUNTIME_ID_SOURCES = (
    ROOT / "LENR_SIM_APP_v2" / "backend" / "app" / "physics_engine" / "open_questions.py",
    ROOT
    / "LENR_SIM_APP_v2"
    / "backend"
    / "app"
    / "physics_engine"
    / "open_question_details.py",
    ROOT / "LENR_SIM_APP_v2" / "backend" / "app" / "physics_engine" / "decision_oracle.py",
)

REQUIRED = {
    "id",
    "latex",
    "symbols",
    "units",
    "tag",
    "paper_ref",
    "code_refs",
    "citation_keys",
    "lean_target",
    "lean_decls",
}
VALID_TAGS = {"THM", "DEF", "AX", "EMP", "OPEN", "SPEC"}
EQUATION_ID_RE = re.compile(r"\bEQ-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+\b")
THEOREM_KINDS = {"theorem", "lemma"}


def load_equations() -> list[dict[str, Any]]:
    eqs: list[dict[str, Any]] = []
    for path in sorted(IR_DIR.glob("*.yaml")):
        with path.open(encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        if not isinstance(data, dict):
            raise SystemExit(f"Invalid YAML object in {path}")
        data["_path"] = path
        eqs.append(data)
    return eqs


def taxonomy_ids() -> set[str]:
    text = TAXONOMY.read_text(encoding="utf-8")
    return set(EQUATION_ID_RE.findall(text))


def validate_lean_mapping(
    eq: dict[str, Any],
    errors: list[str],
    declaration_cache: dict[Path, dict[str, str]],
) -> None:
    path: Path = eq["_path"]
    display = str(path.relative_to(ROOT))
    target = eq.get("lean_target")
    lean_decls = eq.get("lean_decls")

    if not isinstance(target, str) or not target.strip():
        errors.append(f"{display}: lean_target must be a nonempty module name")
        return
    target_path = module_path(LEAN_ROOT, target)
    if not target_path.is_file():
        errors.append(
            f"{display}: lean_target {target!r} resolves to missing "
            f"{target_path.relative_to(ROOT)}"
        )
        return
    if (
        not isinstance(lean_decls, list)
        or not lean_decls
        or any(not isinstance(item, str) or not item.strip() for item in lean_decls)
    ):
        errors.append(f"{display}: lean_decls must be a nonempty list of nonempty strings")
        return

    declared = declaration_cache.setdefault(target_path, declarations_in(target_path))
    for declaration in lean_decls:
        if "." not in declaration:
            errors.append(f"{display}: lean_decls entry is not fully qualified: {declaration!r}")
        elif declaration not in declared:
            errors.append(
                f"{display}: {declaration!r} is not declared in "
                f"{target_path.relative_to(ROOT)}"
            )

    if eq.get("tag") == "THM" and not any(
        declared.get(declaration) in THEOREM_KINDS for declaration in lean_decls
    ):
        errors.append(f"{display}: THM lean_decls must include a theorem or lemma")


def validate_direct_lean_imports(errors: list[str]) -> None:
    if not LEAN_AGGREGATOR.is_file():
        errors.append(f"missing Lean root aggregator: {LEAN_AGGREGATOR.relative_to(ROOT)}")
        return
    imports = direct_imports(LEAN_AGGREGATOR)
    for source in sorted(LEAN_MODULE_DIR.rglob("*.lean")):
        module = module_name(LEAN_ROOT, source)
        if module not in imports:
            errors.append(
                f"{LEAN_AGGREGATOR.relative_to(ROOT)}: missing direct import {module} "
                f"for {source.relative_to(ROOT)}"
            )


def validate_runtime_ids(ir_ids: set[str], tax_ids: set[str], errors: list[str]) -> None:
    known = ir_ids | tax_ids
    for source in RUNTIME_ID_SOURCES:
        if not source.is_file():
            errors.append(f"runtime equation-ID source missing: {source.relative_to(ROOT)}")
            continue
        # Canonical IDs end in a numeric segment, so wildcard prose such as
        # EQ-OPEN-* cannot be interpreted as a literal identifier.
        ids = set(EQUATION_ID_RE.findall(source.read_text(encoding="utf-8")))
        for equation_id in sorted(ids - known):
            errors.append(
                f"{source.relative_to(ROOT)}: equation ID {equation_id} resolves to "
                "neither an IR row nor a taxonomy row"
            )


def main() -> int:
    if not IR_DIR.is_dir():
        print(f"ERROR: missing {IR_DIR}", file=sys.stderr)
        return 1

    eqs = load_equations()
    errors: list[str] = []
    warnings: list[str] = []
    ir_ids: set[str] = set()
    first_paths: dict[str, Path] = {}
    declaration_cache: dict[Path, dict[str, str]] = {}

    for eq in eqs:
        source: Path = eq["_path"]
        path = str(source.relative_to(ROOT))
        missing = REQUIRED - set(eq)
        if missing:
            errors.append(f"{path}: missing fields {sorted(missing)}")
        eid = eq.get("id")
        if not isinstance(eid, str) or not eid:
            errors.append(f"{path}: id must be a nonempty string")
        else:
            if source.stem != eid:
                errors.append(f"{path}: filename stem must match id {eid!r}")
            if eid in first_paths:
                errors.append(
                    f"{path}: duplicate id {eid!r}; first declared in "
                    f"{first_paths[eid].relative_to(ROOT)}"
                )
            else:
                first_paths[eid] = source
            ir_ids.add(eid)

        tag = eq.get("tag")
        if tag not in VALID_TAGS:
            errors.append(f"{path}: invalid tag {tag!r}")
        validate_lean_mapping(eq, errors, declaration_cache)

        raw_code_refs = eq.get("code_refs")
        if not isinstance(raw_code_refs, list):
            errors.append(f"{path}: code_refs must be a list")
            code_refs: list[Any] = []
        else:
            code_refs = raw_code_refs
        paper_only = bool(eq.get("paper_only"))
        if tag in {"THM", "DEF"} and not code_refs and not paper_only:
            errors.append(f"{path}: THM/DEF needs code_refs or paper_only: true")
        for ref in code_refs:
            if not isinstance(ref, str) or not ref:
                errors.append(f"{path}: code_ref must be a nonempty string: {ref!r}")
                continue
            if not (ROOT / ref).exists():
                errors.append(f"{path}: code_ref missing on disk: {ref}")

    tax = taxonomy_ids()
    validate_direct_lean_imports(errors)
    validate_runtime_ids(ir_ids, tax, errors)
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
