import LenrFormal.OpenObligations
import LenrFormal.Branching
import LenrFormal.RateBudget
import LenrFormal.NBody

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

end LenrFormal.OpenQuestionBounds
