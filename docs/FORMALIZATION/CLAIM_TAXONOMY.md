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
| EQ-EC-THRESH-01 | \(p+e^-\to n+\nu_e\) threshold \(\Delta E\approx 0.782\,\mathrm{MeV}\) | §2.4 | `weak_interaction.py` | CODATA mass defect | `THM` | `WeakInteraction.lean` / `EQ-EC-THRESH-01.yaml` |
| EQ-EC-GF-01 | Fermi \(G_F\approx 1.166\times 10^{-5}\,\mathrm{GeV}^{-2}\) (×10⁸ Nat lock) | §2.4 | `weak_interaction.py` | PDG | `THM` | `WeakInteraction.lean` / `EQ-EC-GF-01.yaml` |
| EQ-EC-SIGMA-01 | Weak \(\sigma(1\,\mathrm{MeV})\lesssim 10^{-47}\,\mathrm{m}^2\); \(\sigma\propto E_\nu^2\) | §2.4 | `weak_interaction.py` | Fermi theory envelope | `THM` | `WeakInteraction.lean` / `EQ-EC-SIGMA-01.yaml` |
| EQ-EC-RATE-01 | Thermal Boltzmann factor \(\sim e^{-3\times 10^4}\) ⇒ free thermal EC rate ≈ 0 | §2.4, §5A.4 | `weak_interaction.py` | kinematics | `THM` | `WeakInteraction.lean` / `EQ-EC-RATE-01.yaml` |
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
| EQ-PS-01 | Continuum Poisson–Schrödinger / FEM coupling sketch (parent; aspirational) | §3.1 | Theory Methods / paper only | continuum DEF | `DEF` | `PoissonSchrodinger.lean` |
| EQ-PS-POISSON-01 | Discrete Poisson residual \(r_P=\lvert\mathrm{lap}\,\phi-\rho/\varepsilon\rvert\) | §3.1 | paper / Methods honesty | bookkeeping | `DEF` | `PoissonSchrodinger.lean` |
| EQ-PS-SCHROD-01 | Discrete Schrödinger residual \(r_S=\lvert H\psi-E\psi\rvert\) (`E_eigen`) | §3.1 | paper / Methods honesty | bookkeeping | `DEF` | `PoissonSchrodinger.lean` |
| EQ-PS-COUPLE-01 | Coupling residual \(r=\max(r_P,r_S)\); positive \(r\Rightarrow\neg\) self-consistent | §3.1 | paper / Methods honesty | residual algebra | `THM` | `PoissonSchrodinger.lean` |
| EQ-PS-DOM-01 | \(\varepsilon=0\Rightarrow\) Poisson formula not claimed | §3.1 | domain honesty | Assenbaum-style | `THM` | `PoissonSchrodinger.lean` |
| EQ-PS-TOL-01 | Approximate self-consistency \(r\le\tau\) requires explicit tolerance axiom (never silent \(r=0\)) | §3.1 | paper / Methods honesty | tolerance axiom | `DEF` | `PoissonSchrodinger.lean` |
| EQ-PS-NONDEPLOY-01 | `publicBetaDeployed=false`; `lenrProved=false` for FEM/PS continuum | §3 / ENG-ASPIRATIONAL-FEM-01 | Theory Methods | honesty | `THM` | `PoissonSchrodinger.lean` |
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
| EQ-HUANG-EMP-01 | Huang et al. water-cavitation COP / \(^{22}\)Ne MS claims (contested; *Sci. Rep.* 14, 214) | — | timeline + gap doc only (not a TheoryModule) | huang2024; Fomitchev-Zamilov 2024-05-29 critique | contested `EMP` | no Lean |
| EQ-CM-BUDGET-01 | Condensed-matter budget capped ~10–100 eV/atom without MeV channel | IL-017 | guardrails | governance | `AX` | — |
| EQ-OPEN-MEV-01 | MeV energy gap (phonon→nuclear) unsolved | §5A.1 | MEV_GAP_HYPOTHESIS | OPEN | `OPEN` | `OpenObligations.lean` / `EQ-OPEN-MEV-01.yaml` (undischarged) |
| EQ-OPEN-RAD-01 | Radiation suppression / no prompt γ | §5A.2 | — | OPEN | `OPEN` | `OpenObligations.lean` / `EQ-OPEN-RAD-01.yaml` (undischarged) |
| EQ-OPEN-RATE-01 | Rate closure with single-pair enhancements | §5A.3 | two_body vs trapped_state | OPEN | `OPEN` | `OpenObligations.lean` / `EQ-OPEN-RATE-01.yaml` (undischarged) |
| EQ-OPEN-EC-01 | No convincing condensed-matter path to \(E_e>0.782\,\mathrm{MeV}\) | §5A.4 | — | OPEN | `OPEN` | `OpenObligations.lean` / `EQ-OPEN-EC-01.yaml` (undischarged) |
| EQ-OPEN-YIELD-01 | Integrated He yield vs heat duty-cycle discrepancy | §5A.5 | — | OPEN | `OPEN` | `OpenObligations.lean` / `EQ-OPEN-YIELD-01.yaml` (undischarged) |
| EQ-OPEN-EC-DEFICIT-01 | Stated 0.1 eV vs 0.782 MeV deficit factor \(\sim 10^7\) (meV integers) | §5A.4 | `open_question_details.py` | would-close-if bookkeeping | `THM` | `OpenQuestionBounds.lean` (does **not** close Q4) |
| EQ-OPEN-YIELD-BAND-01 | Instantaneous Miles EMP band vs integrated \(10^2\)–\(10^4\) remainder | §5A.5 | `open_question_details.py` | miles1993 | `DEF` | `OpenQuestionBounds.lean` (does **not** close Q5) |
| EQ-TSC-01 | Takahashi trapped-state / TSC rate | §5A.3 | `takahashi_tsc.py`, trapped_state mode | takahashi2016 | `SPEC` | separate mode |
| EQ-BASE-2B-01 | `two_body` remains default baseline; never silently replaced | RR-006 | rate engine | governance | `AX` | contract |
| EQ-NAIVE-GN-01 | Nat-floor of independent \(g^N\) is 0 for \(n\ge 1\) (naive multi-phonon fails) | §2.8.1 | `hagelstein_phonon.py`, `open_questions.py` | analysis | `THM` | `Phonon.lean` |
| EQ-RATE-2B-NC-01 | Two-body \(\log_{10}N_{\mathrm{events}}=-40<0\) under \(f\le 10^5\) | §5A.3 | rate engine / decision oracle | paper bookkeeping | `THM` | `RateBudget.lean` |
| EQ-RATE-COND-01 | If \(n_{\mathrm{occ}}\ge n_0\land f_{\mathrm{nuc}}\ge f_0\) then product \(\ge n_0 f_0\) | §5A.3 | decision oracle | would-close-if | `THM` | `RateBudget.lean` |
| EQ-COMP-03 | Pipeline \(\times\) bubble totals are not a physical observable; at cap \(=10^{10}\) | software | `theory_pipeline.py`, virtual lab | RR composition | `THM` | `Composition.lean` |
| EQ-BBL-COMP-01 | Bubble-lattice grouped max-within-group then multiply across groups | software | `bubble_mechanism_composition.py` | RR bubble route | `THM` | `Composition.lean` |
| EQ-PRED-01 | Three-tier prediction: sensitivity / physics_governed / claim_tier_display | software | `unified_simulation.py` | governance | `DEF` | `Composition.lean` |
| EQ-PRED-02 | Per-mechanism physics bounds \(b_i\) before claim-tier clamp | software | `bubble_mechanism_composition.py` | model assumption | `AX` | `Composition.lean` |
| EQ-BBL-LIM-01 | Collapse reporting: \(\text{value}=\min(\text{value\_raw},\text{calculated\_bound})\) | §3.2 | `collapse_calculated_bounds.py` | Moss / Flannigan bounds | `DEF` | `CollapseBounds.lean` |
| EQ-BBL-BOUND-01 | Literature collapse ceilings \(T\in\{1.5\times10^4,2\times10^6\}\,\mathrm{K}\), \(P\le10^{10}\,\mathrm{Pa}\), \(\mathrm{Ma}_{\mathrm{th}}=0.3\) | §3.2 / ENG-BUBBLE-FUSION-01 | `collapse_calculated_bounds.py` | Moss / Flannigan / Brenner | `DEF` | `CollapseBounds.lean` |
| EQ-BBL-UQ-01 | Collapse UQ percentiles \(\{5,25,50,75,95\}\) + CR/\(\gamma\) tolerance percents | software | `collapse_uq.py` | model assumption | `DEF` | `CollapseBounds.lean` |
| EQ-RATE-REPLACE-01 | `two_body` / `trapped_state` / `three_body` are alternatives, not factors | RR-006 | rate engine | governance | `THM` | `RateBudget.lean` |
| EQ-TSC-GEOM-01 | FCC \(d_{DD}=a/(2\sqrt{2})\) identity (~137 pm for Pd) | §5A.3 | `takahashi_tsc.py` | takahashi2016 | `THM` | `NBody.lean` |
| EQ-TSC-GEOM-02 | FCC \(d_{DD}\) is not the 25 pm trap radius | §5A.3 | TSC + trapped_state | two hypotheses | `THM` | `NBody.lean` |
| EQ-TSC-Q-01 | \(Q(4\mathrm{D}\to 2\alpha)=47.6\,\mathrm{MeV}=2\times 23.8\,\mathrm{MeV}\) | §5A.3 | `takahashi_tsc.py` | conversion | `THM` | `NBody.lean` |
| EQ-TSC-CH-01 | If two on-shell alphas, no primary \(\gamma\) required (kinematics only) | §5A.2/3 | `takahashi_tsc.py` | does not close Q2 | `THM` | `NBody.lean` |
| EQ-TSC-STOP-01 | Alpha stopping is a different MeV-gap than a 24 MeV photon | §5A.1 | TSC / virtual lab remainder | DEF | `DEF` | `NBody.lean` |
| EQ-TSC-OCC-01 | \(P_4=\theta^4 f_{\mathrm{tet}}\) Bernoulli; correlated occupation unconstrained | §5A.3 | `takahashi_tsc.py` | OPEN | `OPEN` | obligation |
| EQ-COLL-LIN-01 | Engine collective \(C=\min(N,10^6)\le 10^6\) (not Dicke \(N^2\)) | software | rate engine | AX+THM clamp | `THM` | `NBody.lean` |
| EQ-TRAP-DEF-01 | Trapped-state rate formula as in the engine | §5A.3 | `reaction_rate_engine.py` | DEF | `DEF` | `NBody.lean` |
| EQ-TRAP-SEP-01 | \(r_{\mathrm{trap}}=25\,\mathrm{pm}\) | §5A.3 | rate engine | **model assumption** | `AX` | `NBody.lean` |
| EQ-TRAP-TAU-01 | \(\tau=10^{-20}\,\mathrm{s}\) | §5A.3 | rate engine | **model assumption** | `AX` | `NBody.lean` |
| EQ-TRAP-FNUC-01 | \(f_{\mathrm{nuc}}\) unconstrained (Q1) | §5A.1/3 | rate engine | OPEN | `OPEN` | obligation |
| EQ-3B-SEQ-01 | Sequential Widom–OP chain, not Faddeev | §2.4, §5A.4 | rate engine | DEF | `DEF` | `NBody.lean` |
| EQ-3B-MASS-DOM-01 | ULM factor claimed only if \(m^*/m_e\ge 2.53\) | §2.4, §5A.4 | `widom_larsen.py` | tennfors2013 domain | `THM` | `NBody.lean` |
| EQ-NBODY-FGR-01 | Bookkeeping FGR for a correlated 4-body condensate | §5A.3 | TSC / rate | DEF | `DEF` | `NBody.lean` |
| EQ-BRANCH-LATTICE-01 | Lattice Γ_ph/Γ_γ > 10^11 open target | §5A.2 | `branching_model.py` | paper §5A.2 | `DEF` | `Branching.lean` |
| EQ-WHEN-THRESH-01 | Threshold predicate R_mode ≥ R_obs | §5A.3 | `open_questions.when` | DEF | `DEF` | `WhenHow.lean` |
| EQ-WHEN-DUTY-01 | Duty-cycle integrated yield t_duty = t_total f_duty | §5A.5 | `open_questions.when` | DEF | `DEF` | `WhenHow.lean` |
| EQ-MECH-PATH-01 | Mechanism path enum (TSC / phonon / three_body) | §5A | `decision_oracle.py` | Oracle B odds | `DEF` | `WhenHow.lean` |
| EQ-SCALE-MHD-DOM-01 | MHD Ha/Rm not claimed at nuclear fm | software | `multiscale_bridge.py` | domain | `THM` | `ScaleQED.lean` |
| EQ-QED-HE-NEG-01 | Heisenberg–Euler factor \(\approx 1\) at simulated lab \(E\) | bubble QED term | `bubble_lattice_interaction.py` | HE 1936 | `THM` | `ScaleQED.lean` |
| EQ-UQ-PRIOR-01 | Oracle B skeptical default priors | software | `decision_oracle.py` | DEF | `DEF` | `Decision.lean` |
| EQ-UQ-BF-01 | Approximate Bayes factor from log-evidence difference | software | `decision_oracle.py` | DEF | `DEF` | `Decision.lean` |
| EQ-WH-ENP-01 | Coupled WH-ENP-01 geometry/occupation/operator ledger | §5A | `working_hypothesis.py` | hagelstein2025, takahashi2016 | `DEF` | `WorkingHypothesis.lean` |
| EQ-WH-PART-01 | Derived + OPEN remainder = 23.8 MeV; remainder > 0 | §5A.1 | `working_hypothesis.py` | conservation | `THM` | `WorkingHypothesis.lean` |
| EQ-WH-BOUND-01 | Harmonic \(\Gamma_{\mathrm{ph}}/\Gamma_\gamma=0<10^{11}\) | §5A.2 | `working_hypothesis.py` | harmonic DOS cutoff | `THM` | `WorkingHypothesis.lean` |
| EQ-WH-FLOOR-01 | \(R_{\mathrm{obs}}=P_{\mathrm{W}}/(QV)\); threshold iff \(R_{\mathrm{mode}}\ge R_{\mathrm{obs}}\) | §5A.3 | `working_hypothesis.py` | DEF | `DEF` | `WorkingHypothesis.lean` |
| EQ-WH-DICKE-01 | Paper domain \(>\) Dicke radius \(\Rightarrow N^2\) not licensed | §5A.1 | `working_hypothesis.py` | constraint | `THM` | `WorkingHypothesis.lean` |
| EQ-WH-STOP-01 | \(2\times 23.8=47.6\) MeV; alpha stopping \(\neq\) prompt \(\gamma\) | §5A.1 | `working_hypothesis.py` | takahashi2016 | `THM` | `WorkingHypothesis.lean` |
| EQ-WH-NONCLOSE-01 | WH remainders do not discharge Q1–Q3 OPEN predicates | §5A | `working_hypothesis.py` | non-closure | `THM` | `WorkingHypothesis.lean` |
| EQ-WH-FC-01 | Poisson (Huang–Rhys) tail \(t_{N+1}/t_N=S/(N+1)<1\) for \(N\ge S\); \(\log_{10}P_N\le-7\times10^{5}<-11\) at \(S\le10^{4}\) | §5A.1/5A.2 | `many_body/wh_bounds.py` | displaced-oscillator **model assumption** | `THM` | `WorkingHypothesisBounds.lean` |
| EQ-WH-PART-02 | General partition \(E_{\text{derived}}+(Q-E_{\text{derived}})=Q\); remainder \(=0\iff E_{\text{derived}}=Q\) | §5A.1 | `many_body/wh_bounds.py` | conservation | `THM` | `WorkingHypothesisBounds.lean` |
| EQ-WH-DICKE-N-01 | \(n_D V_{\text{dicke}}\approx0.033<1\Rightarrow N_{\text{coh}}^{\max}=0\); no pair licensed | §5A.1 | `many_body/wh_bounds.py` | counting bound | `THM` | `WorkingHypothesisBounds.lean` |
| EQ-WH-CAP-01 | \(P_{\text{occ}},f_{\text{nuc}}\le1,\ C_{\text{lin}}\le10^{6}\Rightarrow\) capped product bound; demand above cap unmet | §5A.3 | `many_body/wh_bounds.py` | upper bound (RR-006 clamp) | `THM` | `WorkingHypothesisBounds.lean` |
| EQ-WH-NONCLOSE-02 | WH v2 bounds (FC, partition, Dicke count, cap) do not discharge Q1–Q3 | §5A | `many_body/wh_bounds.py` | non-closure | `THM` | `WorkingHypothesisBounds.lean` |

---

## Completeness vs Traceability Matrix

Every row in [TRACEABILITY_MATRIX.md](../REVIEW_2026/TRACEABILITY_MATRIX.md) maps to at least one ID above. Gaps for future IR/Lean work: BEC \(T_c\) numeric theorem, S-factor module, RP/KG dynamics, OP channel formalization.

## Non-claims

No taxonomy row tagged `THM` asserts experimental truth of LENR, Miles calorimetry, Huang 2024 cavitation COP/\(^{22}\)Ne, Widom–Larsen mass renormalization, or MeV-gap closure. `EQ-HUANG-EMP-01` is contested EMP and does not close `EQ-TSC-01`. Adding n-body / composition / decision IDs, `EQ-OPEN-EC-DEFICIT-01`, `EQ-OPEN-YIELD-BAND-01`, or `EQ-WH-*` does **not** flip `EQ-OPEN-MEV-01`, `EQ-OPEN-RAD-01`, `EQ-OPEN-RATE-01`, `EQ-OPEN-EC-01`, or `EQ-OPEN-YIELD-01`. There is no `theorem lenr_occurs`.

Every IR YAML now carries `lean_decls` (fully qualified Lean names). `check_ir.py` resolves the target module, requires those names to exist, requires a direct import in `LenrFormal.lean`, and requires every `EQ-*` literal in `open_questions.py` / `open_question_details.py` / `decision_oracle.py` to resolve to an IR or taxonomy row.
