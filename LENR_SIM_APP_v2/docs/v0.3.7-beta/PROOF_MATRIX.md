# Proof matrix — v0.3.7-beta

Crosswalk of claim status across **natural language**, **Markdown**, **JSON**,
**LaTeX**, and **Lean**. Nothing here closes an `EQ-OPEN-*` obligation.

Canonical narrative: [PHYSICS_MATURITY_LEDGER.md](./PHYSICS_MATURITY_LEDGER.md)  
Machine twin: [physics_maturity_ledger.json](./physics_maturity_ledger.json)  
Lean status: [`docs/FORMALIZATION/FORMAL_PROOF_STATUS.md`](../../../docs/FORMALIZATION/FORMAL_PROOF_STATUS.md)

| ledger_id | NL claim (do / do not) | Markdown | JSON id | LaTeX stub | Lean (status) |
|-----------|------------------------|----------|---------|------------|---------------|
| EQ-OPEN-MEV-01 | Do **not** claim MeV channel closed | Ledger + Open Questions UI | `EQ-OPEN-MEV-01` | [latex/eq_open_mev_01.tex](./latex/eq_open_mev_01.tex) | `EQ-WH-PART-*`, `EQ-WH-NONCLOSE-*` — non-closure |
| EQ-OPEN-RAD-01 | Do **not** claim radiation suppression solved | Ledger | `EQ-OPEN-RAD-01` | [latex/eq_open_rad_01.tex](./latex/eq_open_rad_01.tex) | `EQ-WH-BOUND-01`, FC bounds — ≠ closure |
| EQ-OPEN-RATE-01 | Do **not** claim lattice rate budget closes | Ledger | `EQ-OPEN-RATE-01` | [latex/eq_open_rate_01.tex](./latex/eq_open_rate_01.tex) | `EQ-RATE-2B-NC-01` — two-body non-closure |
| EQ-OPEN-EC-01 | Do **not** claim EC energy path ≥0.782 MeV | Ledger | `EQ-OPEN-EC-01` | [latex/eq_open_ec_01.tex](./latex/eq_open_ec_01.tex) | `EQ-OPEN-EC-DEFICIT-01` — deficit identity |
| EQ-OPEN-YIELD-01 | Do **not** claim integrated yield discharge | Ledger | `EQ-OPEN-YIELD-01` | [latex/eq_open_yield_01.tex](./latex/eq_open_yield_01.tex) | Yield band DEF only |
| WH-ENP-01 | Exploratory bounds only | Ledger | `WH-ENP-01` | (see MEV/RAD/RATE stubs) | WorkingHypothesis* — non-closure |
| ENG-BUBBLE-FUSION-01 | Approximate / schematic unless provenance=`physics_engine` | Ledger + BUG_TRIAGE | `ENG-BUBBLE-FUSION-01` | [latex/eng_bubble_fusion_01.tex](./latex/eng_bubble_fusion_01.tex) | absent |
| ENG-RP-KM-01 | RP domain-limited; KM preferred at high Mach | Ledger + PHYS verification | `ENG-RP-KM-01` | [latex/eng_rp_km_01.tex](./latex/eng_rp_km_01.tex) | partial / domain |
| ENG-WKB-01 | Established WKB/Gamow reference; screening domain-limited | Ledger | `ENG-WKB-01` | (existing PHYS docs) | Gamow monotonicity PROVED |
| ENG-ASPIRATIONAL-FEM-01 | Not on VPS | Theory Methods honesty | `ENG-ASPIRATIONAL-FEM-01` | — | absent |

## Honesty rule

If Lean status is “PROVED” for an identity or non-closure lemma, UI claim_tier
remains `OPEN` / `speculative` for the scientific obligation. JSON field
`lenr_proved` must stay `false`.
