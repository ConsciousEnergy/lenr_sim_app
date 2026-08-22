/-!
Assenbaum — EQ-ASSEN-01 / EQ-ASSEN-DOM-01

applicable := U_e < E_kin (energies in milli-eV).
-/

namespace LenrFormal.Assenbaum

def applicable (U_e E_kin : Nat) : Prop := U_e < E_kin

def formulaClaimed (U_e E_kin : Nat) : Prop := applicable U_e E_kin

theorem not_applicable_implies_not_claimed
    (U_e E_kin : Nat)
    (h : ¬ applicable U_e E_kin) :
    ¬ formulaClaimed U_e E_kin := h

/-- U_e = 300000 meV (300 eV), E_kin = 100 meV (0.1 eV). -/
theorem thermal_not_applicable :
    ¬ applicable 300000 100 := by
  intro h
  -- h : 300000 < 100
  exact (Nat.not_lt.mpr (by decide : 100 ≤ 300000)) h

theorem applicable_mono_energy
    {U_e E₁ E₂ : Nat}
    (hApp : applicable U_e E₁)
    (hLe : E₁ ≤ E₂) :
    applicable U_e E₂ :=
  Nat.lt_of_lt_of_le hApp hLe

end LenrFormal.Assenbaum
