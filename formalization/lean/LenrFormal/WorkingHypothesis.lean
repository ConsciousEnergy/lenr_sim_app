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

/-! ### EQ-MEV-MATRIX-NC-01 — WH / phonon→nuclear channel labels ⇏ constrained |M|² (BDS-396)

EQ-OPEN-MEV-01 `still_missing` is a constrained phonon→nuclear matrix element
and occupation probability. Named WH channel labels (ENP / FC / Dicke clamp /
Hagelstein phonon) and unconstrained `|M|²` / Bernoulli-occupation bookkeeping
never inhabit that witness. Distinct from EQ-MEV-LABEL-NC-01 (MeVGapHypothesis
eligibility on OpenQuestionBounds): this densifies the **matrix-element /
occupation evidence kinds** on the WH bookkeeping surface.
-/

/-- Named phonon→nuclear WH channel labels (not constrained |M|² witnesses). -/
inductive PhononNuclearChannelLabel where
  /-- Coupled WH-ENP-01 geometry/occupation/operator bookkeeping. -/
  | whEnp01
  /-- Displaced-oscillator Franck–Condon / Huang–Rhys Poisson tail (EQ-WH-FC-*). -/
  | franckCondonPoisson
  /-- Dicke-unlicensed linear collective clamp (EQ-WH-DICKE-01 ∘ EQ-COLL-LIN-01). -/
  | dickeLinearClamp
  /-- Named Hagelstein phonon→nuclear transfer label (not a matrix element). -/
  | hagelsteinPhononChannel
  deriving DecidableEq, Repr

/-- Provenance kind for the phonon→nuclear matrix-element surface. -/
inductive MatrixElementEvidenceKind where
  /-- Channel / hypothesis name only — no constrained |M|². -/
  | unconstrainedChannelLabel
  /-- Unconstrained Nat bookkeeping stand-in for |M|² (not a lab constraint). -/
  | unconstrainedMagnitudeSquared
  /-- Constrained phonon→nuclear |M|² (EQ-OPEN-MEV-01 still_missing; not supplied). -/
  | constrainedMagnitudeSquared
  deriving DecidableEq, Repr

/-- Provenance kind for occupation / P_occ evidence. -/
inductive OccupationEvidenceKind where
  /-- Bernoulli stand-in (`occupationNat = 1`; EQ-TSC-OCC-01 OPEN). -/
  | bernoulliStandIn
  /-- Named WH occupation tag without a constrained probability. -/
  | labeledOccupationTag
  /-- Constrained occupation probability (EQ-OPEN-MEV-01 still_missing; not supplied). -/
  | constrainedOccupationProbability
  deriving DecidableEq, Repr

/-- UNDISHARGED: Q1 matrix/occupation discharge requires constrained |M|² and
    constrained occupation. Channel labels and unconstrained bookkeeping never
    inhabit it. -/
def ConstrainedMevMatrixDischarge
    (matrixKinds : List MatrixElementEvidenceKind)
    (occupationKinds : List OccupationEvidenceKind) : Prop :=
  matrixKinds ≠ [] ∧ occupationKinds ≠ [] ∧
    (∀ m ∈ matrixKinds, m = MatrixElementEvidenceKind.constrainedMagnitudeSquared) ∧
    (∀ o ∈ occupationKinds,
      o = OccupationEvidenceKind.constrainedOccupationProbability)

/-- Engine WH stand: a named channel + unconstrained |M|² proxy + Bernoulli occ. -/
structure EngineWhMatrixStand where
  channel : PhononNuclearChannelLabel
  matrixElementSqMilli : Nat
  deriving Repr

/-- Default engine stand: unconstrained |M|² = 0 milli (no constraint supplied). -/
def engineWhMatrixStand (ch : PhononNuclearChannelLabel) : EngineWhMatrixStand :=
  { channel := ch, matrixElementSqMilli := 0 }

/-- Hard honesty: nature-proof token stays false on MEV / matrix surfaces. -/
def mevMatrixLenrProved : Bool := false

theorem mev_matrix_lenr_proved_false : mevMatrixLenrProved = false := rfl

/-- Named channel labels never supply constrained |M|². -/
def channelLabelIsConstrainedMatrix : Bool := false

theorem channel_label_is_not_constrained_matrix :
    channelLabelIsConstrainedMatrix = false := rfl

/-- EQ-MEV-MATRIX-NC-01: a bag containing unconstrained channel-label matrix
    evidence is not constrained MeV matrix discharge. -/
theorem unconstrained_channel_label_does_not_entail_matrix_discharge
    {mKinds : List MatrixElementEvidenceKind}
    {oKinds : List OccupationEvidenceKind}
    (h : MatrixElementEvidenceKind.unconstrainedChannelLabel ∈ mKinds) :
    ¬ ConstrainedMevMatrixDischarge mKinds oKinds := by
  intro hDisc
  have : MatrixElementEvidenceKind.unconstrainedChannelLabel =
      MatrixElementEvidenceKind.constrainedMagnitudeSquared :=
    hDisc.2.2.1 _ h
  cases this

/-- Unconstrained |M|² Nat bookkeeping likewise never underwrites discharge. -/
theorem unconstrained_magnitude_sq_does_not_entail_matrix_discharge
    {mKinds : List MatrixElementEvidenceKind}
    {oKinds : List OccupationEvidenceKind}
    (h : MatrixElementEvidenceKind.unconstrainedMagnitudeSquared ∈ mKinds) :
    ¬ ConstrainedMevMatrixDischarge mKinds oKinds := by
  intro hDisc
  have : MatrixElementEvidenceKind.unconstrainedMagnitudeSquared =
      MatrixElementEvidenceKind.constrainedMagnitudeSquared :=
    hDisc.2.2.1 _ h
  cases this

/-- Bernoulli occupation stand-in never underwrites constrained occupation. -/
theorem bernoulli_occupation_does_not_entail_matrix_discharge
    {mKinds : List MatrixElementEvidenceKind}
    {oKinds : List OccupationEvidenceKind}
    (h : OccupationEvidenceKind.bernoulliStandIn ∈ oKinds) :
    ¬ ConstrainedMevMatrixDischarge mKinds oKinds := by
  intro hDisc
  have : OccupationEvidenceKind.bernoulliStandIn =
      OccupationEvidenceKind.constrainedOccupationProbability :=
    hDisc.2.2.2 _ h
  cases this

/-- Instantiation: WH-ENP channel + unconstrained |M|² + Bernoulli occ keeps
    Q1 open / `lenr_proved` false. -/
theorem engine_wh_matrix_stand_keeps_mev_open
    (ch : PhononNuclearChannelLabel) :
    (engineWhMatrixStand ch).matrixElementSqMilli = 0
      ∧ ¬ ConstrainedMevMatrixDischarge
          [MatrixElementEvidenceKind.unconstrainedChannelLabel,
            MatrixElementEvidenceKind.unconstrainedMagnitudeSquared]
          [OccupationEvidenceKind.bernoulliStandIn]
      ∧ channelLabelIsConstrainedMatrix = false
      ∧ ¬ q1MeVEnergyGapClosed openRemainderKeV
      ∧ mevMatrixLenrProved = false := by
  refine ⟨rfl, ?_, channel_label_is_not_constrained_matrix,
    remainder_implies_q1_open, mev_matrix_lenr_proved_false⟩
  exact unconstrained_channel_label_does_not_entail_matrix_discharge (by simp)

/-- Mixed bag: all four named channels + FC/Dicke labels still ⇏ discharge. -/
theorem named_phonon_nuclear_channels_keep_mev_open :
    ¬ ConstrainedMevMatrixDischarge
        [MatrixElementEvidenceKind.unconstrainedChannelLabel]
        [OccupationEvidenceKind.labeledOccupationTag,
          OccupationEvidenceKind.bernoulliStandIn]
      ∧ ¬ q1MeVEnergyGapClosed openRemainderKeV
      ∧ mevMatrixLenrProved = false := by
  refine ⟨?_, remainder_implies_q1_open, mev_matrix_lenr_proved_false⟩
  exact unconstrained_channel_label_does_not_entail_matrix_discharge (by simp)

/-- EQ-MEV-MATRIX-NC-01 ∘ EQ-OPEN-MEV-01: unconstrained |M|² proxy (any Nat) plus
    a named phonon→nuclear channel never closes Q1. -/
theorem unconstrained_matrix_sq_does_not_close_q1
    (_ch : PhononNuclearChannelLabel) (_matrixElementSqMilli : Nat) :
    ¬ ConstrainedMevMatrixDischarge
        [MatrixElementEvidenceKind.unconstrainedMagnitudeSquared]
        [OccupationEvidenceKind.bernoulliStandIn]
      ∧ ¬ q1MeVEnergyGapClosed openRemainderKeV
      ∧ channelLabelIsConstrainedMatrix = false
      ∧ mevMatrixLenrProved = false := by
  refine ⟨?_, remainder_implies_q1_open,
    channel_label_is_not_constrained_matrix, mev_matrix_lenr_proved_false⟩
  exact unconstrained_magnitude_sq_does_not_entail_matrix_discharge (by simp)

/-- Constrained discharge (when both witnesses are present) still does not flip
    `lenr_proved` — occurrence is not proved by bookkeeping eligibility alone. -/
theorem constrained_matrix_discharge_does_not_flip_lenr
    {mKinds : List MatrixElementEvidenceKind}
    {oKinds : List OccupationEvidenceKind}
    (_h : ConstrainedMevMatrixDischarge mKinds oKinds) :
    mevMatrixLenrProved = false :=
  mev_matrix_lenr_proved_false

end LenrFormal.WorkingHypothesis
