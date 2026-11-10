#!/usr/bin/env bash
# Rebuild submission PDF from canonical Part 1 Markdown.
# Choice: pandoc Part 1 → academic article TEX → XeLaTeX PDF
# (full manuscript; not the historical short skeleton).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
PAPER="$(cd "$(dirname "$0")" && pwd)"
CANON="$ROOT/docs/A_Unified_Theoretical_Framework_for_LENR.md"
BUILD="${TMPDIR:-/tmp}/lenr-theory-paper-pdf-build"
mkdir -p "$BUILD"

python3 - "$CANON" "$BUILD/part1.md" <<'PY'
import re, sys
from pathlib import Path

src = Path(sys.argv[1]).read_text(encoding="utf-8")
out = Path(sys.argv[2])
cut = src.find("## **Document Structure and Reconciliation Note**")
if cut < 0:
    raise SystemExit("Part 1 boundary (Document Structure note) not found")
part1 = src[:cut].rstrip() + "\n"

def grab(label: str, text: str) -> str:
    m = re.search(rf"\*\*{re.escape(label)}:\*\*\s*(.+)", text)
    return m.group(1).strip() if m else ""

title = "A Unified Theoretical and Mathematical Framework for Low-Energy Nuclear Reactions (LENR)"
subtitle = grab("Subtitle", part1) or "Coupling is all you need"
date_m = re.search(r"^Date:\s*(.+)$", part1, re.M)
org_m = re.search(r"^Organization:\s*(.+)$", part1, re.M)
date = date_m.group(1).strip() if date_m else "2026-02-14"
org = org_m.group(1).strip() if org_m else "Conscious Energies"
abs_m = re.search(r"\*\*Abstract\*\*\s*\n(.+?)(?:\n---|\n## )", part1, re.S)
abstract = abs_m.group(1).strip() if abs_m else ""
body_start = part1.find("## **1")
if body_start < 0:
    raise SystemExit("Section 1 not found")
body = part1[body_start:]

def clean_heading(m: re.Match) -> str:
    text = m.group(2).replace("\\.", ".")
    text = re.sub(r"\*\*", "", text)
    return f"{m.group(1)} {text.strip()}"

body = re.sub(r"^(#{1,6})\s+\*\*(.+?)\*\*\s*$", clean_heading, body, flags=re.M)
body = re.sub(
    r"^(#{1,6})\s+(.+)$",
    lambda m: f"{m.group(1)} {m.group(2).replace(chr(92) + '.', '.').strip()}",
    body,
    flags=re.M,
)
honesty = (
    "\n> **Epistemic posture (submission).** Exploratory models only. "
    "Claim-tiered outputs. `lenr_proved` remains **false**. All five "
    "`EQ-OPEN-*` obligations (`EQ-OPEN-MEV-01`, `EQ-OPEN-RAD-01`, "
    "`EQ-OPEN-RATE-01`, `EQ-OPEN-EC-01`, `EQ-OPEN-YIELD-01`) remain **OPEN**. "
    "Cavitation–collapse hydrodynamics is **modelled enhancement / contested hydro**, "
    "not nuclear-rate proof.\n\n"
)
body = honesty + body
abs_yaml = "\n".join(("  " + ln) if ln else "  " for ln in abstract.splitlines())
yaml = f"""---
title: "{title}"
subtitle: "{subtitle}"
author:
  - "Diadon Acs (lead, Conscious Energies)"
  - "Contributing AIs (disclosed): LENR-ARA/GPT-4, GPT-5.2, Sonnet 4.5/4.6, Opus 4.5/4.6/4.8, Gemini 2.5/3.0, Grok 4.6, Composer (Cursor); human author solely accountable"
date: "{date}"
institute: "{org}"
keywords:
  - LENR
  - electron–neutron–proton coupling
  - Rydberg Matter
  - quantum tunneling
  - Casimir
  - claim tiers
abstract: |
{abs_yaml}
---

"""
out.write_text(yaml + body, encoding="utf-8")
print(f"wrote {out} ({out.stat().st_size} bytes)")
PY

pandoc "$BUILD/part1.md" \
  -f markdown+tex_math_single_backslash+pipe_tables+strikeout \
  -t latex \
  --template="$PAPER/academic.latex" \
  -o "$PAPER/A_Unified_Theoretical_Framework_for_LENR.tex"

# Header provenance for the committed TEX
{
  echo "% Auto-generated full Part-1 manuscript (pandoc + academic.latex)."
  echo "% Source: docs/A_Unified_Theoretical_Framework_for_LENR.md (Part 1 only; Part 2 appendix excluded)."
  echo "% Build: ./build_pdf.sh  (requires pandoc + XeLaTeX)."
  echo "% Epistemic: lenr_proved=false; all EQ-OPEN-* remain OPEN; no live ship / public flip."
  echo "%"
  cat "$PAPER/A_Unified_Theoretical_Framework_for_LENR.tex"
} > "$BUILD/with_header.tex"
mv "$BUILD/with_header.tex" "$PAPER/A_Unified_Theoretical_Framework_for_LENR.tex"

(
  cd "$PAPER"
  xelatex -interaction=nonstopmode A_Unified_Theoretical_Framework_for_LENR.tex >/dev/null
  xelatex -interaction=nonstopmode A_Unified_Theoretical_Framework_for_LENR.tex >/dev/null
  rm -f A_Unified_Theoretical_Framework_for_LENR.aux \
        A_Unified_Theoretical_Framework_for_LENR.log \
        A_Unified_Theoretical_Framework_for_LENR.out \
        A_Unified_Theoretical_Framework_for_LENR.toc
)

echo "PDF: $PAPER/A_Unified_Theoretical_Framework_for_LENR.pdf"
ls -la "$PAPER/A_Unified_Theoretical_Framework_for_LENR.pdf"
