import LenrFormal.NBody

/-!
Branching — EQ-BRANCH-LATTICE-01

Gamma_ph / Gamma_gamma open ratio target and detector upper-bound bookkeeping.
No measured branching fraction is asserted.
-/

namespace LenrFormal.Branching

open LenrFormal.NBody

/-- Paper §5A.2 open target: lattice phonon branch must dominate γ (not proved). -/
def latticeGammaTarget : Nat := 100000000000  -- 10^11 as Nat stand-in

/-- Detector inequality: BR_gamma < UL / (epsilon * N_He) when all positive. -/
def gammaBranchingUpperBound (ulCps epsilonHundredths he4PerSec : Nat) : Nat :=
  if he4PerSec = 0 then 0 else ulCps * 100 / (epsilonHundredths * he4PerSec)

theorem lattice_target_positive : 0 < latticeGammaTarget := by
  native_decide

theorem tsc_kin_no_primary_gamma : requiresPrimaryGamma true = false :=
  tsc_channel_kin

end LenrFormal.Branching
