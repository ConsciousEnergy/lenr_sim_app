/-!
Overlap — EQ-OVERLAP-01 / EQ-OVERLAP-02 bookkeeping (paper §2.2).

Halo / interface electron–nucleus overlap is a **model construct**.
The paper form \(P_{\mathrm{overlap}}\approx(r_0/a)^3 e^{-2r_0/a}\) and the
ensemble product \(N_{\mathrm{atoms}}\,f_{\mathrm{attempt}}\,P\) are
upper-bound counting arguments, **not** nuclear rates.

**Claim tier:** DEF / AX honesty only.
Does **not** prove electron capture, LENR, or discharge any `EQ-OPEN-*`.
There is no `theorem lenr_occurs`.
-/

namespace LenrFormal.Overlap

/-- Nuclear interaction radius in fm (`constants.NUCLEAR_RADIUS_FM` = 5).
    Not the ionic 0.1 nm scale from early drafts (IL / RR remediation). -/
def nuclearRadius_fm : Nat := 5

/-- Characteristic orbital scale for \(a = 10\,a_0 \approx 0.529\,\mathrm{nm}\)
    stored in picometres (paper §2.2). -/
def orbitalScale_pm : Nat := 529

/-- EQ-OVERLAP-01: unnormalized volume-ratio cube \(r_0^3\) (integer stand-in).
    Division by \(a^3\) and the \(e^{-2r_0/a}\) factor remain model inputs —
    Lean does not claim a Real-valued probability theorem. -/
def overlapVolumeNum (r0Scaled : Nat) : Nat :=
  r0Scaled * r0Scaled * r0Scaled

/-- EQ-OVERLAP-01: unnormalized \(a^3\) denominator stand-in. -/
def overlapVolumeDen (aScaled : Nat) : Nat :=
  aScaled * aScaled * aScaled

/-- EQ-OVERLAP-01: bookkeeping ratio skeleton for \((r_0/a)^3\). -/
structure OverlapRatio where
  numerator : Nat
  denominator : Nat

def overlapRatioBookkeeping (r0Scaled aScaled : Nat) : OverlapRatio :=
  {
    numerator := overlapVolumeNum r0Scaled
    denominator := overlapVolumeDen aScaled
  }

theorem overlap_ratio_num
    (r0 a : Nat) :
    (overlapRatioBookkeeping r0 a).numerator = r0 * r0 * r0 := rfl

theorem overlap_ratio_den
    (r0 a : Nat) :
    (overlapRatioBookkeeping r0 a).denominator = a * a * a := rfl

/-- Zero nuclear radius ⇒ zero overlap numerator (bookkeeping identity). -/
theorem zero_radius_zero_overlap_num (a : Nat) :
    (overlapRatioBookkeeping 0 a).numerator = 0 := by
  simp [overlapRatioBookkeeping, overlapVolumeNum]

/-- Cited nuclear-radius anchor matches the engine constant (5 fm). -/
theorem nuclear_radius_is_five_fm : nuclearRadius_fm = 5 := rfl

/-- Cited orbital-scale anchor is positive. -/
theorem orbital_scale_pos : 0 < orbitalScale_pm := by native_decide

/-! ### EQ-OVERLAP-02 — ensemble product is an upper-bound count, not a rate -/

/-- Kind tag for the macroscopic product \(N_{\mathrm{atoms}} f_{\mathrm{attempt}} P\). -/
inductive OverlapProductKind where
  | upperBoundCount
  | nuclearRate
  deriving DecidableEq, Repr

/-- EQ-OVERLAP-02 (AX honesty): the ensemble product is tagged as an
    upper-bound count. Interpreting it as \(R_{\mathrm{rate}}\) requires an
    unspecified matrix element — left OPEN / model-assumption. -/
def ensembleProductKind : OverlapProductKind := .upperBoundCount

theorem ensemble_product_is_upper_bound_count :
    ensembleProductKind = OverlapProductKind.upperBoundCount := rfl

theorem ensemble_product_not_nuclear_rate :
    ensembleProductKind ≠ OverlapProductKind.nuclearRate := by
  intro h
  cases h

/-- Nature-proof flag for this DEF module stays false. -/
def lenrProved : Bool := false

theorem lenr_proved_false : lenrProved = false := rfl

end LenrFormal.Overlap
