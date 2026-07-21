# LENR Scientific Rigor Review and Remediation (2026)

**Status:** Living document. Aggregates findings, severity, owning phase, and fix
status for the 2026 rigor review. **Extends** (does not replace) the 2025 audit
suite: [LENR_AUDIT_INDEX.md](../LENR_AUDIT_INDEX.md),
[LENR_FRAMEWORK_ISSUE_LEDGER.md](../LENR_FRAMEWORK_ISSUE_LEDGER.md) (IL-001..IL-018).

**Finding scheme:** `RR-xxx` (Rigor Review). Cross-references existing `IL-xxx`
where the 2025 audit already captured the issue.

**Citation policy:** [CITATION_STANDARD.md](CITATION_STANDARD.md).
**Traceability:** [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md).

---

## How to use this report

- Each finding has an ID, severity, owning phase, and status.
- Code/paper/test changes made during remediation must reference a finding ID
  (e.g. a commit or comment noting `RR-007`).
- Status values: `open`, `in_progress`, `resolved`, `wontfix`, `deferred`.

Severity:
- **A (blocker):** internal contradiction, wrong magnitude, or unsupported claim
  that changes predictions or undermines the paper's proof.
- **B (rigor):** missing citation, missing uncertainty, claim-tier gap, or
  modeling simplification that should be documented/upgraded.
- **C (engineering):** correctness-adjacent app quality (API/UX/CI/perf/deploy).

---

## Findings register

| ID | Severity | Owning phase | Title | Status | Cross-ref |
|----|----------|--------------|-------|--------|-----------|
| RR-001 | A | 1, 13 | Abstract "10^8" tunneling enhancement contradicts adopted 10^3-10^5 | resolved (paper) | IL-002 |
| RR-002 | A | 1, 13 | Reference [12] (Meng et al.) miscited: halo *nuclei* used for "halo electrons" | resolved (paper) | — |
| RR-003 | A | 1, 13 | Part 1 vs Part 2 numeric conflicts (Casimir, tunneling, cross-section, QED coupling) | resolved (paper) | IL-001 |
| RR-004 | B | 1, 13 | Uncited multipliers: BEC 3-5x mass/cooling/density, ENC C_ENC 10-100x | resolved (labelled) | — |
| RR-005 | B | 1, 3, 13 | Code references are author/year + arXiv only; no DOIs under physics_engine | resolved (canonical DOI register + paper biblio map) | — |
| RR-006 | A | 5 | Reaction rate uses two-body collision formula; CMNS literature says trapped-state rate higher by ~19-20 orders | resolved (engine: two_body + trapped_state + Sobol/Bayesian UQ) | — |
| RR-007 | B | 2, 5 | Single hardcoded screening potential (800 eV) vs measured material-dependent range | resolved (data module; UQ wiring Phase 5) | IL-004 |
| RR-008 | B | 1, 3 | Contested mechanisms (Widom-Larsen) lack cited critiques | resolved (paper) | — |
| RR-009 | B | 4 | Benchmark gates check contracts/parity, not agreement with published experiment | resolved (experiment-anchored gates added) | — |
| RR-010 | B | 4 | He-4/heat correlation stated as equality, not band + retention caveat | resolved (Miles 24+/-4 MeV band gate) | — |
| RR-011 | B | 6 | MeV-gap narrative not grounded in strongest current down-conversion physics | resolved (MEV_GAP_HYPOTHESIS.md, claim-tier gated) | — |
| RR-012 | B | 6 | No principled cavitation field coupling (KG-RP harmonic locking) | resolved (cavitation_kgrp.py 6a+6b) | — |
| RR-013 | B | 7 | Nuclear product/branching ignores shell-structure selection rules | resolved (shell_pairing_prior.py, branching-only) | — |
| RR-014 | C | 8 | Dual unified implementations (package vs legacy monolith) | resolved (monolith deprecation banner; package canonical) | — |
| RR-015 | C | 8 | Hydroton deprecation not finalized; duplicate phonon logic risk | resolved (flag-gated + deprecation banner) | — |
| RR-016 | C | 9 | New outputs (rate CI, KG-RP diagnostics) not surfaced with claim tiers in UI | resolved (ReactionRateGovernancePanel.tsx) | — |
| RR-017 | C | 10 | Run export envelope lacks seeds + per-run citation list | resolved (run_export.py + /export endpoint) | — |
| RR-018 | C | 11 | New modules lack coverage; experiment benchmarks not release-blocking | resolved (30 new tests + release-blocking CI step) | — |
| RR-019 | C | 12 | Heavy UQ ensembles not optimized; could block routes | resolved (opt-in UQ + vectorized two-body path) | — |
| RR-020 | B | 13, 14 | No single canonical bibliography; orphan claims/citations both directions | resolved (paper supplementary biblio + matrix register) | — |

---

## Severity-A detail (fix first)

### RR-001 — Abstract 10^8 vs body 10^3-10^5 (IL-002)
Abstract (line ~8) claims tunneling enhancement "exceeding 10^8"; the corrected
body and 2025 resolution adopt **10^3-10^5**. Rate scales linearly with this
factor, so the contradiction changes predictions by ~10^3. **Action:** adopt
10^3-10^5 everywhere; annotate the revision; remove the 10^8 abstract claim.

### RR-002 — Meng et al. miscitation
Lines ~102-103 already flag that ref [12] (Meng et al. 2013) concerns *halo
nuclei*, not "halo electrons." **Action:** remove/replace the citation with a
correct source for delocalized interface electrons, or reframe the claim as a
model construct without that citation.

### RR-003 — Part 1 vs Part 2 conflicts (IL-001)
Part 2 LaTeX retains superseded values (e.g. Casimir "10^-7 N" vs adopted
**-1.3 mN**). **Action:** reconcile Part 2 to Part 1 (authoritative) per
[LENR_CONSISTENCY_RESOLUTIONS.md](../LENR_CONSISTENCY_RESOLUTIONS.md).

### RR-006 — Rate formalism gap (NEW, high impact)
`calculate_reaction_rate` in
[cross_sections.py](../../LENR_SIM_APP_v2/backend/app/physics_engine/unified_lenr_model/cross_sections.py)
computes `0.5 * n^2 * sigma * v_thermal * P` — a two-body free-particle rate.
Takahashi, *Fundamental of Rate Theory for CMNS*, JCMNS 19 (2016), argues this
**underestimates trapped-state CMNR rates by ~19-20 orders of magnitude**, and
that the correct formalism is **Fermi's golden rule with a nuclear optical
potential + time-dependent barrier penetration** during cluster condensation
(TSC/EQPET), keyed on finite trapped-state lifetime and sub-pm d-d distance.
**Action (Phase 5):** add a `trapped_state` rate mode beside the `two_body`
baseline, both claim-tier labeled; do **not** silently replace the baseline.

---

## Deep-research source map (2024-2026 scan)

These sources drive the remediation and feed the Phase 13 bibliography. Full
formatting + keys live in [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md).

| Key | Source | Used for |
|-----|--------|----------|
| takahashi2016 | Takahashi, JCMNS 19, 298 (2016), "Fundamental of Rate Theory for CMNS" | RR-006 rate formalism |
| hagelstein2025 | Hagelstein, "Relativistic Phonon-Nuclear Coupling Matrix Element for D2/4He" (2025) + lossy spin-boson reviews | RR-011 MeV-gap down-conversion |
| steinetz2020exp | Steinetz et al., Phys. Rev. C 101, 044610 (2020) | RR-009 NASA LCF neutron benchmark |
| pines2020theory | Pines et al., Phys. Rev. C 101, 044609 (2020) | RR-007 screening (Ue~347 eV ErD3) |
| raiola2002 / huke2008 | d(d,p)t screening in metals, periodic table | RR-007 screening range |
| czerski2023 | Electron screening in palladium, Phys. Lett. B (2023), doi:10.1016/j.physletb.2023.137750 | RR-007 screening range |
| screeningreview2024 | Electron Screening in Laboratory Nuclear Reactions, Particles 7(3):50 (2024), doi:10.3390/particles7030050 | RR-007 screening range |
| miles1993 / mckubre2008 | Miles; McKubre He-4/heat correlation | RR-010 He/heat band |
| storms2015 | Storms review, Curr. Sci. 108, 574 (2015) | RR-010 He/heat band |
| tennfors2013 | Tennfors, EPJ Plus 128:15 (2013), doi:10.1140/epjp/i2013-13015-3 | RR-008 Widom-Larsen critique |
| mulnix2026 | Mulnix, KG-RP structural theory, doi:10.5281/zenodo.19079074 | RR-012 cavitation coupling |
| nguyen2026 | Nguyen et al., Nature (2026), doi:10.1038/s41586-026-10616-2 | RR-013 shell-pairing prior |
| floquetwkb2026 | Floquet-WKB lattice confinement fusion, doi:10.14293/PR2199.002776.v1 | RR-006/RR-011 driven barrier + Bayesian UQ |

---

## Experiment-anchored validation gates (Phase 4)

Added `backend/tests/test_integration/test_experiment_anchored_gates.py`
(7 gates, all passing). These convert experimental observables into falsifiable
regression tests:

| Gate | Anchored observable | Falsifier |
|------|--------------------|-----------|
| `miles_he4_heat_correlation_band` | 24 +/- 4 MeV per He-4 (Miles 1993) | clean D+D->He-4 Q-value leaves 20-28 MeV band |
| `he4_is_primary_clean_lenr_ash` | He-4 primary ash (McKubre/Storms) | Pd-D default product not He-4 |
| `clean_he4_branch_is_aneutronic` | low neutron/gamma flux | heat branch emits n/gamma |
| `nasa_lcf_erbium_screening_anchor` | ErD3 U_e~347 eV (Steinetz/Pines 2020) | erbium prior excludes 347 eV |
| `nasa_lcf_light_ion_channels_present` | p-Li7->2alpha (17.347 MeV) | channel missing/wrong Q |
| `parkhomov_subset_reproducible_exact_matches` | Parkhomov (2018) subset | curated rows stop validating |
| `screening_ranges_are_ordered_and_cited` | RR-007 material ranges | range unordered/uncited |

The Parkhomov curated subset is documented in
`backend/app/physics_engine/parkhomov_validation.py` (40-row subset of the
~519k-entry 2018 database). Falsifiability checks are encoded as the gate
"falsifier" conditions above; the enhancement cap (<=1e5) gate already lives in
`test_physics_benchmark_gates.py`.

## Reaction-rate engine (Phase 5, RR-006)

New modules (no new dependencies; numpy + scipy only):
- `unified_lenr_model/reaction_rate_engine.py` -- `compute_reaction_rate(mode=...)`
  with `two_body` (validated tier, conservative baseline reusing the existing
  `cross_sections.calculate_reaction_rate`) and `trapped_state` (speculative
  tier, Takahashi TSC Fermi-golden-rule formalism evaluated at sub-pm
  separation). Bounded coherent many-body `collective_factor`
  (cap = 1e6, model assumption). Every result carries `claim_tier` + citation keys.
- `unified_lenr_model/reaction_rate_uq.py` -- `propagate_rate_uncertainty(...)`:
  deterministic Sobol propagation over cited priors (screening range,
  1e3-1e5 tunneling enhancement, trap separation/lifetime), reporting
  p05/p25/p50/p75/p95 intervals and a variance-based sensitivity ranking;
  optional log-normal Bayesian importance-weighting against an experimental
  rate band (posterior credible interval). Seeded -> reproducible.

Key properties enforced by tests (`tests/test_physics/test_reaction_rate_engine.py`,
9 passing): baseline is never silently replaced (default = two_body);
trapped_state > two_body at sub-pm separation; collective factor hard-capped;
UQ deterministic for a fixed seed; trap separation dominates trapped-state
variance (exponential barrier sensitivity).

## Backend / API consistency (Phase 8)

- **Additive API wiring** (`api/routes/unified_simulation.py`): `SimulationRequest`
  gains optional `rate_mode`, `include_uncertainty`, `uncertainty_samples`,
  `random_seed`, `experimental_band`; `SimulationResponse` gains a
  `reaction_rate_engine` block (rate result + optional UQ + shell-pairing
  branching). Defaults preserve legacy behaviour (two_body, no UQ); the block is
  built in a defensive helper that returns `{}` on any failure so the core
  response is never broken. Verified by `tests/test_integration/test_rate_engine_api.py`.
- **Canonical model (RR-014):** the `unified_lenr_model/` package is canonical;
  the same-named legacy `.py` monolith is shadowed by the package and now carries
  a deprecation banner.
- **Hydroton (RR-015):** registered only behind `ENABLE_LEGACY_HYDROTON` (off by
  default); deprecation banner added; phonon overlap directed to
  `hagelstein_phonon` / `nae_model`.
- **Router cleanup:** confirmed no lingering imports of the removed routers
  (`parameters`, `presets_routes`, `simulation_router/_routes`, `simulations`,
  `visualizations`) in `main.py` or app code.
- **Port topology:** governed by existing
  `docs/v0.3.6-beta/PORT_TOPOLOGY_POLICY.md` (no change needed).

## Frontend / UX (Phase 9)

- `frontend/src/components/physics/ReactionRateGovernancePanel.tsx` (new):
  surfaces the `reaction_rate_engine` block with a claim-tier chip (reusing
  `theoryGovernance.ts` `CLAIM_TIERS`, the governance source of truth), the
  reaction-rate point estimate, the Sobol/Bayesian credible-or-predictive
  interval (p05..p95 + sensitivity drivers), and KG-RP locking diagnostics.
  Includes an explicit empty state and a11y (`role="region"`, aria-labels,
  tooltip descriptions). No copy asserts evidence beyond the claim tier.
- `frontend/src/config/theoryVisualizationMap.js`: added the missing
  `stellar_scaling_mhd` entry (tagged `cross_regime_extrapolation`) and a
  `kgrp_harmonic_locking` diagnostic overlay (tagged `speculative_exploratory`)
  so the viz map stays a complete consistency source of truth.

## Testing / CI / security (Phase 11)

- 30 new tests covering the reaction-rate engine + UQ, KG-RP diagnostics +
  coupled field, shell-pairing prior, run-export envelope, and the additive API
  block (all passing).
- `.github/workflows/test.yml`: added a release-blocking **experiment-anchored
  science gates** step running the new gate + module suites. Existing security
  gates retained: backend `pip-audit`, frontend `npm audit --audit-level=high`,
  coverage upload, version-consistency gate.
- `.github/dependabot.yml` (pip/npm/github-actions/docker) and
  `.github/workflows/dependency-review.yml` already in place.

## Performance / deployment (Phase 12)

- UQ is opt-in (`include_uncertainty=False` default) and the Bayesian band
  weighting is optional, so heavy ensembles never block the default route.
- `reaction_rate_uq.py`: the two-body path is now vectorised - the baseline rate
  is computed once at P=1 and scaled by the tunneling-probability array,
  eliminating per-sample cross-section lookups (identical results; RR-019). The
  trapped-state path keeps the per-sample loop because it is non-linear in trap
  separation. Sample count is bounded (default 256, max 4096).
- Deployment readiness governed by existing `docs/DEPLOYMENT_CHECKLIST.md` /
  `DEPLOYMENT_QUICK_REFERENCE.md`, `docker-compose.yml`, and Dev/Test/Prod env
  config (`core/config.py` `EnvironmentType`); no regressions introduced.

## Paper finalization (Phase 13)

- Added a **Supplementary References (2026 Rigor Review additions)** section
  (refs 18-32) to the paper, each tagged with the canonical citation key and a
  DOI where available, so every remediation claim resolves to a source in both
  directions. Combined with the original refs 1-17, the paper now carries a
  single canonical bibliography aligned with the matrix register (RR-005,
  RR-020).
- Prior Phase 1 edits (abstract 10^3-10^5, Meng [12] correction, Casimir
  reconciliation, model-assumption labels, Widom-Larsen/Tennfors critique)
  remain applied.

## End-to-end verification (Phase 14)

- Backend regression: `pytest tests/test_integration tests/test_physics` →
  **149 passed**; new gate/module suites → **30 passed**.
- Full suite `pytest tests/ app/tests/` → **662 passed, 9 skipped, 2 failed**.
  The 2 failures (`TestPhysicsCalculations`) pass in isolation and as a class;
  they only fail under full-suite request flooding (rate-limit 429), a
  pre-existing test-isolation issue documented in VERIFICATION_GATE_REPORT.md,
  not a regression from the additive 2026 changes.
- VERIFICATION_GATE_REPORT.md updated with the 2026 section.
- Issue-ledger items IL-001/IL-002/IL-004 marked RESOLVED.
- **All 20 findings RR-001..RR-020 now resolved.**

## Change log
- 2026-06-04: Report created (Phase 0). Findings RR-001..RR-020 registered.
- 2026-06-04: Phases 1-14 implemented. All RR-001..RR-020 resolved; engine,
  KG-RP, pairing prior, export, UI panel, CI gates, and paper bibliography
  delivered. 30 new tests passing; gate report + issue ledger updated.
- 2026-06-04: Phase 1 paper edits applied. RR-001 (abstract 10^3-10^5), RR-002
  (Meng [12] correction), RR-003 (Part 2 Casimir reconciled to -1.3 mN), RR-004
  (BEC/ENC multipliers labelled model assumptions), RR-008 (Widom-Larsen Tennfors/
  Ciuchi critique cited) resolved at the paper level. DOI/bibliography completion
  tracked under RR-005/RR-020 for Phase 13.
