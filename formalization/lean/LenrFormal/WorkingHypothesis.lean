import LenrFormal.OpenObligations
import LenrFormal.OpenQuestionBounds
import LenrFormal.Branching
import LenrFormal.NBody
import LenrFormal.Phonon
import LenrFormal.RateBudget
import LenrFormal.ScaleQED
import LenrFormal.WhenHow
import LenrFormal.Constants

/-!
WorkingHypothesis — WH-ENP-01 coupled bookkeeping for paper §5A Q1–Q3.

Machine-checkable identities and non-closure implications only.
Does **not** discharge EQ-OPEN-MEV-01 / RAD-01 / RATE-01.
There is no theorem lenr_occurs.
-/

namespace LenrFormal.WorkingHypothesis

open LenrFormal.OpenObligations
open LenrFormal.OpenQuestionBounds
open LenrFormal.Branching
open LenrFormal.NBody
open LenrFormal.Phonon
open LenrFormal.RateBudget
open LenrFormal.ScaleQED
open LenrFormal.WhenHow
open LenrFormal.Constants

/-- Coupled working-hypothesis identifier (labels, not a nature theorem). -/
def hypothesisId : String := "WH-ENP-01"

/-- Shared geometry tag: FCC tetrahedral (true) vs 25 pm trap (false). -/
def geometryIsFccTetrahedral : Bool := true

/-- Shared occupation bookkeeping input (Bernoulli stand-in; EQ-TSC-OCC-01 OPEN). -/
def occupationNat : Nat := 1

/-- EQ-WH-PART-01: derived channels currently contribute 0 keV. -/
def derivedKeV : Nat := 0

def openRemainderKeV : Nat := qDD_He4_keV - derivedKeV

theorem partition_conserved : derivedKeV + openRemainderKeV = qDD_He4_keV := rfl

theorem remainder_positive : 0 < openRemainderKeV := by native_decide

theorem remainder_implies_q1_open :
    ¬ q1MeVEnergyGapClosed openRemainderKeV :=
  positive_remainder_implies_q1_not_closed remainder_positive

/-- Naive independent g^N does not close Q1 at paper N. -/
theorem naive_gN_does_not_close : naiveHalfPowFloor 1 = 0 := naive_gN_fails_n1

/-- Two on-shell alphas remove a primary γ kinematically, not the remainder. -/
theorem tsc_kinematics_do_not_zero_remainder :
    requiresPrimaryGamma true = false ∧ 0 < openRemainderKeV :=
  ⟨tsc_channel_kin, remainder_positive⟩

/-- EQ-WH-STOP-01: each α carries 23.8 MeV; 2×23.8 = 47.6. -/
def alphaKeV : Nat := 23800

theorem two_alpha_ke_is_q4d : (2 : Nat) * alphaKeV = 47600 := rfl

theorem two_alpha_ke_is_two_qdd : (2 : Nat) * alphaKeV = (2 : Nat) * qDD_He4_keV := rfl

theorem stopping_mode_neq_photon : tscStoppingMode ≠ radiativeTransferMode := by
  intro h
  cases h

/-- EQ-WH-BOUND-01: harmonic lattice DOS at Q gives derived ratio 0. -/
def derivedRatio : Nat := 0

theorem derived_ratio_below_target :
    derivedRatio < latticeGammaTarget := by
  native_decide

theorem derived_ratio_does_not_close_q2 :
    ¬ q2WouldCloseIf derivedRatio := by
  intro h
  exact (Nat.not_le.mpr derived_ratio_below_target) h

/-- EQ-WH-DICKE-01: paper domain 6.6 nm vs λ/(2π) ≈ 48 pm (phonon λ ≈ 300 pm). -/
def paperDomain_pm : Nat := 6600
def dickeRadius_pm : Nat := 48

def dickeN2Licensed (domainPm dickePm : Nat) : Bool :=
  decide (domainPm ≤ dickePm)

theorem paper_domain_not_dicke_licensed :
    dickeN2Licensed paperDomain_pm dickeRadius_pm = false := rfl

/-- EQ-WH-DICKE-01 ∘ EQ-COLL-LIN-01: Dicke \(N^2\) is unlicensed **and** the
    engine collective remains the linear clamp \(\min(N,10^6)\). -/
theorem dicke_unlicensed_and_engine_linear :
    dickeN2Licensed paperDomain_pm dickeRadius_pm = false ∧
      (∀ n, collective n ≤ 1000000) :=
  ⟨paper_domain_not_dicke_licensed, collective_le_cap⟩

/-- Same-cluster FGR (EQ-NBODY-FGR-01) inherits the linear collective clamp. -/
theorem same_cluster_fgr_uses_linear_collective
    (nSites pOcc gammaTun fNuc tauScaled nCoherent : Nat) :
    (fgrVolumetricBookkeeping nSites pOcc gammaTun fNuc tauScaled nCoherent).numerator =
      nSites * pOcc * gammaTun * fNuc * collective nCoherent :=
  fgr_volumetric_uses_linear_collective nSites pOcc gammaTun fNuc tauScaled nCoherent

/-- EQ-WH-FLOOR-01: calorimetric threshold is R_mode ≥ R_obs (WhenHow). -/
def floorIdentity (rateObs rateMode : Nat) : Prop :=
  thresholdCrossed rateObs rateMode

theorem floor_is_threshold (rateObs rateMode : Nat) :
    floorIdentity rateObs rateMode ↔ rateMode ≥ rateObs :=
  Iff.rfl

/-- Heisenberg–Euler lab factor is identically 1 at milli-units; does not close Q1. -/
theorem he_identity_does_not_zero_remainder :
    heFactorMilli = 1000 ∧ 0 < openRemainderKeV :=
  ⟨he_is_identity_milli, remainder_positive⟩

/-- Partition remainder + same-cluster FGR bookkeeping still leave Q1/Q3 open.
    Does **not** discharge EQ-OPEN-MEV-01 or EQ-OPEN-RATE-01. -/
theorem partition_and_fgr_do_not_close_mev_rate :
    ¬ q1MeVEnergyGapClosed openRemainderKeV ∧
      ¬ q3RateBudgetClosed log10NEvents :=
  ⟨remainder_implies_q1_open, two_body_q3_not_closed⟩

/-- EQ-WH-NONCLOSE-01: WH bookkeeping does not discharge the three open obligations. -/
theorem wh_does_not_discharge_open_obligations :
    ¬ q1MeVEnergyGapClosed openRemainderKeV ∧
      ¬ q2WouldCloseIf derivedRatio ∧
      ¬ q3RateBudgetClosed log10NEvents :=
  ⟨remainder_implies_q1_open, derived_ratio_does_not_close_q2, two_body_q3_not_closed⟩

end LenrFormal.WorkingHypothesis
