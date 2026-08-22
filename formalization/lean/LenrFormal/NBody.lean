import LenrFormal.Constants

/-!
NBody — EQ-TSC-GEOM-01/02, EQ-TSC-Q-01, EQ-COLL-LIN-01, EQ-3B-MASS-DOM-01,
EQ-TSC-CH-01, EQ-TRAP-DEF-01 (defs).

FCC tetrahedral d_DD = a/(2√2) is angstrom-scale (~137 pm), not the 25 pm
trap radius. Q(4D→2α) = 2 × 23.8 MeV. Collective clamp is min(N, 10^6).
-/

namespace LenrFormal.NBody

open LenrFormal.Constants

/-- Pd lattice constant, picometres (3.89 Å). -/
def pdLattice_pm : Nat := 389

/-- Integer stand-in for a/(2√2) ≈ 137.5 pm. -/
def fcc_dDD_pm : Nat := 137

/-- Engine trapped-state separation (EQ-TRAP-SEP-01). -/
def trapSep_pm : Nat := 25

/-- Identity lock: d_DD is the FCC tetrahedral nearest-neighbour scale. -/
theorem fcc_dd_less_than_lattice : fcc_dDD_pm < pdLattice_pm := by
  native_decide

theorem geom_neq_trap : fcc_dDD_pm ≠ trapSep_pm := by
  native_decide

theorem q4d_is_two_qdd : (2 : Nat) * qDD_He4_keV = 47600 := rfl

def collective (n : Nat) : Nat := Nat.min n 1000000

theorem collective_le_cap (n : Nat) : collective n ≤ 1000000 :=
  Nat.min_le_right _ _

/-- ULM mass renormalization claimed only if m*/m_e ≥ 2.53 (hundredths). -/
def ulmApplicable (mStarHundredths : Nat) : Prop := 253 ≤ mStarHundredths

def ulmFormulaClaimed (mStarHundredths : Nat) : Prop := ulmApplicable mStarHundredths

theorem ulm_not_applicable_implies_not_claimed
    (m : Nat)
    (h : ¬ ulmApplicable m) :
    ¬ ulmFormulaClaimed m := h

theorem default_four_is_applicable : ulmApplicable 400 := by
  native_decide

/-- If the final state is two on-shell alphas, no primary γ is required.
    Does not prove the channel occurs. -/
def requiresPrimaryGamma (twoOnShellAlphas : Bool) : Bool := !twoOnShellAlphas

theorem tsc_channel_kin : requiresPrimaryGamma true = false := rfl

end LenrFormal.NBody
