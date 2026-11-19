import LenrFormal.Miles
import LenrFormal.WhenHow

/-!
YieldAccounting — EQ-YIELD-ACCT-01 (duty-cycle expected-yield bookkeeping) /
EQ-YIELD-EFF-NC-01 (retention/collection efficiency ⇏ Q5)

Mirrors `build_integrated_yield_question`: expected He-4 yield
N_exp = (Miles atoms·s⁻¹·W⁻¹) × P_W × t_active with t_active = t_total × f_duty.
Scaled integers: N_exp / 10⁹ = milesRate_div_1e9 × P_W × dutyCycleYield t f_duty.

This is an EXPECTED yield from the Miles conversion only. No observed integrated
yield is an input, so no definition here can witness ΔN_He,integrated = 0;
EQ-OPEN-YIELD-01 stays OPEN.

EQ-YIELD-EFF-NC-01: missing retention/collection efficiency provenance (and
Miles EMP band alone) keep integrated underwriting ineligible for Q5.
-/

namespace LenrFormal.YieldAccounting

open LenrFormal.Constants
open LenrFormal.WhenHow

/-- Expected integrated He-4 yield ÷ 10⁹ atoms (duty in hundredths, time in s). -/
def expectedHeYield_div_1e9 (powerW totalTime dutyHundredths : Nat) : Nat :=
  milesRate_div_1e9 * powerW * dutyCycleYield totalTime dutyHundredths

theorem full_duty_active_time (totalTime : Nat) :
    dutyCycleYield totalTime 100 = totalTime :=
  Nat.mul_div_cancel totalTime (by decide)

theorem zero_duty_active_time (totalTime : Nat) :
    dutyCycleYield totalTime 0 = 0 := by
  simp [dutyCycleYield]

theorem expected_yield_full_duty (powerW totalTime : Nat) :
    expectedHeYield_div_1e9 powerW totalTime 100 = 263 * powerW * totalTime := by
  unfold expectedHeYield_div_1e9
  rw [full_duty_active_time]
  rfl

theorem expected_yield_zero_duty (powerW totalTime : Nat) :
    expectedHeYield_div_1e9 powerW totalTime 0 = 0 := by
  unfold expectedHeYield_div_1e9
  rw [zero_duty_active_time, Nat.mul_zero]

/-! ### EQ-YIELD-EFF-NC-01 — retention/collection efficiency ⇏ Q5

Affirmative EQ-OPEN-YIELD-01 needs time-resolved simultaneous heat + He with
**retention / collection efficiency provenance**. Instantaneous Miles EMP band
membership supplies none of that. Missing/uncalibrated efficiency keeps any
integrated underwrite ineligible. -/

/-- Efficiency provenance witness for integrated heat–He underwriting. -/
structure HeYieldEfficiencyProvenance where
  retentionEfficiencyMilli : Nat
  collectionEfficiencyMilli : Nat
  efficiencyCalibrated : Bool
  simultaneousHeatHe : Bool

/-- Eligible only with calibrated nonzero efficiencies and simultaneous heat+He. -/
def HeYieldEfficiencyProvenance.Eligible (p : HeYieldEfficiencyProvenance) : Prop :=
  p.efficiencyCalibrated = true ∧
    p.simultaneousHeatHe = true ∧
    0 < p.retentionEfficiencyMilli ∧
    0 < p.collectionEfficiencyMilli

/-- Miles EMP instantaneous-band posture: no efficiency provenance attached. -/
def milesEmpLacksEfficiencyProvenance : HeYieldEfficiencyProvenance :=
  { retentionEfficiencyMilli := 0
    collectionEfficiencyMilli := 0
    efficiencyCalibrated := false
    simultaneousHeatHe := false }

theorem miles_emp_lacks_efficiency_not_Eligible :
    ¬ milesEmpLacksEfficiencyProvenance.Eligible := by
  intro h
  unfold HeYieldEfficiencyProvenance.Eligible milesEmpLacksEfficiencyProvenance at h
  exact Bool.noConfusion h.1

/-- Expected-yield bookkeeping (EQ-YIELD-ACCT-01) never flips efficiency eligibility. -/
theorem expected_yield_bookkeeping_keeps_miles_emp_ineligible
    (_powerW _totalTime _dutyHundredths : Nat) :
    ¬ milesEmpLacksEfficiencyProvenance.Eligible :=
  miles_emp_lacks_efficiency_not_Eligible

end LenrFormal.YieldAccounting
