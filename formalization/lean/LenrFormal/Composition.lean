import LenrFormal.Constants

/-!
Composition — EQ-COMP-01/02, EQ-BBL-COMP-01, EQ-PRED-01/02,
and EQ-TUN-BAND-01.
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

/-- Mechanisms governed by the EQ-PRED-02 model-input bounds. -/
inductive Mechanism where
  | screening
  | phonon
  | qed
  | compression
  | casimir
  | rydberg
  | loading
  deriving DecidableEq, Repr

/-- EQ-PRED-02 model-assumption inputs, not derived physical limits. -/
def mechanismPhysicsBound : Mechanism → Nat
  | .screening => 100000
  | .phonon => 100
  | .qed => 2
  | .compression => 1000000
  | .casimir => 1000000
  | .rydberg => 10
  | .loading => 3

/-- Input property stating that a mechanism value respects its assumed bound. -/
def respectsPhysicsBound (mechanism : Mechanism) (value : Nat) : Prop :=
  value ≤ mechanismPhysicsBound mechanism

structure MechanismScore where
  raw : Nat
  bound : Nat

def boundedScore (score : MechanismScore) : Nat :=
  Nat.min score.raw score.bound

/-- EQ-BBL-COMP-01: max within a correlated mechanism group. -/
def bubbleGroupScore (scores : List MechanismScore) : Nat :=
  maxScore (scores.map boundedScore)

/-- EQ-BBL-COMP-01: multiply the independently grouped winners. -/
def bubblePhysicsGoverned (groups : List (List MechanismScore)) : Nat :=
  productScores (groups.map bubbleGroupScore)

def rawGroupProduct (scores : List MechanismScore) : Nat :=
  productScores (scores.map (fun score => score.raw))

/-- Naive exploratory product retained only as the EQ-PRED-01 sensitivity tier. -/
def bubbleSensitivityModel (groups : List (List MechanismScore)) : Nat :=
  productScores (groups.map rawGroupProduct)

/-- Global RR-001 display clamp, distinct from per-mechanism physics bounds. -/
def bubbleClaimTierDisplay (groups : List (List MechanismScore)) : Nat :=
  Nat.min (bubblePhysicsGoverned groups) maxEnhancementFactor

structure Prediction where
  sensitivityModel : Nat
  physicsGoverned : Nat
  claimTierDisplay : Nat

/-- EQ-PRED-01 three-tier report; no field is a theorem of nature. -/
def bubblePrediction (groups : List (List MechanismScore)) : Prediction :=
  {
    sensitivityModel := bubbleSensitivityModel groups
    physicsGoverned := bubblePhysicsGoverned groups
    claimTierDisplay := bubbleClaimTierDisplay groups
  }

theorem bubble_group_pair_is_max (a b : MechanismScore) :
    bubbleGroupScore [a, b] = Nat.max (boundedScore a) (boundedScore b) := by
  simp [bubbleGroupScore, maxScore, List.foldl]

theorem bubble_claim_tier_le_cap (groups : List (List MechanismScore)) :
    bubbleClaimTierDisplay groups ≤ maxEnhancementFactor := by
  exact Nat.min_le_right _ _

/-- Illegal product of two already-capped engine totals (EQ-COMP-03). Not physical. -/
theorem illegal_engine_product_at_cap :
    maxEnhancementFactor * maxEnhancementFactor = 10000000000 := by
  native_decide

theorem illegal_product_exceeds_single_cap :
    maxEnhancementFactor < maxEnhancementFactor * maxEnhancementFactor := by
  native_decide

end LenrFormal.Composition
