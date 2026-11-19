import LenrFormal.WorkingHypothesisBounds
import LenrFormal.RealShim

/-!
RadiationBounds — EQ-WH-FC-02 (Franck–Condon class bound) and EQ-RAD-DET-01
(detector-UL honesty flag mirrors) for paper §5A.2 / EQ-OPEN-RAD-01.

EQ-WH-FC-02 universalises EQ-WH-FC-01: for every Huang–Rhys factor on the
licensed scan domain and every phonon order above a stated floor, the
un-normalised Poisson tail `t(N) = S^N / N!` is proved below `10⁻¹¹` (not just
asserted via a Python `lgamma` value). Because `P_N = e^{-S}·t(N) ≤ t(N)`
(`e^{-S} ≤ 1`, mechanized via `RealShim.expZ_neg_le_one` +
`poisson_exp_neg_le_one` / `poisson_weight_factor_mul_le`) and `t` is monotone
in `S` (so `⌈S⌉` covers real `S`), the FC-derived phonon weight, `Γ_ph/Γ_γ`
floor, and γ branching follow for the whole class. Displaced-oscillator linear
coupling stays a labelled model assumption; anharmonic / Umklapp / lossy
spin-boson boosts are not this class.

EQ-RAD-DET-01 mirrors `branching_model.py` detector flags as Bool defs. They
are interpretation falsifiers (`detector_ul_not_proof`), not measured
branching. CR-39 pits under electrolytic cavitation (pyyhtia2026) are a
detector confounder, not an input here; collapse hydro is not γ suppression.

EQ-RAD-CR39-NC-01 (BDS-394) densifies that honesty: CR-39 / track-etch
confounder evidence kinds never inhabit a γ-suppression proof bag and never
discharge EQ-OPEN-RAD-01 / flip `lenr_proved`.

BOUNDED / class-DISPROVEN only. EQ-OPEN-RAD-01 stays OPEN.
There is no theorem lenr_occurs.
-/

namespace LenrFormal.RadiationBounds

open LenrFormal.OpenObligations
open LenrFormal.OpenQuestionBounds
open LenrFormal.Branching
open LenrFormal.WorkingHypothesis
open LenrFormal.WorkingHypothesisBounds
open LenrFormal.RealShim

/-! ### EQ-WH-FC-02 — `e^{-S} ≤ 1` bridge (Huang–Rhys `S ≥ 0`) -/

/-- EQ-WH-FC-02 analysis bridge: for every Nat Huang–Rhys factor,
    `e^{-S} ≤ 1` (`RealShim.expZ_neg_le_one`). Math identity only —
    does **not** discharge `EQ-OPEN-RAD-01`. -/
theorem poisson_exp_neg_le_one (S : Nat) : expZ (-(S : Int)) ≤ 1 :=
  expZ_neg_le_one (Int.ofNat_nonneg S)

/-- EQ-WH-FC-02: multiplicative transfer `e^{-S} · t ≤ t` for `t ≥ 0`.
    Justifies reading Nat bounds on the un-normalised tail `t(N)` as bounds
    on the Poisson weight `P_N = e^{-S}·t(N)`. -/
theorem poisson_weight_factor_mul_le (S : Nat) (t : Int) (ht : 0 ≤ t) :
    expZ (-(S : Int)) * t ≤ t :=
  expZ_neg_mul_le (Int.ofNat_nonneg S) ht

/-! ### EQ-WH-FC-02 — Poisson tail bound over the licensed `S` / `N` domain -/

/-- EQ-WH-FC-02: once `2S ≤ m + 1` every further Poisson step `S/(n+1)` is at
    most `1/2`, so `t(m+k) ≤ 2⁻ᵏ·t(m)` (cross-multiplied). -/
theorem poisson_tail_halving (S m : Nat) (hm : 2 * S ≤ m + 1) :
    ∀ k : Nat, 2 ^ k * S ^ (m + k) * factorial m ≤ S ^ m * factorial (m + k)
  | 0 => by simp
  | k + 1 => by
    have ih := poisson_tail_halving S m hm k
    have hstep : 2 * S ≤ m + k + 1 := by omega
    calc 2 ^ (k + 1) * S ^ (m + (k + 1)) * factorial m
        = (2 * S) * (2 ^ k * S ^ (m + k) * factorial m) := by
          rw [← Nat.add_assoc, Nat.pow_succ, Nat.pow_succ]
          ac_rfl
      _ ≤ (2 * S) * (S ^ m * factorial (m + k)) := Nat.mul_le_mul_left _ ih
      _ ≤ (m + k + 1) * (S ^ m * factorial (m + k)) := Nat.mul_le_mul_right _ hstep
      _ = S ^ m * factorial (m + (k + 1)) := by
          rw [← Nat.add_assoc, factorial_succ]
          ac_rfl

/-- EQ-WH-FC-02: `10^j ≤ 2^(4j)`. -/
theorem pow10_le_pow2 (j : Nat) : 10 ^ j ≤ 2 ^ (4 * j) := by
  rw [Nat.pow_mul]
  exact Nat.pow_le_pow_left (by decide) j

/-- EQ-WH-FC-02: for `S ≤ 2^b` and `N ≥ 2S(b+1) + 4j`, `S^N · 10^j ≤ N!`,
    i.e. `log10 t(N) ≤ -j`. -/
theorem fc_tail_pow10_bound (b j S N : Nat) (hSb : S ≤ 2 ^ b)
    (hN : 2 * S * (b + 1) + 4 * j ≤ N) :
    S ^ N * 10 ^ j ≤ factorial N := by
  have hsplit : 2 * S * (b + 1) = b * (2 * S) + 2 * S := by
    rw [Nat.mul_succ, Nat.mul_comm (2 * S) b]
  rw [hsplit] at hN
  have hHalf := poisson_tail_halving S (2 * S) (Nat.le_succ _) (N - 2 * S)
  rw [Nat.add_sub_cancel' (by omega)] at hHalf
  have hDrop : S ^ N * 2 ^ (N - 2 * S) ≤ S ^ (2 * S) * factorial N :=
    Nat.le_trans
      (by
        rw [Nat.mul_comm (S ^ N)]
        exact Nat.le_mul_of_pos_right _ (factorial_pos _))
      hHalf
  have hHead : S ^ (2 * S) ≤ 2 ^ (b * (2 * S)) := by
    rw [Nat.pow_mul 2 b (2 * S)]
    exact Nat.pow_le_pow_left hSb _
  generalize b * (2 * S) = M at hN hHead
  have hExp : 2 ^ (4 * j) * 2 ^ M ≤ 2 ^ (N - 2 * S) := by
    rw [← Nat.pow_add]
    exact Nat.pow_le_pow_right (by decide) (by omega)
  apply Nat.le_of_mul_le_mul_left _ (Nat.two_pow_pos M)
  calc 2 ^ M * (S ^ N * 10 ^ j)
      ≤ 2 ^ M * (S ^ N * 2 ^ (4 * j)) :=
        Nat.mul_le_mul_left _ (Nat.mul_le_mul_left _ (pow10_le_pow2 j))
    _ = S ^ N * (2 ^ (4 * j) * 2 ^ M) := by ac_rfl
    _ ≤ S ^ N * 2 ^ (N - 2 * S) := Nat.mul_le_mul_left _ hExp
    _ ≤ S ^ (2 * S) * factorial N := hDrop
    _ ≤ 2 ^ M * factorial N := Nat.mul_le_mul_right _ hHead

/-- EQ-WH-FC-02: `sGridMax = 10⁴ ≤ 2¹⁴`. -/
theorem sGridMax_le_two_pow_14 : sGridMax ≤ 2 ^ 14 := by decide

/-- EQ-WH-FC-02: grid offset `2·sGridMax·(14+1)` in the phonon order. -/
def fcGridOrderOffset : Nat := 300000

/-- EQ-WH-FC-02: licensed phonon-order floor for the `10⁻¹²` grid bound
    (`fcGridOrderOffset + 4·12`). Any single-mode `ħω ≤ 23.8 MeV / 300048
    ≈ 79 eV` gives `N` above it; the 41.4 meV model input gives `5.75×10⁸`. -/
def fcOrderMin : Nat := 300048

theorem fc_order_min_covers_phonon_order : fcOrderMin ≤ phononOrderN := by decide

/-- EQ-WH-FC-02: on the licensed grid, `log10 t(N) ≤ -j` once
    `N ≥ 300000 + 4j`. -/
theorem fc_grid_tail_bound (j S N : Nat) (hS : S ≤ sGridMax)
    (hN : fcGridOrderOffset + 4 * j ≤ N) :
    S ^ N * 10 ^ j ≤ factorial N := by
  apply fc_tail_pow10_bound 14 j S N (Nat.le_trans hS sGridMax_le_two_pow_14)
  unfold fcGridOrderOffset at hN
  unfold sGridMax at hS
  omega

/-- EQ-WH-FC-02 ⇒ EQ-WH-FC-01 cap: at the model phonon order the
    `log10 P_N ≤ -7×10⁵` cap (`log10PN_upper_milli`) is now derived for
    every `S ≤ sGridMax`. -/
theorem fc_upper_cap_derived (S : Nat) (hS : S ≤ sGridMax) :
    S ^ phononOrderN * 10 ^ 700000 ≤ factorial phononOrderN :=
  fc_grid_tail_bound 700000 S phononOrderN hS (by decide)

/-- EQ-WH-FC-02: the whole licensed class misses the `log10 P_N ≥ -11`
    target (`FC_TARGET_LOG10`): `t(N) < 10⁻¹¹`. -/
theorem fc_class_misses_fc_target (S N : Nat) (hS : S ≤ sGridMax)
    (hN : fcOrderMin ≤ N) :
    S ^ N * 100000000000 < factorial N := by
  have h := fc_grid_tail_bound 12 S N hS
    (by unfold fcGridOrderOffset; unfold fcOrderMin at hN; omega)
  have h12 : (10 : Nat) ^ 12 = 1000000000000 := by decide
  rw [h12] at h
  have hpos := factorial_pos N
  omega

/-- EQ-WH-FC-02: Nat floor of `t/(1−t)`, an upper bound on the FC-derived
    `Γ_ph/Γ_γ = P_N/(1−P_N)` because `P_N ≤ t` via `poisson_exp_neg_le_one`. -/
def fcRatioFloor (S N : Nat) : Nat := S ^ N / (factorial N - S ^ N)

/-- EQ-WH-FC-02: floor of `1000·t`, the FC phonon-channel weight in milli-units. -/
def fcPhononWeightMilliOf (S N : Nat) : Nat := 1000 * S ^ N / factorial N

/-- EQ-WH-FC-02: complementary γ branching in milli-units. -/
def fcGammaBranchingMilliOf (S N : Nat) : Nat := 1000 - fcPhononWeightMilliOf S N

theorem fc_ratio_floor_zero (S N : Nat) (hS : S ≤ sGridMax) (hN : fcOrderMin ≤ N) :
    fcRatioFloor S N = 0 := by
  have h := fc_class_misses_fc_target S N hS hN
  exact Nat.div_eq_of_lt (by omega)

theorem fc_phonon_weight_zero (S N : Nat) (hS : S ≤ sGridMax) (hN : fcOrderMin ≤ N) :
    fcPhononWeightMilliOf S N = 0 := by
  have h := fc_class_misses_fc_target S N hS hN
  exact Nat.div_eq_of_lt (by omega)

theorem fc_gamma_branching_full (S N : Nat) (hS : S ≤ sGridMax) (hN : fcOrderMin ≤ N) :
    fcGammaBranchingMilliOf S N = 1000 := by
  unfold fcGammaBranchingMilliOf
  rw [fc_phonon_weight_zero S N hS hN]

/-- EQ-WH-FC-02: the EQ-WH-FC-01 literals `fcDerivedRatio = 0` and
    `fcGammaBranchingMilli = 1000` are now derived for every grid `S`. -/
theorem fc_wh01_literals_derived (S : Nat) (hS : S ≤ sGridMax) :
    fcRatioFloor S phononOrderN = fcDerivedRatio ∧
      fcGammaBranchingMilliOf S phononOrderN = fcGammaBranchingMilli :=
  ⟨fc_ratio_floor_zero S phononOrderN hS fc_order_min_covers_phonon_order,
    fc_gamma_branching_full S phononOrderN hS fc_order_min_covers_phonon_order⟩

/-- EQ-WH-FC-02 (BOUNDED): FC-derived lattice ratio stays below `10¹¹` on the
    licensed domain. -/
theorem fc_class_below_lattice_target (S N : Nat) (hS : S ≤ sGridMax)
    (hN : fcOrderMin ≤ N) :
    fcRatioFloor S N < latticeGammaTarget := by
  rw [fc_ratio_floor_zero S N hS hN]
  unfold latticeGammaTarget
  decide

theorem fc_class_does_not_close_q2 (S N : Nat) (hS : S ≤ sGridMax)
    (hN : fcOrderMin ≤ N) :
    ¬ q2WouldCloseIf (fcRatioFloor S N) := fun h =>
  Nat.not_le.mpr (fc_class_below_lattice_target S N hS hN) h

/-- EQ-WH-FC-02 envelope: at the model `N`, the bound extends to
    `S ≤ 2²³ ≈ 8.4×10⁶` (relaxation energy `S·ħω ≲ 0.35 MeV ≈ 1.5 % of Q`);
    the target needs `S ≈ N` (relaxation ≈ Q). -/
def sEnvelopeMax : Nat := 8388608

theorem fc_envelope_misses_fc_target (S : Nat) (hS : S ≤ sEnvelopeMax) :
    S ^ phononOrderN * 10 ^ 12 ≤ factorial phononOrderN :=
  fc_tail_pow10_bound 23 12 S phononOrderN hS
    (by unfold sEnvelopeMax at hS; unfold phononOrderN; omega)

/-! ### EQ-RAD-DET-01 — detector-UL honesty flag mirrors (DEF) -/

/-- `DETECTOR_UL_HONESTY_CLASS` in `branching_model.py`. -/
def detectorUlHonestyClass : String := "detector_ul_not_proof"

/-- Python payload `not_eq_open_discharge: True`. -/
def detectorUlNotEqOpenDischarge : Bool := true

/-- `CD_RATIO_THERMAL_FLOOR = 5.0` in milli-units. -/
def cdRatioThermalFloorMilli : Nat := 5000

/-- `MODERATOR_NULL_THERMAL_CEILING = 1.0` in milli-units. -/
def moderatorNullThermalCeilingMilli : Nat := 1000

/-- Default `cd_wrapped_high_cps = 1.0` in milli-cps. -/
def cdWrappedHighMilliCps : Nat := 1000

/-- Absent observations (`None`) never trip a flag, as in Python. -/
def cdNonthermal : Option Nat → Bool
  | none => false
  | some ratioMilli => decide (ratioMilli < cdRatioThermalFloorMilli)

def cdWrappedHigh : Option Nat → Bool
  | none => false
  | some milliCps => decide (cdWrappedHighMilliCps ≤ milliCps)

def moderatorFails : Option Nat → Bool
  | none => false
  | some ratioMilli => decide (ratioMilli < moderatorNullThermalCeilingMilli)

/-- `branching_inconsistent_with_neutron_interpretation`: soft-X ∧ ¬hard-γ ∧
    (Cd-wrap high ∨ Cd non-thermal), or moderator null ∧ (Cd-wrap high ∨ soft-X).
    Python `None` Bool inputs map to `false`. -/
def neutronInterpretationInconsistent (softX hardGammaAbsent : Bool)
    (cdWrappedMilliCps cdRatioMilli moderatorRatioMilli : Option Nat) : Bool :=
  (softX && hardGammaAbsent &&
      (cdWrappedHigh cdWrappedMilliCps || cdNonthermal cdRatioMilli)) ||
    (moderatorFails moderatorRatioMilli && (cdWrappedHigh cdWrappedMilliCps || softX))

/-- `branching_inconsistent_with_ul`: assumed γ branch above an
    efficiency-corrected UL (same integer scale). -/
def branchingInconsistentWithUl (assumedGamma : Nat) : Option Nat → Bool
  | none => false
  | some ul => decide (0 < assumedGamma ∧ ul < assumedGamma)

theorem detector_honesty_locks :
    detectorUlHonestyClass = "detector_ul_not_proof" ∧
      detectorUlNotEqOpenDischarge = true :=
  ⟨rfl, rfl⟩

theorem no_observation_no_neutron_flag :
    neutronInterpretationInconsistent false false none none none = false := rfl

theorem no_ul_no_branching_flag (assumedGamma : Nat) :
    branchingInconsistentWithUl assumedGamma none = false := rfl

/-- A UL flag falsifies the *assumed* scenario branch; it supplies no measured
    branching and does not discharge Q2. -/
theorem ul_flag_falsifies_assumed_branch {assumedGamma ul : Nat}
    (h : branchingInconsistentWithUl assumedGamma (some ul) = true) :
    ¬ q2RadiationSuppressionClosed assumedGamma ul := by
  simp only [branchingInconsistentWithUl, decide_eq_true_eq] at h
  exact gamma_above_bound_implies_q2_not_closed h.2

/-- The FC class (γ ≈ full branching) trips the UL flag for every sub-unity UL. -/
theorem fc_class_trips_sub_unity_ul (S N ul : Nat) (hS : S ≤ sGridMax)
    (hN : fcOrderMin ≤ N) (hul : ul < 1000) :
    branchingInconsistentWithUl (fcGammaBranchingMilliOf S N) (some ul) = true := by
  simp only [branchingInconsistentWithUl, fc_gamma_branching_full S N hS hN,
    decide_eq_true_eq]
  exact ⟨by decide, hul⟩

/-! ### EQ-RAD-CR39-NC-01 — CR-39 / track-etch ⇏ γ-suppression proof (BDS-394) -/

/-- Provenance kind for CR-39 / track-etch detector evidence on RAD surfaces. -/
inductive TrackEtchEvidenceKind where
  /-- Electrolytic HER nanobubble cavitation CR-39 pits (pyyhtia2026 confounder). -/
  | cr39PitUnderElectrolyticCavitation
  /-- SPAWAR / Mosier-Boss-class pit=nuclear claim (contested interpretation). -/
  | spaWarClassPitEqualsNuclear
  /-- Shallow polymer pit morphology (vs deep α tracks). -/
  | shallowPolymerPit
  /-- Cite-gated calibrated γ BR ≤ efficiency-corrected UL under stated geometry. -/
  | calibratedGammaBrUl
  deriving DecidableEq, Repr

/-- UNDISHARGED: a γ-suppression proof bag requires calibrated BR_γ UL
    provenance. Track-etch confounders never supply that. -/
def GammaSuppressionProof (kinds : List TrackEtchEvidenceKind) : Prop :=
  kinds ≠ [] ∧ ∀ k ∈ kinds, k = TrackEtchEvidenceKind.calibratedGammaBrUl

/-- Hard honesty: nature-proof token stays false on RAD / CR-39 surfaces. -/
def lenrProved : Bool := false

theorem rad_lenr_proved_false : lenrProved = false := rfl

/-- Cite key mirror for the Pyyhtiä 2026 CR-39 cavitation confounder. -/
def cr39ConfounderCitationKey : String := "pyyhtia2026"

theorem cr39_confounder_citation_key_value :
    cr39ConfounderCitationKey = "pyyhtia2026" := rfl

/-- CR-39 / track-etch pits are never themselves a γ-suppression proof. -/
def cr39TrackEtchIsGammaSuppressionProof : Bool := false

theorem cr39_track_etch_is_not_gamma_suppression_proof :
    cr39TrackEtchIsGammaSuppressionProof = false := rfl

/-- CR-39 confounder evidence never equals EQ-OPEN-RAD-01 discharge. -/
def cr39ConfounderClosesEqOpenRad : Bool := false

theorem cr39_confounder_does_not_close_eq_open_rad :
    cr39ConfounderClosesEqOpenRad = false := rfl

/-- EQ-RAD-CR39-NC-01: a bag containing electrolytic CR-39 pits is not a
    γ-suppression proof. -/
theorem cr39_pit_does_not_entail_gamma_suppression_proof
    {kinds : List TrackEtchEvidenceKind}
    (h : TrackEtchEvidenceKind.cr39PitUnderElectrolyticCavitation ∈ kinds) :
    ¬ GammaSuppressionProof kinds := by
  intro hProof
  have : TrackEtchEvidenceKind.cr39PitUnderElectrolyticCavitation =
      TrackEtchEvidenceKind.calibratedGammaBrUl :=
    hProof.2 _ h
  cases this

/-- EQ-RAD-CR39-NC-01: SPAWAR-class pit=nuclear claims likewise never inhabit
    a γ-suppression proof bag. -/
theorem spa_war_pit_claim_does_not_entail_gamma_suppression_proof
    {kinds : List TrackEtchEvidenceKind}
    (h : TrackEtchEvidenceKind.spaWarClassPitEqualsNuclear ∈ kinds) :
    ¬ GammaSuppressionProof kinds := by
  intro hProof
  have : TrackEtchEvidenceKind.spaWarClassPitEqualsNuclear =
      TrackEtchEvidenceKind.calibratedGammaBrUl :=
    hProof.2 _ h
  cases this

/-- EQ-RAD-CR39-NC-01: shallow polymer pits (morphology confounder) ⇏ proof. -/
theorem shallow_polymer_pit_does_not_entail_gamma_suppression_proof
    {kinds : List TrackEtchEvidenceKind}
    (h : TrackEtchEvidenceKind.shallowPolymerPit ∈ kinds) :
    ¬ GammaSuppressionProof kinds := by
  intro hProof
  have : TrackEtchEvidenceKind.shallowPolymerPit =
      TrackEtchEvidenceKind.calibratedGammaBrUl :=
    hProof.2 _ h
  cases this

/-- Instantiation: CR-39 confounder bag alone keeps RAD open / `lenr_proved` false. -/
theorem cr39_confounder_alone_keeps_rad_open :
    ¬ GammaSuppressionProof
        [TrackEtchEvidenceKind.cr39PitUnderElectrolyticCavitation]
      ∧ cr39TrackEtchIsGammaSuppressionProof = false
      ∧ cr39ConfounderClosesEqOpenRad = false
      ∧ cr39ConfounderCitationKey = "pyyhtia2026"
      ∧ lenrProved = false := by
  refine ⟨?_, cr39_track_etch_is_not_gamma_suppression_proof,
    cr39_confounder_does_not_close_eq_open_rad,
    cr39_confounder_citation_key_value, rad_lenr_proved_false⟩
  exact cr39_pit_does_not_entail_gamma_suppression_proof (by simp)

/-- Mixed confounder bag (CR-39 + SPAWAR-class claim) still ⇏ γ-suppression. -/
theorem cr39_with_spa_war_claim_keeps_rad_open :
    ¬ GammaSuppressionProof
        [TrackEtchEvidenceKind.cr39PitUnderElectrolyticCavitation,
          TrackEtchEvidenceKind.spaWarClassPitEqualsNuclear]
      ∧ lenrProved = false := by
  refine ⟨?_, rad_lenr_proved_false⟩
  exact cr39_pit_does_not_entail_gamma_suppression_proof (by simp)

/-- Even a (hypothetical) calibrated-UL γ-suppression proof bag does not flip
    `lenr_proved` and does not by itself invent measured lattice Γ_ph/Γ_γ. -/
theorem gamma_suppression_proof_does_not_flip_lenr
    {kinds : List TrackEtchEvidenceKind}
    (_h : GammaSuppressionProof kinds) :
    lenrProved = false
      ∧ cr39ConfounderClosesEqOpenRad = false :=
  ⟨rad_lenr_proved_false, cr39_confounder_does_not_close_eq_open_rad⟩

/-- EQ-RAD-CR39-NC-01 ∘ EQ-OPEN-RAD-01: CR-39 confounder evidence does not
    discharge Q2 under open γ branching (branching above UL). -/
theorem cr39_confounder_does_not_discharge_q2
    (gammaBranching upperBound : Nat)
    (hOpen : upperBound < gammaBranching) :
    ¬ GammaSuppressionProof
        [TrackEtchEvidenceKind.cr39PitUnderElectrolyticCavitation]
      ∧ ¬ q2RadiationSuppressionClosed gammaBranching upperBound
      ∧ cr39TrackEtchIsGammaSuppressionProof = false
      ∧ cr39ConfounderClosesEqOpenRad = false
      ∧ lenrProved = false := by
  refine ⟨?_, gamma_above_bound_implies_q2_not_closed hOpen,
    cr39_track_etch_is_not_gamma_suppression_proof,
    cr39_confounder_does_not_close_eq_open_rad, rad_lenr_proved_false⟩
  exact cr39_pit_does_not_entail_gamma_suppression_proof (by simp)

/-! ### Paper §5A.2 alias -/

/-- Paper §5A.2 `HarmonicDosNonClosure`: harmonic DOS (EQ-WH-BOUND-01) and the
    licensed FC class (EQ-WH-FC-02) both fail the `10¹¹` target and leave γ
    branching above every sub-unity UL. BOUNDED / class-DISPROVEN for these
    model classes only; EQ-OPEN-RAD-01 stays OPEN. -/
theorem harmonic_dos_non_closure :
    ¬ q2WouldCloseIf derivedRatio ∧
      (∀ S N, S ≤ sGridMax → fcOrderMin ≤ N →
        ¬ q2WouldCloseIf (fcRatioFloor S N)) ∧
      (∀ S N ul, S ≤ sGridMax → fcOrderMin ≤ N → ul < 1000 →
        ¬ q2RadiationSuppressionClosed (fcGammaBranchingMilliOf S N) ul) :=
  ⟨derived_ratio_does_not_close_q2,
    fun S N hS hN => fc_class_does_not_close_q2 S N hS hN,
    fun S N ul hS hN hul =>
      gamma_above_bound_implies_q2_not_closed
        (by rw [fc_gamma_branching_full S N hS hN]; exact hul)⟩

end LenrFormal.RadiationBounds
