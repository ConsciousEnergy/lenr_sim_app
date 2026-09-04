import LenrFormal.WorkingHypothesis

/-!
WorkingHypothesisBounds — WH-ENP-01 v2 derived bounds for paper §5A Q1–Q3.

EQ-WH-FC-01 (Franck–Condon / Poisson multi-phonon tail), EQ-WH-PART-02
(general partition), EQ-WH-DICKE-N-01 (deuterons inside the cooperation
sphere), EQ-WH-CAP-01 (engine-cap product bound), and the v2 non-closure
composition.

Everything here is an identity, a bound, or a non-closure implication over
integer-scaled inputs. Nothing discharges EQ-OPEN-MEV-01 / RAD-01 / RATE-01.
There is no theorem lenr_occurs.
-/

namespace LenrFormal.WorkingHypothesisBounds

open LenrFormal.OpenObligations
open LenrFormal.OpenQuestionBounds
open LenrFormal.Branching
open LenrFormal.NBody
open LenrFormal.RateBudget
open LenrFormal.Constants
open LenrFormal.WorkingHypothesis

/-! ### EQ-WH-FC-01 — Poisson (Huang–Rhys) multi-phonon tail -/

/-- Factorial on `Nat` (no Mathlib dependency in this pilot). -/
def factorial : Nat → Nat
  | 0 => 1
  | n + 1 => (n + 1) * factorial n

theorem factorial_succ (n : Nat) : factorial (n + 1) = (n + 1) * factorial n := rfl

theorem factorial_pos : (n : Nat) → 0 < factorial n
  | 0 => Nat.zero_lt_one
  | n + 1 => Nat.mul_pos (Nat.succ_pos n) (factorial_pos n)

/-- EQ-WH-FC-01: un-normalised Poisson term `t(N) = S^N / N!` (displaced
    oscillator, linear coupling). Numerator of the step ratio `t(N+1)/t(N)`. -/
def poissonStepNum (S _N : Nat) : Nat := S

/-- EQ-WH-FC-01: denominator of the step ratio `t(N+1)/t(N) = S/(N+1)`. -/
def poissonStepDen (_S N : Nat) : Nat := N + 1

/-- EQ-WH-FC-01: once `N ≥ S` the step ratio `S/(N+1)` is below 1, so the
    Poisson tail is strictly decreasing in the phonon order. -/
theorem poisson_tail_decreasing (S N : Nat) (h : S < N + 1) :
    poissonStepNum S N < poissonStepDen S N := h

/-- EQ-WH-FC-01: the tail stops decreasing only when `S ≥ N + 1`, i.e. the
    Huang–Rhys factor (relaxation energy in phonon units) must reach the order
    `N ≈ Q/(ħω)` itself. -/
theorem poisson_tail_not_decreasing_iff (S N : Nat) :
    ¬ (poissonStepNum S N < poissonStepDen S N) ↔ N + 1 ≤ S := by
  unfold poissonStepNum poissonStepDen
  exact Nat.not_lt

/-- EQ-WH-FC-01: numerator recurrence `S^(N+1) · N! = S · (S^N · N!)`. -/
theorem poisson_recurrence (S N : Nat) :
    S ^ (N + 1) * factorial N = S * (S ^ N * factorial N) := by
  rw [Nat.pow_succ, Nat.mul_comm (S ^ N) S, Nat.mul_assoc]

/-- EQ-WH-FC-01: cross-multiplied form of `t(N+1)/t(N) < 1`.
    `S^(N+1)/(N+1)! < S^N/N!  ⟺  S^(N+1) · N! < S^N · (N+1)!`. -/
theorem poisson_ratio_lt_one_iff (S N : Nat) (hS : 0 < S) :
    S < N + 1 ↔ S ^ (N + 1) * factorial N < S ^ N * factorial (N + 1) := by
  have hpos : 0 < S ^ N * factorial N :=
    Nat.mul_pos (Nat.pos_pow_of_pos N hS) (factorial_pos N)
  rw [poisson_recurrence, factorial_succ,
    Nat.mul_left_comm (S ^ N) (N + 1) (factorial N)]
  constructor
  · intro h
    exact Nat.mul_lt_mul_of_pos_right h hpos
  · intro h
    exact Nat.lt_of_mul_lt_mul_right h

/-- EQ-WH-FC-01: for `N ≥ S` the next Poisson term is strictly smaller. -/
theorem poisson_term_strictly_smaller (S N : Nat) (hS : 0 < S) (h : S < N + 1) :
    S ^ (N + 1) * factorial N < S ^ N * factorial (N + 1) :=
  (poisson_ratio_lt_one_iff S N hS).mp h

/-- EQ-WH-FC-01: phonon order `N = Q/(ħ·2π·10¹³ Hz) = 23.8 MeV / 41.4 meV
    ≈ 5.75×10⁸` (rounded; same input as `open_questions._phonon_order` and
    `hagelstein_phonon.py`). Model assumption: ω/2π = 10¹³ Hz. -/
def phononOrderN : Nat := 575000000

/-- EQ-WH-FC-01: largest Huang–Rhys factor on the backend scan grid
    (`DEFAULT_S_GRID` tops out at 10⁴; labelled model assumption). -/
def sGridMax : Nat := 10000

/-- EQ-WH-FC-01: closure target `log10 P_N ≥ -11` in milli-units. -/
def fcTargetMilli : Int := -11000

/-- EQ-WH-FC-01: conservative integer upper bound on `log10 P_N` at the top of
    the scan grid, in milli-units: `log10 P_N ≤ -7.0×10⁵`.
    Stirling / `lgamma` evaluation gives ≈ −7.66×10⁵ already at
    `N = 5.75×10⁵`, and ≈ −2.5×10⁹ at the physical `N = 5.75×10⁸`; both are
    below this bound, so it is an upper bound for every `S ≤ sGridMax` and
    every `N ≥ 5.75×10⁵`. The honest requirement for the tail to reach the
    target is `S_min ≈ N`, i.e. relaxation energy ≈ Q (see
    `poisson_tail_not_decreasing_iff`). -/
def log10PN_upper_milli : Int := -700000000

theorem fc_tail_far_below_target : log10PN_upper_milli < fcTargetMilli := by
  decide

/-- Every scanned `S` sits deep inside the strictly decreasing tail at `N`. -/
theorem scanned_s_in_decreasing_tail (S : Nat) (hS : S ≤ sGridMax) :
    poissonStepNum S phononOrderN < poissonStepDen S phononOrderN := by
  unfold poissonStepNum poissonStepDen phononOrderN
  unfold sGridMax at hS
  omega

/-- `P_N < 10⁻³`, so the Nat floor of `1000·P_N` (phonon-channel weight in
    milli-units) is 0. -/
theorem fc_bound_below_milli : log10PN_upper_milli < -3000 := by decide

/-- EQ-WH-FC-01: FC-derived phonon-channel weight, milli-units (floor of
    `1000·P_N` with `log10 P_N ≤ -7×10⁵`). -/
def fcPhononWeightMilli : Nat := 0

/-- EQ-WH-FC-01: complementary γ branching in milli-units (`1000 − 0`). -/
def fcGammaBranchingMilli : Nat := 1000 - fcPhononWeightMilli

/-- EQ-WH-FC-01: Nat floor of the FC-derived `Γ_ph/Γ_γ` ratio (`P_N/(1−P_N)`
    with `log10 P_N ≤ -7×10⁵`). -/
def fcDerivedRatio : Nat := 0

theorem fc_gamma_branching_is_full : fcGammaBranchingMilli = 1000 := rfl

/-- EQ-WH-FC-01: the FC-derived γ branching exceeds any sub-unity upper bound,
    so Q2 (EQ-OPEN-RAD-01) is not closed by the multi-phonon tail. -/
theorem fc_does_not_close_q2 (upperBound : Nat) (h : upperBound < 1000) :
    ¬ q2RadiationSuppressionClosed fcGammaBranchingMilli upperBound :=
  gamma_above_bound_implies_q2_not_closed (by rw [fc_gamma_branching_is_full]; exact h)

/-- EQ-WH-FC-01: the FC-derived ratio is below the `10¹¹` bookkeeping target. -/
theorem fc_ratio_below_target : fcDerivedRatio < latticeGammaTarget := by
  decide

theorem fc_ratio_does_not_close_q2 : ¬ q2WouldCloseIf fcDerivedRatio := by
  intro h
  exact (Nat.not_le.mpr fc_ratio_below_target) h

/-! ### EQ-WH-PART-02 — general partition `derived + (Q − derived) = Q` -/

/-- EQ-WH-PART-02: conservation for any `derived ≤ Q`. -/
theorem partition_general (derived Q : Nat) (h : derived ≤ Q) :
    derived + (Q - derived) = Q :=
  Nat.add_sub_cancel' h

/-- EQ-WH-PART-02: the remainder vanishes exactly when everything is derived. -/
theorem remainder_zero_iff (derived Q : Nat) (h : derived ≤ Q) :
    Q - derived = 0 ↔ derived = Q := by
  omega

/-- EQ-WH-PART-02: a strictly partial allocation leaves Q1 open. -/
theorem partial_allocation_leaves_q1_open (derived Q : Nat) (h : derived < Q) :
    ¬ q1MeVEnergyGapClosed (Q - derived) :=
  positive_remainder_implies_q1_not_closed (Nat.sub_pos_of_lt h)

/-- EQ-WH-PART-02: the cited scan row (`n_coh_cited_cap = 0 ⇒ derived = 0`). -/
theorem cited_scan_row_remainder : qDD_He4_keV - 0 = qDD_He4_keV := rfl

theorem cited_scan_row_conserved : 0 + (qDD_He4_keV - 0) = qDD_He4_keV := rfl

/-! ### EQ-WH-DICKE-N-01 — deuterons inside the cooperation sphere -/

/-- EQ-WH-DICKE-N-01: PdD deuteron number density `6.8×10²⁸ m⁻³` in units of
    `10²⁷ m⁻³` (engine `electron_density` default). -/
def nD_1e27_per_m3 : Nat := 68

/-- EQ-WH-DICKE-N-01: cooperation sphere `4/3·π·(48.86 pm)³ ≈ 4.886×10⁻³¹ m³`
    in units of `10⁻³³ m³` (rounded). -/
def dickeVolume_1e33_m3 : Nat := 489

/-- EQ-WH-DICKE-N-01: `n_D · V_dicke ≈ 0.0332` in milli-units. -/
def nWithinRadiusMilli : Nat := 33

/-- `68×10²⁷ · 489×10⁻³³ = 33252×10⁻⁶ ⇒ 33 milli` (Nat floor). -/
theorem n_within_radius_from_inputs :
    nD_1e27_per_m3 * dickeVolume_1e33_m3 / 1000 = nWithinRadiusMilli := by
  decide

theorem n_within_radius_lt_one : nWithinRadiusMilli < 1000 := by decide

/-- EQ-WH-DICKE-N-01: licensed coherent-count cap `⌊n_D·V_dicke⌋`. -/
def nCohLicensedMax : Nat := nWithinRadiusMilli / 1000

theorem n_coh_licensed_max_zero : nCohLicensedMax = 0 := by decide

/-- EQ-WH-DICKE-N-01: no pair (let alone `N ≥ 2`) fits inside the cooperation
    radius, so Dicke `N²` is not licensed at the cited density. -/
theorem dicke_n2_not_licensed_for_pairs (n : Nat) (h : 2 ≤ n) :
    ¬ (n ≤ nCohLicensedMax) := by
  unfold nCohLicensedMax nWithinRadiusMilli
  omega

/-! ### EQ-WH-CAP-01 — engine-cap product bound for Q3 -/

/-- EQ-WH-CAP-01: cap on `P_occ` in milli-units (`P_occ ≤ 1`). -/
def pOccCapMilli : Nat := 1000

/-- EQ-WH-CAP-01: cap on `f_nuc` in milli-units (`f_nuc ≤ 1`). -/
def fNucCapMilli : Nat := 1000

/-- EQ-WH-CAP-01: engine collective clamp `C_lin ≤ 10⁶` (EQ-COLL-LIN-01). -/
def cLinCap : Nat := 1000000

/-- EQ-WH-CAP-01: with every factor at its cap the trapped-state product is
    bounded by `base · 1000 · 1000 · 10⁶` (milli² units). -/
theorem engine_cap_bound (pOcc fNuc cLin base : Nat)
    (hp : pOcc ≤ 1000) (hf : fNuc ≤ 1000) (hc : cLin ≤ 1000000) :
    base * pOcc * fNuc * cLin ≤ base * 1000 * 1000 * 1000000 :=
  Nat.mul_le_mul
    (Nat.mul_le_mul (Nat.mul_le_mul (Nat.le_refl base) hp) hf) hc

/-- EQ-WH-CAP-01: the engine collective clamp itself respects `cLinCap`. -/
theorem collective_within_cap (n : Nat) : collective n ≤ cLinCap :=
  collective_le_cap n

/-- EQ-WH-CAP-01 ∘ EQ-RATE-COND-01: the would-close-if product
    `rateProduct pOcc fNuc` (RateBudget) times the collective clamp never
    exceeds the engine cap, so any closure demand above
    `1000 · 1000 · 10⁶` cannot be met by capped factors. -/
theorem engine_cap_excludes_demand (pOcc fNuc cLin required : Nat)
    (hp : pOcc ≤ 1000) (hf : fNuc ≤ 1000) (hc : cLin ≤ 1000000)
    (hreq : 1000 * 1000 * 1000000 < required) :
    ¬ (required ≤ rateProduct pOcc fNuc * cLin) := by
  intro hle
  have hcap : rateProduct pOcc fNuc * cLin ≤ 1000 * 1000 * 1000000 := by
    have h := engine_cap_bound pOcc fNuc cLin 1 hp hf hc
    simpa [rateProduct, Nat.one_mul] using h
  exact Nat.lt_irrefl _ (Nat.lt_of_lt_of_le hreq (Nat.le_trans hle hcap))

/-- EQ-WH-CAP-01 ∘ EQ-RATE-COND-01: a would-close-if lower bound that holds
    under capped factors is itself below the cap. -/
theorem would_close_if_within_cap {nOcc fNuc n0 f0 : Nat}
    (hn : n0 ≤ nOcc) (hf : f0 ≤ fNuc)
    (hOcc : nOcc ≤ 1000) (hNuc : fNuc ≤ 1000) :
    n0 * f0 ≤ 1000 * 1000 :=
  Nat.le_trans (would_close_if hn hf) (Nat.mul_le_mul hOcc hNuc)

/-! ### EQ-WH-NONCLOSE-02 — v2 bounds do not discharge Q1–Q3 -/

/-- EQ-WH-NONCLOSE-02: the v2 bounds (general partition, FC tail, engine cap)
    leave the three open predicates undischarged. Mirrors
    `WorkingHypothesis.wh_does_not_discharge_open_obligations` and adds the
    Franck–Condon non-closure of Q2. -/
theorem wh_v2_does_not_discharge_open_obligations :
    ¬ q1MeVEnergyGapClosed openRemainderKeV ∧
      ¬ q2WouldCloseIf fcDerivedRatio ∧
      ¬ q2RadiationSuppressionClosed fcGammaBranchingMilli 0 ∧
      ¬ q3RateBudgetClosed log10NEvents :=
  ⟨remainder_implies_q1_open,
    fc_ratio_does_not_close_q2,
    fc_does_not_close_q2 0 (by decide),
    two_body_q3_not_closed⟩

end LenrFormal.WorkingHypothesisBounds
