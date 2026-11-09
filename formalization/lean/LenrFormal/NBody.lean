import LenrFormal.Constants

/-!
NBody — EQ-TSC-GEOM-01/02, EQ-TSC-Q-01, EQ-COLL-LIN-01, EQ-3B-MASS-DOM-01,
EQ-TSC-CH-01, EQ-TSC-STOP-01, EQ-TRAP-DEF-01, EQ-3B-SEQ-01,
and EQ-NBODY-FGR-01 (volumetric FGR + linear-collective lemmas).

FCC tetrahedral d_DD = a/(2√2) is angstrom-scale (~137 pm), not the 25 pm
trap radius. Q(4D→2α) = 2 × 23.8 MeV. Collective clamp is min(N, 10^6).
FGR bookkeeping does **not** discharge EQ-OPEN-RATE-01.
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

/-- An unnormalized ratio of integer-scaled bookkeeping terms. -/
structure BookkeepingRatio where
  numerator : Nat
  denominator : Nat

/-- EQ-NBODY-FGR-01 bookkeeping only.
    Scaling and empirical constraints on P₄, Γ, |V|², and ℏ remain inputs. -/
def fgrRateBookkeeping
    (nSites p4Corr gammaTun vNucSq hbarScaled : Nat) :
    BookkeepingRatio :=
  {
    numerator := nSites * p4Corr * gammaTun * vNucSq
    denominator := hbarScaled
  }

/-- EQ-NBODY-FGR-01: engine volumetric form
    \(R = n_{\mathrm{sites}} P_{\mathrm{occ}} \Gamma_{\mathrm{tun}} f_{\mathrm{nuc}} C_{\mathrm{lin}} / \tau\)
    (`many_body.fgr_model.compute_fgr_volumetric_rate`).
    |V_nuc|² is absorbed into \(f_{\mathrm{nuc}}\); collective is the linear clamp. -/
def fgrVolumetricBookkeeping
    (nSites pOcc gammaTun fNuc tauScaled nCoherent : Nat) :
    BookkeepingRatio :=
  {
    numerator := nSites * pOcc * gammaTun * fNuc * collective nCoherent
    denominator := tauScaled
  }

/-- Zero occupation zeroes the correlated-condensate FGR numerator. -/
theorem fgr_zero_occupation
    (nSites gammaTun vNucSq hbarScaled : Nat) :
    (fgrRateBookkeeping nSites 0 gammaTun vNucSq hbarScaled).numerator = 0 := by
  simp [fgrRateBookkeeping]

/-- Zero occupation zeroes the volumetric FGR numerator. -/
theorem fgr_volumetric_zero_occupation
    (nSites gammaTun fNuc tauScaled nCoherent : Nat) :
    (fgrVolumetricBookkeeping nSites 0 gammaTun fNuc tauScaled nCoherent).numerator = 0 := by
  simp [fgrVolumetricBookkeeping]

/-- Volumetric FGR uses the linear collective clamp (EQ-COLL-LIN-01), not Dicke \(N^2\). -/
theorem fgr_volumetric_uses_linear_collective
    (nSites pOcc gammaTun fNuc tauScaled nCoherent : Nat) :
    (fgrVolumetricBookkeeping nSites pOcc gammaTun fNuc tauScaled nCoherent).numerator =
      nSites * pOcc * gammaTun * fNuc * collective nCoherent := rfl

/-- Volumetric FGR numerator is bounded by the linear collective cap. -/
theorem fgr_volumetric_collective_le_cap
    (nSites pOcc gammaTun fNuc tauScaled nCoherent : Nat) :
    (fgrVolumetricBookkeeping nSites pOcc gammaTun fNuc tauScaled nCoherent).numerator ≤
      nSites * pOcc * gammaTun * fNuc * 1000000 :=
  Nat.mul_le_mul_left _ (collective_le_cap nCoherent)

/-- EQ-TRAP-DEF-01 bookkeeping only; `fNuc` is intentionally unconstrained. -/
def trappedRateBookkeeping
    (nClusters pWkb fNuc tauScaled nCoherent : Nat) :
    BookkeepingRatio :=
  {
    numerator := nClusters * pWkb * fNuc * collective nCoherent
    denominator := tauScaled
  }

/-- The default trapped-state ratio uses the assumed 10⁻²⁰ s lifetime scale. -/
def defaultTrappedRateBookkeeping
    (nClusters pWkb fNuc nCoherent : Nat) :
    BookkeepingRatio :=
  trappedRateBookkeeping
    nClusters pWkb fNuc trapLifetime_zeptoseconds nCoherent

/-- EQ-3B-SEQ-01 is a sequential two-stage model, not a Faddeev solution. -/
inductive ThreeBodyStage where
  | protonElectronCapture
  | neutronDeuteronCapture
  deriving DecidableEq, Repr

def threeBodySequence : List ThreeBodyStage :=
  [.protonElectronCapture, .neutronDeuteronCapture]

/-- EQ-3B-SEQ-01 default η_conv = 1 part per million (model input). -/
def defaultThreeBodyConversionMillionths : Nat := 1

/-- ULM mass renormalization claimed only if m*/m_e ≥ 2.53 (hundredths). -/
def ulmApplicable (mStarHundredths : Nat) : Prop := 253 ≤ mStarHundredths

def ulmFormulaClaimed (mStarHundredths : Nat) : Prop := ulmApplicable mStarHundredths

theorem ulm_not_applicable_implies_not_claimed
    (m : Nat)
    (h : ¬ ulmApplicable m) :
    ¬ ulmFormulaClaimed m := h

theorem default_four_is_applicable : ulmApplicable 400 := by
  unfold ulmApplicable
  native_decide

/-- If the final state is two on-shell alphas, no primary γ is required.
    Does not prove the channel occurs. -/
def requiresPrimaryGamma (twoOnShellAlphas : Bool) : Bool := !twoOnShellAlphas

theorem tsc_channel_kin : requiresPrimaryGamma true = false := rfl

/-- EQ-TSC-STOP-01 bookkeeping tags for two distinct energy-transfer questions. -/
inductive EnergyTransferMode where
  | alphaStopping
  | promptPhoton
  deriving DecidableEq, Repr

def tscStoppingMode : EnergyTransferMode := .alphaStopping

def radiativeTransferMode : EnergyTransferMode := .promptPhoton

end LenrFormal.NBody
