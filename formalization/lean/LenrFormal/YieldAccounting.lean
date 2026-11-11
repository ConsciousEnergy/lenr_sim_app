import LenrFormal.Miles
import LenrFormal.WhenHow

/-!
YieldAccounting — EQ-YIELD-ACCT-01 (duty-cycle expected-yield bookkeeping)

Mirrors `build_integrated_yield_question`: expected He-4 yield
N_exp = (Miles atoms·s⁻¹·W⁻¹) × P_W × t_active with t_active = t_total × f_duty.
Scaled integers: N_exp / 10⁹ = milesRate_div_1e9 × P_W × dutyCycleYield t f_duty.

This is an EXPECTED yield from the Miles conversion only. No observed integrated
yield is an input, so no definition here can witness ΔN_He,integrated = 0;
EQ-OPEN-YIELD-01 stays OPEN.
-/

namespace LenrFormal.YieldAccounting

open LenrFormal.Constants
open LenrFormal.WhenHow

/-- Expected integrated He-4 yield ÷ 10⁹ atoms (duty in hundredths, time in s). -/
def expectedHeYield_div_1e9 (powerW totalTime dutyHundredths : Nat) : Nat :=
  milesRate_div_1e9 * powerW * dutyCycleYield totalTime dutyHundredths

theorem full_duty_active_time (totalTime : Nat) :
    dutyCycleYield totalTime 100 = totalTime :=
  Nat.mul_div_cancel totalTime (by decide)

theorem zero_duty_active_time (totalTime : Nat) :
    dutyCycleYield totalTime 0 = 0 := by
  simp [dutyCycleYield]

theorem expected_yield_full_duty (powerW totalTime : Nat) :
    expectedHeYield_div_1e9 powerW totalTime 100 = 263 * powerW * totalTime := by
  unfold expectedHeYield_div_1e9
  rw [full_duty_active_time]
  rfl

theorem expected_yield_zero_duty (powerW totalTime : Nat) :
    expectedHeYield_div_1e9 powerW totalTime 0 = 0 := by
  unfold expectedHeYield_div_1e9
  rw [zero_duty_active_time, Nat.mul_zero]

end LenrFormal.YieldAccounting
