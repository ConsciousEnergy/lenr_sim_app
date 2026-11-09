# Unified Theory Paper — provenance (v0.3.7-beta)

**Purpose.** Academic archival pack for *A Unified Theoretical and Mathematical Framework for Low-Energy Nuclear Reactions (LENR)* in four formats, aligned with companion-software simulation evidence and Lean/IR mathematical modeling.

| Format | Path |
|--------|------|
| Markdown | [`A_Unified_Theoretical_Framework_for_LENR.md`](./A_Unified_Theoretical_Framework_for_LENR.md) (synced from [`docs/A_Unified_Theoretical_Framework_for_LENR.md`](../../../../docs/A_Unified_Theoretical_Framework_for_LENR.md)) |
| Plain text | [`A_Unified_Theoretical_Framework_for_LENR.txt`](./A_Unified_Theoretical_Framework_for_LENR.txt) |
| LaTeX | [`A_Unified_Theoretical_Framework_for_LENR.tex`](./A_Unified_Theoretical_Framework_for_LENR.tex) (+ [`../latex/`](../latex/) stubs) |
| Lean crosswalk | [`PaperCrosswalk.lean`](./PaperCrosswalk.lean) (authoritative build: [`formalization/lean/LenrFormal/PaperCrosswalk.lean`](../../../../formalization/lean/LenrFormal/PaperCrosswalk.lean)) |

## Hard invariants

- `lenr_proved: false`
- All five `EQ-OPEN-*` remain **OPEN**
- No quantitative band changes in the 2026-09-25 revision (tunneling \(10^3\)–\(10^5\); Casimir \(-1.3\,\mathrm{mN}\); Miles \(24\pm4\,\mathrm{MeV}\))
- **2026-11-05 honesty sync:** cavitation–collapse labelled **modelled enhancement / contested hydro**; Lean clamp / non-closure language cited; still **no** OPEN closures
- **2026-11-09 WS pack (0.3.9 public-testing):** FEM DEF / Overlap / CollapseBounds deepen / weight surfaces / Assenbaum domain honesty landed on `dev` — identities, DEFs, and campaign inventory only; still **no** OPEN closures
- Lean PROVED rows document identities / clamps / non-closure — they do **not** discharge scientific obligations

## Simulation evidence sources

| Source | Role |
|--------|------|
| [`datasets/reviewer_packs/smoke/`](../../../datasets/reviewer_packs/smoke/) | CI smoke pack |
| [`datasets/reviewer_packs/q_campaign_demo/`](../../../datasets/reviewer_packs/q_campaign_demo/) | Larger pinned campaign |
| [`datasets/reviewer_packs/cavitation_collapse_campaign/`](../../../datasets/reviewer_packs/cavitation_collapse_campaign/) | Phase A cavitation/collapse bubble-lattice campaign (model output; EQ-OPEN-* stay OPEN) — **on `dev`** via #299 |
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
| Detector RAD honesty | neutron UL / Cd / moderator PREDs + contested Parkhomov baseline | **on `dev`** via #329 — `detector_ul_not_proof`; **≠** `EQ-OPEN-RAD/RATE` closure |
| WeakInteraction | [`WeakInteraction.lean`](../../../../formalization/lean/LenrFormal/WeakInteraction.lean) | Pending land of #332 — Fermi \(G_F\)/σ/Boltzmann identities only; **≠** `EQ-OPEN-EC-01` closure |
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
