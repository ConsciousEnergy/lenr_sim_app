import LenrFormal.OpenObligations

/-!
TheoryStubHonesty — phenomenological theory stubs ⇏ EQ-OPEN / discovery / `lenr_proved`.

Locks the `santilli_icnf` v1, `shoulders_evo` P0, `holmlid_udh` P0, and
`schwinger_lattice` P0 registry stubs (and the same pattern for any
phenomenological stub): regime-gated applicability + author-claimed mass-defect
**labels** (or free exploratory params) never invent a nuclear rate law, never
emit discovery-grade MoE, never set `lenr_proved`, and never discharge Q1–Q5
under open witnesses.

Primary cites: Kadeisvili, Lynch & Yang (2013) — `kadeisvili2013` (Santilli);
Shoulders (1991/1996) EVO reports; Holmlid arXiv:1302.2781 / 1508.01332
(`holmlid_udh` ≠ `kim_bec`); Schwinger Cold Fusion / NEAL LENR-CANR PDFs
(historical-control scaffold). Related `santilli2007` is cite-only.

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

/--
Shoulders EVO / charge-cluster P0 phenomenological stub:
no invented rate, zero watts, no discovery MoE, no author MeV mass-defect label
(`claimedMassDefectMilliMeV = 0`). Exploratory `cluster_charge_q` stays a free
simulator parameter — never a wattage / fusion-rate driver.
-/
def shouldersEvoStub : PhenomenologicalTheoryStub :=
  { theoryId := "shoulders_evo"
    hasInventedRateLaw := false
    energyOutputMilliWatts := 0
    discoveryMoe := false
    claimedMassDefectMilliMeV := 0
    contributionLenrProved := false
    contributionEqOpenClosed := false }

theorem shoulders_stub_id :
    shouldersEvoStub.theoryId = "shoulders_evo" := rfl

theorem shoulders_stub_has_no_invented_rate :
    shouldersEvoStub.hasInventedRateLaw = false := rfl

theorem shoulders_stub_zero_watts :
    shouldersEvoStub.energyOutputMilliWatts = 0 := rfl

theorem shoulders_stub_not_discovery_moe :
    shouldersEvoStub.discoveryMoe = false := rfl

theorem shoulders_stub_no_mev_label :
    shouldersEvoStub.claimedMassDefectMilliMeV = 0 := rfl

theorem shoulders_stub_contribution_not_lenr_proved :
    shouldersEvoStub.contributionLenrProved = false := rfl

theorem shoulders_stub_contribution_eq_open_not_closed :
    shouldersEvoStub.contributionEqOpenClosed = false := rfl

/--
EQ-SHOULDERS-STUB-NC-01: exploratory free params (e.g. cluster charge scale)
never underwrite stub wattage when energy stays locked at 0.
-/
theorem shoulders_free_param_not_wattage_driver
    (s : PhenomenologicalTheoryStub)
    (hId : s.theoryId = "shoulders_evo")
    (hWatts : s.energyOutputMilliWatts = 0)
    (_hFreeParamPresent : True) :
    s.energyOutputMilliWatts = 0 ∧ s.theoryId = "shoulders_evo" :=
  ⟨hWatts, hId⟩

theorem shoulders_evo_free_param_not_wattage :
    shouldersEvoStub.energyOutputMilliWatts = 0
      ∧ shouldersEvoStub.theoryId = "shoulders_evo" :=
  shoulders_free_param_not_wattage_driver
    shouldersEvoStub shoulders_stub_id shoulders_stub_zero_watts trivial

/-- Shoulders EVO stub instantiation of EQ-THEORY-STUB-NC-01 / EQ-SHOULDERS-STUB-NC-01. -/
theorem shoulders_evo_stub_does_not_discharge_eq_open
    (openRemainder gammaBranching gammaUpperBound : Nat)
    (log10Events : Int)
    (availableEnergy thresholdEnergy yieldDiscrepancy : Nat)
    (hQ1 : 0 < openRemainder)
    (hQ2 : gammaUpperBound < gammaBranching)
    (hQ3 : log10Events < 0)
    (hQ4 : availableEnergy < thresholdEnergy)
    (hQ5 : 0 < yieldDiscrepancy) :
    lenrProved = false
      ∧ shouldersEvoStub.hasInventedRateLaw = false
      ∧ shouldersEvoStub.energyOutputMilliWatts = 0
      ∧ shouldersEvoStub.discoveryMoe = false
      ∧ shouldersEvoStub.contributionLenrProved = false
      ∧ shouldersEvoStub.contributionEqOpenClosed = false
      ∧ ¬ q1MeVEnergyGapClosed openRemainder
      ∧ ¬ q2RadiationSuppressionClosed gammaBranching gammaUpperBound
      ∧ ¬ q3RateBudgetClosed log10Events
      ∧ ¬ q4ElectronCaptureSourceClosed availableEnergy thresholdEnergy
      ∧ ¬ q5IntegratedYieldClosed yieldDiscrepancy :=
  phenomenological_stub_does_not_discharge_eq_open
    shouldersEvoStub
    openRemainder gammaBranching gammaUpperBound
    log10Events
    availableEnergy thresholdEnergy yieldDiscrepancy
    shoulders_stub_has_no_invented_rate
    shoulders_stub_zero_watts
    shoulders_stub_not_discovery_moe
    shoulders_stub_contribution_not_lenr_proved
    shoulders_stub_contribution_eq_open_not_closed
    hQ1 hQ2 hQ3 hQ4 hQ5

/--
Holmlid ultra-dense H(0)/D(0) P0 phenomenological stub (≠ Kim BECNF):
no invented rate, zero watts, no discovery MoE, no author MeV mass-defect
label. Exploratory `internuclear_pm` / TOF placeholders never drive wattage.
-/
def holmlidUdhStub : PhenomenologicalTheoryStub :=
  { theoryId := "holmlid_udh"
    hasInventedRateLaw := false
    energyOutputMilliWatts := 0
    discoveryMoe := false
    claimedMassDefectMilliMeV := 0
    contributionLenrProved := false
    contributionEqOpenClosed := false }

theorem holmlid_stub_id :
    holmlidUdhStub.theoryId = "holmlid_udh" := rfl

theorem holmlid_stub_has_no_invented_rate :
    holmlidUdhStub.hasInventedRateLaw = false := rfl

theorem holmlid_stub_zero_watts :
    holmlidUdhStub.energyOutputMilliWatts = 0 := rfl

theorem holmlid_stub_not_discovery_moe :
    holmlidUdhStub.discoveryMoe = false := rfl

theorem holmlid_stub_no_mev_label :
    holmlidUdhStub.claimedMassDefectMilliMeV = 0 := rfl

theorem holmlid_stub_contribution_not_lenr_proved :
    holmlidUdhStub.contributionLenrProved = false := rfl

theorem holmlid_stub_contribution_eq_open_not_closed :
    holmlidUdhStub.contributionEqOpenClosed = false := rfl

/--
EQ-HOLMLID-STUB-NC-01: ultra-dense H(0)/D(0) state / TOF free params
never underwrite stub wattage when energy stays locked at 0; ≠ Kim BECNF.
-/
theorem holmlid_free_param_not_wattage_driver
    (s : PhenomenologicalTheoryStub)
    (hId : s.theoryId = "holmlid_udh")
    (hWatts : s.energyOutputMilliWatts = 0)
    (_hNotKimBec : True) :
    s.energyOutputMilliWatts = 0 ∧ s.theoryId = "holmlid_udh" :=
  ⟨hWatts, hId⟩

theorem holmlid_udh_free_param_not_wattage :
    holmlidUdhStub.energyOutputMilliWatts = 0
      ∧ holmlidUdhStub.theoryId = "holmlid_udh" :=
  holmlid_free_param_not_wattage_driver
    holmlidUdhStub holmlid_stub_id holmlid_stub_zero_watts trivial

/-- Holmlid UDH stub instantiation of EQ-THEORY-STUB-NC-01 / EQ-HOLMLID-STUB-NC-01. -/
theorem holmlid_udh_stub_does_not_discharge_eq_open
    (openRemainder gammaBranching gammaUpperBound : Nat)
    (log10Events : Int)
    (availableEnergy thresholdEnergy yieldDiscrepancy : Nat)
    (hQ1 : 0 < openRemainder)
    (hQ2 : gammaUpperBound < gammaBranching)
    (hQ3 : log10Events < 0)
    (hQ4 : availableEnergy < thresholdEnergy)
    (hQ5 : 0 < yieldDiscrepancy) :
    lenrProved = false
      ∧ holmlidUdhStub.hasInventedRateLaw = false
      ∧ holmlidUdhStub.energyOutputMilliWatts = 0
      ∧ holmlidUdhStub.discoveryMoe = false
      ∧ holmlidUdhStub.contributionLenrProved = false
      ∧ holmlidUdhStub.contributionEqOpenClosed = false
      ∧ ¬ q1MeVEnergyGapClosed openRemainder
      ∧ ¬ q2RadiationSuppressionClosed gammaBranching gammaUpperBound
      ∧ ¬ q3RateBudgetClosed log10Events
      ∧ ¬ q4ElectronCaptureSourceClosed availableEnergy thresholdEnergy
      ∧ ¬ q5IntegratedYieldClosed yieldDiscrepancy :=
  phenomenological_stub_does_not_discharge_eq_open
    holmlidUdhStub
    openRemainder gammaBranching gammaUpperBound
    log10Events
    availableEnergy thresholdEnergy yieldDiscrepancy
    holmlid_stub_has_no_invented_rate
    holmlid_stub_zero_watts
    holmlid_stub_not_discovery_moe
    holmlid_stub_contribution_not_lenr_proved
    holmlid_stub_contribution_eq_open_not_closed
    hQ1 hQ2 hQ3 hQ4 hQ5

/--
Schwinger NEAL P0 historical-control scaffold:
no invented rate, zero watts, no discovery MoE, no author MeV mass-defect
label. Exploratory `h_fraction_in_d2o` / HD-sensitivity index never drive wattage.
-/
def schwingerLatticeStub : PhenomenologicalTheoryStub :=
  { theoryId := "schwinger_lattice"
    hasInventedRateLaw := false
    energyOutputMilliWatts := 0
    discoveryMoe := false
    claimedMassDefectMilliMeV := 0
    contributionLenrProved := false
    contributionEqOpenClosed := false }

theorem schwinger_stub_id :
    schwingerLatticeStub.theoryId = "schwinger_lattice" := rfl

theorem schwinger_stub_has_no_invented_rate :
    schwingerLatticeStub.hasInventedRateLaw = false := rfl

theorem schwinger_stub_zero_watts :
    schwingerLatticeStub.energyOutputMilliWatts = 0 := rfl

theorem schwinger_stub_not_discovery_moe :
    schwingerLatticeStub.discoveryMoe = false := rfl

theorem schwinger_stub_no_mev_label :
    schwingerLatticeStub.claimedMassDefectMilliMeV = 0 := rfl

theorem schwinger_stub_contribution_not_lenr_proved :
    schwingerLatticeStub.contributionLenrProved = false := rfl

theorem schwinger_stub_contribution_eq_open_not_closed :
    schwingerLatticeStub.contributionEqOpenClosed = false := rfl

/--
EQ-SCHWINGER-STUB-NC-01: HD admixture / lattice-coherence free params
never underwrite stub wattage when energy stays locked at 0.
-/
theorem schwinger_free_param_not_wattage_driver
    (s : PhenomenologicalTheoryStub)
    (hId : s.theoryId = "schwinger_lattice")
    (hWatts : s.energyOutputMilliWatts = 0)
    (_hHdKnobPresent : True) :
    s.energyOutputMilliWatts = 0 ∧ s.theoryId = "schwinger_lattice" :=
  ⟨hWatts, hId⟩

theorem schwinger_lattice_free_param_not_wattage :
    schwingerLatticeStub.energyOutputMilliWatts = 0
      ∧ schwingerLatticeStub.theoryId = "schwinger_lattice" :=
  schwinger_free_param_not_wattage_driver
    schwingerLatticeStub schwinger_stub_id schwinger_stub_zero_watts trivial

/-- Schwinger NEAL stub instantiation of EQ-THEORY-STUB-NC-01 / EQ-SCHWINGER-STUB-NC-01. -/
theorem schwinger_lattice_stub_does_not_discharge_eq_open
    (openRemainder gammaBranching gammaUpperBound : Nat)
    (log10Events : Int)
    (availableEnergy thresholdEnergy yieldDiscrepancy : Nat)
    (hQ1 : 0 < openRemainder)
    (hQ2 : gammaUpperBound < gammaBranching)
    (hQ3 : log10Events < 0)
    (hQ4 : availableEnergy < thresholdEnergy)
    (hQ5 : 0 < yieldDiscrepancy) :
    lenrProved = false
      ∧ schwingerLatticeStub.hasInventedRateLaw = false
      ∧ schwingerLatticeStub.energyOutputMilliWatts = 0
      ∧ schwingerLatticeStub.discoveryMoe = false
      ∧ schwingerLatticeStub.contributionLenrProved = false
      ∧ schwingerLatticeStub.contributionEqOpenClosed = false
      ∧ ¬ q1MeVEnergyGapClosed openRemainder
      ∧ ¬ q2RadiationSuppressionClosed gammaBranching gammaUpperBound
      ∧ ¬ q3RateBudgetClosed log10Events
      ∧ ¬ q4ElectronCaptureSourceClosed availableEnergy thresholdEnergy
      ∧ ¬ q5IntegratedYieldClosed yieldDiscrepancy :=
  phenomenological_stub_does_not_discharge_eq_open
    schwingerLatticeStub
    openRemainder gammaBranching gammaUpperBound
    log10Events
    availableEnergy thresholdEnergy yieldDiscrepancy
    schwinger_stub_has_no_invented_rate
    schwinger_stub_zero_watts
    schwinger_stub_not_discovery_moe
    schwinger_stub_contribution_not_lenr_proved
    schwinger_stub_contribution_eq_open_not_closed
    hQ1 hQ2 hQ3 hQ4 hQ5

end LenrFormal.TheoryStubHonesty
