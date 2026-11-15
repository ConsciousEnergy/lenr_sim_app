import Lake
open Lake DSL

package «lenrFormal» where
  -- Pilot package: algebraic consistency theorems for Unified LENR Theory.
  -- No mathlib dependency (CI-light Nat/Int proofs). Real.exp mono / exp_zero
  -- are labelled analysis bridge axioms in RealShim.lean; swap for mathlib later.

@[default_target]
lean_lib «LenrFormal» where
  roots := #[`LenrFormal]
