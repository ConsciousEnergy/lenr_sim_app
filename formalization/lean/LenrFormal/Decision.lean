/-!
Decision — EQ-UQ-PRIOR-01 / EQ-UQ-BF-01 (definitions only).

Skeptical default priors for Oracle B. Not a theorem that LENR occurs.
No `theorem lenr_occurs`.
-/

namespace LenrFormal.Decision

/-- Priors in percent: chemical_null 35, two_body 50, trapped 10, three_body 5. -/
def priorNullPct : Nat := 35
def priorTwoBodyPct : Nat := 50
def priorTrapPct : Nat := 10
def priorThreeBodyPct : Nat := 5

theorem priors_sum_to_100 :
    priorNullPct + priorTwoBodyPct + priorTrapPct + priorThreeBodyPct = 100 := by
  native_decide

/-- Two-body is the default reference, not a nature theorem. -/
theorem two_body_is_largest_prior : priorTrapPct < priorTwoBodyPct := by
  native_decide

/-- Log-evidence difference used by the EQ-UQ-BF-01 toy decision model. -/
def logBayesFactor (logEvidenceI logEvidenceJ : Int) : Int :=
  logEvidenceI - logEvidenceJ

/-- EQ-UQ-BF-01. `expApprox` is an explicit numerical-model input.
    This definition supplies odds bookkeeping and does not close open questions. -/
def approxBayesFactor
    (expApprox : Int → Nat)
    (logEvidenceI logEvidenceJ : Int) :
    Nat :=
  expApprox (logBayesFactor logEvidenceI logEvidenceJ)

theorem approx_bayes_factor_self_consistent
    (expApprox : Int → Nat)
    (logEvidence : Int) :
    approxBayesFactor expApprox logEvidence logEvidence = expApprox 0 := by
  simp [approxBayesFactor, logBayesFactor]

end LenrFormal.Decision
