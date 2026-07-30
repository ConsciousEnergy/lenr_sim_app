#!/usr/bin/env python3
"""Replace Unicode science glyphs with LaTeX macros (Latin Modern safe)."""

from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

TEX = Path(__file__).resolve().parent / "unified_lenr_framework.tex"

# Text-mode replacements (applied outside $...$ and equation environments)
UNICODE_MAP = {
    "\u207b": r"$^{-}$",  # ⁻
    "\u2070": r"$^{0}$",
    "\u00b9": r"$^{1}$",
    "\u00b2": r"$^{2}$",
    "\u00b3": r"$^{3}$",
    "\u2074": r"$^{4}$",  # ⁴
    "\u2075": r"$^{5}$",  # ⁵
    "\u2076": r"$^{6}$",
    "\u2077": r"$^{7}$",
    "\u2078": r"$^{8}$",
    "\u2079": r"$^{9}$",
    "\u2080": r"$_{0}$",  # ₀
    "\u2081": r"$_{1}$",
    "\u2082": r"$_{2}$",  # ₂
    "\u2083": r"$_{3}$",
    "\u2084": r"$_{4}$",
    "\u2085": r"$_{5}$",
    "\u2086": r"$_{6}$",
    "\u2087": r"$_{7}$",
    "\u2088": r"$_{8}$",
    "\u2089": r"$_{9}$",
    "\u03b1": r"$\alpha$",
    "\u03b2": r"$\beta$",
    "\u03b3": r"$\gamma$",
    "\u03b4": r"$\delta$",
    "\u03b5": r"$\varepsilon$",
    "\u03b8": r"$\theta$",
    "\u03ba": r"$\kappa$",
    "\u03bb": r"$\lambda$",
    "\u03bc": r"$\mu$",
    "\u03bd": r"$\nu$",
    "\u03c0": r"$\pi$",
    "\u03c1": r"$\rho$",
    "\u03c3": r"$\sigma$",
    "\u03c4": r"$\tau$",
    "\u03c6": r"$\phi$",
    "\u03c9": r"$\omega$",
    "\u0394": r"$\Delta$",
    "\u0393": r"$\Gamma$",
    "\u03a3": r"$\Sigma$",
    "\u03a9": r"$\Omega$",
    "\u2212": r"--",  # − minus
    "\u221d": r"$\propto$",  # ∝
    "\u2260": r"$\neq$",  # ≠
    "\u2248": r"$\approx$",
    "\u2264": r"$\leq$",
    "\u2265": r"$\geq$",
    "\u00d7": r"$\times$",
    "\u00b7": r"$\cdot$",
    "\u2022": r"$\bullet$",
    "\u2192": r"$\rightarrow$",
    "\u2190": r"$\leftarrow$",
    "\u21d2": r"$\Rightarrow$",
    "\u221e": r"$\infty$",
    "\u00b1": r"$\pm$",
    "\u00b0": r"$^{\circ}$",
    "\u2013": r"--",
    "\u2014": r"---",
    "\u2018": "`",
    "\u2019": "'",
    "\u201c": "``",
    "\u201d": "''",
    "\u2026": r"\ldots{}",
    "\u00a7": r"\S{}",  # §
    "\u00f6": r"\"{o}",  # ö
    "\u00c5": r"\AA{}",  # Å
    "\u00b5": r"$\mu$",  # µ micro
    "\u221a": r"$\sqrt{\,}$",  # √
    "\u00e4": r"\"{a}",
    "\u00fc": r"\"{u}",
    "\u00e9": r"\'{e}",
    "\u00e8": r"\`{e}",
    "\u00ef": r"\"{\i}",
}


def split_math_aware(text: str) -> list[tuple[bool, str]]:
    """Split into (is_math, chunk) preserving $...$, \\(...\\), equation envs."""
    pattern = re.compile(
        r"(\$.*?\$|"
        r"\\begin\{equation\*?\}.*?\\end\{equation\*?\}|"
        r"\\\[.*?\\\]|"
        r"\\\(.*?\\\))",
        re.DOTALL,
    )
    parts: list[tuple[bool, str]] = []
    pos = 0
    for m in pattern.finditer(text):
        if m.start() > pos:
            parts.append((False, text[pos : m.start()]))
        parts.append((True, m.group(0)))
        pos = m.end()
    if pos < len(text):
        parts.append((False, text[pos:]))
    return parts


def replace_unicode(text: str) -> str:
    out = []
    for is_math, chunk in split_math_aware(text):
        if is_math:
            # Inside math, strip unicode to TeX commands without wrapping $
            math_map = {
                "\u03b1": r"\alpha",
                "\u03b2": r"\beta",
                "\u03b3": r"\gamma",
                "\u03b4": r"\delta",
                "\u03b5": r"\varepsilon",
                "\u03b8": r"\theta",
                "\u03ba": r"\kappa",
                "\u03bb": r"\lambda",
                "\u03bc": r"\mu",
                "\u03bd": r"\nu",
                "\u03c0": r"\pi",
                "\u03c1": r"\rho",
                "\u03c3": r"\sigma",
                "\u03c4": r"\tau",
                "\u03c6": r"\phi",
                "\u03c9": r"\omega",
                "\u0394": r"\Delta",
                "\u2212": r"-",
                "\u221d": r"\propto",
                "\u2260": r"\neq",
                "\u2248": r"\approx",
                "\u00d7": r"\times",
                "\u2192": r"\rightarrow",
                "\u221e": r"\infty",
                "\u00b1": r"\pm",
                # \AA (not \mathrm{\AA}) — this may land inside a nested \text{}
                # (e.g. units written as \text{eV/Å}); \mathrm errors there since
                # \text has already switched back to text/LR mode.
                "\u00c5": r"\AA{}",
                "\u221a": r"\sqrt",
                # Trailing {} terminates the control word so a following letter
                # (e.g. Unicode "·" immediately before "hr" in "W·hr") doesn't get
                # absorbed into an undefined macro like \cdothr.
                "\u00b7": r"\cdot{}",
            }
            for u, tex in math_map.items():
                chunk = chunk.replace(u, tex)
            out.append(chunk)
        else:
            for u, tex in UNICODE_MAP.items():
                chunk = chunk.replace(u, tex)
            out.append(chunk)
    # Collapse adjacent math: $^{4}$$^{5}$ → $^{45}$ is wrong; leave as-is
    # Fix $^{4}$$He$ style: $^{4}$He is fine
    s = "".join(out)
    # Merge consecutive single-char superscripts: $^{4}$$^{}$ no
    s = re.sub(r"\$\^\{(\d)\}\$\$\^\{(\d)\}\$", r"$^{\1\2}$", s)
    s = re.sub(r"\$\_\{(\d)\}\$\$\_\{(\d)\}\$", r"$_{\1\2}$", s)
    return s


def main() -> None:
    raw = TEX.read_text(encoding="utf-8")
    before = Counter(ch for ch in raw if ord(ch) > 127)
    fixed = replace_unicode(raw)
    after = Counter(ch for ch in fixed if ord(ch) > 127)
    TEX.write_text(fixed, encoding="utf-8")
    report = Path(__file__).resolve().parent / "out" / "unicode_fix_report.txt"
    report.parent.mkdir(exist_ok=True)
    lines = ["BEFORE:"]
    for ch, n in sorted(before.items(), key=lambda x: -x[1]):
        lines.append(f"  U+{ord(ch):04X} x{n}")
    lines.append("AFTER:")
    for ch, n in sorted(after.items(), key=lambda x: -x[1]):
        lines.append(f"  U+{ord(ch):04X} x{n}")
    if not after:
        lines.append("  (none)")
    report.write_text("\n".join(lines), encoding="utf-8")
    print(f"before={sum(before.values())} after={sum(after.values())}")
    print(f"report={report}")


if __name__ == "__main__":
    main()
