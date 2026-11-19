import LenrFormal.Miles
import LenrFormal.WhenHow

/-!
YieldAccounting — EQ-YIELD-ACCT-01 (duty-cycle expected-yield bookkeeping) /
EQ-YIELD-EFF-NC-01 (retention/collection efficiency ⇏ Q5) /
EQ-YIELD-SIMULT-NC-01 (non-simultaneous / efficiency-less pairing ⇏ discharge)

Mirrors `build_integrated_yield_question`: expected He-4 yield
N_exp = (Miles atoms·s⁻¹·W⁻¹) × P_W × t_active with t_active = t_total × f_duty.
Scaled integers: N_exp / 10⁹ = milesRate_div_1e9 × P_W × dutyCycleYield t f_duty.

This is an EXPECTED yield from the Miles conversion only. No observed integrated
yield is an input, so no definition here can witness ΔN_He,integrated = 0;
EQ-OPEN-YIELD-01 stays OPEN.

EQ-YIELD-EFF-NC-01: missing retention/collection efficiency provenance (and
Miles EMP band alone) keep integrated underwriting ineligible for Q5.

EQ-YIELD-SIMULT-NC-01 (BDS-400): non-simultaneous or efficiency-less He+calorimetry
pairing never inhabits simultaneous paired-yield discharge. Distinct from
EQ-YIELD-EFF-NC-01 (Eligible structure) and EQ-YIELD-MILES-EMP-NC-01 (Miles EMP kinds).
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

/-! ### EQ-YIELD-SIMULT-NC-01 — non-simultaneous / efficiency-less pairing ⇏ discharge (BDS-400)

EQ-OPEN-YIELD-01 `still_missing` is time-resolved simultaneous heat + He.
Non-simultaneous He+calorimetry pairing and efficiency-less pairing never
inhabit that witness.

Distinct from EQ-YIELD-EFF-NC-01 (`HeYieldEfficiencyProvenance` eligibility)
and EQ-YIELD-MILES-EMP-NC-01 (`MilesEmpEvidenceKind` / `IntegratedYieldDischarge`).
-/

/-- Provenance kind for He + calorimetry pairing surfaces. -/
inductive HeCaloPairingEvidenceKind where
  /-- He and calorimetry reported in different campaigns / non-overlapping windows. -/
  | nonSimultaneousHeCaloPairing
  /-- He+heat reported together but without retention/collection efficiency. -/
  | efficiencyLessHeCaloPairing
  /-- Sequential He-then-heat (or heat-then-He) without time coincidence. -/
  | sequentialHeThenHeatPairing
  /-- Cite-gated time-resolved simultaneous heat+He with calibrated efficiencies. -/
  | calibratedSimultaneousHeCalo
  deriving DecidableEq, Repr

/-- UNDISHARGED: simultaneous paired-yield discharge requires calibrated
    simultaneous He+calorimetry. Non-simultaneous / efficiency-less pairings
    never inhabit it. -/
def SimultaneousPairedYieldDischarge
    (kinds : List HeCaloPairingEvidenceKind) : Prop :=
  kinds ≠ [] ∧
    ∀ k ∈ kinds, k = HeCaloPairingEvidenceKind.calibratedSimultaneousHeCalo

/-- Hard honesty: non-simultaneous pairing is never simultaneous discharge. -/
def nonSimultaneousIsPairedYieldDischarge : Bool := false

theorem non_simultaneous_is_not_paired_yield_discharge :
    nonSimultaneousIsPairedYieldDischarge = false := rfl

/-- Efficiency-less pairing likewise never is simultaneous discharge. -/
def efficiencyLessIsPairedYieldDischarge : Bool := false

theorem efficiency_less_is_not_paired_yield_discharge :
    efficiencyLessIsPairedYieldDischarge = false := rfl

/-- Nature-proof token stays false on YIELD / pairing surfaces. -/
def yieldSimultLenrProved : Bool := false

theorem yield_simult_lenr_proved_false : yieldSimultLenrProved = false := rfl

/-- EQ-YIELD-SIMULT-NC-01: non-simultaneous He+calo pairing ⇏ discharge. -/
theorem non_simultaneous_pairing_does_not_entail_paired_yield_discharge
    {kinds : List HeCaloPairingEvidenceKind}
    (h : HeCaloPairingEvidenceKind.nonSimultaneousHeCaloPairing ∈ kinds) :
    ¬ SimultaneousPairedYieldDischarge kinds := by
  intro hDisc
  have : HeCaloPairingEvidenceKind.nonSimultaneousHeCaloPairing =
      HeCaloPairingEvidenceKind.calibratedSimultaneousHeCalo :=
    hDisc.2 _ h
  cases this

/-- Efficiency-less He+calo pairing likewise never underwrites discharge. -/
theorem efficiency_less_pairing_does_not_entail_paired_yield_discharge
    {kinds : List HeCaloPairingEvidenceKind}
    (h : HeCaloPairingEvidenceKind.efficiencyLessHeCaloPairing ∈ kinds) :
    ¬ SimultaneousPairedYieldDischarge kinds := by
  intro hDisc
  have : HeCaloPairingEvidenceKind.efficiencyLessHeCaloPairing =
      HeCaloPairingEvidenceKind.calibratedSimultaneousHeCalo :=
    hDisc.2 _ h
  cases this

/-- Sequential He-then-heat pairing likewise never underwrites discharge. -/
theorem sequential_pairing_does_not_entail_paired_yield_discharge
    {kinds : List HeCaloPairingEvidenceKind}
    (h : HeCaloPairingEvidenceKind.sequentialHeThenHeatPairing ∈ kinds) :
    ¬ SimultaneousPairedYieldDischarge kinds := by
  intro hDisc
  have : HeCaloPairingEvidenceKind.sequentialHeThenHeatPairing =
      HeCaloPairingEvidenceKind.calibratedSimultaneousHeCalo :=
    hDisc.2 _ h
  cases this

/-- Instantiation: non-simultaneous + efficiency-less keep discharge open. -/
theorem non_simultaneous_with_efficiency_less_keeps_yield_open :
    ¬ SimultaneousPairedYieldDischarge
        [HeCaloPairingEvidenceKind.nonSimultaneousHeCaloPairing,
          HeCaloPairingEvidenceKind.efficiencyLessHeCaloPairing]
      ∧ nonSimultaneousIsPairedYieldDischarge = false
      ∧ efficiencyLessIsPairedYieldDischarge = false
      ∧ yieldSimultLenrProved = false := by
  refine ⟨?_, non_simultaneous_is_not_paired_yield_discharge,
    efficiency_less_is_not_paired_yield_discharge, yield_simult_lenr_proved_false⟩
  exact non_simultaneous_pairing_does_not_entail_paired_yield_discharge (by simp)

/-- Mixed bag: sequential + efficiency-less still ⇏ discharge. -/
theorem sequential_with_efficiency_less_keeps_yield_open :
    ¬ SimultaneousPairedYieldDischarge
        [HeCaloPairingEvidenceKind.sequentialHeThenHeatPairing,
          HeCaloPairingEvidenceKind.efficiencyLessHeCaloPairing]
      ∧ yieldSimultLenrProved = false := by
  refine ⟨?_, yield_simult_lenr_proved_false⟩
  exact sequential_pairing_does_not_entail_paired_yield_discharge (by simp)

/-- Even a (hypothetical) calibrated simultaneous bag does not flip `lenr_proved`. -/
theorem simultaneous_paired_yield_discharge_does_not_flip_lenr
    {kinds : List HeCaloPairingEvidenceKind}
    (_h : SimultaneousPairedYieldDischarge kinds) :
    yieldSimultLenrProved = false :=
  yield_simult_lenr_proved_false

end LenrFormal.YieldAccounting
