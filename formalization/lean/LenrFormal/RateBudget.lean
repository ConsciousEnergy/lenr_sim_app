import LenrFormal.Composition

/-!
RateBudget — EQ-RATE-2B-NC-01 / EQ-RATE-COND-01 / EQ-RATE-REPLACE-01

Paper §5A.3 bookkeeping: log10 N_events = 23+12+5-80 = -40 < 0.
Would-close-if: if n_occ ≥ n0 and f ≥ f0 then n*f ≥ n0*f0.
Rival rate modes are alternatives, not factors of one product.
-/

namespace LenrFormal.RateBudget

open LenrFormal.Composition

/-- log10 N_events under P_bare ~ 10^{-85}, f ≤ 10^5, N_atoms 10^{23},
    attempt 10^{12} Hz, t = 10^5 s. -/
def log10NEvents : Int := (23 : Int) + 12 + 5 - 80

theorem two_body_budget_does_not_close : log10NEvents < 0 := by
  native_decide

theorem two_body_log10_value : log10NEvents = (-40 : Int) := by
  native_decide

def rateProduct (nOcc fNuc : Nat) : Nat := nOcc * fNuc

theorem would_close_if
    {nOcc fNuc n0 f0 : Nat}
    (hn : n0 ≤ nOcc)
    (hf : f0 ≤ fNuc) :
    n0 * f0 ≤ rateProduct nOcc fNuc :=
  Nat.mul_le_mul hn hf

/-- Rival rate formalisms: max < product when both factors exceed 1. -/
theorem rival_modes_not_product
    (a b : Nat)
    (ha : 1 < a)
    (hb : 1 < b) :
    maxScore [a, b] < a * b :=
  intra_group_not_product a b ha hb

end LenrFormal.RateBudget
