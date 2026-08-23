import LenrFormal.RateBudget

/-!
OpenObligations — Q1–Q5 remain UNDISHARGED.

These predicates state closure criteria over explicit integer-scaled inputs.
No definition supplies evidence for its own criterion, and no theorem below
asserts that an open question is closed.
-/

namespace LenrFormal.OpenObligations

open LenrFormal.RateBudget

/-- UNDISHARGED Q1 / EQ-OPEN-MEV-01: no unallocated energy remainder. -/
def q1MeVEnergyGapClosed (openRemainder : Nat) : Prop :=
  openRemainder = 0

/-- UNDISHARGED Q2 / EQ-OPEN-RAD-01: γ branching meets a supplied upper bound. -/
def q2RadiationSuppressionClosed
    (gammaBranching upperBound : Nat) :
    Prop :=
  gammaBranching ≤ upperBound

/-- UNDISHARGED Q3 / EQ-OPEN-RATE-01: the log event budget is nonnegative. -/
def q3RateBudgetClosed (log10Events : Int) : Prop :=
  0 ≤ log10Events

/-- UNDISHARGED Q4 / EQ-OPEN-EC-01: supplied energy reaches the EC threshold. -/
def q4ElectronCaptureSourceClosed
    (availableEnergy thresholdEnergy : Nat) :
    Prop :=
  thresholdEnergy ≤ availableEnergy

/-- UNDISHARGED Q5 / EQ-OPEN-YIELD-01: no integrated-yield discrepancy remains. -/
def q5IntegratedYieldClosed (yieldDiscrepancy : Nat) : Prop :=
  yieldDiscrepancy = 0

theorem positive_remainder_implies_q1_not_closed
    {openRemainder : Nat}
    (h : 0 < openRemainder) :
    ¬ q1MeVEnergyGapClosed openRemainder := by
  intro hClosed
  unfold q1MeVEnergyGapClosed at hClosed
  exact (Nat.ne_of_gt h) hClosed

theorem gamma_above_bound_implies_q2_not_closed
    {gammaBranching upperBound : Nat}
    (h : upperBound < gammaBranching) :
    ¬ q2RadiationSuppressionClosed gammaBranching upperBound := by
  intro hClosed
  unfold q2RadiationSuppressionClosed at hClosed
  exact (Nat.lt_irrefl upperBound) (Nat.lt_of_lt_of_le h hClosed)

theorem two_body_log_budget_is_negative : log10NEvents < 0 :=
  two_body_budget_does_not_close

theorem two_body_q3_not_closed :
    ¬ q3RateBudgetClosed log10NEvents := by
  intro hClosed
  unfold q3RateBudgetClosed at hClosed
  exact
    (Int.lt_irrefl log10NEvents)
    (Int.lt_of_lt_of_le two_body_budget_does_not_close hClosed)

theorem energy_deficit_implies_q4_not_closed
    {availableEnergy thresholdEnergy : Nat}
    (h : availableEnergy < thresholdEnergy) :
    ¬ q4ElectronCaptureSourceClosed availableEnergy thresholdEnergy := by
  intro hClosed
  unfold q4ElectronCaptureSourceClosed at hClosed
  exact (Nat.lt_irrefl availableEnergy) (Nat.lt_of_lt_of_le h hClosed)

theorem positive_yield_discrepancy_implies_q5_not_closed
    {yieldDiscrepancy : Nat}
    (h : 0 < yieldDiscrepancy) :
    ¬ q5IntegratedYieldClosed yieldDiscrepancy := by
  intro hClosed
  unfold q5IntegratedYieldClosed at hClosed
  exact (Nat.ne_of_gt h) hClosed

end LenrFormal.OpenObligations
