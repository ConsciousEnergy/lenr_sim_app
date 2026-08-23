"""Lean source discovery helpers for the equation IR validator."""
from __future__ import annotations

import re
from pathlib import Path


DECL_RE = re.compile(
    r"^\s*(?:@\[[^\]]+\]\s*)*"
    r"(?:(?:private|protected|noncomputable|unsafe|partial)\s+)*"
    r"(?P<kind>def|theorem|lemma|abbrev|opaque|axiom|inductive|structure|"
    r"class|instance|constant)\s+"
    r"(?P<name>[A-Za-z_][A-Za-z0-9_'.]*)"
)
IMPORT_RE = re.compile(r"^\s*import\s+([A-Za-z_][A-Za-z0-9_'.]*)\s*$", re.MULTILINE)
NAMESPACE_RE = re.compile(r"^\s*namespace\s+([A-Za-z_][A-Za-z0-9_'.]*)\s*$")
SECTION_RE = re.compile(r"^\s*section(?:\s+[A-Za-z_][A-Za-z0-9_']*)?\s*$")
END_RE = re.compile(r"^\s*end(?:\s+[A-Za-z_][A-Za-z0-9_'.]*)?\s*$")


def strip_lean_comments(text: str) -> str:
    """Remove nested block and line comments while preserving line boundaries."""
    out: list[str] = []
    index = 0
    depth = 0
    while index < len(text):
        pair = text[index : index + 2]
        if pair == "/-":
            depth += 1
            index += 2
        elif pair == "-/" and depth:
            depth -= 1
            index += 2
        elif pair == "--" and depth == 0:
            newline = text.find("\n", index)
            if newline < 0:
                break
            out.append("\n")
            index = newline + 1
        else:
            char = text[index]
            if depth == 0 or char == "\n":
                out.append(char)
            index += 1
    return "".join(out)


def declarations_in(path: Path) -> dict[str, str]:
    """Return fully qualified declaration names and kinds declared in one file."""
    namespaces: list[str] = []
    scopes: list[tuple[str, int]] = []
    declarations: dict[str, str] = {}
    text = strip_lean_comments(path.read_text(encoding="utf-8"))

    for line in text.splitlines():
        namespace = NAMESPACE_RE.match(line)
        if namespace:
            parts = namespace.group(1).split(".")
            namespaces.extend(parts)
            scopes.append(("namespace", len(parts)))
            continue
        if SECTION_RE.match(line):
            scopes.append(("section", 0))
            continue
        if END_RE.match(line):
            if scopes:
                kind, count = scopes.pop()
                if kind == "namespace" and count:
                    del namespaces[-count:]
            continue

        declaration = DECL_RE.match(line)
        if not declaration:
            continue
        name = declaration.group("name")
        if name.startswith("_root_."):
            qualified = name.removeprefix("_root_.")
        else:
            qualified = ".".join([*namespaces, name])
        declarations[qualified] = declaration.group("kind")

    return declarations


def module_path(lean_root: Path, module: str) -> Path:
    """Resolve a Lean module name to its source path."""
    return lean_root.joinpath(*module.split(".")).with_suffix(".lean")


def module_name(lean_root: Path, path: Path) -> str:
    """Convert a Lean source path beneath lean_root to its module name."""
    return ".".join(path.relative_to(lean_root).with_suffix("").parts)


def direct_imports(path: Path) -> set[str]:
    """Return direct imports from a Lean source file."""
    text = strip_lean_comments(path.read_text(encoding="utf-8"))
    return set(IMPORT_RE.findall(text))
