import LenrFormal.Rydberg
import LenrFormal.Field
import LenrFormal.Casimir
import LenrFormal.Gamow
import LenrFormal.Assenbaum
import LenrFormal.Composition
import LenrFormal.CollapseBounds
import LenrFormal.Decision
import LenrFormal.Miles
import LenrFormal.Phonon
import LenrFormal.RateBudget
import LenrFormal.NBody
import LenrFormal.ScaleQED
import LenrFormal.PoissonSchrodinger
import LenrFormal.WeakInteraction
import LenrFormal.WorkingHypothesis
import LenrFormal.WorkingHypothesisBounds
import LenrFormal.OpenObligations
import LenrFormal.OpenQuestionBounds

/-!
# PaperCrosswalk — Unified Theory Paper § → Lean module map (v0.3.7-beta)

Archival companion to
`docs/A_Unified_Theoretical_Framework_for_LENR.md`
and `LENR_SIM_APP_v2/docs/v0.3.7-beta/paper/`.

**Claim tier:** mathematical consistency / non-closure documentation only.
Does **not** prove that LENR occurs. Does **not** discharge any `EQ-OPEN-*`.
There is no `theorem lenr_occurs`.
-/

namespace LenrFormal.PaperCrosswalk

/-- Paper revision tag for this crosswalk. -/
def paperRevision : String := "v0.3.7-beta-2026-09-25"

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
  [ ("§2.1 Rydberg", "LenrFormal.Rydberg")
  , ("§2.4 Field / double-layer", "LenrFormal.Field")
  , ("§2.4 weak / Fermi G_F / σ / Boltzmann EC bounds", "LenrFormal.WeakInteraction")
  , ("§2.5 Casimir", "LenrFormal.Casimir")
  , ("§2.8 / Gamow tunneling", "LenrFormal.Gamow")
  , ("§2.8 Assenbaum domain", "LenrFormal.Assenbaum")
  , ("§2.8 Composition cap 1e5", "LenrFormal.Composition")
  , ("§3.1 / ENG-ASPIRATIONAL-FEM-01 Poisson–Schrödinger residuals", "LenrFormal.PoissonSchrodinger")
  , ("§3.1 aspirational non-deployment honesty", "LenrFormal.PoissonSchrodinger")
  , ("§3.2 / ENG-BUBBLE-FUSION-01 collapse clamps", "LenrFormal.CollapseBounds")
  , ("§3.2 collapse UQ percentiles (DEF)", "LenrFormal.CollapseBounds")
  , ("Oracle B / EQ-UQ-BF-01 algebraic BF", "LenrFormal.Decision")
  , ("§5.1 Miles Q-value", "LenrFormal.Miles")
  , ("§5A / phonon order", "LenrFormal.Phonon")
  , ("§5A Q3 rate budget", "LenrFormal.RateBudget")
  , ("§5A n-body / TSC geometry", "LenrFormal.NBody")
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
