/-!
CollapseBounds — EQ-BBL-LIM-01.

Calculated collapse outputs are reported through a pointwise upper clamp.
The definitions are unit-agnostic integer bookkeeping, not a solver-validity
or physical-bound theorem.
-/

namespace LenrFormal.CollapseBounds

def clamped (raw bound : Nat) : Nat := Nat.min raw bound

/-- The raw value exceeds its calculated bound. -/
def saturated (raw bound : Nat) : Prop := bound < raw

theorem clamped_le_bound (raw bound : Nat) :
    clamped raw bound ≤ bound :=
  Nat.min_le_right _ _

theorem clamped_eq_bound_of_saturated
    {raw bound : Nat}
    (h : saturated raw bound) :
    clamped raw bound = bound := by
  unfold saturated at h
  exact Nat.min_eq_right (Nat.le_of_lt h)

theorem clamped_eq_raw_of_not_saturated
    {raw bound : Nat}
    (h : raw ≤ bound) :
    clamped raw bound = raw := by
  exact Nat.min_eq_left h

end LenrFormal.CollapseBounds
