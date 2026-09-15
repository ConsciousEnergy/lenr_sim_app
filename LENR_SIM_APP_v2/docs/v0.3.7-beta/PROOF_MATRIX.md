# Proof matrix — v0.3.7-beta

Crosswalk of claim status across **natural language**, **Markdown**, **JSON** /
**YAML**, **LaTeX**, and **Lean**. Nothing here closes an `EQ-OPEN-*` obligation.

| Layer | Artifact |
|-------|----------|
| NL + Markdown narrative | [PHYSICS_MATURITY_LEDGER.md](./PHYSICS_MATURITY_LEDGER.md) |
| JSON ledger twin | [physics_maturity_ledger.json](./physics_maturity_ledger.json) |
| YAML ledger twin | [physics_maturity_ledger.yaml](./physics_maturity_ledger.yaml) |
| Lean proof status table | [`docs/FORMALIZATION/FORMAL_PROOF_STATUS.md`](../../../docs/FORMALIZATION/FORMAL_PROOF_STATUS.md) |
| Equation IR rows | [`formalization/ir/equations/`](../../../formalization/ir/equations/) |
| Lean modules | [`formalization/lean/LenrFormal/`](../../../formalization/lean/LenrFormal/) |

| ledger_id | NL claim (do / do not) | Markdown | JSON / YAML id | LaTeX stub | Lean / IR (status) |
|-----------|------------------------|----------|----------------|------------|--------------------|
| EQ-OPEN-MEV-01 | Do **not** claim MeV channel closed | Ledger + Open Questions UI | `EQ-OPEN-MEV-01` | [latex/eq_open_mev_01.tex](./latex/eq_open_mev_01.tex) | IR [`EQ-OPEN-MEV-01.yaml`](../../../formalization/ir/equations/EQ-OPEN-MEV-01.yaml), [`EQ-WH-PART-01.yaml`](../../../formalization/ir/equations/EQ-WH-PART-01.yaml), [`EQ-WH-NONCLOSE-01.yaml`](../../../formalization/ir/equations/EQ-WH-NONCLOSE-01.yaml); Lean `OpenObligations` / `WorkingHypothesis*` — **non-closure** ([FORMAL_PROOF_STATUS](../../../docs/FORMALIZATION/FORMAL_PROOF_STATUS.md)) |
| EQ-OPEN-RAD-01 | Do **not** claim radiation suppression solved | Ledger | `EQ-OPEN-RAD-01` | [latex/eq_open_rad_01.tex](./latex/eq_open_rad_01.tex) | IR [`EQ-WH-BOUND-01.yaml`](../../../formalization/ir/equations/EQ-WH-BOUND-01.yaml), [`EQ-WH-FC-01.yaml`](../../../formalization/ir/equations/EQ-WH-FC-01.yaml); Lean bounds — **≠ closure** |
| EQ-OPEN-RATE-01 | Do **not** claim lattice rate budget closes | Ledger | `EQ-OPEN-RATE-01` | [latex/eq_open_rate_01.tex](./latex/eq_open_rate_01.tex) | IR [`EQ-OPEN-RATE-01.yaml`](../../../formalization/ir/equations/EQ-OPEN-RATE-01.yaml), [`EQ-RATE-2B-NC-01.yaml`](../../../formalization/ir/equations/EQ-RATE-2B-NC-01.yaml); Lean `RateBudget` — two-body **non-closure** |
| EQ-OPEN-EC-01 | Do **not** claim EC energy path ≥0.782 MeV | Ledger | `EQ-OPEN-EC-01` | [latex/eq_open_ec_01.tex](./latex/eq_open_ec_01.tex) | IR [`EQ-OPEN-EC-01.yaml`](../../../formalization/ir/equations/EQ-OPEN-EC-01.yaml), [`EQ-OPEN-EC-DEFICIT-01.yaml`](../../../formalization/ir/equations/EQ-OPEN-EC-DEFICIT-01.yaml); Lean `OpenQuestionBounds` — deficit identity **only** |
| EQ-OPEN-YIELD-01 | Do **not** claim integrated yield discharge | Ledger | `EQ-OPEN-YIELD-01` | [latex/eq_open_yield_01.tex](./latex/eq_open_yield_01.tex) | Yield-band DEF in FORMAL_PROOF_STATUS — **OPEN** (no discharge) |
| WH-ENP-01 | Exploratory bounds only | Ledger | `WH-ENP-01` | (see MEV/RAD/RATE stubs) | IR [`EQ-WH-ENP-01.yaml`](../../../formalization/ir/equations/EQ-WH-ENP-01.yaml); Lean WorkingHypothesis* — **does not close OPEN** |
| ENG-BUBBLE-FUSION-01 | Approximate / schematic unless provenance=`physics_engine` | Ledger + BUG_TRIAGE | `ENG-BUBBLE-FUSION-01` | [latex/eng_bubble_fusion_01.tex](./latex/eng_bubble_fusion_01.tex) | No Lean / IR row yet — numerical/schematic only |
| ENG-RP-KM-01 | RP domain-limited; KM preferred at high Mach | Ledger + PHYS verification | `ENG-RP-KM-01` | [latex/eng_rp_km_01.tex](./latex/eng_rp_km_01.tex) | Partial / domain (PHYS verification); KM auto Mach≥0.3 on Unified + BF |
| ENG-WKB-01 | Established WKB/Gamow reference; screening domain-limited | Ledger | `ENG-WKB-01` | (existing PHYS docs) | Lean `Gamow` monotonicity **PROVED**; screening still domain-limited |
| ENG-ASPIRATIONAL-FEM-01 | Not on VPS | Theory Methods honesty | `ENG-ASPIRATIONAL-FEM-01` | — | No Lean / IR — aspirational only |

## Honesty rule

If Lean status is “PROVED” for an identity or non-closure lemma, UI claim_tier
remains `OPEN` / `speculative` for the scientific obligation. JSON field
`lenr_proved` must stay `false`. Proved IR rows that *document* non-closure do
**not** discharge the corresponding `EQ-OPEN-*` row.
