# Open-question corpus gaps (2026)

**Status:** Living. Not a paper-by-paper LENR-CANR audit.  
**Rule:** Mapping the CMNS corpus against Q1–Q3 does **not** close those questions.  
**Companion:** [SCIENTIFIC_RIGOR_REVIEW.md](SCIENTIFIC_RIGOR_REVIEW.md) (RR-006), [MEV_GAP_HYPOTHESIS.md](MEV_GAP_HYPOTHESIS.md), [CLAIM_TAXONOMY.md](../FORMALIZATION/CLAIM_TAXONOMY.md).  
**In-app ledger:** Unified Results `OpenQuestionsVirtualLab` (`open_questions` / `lenr-open-questions-v1`) prints determinations under named hypotheses. It does not flip `EQ-OPEN-*` rows and never emits `LENR_PROVED`. Architecture: [OPEN_QUESTIONS_VIRTUAL_LAB_2026-08-22.md](../ARCHITECTURE/OPEN_QUESTIONS_VIRTUAL_LAB_2026-08-22.md).

## Non-resolution

Searches of [LENR-CANR](https://lenr-canr.org/), [LENR Dashboard](https://lenrdashboard.com/), and [UMLENR](https://github.com/ConsciousEnergy/UMLENR) do not yield a silver-bullet mechanism that (1) transfers MeV from lattice/phonon degrees of freedom into a nuclear channel, (2) suppresses prompt radiation in a measured way, and (3) closes two-body rates without an unconstrained collective factor. The app already wires Hagelstein phonon, Miles EMP, Widom–Larsen, Takahashi TSC, Letts laser, and bubble-lattice acoustics. Remaining gaps are **depth and claim-tier**, not missing brand names.

**Explicitly out:** Hydrino / Mills hydrino spectroscopy is not a TheoryModule and is not added here.

## Open-corpus method

Keep the CMNS/LENR (“cold fusion”) corpus **open**. Criticism of one paper is not dismissal of a mechanism class.

Fomitchev-Zamilov’s experimental-physics bar ([Maximus Energy, 2024-05-29](https://maximus.energy/index.php/2024/05/29/critical-review-of-bin-juine-huang-et-al-paper/)) is encoded as **methodology**, not as a veto. He states he is not prejudiced against LENR in principle and is not a flow-calorimetry specialist. The bar:

1. Be more critical of one’s own data than of rivals.
2. Do not interpret first as support for a preferred theory.
3. Hunt alternative explanations (`m/z` is not elemental ID; ²²Ne⁺ vs CO₂⁺⁺; optical spectroscopy as gold standard for gas species).
4. Hunt why the instrument read what it read (missing plots, flow-COP systematics, SEM/EDX of common elements without controls).
5. Burden of proof: try to **disprove** the interesting result; only residual claims survive as EMP/SPEC.

That is compatible with keeping multi-body (`trapped_state` / TSC) **open** beside the `two_body` default (RR-006).

## Q1–Q3 vs existing modules

| Open question | Strongest in-app handle | When/how virtual lab field | Still missing |
|---------------|-------------------------|------------------------|---------------|
| Q1 MeV gap (phonon → nuclear) | `hagelstein_phonon.py`; [MEV_GAP_HYPOTHESIS.md](MEV_GAP_HYPOTHESIS.md) | `q_mev_gap`, `how.fgr_parameters.f_nuc` | Constrained matrix element + occupation probability |
| Q2 Radiation suppression / no prompt γ | `branching_model.py`; Hagelstein narrative | `q_radiation.detector_ul_log10`, `BRANCHING_INCONSISTENT_WITH_UL` | Quantitative γ-absorption vs detection limits |
| Q3 Rate closure | `two_body` + `trapped_state` / `three_body` FGR | `when.threshold_crossed`, `when.active_mode_log10_n` | Experimentally constrained collective factor |

**Deferred (not modules in this slice):** Dubinko LAV; Widom γ-absorption SPEC vs ULM neutrons; Letts beat-frequency term in `calculate()`; Floquet-WKB drive; maser / microwave TheoryModule.

## Stimulation channels

| Channel | Experiment | In formalism today | Honest gap |
|---------|------------|--------------------|------------|
| Laser | Letts & Cravens dual-beam ~670–685 nm on Pd-D; Lorentzian ~682 nm; EMP heat vs unstimulated | `letts_laser.py`; `when.stimulation.letts_laser` | Beat frequency → optical phonons is docstring-only, not in `calculate()` |
| Acoustic / kinetic | Ultrasonic forcing; Minnaert / Bjerknes / streaming; RP + Keller–Miksis in bubble-lattice. Taleyarkhan-type nuclear claims **disputed EMP**. Huang 2024 **contested EMP** (below). Pyyhtiä 2026 (`pyyhtia2026`) electrolytic CR-39 cavitation **detector confounder** (not nuclear proof) | Paper §3.2/§3.6; bubble-lattice; `when.stimulation_active` (acoustic/bubble) | Environmental **drive** + detector honesty; not a named TheoryModule |
| Maser | No CMNS-class experimental track comparable to Letts | No `maser` module (correct) | Paper §2.8.1 “phonon maser” is an **analogy**. Do not invent a maser milestone |

Do not multiply laser × acoustic enhancement factors.

## Huang 2024 (contested EMP, not closed class)

Huang, B.-J. et al. (2024). Water can trigger nuclear reaction to produce energy and isotope gases. *Scientific Reports* 14, 214. DOI [10.1038/s41598-023-50824-8](https://www.nature.com/articles/s41598-023-50824-8), PMID [38167629](https://pubmed.ncbi.nlm.nih.gov/38167629/). **Same paper** (not two studies). Water-flow heat-exchanger cavitation; reported COP>1; MS assigned to ²²Ne/CO₂; conjectured ¹²C/¹⁷O. **Not** D+D → ⁴He 23.8 MeV.

- *Scientific Reports* **editor’s note**: conclusions are under criticism. The article is **not** retracted.
- Fomitchev-Zamilov critique (2024-05-29): flow calorimetry COP systematics undocumented; `m/z=22` ≠ elemental ID (²²Ne⁺ vs CO₂⁺⁺); missing `m/z=22` plots; optical spectroscopy not done; SEM/EDX of common elements without controls.
- Nearby EMP (not Huang): Fomitchev-Zamilov, *Sci. Rep.* 14, 11517 (2024) — neutrons in cavitating deuterated Ti; spallation not ruled out.

**Incorrect tightening:** treating Huang as refuted ⇒ acoustic nuclear claims closed; treating the MS/COP objections as falsifying Miles or Takahashi TSC; treating `two_body` as the only allowed ontology.

## Living claim register

Tags match [CLAIM_TAXONOMY.md](../FORMALIZATION/CLAIM_TAXONOMY.md): `EMP` empirical correlation, `SPEC` speculative, `OPEN` unsolved, `withdrawn` retracted/abandoned.

| Claim | Tag | Known critique / caveat | App surface |
|-------|-----|-------------------------|-------------|
| Paneth & Peters 1926–27 (H₂+Pd spectroscopic He) | withdrawn | Retracted (glass/asbestos). Not electrolysis, not deuterium | Theory Guide timeline only |
| Tandberg 1927+ (electrolytic Pd; later D₂O) | unproven apparatus | Patent denied; no conclusive published fusion | Theory Guide timeline only |
| Fleischmann–Pons 1989 excess heat | EMP (contested) | Replication dispute; calorimetry systematics | Historical; `non_equilibrium_thermo` refs |
| Miles 1993 heat–⁴He ~24±4 MeV/⁴He | EMP | Retention / blanks / not every heat report is nuclear | `miles_heat_helium`; `EQ-MILES-EMP-01` |
| Letts & Cravens 2003–09 dual laser ~682 nm | EMP | Beat-frequency/phonon coupling hypothesized | `letts_laser.py` |
| Takahashi TSC / trapped-state rate | SPEC | Unconstrained occupation/lifetime; ~19–20 orders vs two-body | `takahashi_tsc.py`; `trapped_state` (RR-006); `EQ-TSC-01` |
| Widom–Larsen ULM neutrons | SPEC | Tennfors 2013 critique in module refs | `widom_larsen.py` |
| Hagelstein phonon–nuclear | SPEC | MeV-gap matrix element unconstrained (Q1) | `hagelstein_phonon.py` |
| Taleyarkhan acoustic cavitation nuclear | disputed EMP | Highly disputed bubble-fusion claims | Timeline environment line only |
| Pyyhtiä CR-39 electrolytic cavitation | contested (confounder) | HER nanobubble cavitation damages CR-39; confounds pit=nuclear | Paper §3.2; baselines `pyyhtia-cr39-cavitation-2026`; EQ-OPEN-RAD-01 stays OPEN |
| Huang et al. 2024 water cavitation COP / ²²Ne | contested EMP | Editor’s note + Fomitchev COP/`m/z` critique. **Not** Miles ⁴He | Timeline + this doc; **not** a TheoryModule (`EQ-HUANG-EMP-01`) |
| Fomitchev-Zamilov 2024 Ti-D cavitation neutrons | EMP | Author: spallation not ruled out | This register only |
| Hydrino / Mills | excluded | Not CMNS nuclear; not modeled | None |

Software default remains `two_body`. `trapped_state` is a **parallel SPEC mode**. Criticism of Huang **does not close** `EQ-TSC-01`.
