# PR #26 Conflict Map (v0.3.6-beta)

## Branch context
- Base release branch: `origin/lenr_sim_app_v0.3.6-beta`
- Visualization branch: `origin/ux-ui-v0.3.6-beta-scale-calibration`
- Current working branch: `ux-ui-v0.3.6-beta-scale-calibration`

## Conflict scan method
- Pulled latest refs with `git fetch --all --prune`.
- Compared branch delta via:
  - `git diff --name-status origin/lenr_sim_app_v0.3.6-beta...HEAD`
  - `git merge-tree <merge-base> origin/lenr_sim_app_v0.3.6-beta origin/ux-ui-v0.3.6-beta-scale-calibration`
- Result: **no textual conflict markers** from merge-tree output; integration risk is behavioral/regression, not line-level merge failure.

## File-level risk classification

### Medium risk (UI behavior / user-visible science semantics)
- `frontend/src/components/visualizations/QuantumFluxVisualization.js`
- `frontend/src/components/visualizations/UnifiedBubbleLatticeVisualization.jsx`
- `frontend/src/components/visualizations/VisualizationLegend.jsx`

### Low risk (new utility + tests)
- `frontend/src/components/tests/QuantumFluxScaleBar.test.js` (new)
- `frontend/src/utils/materialScale.ts` (new)
- `frontend/src/utils/tests/materialScale.test.ts` (new)

## Resolution policy applied
1. Preserve release contract fields from backend (`transmutation_validation`, electrolyte diagnostics, guardrails flags).
2. Keep scale-calibration additions additive and isolated to visualization utilities.
3. Require validation bundle after merge:
   - `npm run build`
   - `npm test -- src/components/tests/QuantumFluxScaleBar.test.js --watchAll=false --runInBand`
   - `python -m pytest tests/test_scientific_guardrails.py tests/test_integration/test_simulation_pipeline.py -q`
   - `python -m pytest tests/test_theory_modules.py -q`

## Validation status
- Build/tests listed above were executed locally and passed in this release cycle.
- Unified Theory page regression suite also passes after API config compatibility fix:
  - `npm test -- src/pages/UnifiedTheoryPage.test.jsx --watchAll=false --runInBand`

