/-!
Phonon — EQ-PHONON-N-01 / EQ-NAIVE-GN-01

Integer identities: N = Q / (ħω) for 23.8 MeV / 50 meV, and Nat-floor of
(1/2)^n = 0 for n ≥ 1 (naive independent multi-phonon is negligible).
-/

namespace LenrFormal.Phonon

/-- Q(D+D→⁴He) in eV. -/
def q_eV : Nat := 23800000

/-- Characteristic phonon energy in meV (paper §2.8.1 / §5A.1). -/
def phonon_meV : Nat := 50

/-- N = Q / ħω = 23.8e6 eV / 0.05 eV = 4.76e8. -/
def phononOrderN : Nat := q_eV * 20

theorem phonon_order_identity : phononOrderN = 476000000 := rfl

/-- Paper §2.8.1: 1 MeV / 50 meV ⇒ N = 2e7. -/
theorem one_MeV_phonon_order : (1000000 * 20) = 20000000 := rfl

/-- Nat floor of 1/2^n. For n ≥ 1 this is 0. -/
def naiveHalfPowFloor (n : Nat) : Nat := 1 / (2 ^ n)

theorem naive_gN_fails_n1 : naiveHalfPowFloor 1 = 0 := by native_decide

theorem naive_gN_fails_n40 : naiveHalfPowFloor 40 = 0 := by native_decide

end LenrFormal.Phonon
