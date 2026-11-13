/-!
WeightHonesty — EQ-WT-TIER-01 / EQ-WT-SCENARIO-01

Integer-scaled claim-tier multipliers, five-factor theory-score weights, and
the avenue / oracle ranking envelope `scenario_table_not_posterior`.

Matches
`LENR_SIM_APP_v2/backend/app/physics_engine/theory_scoring.py` and
`LENR_SIM_APP_v2/backend/app/campaign/avenue_ranking.py`.

**Claim tier:** Approximate governance weights / honesty DEFs only.
These identities do **not** prove LENR, do **not** turn SQL means or
`final_score` into laboratory posteriors, and do **not** discharge any
`EQ-OPEN-*`. `lenrProved` stays false. There is no `theorem lenr_occurs`.
-/

namespace LenrFormal.WeightHonesty

/-- Hard invariant: nature-proof token stays false on weight surfaces. -/
def lenrProved : Bool := false

theorem lenr_proved_false : lenrProved = false := rfl

/-- Ranking / oracle envelope kind — not a Bayesian lab posterior. -/
def scenarioTableKind : String := "scenario_table_not_posterior"

theorem scenario_table_kind_lock :
    scenarioTableKind = "scenario_table_not_posterior" := rfl

/-- EQ-WT-TIER-01: claim-tier multipliers ×100 (percent). -/
def tierValidatedPct : Nat := 100
def tierEstablishedPct : Nat := 100
def tierEmpiricalPct : Nat := 90
def tierSpeculativePct : Nat := 30
def tierCrossRegimePct : Nat := 20

theorem speculative_strictly_below_validated :
    tierSpeculativePct < tierValidatedPct := by
  native_decide

theorem cross_regime_strictly_below_speculative :
    tierCrossRegimePct < tierSpeculativePct := by
  native_decide

theorem empirical_below_or_eq_validated :
    tierEmpiricalPct ≤ tierValidatedPct := by
  native_decide

theorem tier_validated_bounded : 0 < tierValidatedPct ∧ tierValidatedPct ≤ 100 := by
  native_decide

theorem tier_established_bounded :
    0 < tierEstablishedPct ∧ tierEstablishedPct ≤ 100 := by
  native_decide

theorem tier_empirical_bounded : 0 < tierEmpiricalPct ∧ tierEmpiricalPct ≤ 100 := by
  native_decide

theorem tier_speculative_bounded :
    0 < tierSpeculativePct ∧ tierSpeculativePct ≤ 100 := by
  native_decide

theorem tier_cross_regime_bounded :
    0 < tierCrossRegimePct ∧ tierCrossRegimePct ≤ 100 := by
  native_decide

/-- Speculative multiplier is a strict down-weight vs the 100% validated tier. -/
theorem speculative_downweights_vs_validated :
    tierSpeculativePct * 100 < tierValidatedPct * 100 := by
  native_decide

/-- EQ-WT-TIER-01: five-factor geometric-mean weights ×100 (percent). -/
def wPhysicalPct : Nat := 25
def wExperimentalPct : Nat := 25
def wSensitivityPct : Nat := 15
def wCrossTheoryPct : Nat := 15
def wCompletenessPct : Nat := 20

theorem five_factor_weights_sum_to_100 :
    wPhysicalPct + wExperimentalPct + wSensitivityPct +
      wCrossTheoryPct + wCompletenessPct = 100 := by
  native_decide

/-- Score-gaming honesty: claim-tier multiply survives any raw score. -/
def finalScoreMilli (rawScoreMilli claimTierPct : Nat) : Nat :=
  rawScoreMilli * claimTierPct / 100

theorem final_score_uses_claim_tier
    (rawScoreMilli claimTierPct : Nat) :
    finalScoreMilli rawScoreMilli claimTierPct
      = rawScoreMilli * claimTierPct / 100 := rfl

/-- EQ-WT-SCENARIO-01: high model score never implies nature proof. -/
theorem high_score_does_not_prove_lenr
    (rawScoreMilli : Nat) :
    finalScoreMilli rawScoreMilli tierValidatedPct = rawScoreMilli →
      lenrProved = false := by
  intro _
  exact lenr_proved_false

theorem scenario_table_keeps_lenr_unproved :
    scenarioTableKind = "scenario_table_not_posterior" ∧ lenrProved = false :=
  ⟨scenario_table_kind_lock, lenr_proved_false⟩

end LenrFormal.WeightHonesty
