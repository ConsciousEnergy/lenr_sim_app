/-!
RealShim — bridge axioms for analysis facts used without mathlib.

Replace with mathlib `Real.exp` facts when the project depends on mathlib.
-/

namespace LenrFormal.RealShim

/-- Abstract exponential on integers (proxy for Real.exp on a scaled domain). -/
opaque expZ : Int → Int

/-- Strict monotonicity bridge (`Real.exp` is strictly monotone). -/
axiom expZ_strict_mono : ∀ {x y : Int}, x < y → expZ x < expZ y

/-- Normalization bridge (`Real.exp_zero`: `exp 0 = 1`). -/
axiom expZ_zero : expZ 0 = 1

/-- Non-strict monotonicity from the strict-mono bridge. -/
theorem expZ_mono {x y : Int} (h : x ≤ y) : expZ x ≤ expZ y := by
  by_cases hlt : x < y
  · exact Int.le_of_lt (expZ_strict_mono hlt)
  · have heq : x = y := Int.le_antisymm h (Int.not_lt.mp hlt)
    subst heq
    exact Int.le_refl _

/-- Analysis identity: `e^{-S} ≤ e^0` whenever `S ≥ 0`. -/
theorem expZ_neg_le_expZ_zero {S : Int} (hS : 0 ≤ S) : expZ (-S) ≤ expZ 0 :=
  expZ_mono (Int.neg_nonpos_of_nonneg hS)

/-- Analysis identity: `e^{-S} ≤ 1` whenever `S ≥ 0`
    (`Real.exp_neg_le_one_of_nonneg`). -/
theorem expZ_neg_le_one {S : Int} (hS : 0 ≤ S) : expZ (-S) ≤ 1 := by
  have h := expZ_neg_le_expZ_zero hS
  rwa [expZ_zero] at h

/-- Multiplicative form used by the Poisson FC bridge:
    `e^{-S} · t ≤ t` for `S ≥ 0` and `t ≥ 0`. -/
theorem expZ_neg_mul_le {S t : Int} (hS : 0 ≤ S) (ht : 0 ≤ t) :
    expZ (-S) * t ≤ t := by
  calc
    expZ (-S) * t ≤ (1 : Int) * t :=
      Int.mul_le_mul_of_nonneg_right (expZ_neg_le_one hS) ht
    _ = t := Int.one_mul t

end LenrFormal.RealShim
