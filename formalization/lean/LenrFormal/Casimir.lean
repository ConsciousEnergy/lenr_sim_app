import LenrFormal.Constants

/-!
Casimir — EQ-CAS-01 / EQ-CAS-02

Check geometry A/d⁴ = 10²⁴. Adopted |F| = 1300 µN (1.3 mN) ±5%.
-/

namespace LenrFormal.Casimir

open LenrFormal.Constants

/-- Force magnitude (µN) from κ-scaled integer model:
`F_uN = kappa_uN` when geometry factor is normalized to the check case. -/
def force_uN (kappa_uN : Nat) : Nat := kappa_uN

def forceLo_uN : Nat := casimirForce_uN - casimirBandHalf_uN
def forceHi_uN : Nat := casimirForce_uN + casimirBandHalf_uN

theorem band_lo_hi : forceLo_uN = 1235 ∧ forceHi_uN = 1365 := by
  native_decide

theorem mid_is_1p3_mN : force_uN casimirForce_uN = 1300 := by
  rfl

theorem magnitude_in_band
    (kappa_uN : Nat)
    (hLo : forceLo_uN ≤ kappa_uN)
    (hHi : kappa_uN ≤ forceHi_uN) :
    forceLo_uN ≤ force_uN kappa_uN ∧ force_uN kappa_uN ≤ forceHi_uN := by
  exact ⟨hLo, hHi⟩

/-- Geometry exponent matches IR (A/d⁴ = 10²⁴). -/
theorem geometry_exp : casimirGeometryExp = 24 := rfl

/-- 10²⁴ is positive (well-defined geometry factor). -/
theorem geometry_factor_pos : 0 < (10 : Nat) ^ casimirGeometryExp := by
  native_decide

end LenrFormal.Casimir
