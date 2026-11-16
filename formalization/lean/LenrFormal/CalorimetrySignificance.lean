/-!
CalorimetrySignificance — EQ-HEAT-SIG-01 / EQ-HEAT-SIG-NC-01

Integer-scaled bookkeeping for the paper / BDS-302 discovery bar:

    S_heat = Q_excess / σ_Q
    discovery-grade analytics flag requires S_heat ≥ 5

plus honesty locks that arithmetic S_heat alone never proves LENR or
discharges any `EQ-OPEN-*`.

Mirrors
`LENR_SIM_APP_v2/backend/app/physics_engine/calorimetry_significance.py`
(`DISCOVERY_GRADE_SIGMA = 5.0`) and
`sigma_distance.py` quantitative shortfall bookkeeping.

**Claim tier:** Approximate analytics-bar DEF / non-closure only.
Does **not** certify laboratory calorimetry, does **not** verify Q↔σ_Q
pairing, and does **not** set `lenr_proved`.
-/

namespace LenrFormal.CalorimetrySignificance

/-- Hard invariant: nature-proof token stays false on heat-significance surfaces. -/
def lenrProved : Bool := false

theorem lenr_proved_false : lenrProved = false := rfl

/-- EQ-HEAT-SIG-01: discovery-grade σ threshold (paper / BDS-302). -/
def discoveryGradeSigma : Nat := 5

theorem discovery_grade_sigma_is_five :
    discoveryGradeSigma = 5 := rfl

/-- Exploratory Oracle B null-falsify SNR (distinct from discovery). -/
def exploratoryNullFalsifySnr : Nat := 3

theorem exploratory_snr_strictly_below_discovery :
    exploratoryNullFalsifySnr < discoveryGradeSigma := by
  native_decide

/--
Integer milli-watt bookkeeping for S_heat comparison.
`sHeatMilli = floor(1000 * Q / σ)` is supplied as a Nat input — Lean does not
divide reals here; Python owns the float arithmetic.

`abbrev` (not `def`) so `≤` Decidable instances reduce under `native_decide`.
-/
abbrev meetsDiscoveryArithmetic (sHeatMilli thresholdMilli : Nat) : Prop :=
  thresholdMilli ≤ sHeatMilli

/-- EQ-HEAT-SIG-01: 5.000σ in milli-σ units. -/
def discoveryThresholdMilli : Nat := 5000

theorem discovery_threshold_milli_lock :
    discoveryThresholdMilli = 1000 * discoveryGradeSigma := by
  native_decide

/-- Miles peak exploratory arithmetic example: 0.52 / 0.02 = 26σ → 26000 milli. -/
def milesPeakExploratorySHeatMilli : Nat := 26000

theorem miles_peak_arithmetic_meets_five_sigma :
    meetsDiscoveryArithmetic
      milesPeakExploratorySHeatMilli discoveryThresholdMilli := by
  native_decide

/-- Kasagi NiCu verified-pairing example: 1.1 / 0.08 = 13.75σ → 13750 milli. -/
def kasagiNiCuSHeatMilli : Nat := 13750

theorem kasagi_nicu_arithmetic_meets_five_sigma :
    meetsDiscoveryArithmetic kasagiNiCuSHeatMilli discoveryThresholdMilli := by
  native_decide

/-- Kasagi Ni control verified-pairing example (BDS-342): 0.9 / 0.08 = 11.25σ → 11250 milli. -/
def kasagiNiSHeatMilli : Nat := 11250

theorem kasagi_ni_arithmetic_meets_five_sigma :
    meetsDiscoveryArithmetic kasagiNiSHeatMilli discoveryThresholdMilli := by
  native_decide

/-- Below-bar example: 0.08 / 0.02 = 4σ → 4000 milli. -/
def belowBarSHeatMilli : Nat := 4000

theorem below_bar_does_not_meet_five_sigma :
    ¬ meetsDiscoveryArithmetic belowBarSHeatMilli discoveryThresholdMilli := by
  intro h
  exact (Nat.not_le.mpr (by native_decide : belowBarSHeatMilli < discoveryThresholdMilli)) h

/-- Arithmetic shortfall in milli-σ: max(0, threshold − S). -/
def arithmeticShortfallMilli (sHeatMilli thresholdMilli : Nat) : Nat :=
  thresholdMilli - sHeatMilli

theorem below_bar_shortfall_is_one_sigma :
    arithmeticShortfallMilli belowBarSHeatMilli discoveryThresholdMilli = 1000 := by
  native_decide

theorem at_or_above_bar_shortfall_zero
    {sHeatMilli : Nat}
    (h : meetsDiscoveryArithmetic sHeatMilli discoveryThresholdMilli) :
    arithmeticShortfallMilli sHeatMilli discoveryThresholdMilli = 0 := by
  unfold meetsDiscoveryArithmetic arithmeticShortfallMilli at *
  exact Nat.sub_eq_zero_of_le h

/-! ### EQ-HEAT-SIG-NC-01 — arithmetic ≥5σ ≠ discovery / ≠ EQ-OPEN discharge -/

/-- Provenance class for σ_Q (mirrors Python ALLOWED_MOE_PROVENANCE buckets). -/
inductive MoeProvenance where
  | literatureReported
  | literatureReportedInstrumentPrecision
  | literatureReportedInstrumentFloor
  | modelAssumption
  deriving DecidableEq, Repr

/-- Discovery-eligible provenance is measurement-specific total σ_Q only. -/
def discoveryEligibleProvenance (p : MoeProvenance) : Prop :=
  p = MoeProvenance.literatureReported

theorem instrument_precision_not_discovery_eligible :
    ¬ discoveryEligibleProvenance
      MoeProvenance.literatureReportedInstrumentPrecision := by
  intro h
  cases h

/-- EQ-HEAT-SIG-NC-01: McKubre-class instrument floor is never discovery-eligible. -/
theorem instrument_floor_not_discovery_eligible :
    ¬ discoveryEligibleProvenance
      MoeProvenance.literatureReportedInstrumentFloor := by
  intro h
  cases h

/-- UNDISCHARGED: analytics discovery flag needs arithmetic ≥5σ **and**
    literature_reported provenance **and** verified Q↔σ pairing **and**
    non-seed measured Q. Still never proves LENR. -/
def DiscoveryGradeAnalytics
    (sHeatMilli : Nat)
    (provenance : MoeProvenance)
    (pairingVerified nonSeedMeasuredQ : Bool) : Prop :=
  meetsDiscoveryArithmetic sHeatMilli discoveryThresholdMilli
    ∧ discoveryEligibleProvenance provenance
    ∧ pairingVerified = true
    ∧ nonSeedMeasuredQ = true

/-- Soft UI chip for cleared analytics gates — never “≥5σ met” scientific discharge. -/
def softChipIsScientificDischarge : Bool := false

theorem soft_chip_not_scientific_discharge :
    softChipIsScientificDischarge = false := rfl

/-- EQ-HEAT-SIG-NC-01: Miles-class exploratory arithmetic with instrument
    precision and unverified pairing is not a discovery-grade analytics flag. -/
theorem miles_exploratory_not_discovery_grade :
    ¬ DiscoveryGradeAnalytics
      milesPeakExploratorySHeatMilli
      MoeProvenance.literatureReportedInstrumentPrecision
      false
      true := by
  intro h
  exact instrument_precision_not_discovery_eligible h.2.1

/-- EQ-HEAT-SIG-NC-01: instrument-floor EMP rows (McKubre) never clear analytics. -/
theorem mckubre_instrument_floor_not_discovery_grade
    (sHeatMilli : Nat)
    (pairingVerified nonSeedMeasuredQ : Bool) :
    ¬ DiscoveryGradeAnalytics
      sHeatMilli
      MoeProvenance.literatureReportedInstrumentFloor
      pairingVerified
      nonSeedMeasuredQ := by
  intro h
  exact instrument_floor_not_discovery_eligible h.2.1

/-- EQ-HEAT-SIG-NC-01: even a cleared analytics flag does not prove LENR. -/
theorem discovery_grade_analytics_does_not_prove_lenr
    (sHeatMilli : Nat)
    (provenance : MoeProvenance)
    (pairingVerified nonSeedMeasuredQ : Bool) :
    DiscoveryGradeAnalytics sHeatMilli provenance pairingVerified nonSeedMeasuredQ →
      lenrProved = false := by
  intro _
  exact lenr_proved_false

/-- EQ-HEAT-SIG-NC-01: high arithmetic S_heat never discharges EQ-OPEN-YIELD-01
    (integrated yield) by itself — Q5 closure is a separate obligation. -/
def q5IntegratedYieldClosed (yieldDiscrepancy : Nat) : Prop :=
  yieldDiscrepancy = 0

theorem positive_yield_discrepancy_keeps_q5_open
    {yieldDiscrepancy : Nat}
    (h : 0 < yieldDiscrepancy) :
    ¬ q5IntegratedYieldClosed yieldDiscrepancy := by
  intro hClosed
  unfold q5IntegratedYieldClosed at hClosed
  exact (Nat.ne_of_gt h) hClosed

theorem high_s_heat_does_not_close_q5
    (sHeatMilli yieldDiscrepancy : Nat)
    (hArith : meetsDiscoveryArithmetic sHeatMilli discoveryThresholdMilli)
    (hOpen : 0 < yieldDiscrepancy) :
    meetsDiscoveryArithmetic sHeatMilli discoveryThresholdMilli
      ∧ ¬ q5IntegratedYieldClosed yieldDiscrepancy
      ∧ lenrProved = false :=
  ⟨hArith, positive_yield_discrepancy_keeps_q5_open hOpen, lenr_proved_false⟩

/-- EQ-HEAT-SIG-NC-01 (BDS-344): even dual Kasagi NiCu + Ni analytics flags
    (corpus 2/25 pairing) do not prove LENR or close EQ-OPEN-YIELD-01.
    Analytics / EMP UX eligibility ≠ EQ-OPEN discharge ≠ `lenr_proved`.
    Soft chip `analytics_gates_clear` ≠ scientific ≥5σ discharge. -/
theorem dual_kasagi_analytics_does_not_close_eq_open_or_lenr
    (yieldDiscrepancy : Nat)
    (hOpen : 0 < yieldDiscrepancy)
    (_hNiCu : DiscoveryGradeAnalytics
      kasagiNiCuSHeatMilli MoeProvenance.literatureReported true true)
    (_hNi : DiscoveryGradeAnalytics
      kasagiNiSHeatMilli MoeProvenance.literatureReported true true) :
    lenrProved = false
      ∧ ¬ q5IntegratedYieldClosed yieldDiscrepancy
      ∧ softChipIsScientificDischarge = false :=
  ⟨lenr_proved_false,
    positive_yield_discrepancy_keeps_q5_open hOpen,
    soft_chip_not_scientific_discharge⟩

end LenrFormal.CalorimetrySignificance
