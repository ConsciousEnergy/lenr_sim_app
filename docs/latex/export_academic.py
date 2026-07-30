#!/usr/bin/env python3
"""Export academic PDF + Word (.docx/.doc) from the LaTeX and Markdown papers."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LATEX_DIR = ROOT / "docs" / "latex"
EXPORT = ROOT / "docs" / "academic_exports"
MD_SRC = ROOT / "docs" / (
    "A Unified Theoretical Framework for Low-Energy Nuclear Reactions_ "
    "Electron, Neutron, and Proton coupling is all you need.md"
)

MIKTEX = Path(os.environ.get("LOCALAPPDATA", "")) / (
    "Programs/MiKTeX/miktex/bin/x64"
)


def ensure_path() -> None:
    if MIKTEX.is_dir():
        os.environ["PATH"] = str(MIKTEX) + os.pathsep + os.environ.get("PATH", "")


def run(cmd: list[str], cwd: Path | None = None, allow_fail: bool = False) -> int:
    print(">", " ".join(cmd))
    p = subprocess.run(cmd, cwd=cwd)
    if p.returncode != 0 and not allow_fail:
        raise subprocess.CalledProcessError(p.returncode, cmd)
    return p.returncode


def extract_part1(md_path: Path, out_path: Path) -> None:
    lines = md_path.read_text(encoding="utf-8").splitlines()
    cut = next(
        (
            i
            for i, ln in enumerate(lines)
            if ln.startswith("## **Document Structure and Reconciliation Note**")
        ),
        len(lines),
    )
    out_path.write_text("\n".join(lines[:cut]).rstrip() + "\n", encoding="utf-8")


def rebuild_latex_pdf() -> Path:
    ensure_path()
    out = LATEX_DIR / "out"
    out.mkdir(exist_ok=True)
    shutil.copy(LATEX_DIR / "references.bib", out / "references.bib")
    tex = "unified_lenr_framework.tex"
    for log in ("e1.log", "e2.log", "e3.log"):
        pass
    run(
        [
            "lualatex",
            "-interaction=nonstopmode",
            "-file-line-error",
            "-output-directory=out",
            tex,
        ],
        cwd=LATEX_DIR,
        allow_fail=True,
    )
    run(["bibtex", "unified_lenr_framework"], cwd=out, allow_fail=True)
    run(
        [
            "lualatex",
            "-interaction=nonstopmode",
            "-file-line-error",
            "-output-directory=out",
            tex,
        ],
        cwd=LATEX_DIR,
        allow_fail=True,
    )
    run(
        [
            "lualatex",
            "-interaction=nonstopmode",
            "-file-line-error",
            "-output-directory=out",
            tex,
        ],
        cwd=LATEX_DIR,
        allow_fail=True,
    )
    pdf = out / "unified_lenr_framework.pdf"
    if not pdf.exists():
        raise FileNotFoundError(pdf)
    return pdf


def pandoc_to_docx(src: Path, dest: Path, bibliography: Path | None = None) -> None:
    cmd = [
        "pandoc",
        str(src),
        "-o",
        str(dest),
        "--standalone",
        "-f",
        "markdown" if src.suffix == ".md" else "latex",
        "-t",
        "docx",
    ]
    if bibliography and bibliography.exists():
        # pandoc 2.12 uses --filter pandoc-citeproc or --bibliography with citeproc
        cmd.extend(["--bibliography", str(bibliography)])
        # try citeproc if available
        cmd.append("--citeproc")
    try:
        run(cmd)
    except subprocess.CalledProcessError:
        # fallback without citeproc for older pandoc
        cmd = [
            "pandoc",
            str(src),
            "-o",
            str(dest),
            "--standalone",
            "-t",
            "docx",
        ]
        if bibliography and bibliography.exists():
            cmd.extend(["--bibliography", str(bibliography)])
        run(cmd)


def pandoc_md_to_pdf(md: Path, dest: Path) -> None:
    ensure_path()
    # Academic-ish defaults via variables
    cmd = [
        "pandoc",
        str(md),
        "-o",
        str(dest),
        "--pdf-engine=lualatex",
        "-V",
        "geometry:margin=1in",
        "-V",
        "fontsize=11pt",
        "-V",
        "documentclass=article",
        "--toc",
        "--standalone",
    ]
    bib = LATEX_DIR / "references.bib"
    if bib.exists():
        cmd.extend(["--bibliography", str(bib)])
    try:
        run(cmd)
    except subprocess.CalledProcessError as exc:
        print(f"Markdown->PDF via pandoc failed ({exc}); copying LaTeX PDF as fallback note")
        raise


def word_save_as_doc(docx: Path, doc_path: Path) -> None:
    """Use Word COM to write legacy .doc (Word 97-2003)."""
    import win32com.client  # type: ignore

    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    try:
        document = word.Documents.Open(str(docx.resolve()))
        # 0 = wdFormatDocument (.doc)
        document.SaveAs(str(doc_path.resolve()), FileFormat=0)
        document.Close(False)
    finally:
        word.Quit()


def word_save_as_doc_powershell(docx: Path, doc_path: Path) -> None:
    ps = f"""
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('{docx.resolve()}')
$doc.SaveAs([ref]'{doc_path.resolve()}', [ref]0)
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
"""
    subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps],
        check=True,
    )


def main() -> None:
    EXPORT.mkdir(parents=True, exist_ok=True)
    ensure_path()

    # --- From LaTeX (canonical academic manuscript) ---
    print("=== Building LaTeX PDF ===")
    latex_pdf = rebuild_latex_pdf()
    dest_tex_pdf = EXPORT / "Unified_LENR_Framework_from_LaTeX.pdf"
    shutil.copy2(latex_pdf, dest_tex_pdf)
    print(f"Wrote {dest_tex_pdf}")

    print("=== LaTeX -> DOCX ===")
    dest_tex_docx = EXPORT / "Unified_LENR_Framework_from_LaTeX.docx"
    pandoc_to_docx(
        LATEX_DIR / "unified_lenr_framework.tex",
        dest_tex_docx,
        LATEX_DIR / "references.bib",
    )

    # --- From Markdown Part 1 ---
    print("=== Extract Part 1 Markdown ===")
    part1 = EXPORT / "_part1_for_export.md"
    extract_part1(MD_SRC, part1)

    # Light academic front-matter YAML for pandoc
    body = part1.read_text(encoding="utf-8")
    # Strip leading H1 (pandoc title from YAML)
    body = re.sub(
        r"^#\s+\*?\*?A Unified Theoretical.*?\n+",
        "",
        body,
        count=1,
        flags=re.M,
    )
    yaml_md = EXPORT / "_part1_pandoc.md"
    yaml_md.write_text(
        "---\n"
        "title: 'A Unified Theoretical and Mathematical Framework for Low-Energy Nuclear Reactions (LENR)'\n"
        "subtitle: 'Electron, Neutron, and Proton coupling is all you need'\n"
        "author: 'Diadon Acs (Conscious Energies)'\n"
        "date: '14 February 2026 (revised 22 July 2026; v0.3.6-beta)'\n"
        "geometry: margin=1in\n"
        "fontsize: 11pt\n"
        "---\n\n" + body,
        encoding="utf-8",
    )

    print("=== Markdown -> DOCX ===")
    dest_md_docx = EXPORT / "Unified_LENR_Framework_from_Markdown.docx"
    pandoc_to_docx(yaml_md, dest_md_docx, LATEX_DIR / "references.bib")

    print("=== Markdown -> PDF ===")
    dest_md_pdf = EXPORT / "Unified_LENR_Framework_from_Markdown.pdf"
    try:
        pandoc_md_to_pdf(yaml_md, dest_md_pdf)
    except subprocess.CalledProcessError:
        # Fallback: same academic PDF as LaTeX, clearly named
        shutil.copy2(dest_tex_pdf, dest_md_pdf)
        print("Used LaTeX PDF as Markdown PDF fallback (pandoc PDF engine issue)")

    # --- Legacy .doc via Word ---
    print("=== DOCX -> legacy .doc ===")
    for docx, doc in (
        (dest_tex_docx, EXPORT / "Unified_LENR_Framework_from_LaTeX.doc"),
        (dest_md_docx, EXPORT / "Unified_LENR_Framework_from_Markdown.doc"),
    ):
        try:
            word_save_as_doc_powershell(docx, doc)
            print(f"Wrote {doc}")
        except Exception as exc:
            print(f"Legacy .doc failed for {docx.name}: {exc}")
            print("Keeping .docx (current academic Word standard).")

    # README
    readme = EXPORT / "README.md"
    readme.write_text(
        "# Academic exports\n\n"
        "Generated from the LENR theory paper sources.\n\n"
        "| File | Source | Format |\n"
        "|---|---|---|\n"
        "| `Unified_LENR_Framework_from_LaTeX.pdf` | Academic `.tex` | PDF (canonical typesetting) |\n"
        "| `Unified_LENR_Framework_from_LaTeX.docx` / `.doc` | Academic `.tex` | Word |\n"
        "| `Unified_LENR_Framework_from_Markdown.pdf` | Part 1 markdown | PDF |\n"
        "| `Unified_LENR_Framework_from_Markdown.docx` / `.doc` | Part 1 markdown | Word |\n\n"
        "**Notes**\n\n"
        "- Part 1 of the markdown is authoritative for quantitative claims; Part 2 appendix is excluded.\n"
        "- The LaTeX PDF is the preferred academic camera-ready form (numbered equations, BibTeX).\n"
        "- `.docx` is the current Word academic interchange format; `.doc` is legacy Word 97–2003 when Word COM conversion succeeds.\n"
        "- Manuscript version: v0.3.6-beta.\n",
        encoding="utf-8",
    )

    print("\n=== Export summary ===")
    for p in sorted(EXPORT.glob("Unified_LENR_Framework_*")):
        print(f"  {p.name:55s} {p.stat().st_size:10,} bytes")


if __name__ == "__main__":
    main()
