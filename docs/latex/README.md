# Academic LaTeX manuscript — Unified LENR Theoretical Framework

Converted from Part 1 of:

`docs/A Unified Theoretical Framework for Low-Energy Nuclear Reactions_ Electron, Neutron, and Proton coupling is all you need.md`

Part 2 (escaped LaTeX appendix) is excluded; Part 1 is the quantitative source of truth.

## Academic format features

- `article` class with `authblk` affiliations and corresponding-author thanks
- Abstract → keywords → table of contents
- Auto-numbered sections (manual `1.` / `2.1` prefixes stripped)
- Numbered `equation` environments for display math
- Numeric `natbib` citations (`\cite{fleischmann1989}`) mapped from markdown `[1,4]`
- BibTeX database: `references.bib`
- Running headers via `fancyhdr`
- LuaLaTeX (Unicode-safe)

## Build (LaTeX Workshop)

1. Open `unified_lenr_framework.tex`
2. Save, or run **LaTeX Workshop: Build LaTeX project**
3. Default recipe: `lualatex → bibtex → lualatex × 2` (Perl/`latexmk` not required)

PDF: `out/unified_lenr_framework.pdf`

## Rebuild from markdown

```powershell
$src = "..\A Unified Theoretical Framework for Low-Energy Nuclear Reactions_ Electron, Neutron, and Proton coupling is all you need.md"
$lines = Get-Content -LiteralPath $src -Encoding UTF8
$cut = ($lines | Select-String -Pattern '^## \*\*Document Structure and Reconciliation Note\*\*' | Select-Object -First 1).LineNumber
$lines[0..($cut-2)] | Set-Content -LiteralPath "_part1_source.md" -Encoding UTF8
python md_to_latex.py
python build_academic.py
```
