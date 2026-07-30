#!/usr/bin/env python3
"""Continue academic exports (DOCX/DOC/Markdown PDF) assuming LaTeX PDF already copied."""

from __future__ import annotations

import re
import shutil
import subprocess
from pathlib import Path

import export_academic as e

e.EXPORT.mkdir(parents=True, exist_ok=True)
e.ensure_path()

dest_tex_pdf = e.EXPORT / "Unified_LENR_Framework_from_LaTeX.pdf"
if not dest_tex_pdf.exists():
    src = e.LATEX_DIR / "out" / "unified_lenr_framework.pdf"
    shutil.copy2(src, dest_tex_pdf)
print("latex pdf:", dest_tex_pdf.stat().st_size)

print("=== LaTeX -> DOCX ===")
dest_tex_docx = e.EXPORT / "Unified_LENR_Framework_from_LaTeX.docx"
e.pandoc_to_docx(
    e.LATEX_DIR / "unified_lenr_framework.tex",
    dest_tex_docx,
    e.LATEX_DIR / "references.bib",
)

print("=== Extract Part 1 ===")
part1 = e.EXPORT / "_part1_for_export.md"
e.extract_part1(e.MD_SRC, part1)
body = part1.read_text(encoding="utf-8")
body = re.sub(
    r"^#\s+\*?\*?A Unified Theoretical.*?\n+",
    "",
    body,
    count=1,
    flags=re.M,
)
yaml_md = e.EXPORT / "_part1_pandoc.md"
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
dest_md_docx = e.EXPORT / "Unified_LENR_Framework_from_Markdown.docx"
e.pandoc_to_docx(yaml_md, dest_md_docx, e.LATEX_DIR / "references.bib")

print("=== Markdown -> PDF ===")
dest_md_pdf = e.EXPORT / "Unified_LENR_Framework_from_Markdown.pdf"
try:
    e.pandoc_md_to_pdf(yaml_md, dest_md_pdf)
except subprocess.CalledProcessError as ex:
    print("md pdf failed:", ex)
    shutil.copy2(dest_tex_pdf, dest_md_pdf)
    print("copied LaTeX PDF as markdown PDF fallback")

print("=== DOCX -> DOC ===")
for docx, doc in (
    (dest_tex_docx, e.EXPORT / "Unified_LENR_Framework_from_LaTeX.doc"),
    (dest_md_docx, e.EXPORT / "Unified_LENR_Framework_from_Markdown.doc"),
):
    try:
        e.word_save_as_doc_powershell(docx, doc)
        print("Wrote", doc.name, doc.stat().st_size)
    except Exception as ex:
        print("doc failed", docx.name, ex)

readme = e.EXPORT / "README.md"
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
    "- `.docx` is the current Word academic interchange format; `.doc` is legacy Word 97-2003 when Word COM conversion succeeds.\n"
    "- Manuscript version: v0.3.6-beta.\n",
    encoding="utf-8",
)

print("=== DONE ===")
for p in sorted(e.EXPORT.glob("Unified_LENR_Framework_*")):
    print(f"{p.name:55s} {p.stat().st_size:10d}")
