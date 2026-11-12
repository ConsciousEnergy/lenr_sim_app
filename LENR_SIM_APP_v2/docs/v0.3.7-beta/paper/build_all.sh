#!/usr/bin/env bash
# One-command rebuild of all Unified Theory Paper pack formats from the canonical MD.
set -euo pipefail

PAPER="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$PAPER/../../../.." && pwd)"
CANON="$ROOT/docs/A_Unified_Theoretical_Framework_for_LENR.md"
BUILD="${TMPDIR:-/tmp}/lenr-theory-paper-pdf-build"
SHOTS="${TMPDIR:-/tmp}/lenr-paper-verify-shots"
SERVE="${TMPDIR:-/tmp}/lenr-paper-serve"
NODE="/exec-daemon/node"
[[ -x "$NODE" ]] || NODE="$(command -v node)"

cd "$PAPER"

PAPER_VENV="$PAPER/.venv-paper"
if [[ -f "$PAPER/requirements.txt" ]]; then
  if [[ ! -x "$PAPER_VENV/bin/python" ]]; then
    python3 -m venv "$PAPER_VENV"
    "$PAPER_VENV/bin/pip" install -q -r "$PAPER/requirements.txt"
  fi
  export PATH="$PAPER_VENV/bin:$PATH"
fi

echo "==> 0. Sync pack MD/TXT twins from canonical"
python3 - <<PY
from pathlib import Path
canon = Path("$CANON").read_text(encoding="utf-8")
Path("$PAPER/A_Unified_Theoretical_Framework_for_LENR.md").write_text(canon, encoding="utf-8")
Path("$PAPER/A_Unified_Theoretical_Framework_for_LENR.txt").write_text(canon, encoding="utf-8")
print("twins synced", len(canon))
PY

echo "==> 1. Submission TEX + _submission.pdf (Part 1 only)"
bash "$PAPER/build_pdf.sh"

echo "==> 2. Branded HTML (KaTeX pre-render)"
python3 "$PAPER/build_branded.py"

echo "==> 3. Branded PDF (Chrome print of pre-rendered HTML)"
rm -rf "$SERVE"
mkdir -p "$SERVE"
cp "$PAPER/A_Unified_Theoretical_Framework_for_LENR.html" "$SERVE/index.html"
# KaTeX CSS/fonts referenced from CDN in HTML — network needed for print fonts;
# pre-rendered HTML still embeds katex HTML so layout works offline for math nodes.
"$NODE" "$PAPER/print_pdf.mjs" "$SERVE" "$PAPER/A_Unified_Theoretical_Framework_for_LENR.pdf"

echo "==> 4. Page screenshots (appendix + display-math pages)"
rm -rf "$SHOTS"
mkdir -p "$SHOTS"
"$NODE" "$PAPER/screenshot_pages.mjs" "$SERVE" "$SHOTS" \
  "$PAPER/A_Unified_Theoretical_Framework_for_LENR.pdf" \
  "$PAPER/A_Unified_Theoretical_Framework_for_LENR_submission.pdf"

echo "==> 5. verify_paper.py"
python3 "$PAPER/verify_paper.py"

echo "==> build_all done"
ls -la "$PAPER"/A_Unified_Theoretical_Framework_for_LENR.{md,txt,tex,html,pdf} \
  "$PAPER"/A_Unified_Theoretical_Framework_for_LENR_submission.pdf
