# Wave 1-B — Science honesty

**Date:** 2026-08-31  
**HEAD seed:** `d6be618` (`lenr_sim_app_v0.3.6-beta`, PR #118) per `00-architecture.md`  
**Scope:** Review-first. No product-code edits. Surfaces: constants, paper/guide UI, Analytics/History (08-24..08-27), Open Questions, About, public physics pages, idle visualization.  
**Wolfram:** `user-wolframalpha` MCP is **not** in this session’s tool catalog. Independent in-repo SI checks below; re-run Wolfram when authenticated.

---

## Confirm / refute (asked properties)

| Property | Verdict | Notes |
|---|---|---|
| Tunneling enhancement band \(10^3\)–\(10^5\) (never \(10^8\)) in UI, paper, constants | **Split** | Canonical Theory / Theory Paper / `MAX_ENHANCEMENT_FACTOR` hold the band. Public `/bubble-fusion`, idle Unified viz, `bubble_collapse.py`, and physics-router catalog do **not**. |
| Casimir \(-1.3\) mN | **Confirmed** (formula) | Ideal-conductor \(A=1\,\mu\mathrm{m}^2\), \(d=1\,\mathrm{nm}\) evaluates to \(-1.300\,\mathrm{mN}\). Paper UI omits the \(d<2\,\mathrm{nm}\) domain floor. |
| Miles \(24\pm4\) MeV | **Split** | UI Open Questions + Theory guide use \(24\pm4\). `miles_heat_helium.py` uses \(23.8\pm0.5\), “exactly matching”, “independently confirmed”, and a tautological energy check. |
| `MAX_ENHANCEMENT_FACTOR = 1e5` | **Confirmed** in `constants.py`; **refuted** as a global display/compute ceiling | Canonical engine imports \(1\mathrm{e}5\). Legacy/public paths still print \(10^8\)–\(10^{13}\) (and catalog \(10^{30}\)). |
| `two_body` default; `trapped_state` speculative, does not overwrite | **Confirmed** | |
| `lenr_proved` remains false | **Confirmed** | |
| `EQ-OPEN-*` stay OPEN in UI | **Confirmed** (not discharged) | `EQ-OPEN-RATE-01` chip is `BUDGET_DOES_NOT_CLOSE` on two-body, still listed as an open obligation. |
| Claim-tier chips on quantitative UI claims | **Refuted as complete** | Present on Unified Results / Testbed / Open Questions. Missing beside several quantitative public claims. |
| History `≥1e5 (capped)` not a laboratory measurement | **Confirmed** | |
| Analytics “model association %” not \(P(\mathrm{LENR})\) | **Confirmed** | |
| About disclaimer vs model-vs-experiment honesty | **Weaker than Analytics** | Generic “may not perfectly represent”; no model-output / EQ-OPEN / claim-tier language. |

---

## Independent numeric checks (Wolfram unavailable)

Queries that would have gone to WolframAlpha; evaluated from CODATA SI identities in this environment.

**Casimir (zero-T plates):** \(F=-\pi^2\hbar c A/(240 d^4)\) with \(\hbar=1.054571817\times10^{-34}\,\mathrm{J\,s}\), \(c=299792458\,\mathrm{m/s}\), \(A=10^{-12}\,\mathrm{m}^2\), \(d=10^{-9}\,\mathrm{m}\):

```
F = -1.300126e-03 N = -1.300 mN
```

Matches `PHYSICS_EQUATION_VERIFICATION.md` §3.1 / Theory Paper “corrected value”. `DOMAIN_VALIDITY_THRESHOLD_M = 2e-9` in `casimir_forces.py` means this geometry is **outside** the continuum floor (`domain_valid=False` at \(d=1\,\mathrm{nm}\); see `test_paper_corrections.py`).

**Miles rate:** \(1\,W / (Q\cdot e)\):

```
23.8 MeV → 2.622483e11 He-4 s⁻¹ W⁻¹
24.0 MeV → 2.600629e11
20–28 MeV band → 3.121e11 … 2.229e11
```

`MILES_HEAT_HELIUM_RATE = 2.63e11` in `constants.py` is a 0.29% round of the 23.8 MeV identity (in-band). `MILES_RATE_PER_WATT = 1/Q_VALUE_J` in `miles_heat_helium.py` is the exact 23.8 MeV identity.

**Ceiling:** `MAX_ENHANCEMENT_FACTOR: float = 1e5` in `physics_engine/constants.py` (line 53). \(\ln(10^5)=11.512925\), matching screening-kernel exponent cap notes in the verification log.

**Wolfram gap:** `PHYSICS_EQUATION_VERIFICATION.md` already records the same MCP absence (§9A.4, §9C, §9D, §12). This review does **not** append log entries (review-first).

---

### SCI-001
- severity: blocker
- surface: science
- status: confirmed
- evidence: Public route `/bubble-fusion` (`frontend/src/pages/BubbleFusionPage.jsx`) maps `enhancementFactor: apiResults.enhancement_factor || 1e13` (line 113). `POST /api/physics/bubble-fusion` → `simulate_bubble_fusion()` (`backend/app/physics/bubble_fusion.py` lines 516–547) returns nested `collapse_results` and **does not** include a top-level `enhancement_factor`. A “successful” API run therefore always shows **Enhancement: 1.00e+13×** on a primary-colored chip (lines 269–274), plus a success snackbar “Simulation completed using real physics calculations”. Offline fallback uses `Math.pow(compressionRatio, 3) * 1e10` (line 141). Architecture Wave 0 lists `/bubble-fusion` as always mounted. This reintroduces (and exceeds) the retired \(10^8\) tunneling-enhancement overclaim on a visitor-facing page.
- recommendation: Do not ship this page until the chip is either removed, driven by a governed `claim_tier_display` ≤ \(10^5\) with a claim-tier chip and “not a measurement” caption, or the route is production-hidden. Never default a missing API field to \(10^{13}\).

### SCI-002
- severity: major
- surface: science
- status: confirmed
- evidence: Idle / no-timeline path in `UnifiedBubbleLatticeVisualization.jsx` `calculateEnhancementFactors` (lines 1657–1713) still uses the **retired** formulae documented as defects in `PHYSICS_EQUATION_VERIFICATION.md` §9C.3–9C.5: QED `E_critical = 1e8` V/m; Casimir `compressionRatio**2`; Rydberg `1 + 0.5 * cr * (E/1e8)`; Pd `U_SCREEN_EV = 800` scalar. Comment claims the preview “cannot contradict streamed results” because total is capped at \(1\mathrm{e}5\); that is false for **per-mechanism HUD values** (lines 3275–3306), which print uncapped `qed`/`casimir`/`rydberg` in exponential notation with no “schematic only” label and no claim-tier chip. Streamed path (lines 1855–1869) is honest if the backend breakdown is present; the idle path is what a visitor sees before/without a run.
- recommendation: Delete or replace the client-side QED/Casimir/Rydberg forms with the same Schwinger / strain / log-bounded Rydberg used in `bubble_lattice_interaction.py`, or stop rendering numeric mechanism HUD until a backend timeline exists. Label any schematic as non-output.

### SCI-003
- severity: major
- surface: science
- status: confirmed
- evidence: `app/physics/bubble_collapse.py` lines 436–439: `log_enhancement = min(30.0, …)` with comment “paper's predictions (10^20 - 10^30 for extreme cases)”. Public physics catalog `GET` mechanism description in `physics_routes.py` lines 589–594 sets `typical_enhancement": "10^3 - 10^30"` for `bubble_collapse`. `unified_enhancement.py` still clamps combined enhancement at **\(1\mathrm{e}20\)** (lines 865–867). `KNOWN_ISSUES.md` line 13 still says enhancement “can span … 1 to 10^8+”. `app/tests/test_bubble_collapse.py` lines 309–311 still asserts a **\(1\mathrm{e}8\)** cap on `BubbleLatticeInteraction` (“per model design”), so the test suite itself has not been updated to the governance ceiling. These are live public/docs/test surfaces, not archived notes.
- recommendation: Align every remaining catalog string, clamp, and test with `MAX_ENHANCEMENT_FACTOR = 1e5`. Treat \(10^{20}\)–\(10^{30}\) copy as a release blocker wherever it is user-visible.

### SCI-004
- severity: major
- surface: science
- status: confirmed
- evidence: `UnifiedTheoryPage.jsx` `generateLocalResults` (lines 736–764): `baseEnhancement = loadingRatio > 0.9 ? 1e5 : 1e3`, then during COLLAPSE `enhancement = baseEnhancement * (1 + 5 * …)` → up to **\(6\times10^5\)**, above the governance ceiling. This object is what the page displays when the API 404/405/5xx path fires (still possible on a mis-mounted public API). Local fallback does set `lenr_proved: false` and `EQ-OPEN-*` to `OPEN` (lines 854–868) — that part is honest — but the numeric enhancement is not.
- recommendation: Clamp local-fallback enhancement (and breakdown) at `1e5` with `is_saturated`, or refuse to render quantitative peak enhancement on `local_fallback`.

### SCI-005
- severity: major
- surface: science
- status: confirmed
- evidence: Miles **UI** is in-band: Open Questions chip `Miles 24±4 MeV/He EMP` (`open_questions.py` line 413; `OpenQuestionsVirtualLab` emp chips); Theory guide timeline “~24±4 MeV per ⁴He; gated in this app. Claim-tier EMP, not proof” (`TheoryPage.jsx` 413–416); Theory Paper §6.5 “~24 MeV thermal band … not definitive proof … reproducibility remains contested” (`TheoryPaperPage.jsx` 1041–1047); `decision_oracle.py` `MILES_MEV_MIN/MAX = 20/28`. Miles **module** contradicts: docstring “23.8 ± 0.5 MeV … exactly matching … independently confirmed by: Gozzi, Bockris, Arata, De Ninno, McKubre” (`miles_heat_helium.py` 10–13); `description` property repeats “Independently confirmed” (lines 66–69); validation gate `23.8 +/- 0.5 MeV` (lines 125–131). `energy_per_event_MeV = excess_heat / (expected_he4_rate * e * 1e6)` with `expected_he4_rate = excess_heat / Q_VALUE_J` is **identically 23.8** — the ±0.5 test cannot fail. `constants.py` line 65 still cites “Miles 1990” for a 1993 correlation. Default `excess_heat_W = 1.0` means every Miles `calculate()` emits 1 W, which 08-24 `scientificPositiveRate` classifies as positive (`excess_heat_watts > 0`).
- recommendation: Adopt \(24\pm4\) MeV + retention caveat as the only user-facing Miles band; label 23.8 MeV as the nuclear Q-value, not the experimental equality. Remove “independently confirmed” / “exactly matching”. Stop treating a tautological identity as validation. Do not default 1 W as if it were a measurement.

### SCI-006
- severity: major
- surface: science
- status: confirmed
- evidence: Governance rule: a claim-tier chip is required next to any quantitative UI claim; `theoryGovernance.ts` is the frontend SoT (`CLAIM_TIER_MULTIPLIER` matches `theory_scoring.py`). Chips **are** present on Unified Results (`ReactionRateGovernancePanel`, `TheoryTogglePanel`, `TheoryTestbedCard`, `OpenQuestionsVirtualLab` `TierChip`, `PredictionReadoutPanel`). They are **absent** beside: Theory guide tunneling \(10^3\)–\(10^5\) (`TheoryPage.jsx` 354–358, including a **success**-severity Alert); Casimir \(-1.3\,\mathrm{mN}\) (`TheoryPage.jsx` 344; `TheoryPaperPage.jsx` 618); Theory Paper tunneling \(10^3\)–\(10^5\) (line 693); BubbleFusion enhancement chip (SCI-001); visualization HUD (SCI-002); Quantum Tunneling “Total: …×” (`QuantumTunnelingPage.jsx` 175–177); Analytics **Avg Enhancement** card (`AnalyticsPage.jsx` 726–732) which prints the SQL mean including saturated \(1\mathrm{e}5\) rows with no capped chip (transparency doc even says Overview numeric column is unchanged). Theory Paper §6.3 states CCS “tunnelling enhancement can reach \(10^{40}\)” (`TheoryPaperPage.jsx` 1032–1033) with **no** adjacent speculative chip (unlike TSC 6.1).
- recommendation: Put a `CLAIM_TIERS` chip (or page-local equivalent tied to `theoryGovernance.ts`) immediately beside every quantitative science number on public pages. Either label Vysotskii \(10^{40}\) as literature-claim / display-capped, or drop the raw \(10^{40}\) from the curated paper view.

### SCI-007
- severity: major
- surface: science
- status: confirmed
- evidence: `AboutPage.jsx` Disclaimer (lines 106–113): “simulations are based on theoretical models and may not perfectly represent real-world LENR phenomena … no claims regarding the accuracy or completeness … for predicting actual experimental outcomes.” Compare Analytics Overview (`AnalyticsPage.jsx` 820–822): auto-saved runs are **model outputs, not laboratory experiments**; more simulations do not raise claim tiers or close EQ-OPEN. History caption (968–973) explicitly denies \(P(\mathrm{LENR})\) and laboratory tunneling. About is a public first-impression route (`/about`) and does not say: model vs experiment, `lenr_proved` is false, EQ-OPEN remain open, or that campaign/History rows are not lab data. Home (`Home.tsx` 36) markets “high precision” with no science disclaimer at all.
- recommendation: Mirror the Analytics model-output / not-a-laboratory / EQ-OPEN sentence on About (and a one-line Home footer). Soften “high precision”.

### SCI-008
- severity: minor
- surface: science
- status: confirmed
- evidence: Casimir \(-1.3\,\mathrm{mN}\) is the correct ideal-conductor evaluation (independent check above; `test_paper_corrections.py`). Theory Paper “Corrected Force Calculation” (`TheoryPaperPage.jsx` 612–624) and Theory guide (`TheoryPage.jsx` 344) present it as the corrected number without stating `DOMAIN_VALIDITY_THRESHOLD_M = 2e-9` / `domain_valid=False` at \(d=1\,\mathrm{nm}\). Green `CheckCircleIcon` on the Casimir heading (Theory Paper 605) reads as “established result” for a geometry the code itself flags as out of domain (§9C.5).
- recommendation: Adjacent to \(-1.3\,\mathrm{mN}\), state modeled geometry **and** that \(d=1\,\mathrm{nm}\) is below the 2 nm continuum floor (extrapolation, not a lab force).

### SCI-009
- severity: minor
- surface: science
- status: confirmed
- evidence: `electron_screening.py` `EXPERIMENTAL_SCREENING['palladium'] = {'Ue': 800, 'Ue_range': (300, 800), …}` (lines 35–36). Experimental model returns the **point** `Ue=800` (lines 79–86), not the range. Idle viz hardcodes `U_SCREEN_EV = 800`. Rigor rule: never a single hardcoded 800 eV scalar (RR-007/IL-004). Canonical bubble kernel uses `get_screening_potential_range` (verification §9C.1 / §9C.14) — that path is honest; the legacy module and viz are not.
- recommendation: Drive every Pd screening display from the cited range; if a typical is shown, label it typical-in-range, not *the* Ue.

### SCI-010
- severity: minor
- surface: science
- status: confirmed
- evidence: Theory Paper §6.4 Swartz “demonstrated reproducible excess heat at MIT” (`TheoryPaperPage.jsx` 1036–1038) without EMP/SPEC chip. Takahashi module docstring “The TSC model **explains why** He-4 is the primary product” (`takahashi_tsc.py` 11–14) — mechanism presented as explanation, while UI correctly calls TSC speculative (`TheoryPaperPage.jsx` 1013–1020). `theoryGovernance.ts` glossary for `validated_lenr_mechanism`: “Mechanism with **reproducible LENR observations** …” (lines 54–59). No production theory module sets `claim_tier="validated_lenr_mechanism"` (only tests/fixtures); the glossary still implies such a class exists as an achieved LENR validation.
- recommendation: Tone Swartz/Takahashi copy to EMP/SPEC. Narrow the validated-tier glossary to “reserved; not currently assigned to a lattice-LENR mechanism” (two-body is `established_reference`, not validated LENR).

### SCI-011
- severity: accepted-residual
- surface: science
- status: confirmed
- evidence: `two_body` is the default on `UnifiedSimulationRequest.rate_mode` (`unified_simulation.py` ~191–195 and ~1167–1172), `UnifiedTheoryPage` `useState('two_body')` (line 430), `compute_reaction_rate` dispatcher (reaction_rate_engine.py 361–383), and campaign grids. Invalid modes fall back to `two_body` (`test_open_questions_contract.py`). `trapped_state` is a separate menu item labeled “speculative TSC” (UnifiedTheoryPage 1483–1484). Non-two-body responses keep `two_body_reference`. Open Questions flags `tsc_enhancement_can_scale_two_body` as a leak, not a silent replace. RR-006 holds on the canonical `/api/unified` path.
- recommendation: Keep; do not let bubble-fusion / local-fallback (SCI-001/004) become an implicit third rate that overwrites the baseline.

### SCI-012
- severity: accepted-residual
- surface: science
- status: confirmed
- evidence: `open_questions.py` line 488 `"lenr_proved": False`. Import of reviewer packs refuses `lenr_proved=true`. Unified local fallback hard-codes false. Open Questions header: “Not a nature theorem. Not LENR_PROVED.” E2E `open-questions-virtual-lab.spec.js` asserts `LENR_PROVED` count 0. Campaign invariants and `ANALYTICS_TRANSPARENCY.md` keep the flag false. No UI string “LENR proved” on Analytics (test coverage).
- recommendation: Keep the pack-import refuse and UI copy. Do not let Miles “occurrence anchored” (green chip, `OpenQuestionsVirtualLab.jsx` 259–266) be read as proved — body text currently says mechanism path remains open.

### SCI-013
- severity: accepted-residual
- surface: science
- status: confirmed
- evidence: All five `EQ-OPEN-*` remain in `open_ids` (`open_questions.py` 481–485). Q1/Q2/Q4/Q5 rows render `status: OPEN` with warning chips. `EQ-OPEN-RATE-01` on two-body is `BUDGET_DOES_NOT_CLOSE` (line 374) — a negative determination, not a discharge. `OpenChallengesSection.jsx` 43–45 states the five IDs remain **OPEN**. Analytics caption: more simulations do not close EQ-OPEN (line 822). 08-26 Lean “would-close-if” is documented as not discharging obligations (`CHANGELOG.md`, `ReferencesSection.jsx`).
- recommendation: Keep `BUDGET_DOES_NOT_CLOSE` as a determination subtitle, but keep the obligation chip/list showing OPEN so visitors do not think Q3 is solved.

### SCI-014
- severity: accepted-residual
- surface: science
- status: confirmed
- evidence: 08-27 History honesty: `formatEnhancement` emits `≥1e5 (capped)` with tooltip “Governance ceiling 1e5, not a physical prediction” (`AnalyticsPage.jsx` 185–201, 1079–1086). Tests lock the string (`AnalyticsPage.test.jsx` 272). Backend `enhancement_history.py` documents the same. 08-27 association rank: header “Model association %”; caption “not a laboratory probability that LENR occurs” (968–970); `AssociationRankPanel.jsx` 46–47 “This is model association, not empirical P(LENR).” Sort/menu use the same label, not “P(LENR)”. 08-24 completion vs scientific-positive: UI title is **Completion Rate** not Success Rate (`AnalyticsPage.jsx` 709; test asserts Success Rate absent). Caption: “Neither card validates LENR” (750–752). Residual: `successRate` remains an API alias; **Avg Enhancement** and Overview enhancement chart still plot raw SQL \(1\mathrm{e}5\) without the capped chip (SCI-006); scientific-positive is green (`success.main`) and will rise if Miles 1 W / TSC `energy_output_watts` persist (SCI-005).
- recommendation: Optional: apply the capped chip on Overview/average; keep `successRate` alias out of any visible label (already done).

### SCI-015
- severity: needs-operator
- surface: science
- status: needs-operator
- evidence: WolframAlpha MCP (`user-wolframalpha` / `get_simple_answer`) is not registered in this Cloud Agent catalog (Context7, cursor, cursor-cloud, cursor-subscriptions, Slack only). Casimir, Miles rate, and \(1\mathrm{e}5\) were checked analytically against `PHYSICS_EQUATION_VERIFICATION.md` (see Independent numeric checks). Prior log entries already note the same gap.
- recommendation: Operator: authenticate `user-wolframalpha` and re-query Casimir \(A=1\,\mu\mathrm{m}^2, d=1\,\mathrm{nm}\); \(1/Q\) at 23.8 MeV; Schwinger \(E_\mathrm{cr}\). Do not treat in-repo CODATA arithmetic as a substitute for the numeric quality-gate oracle.

---

## 08-24..08-27 overclaim hunt (short)

Honest work in that window (completion vs scientific-positive, model-output persist copy, association % label, History capped chip, `lenr_proved` refuse on pack import, EQ-OPEN N chips “not closure”) is **real** on Analytics / Open Questions / Unified. The leak is **older public physics pages and idle viz** that were not brought under the same governance, plus Miles module copy that 08-26 campaigns now **amplify** into History as EMP-looking 1 W positives.

Canonical band holders: `physics_engine/constants.py`, Theory Paper §2.8 / guide abstract, `PredictionReadoutPanel`, History formatter, Open Questions `f ≤ 10^5` two-body budget text.

---

## Go/no-go (science honesty only)

**No-go** until SCI-001 (`/bubble-fusion` \(10^{13}\) chip) is removed or governed. SCI-002/003/004/005/006/007 should be treated as **major** public-copy defects, not accepted residuals.
