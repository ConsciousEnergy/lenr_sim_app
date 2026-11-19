import LenrFormal.OpenObligations
import LenrFormal.Branching
import LenrFormal.RateBudget
import LenrFormal.NBody
import LenrFormal.WeakInteraction
import LenrFormal.YieldAccounting

/-!
OpenQuestionBounds — would-close-if bookkeeping for paper §5A.

These lemmas do **not** discharge EQ-OPEN-*. There is no theorem lenr_occurs.
Named MeV-gap hypotheses are labels, not proofs.
-/

namespace LenrFormal.OpenQuestionBounds

open LenrFormal.OpenObligations
open LenrFormal.Branching
open LenrFormal.RateBudget
open LenrFormal.NBody

/-- Named (unproved) research hypotheses for Q1. Not theorems of nature. -/
inductive MeVGapHypothesis where
  | hagelsteinPhonon
  | dickeSuperradiance
  | becCoherence

/-! ### EQ-MEV-LABEL-NC-01 — named WH labels ⇏ Q1

Affirmative EQ-OPEN-MEV-01 needs a constrained phonon→nuclear matrix element
and occupation probability. Named Hagelstein / Dicke / BEC hypotheses are
**labels only** until those witnesses are experimentally constrained. -/

/-- Q1 channel underwrite: hypothesis label plus constraint flags. -/
structure MeVChannelUnderwrite where
  hypothesis : MeVGapHypothesis
  matrixElementConstrained : Bool
  occupationConstrained : Bool

/-- Eligible only when both matrix element and occupation are constrained. -/
def MeVChannelUnderwrite.Eligible (u : MeVChannelUnderwrite) : Prop :=
  u.matrixElementConstrained = true ∧ u.occupationConstrained = true

/-- Label-only posture (no constrained |M|² / occupation). -/
def labeledHypothesisOnly (h : MeVGapHypothesis) : MeVChannelUnderwrite :=
  { hypothesis := h
    matrixElementConstrained := false
    occupationConstrained := false }

theorem labeled_hypothesis_not_Eligible (h : MeVGapHypothesis) :
    ¬ (labeledHypothesisOnly h).Eligible := by
  intro he
  unfold MeVChannelUnderwrite.Eligible labeledHypothesisOnly at he
  exact Bool.noConfusion he.1

/-- Ineligible label-only channel ⇏ Q1 closed. -/
theorem ineligible_mev_channel_does_not_close_q1
    (u : MeVChannelUnderwrite)
    (h : ¬ u.Eligible)
    (openRemainder : Nat) :
    ¬ (u.Eligible ∧ q1MeVEnergyGapClosed openRemainder) := by
  intro ⟨he, _⟩
  exact h he

theorem labeled_hypothesis_does_not_close_q1
    (h : MeVGapHypothesis)
    (openRemainder : Nat) :
    ¬ ((labeledHypothesisOnly h).Eligible ∧ q1MeVEnergyGapClosed openRemainder) :=
  ineligible_mev_channel_does_not_close_q1
    (labeledHypothesisOnly h)
    (labeled_hypothesis_not_Eligible h)
    openRemainder

/-- Q1 would close if the unallocated remainder is identically zero. -/
def q1WouldCloseIf (openRemainder : Nat) : Prop :=
  q1MeVEnergyGapClosed openRemainder

theorem q1_closes_when_remainder_zero : q1WouldCloseIf 0 := rfl

/-- Occupancy input for the Q3 would-close-if product (RateBudget). -/
def occupancyInput : Nat := 1

/-- Collective-factor cap matching the engine clamp (not a fitted occupancy). -/
def collectiveFactorCap : Nat := 1000000

theorem q3_would_close_if_occupancy_and_fusion
    {nOcc fNuc n0 f0 : Nat}
    (hn : n0 ≤ nOcc)
    (hf : f0 ≤ fNuc) :
    n0 * f0 ≤ rateProduct nOcc fNuc :=
  would_close_if hn hf

theorem q3_collective_cap_matches_engine :
    collective occupancyInput ≤ collectiveFactorCap := by
  native_decide

/-- Q2: lattice phonon/gamma ratio meets the 10^11 bookkeeping target. -/
def q2WouldCloseIf (phononOverGamma : Nat) : Prop :=
  latticeGammaTarget ≤ phononOverGamma

theorem q2_would_close_if_ratio_meets_target
    {ratio : Nat} (h : latticeGammaTarget ≤ ratio) :
    q2WouldCloseIf ratio := h

theorem q2_target_is_1e11 : latticeGammaTarget = 100000000000 := rfl

/-- Stated double-layer energy 0.1 eV in millielectronvolts. -/
def doubleLayer_meV : Nat := 100

/-- Electron-capture threshold 0.782 MeV in millielectronvolts. -/
def ecThreshold_meV : Nat := 782000000

theorem q4_deficit_factor :
    ecThreshold_meV / doubleLayer_meV = 7820000 := by
  native_decide

theorem q4_double_layer_deficit :
    1000000 * doubleLayer_meV < ecThreshold_meV := by
  native_decide

theorem q4_stated_numbers_do_not_close :
    ¬ q4ElectronCaptureSourceClosed doubleLayer_meV ecThreshold_meV :=
  energy_deficit_implies_q4_not_closed (by native_decide)

theorem ecThreshold_meV_matches_weak_interaction :
    ecThreshold_meV = WeakInteraction.threshold_meV := rfl

theorem doubleLayer_meV_is_weak_band_lo :
    doubleLayer_meV = WeakInteraction.doubleLayerLo_meV := rfl

/-- The stated 0.1 eV deficit is one instance of the EQ-OPEN-EC-BOUND-01
    family; still does not close Q4. -/
theorem q4_stated_numbers_instance_of_cm_family :
    ¬ q4ElectronCaptureSourceClosed doubleLayer_meV ecThreshold_meV :=
  WeakInteraction.double_layer_band_does_not_close
    (Nat.le_trans (Nat.le_of_eq doubleLayer_meV_is_weak_band_lo)
      WeakInteraction.double_layer_band_ordered)

/-- Instantaneous Miles EMP band (~2×) as integer factors. -/
def milesInstantaneousBandLo : Nat := 1
def milesInstantaneousBandHi : Nat := 3

/-- Integrated yield discrepancy remainder band (paper §5A.5 / §5.2.2). -/
def integratedYieldDiscrepancyLo : Nat := 100
def integratedYieldDiscrepancyHi : Nat := 10000

def q5InstantaneousMilesInBand (factor : Nat) : Prop :=
  milesInstantaneousBandLo ≤ factor ∧ factor ≤ milesInstantaneousBandHi

def q5WouldCloseIf (integratedRemainder : Nat) : Prop :=
  q5IntegratedYieldClosed integratedRemainder

theorem q5_integrated_band_is_open_remainder :
    integratedYieldDiscrepancyLo ≤ integratedYieldDiscrepancyHi := by
  native_decide

theorem q5_would_close_if_zero_remainder : q5WouldCloseIf 0 := rfl

/-- Integrated remainder lies in the reported 100–10000 band (DEF, not a measurement). -/
def q5IntegratedRemainderInBand (integratedRemainder : Nat) : Prop :=
  integratedYieldDiscrepancyLo ≤ integratedRemainder ∧
    integratedRemainder ≤ integratedYieldDiscrepancyHi

theorem q5_integrated_band_lo_in_band :
    q5IntegratedRemainderInBand integratedYieldDiscrepancyLo :=
  ⟨Nat.le_refl _, by decide⟩

/-- EQ-OPEN-YIELD-NC-01: any remainder in the integrated band leaves Q5 not closed. -/
theorem q5_integrated_band_remainder_not_closed
    {integratedRemainder : Nat}
    (h : q5IntegratedRemainderInBand integratedRemainder) :
    ¬ q5WouldCloseIf integratedRemainder :=
  positive_yield_discrepancy_implies_q5_not_closed
    (Nat.lt_of_lt_of_le (by decide) h.1)

/--
EQ-OPEN-YIELD-NC-01 honesty lock: instantaneous Miles EMP band membership does
not discharge Q5 over the integrated band. The `factor` hypothesis is unused by
design — it carries no information about the integrated remainder.
-/
theorem instantaneous_miles_band_does_not_discharge_q5
    {factor : Nat}
    (_hMiles : q5InstantaneousMilesInBand factor) :
    ¬ (∀ integratedRemainder, q5IntegratedRemainderInBand integratedRemainder →
        q5WouldCloseIf integratedRemainder) := fun hAll =>
  q5_integrated_band_remainder_not_closed q5_integrated_band_lo_in_band
    (hAll _ q5_integrated_band_lo_in_band)

/-- EQ-OPEN-YIELD-NC-01: Miles band membership does not imply `q5IntegratedYieldClosed`. -/
theorem miles_band_does_not_imply_q5_closed :
    ¬ (∀ factor integratedRemainder, q5InstantaneousMilesInBand factor →
        q5IntegratedYieldClosed integratedRemainder) := fun hAll =>
  q5_integrated_band_remainder_not_closed q5_integrated_band_lo_in_band
    (hAll milesInstantaneousBandLo integratedYieldDiscrepancyLo
      ⟨Nat.le_refl _, by decide⟩)

/-! ### EQ-YIELD-MILES-EMP-NC-01 — Miles EMP ~2× heat/He ⇏ integrated yield (BDS-395) -/

/-- Canonical ~2× instantaneous Miles EMP heat/He factor (inside [1,3] band). -/
def milesEmpApproxTwoFactor : Nat := 2

theorem miles_emp_approx_two_in_band :
    q5InstantaneousMilesInBand milesEmpApproxTwoFactor := by
  unfold milesEmpApproxTwoFactor q5InstantaneousMilesInBand
    milesInstantaneousBandLo milesInstantaneousBandHi
  exact ⟨by decide, by decide⟩

/-- Provenance kind for Miles heat/He EMP vs integrated yield surfaces. -/
inductive MilesEmpEvidenceKind where
  /-- Instantaneous Miles EMP heat↔He correlation band (~2×; miles1993). -/
  | instantaneousHeatHeBand
  /-- Duty-cycle expected-yield bookkeeping (EQ-YIELD-ACCT-01; no observed ΔN). -/
  | expectedDutyCycleBookkeeping
  /-- Cite-gated time-resolved simultaneous heat+He with calibrated efficiencies. -/
  | calibratedSimultaneousIntegratedYield
  deriving DecidableEq, Repr

/-- UNDISHARGED: integrated ⁴He/heat yield discharge requires calibrated
    simultaneous integrated provenance. Instantaneous Miles EMP never inhabits it. -/
def IntegratedYieldDischarge (kinds : List MilesEmpEvidenceKind) : Prop :=
  kinds ≠ [] ∧
    ∀ k ∈ kinds, k = MilesEmpEvidenceKind.calibratedSimultaneousIntegratedYield

/-- Hard honesty: nature-proof token stays false on YIELD / Miles EMP surfaces. -/
def lenrProved : Bool := false

theorem yield_lenr_proved_false : lenrProved = false := rfl

/-- Instantaneous Miles EMP ~2× is never itself integrated-yield discharge. -/
def milesEmpIsIntegratedYieldDischarge : Bool := false

theorem miles_emp_is_not_integrated_yield_discharge :
    milesEmpIsIntegratedYieldDischarge = false := rfl

/-- EQ-YIELD-MILES-EMP-NC-01: a bag containing instantaneous Miles EMP heat/He
    band evidence is not integrated-yield discharge. -/
theorem miles_emp_band_does_not_entail_integrated_yield_discharge
    {kinds : List MilesEmpEvidenceKind}
    (h : MilesEmpEvidenceKind.instantaneousHeatHeBand ∈ kinds) :
    ¬ IntegratedYieldDischarge kinds := by
  intro hDisc
  have : MilesEmpEvidenceKind.instantaneousHeatHeBand =
      MilesEmpEvidenceKind.calibratedSimultaneousIntegratedYield :=
    hDisc.2 _ h
  cases this

/-- Expected-yield duty bookkeeping likewise never underwrites discharge. -/
theorem expected_duty_bookkeeping_does_not_entail_integrated_yield_discharge
    {kinds : List MilesEmpEvidenceKind}
    (h : MilesEmpEvidenceKind.expectedDutyCycleBookkeeping ∈ kinds) :
    ¬ IntegratedYieldDischarge kinds := by
  intro hDisc
  have : MilesEmpEvidenceKind.expectedDutyCycleBookkeeping =
      MilesEmpEvidenceKind.calibratedSimultaneousIntegratedYield :=
    hDisc.2 _ h
  cases this

/-- Instantiation: Miles EMP ~2× alone keeps Q5 open / `lenr_proved` false. -/
theorem miles_emp_approx_two_alone_keeps_yield_open :
    q5InstantaneousMilesInBand milesEmpApproxTwoFactor
      ∧ ¬ IntegratedYieldDischarge
          [MilesEmpEvidenceKind.instantaneousHeatHeBand]
      ∧ milesEmpIsIntegratedYieldDischarge = false
      ∧ ¬ q5IntegratedYieldClosed integratedYieldDiscrepancyLo
      ∧ lenrProved = false := by
  refine ⟨miles_emp_approx_two_in_band, ?_,
    miles_emp_is_not_integrated_yield_discharge, ?_, yield_lenr_proved_false⟩
  · exact miles_emp_band_does_not_entail_integrated_yield_discharge (by simp)
  · exact q5_integrated_band_remainder_not_closed q5_integrated_band_lo_in_band

/-- Mixed bag: Miles EMP band + expected-yield bookkeeping still ⇏ discharge. -/
theorem miles_emp_with_expected_bookkeeping_keeps_yield_open :
    ¬ IntegratedYieldDischarge
        [MilesEmpEvidenceKind.instantaneousHeatHeBand,
          MilesEmpEvidenceKind.expectedDutyCycleBookkeeping]
      ∧ ¬ q5IntegratedYieldClosed integratedYieldDiscrepancyLo
      ∧ lenrProved = false := by
  refine ⟨?_, q5_integrated_band_remainder_not_closed q5_integrated_band_lo_in_band,
    yield_lenr_proved_false⟩
  exact miles_emp_band_does_not_entail_integrated_yield_discharge (by simp)

/-- EQ-YIELD-MILES-EMP-NC-01 ∘ EQ-OPEN-YIELD-01: ~2× Miles EMP factor never
    closes Q5 for any integrated remainder in the open DEF band. -/
theorem miles_emp_approx_two_does_not_close_q5
    {integratedRemainder : Nat}
    (hBand : q5IntegratedRemainderInBand integratedRemainder) :
    q5InstantaneousMilesInBand milesEmpApproxTwoFactor
      ∧ ¬ IntegratedYieldDischarge
          [MilesEmpEvidenceKind.instantaneousHeatHeBand]
      ∧ ¬ q5IntegratedYieldClosed integratedRemainder
      ∧ milesEmpIsIntegratedYieldDischarge = false
      ∧ lenrProved = false := by
  refine ⟨miles_emp_approx_two_in_band, ?_,
    q5_integrated_band_remainder_not_closed hBand,
    miles_emp_is_not_integrated_yield_discharge, yield_lenr_proved_false⟩
  exact miles_emp_band_does_not_entail_integrated_yield_discharge (by simp)

/-- Even a (hypothetical) calibrated integrated-yield discharge bag does not
    flip `lenr_proved`. Distinct from EQ-YIELD-EFF-NC-01 (efficiency provenance). -/
theorem integrated_yield_discharge_does_not_flip_lenr
    {kinds : List MilesEmpEvidenceKind}
    (_h : IntegratedYieldDischarge kinds) :
    lenrProved = false
      ∧ milesEmpIsIntegratedYieldDischarge = false :=
  ⟨yield_lenr_proved_false, miles_emp_is_not_integrated_yield_discharge⟩

/-! ### EQ-YIELD-EFF-NC-01 — retention/collection efficiency ⇏ Q5 -/

open LenrFormal.YieldAccounting

/-- EQ-YIELD-EFF-NC-01: ineligible efficiency provenance ⇏ Q5 closed. -/
theorem ineligible_he_efficiency_does_not_close_q5
    (p : HeYieldEfficiencyProvenance)
    (h : ¬ p.Eligible)
    (integratedRemainder : Nat) :
    ¬ (p.Eligible ∧ q5IntegratedYieldClosed integratedRemainder) := by
  intro ⟨he, _⟩
  exact h he

/-- Miles EMP without retention/collection efficiency never closes Q5. -/
theorem miles_emp_without_efficiency_does_not_close_q5
    (integratedRemainder : Nat) :
    ¬ (milesEmpLacksEfficiencyProvenance.Eligible ∧
        q5IntegratedYieldClosed integratedRemainder) :=
  ineligible_he_efficiency_does_not_close_q5
    milesEmpLacksEfficiencyProvenance
    miles_emp_lacks_efficiency_not_Eligible
    integratedRemainder

end LenrFormal.OpenQuestionBounds
