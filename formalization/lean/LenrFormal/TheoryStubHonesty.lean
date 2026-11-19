import LenrFormal.OpenObligations

/-!
TheoryStubHonesty — phenomenological theory stubs ⇏ EQ-OPEN / discovery / `lenr_proved`.

Locks the `santilli_icnf` v1 registry stub (and the same pattern for any
phenomenological stub): regime-gated applicability + author-claimed mass-defect
**labels** never invent a hadronic rate law, never emit discovery-grade MoE,
never set `lenr_proved`, and never discharge Q1–Q5 under open witnesses.

Primary cite (Python module / UI): Kadeisvili, Lynch & Yang (2013) —
`kadeisvili2013`. Related `santilli2007` is cite-only (magnecule not modeled).

**Claim tier:** AX honesty / non-closure bookkeeping only. Does **not** prove
LENR occurs. Does **not** close any `EQ-OPEN-*`.
-/

namespace LenrFormal.TheoryStubHonesty

open LenrFormal.OpenObligations

/-- Global nature-proof token (module-local; stays false). -/
def lenrProved : Bool := false

theorem lenr_proved_false : lenrProved = false := rfl

/--
Bookkeeping mirror of a phenomenological theory stub contribution.
Fields match Python `santilli_icnf` honesty provenance (Bool / Nat only).
-/
structure PhenomenologicalTheoryStub where
  /-- Registry `theory_id` (documentation string). -/
  theoryId : String
  /-- True only if an invented rate law were present (must stay false for stubs). -/
  hasInventedRateLaw : Bool
  /-- Reported energy output in milli-watts (stub locks 0). -/
  energyOutputMilliWatts : Nat
  /-- Discovery-grade MoE underwrite flag (must stay false). -/
  discoveryMoe : Bool
  /-- Author-claimed mass-defect label in milli-MeV (not a wattage driver). -/
  claimedMassDefectMilliMeV : Nat
  /-- Contribution-local `lenr_proved` provenance bit. -/
  contributionLenrProved : Bool
  /-- Contribution-local `eq_open_closed` provenance bit. -/
  contributionEqOpenClosed : Bool
  deriving DecidableEq, Repr

/--
Santilli ICNF v1 phenomenological stub as Prefer-merge-locked on tip:
no invented rate, zero watts, no discovery MoE, claimed ~10.339 MeV label only.
-/
def santilliIcnfStub : PhenomenologicalTheoryStub :=
  { theoryId := "santilli_icnf"
    hasInventedRateLaw := false
    energyOutputMilliWatts := 0
    discoveryMoe := false
    claimedMassDefectMilliMeV := 10339
    contributionLenrProved := false
    contributionEqOpenClosed := false }

theorem santilli_stub_id :
    santilliIcnfStub.theoryId = "santilli_icnf" := rfl

theorem santilli_stub_has_no_invented_rate :
    santilliIcnfStub.hasInventedRateLaw = false := rfl

theorem santilli_stub_zero_watts :
    santilliIcnfStub.energyOutputMilliWatts = 0 := rfl

theorem santilli_stub_not_discovery_moe :
    santilliIcnfStub.discoveryMoe = false := rfl

theorem santilli_stub_claimed_mev_label :
    santilliIcnfStub.claimedMassDefectMilliMeV = 10339 := rfl

theorem santilli_stub_contribution_not_lenr_proved :
    santilliIcnfStub.contributionLenrProved = false := rfl

theorem santilli_stub_contribution_eq_open_not_closed :
    santilliIcnfStub.contributionEqOpenClosed = false := rfl

/-- Claimed mass-defect label never drives stub wattage (identity lock). -/
theorem claimed_mass_defect_label_is_not_wattage_driver
    (s : PhenomenologicalTheoryStub)
    (hWatts : s.energyOutputMilliWatts = 0)
    (_hLabel : 0 < s.claimedMassDefectMilliMeV) :
    s.energyOutputMilliWatts = 0 :=
  hWatts

/-- Instantiation: Santilli ~10.339 MeV label with zero watts. -/
theorem santilli_claimed_mev_label_not_wattage :
    santilliIcnfStub.energyOutputMilliWatts = 0
      ∧ santilliIcnfStub.claimedMassDefectMilliMeV = 10339 :=
  ⟨santilli_stub_zero_watts, santilli_stub_claimed_mev_label⟩

/--
EQ-THEORY-STUB-NC-01: an applicable phenomenological stub (no invented rate,
zero watts, no discovery MoE) never sets `lenr_proved` and never closes Q1–Q5
under open witnesses. Author-claimed mass-defect labels do not underwrite
discharge.
-/
theorem phenomenological_stub_does_not_discharge_eq_open
    (s : PhenomenologicalTheoryStub)
    (openRemainder gammaBranching gammaUpperBound : Nat)
    (log10Events : Int)
    (availableEnergy thresholdEnergy yieldDiscrepancy : Nat)
    (hNoRate : s.hasInventedRateLaw = false)
    (hZeroW : s.energyOutputMilliWatts = 0)
    (hNoMoe : s.discoveryMoe = false)
    (hStubLenr : s.contributionLenrProved = false)
    (hStubEq : s.contributionEqOpenClosed = false)
    (hQ1 : 0 < openRemainder)
    (hQ2 : gammaUpperBound < gammaBranching)
    (hQ3 : log10Events < 0)
    (hQ4 : availableEnergy < thresholdEnergy)
    (hQ5 : 0 < yieldDiscrepancy) :
    lenrProved = false
      ∧ s.hasInventedRateLaw = false
      ∧ s.energyOutputMilliWatts = 0
      ∧ s.discoveryMoe = false
      ∧ s.contributionLenrProved = false
      ∧ s.contributionEqOpenClosed = false
      ∧ ¬ q1MeVEnergyGapClosed openRemainder
      ∧ ¬ q2RadiationSuppressionClosed gammaBranching gammaUpperBound
      ∧ ¬ q3RateBudgetClosed log10Events
      ∧ ¬ q4ElectronCaptureSourceClosed availableEnergy thresholdEnergy
      ∧ ¬ q5IntegratedYieldClosed yieldDiscrepancy :=
  ⟨lenr_proved_false,
    hNoRate,
    hZeroW,
    hNoMoe,
    hStubLenr,
    hStubEq,
    positive_remainder_implies_q1_not_closed hQ1,
    gamma_above_bound_implies_q2_not_closed hQ2,
    negative_log_budget_implies_q3_not_closed hQ3,
    energy_deficit_implies_q4_not_closed hQ4,
    positive_yield_discrepancy_implies_q5_not_closed hQ5⟩

/-- Santilli ICNF stub instantiation of EQ-THEORY-STUB-NC-01. -/
theorem santilli_icnf_stub_does_not_discharge_eq_open
    (openRemainder gammaBranching gammaUpperBound : Nat)
    (log10Events : Int)
    (availableEnergy thresholdEnergy yieldDiscrepancy : Nat)
    (hQ1 : 0 < openRemainder)
    (hQ2 : gammaUpperBound < gammaBranching)
    (hQ3 : log10Events < 0)
    (hQ4 : availableEnergy < thresholdEnergy)
    (hQ5 : 0 < yieldDiscrepancy) :
    lenrProved = false
      ∧ santilliIcnfStub.hasInventedRateLaw = false
      ∧ santilliIcnfStub.energyOutputMilliWatts = 0
      ∧ santilliIcnfStub.discoveryMoe = false
      ∧ santilliIcnfStub.contributionLenrProved = false
      ∧ santilliIcnfStub.contributionEqOpenClosed = false
      ∧ ¬ q1MeVEnergyGapClosed openRemainder
      ∧ ¬ q2RadiationSuppressionClosed gammaBranching gammaUpperBound
      ∧ ¬ q3RateBudgetClosed log10Events
      ∧ ¬ q4ElectronCaptureSourceClosed availableEnergy thresholdEnergy
      ∧ ¬ q5IntegratedYieldClosed yieldDiscrepancy :=
  phenomenological_stub_does_not_discharge_eq_open
    santilliIcnfStub
    openRemainder gammaBranching gammaUpperBound
    log10Events
    availableEnergy thresholdEnergy yieldDiscrepancy
    santilli_stub_has_no_invented_rate
    santilli_stub_zero_watts
    santilli_stub_not_discovery_moe
    santilli_stub_contribution_not_lenr_proved
    santilli_stub_contribution_eq_open_not_closed
    hQ1 hQ2 hQ3 hQ4 hQ5

end LenrFormal.TheoryStubHonesty
