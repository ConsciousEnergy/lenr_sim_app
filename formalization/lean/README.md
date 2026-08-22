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
| `Composition` | EQ-COMP-* | Cap ≤ 1e5; intra-group max |
| `Miles` | EQ-QDD/MILES-CONV | Conversion identity band |
| `RealShim` | — | `expZ` mono bridge axiom |

## Hygiene

- File headers state claim-tier / non-claims.
- Speculative physics (MeV gap, TSC, Hagelstein, KG–RP) is out of scope.
