# LenrFormal (Lean 4 pilot)

Mechanized **mathematical consistency** checks for the Unified LENR Theory
adopted core. This is **not** a proof that LENR occurs.

## Design note (mathlib)

The pilot builds on Lean 4 **without** a mathlib dependency so CI stays light
and deterministic. Algebra uses `Nat`/`Int` with explicit unit scales; Gamow
monotonicity uses a labelled `RealShim.expZ_strict_mono` bridge axiom. Upgrading
to mathlib replaces `RealShim` with `Real.exp` lemmas and can restore ℚ/`Real`
Casimir κ proofs.

## Build

```bash
# requires elan + Lean 4.14 (see lean-toolchain)
cd formalization/lean
lake build
```

## Modules

| Module | IR IDs | Role |
|--------|--------|------|
| `Constants` | — | Integer anchors / caps |
| `Rydberg` | EQ-RYD-01 | \(E_{10}=-136\,\mathrm{meV}\) |
| `Field` | EQ-FIELD-01 | \(E=\Delta V/d\) example |
| `Casimir` | EQ-CAS-01/02 | Check geometry + 1.3 mN band |
| `Gamow` | EQ-GAMOW-01 | Penetration anti-monotone in η |
| `Assenbaum` | EQ-ASSEN-* | Domain predicate |
| `Composition` | EQ-COMP-*, EQ-BBL-COMP-01, EQ-PRED-* | Cap ≤ 1e5; intra-group max; bubble prediction envelope |
| `Miles` | EQ-QDD/MILES-CONV | Conversion identity band |
| `Phonon` | EQ-PHONON-N-01, EQ-NAIVE-GN-01 | Phonon order identity; naive \(g^N\) fails |
| `RateBudget` | EQ-RATE-* | Two-body does-not-close; rival modes |
| `NBody` | EQ-TSC-*, EQ-TRAP-*, EQ-3B-*, EQ-NBODY-* | Geometry, FGR/trap bookkeeping (volumetric + linear collective), ULM domain |
| `Overlap` | EQ-OVERLAP-01, EQ-OVERLAP-02 | Halo overlap \((r_0/a)^3\) DEF; ensemble count ≠ nuclear rate |
| `ScaleQED` | EQ-SCALE-MHD-DOM-01, EQ-QED-HE-NEG-01 | MHD domain; HE ≈ 1 |
| `Decision` | EQ-UQ-PRIOR-01, EQ-UQ-BF-01 | Skeptical priors; Bayes-factor bookkeeping |
| `WhenHow` / `Branching` | EQ-WHEN-*, EQ-MECH-PATH-01, EQ-BRANCH-* | Threshold/duty/path definitions |
| `CollapseBounds` | EQ-BBL-LIM-01, EQ-BBL-BOUND-01, EQ-BBL-UQ-01, EQ-BBL-RP-DOM-01, EQ-BBL-CR-CAP-01 | Pointwise clamp; literature ceilings; UQ defs; RP/KM domain; CR hard-core cap |
| `PoissonSchrodinger` | EQ-PS-01, EQ-PS-POISSON-01, EQ-PS-SCHROD-01, EQ-PS-COUPLE-01, EQ-PS-DOM-01, EQ-PS-TOL-01, EQ-PS-NONDEPLOY-01 | Continuum PS DEF parent + discrete residual / domain / tolerance / non-deployment honesty (`ENG-ASPIRATIONAL-FEM-01`); **not** continuum FEM proof |

| `OpenObligations` | EQ-OPEN-* | Undischarged Q1–Q5 predicates; non-closure implications only |
| `WorkingHypothesis` | EQ-WH-* | Coupled WH-ENP-01 identities; remainders; non-closure |
| `WorkingHypothesisBounds` | EQ-WH-FC-01, EQ-WH-PART-02, EQ-WH-DICKE-N-01, EQ-WH-CAP-01, EQ-WH-NONCLOSE-02 | WH-ENP-01 v2 bounds: Poisson multi-phonon tail, general partition, Dicke count, engine-cap product; v2 non-closure |
| `RealShim` | — | `expZ` mono bridge axiom |

## Hygiene

- File headers state claim-tier / non-claims.
- Speculative physics (MeV gap, TSC, Hagelstein, KG–RP) remains claim-tiered and unproved.
- There is no `theorem lenr_occurs`. `EQ-OPEN-*` rows stay open.
