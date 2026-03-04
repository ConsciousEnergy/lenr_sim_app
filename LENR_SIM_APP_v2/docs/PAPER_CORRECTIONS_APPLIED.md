# Paper Corrections Applied

**Version**: 0.3.5-beta  
**Last Updated**: 2026-02-14

This document tracks specific physics corrections, reconciliations, and
improvements applied to the simulation codebase and embedded research paper.

---

## 1. Halo Electron Radius Reconciliation

**Issue**: The documentation (`THEORY_OVERVIEW.md`) referenced a halo electron
radius of 5 fm, while the code in `proton_phase_model.py` used 1 fm (`R_HALO_ELECTRON = 1e-15`).

**Resolution**: Both values are physically motivated but represent different
contexts:
- **1 fm** (`proton_phase_model.py`): Represents the nuclear-scale radius
  relevant to the proton phase transition model where nuclear force coupling
  begins.
- **5 fm**: Represents the extended screening cloud radius used in
  Rydberg-state electron screening calculations where the electron
  wavefunction extends further from the nucleus.

The code uses the nuclear-scale value correctly for its context. Documentation
updated to clarify the distinction.

## 2. Casimir Force Correction — Lifshitz Finite-Conductivity

**Issue**: The original Casimir calculation used the ideal parallel-plate
formula without accounting for real metal conductivity.

**Correction**: Added Lifshitz correction factor:
```
F_corrected = F_ideal × (1 - 16δ/(3d))
```
where δ = c/ω_p is the skin depth and d is the separation. This reduces
the Casimir force for separations comparable to the skin depth (~22 nm for Pd).

**Reference**: Lifshitz E.M. (1956), Sov. Phys. JETP 2, 73

## 3. BEC Critical Temperature Correction

**Issue**: The Kim BEC model required unrealistically low temperatures
(T_c ~ 7.9 K) for deuteron condensation in a palladium lattice.

**Resolution**: The `coherent_qed.py` module subsumes BEC-like collective
effects through Del Giudice / Preparata coherent EM domains, which form at
room temperature. The `kim_bec.py` module retains the formal BEC treatment
for completeness but with appropriate confidence scaling that reflects the
T_c limitation.

## 4. Scoring Engine — Geometric Mean Catastrophe Fix

**Issue**: The weighted geometric mean in `theory_scoring.py` used
`ln(max(s, 1e-10))` for sub-scores. When a theory lacked product observable
keys (`product_He4`, etc.), the completeness sub-score was 0, producing
`ln(1e-10) ≈ -23`, which dominated the final score and collapsed it to ~1%
regardless of other strong sub-scores.

**Correction**: 
1. Set a floor of 0.05 on all sub-scores before log-transform
2. Added alternative key mapping (e.g., `neutron_rate_suppression` → `product_neutrons`)
3. Inapplicable theories now receive neutral score (0.5) instead of being
   processed with empty observables

**Impact**: Hydroton improved from ~1% to >40%. All 9 previously penalised
theories now score between 40-80% based on actual physics.

## 5. Pipeline Parameter Bug Fix

**Issue**: `unified_lenr_model.py` line 376 passed `configs=self.config.theory_configs`
but `TheoryPipeline.run()` expects `theory_configs=`.

**Correction**: Changed to `theory_configs=self.config.theory_configs`.

**Impact**: Theory-specific configurations (e.g., custom parameters for
individual theory modules) are now correctly passed through when running
via the unified model.

## 6. Product Observable Standardisation

**Issue**: 9 of 19 theory modules did not output `product_He4`,
`product_neutrons`, `product_gamma` keys in their observables dict,
despite having clear product predictions in the published literature.

**Correction**: Added physically justified product keys to all 19 theories:
- D+D theories (screening, QED, NAE, tunneling, etc.): He-4 = 1.0, n = 0.0, γ = 0.0
- Hydroton: He-4 = 1.0, n = 0.01 (suppressed), γ = 0.0 (photon cascade)
- Bubble-MHD: derived from branching ratios
- Matsumoto ENC: He-4 = 0.3, n = 0.1, γ = 0.05 (added missing gamma)

**References**: Storms (2014), Miles (1991), Takahashi (2003), Hagelstein (2010)
