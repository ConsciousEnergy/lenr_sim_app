# PR: LENR Simulation App v0.3.5-beta — Physics Engine Fixes and Documentation

## Summary

This PR addresses the critical peak temperature display bug on the Unified Theory page and verifies Phase 1–2 physics engine changes. Documentation is updated for release.

## Changes

### 1. Critical Fix — Peak Temperature Capping

**Issue:** Unified Theory page displayed "Peak Temp: 4561642589 K" (4.5 billion K), exceeding REGIME_MAX_TEMPERATURE limits (1e4, 5e3, 1e5 K) from physics.

**Root cause:** Two paths produced uncapped temperatures:
- **Backend:** `bubble_lattice_interaction.py` computed T_max adiabatically without capping.
- **Frontend:** `UnifiedTheoryPage.jsx` fallback `generateLocalResults()` used `params.temperature * compressionRatio ** 1.2` with no cap when API is unavailable.

**Fixes:**
- **bubble_lattice_interaction.py:** Cap T_max at `REGIME_MAX_TEMPERATURE["single_bubble"]` (1e4 K).
- **bubble_collapse.py:** Cap `enhanced_temperature` in `calculate_surface_enhanced_collapse` at regime max.
- **UnifiedTheoryPage.jsx:** Add `REGIME_MAX_TEMPERATURE_K = 1e4` and cap local fallback `max_temperature_k` and `peak_conditions.temperature_k`.

### 2. Physics Engine Phase 1–2 Verification

Verified the following implementations are in place:

| Module | Items |
|--------|-------|
| **electron_screening.py** | strong/anomalous models, classify_screening_regime, calculate_gamow_integral_screened |
| **casimir_forces.py** | calculate_casimir_force_with_metadata, DOMAIN_VALIDITY_THRESHOLD_M |
| **bubble_collapse.py** | REGIME_MAX_TEMPERATURE, calculate_collapse_temperature_regime |
| **non_equilibrium_thermo.py** | MILES_HE_RATE (2.63e11 atoms/s/W), calculate_miles_heat_helium_correlation |
| **proton_phase_model.py** | weak interaction import, get_weak_neutron_formation_params |
| **unified_lenr_model** | get_material_work_function, get_double_layer_potential |
| **TheoryDocumentationPanel** | P_overlap 8.5e-16, "Delocalized Interface Electrons", r_n 5 fm |
| **UnifiedTheoryPage** | ENHANCEMENT_THRESHOLDS observable=1e5, measurable=1e3, screening=1e1 |

### 3. Documentation Updates

- **CHANGELOG.md:** Added v0.3.5-beta Peak Temperature fix and Physics Engine Overhaul verification items.
- **.github/MERGING_INSTRUCTIONS.md:** Clarified branch naming (lenr_sim_app_v0.3.0-beta vs v0.3.5-beta).
- **LENR_SIM_APP_v2/README.md:** Updated version badge to 0.3.5-beta.
- **PR_DESCRIPTION.md:** Created for PR body.

## Pre-Merge Checklist

- [x] Backend: Peak temperature capping in bubble_lattice_interaction and bubble_collapse
- [x] Frontend: Local fallback temperature capping in UnifiedTheoryPage
- [x] Physics verification: All Phase 1–2 items confirmed
- [x] CHANGELOG.md updated
- [x] MERGING_INSTRUCTIONS.md clarified
- [x] README version badge updated
- [ ] Run backend tests: `cd LENR_SIM_APP_v2/backend && python -m pytest -v --tb=short`
- [ ] Run frontend build: `cd LENR_SIM_APP_v2/frontend && npm run build`
- [ ] Manual smoke test: Unified Theory page shows realistic peak temp (≤1e4 K)

## Test Plan

1. **Unit:** Run backend physics tests; confirm no regressions.
2. **Integration:** Run simulation on Unified Theory page with backend running; verify peak temp ≤ 10000 K.
3. **Fallback:** Disable backend, run simulation; verify local fallback shows peak temp ≤ 10000 K.
