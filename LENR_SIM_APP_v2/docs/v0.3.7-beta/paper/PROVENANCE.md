# Unified Theory Paper — provenance (v0.3.7-beta)

**Purpose.** Academic archival pack for *A Unified Theoretical and Mathematical Framework for Low-Energy Nuclear Reactions (LENR)* in five formats, aligned with companion-software simulation evidence and Lean/IR mathematical modeling.

| Format | Path |
|--------|------|
| Markdown | [`A_Unified_Theoretical_Framework_for_LENR.md`](./A_Unified_Theoretical_Framework_for_LENR.md) (synced from [`docs/A_Unified_Theoretical_Framework_for_LENR.md`](../../../../docs/A_Unified_Theoretical_Framework_for_LENR.md)) |
| Plain text | [`A_Unified_Theoretical_Framework_for_LENR.txt`](./A_Unified_Theoretical_Framework_for_LENR.txt) |
| LaTeX | [`A_Unified_Theoretical_Framework_for_LENR.tex`](./A_Unified_Theoretical_Framework_for_LENR.tex) — **full Part 1 manuscript** (pandoc + [`academic.latex`](./academic.latex); rebuild via [`build_pdf.sh`](./build_pdf.sh)); OPEN/ENG stubs remain under [`../latex/`](../latex/) |
| PDF | [`A_Unified_Theoretical_Framework_for_LENR.pdf`](./A_Unified_Theoretical_Framework_for_LENR.pdf) — submission-quality XeLaTeX build of Part 1 (title + subtitle *Coupling is all you need*, authors, abstract, honesty footnotes; Part 2 escaped-LaTeX appendix excluded) |
| Lean crosswalk | [`PaperCrosswalk.lean`](./PaperCrosswalk.lean) (authoritative build: [`formalization/lean/LenrFormal/PaperCrosswalk.lean`](../../../../formalization/lean/LenrFormal/PaperCrosswalk.lean)) |

**2026-11-10 PDF submission build.** Pack `.tex` expanded from short skeleton → compileable full Part 1 manuscript via pandoc from the canonical MD (Part 1 only), academic `article` class template, XeLaTeX. Committed PDF ≈ 0.27 MB / ~40 pages. Does **not** close `EQ-OPEN-*`, set `lenr_proved`, or imply live ship / public flip.

**2026-11-11 multidisciplinary coherence pass.** Part 1 prose claim-tier voice aligned (academic + experimental + software): §5.2 retitled to reported/contested correlations; experimental vs modelled vs aspirational labels tightened; Pyyhtiä kept beside Taleyarkhan/Mulnix/SPAWAR without nuclear overclaim; Lean `paperRevision=v0.3.7-beta-2026-11-11-coherence`; formats list includes PDF. Still **no** OPEN closures; `lenr_proved` false; no version-marker bump / live ship.

## Hard invariants

- `lenr_proved: false`
- All five `EQ-OPEN-*` remain **OPEN**
- No quantitative band changes in the 2026-09-25 revision (tunneling \(10^3\)–\(10^5\); Casimir \(-1.3\,\mathrm{mN}\); Miles \(24\pm4\,\mathrm{MeV}\))
- **2026-11-05 honesty sync:** cavitation–collapse labelled **modelled enhancement / contested hydro**; Lean clamp / non-closure language cited; still **no** OPEN closures
- **2026-11-09 WS pack (0.3.9 public-testing):** FEM DEF / Overlap / CollapseBounds deepen / weight surfaces / Assenbaum / detector RAD / WeakInteraction / rate-UQ floors landed on `dev` (#326–#334) — identities, DEFs, and campaign inventory only; still **no** OPEN closures
- **2026-11-10 Theory Paper WS findings refresh:** Canonical MD + pack MD/TXT/TEX + Lean `PaperCrosswalk` revision tag synced to tip-`dev` honesty citations (WeakInteraction ≠ EC closure; detector UL/PRED ≠ RAD/RATE closure; Assenbaum domain; CollapseBounds clamp/UQ/RP/CR-cap; `EQ-UQ-BF-01` algebraic only; weights Approximate not posteriors; FEM DEF aspirational). No band changes; still **no** OPEN closures; `lenr_proved` false; no live Swarm ship / public flip / invites
- **2026-11-10 Pyyhtiä CR-39 cavitation cite:** Adds `pyyhtia2026` (DOI 10.1016/j.jelechem.2026.120104) beside Taleyarkhan / Mulnix / SPAWAR CR-39 peers as electrolytic HER nanobubble cavitation / detector-confounder evidence; cavitation nuclear pathway remains **modelled enhancement / contested hydro**; still **no** OPEN closures; `lenr_proved` false; no version-marker bump / live ship
- **2026-11-10 PDF academic submission:** Full Part 1 PDF (+ expanded TEX, `academic.latex`, `build_pdf.sh`) added to this pack; Part 2 appendix excluded from PDF; honesty footnotes retained; still **no** OPEN closures
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
