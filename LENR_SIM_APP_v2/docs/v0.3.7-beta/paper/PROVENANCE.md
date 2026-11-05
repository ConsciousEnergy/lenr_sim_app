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
- Lean PROVED rows document identities / clamps / non-closure — they do **not** discharge scientific obligations

## Simulation evidence sources

| Source | Role |
|--------|------|
| [`datasets/reviewer_packs/smoke/`](../../../datasets/reviewer_packs/smoke/) | CI smoke pack |
| [`datasets/reviewer_packs/q_campaign_demo/`](../../../datasets/reviewer_packs/q_campaign_demo/) | Larger pinned campaign |
| [`datasets/reviewer_packs/cavitation_collapse/`](../../../datasets/reviewer_packs/cavitation_collapse/) | Phase A cavitation/collapse-heavy pack — **pending merge** if absent on `dev` (expected path; do not invent lab data) |
| [`formalization/predictions/campaign_invariants.json`](../../../../formalization/predictions/campaign_invariants.json) | Campaign invariant schema |
| [`backend/app/physics_engine/collapse_uq.py`](../../../backend/app/physics_engine/collapse_uq.py) | Collapse Sobol UQ (modelled percentiles only) |
| [`backend/tests/test_paper_benchmarks/`](../../../backend/tests/test_paper_benchmarks/) | CI paper-reproduction gates |
| [`simulation_evidence.json`](./simulation_evidence.json) | Machine-readable summary for this pack |

## Phase B / F science notes (link when on `dev`)

| Note | Expected path | Status on `origin/dev` at Phase D sync |
|------|---------------|----------------------------------------|
| Avenue ranking (campaign + UQ) | [`../../v0.3.9-beta/AVENUE_RANKING.md`](../../v0.3.9-beta/AVENUE_RANKING.md) | **pending merge** (Phase B) if file absent |
| EQ-OPEN closure/falsification runway | [`../../v0.3.9-beta/EQ_OPEN_CLOSURE_RUNWAY.md`](../../v0.3.9-beta/EQ_OPEN_CLOSURE_RUNWAY.md) | **pending merge** (Phase F) if file absent — criteria draft only; rows stay OPEN |

Do **not** treat pending paths as laboratory evidence. When those files land on `dev`, this table’s “pending merge” rows become live links without changing claim tiers.

## Lean clamp / non-closure pointers

- [`formalization/lean/LenrFormal/CollapseBounds.lean`](../../../../formalization/lean/LenrFormal/CollapseBounds.lean) — `EQ-BBL-LIM-01` pointwise clamp algebra (not cavitation dynamics)
- [`docs/FORMALIZATION/FORMAL_PROOF_STATUS.md`](../../../../docs/FORMALIZATION/FORMAL_PROOF_STATUS.md) — WH / OpenObligations non-closure; OPEN table unchanged

## Related governance

- [`../PROOF_MATRIX.md`](../PROOF_MATRIX.md)
- [`../PHYSICS_MATURITY_LEDGER.md`](../PHYSICS_MATURITY_LEDGER.md)
- [`docs/FORMALIZATION/FORMAL_PROOF_STATUS.md`](../../../../docs/FORMALIZATION/FORMAL_PROOF_STATUS.md)
- [`../../v0.3.6-beta/PROVENANCE_GOVERNANCE.md`](../../v0.3.6-beta/PROVENANCE_GOVERNANCE.md)

## Parallel work (non-goals for this pack)

This paper pack does **not** change Theory Paper frontend, GitHub Actions runners, Hostinger CI VMs,
Compose↔Swarm cutover docs, deploy workflows, or `APP_VERSION` / version markers. Those tracks
remain out of scope here.
