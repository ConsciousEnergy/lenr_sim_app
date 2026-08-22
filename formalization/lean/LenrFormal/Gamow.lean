import LenrFormal.RealShim

/-!
Gamow — EQ-GAMOW-01

P(η) = expZ(-2η). Larger η ⇒ strictly smaller P.
-/

namespace LenrFormal.Gamow

open LenrFormal.RealShim

def penetration (eta : Int) : Int := expZ (-(2 : Int) * eta)

theorem penetration_strict_anti_mono
    {eta₁ eta₂ : Int}
    (h : eta₁ < eta₂) :
    penetration eta₂ < penetration eta₁ := by
  have h2 : (0 : Int) < 2 := by decide
  have hmul : (2 : Int) * eta₁ < (2 : Int) * eta₂ :=
    Int.mul_lt_mul_of_pos_left h h2
  -- negate both sides: -2η₂ < -2η₁
  have hneg : -(2 : Int) * eta₂ < -(2 : Int) * eta₁ := by
    have := Int.neg_lt_neg hmul
    -- this : -(2*eta₂) < -(2*eta₁)
    simpa [Int.neg_mul] using this
  exact expZ_strict_mono hneg

end LenrFormal.Gamow
