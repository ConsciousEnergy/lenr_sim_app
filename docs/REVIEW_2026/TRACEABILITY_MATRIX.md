# Traceability Matrix (code <-> paper <-> citation <-> test)

**Status:** Living document. The spine of the 2026 rigor review: every core
equation must map to a paper section, a code location, a citation key, and a
test. Gaps are tracked as findings in
[SCIENTIFIC_RIGOR_REVIEW.md](SCIENTIFIC_RIGOR_REVIEW.md).

Citation keys follow [CITATION_STANDARD.md](CITATION_STANDARD.md). A row is
**complete** only when all four columns are populated (or the value is labelled a
model assumption).

---

## Equation traceability

| Equation / model | Paper section | Code location | Citation key(s) | Test | Finding |
|------------------|---------------|---------------|-----------------|------|---------|
| Debye/Thomas-Fermi screening length lambda_D | 2.1 | `unified_lenr_model/screening.py` | huke2008, pines2020theory | test_paper_corrections.py | RR-007 |
| Screening energy U_s; enhancement f = exp(pi*eta*U_s/E) | 2.1, 2.8 | `unified_lenr_model/screening.py` | raiola2002, czerski2023, screeningreview2024 | test_simulation_pipeline.py | RR-007 |
| Gamow factor / eta; P = exp(-2*pi*eta) | 2.8, 5.1.1 | `unified_lenr_model/cross_sections.py`, `mhd/nuclear_force_coupling.py` | gamow1928 | test_wkb_tunneling.py | — |
| Astrophysical S-factor sigma(E)=S(E)exp(-2*pi*eta)/E | 5.1.1 | `mhd/nuclear_force_coupling.py` | nacreii, caughlanfowler | test_mhd_physics.py | — |
| Two-body reaction rate 0.5 n^2 sigma v_th P | 5.1.1 | `unified_lenr_model/cross_sections.py` | (baseline; model assumption) | test_lenr_enhancement.py | RR-006 |
| Trapped-state rate (Fermi golden rule + optical potential) | 5A.3 (open) | Phase 5: `unified_lenr_model/reaction_rate.py` (new) | takahashi2016 | Phase 5 tests | RR-006 |
| Collective/many-body enhancement (TSC, BEC ~N^2, phonon) | 2.5.1, 2.6 | theories/takahashi_tsc.py, kim_bec.py | takahashi2016, kim2009 | test_theory_modules.py | RR-006 |
| BEC critical temperature T_c | 2.6 | theories/kim_bec.py | kim2009 | test_theory_modules.py | RR-004 |
| Casimir force F = -pi^2 hbar c/240 * A/d^4 | 2.5 | theories/casimir_confinement.py | casimir1948, lifshitz1956 | test_simulation_pipeline.py | RR-003 |
| Modified Rayleigh-Plesset (with eps0 E^2/2) | 3.2 | `bubble_lattice_interaction.py` | (paper 3.2) | test_physics_benchmark_gates.py | RR-012 |
| KG-RP invariants / harmonic locking / detuning law | 6 (new) | Phase 6: KG-RP module (new) | mulnix2026 | Phase 6 tests | RR-012 |
| Phonon-nuclear down-conversion (lossy spin-boson, a*cP) | 2.8.1, 5A.1 | theories/hagelstein_phonon.py | hagelstein2025 | test_theory_modules.py | RR-011 |
| Widom-Larsen ULM neutron pathway | 2.4 | theories/widom_larsen.py | widomlarsen2006, tennfors2013 | test_theory_modules.py | RR-008 |
| Miles heat-helium correlation (2.62e11 /s/W) | 5.2 | constants.py MILES_HEAT_HELIUM_RATE, theories/miles_heat_helium.py | miles1993, mckubre2008, storms2015 | Phase 4 gate | RR-010 |
| Screened Oppenheimer-Phillips channel | 2.7 | theories (O-P), parkhomov_validation.py | steinetz2020exp, pines2020theory | Phase 4 NASA LCF gate | RR-009 |
| Shell-structure nucleon-pairing prior | (Part 2 6.1, new) | Phase 7: parkhomov_validation.py | nguyen2026 | Phase 7 tests | RR-013 |

---

## Citation key register (canonical, feeds Phase 13 bibliography)

| Key | Identifier | Full citation (working) |
|-----|-----------|--------------------------|
| takahashi2016 | JCMNS 19, 298 | A. Takahashi, "Fundamental of Rate Theory for CMNS," J. Condensed Matter Nucl. Sci. 19, 298-315 (2016). |
| hagelstein2025 | JCMNS (2025) | P. L. Hagelstein, "Relativistic Phonon-Nuclear Coupling Matrix Element for the D2/4He Transition," J. Condensed Matter Nucl. Sci. (2025); and lossy spin-boson model reviews. |
| steinetz2020exp | doi:10.1103/PhysRevC.101.044610 | B. M. Steinetz et al., "Novel nuclear reactions observed in bremsstrahlung-irradiated deuterated metals," Phys. Rev. C 101, 044610 (2020). |
| pines2020theory | doi:10.1103/PhysRevC.101.044609 | V. Pines et al., "Nuclear fusion reactions in deuterated metals," Phys. Rev. C 101, 044609 (2020). |
| czerski2023 | doi:10.1016/j.physletb.2023.137750 | Electron screening in palladium, Phys. Lett. B (2023). |
| screeningreview2024 | doi:10.3390/particles7030050 | "Electron Screening in Laboratory Nuclear Reactions," Particles 7(3), 50 (2024). |
| raiola2002 | Phys. Lett. B 547 (2002) | Raiola et al., d(d,p)t screening in deuterated metals. |
| huke2008 | Phys. Rev. C 78, 015803 | Huke et al., enhanced screening in metals (periodic table). |
| miles1993 | J. Electroanal. Chem. (1993) | M. Miles et al., heat-helium correlation in Pd-D electrolysis. |
| mckubre2008 | LENR Sourcebook / SRI | M. McKubre et al., d-d fusion products and heat-helium ratio (~23 MeV/4He). |
| storms2015 | Curr. Sci. 108, 574 | E. Storms, review of heat-helium correlation evidence (2015). |
| tennfors2013 | doi:10.1140/epjp/i2013-13015-3 | E. Tennfors, critique of Widom-Larsen, Eur. Phys. J. Plus 128, 15 (2013). |
| widomlarsen2006 | arXiv:nucl-th/0608059 | A. Widom, L. Larsen, ultra-low-momentum neutron catalyzed reactions (2006). |
| mulnix2026 | doi:10.5281/zenodo.19079074 | D. Mulnix, "A Unified Structural Theory of the Hybrid Klein-Gordon / Rayleigh-Plesset System" (2026). |
| nguyen2026 | doi:10.1038/s41586-026-10616-2 | D. Nguyen et al., "Nuclear shell structure governs short-range nucleon pairing," Nature (2026). |
| floquetwkb2026 | doi:10.14293/PR2199.002776.v1 | "Electro-Mechanically Enhanced Lattice Confinement Fusion via Resonant THz-Driven Phonon Modulation (Floquet-WKB)" (2026). |
| casimir1948 | — | H. B. G. Casimir, Proc. K. Ned. Akad. Wet. 51, 793 (1948). |
| lifshitz1956 | — | E. M. Lifshitz, Sov. Phys. JETP 2, 73 (1956). |
| kim2009 | — | Y. E. Kim, Bose-Einstein condensate nuclear fusion theory (2009). |
| gamow1928 | — | G. Gamow, Z. Phys. 51, 204 (1928). |
| nacreii | Nucl. Phys. A | NACRE II compilation of astrophysical S-factors. |

> Keys without DOIs are flagged for Phase 13 DOI lookup. Existing paper refs
> 1-17 will be merged into this register during Phase 13.

---

## Independent verification log (Phase 2)

Equations re-derived / dimension-checked with WolframAlpha (`user-wolframalpha`
MCP) and analytically. PASS = matches adopted value within rounding.

| Quantity | Inputs | Adopted value | WolframAlpha | Result |
|----------|--------|---------------|--------------|--------|
| Casimir force `pi^2 hbar c/240 * A/d^4` | A=1 um^2, d=1 nm | -1.3 mN | 0.0013 N = 1.3 mN | PASS (RR-003/IL-001) |
| Debye screening length `sqrt(eps0 kB T/(n_e e^2))` | n_e=6.8e28 m^-3, T=300 K | ~4.6 pm | 4.584 pm | PASS (units correct) |
| BEC `T_c` structure `2 pi hbar^2/(m kB) (n/zeta(3/2))^(2/3)` | m=2.014u, n=1e28 | ~7.9 K | dimensionally consistent (parse caveat) | PASS (analytic) |

Notes:
- The Casimir check confirms the Part 2 reconciliation (was -10^-7 N) is correct.
- The screening Debye length is sub-picometre at metal electron densities, so the
  *static* Debye potential alone cannot supply the measured U_e ~ hundreds of eV;
  this motivates the cited dynamic-screening **range** in
  `screening_data.py` rather than a single Debye-derived value (RR-007).

## Composition / double-counting audit (Phase 2)

`theory_pipeline.py` uses `grouped_max_confidence_product`: within each
composition group it selects `max(enhancement * confidence)`, then multiplies the
selected factors across groups and caps at `MAX_ENHANCEMENT_FACTOR` (1e5). This is
physically defensible against double-counting because mechanisms in the *same*
group (e.g. `electron_screening` and `quantum_tunneling` both in `screening`) are
not stacked - only the strongest is taken. The new collective many-body term
(Phase 5) must therefore be composed as its own group or fold into an existing
group, never multiplied on top of screening/tunneling. Recorded as a Phase 5
constraint.

## Dual unified-model decision (Phase 2 -> Phase 8)

Canonical: the `unified_lenr_model/` **package**. The legacy
`unified_lenr_model.py` monolith is to be deprecated behind a thin shim in
Phase 8 (RR-014) to avoid import breakage. No equations are unique to the
monolith; it duplicates the package's Sections 2.1-2.8 implementations.

## Formalization IR / Lean lock (2026-08-23)

Machine-checkable equation IR now lives under `formalization/ir/equations/` (49 YAML rows, including five `EQ-OPEN-*` obligations). Each row names a Lean module (`lean_target`) and at least one fully qualified declaration (`lean_decls`). `python formalization/scripts/check_ir.py` fails if a declared name is missing, if `LenrFormal.lean` does not import the module, or if a runtime `EQ-*` id in the v2 physics engine is unknown.

Numeric anchors (`MAX_ENHANCEMENT_FACTOR`, Miles conversion, Q-value, trap separation, two-body \(\log_{10}N=-40\)) are additionally locked by `tests/test_formalization/test_lean_python_agreement.py` and `formalization/scripts/diff_code_literals.py`. These gates certify *consistency*, not experimental truth. The five open obligations remain `OPEN`.

## Change log
- 2026-06-04: Matrix created (Phase 0) with core equations and citation register.
- 2026-06-04: Phase 2 verification log, composition audit, dual-model decision added.
- 2026-08-23: Formalization IR/Lean lock — `lean_decls`, EQ-OPEN YAML, Lean↔Python numeric gates.
