# Unified Theory Paper — provenance (v0.3.7-beta)

**Purpose.** Academic archival pack for *A Unified Theoretical and Mathematical Framework for Low-Energy Nuclear Reactions (LENR)* in five formats, aligned with companion-software simulation evidence and Lean/IR mathematical modeling.

| Format | Path |
|--------|------|
| Markdown | [`A_Unified_Theoretical_Framework_for_LENR.md`](./A_Unified_Theoretical_Framework_for_LENR.md) (synced from [`docs/A_Unified_Theoretical_Framework_for_LENR.md`](../../../../docs/A_Unified_Theoretical_Framework_for_LENR.md)) |
| Plain text | [`A_Unified_Theoretical_Framework_for_LENR.txt`](./A_Unified_Theoretical_Framework_for_LENR.txt) (byte twin of the Markdown) |
| HTML | [`A_Unified_Theoretical_Framework_for_LENR.html`](./A_Unified_Theoretical_Framework_for_LENR.html) — Conscious Energies branded, KaTeX pre-rendered (`build_branded.py`) |
| LaTeX | [`A_Unified_Theoretical_Framework_for_LENR.tex`](./A_Unified_Theoretical_Framework_for_LENR.tex) — **full Part 1 manuscript** (pandoc + [`academic.latex`](./academic.latex); rebuild via [`build_pdf.sh`](./build_pdf.sh)); OPEN/ENG stubs remain under [`../latex/`](../latex/) |
| PDF (branded) | [`A_Unified_Theoretical_Framework_for_LENR.pdf`](./A_Unified_Theoretical_Framework_for_LENR.pdf) — Chrome print of the branded HTML (includes normalized Part 2 archival appendix) |
| PDF (submission) | [`A_Unified_Theoretical_Framework_for_LENR_submission.pdf`](./A_Unified_Theoretical_Framework_for_LENR_submission.pdf) — XeLaTeX Part 1 only (title + subtitle *Coupling is all you need*; Part 2 excluded) |
| Lean crosswalk | [`PaperCrosswalk.lean`](./PaperCrosswalk.lean) (authoritative build: [`formalization/lean/LenrFormal/PaperCrosswalk.lean`](../../../../formalization/lean/LenrFormal/PaperCrosswalk.lean)) |

**2026-11-10 PDF submission build.** Pack `.tex` expanded from short skeleton → compileable full Part 1 manuscript via pandoc from the canonical MD (Part 1 only), academic `article` class template, XeLaTeX. Committed PDF ≈ 0.27 MB / ~40 pages. Does **not** close `EQ-OPEN-*`, set `lenr_proved`, or imply live ship / public flip.

**2026-11-11 EQ-OPEN peer-review refresh.** Part 1 MD/TXT + Lean `PaperCrosswalk` synced to EQ-OPEN bound swarm honesty (#356/#350): §5A BOUNDED/form-/class-DISPROVEN/GAP language; methods epistemic map; `paperRevision=v0.3.7-beta-2026-11-11-eq-open-peer-review`. Pack TEX/PDF rebuilt via `build_pdf.sh` on the same PR. Still **no** OPEN closures; `lenr_proved` false; hydro≠nuclear; no version-marker bump / live ship.

**2026-11-11 multidisciplinary coherence pass.** Part 1 prose claim-tier voice aligned (academic + experimental + software): §5.2 retitled to reported/contested correlations; experimental vs modelled vs aspirational labels tightened; Pyyhtiä kept beside Taleyarkhan/Mulnix/SPAWAR without nuclear overclaim; Lean `paperRevision=v0.3.7-beta-2026-11-11-coherence`; formats list includes PDF. Still **no** OPEN closures; `lenr_proved` false; no version-marker bump / live ship.


**2026-11-11 Part 2 appendix formatting (structure only).** Canonical MD Part 2 escaped-LaTeX appendix normalized to Markdown math via Part-2-only [`normalize_appendix.py`](./normalize_appendix.py). Part 1 sha256 unchanged vs `origin/main` (`33c7796ac9e8a36b42a00d6592fd122188990161d470354ffc3e4312149291af`). No wording changes in Part 2 (word-level markup-stripped diff empty aside from `\cite{key}` → `[Author Year]` labels). Reconciliation note sentence that Part 2 “may render poorly in Markdown viewers” is **retained as written** (now historically stale after normalization; flagged, not edited). Branded HTML/PDF builders + [`verify_paper.py`](./verify_paper.py) + [`build_all.sh`](./build_all.sh) committed. Submission PDF moved to `_submission.pdf` so it no longer collides with the branded `.pdf`. Still **no** OPEN closures; `lenr_proved` false; no version-marker bump / live ship.

### Phase 1 formatting fixes (2026-11-12)

Part 1 only: 14 numeric `\[n,m\]` bibliography escapes → plain `[n,m]` in canonical MD + pack twins (display math `\[...\]` unchanged; `re.S` disabled on citation passes). Part 2: removed stray `\appendix` before “Mathematical Symbols…”. Submission: `newunicodechar` map in [`academic.latex`](./academic.latex) for Greek/superscripts/subscripts; Miles \(24\pm4\,\mathrm{MeV}\) in honesty block + template footnotes. HTML: KaTeX CDN **0.16.47** (pinned in `package.json`); mobile/wide-eq overflow CSS. Repro: [`requirements.txt`](./requirements.txt) + `.venv-paper` in [`build_all.sh`](./build_all.sh). Part 1 sha256 (post cite fix): `59f8bf5a6d33257576877ab0ef6fde685cfd39b95fbd98694ba7f24af1ca82bd`. Still **no** OPEN closures; `lenr_proved` false.

### verify_paper.py (2026-11-12)

```
=== verify_paper.py ===
ALL CHECKS PASSED
```

(Full log: `build_all.sh` → step 5; includes zero `\appendix`, zero numeric Part 1 cite escapes, zero XeLaTeX Missing character, Miles band in TEX + submission PDF, 658/658 HTML math fidelity.)

### verify_paper.py (2026-11-11)

```
=== verify_paper.py ===
PAPER=/agent/repos/lenr_sim_app/LENR_SIM_APP_v2/docs/v0.3.7-beta/paper
OK: MD equals TXT (byte twins)
OK: pack MD equals canonical docs/ MD
Part1 sha256 origin/main: 33c7796ac9e8a36b42a00d6592fd122188990161d470354ffc3e4312149291af
Part1 sha256 current:     33c7796ac9e8a36b42a00d6592fd122188990161d470354ffc3e4312149291af
OK: Part 1 sha256 equals origin/main
OK: MD has zero \section
OK: MD has zero \subsection
OK: MD has zero \item
OK: MD has zero \textbf
OK: MD has zero \begin{
OK: MD has zero \cite{
OK: MD has zero \\cmd double-escape
OK: MD has zero bare $ outside math
source math spans: 658
HTML data-tex annotations: 658
Allowed unit merges:
  - \(tex\) UNIT \(^{n|/n}\) → single inline math with \mathrm{UNIT}
  - \(tex\) \(^{n}\) → concatenated exponent on prior atom
  - \(10^{a}\)–\(10^{b}\) → single range span with \text{–}
OK: every HTML TeX annotation maps 1:1 to a source math span
OK: zero katex-error nodes
OK: HTML visible text has zero \item
OK: HTML visible text has zero \textbf
OK: HTML visible text has zero \cite{
OK: HTML visible text has zero \subsection
OK: HTML visible text has zero \section
OK: HTML visible text has zero \begin{
OK: TEX has zero numeric-only display math
OK: XeLaTeX log has zero fatal/emergency errors
OK: XeLaTeX log has zero undefined control sequences
OK: branded PDF text has zero raw LaTeX structural commands
OK: submission PDF text has zero raw LaTeX structural commands
OK: lenr_proved false language present
OK: band present: tunneling 10^3–10^5
OK: band present: Casimir 1.3 mN
OK: band present: Miles 24±4 MeV
OK: untouched: LENR_SIM_APP_v2/docs/v0.3.7-beta/paper/PaperCrosswalk.lean
OK: untouched: LENR_SIM_APP_v2/docs/v0.3.7-beta/paper/simulation_evidence.json
OK: page screenshots present: 113 PNGs in /tmp/lenr-paper-verify-shots
=== summary ===
ALL CHECKS PASSED
```


## Hard invariants

- `lenr_proved: false`
- All five `EQ-OPEN-*` remain **OPEN**
- No quantitative band changes in the 2026-09-25 revision (tunneling \(10^3\)–\(10^5\); Casimir \(-1.3\,\mathrm{mN}\); Miles \(24\pm4\,\mathrm{MeV}\))
- **2026-11-05 honesty sync:** cavitation–collapse labelled **modelled enhancement / contested hydro**; Lean clamp / non-closure language cited; still **no** OPEN closures
- **2026-11-09 WS pack (0.3.9 public-testing):** FEM DEF / Overlap / CollapseBounds deepen / weight surfaces / Assenbaum / detector RAD / WeakInteraction / rate-UQ floors landed on `dev` (#326–#334) — identities, DEFs, and campaign inventory only; still **no** OPEN closures
- **2026-11-10 Theory Paper WS findings refresh:** Canonical MD + pack MD/TXT/TEX + Lean `PaperCrosswalk` revision tag synced to tip-`dev` honesty citations (WeakInteraction ≠ EC closure; detector UL/PRED ≠ RAD/RATE closure; Assenbaum domain; CollapseBounds clamp/UQ/RP/CR-cap; `EQ-UQ-BF-01` algebraic only; weights Approximate not posteriors; FEM DEF aspirational). No band changes; still **no** OPEN closures; `lenr_proved` false; no live Swarm ship / public flip / invites
- **2026-11-10 Pyyhtiä CR-39 cavitation cite:** Adds `pyyhtia2026` (DOI 10.1016/j.jelechem.2026.120104) beside Taleyarkhan / Mulnix / SPAWAR CR-39 peers as electrolytic HER nanobubble cavitation / detector-confounder evidence; cavitation nuclear pathway remains **modelled enhancement / contested hydro**; still **no** OPEN closures; `lenr_proved` false; no version-marker bump / live ship
- **2026-11-10 PDF academic submission:** Full Part 1 PDF (+ expanded TEX, `academic.latex`, `build_pdf.sh`) added to this pack; Part 2 appendix excluded from PDF; honesty footnotes retained; still **no** OPEN closures
- **2026-11-11 EQ-OPEN peer-review refresh:** §5A/abstract/methods/§6.1 cite Lean bounds from #356; all five OPEN; `lenr_proved` false; TEX/PDF twins rebuilt
- **2026-11-11 multidisciplinary coherence pass:** Claim-tier narrative sync across MD/TXT/TEX/PDF/Lean/provenance/evidence + Theory Paper / Bubble Fusion UI drift; still **no** OPEN closures; `lenr_proved` false; no version-marker bump / live ship
- Lean PROVED rows document identities / clamps / non-closure — they do **not** discharge scientific obligations

## Simulation evidence sources

| Source | Role |
|--------|------|
| [`datasets/reviewer_packs/smoke/`](../../../datasets/reviewer_packs/smoke/) | CI smoke pack |
| [`datasets/reviewer_packs/q_campaign_demo/`](../../../datasets/reviewer_packs/q_campaign_demo/) | Larger pinned campaign |
| [`datasets/reviewer_packs/cavitation_collapse_campaign/`](../../../datasets/reviewer_packs/cavitation_collapse_campaign/) | Phase A cavitation/collapse bubble-lattice campaign (model output; Taleyarkhan contested + Pyyhtiä 2026 CR-39 confounder peers; EQ-OPEN-* stay OPEN) — **on `dev`** via #299 |
| [`datasets/reviewer_packs/detector_weak_screen/`](../../../datasets/reviewer_packs/detector_weak_screen/) | WS7 detector/weak screen campaign pack (model output; weight surfaces Approximate/Aspirational; EQ-OPEN-* stay OPEN) — **on `dev`** via #331 |
| [`formalization/predictions/campaign_invariants.json`](../../../../formalization/predictions/campaign_invariants.json) | Campaign invariant schema |
| [`backend/app/physics_engine/collapse_uq.py`](../../../backend/app/physics_engine/collapse_uq.py) | Collapse Sobol UQ (modelled percentiles only) |
| [`backend/tests/test_paper_benchmarks/`](../../../backend/tests/test_paper_benchmarks/) | CI paper-reproduction gates |
| [`simulation_evidence.json`](./simulation_evidence.json) | Machine-readable summary for this pack |

## Phase B / F / WS science notes (on `dev`)

| Note | Path | Status |
|------|------|--------|
| Avenue ranking (campaign + UQ) | [`../../v0.3.9-beta/AVENUE_RANKING.md`](../../v0.3.9-beta/AVENUE_RANKING.md) | **on `dev`** via #301 (Phase B) |
| EQ-OPEN closure/falsification runway | [`../../v0.3.9-beta/EQ_OPEN_CLOSURE_RUNWAY.md`](../../v0.3.9-beta/EQ_OPEN_CLOSURE_RUNWAY.md) | **on `dev`** via #297 (Phase F) — criteria draft only; rows stay OPEN |
| Theory weight surfaces inventory | [`../../v0.3.9-beta/THEORY_WEIGHT_SURFACES.md`](../../v0.3.9-beta/THEORY_WEIGHT_SURFACES.md) | **on `dev`** via #331 (WS7) — Approximate/Aspirational labels; not lab posteriors |

Do **not** treat these paths as laboratory evidence. Live links do not change claim tiers, close `EQ-OPEN-*`, or set `lenr_proved`.

## Lean / IR honesty pointers (WS pack)

| Module / surface | Path | Honesty |
|------------------|------|---------|
| CollapseBounds deepen | [`CollapseBounds.lean`](../../../../formalization/lean/LenrFormal/CollapseBounds.lean) | `EQ-BBL-LIM/BOUND/UQ/RP-DOM/CR-CAP-01` — clamp / UQ / RP domain bookkeeping only (**not** cavitation dynamics; #328) |
| Overlap DEF | [`Overlap.lean`](../../../../formalization/lean/LenrFormal/Overlap.lean) | `EQ-OVERLAP-01/02` — \((r_0/a)^3\) skeleton; ensemble count ≠ nuclear rate (#330) |
| FEM continuum DEF | [`PoissonSchrodinger.lean`](../../../../formalization/lean/LenrFormal/PoissonSchrodinger.lean) | `EQ-PS-01` + `EQ-PS-TOL-01` — aspirational continuum sketch; **not** live FEM (#327) |
| Assenbaum domain | [`EQ-ASSEN-DOM-01.yaml`](../../../../formalization/ir/equations/EQ-ASSEN-DOM-01.yaml) | Screening domain honesty; formula not claimed outside validity (#333) |
| Detector RAD honesty | neutron UL / Cd / moderator PREDs + contested Parkhomov baseline + Pyyhtiä 2026 CR-39 cavitation confounder (`pyyhtia2026`) | **on `dev`** via #329 (+ cite PR) — `detector_ul_not_proof`; **≠** `EQ-OPEN-RAD/RATE` closure |
| WeakInteraction | [`WeakInteraction.lean`](../../../../formalization/lean/LenrFormal/WeakInteraction.lean) | **on `dev`** via #332 — Fermi \(G_F\)/σ/Boltzmann identities only; **≠** `EQ-OPEN-EC-01` closure |
| Rate UQ floors | [`Decision.lean`](../../../../formalization/lean/LenrFormal/Decision.lean) ExpHom | **on `dev`** via #334 — `EQ-UQ-BF-01` algebra honesty only; **≠** empirical Bayes factor |
| Formal proof status | [`FORMAL_PROOF_STATUS.md`](../../../../docs/FORMALIZATION/FORMAL_PROOF_STATUS.md) | WH / OpenObligations non-closure; OPEN table unchanged |
| Proof matrix twin | [`../PROOF_MATRIX.md`](../PROOF_MATRIX.md) | Ledger ↔ Lean/IR crosswalk; honesty-only |

## Related governance

- [`../PROOF_MATRIX.md`](../PROOF_MATRIX.md)
- [`../PHYSICS_MATURITY_LEDGER.md`](../PHYSICS_MATURITY_LEDGER.md)
- [`docs/FORMALIZATION/FORMAL_PROOF_STATUS.md`](../../../../docs/FORMALIZATION/FORMAL_PROOF_STATUS.md)
- [`../../v0.3.6-beta/PROVENANCE_GOVERNANCE.md`](../../v0.3.6-beta/PROVENANCE_GOVERNANCE.md)
- Version trains: [`.github/BRANCHING.md`](../../../../../.github/BRANCHING.md) — `main`/`dev` both **`0.3.9-beta`**

## Parallel work (non-goals for this pack)

This paper pack does **not** change Theory Paper frontend, GitHub Actions runners, Hostinger CI VMs,
Compose↔Swarm cutover docs, deploy workflows, or `APP_VERSION` / version markers. Those tracks
remain out of scope here. Live Swarm ship stays gated on explicit Diadon confirm.
