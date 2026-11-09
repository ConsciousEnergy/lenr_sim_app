/-!
Decision — EQ-UQ-PRIOR-01 / EQ-UQ-BF-01 (definitions + algebraic identities).

Skeptical default priors for Oracle B. Not a theorem that LENR occurs.
No `theorem lenr_occurs`. Algebraic Bayes-factor identities are Int/Nat
bookkeeping under stated defs — they do not flip EQ-OPEN-* or set
`lenr_proved`.
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

/-- Homomorphism hypothesis for the numerical `expApprox` model input.
    Mirrors `math.exp(a+b) = math.exp(a)*math.exp(b)` used by Oracle B. -/
def ExpHom (expApprox : Int → Nat) : Prop :=
  ∀ a b : Int, expApprox (a + b) = expApprox a * expApprox b

theorem approx_bayes_factor_self_consistent
    (expApprox : Int → Nat)
    (logEvidence : Int) :
    approxBayesFactor expApprox logEvidence logEvidence = expApprox 0 := by
  simp [approxBayesFactor, logBayesFactor]

/-- Algebraic identity: self log-Bayes factor is zero (not an empirical prior). -/
theorem log_bayes_factor_self_zero (logEvidence : Int) :
    logBayesFactor logEvidence logEvidence = 0 := by
  simp [logBayesFactor]

/-- Algebraic antisymmetry of the log-evidence difference. -/
theorem log_bayes_factor_antisymm (logEvidenceI logEvidenceJ : Int) :
    logBayesFactor logEvidenceI logEvidenceJ
      = -logBayesFactor logEvidenceJ logEvidenceI := by
  simp [logBayesFactor]
  omega

/-- Algebraic telescoping / cocycle identity for three log-evidence inputs. -/
theorem log_bayes_factor_cocycle
    (logEvidenceI logEvidenceJ logEvidenceK : Int) :
    logBayesFactor logEvidenceI logEvidenceJ
      + logBayesFactor logEvidenceJ logEvidenceK
      = logBayesFactor logEvidenceI logEvidenceK := by
  simp [logBayesFactor]
  omega

/-- Multiplicative cocycle for approx Bayes factors under an ExpHom model. -/
theorem approx_bayes_factor_multiplicative_cocycle
    (expApprox : Int → Nat)
    (h : ExpHom expApprox)
    (logEvidenceI logEvidenceJ logEvidenceK : Int) :
    approxBayesFactor expApprox logEvidenceI logEvidenceJ
      * approxBayesFactor expApprox logEvidenceJ logEvidenceK
      = approxBayesFactor expApprox logEvidenceI logEvidenceK := by
  simp only [approxBayesFactor]
  have hlog :=
    log_bayes_factor_cocycle logEvidenceI logEvidenceJ logEvidenceK
  have hmul :=
    (h (logBayesFactor logEvidenceI logEvidenceJ)
      (logBayesFactor logEvidenceJ logEvidenceK)).symm
  calc
    expApprox (logBayesFactor logEvidenceI logEvidenceJ)
        * expApprox (logBayesFactor logEvidenceJ logEvidenceK)
        = expApprox
            (logBayesFactor logEvidenceI logEvidenceJ
              + logBayesFactor logEvidenceJ logEvidenceK) := hmul
    _ = expApprox (logBayesFactor logEvidenceI logEvidenceK) := by
          rw [hlog]

/-- Reciprocal identity: BF(i,j)·BF(j,i) = expApprox(0) under ExpHom. -/
theorem approx_bayes_factor_reciprocal
    (expApprox : Int → Nat)
    (h : ExpHom expApprox)
    (logEvidenceI logEvidenceJ : Int) :
    approxBayesFactor expApprox logEvidenceI logEvidenceJ
      * approxBayesFactor expApprox logEvidenceJ logEvidenceI
      = expApprox 0 := by
  have hcycle :=
    approx_bayes_factor_multiplicative_cocycle
      expApprox h logEvidenceI logEvidenceJ logEvidenceI
  simpa [approx_bayes_factor_self_consistent] using hcycle

/-- Swap identity: BF(i,j) equals BF of the negated log-difference. -/
theorem approx_bayes_factor_swap
    (expApprox : Int → Nat)
    (logEvidenceI logEvidenceJ : Int) :
    approxBayesFactor expApprox logEvidenceI logEvidenceJ
      = expApprox (-logBayesFactor logEvidenceJ logEvidenceI) := by
  -- Unfold and reduce via antisymmetry; `-(-(a-b)) = a-b` on Int.
  change
    expApprox (logBayesFactor logEvidenceI logEvidenceJ)
      = expApprox (-logBayesFactor logEvidenceJ logEvidenceI)
  have hanti := log_bayes_factor_antisymm logEvidenceI logEvidenceJ
  -- hanti: logBayesFactor I J = -logBayesFactor J I
  simp [hanti]

end LenrFormal.Decision
