import LenrFormal.Rydberg
import LenrFormal.Field
import LenrFormal.Casimir
import LenrFormal.Gamow
import LenrFormal.Assenbaum
import LenrFormal.Composition
import LenrFormal.CollapseBounds
import LenrFormal.Decision
import LenrFormal.WeightHonesty
import LenrFormal.Miles
import LenrFormal.CalorimetrySignificance
import LenrFormal.TheoryStubHonesty
import LenrFormal.Phonon
import LenrFormal.RateBudget
import LenrFormal.NBody
import LenrFormal.Overlap
import LenrFormal.ScaleQED
import LenrFormal.PoissonSchrodinger
import LenrFormal.WeakInteraction
import LenrFormal.WorkingHypothesis
import LenrFormal.WorkingHypothesisBounds
import LenrFormal.OpenObligations
import LenrFormal.OpenQuestionBounds
import LenrFormal.MeVRemainderCaps
import LenrFormal.RadiationBounds
import LenrFormal.YieldAccounting

/-!
# PaperCrosswalk — Unified Theory Paper § → Lean module map (v0.3.7-beta)

Archival companion to
`docs/A_Unified_Theoretical_Framework_for_LENR.md`
and `LENR_SIM_APP_v2/docs/v0.3.7-beta/paper/`.

**Claim tier:** mathematical consistency / non-closure / bound documentation only.
Does **not** prove that LENR occurs. Does **not** discharge any `EQ-OPEN-*`.
There is no `theorem lenr_occurs`. Hydro enhancement ≠ nuclear-rate proof (`EQ-BBL-NR-01`).
-/

namespace LenrFormal.PaperCrosswalk

/-- Paper revision tag for this crosswalk. -/
def paperRevision : String := "v0.3.7-beta-2026-11-11-eq-open-peer-review"

/-- Companion manuscript path (repo-relative). -/
def canonicalPaperPath : String :=
  "docs/A_Unified_Theoretical_Framework_for_LENR.md"

/-- Multi-format pack directory (repo-relative). -/
def paperPackPath : String :=
  "LENR_SIM_APP_v2/docs/v0.3.7-beta/paper"

/-- Hard invariant: nature proof token stays false. -/
def lenrProved : Bool := false

/-- Five open obligations named in the paper §5A / proof matrix. -/
def openObligationIds : List String :=
  ["EQ-OPEN-MEV-01", "EQ-OPEN-RAD-01", "EQ-OPEN-RATE-01",
   "EQ-OPEN-EC-01", "EQ-OPEN-YIELD-01"]

/-- Section → primary Lean module name (documentation strings). -/
def sectionModuleMap : List (String × String) :=
  [ ("§2.1 Rydberg (speculative / exploratory)", "LenrFormal.Rydberg")
  , ("§2.2 Overlap / ensemble count (modelled)", "LenrFormal.Overlap")
  , ("§2.3 Field / double-layer QED (speculative)", "LenrFormal.Field")
  , ("§2.4 weak / Fermi G_F / σ / Boltzmann EC bounds", "LenrFormal.WeakInteraction")
  , ("§2.5 Casimir", "LenrFormal.Casimir")
  , ("§2.8 / Gamow tunneling", "LenrFormal.Gamow")
  , ("§2.8 Assenbaum domain", "LenrFormal.Assenbaum")
  , ("§2.8 Composition cap 1e5", "LenrFormal.Composition")
  , ("§3.1 / ENG-ASPIRATIONAL-FEM-01 continuum PS DEF (EQ-PS-01)", "LenrFormal.PoissonSchrodinger")
  , ("§3.1 / ENG-ASPIRATIONAL-FEM-01 Poisson–Schrödinger residuals", "LenrFormal.PoissonSchrodinger")
  , ("§3.1 tolerance axiom EQ-PS-TOL-01", "LenrFormal.PoissonSchrodinger")
  , ("§3.1 aspirational non-deployment honesty", "LenrFormal.PoissonSchrodinger")
  , ("§3.2 / ENG-BUBBLE-FUSION-01 collapse clamps (modelled / contested hydro)", "LenrFormal.CollapseBounds")
  , ("§3.2 collapse UQ percentiles (DEF)", "LenrFormal.CollapseBounds")
  , ("§3.2 / ENG-RP-KM-01 RP domain lemmas", "LenrFormal.CollapseBounds")
  , ("§3.2 hard-core compression cap (DEF)", "LenrFormal.CollapseBounds")
  , ("§3.2 hydro enhancement ≠ nuclear-rate proof (EQ-BBL-NR-01)", "LenrFormal.CollapseBounds")
  , ("§3.2 / §5B collapse UQ / planned DAQ sample-v1 ≠ cite-gated ≥5σ heat MoE (EQ-BBL-HEAT-NC-01 / BDS-384)", "LenrFormal.CollapseBounds")
  , ("Oracle B / EQ-UQ-BF-01 algebraic BF + ExpHom cocycle", "LenrFormal.Decision")
  , ("Theory weights / EQ-WT-TIER-01 + EQ-WT-SCENARIO-01 (Approximate; ≠ lab posterior)", "LenrFormal.WeightHonesty")

  , ("§5.1 Miles Q-value", "LenrFormal.Miles")
  , ("§5.2 reported nuclear-product correlations (contested EMP)", "LenrFormal.Miles")
  , ("§5B / BDS-302 ≥5σ heat bar + EQ-HEAT-SIG-NC-01 (citations/pairing/YIELD NC)", "LenrFormal.CalorimetrySignificance")
  , ("§2 / ENG-SANTILLI-ICNF-01 stub ⇏ EQ-OPEN (EQ-THEORY-STUB-NC-01)", "LenrFormal.TheoryStubHonesty")
  , ("§5A / phonon order", "LenrFormal.Phonon")
  , ("§5A.1 Q1 MeV remainder caps (EQ-WH-MEV-CAP-01; BOUNDED, OPEN)", "LenrFormal.MeVRemainderCaps")
  , ("§5A.1 WH / phonon→nuclear channel ⇏ constrained |M|² (EQ-MEV-MATRIX-NC-01 / BDS-396)", "LenrFormal.WorkingHypothesis")
  , ("§5A.1 named WH labels ⇏ Q1 (EQ-MEV-LABEL-NC-01)", "LenrFormal.OpenQuestionBounds")
  , ("§5A.2 harmonic / FC class bound + detector-UL DEF (EQ-WH-FC-02; harmonic_dos_non_closure)", "LenrFormal.RadiationBounds")
  , ("§5A.2 CR-39 / track-etch ⇏ γ-suppression proof (EQ-RAD-CR39-NC-01 / BDS-394)", "LenrFormal.RadiationBounds")
  , ("§5A.2 bare UL without efficiency ⇏ Q2 (EQ-RAD-EFF-NC-01)", "LenrFormal.RadiationBounds")
  , ("§5A.2 bare UL without coincidence ⇏ γ BR (EQ-RAD-COINC-NC-01 / BDS-398)", "LenrFormal.RadiationBounds")
  , ("§5A Q3 rate budget", "LenrFormal.RateBudget")
  , ("§5A.3 Q3 scenario cap bounds / gaps (EQ-RATE-CAP-*)", "LenrFormal.RateBudget")
  , ("§5A.3 planned DAQ occupancy ⇏ Q3 (EQ-RATE-DAQ-OCC-NC-01)", "LenrFormal.RateBudget")
  , ("§5A.3 witness-only DAQ/collective ⇏ free-cap RATE (EQ-RATE-WITNESS-NC-01 / BDS-399)", "LenrFormal.RateBudget")
  , ("§5A.4 Q4 EC CM-budget bounds (EQ-OPEN-EC-BOUND-01; BOUNDED / form-DISPROVEN)", "LenrFormal.WeakInteraction")
  , ("§5A.4 UI cosmetics / unlicensed mass-renorm ⇏ measured Eₑ (EQ-EC-ENERGY-NC-01 / BDS-397)", "LenrFormal.WeakInteraction")
  , ("§5A.5 Q5 instantaneous ≠ integrated (EQ-OPEN-YIELD-NC-01)", "LenrFormal.OpenQuestionBounds")
  , ("§5A.5 Miles EMP ~2× ⇏ integrated yield discharge (EQ-YIELD-MILES-EMP-NC-01 / BDS-395)", "LenrFormal.OpenQuestionBounds")
  , ("§5A.5 expected-yield duty bookkeeping (EQ-YIELD-ACCT-01)", "LenrFormal.YieldAccounting")
  , ("§5A.5 efficiency provenance ⇏ Q5 (EQ-YIELD-EFF-NC-01)", "LenrFormal.YieldAccounting")
  , ("§5A n-body / TSC geometry / FGR bookkeeping", "LenrFormal.NBody")
  , ("§5A HE negative control", "LenrFormal.ScaleQED")
  , ("§5A WH-ENP-01", "LenrFormal.WorkingHypothesis")
  , ("§5A WH-ENP-01 v2 bounds", "LenrFormal.WorkingHypothesisBounds")
  , ("§5A OPEN obligations", "LenrFormal.OpenObligations")
  , ("§6.1 would-close-if", "LenrFormal.OpenQuestionBounds")
  ]

/-- Sanity: crosswalk records exactly five OPEN IDs. -/
theorem open_obligation_count : openObligationIds.length = 5 := by
  native_decide

/-- Sanity: nature-proof flag stays false in this archival module. -/
theorem lenr_proved_false : lenrProved = false := rfl

/-- Sanity: paper revision tag is non-empty. -/
theorem paper_revision_nonempty : paperRevision.length > 0 := by
  native_decide

end LenrFormal.PaperCrosswalk
