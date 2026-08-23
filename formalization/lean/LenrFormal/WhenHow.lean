import LenrFormal.RateBudget
import LenrFormal.Miles

/-!
WhenHow — EQ-WHEN-THRESH-01 / EQ-WHEN-DUTY-01 / EQ-MECH-PATH-01

Predicates for occurrence anchoring, threshold crossing, and mechanism paths.
Definitions only; no `theorem lenr_occurs`.
-/

namespace LenrFormal.WhenHow

open LenrFormal.RateBudget
open LenrFormal.Miles

/-- Miles-band Q (MeV/He) is in [20, 28] when both heat and He rates are positive. -/
def milesBandAnchored (qHundredths : Nat) : Prop :=
  2000 ≤ qHundredths ∧ qHundredths ≤ 2800

/-- Threshold crossed when volumetric rate floor is met (integer bookkeeping). -/
def thresholdCrossed (rateFloor rateMode : Nat) : Prop :=
  rateMode ≥ rateFloor

/-- Integrated yield over duty fraction (bookkeeping). -/
def dutyCycleYield (totalTime dutyHundredths : Nat) : Nat :=
  totalTime * dutyHundredths / 100

inductive MechanismPath where
  | trappedState
  | phononCascade
  | threeBody
  deriving DecidableEq, Repr

def occurrenceAnchored (qHundredths : Nat) : Prop :=
  milesBandAnchored qHundredths

theorem anchored_in_band_implies_occurrence
    (q : Nat)
    (h : milesBandAnchored q) :
    occurrenceAnchored q :=
  h

theorem threshold_implies_crossed
    (floor mode : Nat)
    (h : thresholdCrossed floor mode) :
    mode ≥ floor :=
  h

end LenrFormal.WhenHow
