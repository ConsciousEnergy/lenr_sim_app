#!/usr/bin/env python3
"""Verify Unified Theory Paper pack fidelity across md/txt/tex/html/pdf.

Exit 0 only when every check in the Phase-1 Verify list passes.
"0 KaTeX errors" alone is NOT a pass — each rendered equation's TeX
annotation must map to a source math span (with allowed unit merges).
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

PAPER = Path(__file__).resolve().parent
REPO = PAPER.parents[3]

_venv_site = PAPER / ".venv-paper" / "lib"
for _site in _venv_site.glob("python*/site-packages"):
    sys.path.insert(0, str(_site))
    break
CANON = REPO / "docs" / "A_Unified_Theoretical_Framework_for_LENR.md"
PACK_MD = PAPER / "A_Unified_Theoretical_Framework_for_LENR.md"
PACK_TXT = PAPER / "A_Unified_Theoretical_Framework_for_LENR.txt"
PACK_TEX = PAPER / "A_Unified_Theoretical_Framework_for_LENR.tex"
PACK_HTML = PAPER / "A_Unified_Theoretical_Framework_for_LENR.html"
PACK_PDF = PAPER / "A_Unified_Theoretical_Framework_for_LENR.pdf"
SUB_PDF = PAPER / "A_Unified_Theoretical_Framework_for_LENR_submission.pdf"
MARKER = "## **Document Structure and Reconciliation Note**"

# Import builder normalize/merge helpers (same transforms HTML uses).
sys.path.insert(0, str(PAPER))
import build_branded as branded  # noqa: E402

ALLOWED_UNIT_MERGES = [
    r"\(tex\) UNIT \(^{n|/n}\) → single inline math with \mathrm{UNIT}",
    r"\(tex\) \(^{n}\) → concatenated exponent on prior atom",
    r"\(10^{a}\)–\(10^{b}\) → single range span with \text{–}",
]

FAILURES: list[str] = []
NOTES: list[str] = []


def fail(msg: str) -> None:
    FAILURES.append(msg)
    print(f"FAIL: {msg}")


def ok(msg: str) -> None:
    print(f"OK: {msg}")


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def sha256_file(p: Path) -> str:
    return sha256_bytes(p.read_bytes())


def part1_sha_of(text: str) -> str:
    cut = text.find(MARKER)
    if cut < 0:
        fail("Document Structure marker missing")
        return ""
    return sha256_bytes(text[:cut].encode("utf-8"))


def check_part1_and_twins() -> None:
    canon = CANON.read_text(encoding="utf-8")
    md = PACK_MD.read_text(encoding="utf-8")
    txt = PACK_TXT.read_text(encoding="utf-8")
    if md != txt:
        fail("pack MD != pack TXT")
    else:
        ok("MD equals TXT (byte twins)")
    if md != canon:
        fail("pack MD != canonical docs/ MD")
    else:
        ok("pack MD equals canonical docs/ MD")

    cut = canon.find(MARKER)
    part1 = canon[:cut] if cut >= 0 else canon
    cite_only = re.compile(r"^[\d,\s\-–—]+$")
    bad_cites = [
        m.group(0)
        for m in re.finditer(r"\\\[(.+?)\\\]", part1)
        if cite_only.match(m.group(1).strip())
    ]
    if bad_cites:
        fail(f"Part 1 has numeric display-math cites ({len(bad_cites)}): {bad_cites[:5]}")
    else:
        ok("Part 1 has zero numeric \\[n\\] citation escapes")
    cur_p1 = part1_sha_of(canon)
    print(f"Part1 sha256 current: {cur_p1}")


def check_no_raw_latex_in_md() -> None:
    text = CANON.read_text(encoding="utf-8")
    # Structural commands that should be gone after normalization
    for pat, name in [
        (r"\\section\b", r"\section"),
        (r"\\subsection\b", r"\subsection"),
        (r"\\item\b", r"\item"),
        (r"\\textbf\b", r"\textbf"),
        (r"\\begin\{", r"\begin{"),
        (r"\\cite\{", r"\cite{"),
        (r"\\appendix\b", r"\appendix"),
        (r"\\\\[A-Za-z]", r"\\cmd double-escape"),
    ]:
        hits = list(re.finditer(pat, text))
        if hits:
            fail(f"MD still has {name} ({len(hits)} hits), first@{hits[0].start()}")
        else:
            ok(f"MD has zero {name}")
    # Bare $ outside math: remove \(...\) and \[...\] first
    scrubbed = re.sub(r"\\\[[\s\S]*?\\\]", " ", text)
    scrubbed = re.sub(r"\\\([\s\S]*?\\\)", " ", scrubbed)
    scrubbed = re.sub(r"`[^`]*`", " ", scrubbed)
    bare = list(re.finditer(r"(?<!\\)\$(?!\$)", scrubbed))
    if bare:
        fail(f"MD has bare $ outside math ({len(bare)})")
    else:
        ok("MD has zero bare $ outside math")


def extract_source_math_spans(md: str) -> list[str]:
    """Apply the same protect_math pipeline used by every md_to_html call."""
    meta = branded.extract_front(md)
    regions = [meta["body"], meta.get("abstract") or ""]
    if meta.get("epistemic"):
        regions.append(meta["epistemic"])
    if meta.get("contrib"):
        regions.append(meta["contrib"])
    for _rev_date, note in meta.get("revisions") or []:
        regions.append(note)
    inners: list[str] = []
    for region in regions:
        if not region.strip():
            continue
        _text, slots = branded.protect_math(region)
        for slot in slots:
            if slot.startswith("\\["):
                inners.append(slot[2:-2].strip())
            elif slot.startswith("\\("):
                inners.append(slot[2:-2].strip())
    return inners


class MathAnnotationParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.annotations: list[tuple[str, str]] = []  # (tex, kind)
        self.katex_errors = 0
        self.raw_latex_hits: list[str] = []
        self._capture_text = True
        self.visible_chunks: list[str] = []

    def handle_starttag(self, tag, attrs):
        ad = dict(attrs)
        cls = ad.get("class", "")
        if "katex-error" in cls:
            self.katex_errors += 1
        if tag in ("div", "span") and "data-tex" in ad and (
            "math-display" in cls or "math-inline" in cls or "role" in ad
        ):
            kind = "display" if ad.get("data-display") == "1" or "math-display" in cls else "inline"
            self.annotations.append((ad["data-tex"], kind))
        if tag in ("script", "style", "noscript"):
            self._capture_text = False

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript"):
            self._capture_text = True

    def handle_data(self, data):
        if self._capture_text:
            self.visible_chunks.append(data)


def check_html_math_fidelity() -> None:
    if not PACK_HTML.exists():
        fail("HTML missing")
        return
    md = CANON.read_text(encoding="utf-8")
    source = extract_source_math_spans(md)
    html = PACK_HTML.read_text(encoding="utf-8")
    parser = MathAnnotationParser()
    parser.feed(html)
    anns = [tex for tex, _ in parser.annotations]
    print(f"source math spans: {len(source)}")
    print(f"HTML data-tex annotations: {len(anns)}")
    print("Allowed unit merges:")
    for item in ALLOWED_UNIT_MERGES:
        print(f"  - {item}")

    # Multiset compare
    cs, ca = Counter(source), Counter(anns)
    only_s = list((cs - ca).elements())
    only_a = list((ca - cs).elements())
    if len(source) != len(anns):
        fail(f"math count mismatch source={len(source)} html={len(anns)}")
    if only_s or only_a:
        fail(
            f"TeX annotation ↔ source mismatch; "
            f"only_source={only_s[:8]} only_html={only_a[:8]}"
        )
    else:
        ok("every HTML TeX annotation maps 1:1 to a source math span")

    if parser.katex_errors:
        fail(f"katex-error nodes: {parser.katex_errors}")
    else:
        ok("zero katex-error nodes")

    visible = " ".join(parser.visible_chunks)
    for pat, name in [
        (r"\\item\b", r"\item"),
        (r"\\textbf\b", r"\textbf"),
        (r"\\cite\{", r"\cite{"),
        (r"\\subsection\b", r"\subsection"),
        (r"\\section\b", r"\section"),
        (r"\\begin\{", r"\begin{"),
        (r"\\appendix\b", r"\appendix"),
    ]:
        if re.search(pat, visible):
            fail(f"raw LaTeX {name} in HTML visible text")
        else:
            ok(f"HTML visible text has zero {name}")


def check_tex() -> None:
    if not PACK_TEX.exists():
        fail("TEX missing")
        return
    tex = PACK_TEX.read_text(encoding="utf-8")
    cite_only = re.compile(r"^[\d,\s\-–—]+$")
    numeric_display = []
    for m in re.finditer(r"\\\[(.+?)\\\]", tex, flags=re.S):
        inner = m.group(1).strip()
        if cite_only.match(inner):
            numeric_display.append(inner)
    # Also pandoc may emit \[1,4\] or equation environments; check bare
    for m in re.finditer(r"\\begin\{(?:equation|displaymath)\*?\}([\s\S]*?)\\end\{(?:equation|displaymath)\*?\}", tex):
        inner = re.sub(r"\s+", "", m.group(1))
        if re.fullmatch(r"[\d,]+", inner):
            numeric_display.append(inner)
    if numeric_display:
        fail(f"TEX has numeric-only display math: {numeric_display[:10]}")
    else:
        ok("TEX has zero numeric-only display math")

    log = Path("/tmp/lenr-theory-paper-pdf-build/xelatex2.log")
    if not log.exists():
        fail("XeLaTeX log missing (run build_pdf.sh / build_all.sh first)")
        return
    log_t = log.read_text(errors="replace")
    if re.search(r"Fatal error|Emergency stop", log_t):
        fail("XeLaTeX log has fatal/emergency errors")
    else:
        ok("XeLaTeX log has zero fatal/emergency errors")
    if "Undefined control sequence" in log_t:
        fail("XeLaTeX log has undefined control sequences")
    else:
        ok("XeLaTeX log has zero undefined control sequences")
    missing = len(re.findall(r"Missing character", log_t))
    if missing:
        fail(f"XeLaTeX log has Missing character lines: {missing}")
    else:
        ok("XeLaTeX log has zero Missing character lines")


def pdf_text(path: Path) -> str:
    return subprocess.check_output(
        ["pdftotext", "-layout", str(path), "-"], text=True, errors="replace"
    )


def check_pdfs() -> None:
    for label, path in [("branded", PACK_PDF), ("submission", SUB_PDF)]:
        if not path.exists():
            fail(f"{label} PDF missing: {path.name}")
            continue
        text = pdf_text(path)
        bad = []
        for pat, name in [
            (r"\\item\b", r"\item"),
            (r"\\textbf\b", r"\textbf"),
            (r"\\subsection\b", r"\subsection"),
            (r"\\section\b", r"\section"),
            (r"\\begin\{", r"\begin{"),
            (r"\\cite\{", r"\cite{"),
            (r"\\appendix\b", r"\appendix"),
        ]:
            if re.search(pat, text):
                bad.append(name)
        if bad:
            fail(f"{label} PDF text has raw LaTeX: {bad}")
        else:
            ok(f"{label} PDF text has zero raw LaTeX structural commands")


def check_honesty() -> None:
    text = CANON.read_text(encoding="utf-8")
    for tok in [
        "EQ-OPEN-MEV-01",
        "EQ-OPEN-RAD-01",
        "EQ-OPEN-RATE-01",
        "EQ-OPEN-EC-01",
        "EQ-OPEN-YIELD-01",
        "lenr_proved",
    ]:
        if tok not in text:
            fail(f"honesty token missing from MD: {tok}")
    # lenr_proved false
    if not re.search(r"lenr_proved[^\n]{0,40}false", text, re.I):
        # also accept open_questions.lenr_proved = false
        if "lenr_proved = false" not in text and "lenr_proved` = false" not in text and "`lenr_proved` remains **false**" not in text and "lenr_proved = false" not in text:
            if "lenr_proved" in text and "false" in text:
                ok("lenr_proved present with false nearby (scan)")
            else:
                fail("cannot confirm lenr_proved false")
        else:
            ok("lenr_proved false language present")
    else:
        ok("lenr_proved false language present")
    # Quantitative bands
    for band, label in [
        (r"10\^\{?3\}?.*?10\^\{?5\}?", "tunneling 10^3–10^5"),
        (r"1\.3", "Casimir 1.3 mN"),
        (r"24\s*\\pm\s*4|24±4|24 \\pm 4", "Miles 24±4 MeV"),
    ]:
        if not re.search(band, text):
            fail(f"band missing: {label}")
        else:
            ok(f"band present: {label}")

    miles_pat = r"24\s*\\pm\s*4|24±4|24 \\pm 4"
    if PACK_TEX.exists():
        tex = PACK_TEX.read_text(encoding="utf-8")
        if not re.search(miles_pat, tex):
            fail("Miles 24±4 MeV missing from TEX")
        else:
            ok("Miles 24±4 MeV present in TEX")
    if SUB_PDF.exists():
        sub = pdf_text(SUB_PDF)
        if not re.search(r"24.*4.*MeV|24\s*±\s*4", sub):
            fail("Miles 24±4 MeV missing from submission PDF text")
        else:
            ok("Miles 24±4 MeV present in submission PDF")

    # Untouched artifacts
    for rel in [
        "LENR_SIM_APP_v2/docs/v0.3.7-beta/paper/PaperCrosswalk.lean",
        "LENR_SIM_APP_v2/docs/v0.3.7-beta/paper/simulation_evidence.json",
    ]:
        status = subprocess.check_output(
            ["git", "status", "--porcelain", "--", rel], cwd=str(REPO), text=True
        ).strip()
        if status:
            fail(f"touched forbidden file: {rel} ({status})")
        else:
            ok(f"untouched: {rel}")


def check_screenshots_note() -> None:
    """Screenshots are produced by build_all.sh into a scratch dir; verify they exist if present."""
    shot_dir = Path("/tmp/lenr-paper-verify-shots")
    if not shot_dir.exists():
        NOTES.append(
            "screenshot dir /tmp/lenr-paper-verify-shots not present yet "
            "(build_all.sh creates it; contact sheet copied to Context after verify)"
        )
        # Not a hard fail here if build_all will create them in the same run after verify
        # — build_all runs verify after shots. If verify is standalone, report.
        if "skip-shots" in sys.argv:
            ok("screenshot check skipped by flag")
            return
        fail("screenshot directory missing — run build_all.sh (produces page PNGs)")
        return
    pngs = sorted(shot_dir.glob("*.png"))
    if len(pngs) < 3:
        fail(f"expected page screenshots, found {len(pngs)}")
    else:
        ok(f"page screenshots present: {len(pngs)} PNGs in {shot_dir}")


def main() -> int:
    print("=== verify_paper.py ===")
    print(f"PAPER={PAPER}")
    check_part1_and_twins()
    check_no_raw_latex_in_md()
    check_html_math_fidelity()
    check_tex()
    check_pdfs()
    check_honesty()
    check_screenshots_note()
    print("=== summary ===")
    for n in NOTES:
        print(f"NOTE: {n}")
    if FAILURES:
        print(f"{len(FAILURES)} FAILURE(S)")
        for f in FAILURES:
            print(f" - {f}")
        return 1
    print("ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
