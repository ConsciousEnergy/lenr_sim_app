# v0.3.6-beta Session Change Summary (2026-04-18, updated 2026-05-06)

This document captures the concrete code, doc, and CI changes landed in the current E2E hardening pass.  It is intended as the source of truth reviewers need before signing off on the release candidate and as the starting point for the follow-on UI/UX pass.

## Backend

### New module: `backend/app/physics_engine/theories/stellar_scaling_mhd.py`
- `StellarScalingMHDTheory` implements the `TheoryModule` protocol.
- Strict applicability gate: `T ≥ 1e6 K ∧ B ≥ 1e4 T ∧ n ≥ 1e24 /m³`.
- Alfven-speed-based raw enhancement attenuated by `_stellar_extrapolation_penalty(T, B)` which decays exponentially with distance from the stellar reference point `(log10 T = 6, log10 B = 4)`.
- Output is clamped at `MAX_ENHANCEMENT_FACTOR`; `claim_tier="speculative_exploratory"`, `evidence_class="cross_regime_extrapolation"`, and falsification criteria are emitted.
- Transparency observables: `extrapolation_penalty`, `class_aware_weight`, `stellar_contribution_log10`, `regime_applicable`.

### Pipeline: `backend/app/physics_engine/theory_pipeline.py`
- `THEORY_COMPOSITION_GROUPS` adds `"stellar_scaling_mhd": "context_line"` so the track has its own isolated composition group.
- `get_default_pipeline` registers the new `StellarScalingMHDTheory` under a Phase-3 "context/comparison tracks" header.

### Scoring: `backend/app/physics_engine/theory_scoring.py`
- Added `CLAIM_TIER_MULTIPLIER` table (validated 1.00, empirical 0.90, speculative 0.30, cross-regime 0.20).
- Multiplier applied in both applicable and inapplicable scoring paths; response now includes `final_score`, `raw_score_pre_tier`, `claim_tier`, and `claim_tier_multiplier`.

### Tests: `backend/tests/test_theory_modules.py`
- New `TestStellarScalingMHD` class (6 tests) covers protocol compliance, LENR-regime gating, stellar regime applicability, bounded enhancement, transparency fields, and claim-tier multiplier plumb-through.
- Backend suite: **315 passed, 1 skipped** (up from 309).

## Frontend

### `frontend/src/components/physics/TheoryTogglePanel.tsx`
- Added `claim_tier` chip next to the existing `evidence_class` chip with hover explanations and color coding (`validated` = success, `empirical` = primary, `cross_regime` = warning, default = grey).
- Chip container now has `flexWrap: "wrap"` so multiple chips don't collapse on narrow panels.

### Version markers
- `frontend/src/components/analytics/RelevanceMap.tsx` @version jsdoc updated from `0.3.4-beta` → `0.3.6-beta`.
- `frontend/package.json` and `frontend/src/config/version.js` remained at `0.3.6-beta` (already correct).

### Test evidence
- Frontend Jest: **13 suites, 96 tests passed, 0 failed** (423.7 s, `--runInBand`).

## Infrastructure, CI, Docs

### `.github/workflows/test.yml`
- New `version-consistency` job runs before `test` and `frontend`; extracts `APP_VERSION` from `backend/core/config.py` and fails fast if any of the following drift: `frontend/package.json`, `frontend/src/config/version.js`, `Dockerfile.backend BUILD_VERSION`.
- `test` and `frontend` jobs both gained per-job `permissions: contents: read` and `needs: version-consistency`.

### `.github/dependabot.yml` (new)
- Weekly pip (backend) and npm (frontend) updates, monthly github-actions and docker updates.
- npm groups: `mui`, `react-three`, `testing`.  (`react-scripts` ignore reflected the initial 2026-04-18 state before the 2026-05-06 Vite migration completion.)
- Pydantic major-version updates ignored until v2 migration completes.

### `LENR_SIM_APP_v2/infrastructure/docker/Dockerfile.backend`
- `BUILD_VERSION=0.3.5-beta` → `0.3.6-beta`.

### `LENR_SIM_APP_v2/infrastructure/ansible/group_vars/all.yml`
- `app_version: "0.3.0-beta"` → `"0.3.6-beta"`.

### Docs
- `docs/v0.3.6-beta/RUBRIC_GOVERNANCE.md`: new two-axis (evidence class × claim tier) semantics tables, scoring-multiplier table, and "why both are shown in the UI" explanation.
- `docs/v0.3.6-beta/RELEASE_EVIDENCE_PACK.md`: refreshed CI evidence, added Scoring/Governance and Automated-Test Evidence sections, and expanded the residual-risk statement (CRA, Phase-1 electrolyte bounds, stellar-scaling interpretation).
- `CHANGELOG.md`: expanded v0.3.6-beta section with stellar-scaling, claim-tier scoring, governance UI chips, CI hardening, and test counts.

## Verification checklist

| Gate                                              | Status  |
| ------------------------------------------------- | ------- |
| Backend pytest (315 passed / 1 skipped)           | Green   |
| Frontend Jest (96 passed / 13 suites)             | Green   |
| Version consistency (backend/frontend/docker)     | Green   |
| Scientific guardrails regression                  | Green   |
| Stellar-scaling regime gate                       | Green   |
| Stellar-scaling bounded enhancement               | Green   |
| Claim-tier down-weighting in scoring output       | Green   |
| Dependabot config lint (`yq .` round-trip)        | N/A     |

## Follow-on implementation update (2026-05-06)

### Frontend toolchain migration completed in v0.3.6-beta scope
- CRA tooling was replaced with Vite for dev/build workflows:
  - `frontend/package.json` scripts moved to `vite` (`start/dev/build/preview`).
  - Added `frontend/vite.config.js` with API/WebSocket proxy configuration and `process.env.REACT_APP_*` compatibility defines.
  - Frontend entrypoint moved to `src/index.jsx` and wired via root `index.html`.
- Standalone lint/test workflow restored after CRA removal:
  - Jest runs through explicit `jest.config.js`.
  - Babel dependencies explicitly pinned for Jest transforms.
  - ESLint dependencies restored to keep `npm run lint` available in local/CI checks.

### Electrolyte phase-1 contract propagation finalized
- Unified bubble-lattice route now supports canonical top-level `electrolyte` payload with fallback to lattice fields.
- Added bounded electrolyte proxy fields and propagation:
  - `solvent_type`
  - `ph_proxy`
  - `ionic_strength_proxy`
- `observables_bridge`, `electrolyte_diagnostics`, and regime-validity flags now carry these fields end-to-end.
- Added integration verification for top-level electrolyte override behavior in
  `backend/tests/test_integration/test_simulation_pipeline.py`.

### UI/UX overlap and scale-control refinements
- Desktop zoom controls were repositioned and grouped under the right-side layer/legend toggle stack to avoid overlap with left-side content.
- Mobile-only zoom controls remain managed by `TouchControls`.
- Adaptive scale regime switching now uses camera-to-orbit-target distance for more stable lattice/bubble transition behavior during panning.

## Remaining deferred items (post-beta maintenance)

- Broader electrochemistry (full speciation and transport) remains out of beta scope; current Phase-1 salt modifiers stay bounded in the `[0.7, 1.2]` activity window.

## Next work block (UI/UX)

With the scientific contract and governance posture now locked, the next session focuses on frontend UI/UX work.  Candidate follow-ups (to be prioritised together with the user):

1. **Theory scoring panel**: surface `raw_score_pre_tier` and `claim_tier_multiplier` in a compact "why this score?" tooltip.
2. **Stellar-scaling visibility**: add a dedicated "Context tracks" affordance so the stellar line is always rendered but visually distinct from empirical LENR theories.
3. **Electrolyte transparency**: promote `electrolyte_diagnostics.support_level` into the simulation-control panel.
4. **Regime-gate feedback**: when a theory's `is_applicable=false`, show the explicit gate reason inline so users understand why confidence collapsed.
5. **Governance glossary**: in-app drawer linking `evidence_class` / `claim_tier` chips to the new `RUBRIC_GOVERNANCE.md` semantics tables.
