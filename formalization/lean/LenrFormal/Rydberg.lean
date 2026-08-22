import LenrFormal.Constants

/-!
Rydberg — EQ-RYD-01

E_n (meV) = -E₀ / n² with E₀ = 13600 meV.
At n = 10: -136 meV = -0.136 eV.
-/

namespace LenrFormal.Rydberg

open LenrFormal.Constants

/-- |E_n| in milli-eV for principal quantum number n > 0. -/
def absLevel_meV (n_prin : Nat) : Nat :=
  rydbergE0_meV / (n_prin * n_prin)

theorem abs_at_10 : absLevel_meV 10 = 136 := by
  native_decide

/-- Signed energy in milli-eV. -/
def E_n_meV (n_prin : Nat) : Int :=
  - (absLevel_meV n_prin : Int)

theorem E_at_10_meV : E_n_meV 10 = -136 := by
  simp [E_n_meV, abs_at_10]

end LenrFormal.Rydberg
