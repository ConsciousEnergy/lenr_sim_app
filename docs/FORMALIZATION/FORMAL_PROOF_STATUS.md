# Formal Proof Status — Unified LENR Theory

**Updated:** 2026-11-11  
**Epistemic scope:** Lean certifies *mathematical consistency* of tagged claims under stated definitions and axioms. It does **not** prove that LENR occurs in nature, that contested experiments are correct, or that §5A open challenges are solved. `lenr_proved` stays **false**; no `EQ-OPEN-*` closures in this pass.

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
| EQ-PHONON-N-01 | \(N=Q/(\hbar\omega)\) for 23.8 MeV / 50 meV | `Phonon` | **PROVED** |
| EQ-NAIVE-GN-01 | Nat-floor of \((1/2)^n=0\) for \(n\ge 1\) | `Phonon` | **PROVED** |
| EQ-RATE-2B-NC-01 | Two-body \(\log_{10}N_{\mathrm{events}}=-40<0\) | `RateBudget` | **PROVED** |
| EQ-RATE-COND-01 | Occupation/fusion would-close-if product bound | `RateBudget` | **PROVED** |
| EQ-RATE-REPLACE-01 | Rival rate modes: max, not product | `RateBudget` | **PROVED** |
| EQ-RATE-CAP-NC-01 | FCC-lattice D–D `trapped_state`, all engine caps: \(\log_{10}N\le-15<0\) ⇒ ¬Q3 | `RateBudget` / `OpenObligations` | **PROVED** (scenario / cap bound; DISPROVEN under caps; does **not** close Q3) |
| EQ-RATE-CAP-NC-02 | Non-ULM `three_body`, all engine caps: \(\log_{10}N\le-266<0\) ⇒ ¬Q3 | `RateBudget` / `OpenObligations` | **PROVED** (scenario / cap bound; DISPROVEN under caps; does **not** close Q3) |
| EQ-RATE-CAP-GAP-01 | Caps do **not** certify non-closure for 25 pm TSC / ULM `three_body`; demand \(P_{\text{occ}}f_{\text{nuc}}C_{\text{lin}}E_{\text{enh}}\le10^{-23}\) | `RateBudget` | **PROVED** (honesty gap; not closure) |
| EQ-BBL-NR-01 | Hydro / collapse enhancement or scenario prior in a rate scenario ⇒ not a nuclear-rate proof | `CollapseBounds` | **AX** honesty tag (does **not** close any `EQ-OPEN-*`) |
| EQ-COMP-03 | Illegal product of two capped engine totals \(=10^{10}\) | `Composition` | **PROVED** |
| EQ-TSC-GEOM-01/02 | FCC \(d_{DD}\) identity; \(\neq 25\,\mathrm{pm}\) trap | `NBody` | **PROVED** |
| EQ-TSC-Q-01 | \(47.6=2\times 23.8\) keV conversion | `NBody` | **PROVED** |
| EQ-TSC-CH-01 | Two-alpha final state ⇒ no primary \(\gamma\) required | `NBody` | **PROVED** (kinematics only) |
| EQ-COLL-LIN-01 | \(C=\min(N,10^6)\le 10^6\) | `NBody` | **PROVED** |
| EQ-3B-MASS-DOM-01 | ULM claimed only if \(m^*/m_e\ge 2.53\) | `NBody` | **PROVED** (domain) |
| EQ-SCALE-MHD-DOM-01 | MHD formulas not claimed at nuclear fm | `ScaleQED` | **PROVED** |
| EQ-QED-HE-NEG-01 | Heisenberg–Euler milli-unit identity \(\equiv 1\) | `ScaleQED` | **PROVED** |
| EQ-BBL-COMP-01 | Intra-group max of per-mechanism clamps; groups multiply | `Composition` | **PROVED** (algebra) |
| EQ-BBL-RP-DOM-01 | RP domain \(\mathrm{Ma}<0.3\); KM preferred otherwise; RP claim needs mode∧domain | `CollapseBounds` | **PROVED** (domain; **not** dynamics / LENR) |
| EQ-PRED-01 | Three-tier bubble prediction envelope | `Composition` | **DEF** mechanized |
| EQ-UQ-BF-01 | Approximate Bayes factor from log-evidence difference; algebraic self/antisymm/cocycle + ExpHom multiplicative cocycle / reciprocal / swap identities | `Decision` | **DEF** + algebraic **THM** (not empirical) |
| EQ-OPEN-EC-DEFICIT-01 | 0.1 eV vs 0.782 MeV millielectronvolt deficit (\(\sim 10^7\)) | `OpenQuestionBounds` | **PROVED** (stated numbers; does **not** close Q4) |
| EQ-OPEN-YIELD-NC-01 | Miles instantaneous band membership \(\not\Rightarrow\) `q5IntegratedYieldClosed`; integrated-band remainder ⇒ Q5 not closed | `OpenQuestionBounds` | **PROVED** (honesty lock; does **not** close Q5) |
| EQ-WH-PART-01 | Derived + remainder = 23.8 MeV; remainder > 0; + FGR still leaves Q1/Q3 open | `WorkingHypothesis` | **PROVED** (does **not** close Q1/Q3) |
| EQ-WH-BOUND-01 | Harmonic \(\Gamma_{\mathrm{ph}}/\Gamma_\gamma=0<10^{11}\) | `WorkingHypothesis` | **PROVED** (does **not** close Q2) |
| EQ-WH-FC-02 | FC class: \(S^N/N!<10^{-11}\) for all \(S\le10^{4}\), \(N\ge300048\); ratio floor \(0<10^{11}\); γ branching full; alias `harmonic_dos_non_closure` | `RadiationBounds` | **PROVED** (class bound; does **not** close Q2) |
| EQ-WH-DICKE-01 | Paper domain does not license Dicke \(N^2\); engine stays linear \(C\) | `WorkingHypothesis` | **PROVED** (constraint; composed with EQ-COLL-LIN-01) |
| EQ-WH-STOP-01 | \(2\times 23.8=47.6\) MeV; stopping \(\neq\gamma\) | `WorkingHypothesis` | **PROVED** (does **not** close Q1) |
| EQ-WH-NONCLOSE-01 | WH does not discharge Q1–Q3 OPEN predicates | `WorkingHypothesis` | **PROVED** (non-closure) |
| EQ-OVERLAP-01 | \((r_0/a)^3\) overlap bookkeeping skeleton | `Overlap` | **DEF** mechanized |
| EQ-OVERLAP-02 | Ensemble product ≠ nuclear rate | `Overlap` | **AX** honesty tag (DEF module) |
| EQ-WH-FC-01 | Poisson tail \(S/(N+1)<1\) for \(N\ge S\); \(\log_{10}P_N\le-7\times10^{5}<-11\) on the scan grid | `WorkingHypothesisBounds` | **PROVED** (bound; does **not** close Q2) |
| EQ-WH-PART-02 | \(E_{\text{derived}}+(Q-E_{\text{derived}})=Q\); remainder \(=0\iff E_{\text{derived}}=Q\) | `WorkingHypothesisBounds` | **PROVED** (identity; does **not** close Q1) |
| EQ-WH-DICKE-N-01 | \(\lfloor n_D V_{\text{dicke}}\rfloor=0\); no \(N\ge2\) Dicke count licensed | `WorkingHypothesisBounds` | **PROVED** (bound) |
| EQ-WH-CAP-01 | Capped \(P_{\text{occ}}f_{\text{nuc}}C_{\text{lin}}\) product bound; demand above cap unmet | `WorkingHypothesisBounds` | **PROVED** (bound; does **not** close Q3) |
| EQ-WH-NONCLOSE-02 | WH v2 bounds do not discharge Q1–Q3 OPEN predicates | `WorkingHypothesisBounds` | **PROVED** (does **not** close) |
| EQ-WH-MEV-CAP-01 | Engine-capped licensed channels leave remainder \(\ge R_{\min}>0\) (\(\mathrm{BR}_\gamma\le0.998\)); \(\gamma\)-route closure fails Q2; collapse/ENC hydro allocate 0 | `MeVRemainderCaps` | **PROVED** (bound; EQ-OPEN-MEV-01 stays **OPEN**) |
| EQ-PS-COUPLE-01 | Coupling residual \(\max(r_P,r_S)=0\) iff both residuals vanish; positive residual ⇒ not self-consistent | `PoissonSchrodinger` | **PROVED** (residual algebra only; aspirational; does **not** deploy FEM) |
| EQ-PS-DOM-01 | Zero permittivity ⇒ Poisson formula not claimed | `PoissonSchrodinger` | **PROVED** (domain) |
| EQ-PS-NONDEPLOY-01 | `publicBetaDeployed=false`; `lenrProved=false` | `PoissonSchrodinger` | **PROVED** (honesty invariant; does **not** close OPEN) |
| EQ-PS-TOL-01 | Exact self-consistency ⇒ within any \(\tau\); \(r>0\) never silently equals exact | `PoissonSchrodinger` | **PROVED** (tolerance axiom bookkeeping; does **not** deploy FEM) |
| EQ-EC-THRESH-01 | \(p+e^-\to n+\nu_e\) threshold \(0.782\,\mathrm{MeV}\) (eV Nat lock) | `WeakInteraction` | **PROVED** (identity; does **not** close Q4) |
| EQ-EC-GF-01 | \(G_F\times 10^{8}=1166\) PDG lock; \(G_F^2\) Nat square | `WeakInteraction` | **PROVED** (constant lock) |
| EQ-EC-SIGMA-01 | \(\sigma(1\,\mathrm{MeV})\lesssim 10^{-47}\,\mathrm{m}^2\) envelope; \(\sigma\propto E^2\) mono | `WeakInteraction` | **PROVED** (envelope + mono; Python ~\(10^{-48}\)) |
| EQ-EC-RATE-01 | Room-T Boltzmann exponent \(\ge 3\times 10^{4}\) ⇒ thermal EC negligible | `WeakInteraction` | **PROVED** (bound; does **not** close Q4) |
| EQ-OPEN-EC-BOUND-01 | \(E\le\) cap \(<0.782\,\mathrm{MeV}\Rightarrow\neg Q_4\) for 0.1–1 eV double-layer, 26 meV \(k_BT\), and 10–100 eV/atom caps; closing needs \(\ge 7820\) concentrated budgets; Q4 not refuted outright | `WeakInteraction` | **BOUNDED** (form-DISPROVEN under AX caps; does **not** close Q4) |


## Definitions mechanized in this pass (not nature theorems)

| ID | Lean module | What is encoded |
|----|-------------|-----------------|
| EQ-BBL-LIM-01 | `CollapseBounds` | Pointwise clamp \(\min(\mathrm{raw},\mathrm{bound})\); reported \(T\)/\(P\) saturation identities |
| EQ-BBL-BOUND-01 | `CollapseBounds` | Emission-band / Moss-ion / shock-pressure ceilings + Mach×10 regime selector (ENG-BUBBLE-FUSION-01) |
| EQ-BBL-UQ-01 | `CollapseBounds` | UQ percentile keys \(\{5,25,50,75,95\}\), CR/\(\gamma\) tolerance percents, Sobol dim count |
| EQ-BBL-RP-DOM-01 | `CollapseBounds` | RP domain / KM-preferred / `rpFormulaClaimed` Assenbaum-style lemmas (ENG-RP-KM-01; **not** dynamics proof) |
| EQ-BBL-CR-CAP-01 | `CollapseBounds` | Hard-core \(C_{\max}=1000\) reporting clamp |
| EQ-PS-01 | `PoissonSchrodinger` | Parent continuum PS / FEM coupling sketch DEF (`ENG-ASPIRATIONAL-FEM-01`; paper-only) |

| EQ-PS-POISSON-01 | `PoissonSchrodinger` | Discrete Poisson residual bookkeeping (`ENG-ASPIRATIONAL-FEM-01`) |
| EQ-PS-SCHROD-01 | `PoissonSchrodinger` | Discrete Schrödinger residual bookkeeping (`E_eigen`) |
| EQ-PS-TOL-01 | `PoissonSchrodinger` | Explicit residual tolerance axiom \(r\le\tau\) (never silent \(r=0\)) |
| EQ-PRED-02 | `Composition` | Per-mechanism bound table (model input) |
| EQ-3B-SEQ-01 | `NBody` | Sequential two-stage chain, not Faddeev |
| EQ-NBODY-FGR-01 | `NBody` | Volumetric FGR bookkeeping \(n P\Gamma f C_{\mathrm{lin}}/\tau\); zero-occ and linear-collective lemmas |
| EQ-TRAP-DEF-01 | `NBody` | Trapped-state bookkeeping; \(f_{\mathrm{nuc}}\) unconstrained |
| EQ-TSC-STOP-01 | `NBody` | Alpha stopping \(\neq\) prompt-photon transfer mode |
| EQ-TRAP-TAU-01 | `Constants` | \(\tau=10^{-20}\,\mathrm{s}\) integer-scaled input |
| EQ-OVERLAP-01 | `Overlap` | \((r_0/a)^3\) bookkeeping skeleton; nuclear-radius / orbital-scale anchors |
| EQ-OVERLAP-02 | `Overlap` | Ensemble product tagged upper-bound count \(\neq\) nuclear rate |
| EQ-OPEN-MEV-01 … EQ-OPEN-YIELD-01 | `OpenObligations` | Undischarged closure predicates + non-closure implications |
| EQ-RAD-DET-01 | `RadiationBounds` | Detector-UL flag mirrors (`detector_ul_not_proof`); UL flag falsifies assumed branch only |
| EQ-OPEN-YIELD-BAND-01 | `OpenQuestionBounds` | Instantaneous Miles EMP band vs integrated 100–\(10^4\) remainder |
| EQ-YIELD-ACCT-01 | `YieldAccounting` | Expected He-4 yield duty-cycle bookkeeping (no observed yield input) |
| EQ-WH-ENP-01 | `WorkingHypothesis` | Coupled WH ledger (geometry, occupation, operator) |
| EQ-WH-FLOOR-01 | `WorkingHypothesis` | Floor identity \(R_{\mathrm{mode}}\ge R_{\mathrm{obs}}\) |

`OpenObligations.lean` proves only that *stated deficits imply non-closure* (positive remainder, two-body \(\log_{10}N<0\), energy deficit, yield discrepancy). `OpenQuestionBounds.lean` adds would-close-if lemmas and the Q4 millielectronvolt deficit identity. `WorkingHypothesisBounds.lean` adds the WH-ENP-01 v2 bounds (Poisson multi-phonon tail, general partition, Dicke count, engine-cap product) as identities / bounds over integer-scaled inputs; the Franck–Condon displaced-oscillator model is a labelled model assumption and the \(-7\times10^{5}\) bound is a conservative integer cap on the Python `lgamma` value. None of these modules discharges any open obligation.

## Axioms / hypotheses (not theorems of nature)

| ID | Note |
|----|------|
| EQ-TUN-BAND-01 | Enhancement band / cap is a **model assumption** (RR-001) |
| EQ-MILES-EMP-01 | Miles heat–helium correlation remains `EMP` |
| EQ-TRAP-SEP-01 / EQ-TRAP-TAU-01 | 25 pm and \(10^{-20}\,\mathrm{s}\) are inputs, not derivations |
| EQ-UQ-PRIOR-01 / EQ-UQ-BF-01 | Oracle B priors and approximate Bayes factor are definitions; proved Int/Nat identities (self-zero, antisymm, cocycle, ExpHom multiplicative cocycle / reciprocal / swap) do **not** flip OPEN rows |
| `RealShim.expZ_strict_mono` | Analysis bridge until mathlib upgrade |

## Open obligations (unchanged)

| ID | Topic |
|----|-------|
| EQ-OPEN-MEV-01 | MeV energy gap |
| EQ-OPEN-RAD-01 | Radiation suppression |
| EQ-OPEN-RATE-01 | Rate closure |
| EQ-OPEN-EC-01 | Electron-capture energy source |
| EQ-OPEN-YIELD-01 | Integrated yield discrepancy |

**New DEF/THM rows (reviewer-pack pass, still OPEN obligations):** `EQ-BRANCH-LATTICE-01`, `EQ-WHEN-THRESH-01`, `EQ-WHEN-DUTY-01`, `EQ-MECH-PATH-01`, `EQ-OPEN-EC-DEFICIT-01`, `EQ-OPEN-YIELD-BAND-01` — Lean `WhenHow.lean` / `Branching.lean` / `OpenQuestionBounds.lean`; no measured branching or nature theorem.

**WeakInteraction pass (still OPEN Q4):** `EQ-EC-THRESH-01`, `EQ-EC-GF-01`, `EQ-EC-SIGMA-01`, `EQ-EC-RATE-01` — Lean `WeakInteraction.lean` locks Fermi \(G_F\), \(\sigma\) envelope, and Boltzmann thermal-rate bound against `weak_interaction.py`. These are honest identities / bounds only; they do **not** discharge `EQ-OPEN-EC-01`.

**EC bound pass (still OPEN Q4):** `EQ-OPEN-EC-BOUND-01` — `WeakInteraction.lean` proves that per-atom electrostatic / thermal reservoirs under the `EQ-CM-BUDGET-01` cap (10–100 eV/atom) and the 0.1–1 eV double-layer band cannot satisfy `q4ElectronCaptureSourceClosed` (`cm_budget_form_cannot_close`). This is BOUNDED / form-DISPROVEN under those `AX` caps, not CLOSED: `q4_not_refuted_outright` keeps the obligation logically open, Widom–Larsen mass renormalization stays SPEC, and `ec_bounds_keep_honesty_locks` keeps `condensedMatterPathToThreshold` and `lenrProved` false.

**RAD FC class pass (still OPEN Q2):** `EQ-WH-FC-02`, `EQ-RAD-DET-01` — Lean `RadiationBounds.lean` proves the displaced-oscillator FC tail below \(10^{-11}\) over the whole licensed \(S\)/\(N\) domain (deriving the EQ-WH-FC-01 cap and literals) and mirrors `branching_model.py` detector flags. Only unmechanized step: \(e^{-S}\le1\). BOUNDED / class-DISPROVEN for harmonic + FC model classes only; does **not** discharge `EQ-OPEN-RAD-01`.

SPEC mechanisms (TSC, Hagelstein, KG–RP, Widom–Larsen mass renormalization) remain claim-tiered speculative modules — not Lean theorems. N-body IR (`EQ-TSC-*`, `EQ-TRAP-*`, `EQ-3B-*`, `EQ-NBODY-*`) does **not** change the OPEN table. There is no `theorem lenr_occurs`. Auto-persisted simulation campaigns (`formalization/predictions/campaign_invariants.json`) are **model outputs**; more runs do not discharge this table or set `lenr_proved`.

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
