import LenrFormal.OpenObligations

/-!
CalorimetrySignificance — EQ-HEAT-SIG-01 / EQ-HEAT-SIG-NC-01

Integer-scaled bookkeeping for the paper / BDS-302 discovery bar:

    S_heat = Q_excess / σ_Q
    discovery-grade analytics flag requires S_heat ≥ 5

plus honesty locks that arithmetic S_heat alone never proves LENR or
discharges any `EQ-OPEN-*`.

Mirrors
`LENR_SIM_APP_v2/backend/app/physics_engine/calorimetry_significance.py`
(`DISCOVERY_GRADE_SIGMA = 5.0`, nonempty `moe_citation_keys`, verified
Q↔σ pairing) and `sigma_distance.py` quantitative shortfall bookkeeping.

**Claim tier:** Approximate analytics-bar DEF / non-closure only.
Does **not** certify laboratory calorimetry, does **not** invent
citations or σ_Q, and does **not** set `lenr_proved`.
-/

namespace LenrFormal.CalorimetrySignificance

open LenrFormal.OpenObligations

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

/-- Celani JCMNS 29 exploratory arithmetic: 12 / 2 = 6σ → 6000 milli
    (instrument_precision companion; discovery inventory stays Kasagi 2/26). -/
def celaniPeakExploratorySHeatMilli : Nat := 6000

theorem celani_peak_arithmetic_meets_five_sigma :
    meetsDiscoveryArithmetic
      celaniPeakExploratorySHeatMilli discoveryThresholdMilli := by
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
    literature_reported provenance **and** nonempty citations **and**
    verified Q↔σ pairing **and** non-seed measured Q. Still never proves LENR.
    Mirrors Python ``discovery_grade_analytics`` + ``validate_moe_provenance``
    (empty ``moe_citation_keys`` refuses fabricated lab uncertainty). -/
def DiscoveryGradeAnalytics
    (sHeatMilli : Nat)
    (provenance : MoeProvenance)
    (citationsNonempty pairingVerified nonSeedMeasuredQ : Bool) : Prop :=
  meetsDiscoveryArithmetic sHeatMilli discoveryThresholdMilli
    ∧ discoveryEligibleProvenance provenance
    ∧ citationsNonempty = true
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
      true
      false
      true := by
  intro h
  exact instrument_precision_not_discovery_eligible h.2.1

/-- EQ-HEAT-SIG-NC-01: Celani JCMNS 29 “12 ± 2 W” exploratory hydrate
    (instrument_precision + unverified pairing; S_heat=6) is not discovery-grade.
    Corpus discovery stays Kasagi-only 2/26 — refuse fabricating discovery σ. -/
theorem celani_exploratory_not_discovery_grade :
    ¬ DiscoveryGradeAnalytics
      celaniPeakExploratorySHeatMilli
      MoeProvenance.literatureReportedInstrumentPrecision
      true
      false
      true := by
  intro h
  exact instrument_precision_not_discovery_eligible h.2.1

/-- EQ-HEAT-SIG-NC-01: instrument-floor EMP rows (McKubre) never clear analytics. -/
theorem mckubre_instrument_floor_not_discovery_grade
    (sHeatMilli : Nat)
    (citationsNonempty pairingVerified nonSeedMeasuredQ : Bool) :
    ¬ DiscoveryGradeAnalytics
      sHeatMilli
      MoeProvenance.literatureReportedInstrumentFloor
      citationsNonempty
      pairingVerified
      nonSeedMeasuredQ := by
  intro h
  exact instrument_floor_not_discovery_eligible h.2.1

/-- EQ-HEAT-SIG-NC-01 (BDS-362): empty ``moe_citation_keys`` blocks discovery
    underwriting even when arithmetic ≥5σ, literature_reported, pairing, and
    non-seed Q would otherwise clear. Aligns Lean with Python citation refuse. -/
theorem empty_citations_not_discovery_grade
    (sHeatMilli : Nat)
    (_hArith : meetsDiscoveryArithmetic sHeatMilli discoveryThresholdMilli) :
    ¬ DiscoveryGradeAnalytics
      sHeatMilli
      MoeProvenance.literatureReported
      false
      true
      true := by
  intro h
  have hCite : false = true := h.2.2.1
  cases hCite

/-- EQ-HEAT-SIG-NC-01 (BDS-362): unverified Q↔σ pairing blocks discovery
    underwriting even with nonempty citations + literature_reported + ≥5σ +
    non-seed Q (Miles peak + follow-on ±0.02 class). -/
theorem unverified_pairing_not_discovery_grade
    (sHeatMilli : Nat)
    (_hArith : meetsDiscoveryArithmetic sHeatMilli discoveryThresholdMilli) :
    ¬ DiscoveryGradeAnalytics
      sHeatMilli
      MoeProvenance.literatureReported
      true
      false
      true := by
  intro h
  have hPair : false = true := h.2.2.2.1
  cases hPair

/-- EQ-HEAT-SIG-NC-01 (BDS-362): seed-scale Q blocks discovery underwriting
    even when citations + pairing + literature_reported + ≥5σ clear. -/
theorem seed_scale_q_not_discovery_grade
    (sHeatMilli : Nat)
    (_hArith : meetsDiscoveryArithmetic sHeatMilli discoveryThresholdMilli) :
    ¬ DiscoveryGradeAnalytics
      sHeatMilli
      MoeProvenance.literatureReported
      true
      true
      false := by
  intro h
  have hSeed : false = true := h.2.2.2.2
  cases hSeed

/-- EQ-HEAT-SIG-NC-01: even a cleared analytics flag does not prove LENR. -/
theorem discovery_grade_analytics_does_not_prove_lenr
    (sHeatMilli : Nat)
    (provenance : MoeProvenance)
    (citationsNonempty pairingVerified nonSeedMeasuredQ : Bool) :
    DiscoveryGradeAnalytics
      sHeatMilli provenance citationsNonempty pairingVerified nonSeedMeasuredQ →
      lenrProved = false := by
  intro _
  exact lenr_proved_false

/-- EQ-HEAT-SIG-NC-01: high arithmetic S_heat never discharges EQ-OPEN-YIELD-01
    (integrated yield) by itself — Q5 closure is a separate obligation.
    Uses OpenObligations.q5IntegratedYieldClosed (no local duplicate). -/
theorem high_s_heat_does_not_close_q5
    (sHeatMilli yieldDiscrepancy : Nat)
    (hArith : meetsDiscoveryArithmetic sHeatMilli discoveryThresholdMilli)
    (hOpen : 0 < yieldDiscrepancy) :
    meetsDiscoveryArithmetic sHeatMilli discoveryThresholdMilli
      ∧ ¬ q5IntegratedYieldClosed yieldDiscrepancy
      ∧ lenrProved = false :=
  ⟨hArith, positive_yield_discrepancy_implies_q5_not_closed hOpen, lenr_proved_false⟩

/-- EQ-HEAT-SIG-NC-01 (BDS-362): cite-gated discovery underwriting (citations
    nonempty + verified pairing + literature_reported + ≥5σ + non-seed) still
    does **not** discharge EQ-OPEN-YIELD-01. Strengthens ≥5σ/MoE underwriting
    honesty without claiming heat+He integrated closure. -/
theorem cite_gated_discovery_does_not_underwrite_q5_closure
    (sHeatMilli yieldDiscrepancy : Nat)
    (hOpen : 0 < yieldDiscrepancy)
    (_hDisc : DiscoveryGradeAnalytics
      sHeatMilli MoeProvenance.literatureReported true true true) :
    ¬ q5IntegratedYieldClosed yieldDiscrepancy
      ∧ lenrProved = false
      ∧ softChipIsScientificDischarge = false :=
  ⟨positive_yield_discrepancy_implies_q5_not_closed hOpen,
    lenr_proved_false,
    soft_chip_not_scientific_discharge⟩

/-- EQ-HEAT-SIG-NC-01 (BDS-344): even dual Kasagi NiCu + Ni analytics flags
    (corpus 2/25 pairing; nonempty citations) do not prove LENR or close
    EQ-OPEN-YIELD-01. Analytics / EMP UX eligibility ≠ EQ-OPEN discharge ≠
    `lenr_proved`. Soft chip `analytics_gates_clear` ≠ scientific ≥5σ discharge. -/
theorem dual_kasagi_analytics_does_not_close_eq_open_or_lenr
    (yieldDiscrepancy : Nat)
    (hOpen : 0 < yieldDiscrepancy)
    (_hNiCu : DiscoveryGradeAnalytics
      kasagiNiCuSHeatMilli MoeProvenance.literatureReported true true true)
    (_hNi : DiscoveryGradeAnalytics
      kasagiNiSHeatMilli MoeProvenance.literatureReported true true true) :
    lenrProved = false
      ∧ ¬ q5IntegratedYieldClosed yieldDiscrepancy
      ∧ softChipIsScientificDischarge = false :=
  ⟨lenr_proved_false,
    positive_yield_discrepancy_implies_q5_not_closed hOpen,
    soft_chip_not_scientific_discharge⟩

/-- EQ-HEAT-SIG-NC-01 (BDS-346): a cleared DiscoveryGradeAnalytics flag never
    discharges **any** of Q1–Q5 under stated open witnesses.
    Analytics eligibility ≠ EQ-OPEN-MEV/RAD/RATE/EC/YIELD discharge ≠ `lenr_proved`.
    Soft chip remains non-discharge. -/
theorem discovery_grade_analytics_does_not_close_any_eq_open
    (sHeatMilli : Nat)
    (provenance : MoeProvenance)
    (citationsNonempty pairingVerified nonSeedMeasuredQ : Bool)
    (openRemainder gammaBranching gammaUpperBound : Nat)
    (log10Events : Int)
    (availableEnergy thresholdEnergy yieldDiscrepancy : Nat)
    (hQ1 : 0 < openRemainder)
    (hQ2 : gammaUpperBound < gammaBranching)
    (hQ3 : log10Events < 0)
    (hQ4 : availableEnergy < thresholdEnergy)
    (hQ5 : 0 < yieldDiscrepancy)
    (_hDisc : DiscoveryGradeAnalytics
      sHeatMilli provenance citationsNonempty pairingVerified nonSeedMeasuredQ) :
    lenrProved = false
      ∧ ¬ q1MeVEnergyGapClosed openRemainder
      ∧ ¬ q2RadiationSuppressionClosed gammaBranching gammaUpperBound
      ∧ ¬ q3RateBudgetClosed log10Events
      ∧ ¬ q4ElectronCaptureSourceClosed availableEnergy thresholdEnergy
      ∧ ¬ q5IntegratedYieldClosed yieldDiscrepancy
      ∧ softChipIsScientificDischarge = false :=
  ⟨lenr_proved_false,
    positive_remainder_implies_q1_not_closed hQ1,
    gamma_above_bound_implies_q2_not_closed hQ2,
    negative_log_budget_implies_q3_not_closed hQ3,
    energy_deficit_implies_q4_not_closed hQ4,
    positive_yield_discrepancy_implies_q5_not_closed hQ5,
    soft_chip_not_scientific_discharge⟩

/-- EQ-HEAT-SIG-NC-01 (BDS-346): dual Kasagi analytics flags still leave all
    five EQ-OPEN predicates open under stated witnesses — strengthens the
    BDS-344 Q5-only dual-Kasagi lock to full MEV/RAD/RATE/EC/YIELD non-closure. -/
theorem dual_kasagi_analytics_does_not_close_any_eq_open_or_lenr
    (openRemainder gammaBranching gammaUpperBound : Nat)
    (log10Events : Int)
    (availableEnergy thresholdEnergy yieldDiscrepancy : Nat)
    (hQ1 : 0 < openRemainder)
    (hQ2 : gammaUpperBound < gammaBranching)
    (hQ3 : log10Events < 0)
    (hQ4 : availableEnergy < thresholdEnergy)
    (hQ5 : 0 < yieldDiscrepancy)
    (hNiCu : DiscoveryGradeAnalytics
      kasagiNiCuSHeatMilli MoeProvenance.literatureReported true true true)
    (_hNi : DiscoveryGradeAnalytics
      kasagiNiSHeatMilli MoeProvenance.literatureReported true true true) :
    lenrProved = false
      ∧ ¬ q1MeVEnergyGapClosed openRemainder
      ∧ ¬ q2RadiationSuppressionClosed gammaBranching gammaUpperBound
      ∧ ¬ q3RateBudgetClosed log10Events
      ∧ ¬ q4ElectronCaptureSourceClosed availableEnergy thresholdEnergy
      ∧ ¬ q5IntegratedYieldClosed yieldDiscrepancy
      ∧ softChipIsScientificDischarge = false :=
  discovery_grade_analytics_does_not_close_any_eq_open
    kasagiNiCuSHeatMilli MoeProvenance.literatureReported true true true
    openRemainder gammaBranching gammaUpperBound
    log10Events availableEnergy thresholdEnergy yieldDiscrepancy
    hQ1 hQ2 hQ3 hQ4 hQ5 hNiCu

/-! ### BDS-348 — lab MoE ask receipt ≠ EQ-OPEN discharge -/

/--
UI / runway `NEXT_LAB_MOE_TARGETS` proxies (Bool bookkeeping only).
A `true` bit means the corresponding lab ask was notionally received —
**not** that the matching `EQ-OPEN-*` predicate closed under IR/Lean/ledger
governance. Mirrors served science-evidence lab-ask precision densification.
-/
structure LabAskProxies where
  heatHeCiteGatedMoE : Bool
  calorimetryBeyondKasagi : Bool
  gammaUlEfficiencyCorrected : Bool
  occupationRateCapsMeasured : Bool
  ecThresholdCmPath : Bool
  deriving DecidableEq, Repr

/-- Convenience: all five Prefer-merge lab asks notionally received. -/
def allLabAsksMet : LabAskProxies :=
  { heatHeCiteGatedMoE := true
    calorimetryBeyondKasagi := true
    gammaUlEfficiencyCorrected := true
    occupationRateCapsMeasured := true
    ecThresholdCmPath := true }

/-- Lab-ask receipt never equals scientific / EQ-OPEN discharge. -/
def labAskMetIsEqOpenDischarge : Bool := false

theorem lab_ask_met_is_not_eq_open_discharge :
    labAskMetIsEqOpenDischarge = false := rfl

/-- BDS-375: planned `lenr-ara-daq-sample-v1` ingest stays non-attested.
    Sketch / UI densification never equals EQ-OPEN discharge or `lenr_proved`. -/
def daqSampleIngestPlannedNotAttested : Bool := true

theorem daq_sample_ingest_is_planned_not_attested :
    daqSampleIngestPlannedNotAttested = true := rfl

/-- Planned DAQ sample export never equals scientific / EQ-OPEN discharge. -/
def daqSamplePlannedIsEqOpenDischarge : Bool := false

theorem daq_sample_planned_is_not_eq_open_discharge :
    daqSamplePlannedIsEqOpenDischarge = false := rfl

/--
EQ-HEAT-SIG-NC-01 (BDS-348 + BDS-375 follow-on): even if **all five** next-lab
MoE ask proxies are notionally met (and DiscoveryGradeAnalytics clears), and
even when DAQ sample-v1 ingest is marked planned_not_attested, open witnesses
keep Q1–Q5 open, `lenr_proved` false, and soft chip / lab-ask / DAQ ≠ discharge.
Lab-ask + DAQ provenance densify Prefer-merge honesty without inventing σ.
-/
theorem lab_ask_proxies_do_not_discharge_eq_open
    (proxies : LabAskProxies)
    (sHeatMilli : Nat)
    (provenance : MoeProvenance)
    (citationsNonempty pairingVerified nonSeedMeasuredQ : Bool)
    (openRemainder gammaBranching gammaUpperBound : Nat)
    (log10Events : Int)
    (availableEnergy thresholdEnergy yieldDiscrepancy : Nat)
    (hQ1 : 0 < openRemainder)
    (hQ2 : gammaUpperBound < gammaBranching)
    (hQ3 : log10Events < 0)
    (hQ4 : availableEnergy < thresholdEnergy)
    (hQ5 : 0 < yieldDiscrepancy)
    (_hAsks :
      proxies.heatHeCiteGatedMoE = true
        ∧ proxies.calorimetryBeyondKasagi = true
        ∧ proxies.gammaUlEfficiencyCorrected = true
        ∧ proxies.occupationRateCapsMeasured = true
        ∧ proxies.ecThresholdCmPath = true)
    (_hDisc : DiscoveryGradeAnalytics
      sHeatMilli provenance citationsNonempty pairingVerified nonSeedMeasuredQ) :
    lenrProved = false
      ∧ ¬ q1MeVEnergyGapClosed openRemainder
      ∧ ¬ q2RadiationSuppressionClosed gammaBranching gammaUpperBound
      ∧ ¬ q3RateBudgetClosed log10Events
      ∧ ¬ q4ElectronCaptureSourceClosed availableEnergy thresholdEnergy
      ∧ ¬ q5IntegratedYieldClosed yieldDiscrepancy
      ∧ softChipIsScientificDischarge = false
      ∧ labAskMetIsEqOpenDischarge = false
      ∧ daqSampleIngestPlannedNotAttested = true
      ∧ daqSamplePlannedIsEqOpenDischarge = false :=
  ⟨lenr_proved_false,
    positive_remainder_implies_q1_not_closed hQ1,
    gamma_above_bound_implies_q2_not_closed hQ2,
    negative_log_budget_implies_q3_not_closed hQ3,
    energy_deficit_implies_q4_not_closed hQ4,
    positive_yield_discrepancy_implies_q5_not_closed hQ5,
    soft_chip_not_scientific_discharge,
    lab_ask_met_is_not_eq_open_discharge,
    daq_sample_ingest_is_planned_not_attested,
    daq_sample_planned_is_not_eq_open_discharge⟩

/-- Instantiation: all five lab asks met + dual-Kasagi analytics still ⇏ discharge
    (DAQ sample-v1 stays planned_not_attested; still ≠ EQ-OPEN discharge). -/
theorem all_lab_asks_met_with_dual_kasagi_do_not_discharge
    (openRemainder gammaBranching gammaUpperBound : Nat)
    (log10Events : Int)
    (availableEnergy thresholdEnergy yieldDiscrepancy : Nat)
    (hQ1 : 0 < openRemainder)
    (hQ2 : gammaUpperBound < gammaBranching)
    (hQ3 : log10Events < 0)
    (hQ4 : availableEnergy < thresholdEnergy)
    (hQ5 : 0 < yieldDiscrepancy)
    (hNiCu : DiscoveryGradeAnalytics
      kasagiNiCuSHeatMilli MoeProvenance.literatureReported true true true) :
    lenrProved = false
      ∧ ¬ q1MeVEnergyGapClosed openRemainder
      ∧ ¬ q2RadiationSuppressionClosed gammaBranching gammaUpperBound
      ∧ ¬ q3RateBudgetClosed log10Events
      ∧ ¬ q4ElectronCaptureSourceClosed availableEnergy thresholdEnergy
      ∧ ¬ q5IntegratedYieldClosed yieldDiscrepancy
      ∧ softChipIsScientificDischarge = false
      ∧ labAskMetIsEqOpenDischarge = false
      ∧ daqSampleIngestPlannedNotAttested = true
      ∧ daqSamplePlannedIsEqOpenDischarge = false :=
  lab_ask_proxies_do_not_discharge_eq_open
    allLabAsksMet
    kasagiNiCuSHeatMilli MoeProvenance.literatureReported true true true
    openRemainder gammaBranching gammaUpperBound
    log10Events availableEnergy thresholdEnergy yieldDiscrepancy
    hQ1 hQ2 hQ3 hQ4 hQ5
    ⟨rfl, rfl, rfl, rfl, rfl⟩
    hNiCu

end LenrFormal.CalorimetrySignificance
