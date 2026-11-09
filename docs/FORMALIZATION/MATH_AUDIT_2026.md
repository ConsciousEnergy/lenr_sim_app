# Mathematical Modeling Audit (2026 Formalization Pass)

**Date:** 2026-08-22  
**Scope:** Re-review of adopted mathematics in the Unified LENR Theory paper and companion code toward mechanized consistency (Lean pilot).  
**Inputs:** [CLAIM_TAXONOMY.md](CLAIM_TAXONOMY.md), [TRACEABILITY_MATRIX.md](../REVIEW_2026/TRACEABILITY_MATRIX.md), [LENR_CONSISTENCY_RESOLUTIONS.md](../LENR_CONSISTENCY_RESOLUTIONS.md), paper §2 / §5 / §5A / §7–8, `unified_lenr_model/`, `theory_pipeline.py`, `screening_kernel.py`.

## Verdict

No new internal contradiction requiring a paper numeric correction was found beyond issues already resolved (IL-001 Casimir, IL-002 enhancement band, RR-007 screening ranges). Remaining work is **formalization hygiene**: symbol discipline in the IR, Assenbaum domain enforcement as a theorem, and composition algebra proofs. Open challenges in §5A correctly remain open.

---

## Finding F-01 — Symbol overloading (IL-015)

**Status:** Confirmed in paper glossary (§8): `E`, `n`, `R` overloaded.  
**Action:** IR and Lean use disambiguated names (`E_kin`, `E_field`, `E_eigen`, `n_prin`, `n_dens`, `R_rate`, …) per [CLAIM_TAXONOMY.md](CLAIM_TAXONOMY.md).  
**Paper edit:** Not required for consistency of *values*; glossary cross-ref to formal names added in mechanized-consistency appendix.

## Finding F-02 — Assenbaum domain (RR-007 / §5A.3)

**Claim:** \(f=\exp(\pi\eta U_e/E_{\mathrm{kin}})\) is the Assenbaum–Rolfs screened-cross-section form, valid when \(U_e\ll E_{\mathrm{kin}}\).  
**Paper:** Already states that evaluating at thermal \(E\) with \(U_e\sim 300\)–\(800\,\mathrm{eV}\) is outside the expansion’s validity and motivates the software cap.  
**Code:** `screening_kernel.py` implements the form and caps at `ln(MAX_ENHANCEMENT_FACTOR)`.  
**Formalization:** Prove applicability predicate `assenbaumApplicable (Ue E) := Ue < E` (strict form of ≪ for machine checking); theorem: if `¬ applicable` then the formula is **not claimed**. Do **not** prove a huge thermal enhancement as physical truth.

## Finding F-03 — Enhancement composition algebra

**Code:** `theory_pipeline.py` uses `grouped_max_confidence_product`: within each composition group take `max(enhancement × confidence)`, multiply selected group factors, then `min(·, MAX_ENHANCEMENT_FACTOR)` with `MAX_ENHANCEMENT_FACTOR = 1e5`.  
**Formalization:** Prove (1) intra-group product is forbidden (max only); (2) composed result ≤ \(10^5\).  
**Consistency:** Matches RR composition note in the Traceability Matrix. No paper contradiction.

## Finding F-04 — Q-value / Miles conversion identity

**Nuclear identity:** D+D→⁴He releases \(Q\approx 23.8\,\mathrm{MeV}\) (standard mass defect; `THM`).  
**Conversion:** \(N_{\mathrm{He}} = P_{\mathrm{W}} / Q\) in consistent units ⇒ \(\approx 2.63\times 10^{11}\) atoms/s/W (`THM` of conversion).  
**Miles band:** \(24\pm 4\,\mathrm{MeV}/^4\mathrm{He}\) remains `EMP` (RR-010)—not a Lean theorem of experimental truth.  
**Audit:** Paper §5.2.2 and `MILES_HEAT_HELIUM_RATE` agree within rounding; no correction needed.

## Finding F-05 — Overlap ensemble counting (§2.2)

**Claim:** \(P_{\mathrm{overlap}}\sim 10^{-16}\) (or \(10^{-10}\)–\(10^{-12}\) alternate \(r_0\)); macroscopic products are **upper-bound counting arguments**, not rates.  
**Formalization:** `LenrFormal.Overlap` (`EQ-OVERLAP-01` DEF skeleton + `EQ-OVERLAP-02` AX honesty: ensemble product ≠ nuclear rate). IR `EQ-OVERLAP-01.yaml` / `EQ-OVERLAP-02.yaml`. Does **not** discharge `EQ-OPEN-*`.  
**Paper:** Already correctly worded; no edit.

## Finding F-06 — Open problems stay open

| ID | Topic | Tag |
|----|-------|-----|
| EQ-OPEN-MEV-01 | MeV gap | `OPEN` |
| EQ-OPEN-RAD-01 | Radiation suppression | `OPEN` |
| EQ-OPEN-RATE-01 | Rate closure | `OPEN` |
| EQ-OPEN-EC-01 | Electron-capture energy source | `OPEN` |
| EQ-OPEN-YIELD-01 | Integrated yield discrepancy | `OPEN` |

SPEC mechanisms (Hagelstein, KG–RP, TSC) remain claim-tiered speculative; Lean must not close these via axioms disguised as theorems.

## Finding F-07 — Casimir check geometry

**Adopted:** \(F=-\pi^2\hbar c A/(240 d^4)\) at \(A=1\,\mu\mathrm{m}^2\), \(d=1\,\mathrm{nm}\) ⇒ \(\lvert F\rvert\approx 1.3\,\mathrm{mN}\) (IL-001, Wolfram PASS).  
**Code note:** Production Casimir theory uses configurable area/separation and Lifshitz correction; the **canonical check geometry** is the paper/governance band, verified independently. Formal Lean proof targets the ideal parallel-plate identity at that geometry.

## Finding F-08 — Two-body baseline governance (RR-006)

`two_body` remains the default validated-tier *reference baseline*; `trapped_state` is a separate speculative mode. Formalization records this as `AX`/`EQ-BASE-2B-01`, not a physics theorem.

## Paper edits from this audit

- **Numeric corrections:** none (superseded values already purged).  
- **Documentation:** new appendix “Mechanized consistency (Lean)” + `FORMAL_PROOF_STATUS.md` (Phase 5).

## Relation to prior RR / IL IDs

| Finding | Prior ID |
|---------|----------|
| F-01 | IL-015 |
| F-02 | RR-007, §5A.3 |
| F-03 | Traceability composition audit |
| F-04 | RR-010 |
| F-05 | IL-003 |
| F-07 | IL-001 / RR-003 |
| F-08 | RR-006 |
