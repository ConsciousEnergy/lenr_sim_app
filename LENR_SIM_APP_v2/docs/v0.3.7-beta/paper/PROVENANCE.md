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
- Lean PROVED rows document identities / non-closure — they do **not** discharge scientific obligations

## Simulation evidence sources

| Source | Role |
|--------|------|
| [`datasets/reviewer_packs/smoke/`](../../../datasets/reviewer_packs/smoke/) | CI smoke pack |
| [`datasets/reviewer_packs/q_campaign_demo/`](../../../datasets/reviewer_packs/q_campaign_demo/) | Larger pinned campaign |
| [`datasets/reviewer_packs/cavitation_collapse_campaign/`](../../../datasets/reviewer_packs/cavitation_collapse_campaign/) | Phase A cavitation/collapse bubble-lattice campaign (model output; EQ-OPEN-* stay OPEN) |
| [`formalization/predictions/campaign_invariants.json`](../../../../formalization/predictions/campaign_invariants.json) | Campaign invariant schema |
| [`backend/tests/test_paper_benchmarks/`](../../../backend/tests/test_paper_benchmarks/) | CI paper-reproduction gates |
| [`simulation_evidence.json`](./simulation_evidence.json) | Machine-readable summary for this pack |

## Related governance

- [`../PROOF_MATRIX.md`](../PROOF_MATRIX.md)
- [`../PHYSICS_MATURITY_LEDGER.md`](../PHYSICS_MATURITY_LEDGER.md)
- [`docs/FORMALIZATION/FORMAL_PROOF_STATUS.md`](../../../../docs/FORMALIZATION/FORMAL_PROOF_STATUS.md)

## Parallel work (non-goals for this pack)

This paper pack does **not** change GitHub Actions runners, Hostinger CI VMs,
Compose↔Swarm cutover docs, deploy workflows, or `APP_VERSION`. Those tracks
(self-hosted runner cost reduction; Compose-now / Swarm-later contributor truth)
are owned by parallel agents and remain out of scope here.
