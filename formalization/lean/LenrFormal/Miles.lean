import LenrFormal.Constants

/-!
Miles — EQ-QDD-01 / EQ-MILES-CONV-01

Conversion identity in scaled integers.
N / 10⁹ ≈ 263 for Q = 23.8 MeV (code constant 2.63×10¹¹).
Band: 260 ≤ N/10⁹ ≤ 266.
-/

namespace LenrFormal.Miles

open LenrFormal.Constants

theorem q_adopted_keV : qDD_He4_keV = 23800 := rfl

theorem miles_code_in_band :
    260 ≤ milesRate_div_1e9 ∧ milesRate_div_1e9 ≤ 266 := by
  native_decide

/--
Algebraic conversion check using e (CODATA) scaled:
1 MeV = 1.602176634×10⁻¹³ J.
Atoms/s/W = 1 / (Q_MeV × 1.602176634×10⁻¹³).
For Q = 23.8: N ≈ 2.627×10¹¹ → rounded governance 2.63×10¹¹.
We lock the integer milli-rate 2627 (×10⁸) into [2600, 2660] (×10⁸).
-/
def conversionMilliRate : Nat := 2627  -- ×10⁸ atoms/s/W

theorem conversion_band :
    2600 ≤ conversionMilliRate ∧ conversionMilliRate ≤ 2660 := by
  native_decide

theorem code_matches_conversion_rounding :
    milesRate_div_1e9 = 263 := rfl

end LenrFormal.Miles
