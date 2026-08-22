import LenrFormal.Constants

/-!
Composition — EQ-COMP-01 / EQ-COMP-02 / EQ-TUN-BAND-01
-/

namespace LenrFormal.Composition

open LenrFormal.Constants

def maxScore : List Nat → Nat
  | [] => 1
  | x :: xs => List.foldl Nat.max x xs

def productScores (scores : List Nat) : Nat :=
  scores.foldl (· * ·) 1

def composeCapped (groupWinners : List Nat) : Nat :=
  Nat.min (productScores groupWinners) maxEnhancementFactor

theorem composeCapped_le_max (groupWinners : List Nat) :
    composeCapped groupWinners ≤ maxEnhancementFactor := by
  simp [composeCapped]
  exact Nat.min_le_right _ _

theorem intra_group_is_max (a b : Nat) :
    maxScore [a, b] = Nat.max a b := by
  simp [maxScore, List.foldl]

theorem intra_group_not_product
    (a b : Nat)
    (ha : 1 < a)
    (hb : 1 < b) :
    maxScore [a, b] < a * b := by
  have hmax : maxScore [a, b] = Nat.max a b := intra_group_is_max a b
  rw [hmax]
  cases Nat.le_total a b with
  | inl hab =>
      have hm : Nat.max a b = b := Nat.max_eq_right hab
      rw [hm]
      have : 1 * b < a * b := Nat.mul_lt_mul_of_pos_right ha (Nat.zero_lt_of_lt hb)
      simpa using this
  | inr hba =>
      have hm : Nat.max a b = a := Nat.max_eq_left hba
      rw [hm]
      have : a * 1 < a * b := Nat.mul_lt_mul_of_pos_left hb (Nat.zero_lt_of_lt ha)
      simpa using this

theorem empty_compose_le :
    composeCapped [] ≤ maxEnhancementFactor :=
  composeCapped_le_max []

theorem cap_value : maxEnhancementFactor = 100000 := rfl

/-- Illegal product of two already-capped engine totals (EQ-COMP-03). Not physical. -/
theorem illegal_engine_product_at_cap :
    maxEnhancementFactor * maxEnhancementFactor = 10000000000 := by
  native_decide

theorem illegal_product_exceeds_single_cap :
    maxEnhancementFactor < maxEnhancementFactor * maxEnhancementFactor := by
  native_decide

end LenrFormal.Composition
