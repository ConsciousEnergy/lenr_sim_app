# Claim Taxonomy — Unified LENR Theory Formalization

**Status:** Living ledger (Phase 0 of formalization).  
**Authority:** [A_Unified_Theoretical_Framework_for_LENR.md](../A_Unified_Theoretical_Framework_for_LENR.md), [TRACEABILITY_MATRIX.md](../REVIEW_2026/TRACEABILITY_MATRIX.md), [LENR_CONSISTENCY_RESOLUTIONS.md](../LENR_CONSISTENCY_RESOLUTIONS.md).  
**Epistemic rule:** Lean theorems (`THM`) certify *mathematical consistency from stated defs/axioms*. They do **not** certify that LENR occurs in nature.

## Tag legend

| Tag | Meaning | Lean treatment |
|-----|---------|----------------|
| `THM` | Classical math identity / inequality from CODATA + stated defs | Prove |
| `DEF` | Notation / model definition | `def` |
| `AX` | Model assumption (governance band, cap, scenario input) | `axiom` / hypothesis; never “proven physics” |
| `EMP` | Empirical correlation | Hypothesis + falsifier link; not a theorem of nature |
| `OPEN` | Explicit open challenge (§5A) | Unproved obligation |
| `SPEC` | Speculative mechanism (claim-tier gated) | Isolated axiom module |

## Formal symbol discipline (IL-015)

Overloaded paper symbols map to distinct IR / Lean names:

| Paper symbol | Formal name | Meaning |
|--------------|-------------|---------|
| \(E\) (Schrödinger) | `E_eigen` | Energy eigenvalue |
| \(E\) (field) | `E_field` | Electric field (V/m) |
| \(E\) (projectile) | `E_kin` | Kinetic / CM energy in Gamow/Assenbaum |
| \(n\) (quantum) | `n_prin` | Principal quantum number |
| \(n\) (density) | `n_dens` | Number density (m⁻³) |
| \(R\) (rate) | `R_rate` | Reaction rate |
| \(R\) (bubble) | `R_bubble` | Bubble radius |
| \(R\) (overlap count) | `R_overlap_count` | Ensemble upper-bound counting argument |

---

## Equation / claim ledger

| ID | Claim (short) | Paper | Code | Citation / label | Tag | Lean / IR |
|----|---------------|-------|------|------------------|-----|-----------|
| EQ-RYD-01 | \(E_n = -13.6\,\mathrm{eV}/n_{\mathrm{prin}}^2\); at \(n=10\), \(E=-0.136\,\mathrm{eV}\) | §2.1 | `physics/rydberg_matter.py` | hydrogen Rydberg (CODATA) | `THM` | `Rydberg.lean` / `rydberg.yaml` |
| EQ-OVERLAP-01 | \(P_{\mathrm{overlap}} \approx (r_0/a)^3 e^{-2r_0/a}\) | §2.2 | `constants.py` `NUCLEAR_RADIUS_*` | model construct | `DEF` | `Overlap.lean` |
| EQ-OVERLAP-02 | Ensemble \(N_{\mathrm{atoms}} \times f_{\mathrm{attempt}} \times P\) is an **upper-bound count**, not a nuclear rate | §2.2 | — | model assumption | `AX` | obligation text |
| EQ-FIELD-01 | \(E_{\mathrm{field}}=\Delta V/d\) (e.g. \(0.1\,\mathrm{V}/1\,\mathrm{nm}=10^8\,\mathrm{V/m}\)) | §2.3 | double-layer / QED paths | [23],[33] | `THM` | algebraic |
| EQ-EC-THRESH-01 | \(p+e^-\to n+\nu_e\) threshold \(\Delta E\approx 0.782\,\mathrm{MeV}\) | §2.4 | `widom_larsen.py` | CODATA mass defect | `THM` | constants |
| EQ-EC-RATE-01 | Thermal Boltzmann factor \(\sim e^{-3\times 10^4}\) ⇒ free thermal EC rate ≈ 0 | §2.4, §5A.4 | — | kinematics | `THM` | bound note |
| EQ-WL-MASS-01 | Effective-mass renormalization \(m_e^*/m_e>2.53\) for EC | §2.4 | `widom_larsen.py` | widomlarsen2006 + tennfors2013 | `SPEC` | axiom stub |
| EQ-CAS-01 | \(F=-\pi^2\hbar c A/(240 d^4)\) parallel-plate | §2.5 | `theories/casimir_confinement.py` | casimir1948 | `DEF` | `Casimir.lean` |
| EQ-CAS-02 | Check geometry \(A=1\,\mu\mathrm{m}^2\), \(d=1\,\mathrm{nm}\) ⇒ \(\lvert F\rvert\approx 1.3\,\mathrm{mN}\) | §2.5, IL-001 | same + Wolfram log | casimir1948 | `THM` | `Casimir.lean` |
| EQ-COH-01 | Electronic coherence length \(\ell\sim v_F/\Delta\omega\) (order-of-magnitude) | §2.5.1 | coherence theories | model | `AX` | — |
| EQ-BEC-01 | \(T_c = \frac{2\pi\hbar^2}{m k_B}\big(n/\zeta(3/2)\big)^{2/3}\) | §2.6 | `theories/kim_bec.py` | kim2009 | `DEF` | future |
| EQ-BEC-02 | Polaron mass reduction 3–5× raising \(T_c\) | §2.6 | kim_bec | **model assumption** | `AX` | — |
| EQ-OP-01 | Oppenheimer–Phillips transfer cross-section sketch | §2.7 | OP / parkhomov paths | steinetz2020exp, pines2020theory | `DEF` | — |
| EQ-TUN-BAND-01 | Phenomenological enhancement band \(f\in[10^3,10^5]\) | §2.8, §5.1 | `MAX_ENHANCEMENT_FACTOR=1e5` | **model assumption** (RR-001) | `AX` | `Composition.lean` |
| EQ-TUN-FACTOR-01 | Bookkeeping \(f=f_{\mathrm{scr}}f_{\mathrm{field}}f_{\mathrm{coh}}f_{\mathrm{ph}}\) | §2.8 | pipeline groups | bookkeeping | `DEF` | composition |
| EQ-PHONON-N-01 | Naive \(N\sim\Delta E/\hbar\omega_{\mathrm{ph}}\sim 2\times 10^7\) for 1 MeV / 50 meV | §2.8.1 | — | kinematics | `THM` | arithmetic |
| EQ-PHONON-NAIVE-01 | Independent multi-phonon pathway probability ~0 for \(g<\hbar\omega\) | §2.8.1 | — | analysis | `THM` | note / OPEN link |
| EQ-HAG-01 | Relativistic phonon–nuclear matrix / lossy spin-boson | §2.8.1, §5A.1 | `hagelstein_phonon.py` | hagelstein2025 | `SPEC` | axiom stub |
| EQ-PS-01 | Coupled Poisson–Schrödinger sketch | §3.1 | computational | DEF only | `DEF` | out of pilot |
| EQ-RP-01 | Modified Rayleigh–Plesset (+ electrostatic pressure) | §3.2 | `bubble_lattice_interaction.py` | paper 3.2 | `DEF` | out of pilot |
| EQ-KGRP-01 | KG–RP harmonic locking / detuning | §6 hyp. | `cavitation_kgrp.py` | mulnix2026 | `SPEC` | out of pilot |
| EQ-RATE-2B-01 | Two-body \(R_V=\tfrac12 n^2\langle\sigma v\rangle P\) | §5.1.1 | `cross_sections.py`, rate engine | baseline / model | `DEF` | `Gamow.lean` |
| EQ-GAMOW-01 | \(\eta=Z_1 Z_2 e^2/(4\pi\varepsilon_0\hbar v)\); \(P=e^{-2\pi\eta}\) | §5.1.1 | `cross_sections.py`, `wkb_tunneling.py` | gamow1928 | `DEF`+`THM` | `Gamow.lean` |
| EQ-SFACT-01 | \(\sigma(E)=S(E)e^{-2\pi\eta}/E\) | §5.1.1 | `mhd/nuclear_force_coupling.py` | nacreii | `DEF` | — |
| EQ-ASSEN-01 | Assenbaum \(f=\exp(\pi\eta U_e/E)\) | §2.8, kernel | `screening_kernel.py` | Assenbaum 1987 | `DEF` | `Assenbaum.lean` |
| EQ-ASSEN-DOM-01 | Applicability requires \(U_e \ll E\) (code/paper: do not use outside domain) | §5A.3 | `screening_kernel.py` | Assenbaum domain | `THM` | `Assenbaum.lean` |
| EQ-SCR-UE-01 | Material-dependent \(U_e\) ranges (not single 800 eV) | §2.1/2.8 | `screening_data.py` | raiola2002, … | `EMP`/`AX` | data |
| EQ-COMP-01 | `grouped_max_confidence_product` then cap at \(10^5\) | software | `theory_pipeline.py` | RR composition | `THM` | `Composition.lean` |
| EQ-COMP-02 | Intra-group mechanisms: max only (no product) | software | `THEORY_COMPOSITION_GROUPS` | RR | `THM` | `Composition.lean` |
| EQ-COLL-CAP-01 | Collective factor hard cap \(10^6\) | software | theory modules | **model assumption** | `AX` | — |
| EQ-QDD-01 | D+D→⁴He \(Q\approx 23.8\,\mathrm{MeV}\) | §5.2.1 | miles / energy accounting | nuclear data | `THM` | `Miles.lean` |
| EQ-MILES-CONV-01 | \(N_{\mathrm{He}}\approx P_{\mathrm{W}}/Q\) ⇒ \(\sim 2.63\times 10^{11}\) atoms/s/W at 23.8 MeV | §5.2.2 | `MILES_HEAT_HELIUM_RATE` | conversion identity | `THM` | `Miles.lean` |
| EQ-MILES-EMP-01 | Miles correlation \(24\pm 4\,\mathrm{MeV}/^4\mathrm{He}\) band | §5.2.2 | gates | miles1993, mckubre2008 | `EMP` | hypothesis |
| EQ-CM-BUDGET-01 | Condensed-matter budget capped ~10–100 eV/atom without MeV channel | IL-017 | guardrails | governance | `AX` | — |
| EQ-OPEN-MEV-01 | MeV energy gap (phonon→nuclear) unsolved | §5A.1 | MEV_GAP_HYPOTHESIS | OPEN | `OPEN` | obligation |
| EQ-OPEN-RAD-01 | Radiation suppression / no prompt γ | §5A.2 | — | OPEN | `OPEN` | obligation |
| EQ-OPEN-RATE-01 | Rate closure with single-pair enhancements | §5A.3 | two_body vs trapped_state | OPEN | `OPEN` | obligation |
| EQ-OPEN-EC-01 | No convincing condensed-matter path to \(E_e>0.782\,\mathrm{MeV}\) | §5A.4 | — | OPEN | `OPEN` | obligation |
| EQ-OPEN-YIELD-01 | Integrated He yield vs heat duty-cycle discrepancy | §5A.5 | — | OPEN | `OPEN` | obligation |
| EQ-TSC-01 | Takahashi trapped-state / TSC rate | §5A.3 | `takahashi_tsc.py`, trapped_state mode | takahashi2016 | `SPEC` | separate mode |
| EQ-BASE-2B-01 | `two_body` remains default baseline; never silently replaced | RR-006 | rate engine | governance | `AX` | contract |

---

## Completeness vs Traceability Matrix

Every row in [TRACEABILITY_MATRIX.md](../REVIEW_2026/TRACEABILITY_MATRIX.md) maps to at least one ID above. Gaps for future IR/Lean work: BEC \(T_c\) numeric theorem, S-factor module, RP/KG dynamics, OP channel formalization.

## Non-claims

No taxonomy row tagged `THM` asserts experimental truth of LENR, Miles calorimetry, Widom–Larsen mass renormalization, or MeV-gap closure.
