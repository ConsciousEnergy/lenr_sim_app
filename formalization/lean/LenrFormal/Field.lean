/-!
Field — EQ-FIELD-01

E_field (V/m) = ΔV / d with integer micro-units:
ΔV = 0.1 V → 100 mV; d = 1 nm → 1; E = 1e8 V/m.
We prove the exact Nat identity 10^8 = 10^8 and the ratio form
(1 * 10^8) / 1 = 10^8 for (0.1 V)/(1 nm) in consistent units.
-/

namespace LenrFormal.Field

/-- ΔV in volts × 10 (so 0.1 V ↦ 1). -/
def deltaV_tenths : Nat := 1

/-- d in nm. -/
def d_nm : Nat := 1

/-- E in V/m for the §2.3 example. -/
def E_field_example : Nat := 100000000

theorem double_layer_identity :
    (deltaV_tenths * 10 ^ 8) / d_nm = E_field_example := by
  native_decide

theorem ten_pow_eight : (10 : Nat) ^ 8 = 100000000 := by
  native_decide

end LenrFormal.Field
