#!/usr/bin/env bash
# Rebuild submission PDF from canonical Part 1 Markdown.
# Choice: pandoc Part 1 → academic article TEX → XeLaTeX PDF
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
# Soft-wrap revision clauses for the title-page date line.
date_tex = date.replace("; ", ";\\\\ ")

yaml = f"""---
title: "{title}"
subtitle: "{subtitle}"
author:
  - "Diadon Acs (lead, Conscious Energies)"
date: "{date_tex}"
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

# Pre-pandoc: numeric-only \[n\] / \[n,m\] are bibliography pointers, not math.
python3 - "$BUILD/part1.md" <<'PY'
import re, sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
cite_only = re.compile(r"^[\d,\s\-–—]+$")

def repl(m: re.Match) -> str:
    inner = m.group(1).strip()
    if cite_only.match(inner):
        return f"[{inner}]"
    return m.group(0)

new, n = re.subn(r"\\\[(.+?)\\\]", repl, text, flags=re.S)
path.write_text(new, encoding="utf-8")
print(f"citation-bracket pass: converted {n and new.count('[') - text.count('[')} numeric citations (file rewritten)")
# Count how many numeric citations remain as display vs brackets
left = [m.group(1).strip() for m in re.finditer(r"\\\[(.+?)\\\]", new, flags=re.S) if cite_only.match(m.group(1).strip())]
print(f"numeric-only display math remaining: {len(left)}")
PY

pandoc "$BUILD/part1.md" \
  -f markdown+tex_math_single_backslash+pipe_tables+strikeout \
  -t latex \
  --template="$PAPER/academic.latex" \
  -o "$PAPER/A_Unified_Theoretical_Framework_for_LENR.tex"

# Inject wrapped AI contributor block after institute (page-1 overflow fix).
python3 - "$PAPER/A_Unified_Theoretical_Framework_for_LENR.tex" <<'PY'
import re, sys
from pathlib import Path

tex_path = Path(sys.argv[1])
text = tex_path.read_text(encoding="utf-8")

contributors = r"""
\begin{center}
\footnotesize
Contributing Autonomous Intelligences (disclosed):\\[0.25em]
LENR-ARA/GPT-4, GPT-5.2, Sonnet 4.5, Sonnet 4.6,\\*
Opus 4.5, Opus 4.6, Opus 4.8, Gemini 2.5, Gemini 3.0,\\*
Grok 4.6, Composer (Cursor)\\[0.35em]
\textit{Human author solely accountable for content and claims.}
\end{center}
\vspace{0.5em}
"""

# Insert after the institute center block (first \begin{center}...\end{center} after \maketitle)
pattern = re.compile(
    r"(\\maketitle\s*\\begin\{center\}.*?\\end\{center\})",
    re.S,
)
m = pattern.search(text)
if not m:
    raise SystemExit("could not locate title-page institute block for contributors inject")
text = text[: m.end()] + contributors + text[m.end() :]

# Overflow fix: make long \texttt paths/IDs breakable via \allowbreak after / _ - . =
BREAK_CHARS = set("/-._=:")

def needs_breaks(inner: str) -> bool:
    plain = inner.replace("\\_", "_").replace("\\=", "=").replace("\\ ", " ")
    if len(plain) < 18:
        return False
    if any(ch in plain for ch in "/_"):
        return True
    if plain.count("-") >= 2:
        return True
    if plain.endswith((".md", ".tex", ".py", ".json", ".lean", ".yaml", ".yml")):
        return True
    return len(plain) >= 28

def to_breakable_tt(inner: str) -> str:
    # Terminate with {} so TeX does not eat following letters into \allowbreakEC.
    br = "\\allowbreak{}"
    out: list[str] = []
    i = 0
    while i < len(inner):
        if inner.startswith("\\_", i):
            out.append("\\_" + br)
            i += 2
            continue
        if inner.startswith("\\=", i):
            out.append("=" + br)
            i += 2
            continue
        ch = inner[i]
        if ch in BREAK_CHARS:
            out.append(ch + br)
        else:
            out.append(ch)
        i += 1
    # Font switch group — \allowbreak is illegal inside \texttt{...}.
    return "{\\ttfamily " + "".join(out) + "}"

converted = 0

def path_repl(m: re.Match) -> str:
    global converted
    plain = m.group(1)
    esc = plain.replace("_", "\\_").replace("%", "\\%")
    converted += 1
    return to_breakable_tt(esc)

def tt_repl(m: re.Match) -> str:
    global converted
    inner = m.group(1)
    if not needs_breaks(inner):
        return m.group(0)
    if "\\allowbreak" in inner or "{" in inner or "}" in inner:
        return m.group(0)
    converted += 1
    return to_breakable_tt(inner)

text = re.sub(r"\\path\{([^{}]+)\}", path_repl, text)
text = re.sub(r"\\texttt\{([^{}]+)\}", tt_repl, text)
tex_path.write_text(text, encoding="utf-8")
print(f"contributors injected; breakable texttt conversions: {converted}")
PY

# Header provenance
{
  echo "% Auto-generated full Part-1 manuscript (pandoc + academic.latex)."
  echo "% Source: docs/A_Unified_Theoretical_Framework_for_LENR.md (Part 1 only; Part 2 appendix excluded)."
  echo "% Build: ./build_pdf.sh  (requires pandoc + XeLaTeX + xurl)."
  echo "% Overflow fix: breakable \\texttt via \\allowbreak; wrapped AI contributor block; secnumdepth=-1."
  echo "% Epistemic: lenr_proved=false; all EQ-OPEN-* remain OPEN; no live ship / public flip."
  echo "%"
  cat "$PAPER/A_Unified_Theoretical_Framework_for_LENR.tex"
} > "$BUILD/with_header.tex"
mv "$BUILD/with_header.tex" "$PAPER/A_Unified_Theoretical_Framework_for_LENR.tex"

JOB="A_Unified_Theoretical_Framework_for_LENR_submission"
(
  cd "$PAPER"
  set +e
  xelatex -interaction=nonstopmode -jobname="$JOB" \
    A_Unified_Theoretical_Framework_for_LENR.tex >"$BUILD/xelatex1.log"
  xelatex -interaction=nonstopmode -jobname="$JOB" \
    A_Unified_Theoretical_Framework_for_LENR.tex >"$BUILD/xelatex2.log"
  set -e
  if rg -q 'Fatal error|Emergency stop' "$BUILD/xelatex2.log"; then
    echo "XeLaTeX failed:" >&2
    rg -n 'Error|Fatal|Emergency' "$BUILD/xelatex2.log" | head -40 >&2
    exit 1
  fi
  if rg -q 'Undefined control sequence' "$BUILD/xelatex2.log"; then
    echo "XeLaTeX still has undefined control sequences:" >&2
    rg -n 'Undefined control sequence' -A2 "$BUILD/xelatex2.log" | head -30 >&2
    exit 1
  fi
  rm -f "${JOB}.aux" "${JOB}.log" "${JOB}.out" "${JOB}.toc"
  echo "Overfull summary:"
  rg -n 'Overfull \\hbox \(([0-9.]+)pt' "$BUILD/xelatex2.log" || echo "(none > threshold logged)"
  # Also show any overfulls over 5pt
  python3 - <<'PY'
import re
from pathlib import Path
log = Path("/tmp/lenr-theory-paper-pdf-build/xelatex2.log").read_text(errors="replace")
rows = []
for m in re.finditer(r"Overfull \\hbox \(([0-9.]+)pt too wide\).*?at lines ([0-9]+)", log):
    pt = float(m.group(1))
    if pt >= 5.0:
        rows.append((pt, m.group(2)))
rows.sort(reverse=True)
print("overfull >=5pt:", rows[:20] if rows else "none")
PY
)

echo "PDF: $PAPER/${JOB}.pdf"
ls -la "$PAPER/${JOB}.pdf"
