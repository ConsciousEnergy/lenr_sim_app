# Formal Proof Status — Unified LENR Theory

**Updated:** 2026-08-22  
**Epistemic scope:** Lean certifies *mathematical consistency* of tagged claims under stated definitions and axioms. It does **not** prove that LENR occurs in nature, that contested experiments are correct, or that §5A open challenges are solved.

## Oracle stack (siblings, not substitutes)

| Oracle | Role |
|--------|------|
| Lean `lake build` | Symbolic / proof gate for `THM` subset |
| Wolfram log (`PHYSICS_EQUATION_VERIFICATION.md`) | Numeric float oracle |
| Pytest experiment-anchored gates | Empirical falsifiers |
| Equation IR (`formalization/ir/`) | Shared machine-readable front-end |

## Pilot theorems (proved)

| ID | Statement (short) | Lean module | Status |
|----|-------------------|-------------|--------|
| EQ-RYD-01 | \(E_{10}=-136\,\mathrm{meV}\) with \(E_0=13.6\,\mathrm{eV}\) | `Rydberg` | **PROVED** |
| EQ-FIELD-01 | Double-layer \(E=\Delta V/d\) example identity | `Field` | **PROVED** |
| EQ-CAS-01/02 | Check geometry exponent \(10^{24}\); \|F\| band around 1.3 mN | `Casimir` | **PROVED** |
| EQ-GAMOW-01 | Penetration strictly anti-monotone in η | `Gamow` (+ `RealShim` bridge) | **PROVED** |
| EQ-ASSEN-DOM-01 | Outside \(U_e < E_{\mathrm{kin}}\) formula not claimed | `Assenbaum` | **PROVED** |
| EQ-COMP-01 | Composed enhancement ≤ \(10^5\) | `Composition` | **PROVED** |
| EQ-COMP-02 | Intra-group selection is max, not product of rivals | `Composition` | **PROVED** |
| EQ-QDD-01 | Adopted Q = 23.8 MeV (keV scale lock) | `Miles` | **PROVED** |
| EQ-MILES-CONV-01 | Conversion / code rate in governance band | `Miles` | **PROVED** |

## Axioms / hypotheses (not theorems of nature)

| ID | Note |
|----|------|
| EQ-TUN-BAND-01 | Enhancement band / cap is a **model assumption** (RR-001) |
| EQ-MILES-EMP-01 | Miles heat–helium correlation remains `EMP` |
| `RealShim.expZ_strict_mono` | Analysis bridge until mathlib upgrade |

## Open obligations (unchanged)

| ID | Topic |
|----|-------|
| EQ-OPEN-MEV-01 | MeV energy gap |
| EQ-OPEN-RAD-01 | Radiation suppression |
| EQ-OPEN-RATE-01 | Rate closure |
| EQ-OPEN-EC-01 | Electron-capture energy source |
| EQ-OPEN-YIELD-01 | Integrated yield discrepancy |

SPEC mechanisms (TSC, Hagelstein, KG–RP, Widom–Larsen mass renormalization) remain claim-tiered speculative modules — not Lean theorems.

## How to reproduce

```bash
python formalization/scripts/check_ir.py
python formalization/scripts/diff_code_literals.py
cd formalization/lean && lake build
```

## Related docs

- [CLAIM_TAXONOMY.md](CLAIM_TAXONOMY.md)
- [MATH_AUDIT_2026.md](MATH_AUDIT_2026.md)
- [TRACEABILITY_MATRIX.md](../REVIEW_2026/TRACEABILITY_MATRIX.md)
- Paper appendix: mechanized consistency (Lean) in `A_Unified_Theoretical_Framework_for_LENR.md`
