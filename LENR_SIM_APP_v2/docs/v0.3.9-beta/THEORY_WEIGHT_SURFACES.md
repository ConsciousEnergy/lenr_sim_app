# Theory weight surfaces — Approximate vs Aspirational inventory

**Status:** Science-train honesty inventory (WS7). Labels **model weights**,
not laboratory Bayesian posteriors. Does **not** prove LENR, does **not**
close any `EQ-OPEN-*`, and never sets `lenr_proved: true`.

## What these weights are (and are not)

| Label | Meaning here |
|-------|----------------|
| **Approximate** | Fixed toy / heuristic coefficients shipped in code; stable enough for ranking and UI, not fitted to a lab posterior. |
| **Aspirational** | Future learnable / data-driven surface; no trained ML weight vector exists in-repo today. |
| **Not a lab posterior** | High `final_score`, SQL means, oracle priors, or avenue informativeness ≠ P(LENR is true). |

Product language “high probability” ≈ high five-factor `final_score` (and/or
`top_theory_score`) **after** claim-tier down-weighting — still model-output
association under identical conditions.

## Surface inventory

| Surface | Symbols / keys | Maturity | Path |
|---------|----------------|----------|------|
| Claim-tier multipliers | `CLAIM_TIER_MULTIPLIER` (`validated_lenr_mechanism`/`established_reference` ×1.0 … `speculative_exploratory` ×0.30 … `cross_regime_extrapolation` ×0.20) | **Approximate** | [`theory_scoring.py`](../../backend/app/physics_engine/theory_scoring.py); frontend mirror [`theoryGovernance.ts`](../../frontend/src/utils/theoryGovernance.ts) |
| Five-factor geometric-mean weights | `W_PHYSICAL`, `W_EXPERIMENTAL`, `W_SENSITIVITY`, `W_CROSS_THEORY`, `W_COMPLETENESS` (sum = 1) | **Approximate** | `theory_scoring.py` |
| Geometric-mean floor | `FLOOR = 0.05` per sub-score | **Approximate** | `theory_scoring.py` — prevents single-factor collapse; can soften penalties (score-game surface) |
| Persist sensitivity shortcut | `skip_sensitivity=True` → `parameter_sensitivity = 0.5` | **Approximate** | Persist enrichment; live Relevance Map still computes sensitivity |
| Guardrails `weighted_score` | Rubric confidence → pipeline `score` | **Approximate** | [`scientific_guardrails.py`](../../backend/app/physics_engine/scientific_guardrails.py) |
| Opt-in literature blend | `SCORE_MODE_PLUS_LITERATURE` → `0.7 * heuristic + 0.3 * literature` into experimental agreement | **Approximate** (blend coeffs); **Aspirational** if later fitted to EMP corpora | [`literature_likelihood.py`](../../backend/app/physics_engine/literature_likelihood.py) — **must not** promote `claim_tier` |
| Oracle skeptical priors | `DEFAULT_PRIORS` | **Approximate** | [`decision_oracle.py`](../../backend/app/physics_engine/decision_oracle.py); IR twin `EQ-UQ-PRIOR-01` |
| Oracle Miles-anchored priors | `ANCHORED_PRIORS` | **Approximate** scenario table — **not** P(LENR) | `decision_oracle.py` |
| Avenue informativeness blend | `_informativeness`: 0.35 rank + 0.25 coverage + 0.20 UQ shrink + 0.15 separation + 0.05 collapse + optional cavitation boost | **Approximate** | [`avenue_ranking.py`](../../backend/app/campaign/avenue_ranking.py) |
| Avenue ranking envelope | `kind=scenario_table_not_posterior`, `lenr_proved=false`, OPEN ids stay OPEN | Honesty contract (DEF) | [`AVENUE_RANKING.md`](./AVENUE_RANKING.md) |
| Reaction-rate “Bayesian” band shrink | Optional `experimental_band` width shrink in rate UQ | **Approximate** predictive aid | `unified_lenr_model/reaction_rate_uq.py` |
| Learnable / ML weight vectors | *(none)* | **Aspirational** | No first-class SQL table for weight-history diffs |

Engine maturity chips (`beta` / `approximate` / `speculative` / `established_reference` / `aspirational`) are **orthogonal** to these score weights — see
[`engineMaturity.js`](../../frontend/src/config/engineMaturity.js).

## Dual score honesty (`score` vs `final_score`)

| Field | Formula | Role |
|-------|---------|------|
| `score` | Guardrails `confidence_breakdown.weighted_score` | Persist column / confidence |
| `final_score` | Five-factor geometric mean × `CLAIM_TIER_MULTIPLIER` | Relevance Map / association ranking |

Persist is **additive** (`score_formula: five_factor_gm_x_claim_tier`;
`score_field: final_score_preferred` on history). Documented in
[`ANALYTICS_TRANSPARENCY.md`](../v0.3.6-beta/ANALYTICS_TRANSPARENCY.md).
SQL `mean_final_score` is **Approximate association**, not experimental
confirmation. `is_empirical_confidence` stays `false` on model packs.

## Claim-tier multiply honesty (DEF)

Definition only — not a laboratory theorem. Mechanized twin:
Lean `LenrFormal.WeightHonesty` / IR [`EQ-WT-TIER-01`](../../../../formalization/ir/equations/EQ-WT-TIER-01.yaml).

1. `raw_score_pre_tier` = weighted geometric mean of the five sub-scores (with floor).
2. `final_score = raw_score_pre_tier × CLAIM_TIER_MULTIPLIER[claim_tier]`.
3. Opt-in literature mode may change experimental agreement only; it does **not**
   rewrite `claim_tier` or raise empirical claim tiers.
4. `top_theory_score` / high `final_score` **never** imply `lenr_proved` or CLOSE
   on any `EQ-OPEN-*`.

## Scenario-table honesty (DEF)

Avenue ranking and oracle prior tables are **`scenario_table_not_posterior`**.
Mechanized twin: Lean `LenrFormal.WeightHonesty` / IR
[`EQ-WT-SCENARIO-01`](../../../../formalization/ir/equations/EQ-WT-SCENARIO-01.yaml).

- Lab-design informativeness / mechanism-path odds under stated priors.
- Miles-anchored priors are occurrence-scenario aids, **not** P(LENR).
- `assert_ranking_honesty` rejects `lenr_proved=true` and any OPEN → CLOSED flip.
- Re-ranking after pack growth records informativeness **delta as a design aid only**.

Contract tests:
[`test_avenue_ranking_contract.py`](../../backend/tests/test_integration/test_avenue_ranking_contract.py),
[`test_weight_surface_honesty.py`](../../backend/tests/test_integration/test_weight_surface_honesty.py),
[`test_lean_python_agreement.py`](../../backend/tests/test_formalization/test_lean_python_agreement.py)
(`test_weight_honesty_locks_agree_with_lean`).

## SQL / pack enrichment (model-only)

Reviewer packs under [`datasets/reviewer_packs/`](../../datasets/reviewer_packs/)
keep `lenr_proved: false` and `empirical_claim_tiers_raised: false`. Detector /
weak screen cells (`detector_weak_screen` preset + pack) tag RAD/EC OPEN stress
for lab-design coverage; they do **not** import ARA laboratory DB or full
Parkhomov SQLite. See runway stage constraints in
[`EQ_OPEN_CLOSURE_RUNWAY.md`](./EQ_OPEN_CLOSURE_RUNWAY.md).

## Non-goals

- Closing `EQ-OPEN-*` or setting `lenr_proved: true`
- Treating SQL means / association ranks / avenue scores as laboratory Bayesian proof
- Shipping ARA acquisition DB or full Parkhomov SQLite co-tenant with public Postgres
- Claiming Approximate toy weights are trained posteriors
