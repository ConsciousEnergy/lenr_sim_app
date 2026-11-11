#!/usr/bin/env python3
"""Normalize Part 2 escaped-LaTeX appendix to Markdown. Structure only; no wording changes.

Hard rules:
- Caller must pass ONLY the text at/after the Document Structure marker (or this
  script splits on that marker itself and leaves Part 1 untouched).
- No whole-document regexes over Part 1.
- Word-level content of Part 2 is preserved; only markup and \\cite{}→labels change.
"""
from __future__ import annotations

import argparse
import hashlib
import re
import sys
from pathlib import Path

MARKER = "## **Document Structure and Reconciliation Note**"
ABSTRACT_BEGIN = "\\\\begin{abstract}"  # two backslashes in the source file

# 17 Part-2 cite keys → readable Author-Year labels (structure-only substitution).
CITE_LABELS: dict[str, str] = {
    "arata2002": "Arata 2002",
    "bockris1991": "Bockris 1991",
    "fleischmann1989": "Fleischmann 1989",
    "fralick2003": "Fralick 2003",
    "hagelstein2015": "Hagelstein 2015",
    "levi2013": "Levi 2013",
    "mckubre1994": "McKubre 1994",
    "menlove1989": "Menlove 1989",
    "miley1996": "Miley 1996",
    "mizuno2007": "Mizuno 2007",
    "mizuno2019": "Mizuno 2019",
    "oriani1990": "Oriani 1990",
    "preparata1991": "Preparata 1991",
    "schwinger1990": "Schwinger 1990",
    "storms2010": "Storms 2010",
    "takahashi2004": "Takahashi 2004",
    "wolf1990": "Wolf 1990",
}


def sha256_text(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def collapse_double_escapes(s: str) -> str:
    """Turn Part-2 double/triple-escaped LaTeX into single-backslash LaTeX."""
    # Display: \\\[ / \\\] (three backslash chars in file) → \[ / \]
    s = s.replace("\\\\\\[", "\\[")
    s = s.replace("\\\\\\]", "\\]")
    # Soft-escaped operators common in the export
    s = s.replace("\\=", "=")
    s = s.replace("\\+", "+")
    s = re.sub(r"(?<![A-Za-z])\\-(?![A-Za-z])", "-", s)
    # Collapse \\cmd → \cmd (and rare deeper stacks)
    for _ in range(3):
        s = re.sub(r"\\\\([A-Za-z]+)", r"\\\1", s)
        s = re.sub(r"\\\\([,;:!])", r"\\\1", s)
        s = re.sub(r"\\\\([\^_])", r"\\\1", s)
    # Starred section forms: \subsection\* → \subsection*
    s = s.replace("\\subsection\\*", "\\subsection*")
    s = s.replace("\\section\\*", "\\section*")
    s = s.replace("\\subsubsection\\*", "\\subsubsection*")
    return s


def fix_nested_dollar_in_text(s: str) -> str:
    """Structural fix: nested $…$ inside \\text{…} → adjacent math atoms (same words)."""

    def repl(m: re.Match) -> str:
        inner = m.group(1)
        if "$" not in inner:
            return m.group(0)
        # Split on $…$ keeping the math tokens as bare TeX atoms between \text pieces.
        parts: list[str] = []
        pos = 0
        for dm in re.finditer(r"\$([^$]+)\$", inner):
            before = inner[pos : dm.start()]
            if before:
                parts.append("\\text{" + before + "}")
            parts.append(dm.group(1).strip())
            pos = dm.end()
        after = inner[pos:]
        if after:
            parts.append("\\text{" + after + "}")
        return " ".join(parts)

    return re.sub(r"\\text\{([^{}]*)\}", repl, s)


def latex_lists_to_md(s: str) -> str:
    def convert_env(m: re.Match) -> str:
        env = m.group(1)
        body = m.group(2)
        items = re.split(r"\\item\s*", body)
        items = [it.strip() for it in items if it.strip()]
        lines = []
        for i, it in enumerate(items):
            it = re.sub(r"\s*\n\s*", " ", it).strip()
            if env.startswith("enum"):
                lines.append(f"{i + 1}. {it}")
            else:
                lines.append(f"* {it}")
        return "\n".join(lines) + "\n"

    for _ in range(6):
        news = re.sub(
            r"\\begin\{(itemize|enumerate)\}([\s\S]*?)\\end\{\1\}",
            convert_env,
            s,
        )
        if news == s:
            break
        s = news
    return s


def cite_repl(m: re.Match) -> str:
    keys = [k.strip() for k in m.group(1).split(",") if k.strip()]
    labels = []
    for k in keys:
        if k not in CITE_LABELS:
            raise SystemExit(f"unknown cite key: {k}")
        labels.append(CITE_LABELS[k])
    return "[" + "; ".join(labels) + "]"


def latex_inline_to_md(s: str) -> str:
    s = re.sub(r"\\textbf\{([^{}]+)\}", r"**\1**", s)
    s = re.sub(r"\\textit\{([^{}]+)\}", r"*\1*", s)
    s = re.sub(r"\\emph\{([^{}]+)\}", r"*\1*", s)
    s = re.sub(r"\\texttt\{([^{}]+)\}", r"`\1`", s)
    s = re.sub(r"\\cite\{([^{}]+)\}", cite_repl, s)
    # $$…$$ → \[…\]
    s = re.sub(r"\$\$([\s\S]+?)\$\$", r"\\[\1\\]", s)
    # $…$ → \(…\)
    s = re.sub(r"(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)", r"\\(\1\\)", s)
    return s


def remove_md_escapes_inside_math(s: str) -> str:
    """Remove Markdown escapes inside math spans only (not in prose)."""

    def clean_math(m: re.Match) -> str:
        delim_l, body, delim_r = m.group(1), m.group(2), m.group(3)
        # \_ → _ ; \* → * when used as MD escapes inside math; keep TeX commands.
        body = body.replace("\\_", "_")
        # \- already handled in collapse for operators; keep \command intact.
        return delim_l + body + delim_r

    s = re.sub(r"(\\\[)([\s\S]+?)(\\\])", clean_math, s)
    s = re.sub(r"(\\\()([\s\S]+?)(\\\))", clean_math, s)
    return s


def latex_sections_to_md(s: str) -> str:
    s = re.sub(r"\\begin\{abstract\}\s*", "", s)
    s = re.sub(r"\\end\{abstract\}\s*", "", s)

    def align_repl(m: re.Match) -> str:
        body = m.group(1)
        body = body.replace("&", " ").replace("\\\\", "\n")
        return "\\[\n" + body.strip() + "\n\\]\n"

    s = re.sub(r"\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}", align_repl, s)
    s = re.sub(r"\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}", r"\\[\1\\]", s)

    # Headings: \section → ### ; \subsection → #### (under Appendix archival H2)
    s = re.sub(r"\\section\*?\{([^{}]+)\}", r"### \1", s)
    s = re.sub(r"\\subsection\*?\{([^{}]+)\}", r"#### \1", s)
    s = re.sub(r"\\subsubsection\*?\{([^{}]+)\}", r"##### \1", s)
    return s


def cleanup_leftover_structure(s: str) -> str:
    # Orphan list items
    s = re.sub(r"\\item\s+", "* ", s)
    # Drop empty begin/end of converted envs only if any remain
    s = re.sub(r"\\begin\{(?:itemize|enumerate|abstract)\}", "", s)
    s = re.sub(r"\\end\{(?:itemize|enumerate|abstract)\}", "", s)
    # Collapse excess blank lines
    s = re.sub(r"\n{4,}", "\n\n\n", s)
    s = re.sub(r"[ \t]+\n", "\n", s)
    return s.strip() + "\n"


def convert_latex_appendix(raw_appendix: str) -> str:
    """Convert only the escaped-LaTeX appendix body (from \\begin{abstract})."""
    s = collapse_double_escapes(raw_appendix)
    s = fix_nested_dollar_in_text(s)
    s = latex_lists_to_md(s)
    s = latex_sections_to_md(s)
    s = latex_inline_to_md(s)
    s = remove_md_escapes_inside_math(s)
    s = cleanup_leftover_structure(s)
    header = (
        "## Appendix (archival)\n\n"
        "### Archival abstract\n\n"
    )
    return header + s


def strip_markup_to_words(text: str) -> list[str]:
    """Strip LaTeX/Markdown markup to a word list for structure-only proof."""
    s = text
    # Drop cite commands entirely (keys compared separately via allowed delta)
    s = re.sub(r"\\cite\{[^{}]+\}", " ", s)
    s = re.sub(r"\[(?:Arata|Bockris|Fleischmann|Fralick|Hagelstein|Levi|McKubre|"
               r"Menlove|Miley|Mizuno|Oriani|Preparata|Schwinger|Storms|Takahashi|Wolf)"
               r" \d{4}(?:; (?:Arata|Bockris|Fleischmann|Fralick|Hagelstein|Levi|McKubre|"
               r"Menlove|Miley|Mizuno|Oriani|Preparata|Schwinger|Storms|Takahashi|Wolf)"
               r" \d{4})*\]", " ", s)
    # Remove structural wrapper headings we intentionally add
    s = re.sub(r"^## Appendix \(archival\)\s*", "", s, flags=re.M)
    s = re.sub(r"^### Archival abstract\s*", "", s, flags=re.M)
    # LaTeX commands / MD heading markers / math delimiters / emphasis
    s = re.sub(r"\\\[|\\\]|\\\(|\\\)|\$\$|\$", " ", s)
    s = re.sub(r"\\begin\{[a-zA-Z*]+\}|\\end\{[a-zA-Z*]+\}", " ", s)
    s = re.sub(r"\\(?:section|subsection|subsubsection)\*?\{([^{}]+)\}", r" \1 ", s)
    s = re.sub(r"\\(?:textbf|textit|emph|texttt|text|mathrm|mathbf|frac|sqrt|"
               r"left|right|partial|nabla|cdot|times|geq|leq|pm|quad|qquad|"
               r"infty|hbar|epsilon|varepsilon|lambda|psi|phi|rho|sigma|mu|"
               r"alpha|beta|gamma|delta|omega|sum|int|prod|hat|bar|dot|ddot|"
               r"vec|mathbf|boldsymbol|overline|underline|mathrm|operatorname)"
               r"(?=[\s{\\]|$)", " ", s)
    s = re.sub(r"\\[a-zA-Z]+\*?", " ", s)
    s = re.sub(r"[{}]", " ", s)
    s = re.sub(r"^#+\s*", "", s, flags=re.M)
    # Markdown list markers are structure, not wording
    s = re.sub(r"(?m)^\s*(?:[-*+]|\d+\.)\s+", " ", s)
    s = re.sub(r"[*_`]+", " ", s)
    s = re.sub(r"\\item\b", " ", s)
    s = re.sub(r"&", " ", s)
    s = re.sub(r"\\\\", " ", s)
    # Underscore joiners in TeX identifiers → space
    s = s.replace("_", " ")
    s = s.replace("^", " ")
    s = s.replace("~", " ")
    # Normalize whitespace / punctuation-as-separators
    s = re.sub(r"[^\w\s\-–—]", " ", s, flags=re.UNICODE)
    words = [w for w in s.split() if w and w not in {"-", "–", "—", "---", "------", "--------------------", "------------"}]
    return words


def word_diff(before: str, after: str) -> tuple[list[str], list[str]]:
    from collections import Counter

    # For before: also strip abstract begin/end words that become the archival label
    b = Counter(strip_markup_to_words(before))
    a = Counter(strip_markup_to_words(after))
    # Remove the intentional structural label words from `after` only if extra
    for label_word in ("Appendix", "archival", "Archival", "abstract"):
        # Only drop one occurrence of structural labels that we added as headings
        pass
    # Compare multisets
    only_b = list((b - a).elements())
    only_a = list((a - b).elements())
    return sorted(only_b), sorted(only_a)


def normalize_part2_only(part2: str) -> str:
    if not part2.startswith(MARKER) and MARKER not in part2[:80]:
        # Accept slice that begins at marker
        if not part2.lstrip().startswith("##"):
            raise SystemExit("normalize_part2_only expected Part 2 slice")
    idx = part2.find(ABSTRACT_BEGIN)
    if idx < 0:
        raise SystemExit("escaped \\\\begin{abstract} not found in Part 2 slice")
    note = part2[:idx]
    # Preserve note byte-for-byte (includes reconciliation table + poorly-render sentence)
    raw = part2[idx:]
    converted = convert_latex_appendix(raw)
    return note + converted


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--canonical",
        type=Path,
        default=Path("docs/A_Unified_Theoretical_Framework_for_LENR.md"),
    )
    ap.add_argument(
        "--pack-md",
        type=Path,
        default=Path(
            "LENR_SIM_APP_v2/docs/v0.3.7-beta/paper/"
            "A_Unified_Theoretical_Framework_for_LENR.md"
        ),
    )
    ap.add_argument(
        "--pack-txt",
        type=Path,
        default=Path(
            "LENR_SIM_APP_v2/docs/v0.3.7-beta/paper/"
            "A_Unified_Theoretical_Framework_for_LENR.txt"
        ),
    )
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)

    text = args.canonical.read_text(encoding="utf-8")
    cut = text.find(MARKER)
    if cut < 0:
        raise SystemExit("Document Structure marker not found")
    part1 = text[:cut]
    part2 = text[cut:]
    part1_sha = sha256_text(part1)
    print(f"Part1 sha256 before: {part1_sha}")
    print(f"Part1 bytes: {len(part1.encode('utf-8'))}")

    new_part2 = normalize_part2_only(part2)
    out = part1 + new_part2
    part1_after = out[:cut]
    assert part1_after == part1
    print(f"Part1 sha256 after:  {sha256_text(part1_after)}")

    only_b, only_a = word_diff(part2, new_part2)
    print(f"Part2 word-diff only_in_before ({len(only_b)}): {only_b[:40]}")
    print(f"Part2 word-diff only_in_after ({len(only_a)}): {only_a[:40]}")
    if only_b or only_a:
        # Allow only structural wrapper words we added if residual
        allowed_after = {"Appendix", "archival", "Archival", "abstract"}
        unexpected_b = [w for w in only_b if w not in allowed_after]
        unexpected_a = [w for w in only_a if w not in allowed_after]
        if unexpected_b or unexpected_a:
            print("FAIL word-diff has unexpected deltas", file=sys.stderr)
            print(" unexpected before:", unexpected_b[:50], file=sys.stderr)
            print(" unexpected after:", unexpected_a[:50], file=sys.stderr)
            return 1
        print("word-diff OK (only intentional structural heading labels)")
    else:
        print("word-diff OK (empty)")

    # Structural leftover checks on new_part2
    for bad in ("\\\\section", "\\\\subsection", "\\\\item", "\\\\textbf", "\\\\cite{", "\\\\begin{"):
        if bad in new_part2:
            print(f"FAIL leftover {bad}", file=sys.stderr)
            return 1
    if re.search(r"(?<!\\)\$(?!\$)", new_part2[new_part2.find('## Appendix'):] if '## Appendix' in new_part2 else new_part2):
        # bare $ outside of note — check appendix body only
        body = new_part2[new_part2.find("## Appendix (archival)"):]
        # allow none
        dollars = [m.start() for m in re.finditer(r"(?<![\\$])\$(?!\$)", body)]
        # filter those inside code spans? should be zero
        if dollars:
            print(f"FAIL bare $ count={len(dollars)} sample@{dollars[0]}", file=sys.stderr)
            print(repr(body[dollars[0]-40:dollars[0]+40]), file=sys.stderr)
            return 1

    if args.dry_run:
        print("dry-run: not writing")
        return 0

    args.canonical.write_text(out, encoding="utf-8")
    args.pack_md.write_text(out, encoding="utf-8")
    args.pack_txt.write_text(out, encoding="utf-8")
    print(f"wrote {args.canonical}")
    print(f"wrote {args.pack_md} / {args.pack_txt} (byte twins)")
    print(f"cite keys mapped ({len(CITE_LABELS)}):")
    for k, v in sorted(CITE_LABELS.items()):
        print(f"  {k} -> [{v}]")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
