import LenrFormal.Composition
import LenrFormal.CollapseBounds
import LenrFormal.NBody

/-!
RateBudget — EQ-RATE-2B-NC-01 / EQ-RATE-COND-01 / EQ-RATE-REPLACE-01 /
EQ-RATE-CAP-NC-01 / EQ-RATE-CAP-NC-02 / EQ-RATE-CAP-GAP-01

Paper §5A.3 bookkeeping: log10 N_events = 23+12+5-80 = -40 < 0.
Would-close-if: if n_occ ≥ n0 and f ≥ f0 then n*f ≥ n0*f0.
Rival rate modes are alternatives, not factors of one product.

EQ-RATE-CAP-*: integer log10 event budgets for the `trapped_state` and
`three_body` scenario algebras. These are scenario / cap bounds, not theorems
of nature. Non-closure is proved only where every engine cap still leaves the
budget negative; where the caps admit a nonnegative budget, that is proved as
a gap (caps do not certify non-closure), never as closure.
EQ-OPEN-RATE-01 stays OPEN.
-/

namespace LenrFormal.RateBudget

open LenrFormal.Composition
open LenrFormal.CollapseBounds

/-- log10 N_events under P_bare ~ 10^{-85}, f ≤ 10^5, N_atoms 10^{23},
    attempt 10^{12} Hz, t = 10^5 s. -/
def log10NEvents : Int := (23 : Int) + 12 + 5 - 80

theorem two_body_budget_does_not_close : log10NEvents < 0 := by
  native_decide

theorem two_body_log10_value : log10NEvents = (-40 : Int) := by
  native_decide

def rateProduct (nOcc fNuc : Nat) : Nat := nOcc * fNuc

theorem would_close_if
    {nOcc fNuc n0 f0 : Nat}
    (hn : n0 ≤ nOcc)
    (hf : f0 ≤ fNuc) :
    n0 * f0 ≤ rateProduct nOcc fNuc :=
  Nat.mul_le_mul hn hf

/-- Rival rate formalisms: max < product when both factors exceed 1. -/
theorem rival_modes_not_product
    (a b : Nat)
    (ha : 1 < a)
    (hb : 1 < b) :
    maxScore [a, b] < a * b :=
  intra_group_not_product a b ha hb

/-! ### EQ-RATE-CAP — scenario log10 budgets under engine caps

Each term is the integer log10 of one factor of `reaction_rate_engine` /
`many_body.fgr_model` for the D–D reactant. Caps are ceilings (rounded up);
engine-default witnesses are floors (rounded down). -/

/-- `log10(V t)`: `V = 10⁻⁶ m³` (≈10²³ Pd atoms, the §5A.3 `N_atoms`) over the
    §5A.3 time `t = 10⁵ s`. -/
def windowLog10 : Int := -1

/-- `n_sites ≤ 10²⁹ m⁻³`, above the Pd atom density 6.8×10²⁸ m⁻³. -/
def sitesLog10Cap : Int := 29

/-- Engine-default `n_sites ≈ 6.65×10²⁶ m⁻³` (floor). -/
def sitesLog10Floor : Int := 26

/-- `−log10 τ` at the engine lifetime floor `τ ≥ 10⁻³⁰ s`. -/
def invTauLog10Cap : Int := 30

/-- `−log10 τ` at the assumed `τ = 10⁻²⁰ s` (EQ-TRAP-TAU-01). -/
def invTauLog10Default : Int := 20

/-- `log10 C_lin ≤ 6` (EQ-COLL-LIN-01). -/
def collectiveLog10Cap : Int := 6

/-- `log10` of the composed enhancement cap `10⁵` (EQ-COMP-01), which spans
    the contested hydro / collapse groups. The engine trapped-state and
    three-body paths apply no such factor; admitting it only loosens a bound. -/
def enhancementLog10Cap : Int := 5

/-- Engine WKB penetration, D–D at the FCC tetrahedral spacing 137.5 pm
    (EQ-TSC-GEOM-01): `Γ_tun ≈ 1.44×10⁻⁸⁵` (ceiling). Penetration falls with
    separation, so this also caps every wider spacing. -/
def tunLog10CapFcc : Int := -84

/-- Engine WKB penetration, D–D at the 25 pm TSC trap (EQ-TRAP-SEP-01):
    `Γ_tun ≈ 6.8×10⁻³⁷` (ceiling). -/
def tunLog10Cap25pm : Int := -36

/-- Same 25 pm penetration (floor). -/
def tunLog10Floor25pm : Int := -37

/-- Integer log10 terms of the EQ-NBODY-FGR-01 trapped-state event budget. -/
structure TrappedLogTerms where
  sites : Int
  occ : Int
  tun : Int
  nuc : Int
  invTau : Int
  coll : Int
  enh : Int
  window : Int

/-- `log10 N = log10 n_sites + log10 P_occ + log10 Γ_tun + log10 f_nuc
    − log10 τ + log10 C_lin + log10 E_enh + log10 (V t)`. -/
def TrappedLogTerms.log10N (t : TrappedLogTerms) : Int :=
  t.sites + t.occ + t.tun + t.nuc + t.invTau + t.coll + t.enh + t.window

/-- Engine cap box for a geometry with penetration ceiling `tunCap`:
    `P_occ ≤ 1`, `f_nuc ≤ 1`, `τ ≥ 10⁻³⁰ s`, `C_lin ≤ 10⁶`, `E_enh ≤ 10⁵`. -/
def TrappedLogTerms.withinCaps (tunCap : Int) (t : TrappedLogTerms) : Prop :=
  t.sites ≤ sitesLog10Cap ∧ t.occ ≤ 0 ∧ t.tun ≤ tunCap ∧ t.nuc ≤ 0 ∧
    t.invTau ≤ invTauLog10Cap ∧ t.coll ≤ collectiveLog10Cap ∧
    t.enh ≤ enhancementLog10Cap ∧ t.window ≤ windowLog10

/-- EQ-RATE-CAP-NC-01 (DISPROVEN under caps): the D–D trapped state at the
    lattice FCC tetrahedral spacing (or wider) has a negative log budget with
    every factor at or below its engine cap. -/
theorem trapped_fcc_under_caps_does_not_close
    (t : TrappedLogTerms) (h : t.withinCaps tunLog10CapFcc) :
    t.log10N < 0 := by
  obtain ⟨hs, ho, ht, hn, hi, hc, he, hw⟩ := h
  have : sitesLog10Cap = 29 := rfl
  have : tunLog10CapFcc = -84 := rfl
  have : invTauLog10Cap = 30 := rfl
  have : collectiveLog10Cap = 6 := rfl
  have : enhancementLog10Cap = 5 := rfl
  have : windowLog10 = -1 := rfl
  unfold TrappedLogTerms.log10N
  omega

/-- All FCC caps saturated together. -/
def trappedFccAtCaps : TrappedLogTerms :=
  { sites := sitesLog10Cap, occ := 0, tun := tunLog10CapFcc, nuc := 0,
    invTau := invTauLog10Cap, coll := collectiveLog10Cap,
    enh := enhancementLog10Cap, window := windowLog10 }

/-- EQ-RATE-CAP-NC-01 margin: 15 orders of magnitude below closure. -/
theorem trapped_fcc_at_caps_log10 : trappedFccAtCaps.log10N = -15 := by
  decide

/-- Engine-default 25 pm point (`P_occ = f_nuc = C_lin = 1`, `τ = 10⁻²⁰ s`,
    no enhancement), from floors. -/
def trapped25pmEngineDefault : TrappedLogTerms :=
  { sites := sitesLog10Floor, occ := 0, tun := tunLog10Floor25pm, nuc := 0,
    invTau := invTauLog10Default, coll := 0, enh := 0, window := windowLog10 }

theorem trapped_25pm_engine_default_within_caps :
    trapped25pmEngineDefault.withinCaps tunLog10Cap25pm := by
  unfold TrappedLogTerms.withinCaps
  decide

theorem trapped_25pm_engine_default_log10 :
    trapped25pmEngineDefault.log10N = 8 := by
  decide

/-- EQ-RATE-CAP-GAP-01: at the 25 pm TSC trap the engine caps do not certify
    non-closure. A gap in the bound, not closure: the nonnegative scenario
    budget comes from the unconstrained 25 pm separation and `f_nuc = 1`
    (EQ-TRAP-SEP-01 / EQ-TRAP-DEF-01). -/
theorem trapped_25pm_caps_do_not_certify_non_closure :
    ¬ ∀ t : TrappedLogTerms, t.withinCaps tunLog10Cap25pm → t.log10N < 0 := by
  intro h
  have hlt := h trapped25pmEngineDefault trapped_25pm_engine_default_within_caps
  rw [trapped_25pm_engine_default_log10] at hlt
  exact absurd hlt (by decide)

/-- EQ-RATE-CAP-GAP-01 demand: with the other 25 pm terms at their caps, the
    budget is negative once `P_occ · f_nuc · C_lin · E_enh ≤ 10⁻²³`. No lab
    constraint of that size exists; it is the IR `still_missing` input. -/
theorem trapped_25pm_does_not_close_if_free_factors_below
    (t : TrappedLogTerms) (h : t.withinCaps tunLog10Cap25pm)
    (hFree : t.occ + t.nuc + t.coll + t.enh ≤ -23) :
    t.log10N < 0 := by
  obtain ⟨hs, _, ht, _, hi, _, _, hw⟩ := h
  have : sitesLog10Cap = 29 := rfl
  have : tunLog10Cap25pm = -36 := rfl
  have : invTauLog10Cap = 30 := rfl
  have : windowLog10 = -1 := rfl
  unfold TrappedLogTerms.log10N
  omega

/-- `n_p ≤ 10²⁹ m⁻³ × 10³`: host-site cap times the hard-core compression cap
    (EQ-BBL-CR-CAP-01), proton fraction ≤ 1. -/
def protonDensityLog10Cap : Int := 32

/-- `n_e ≤ 10³¹ m⁻³ × 10³`: all 46 Pd electrons (≈3.1×10³⁰ m⁻³) times the
    hard-core compression cap. -/
def electronDensityLog10Cap : Int := 34

/-- `σ(1 MeV) ≤ 10⁻⁴⁷ m²` (EQ-EC-SIGMA-01). -/
def sigmaLog10Cap : Int := -47

/-- Electron speed `v < c < 10⁹ m/s`. -/
def speedLog10Cap : Int := 9

/-- Outside the ULM domain the `p + e⁻ → n + ν` channel factor is at most the
    engine Boltzmann clip `exp(−700) ≈ 10⁻³⁰⁴·⁰⁰⁶`, which exceeds the true
    `exp(−0.782 MeV / kT)` for every `T ≤ 1.29×10⁷ K`. -/
def channelLog10CapNonUlm : Int := -304

/-- Channel ceiling: 1 when ULM `m*/m_e ≥ 2.53` is claimed (SPEC), else the
    Boltzmann clip. -/
def threeBodyChannelLog10Cap (mStarHundredths : Nat) : Int :=
  if 253 ≤ mStarHundredths then 0 else channelLog10CapNonUlm

theorem channel_cap_of_not_ulm {m : Nat}
    (hm : ¬ LenrFormal.NBody.ulmApplicable m) :
    threeBodyChannelLog10Cap m = channelLog10CapNonUlm := by
  unfold LenrFormal.NBody.ulmApplicable at hm
  simp [threeBodyChannelLog10Cap, hm]

/-- Integer log10 terms of the EQ-3B-SEQ-01 three-body event budget. -/
structure ThreeBodyLogTerms where
  np : Int
  ne : Int
  sigma : Int
  speed : Int
  channel : Int
  capture : Int
  eta : Int
  coll : Int
  enh : Int
  window : Int

/-- `log10 N = log10 n_p + log10 n_e + log10 σ + log10 v + log10 channel
    + log10 f_capture + log10 η_conv + log10 C_lin + log10 E_enh + log10 (V t)`. -/
def ThreeBodyLogTerms.log10N (t : ThreeBodyLogTerms) : Int :=
  t.np + t.ne + t.sigma + t.speed + t.channel + t.capture + t.eta + t.coll +
    t.enh + t.window

/-- Engine cap box at mass renormalization `m*/m_e` (hundredths). -/
def ThreeBodyLogTerms.withinCaps (mStarHundredths : Nat) (t : ThreeBodyLogTerms) : Prop :=
  t.np ≤ protonDensityLog10Cap ∧ t.ne ≤ electronDensityLog10Cap ∧
    t.sigma ≤ sigmaLog10Cap ∧ t.speed ≤ speedLog10Cap ∧
    t.channel ≤ threeBodyChannelLog10Cap mStarHundredths ∧ t.capture ≤ 0 ∧
    t.eta ≤ 0 ∧ t.coll ≤ collectiveLog10Cap ∧ t.enh ≤ enhancementLog10Cap ∧
    t.window ≤ windowLog10

/-- EQ-RATE-CAP-NC-02 (DISPROVEN under caps): outside the ULM domain the
    three-body budget is negative even with compression at its hard-core cap
    and every free factor at its cap. -/
theorem three_body_non_ulm_under_caps_does_not_close
    {m : Nat} (hm : ¬ LenrFormal.NBody.ulmApplicable m)
    (t : ThreeBodyLogTerms) (h : t.withinCaps m) :
    t.log10N < 0 := by
  obtain ⟨hp, he, hs, hv, hch, hf, hη, hc, hE, hw⟩ := h
  rw [channel_cap_of_not_ulm hm] at hch
  have : protonDensityLog10Cap = 32 := rfl
  have : electronDensityLog10Cap = 34 := rfl
  have : sigmaLog10Cap = -47 := rfl
  have : speedLog10Cap = 9 := rfl
  have : channelLog10CapNonUlm = -304 := rfl
  have : collectiveLog10Cap = 6 := rfl
  have : enhancementLog10Cap = 5 := rfl
  have : windowLog10 = -1 := rfl
  unfold ThreeBodyLogTerms.log10N
  omega

/-- Engine-default three-body point (CR = 10, `f_p = 0.1`, T = 300 K,
    `m*/m_e = 4`, `η_conv = 10⁻⁶`, `C_lin = 1`), from floors. -/
def threeBodyEngineDefault : ThreeBodyLogTerms :=
  { np := 27, ne := 29, sigma := -48, speed := 4, channel := 0, capture := -1,
    eta := -6, coll := 0, enh := 0, window := windowLog10 }

theorem three_body_engine_default_within_caps :
    threeBodyEngineDefault.withinCaps 400 := by
  unfold ThreeBodyLogTerms.withinCaps
  decide

theorem three_body_engine_default_log10 : threeBodyEngineDefault.log10N = 4 := by
  decide

/-- EQ-RATE-CAP-GAP-01: with the engine-default ULM renormalization
    `m*/m_e = 4` (Widom–Larsen SPEC; Tennfors critique) the caps do not certify
    non-closure. A gap in the bound, not closure. -/
theorem three_body_ulm_caps_do_not_certify_non_closure :
    ¬ ∀ t : ThreeBodyLogTerms, t.withinCaps 400 → t.log10N < 0 := by
  intro h
  have hlt := h threeBodyEngineDefault three_body_engine_default_within_caps
  rw [three_body_engine_default_log10] at hlt
  exact absurd hlt (by decide)

/-- Factor provenance: every trapped-state input is an engine-capped prior. -/
def trappedScenarioFactorKinds : List RateFactorKind := [.scenarioPrior]

/-- Three-body adds the cavitation compression (hydro) to the priors. -/
def threeBodyScenarioFactorKinds : List RateFactorKind :=
  [.hydroEnhancement, .scenarioPrior]

/-- EQ-RATE-CAP-GAP-01 ∘ EQ-BBL-NR-01: the cap gaps stay gaps, and neither
    scenario budget is a nuclear-rate proof. -/
theorem cap_gaps_are_not_nuclear_rate_proofs :
    (¬ ∀ t : TrappedLogTerms, t.withinCaps tunLog10Cap25pm → t.log10N < 0) ∧
      (¬ ∀ t : ThreeBodyLogTerms, t.withinCaps 400 → t.log10N < 0) ∧
      ¬ NuclearRateProof trappedScenarioFactorKinds ∧
      ¬ NuclearRateProof threeBodyScenarioFactorKinds :=
  ⟨trapped_25pm_caps_do_not_certify_non_closure,
    three_body_ulm_caps_do_not_certify_non_closure,
    scenario_prior_does_not_entail_nuclear_rate (List.Mem.head _),
    hydro_enhancement_does_not_entail_nuclear_rate (List.Mem.head _)⟩

end LenrFormal.RateBudget
