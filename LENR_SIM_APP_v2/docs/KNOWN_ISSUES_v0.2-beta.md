# Known Issues for LENR Simulation App v0.2-beta

This document contains known issues identified during the beta release verification. These can be used to create GitHub issues for tracking.

**Status Updated:** January 2, 2026

---

## Issue 1: [Frontend] Clean up unused variables and imports

**Labels:** `enhancement`, `good first issue`

**Status:** 🟡 Partially Fixed

### Description

The frontend codebase has ESLint warnings for unused variables and imports across various components. While these don't break the build, they add noise and indicate code that could be cleaned up.

### Progress

**Fixed files:**
- ✅ `src/api/physics/websocketClient.ts` - SimulationUpdateMessage removed
- ✅ `src/api/realtime.ts` - SimulationUpdateMessage removed
- ✅ `src/components/AppLayoutFixed.jsx` - Avatar removed
- ✅ `src/components/ParameterControls.jsx` - Text, parameters fixed
- ✅ `src/components/controls/BubbleFusionParameterControls.jsx` - useCallback, Button, Grid, Divider, Stack removed
- ✅ `src/components/controls/LENRParameterControls.jsx` - unused imports removed

**Remaining files:**
- `src/api/client.ts` - ErrorType enum values (intentionally kept for future use)
- `src/api/physics/physicsApiClient.ts` - message parameter
- `src/visualization/components/*.tsx` - Various unused imports

### How to Reproduce

```bash
cd LENR_SIM_APP_v2/frontend
npm run lint
```

### Acceptance Criteria

- [ ] Run `npm run lint` with zero warnings for unused variables
- [ ] All removed code is verified to be truly unused (not dynamically referenced)
- [ ] No functional changes to the application

### Notes

- Variables prefixed with `_` are already ignored by ESLint config
- Some "unused" items may be intentionally kept for future use - verify before removing
- Consider converting unused exports to internal functions where appropriate

---

## Issue 2: [Frontend] Reduce bundle size with code splitting

**Labels:** `enhancement`

### Description

The production build bundle size is **899KB gzipped**, which is significantly larger than the recommended size for optimal performance. This affects initial load time, especially on slower connections.

### Current State

```
File sizes after gzip:
  899.18 kB  build/static/js/main.d7333723.js
  3.58 kB    build/static/js/635.8becc7dd.chunk.js
  998 B      build/static/css/main.23a0f524.css
```

### Potential Optimizations

#### 1. Code Splitting
- Implement route-based code splitting for pages
- Lazy load heavy visualization components (Three.js, D3)
- Current lazy loading: Only `LatticeTest` is lazy loaded

#### 2. Tree Shaking
- Review Material-UI imports - use specific imports instead of barrel imports
- Example: `import Button from '@mui/material/Button'` vs `import { Button } from '@mui/material'`
- Same for Ant Design imports

#### 3. Dependency Analysis
- Run bundle analysis to identify largest dependencies
- Consider lighter alternatives for heavy packages
- Three.js and related packages are likely major contributors

#### 4. Dynamic Imports
```javascript
// Current (loads everything upfront)
import FusionSimulationPage from './pages/FusionSimulationPage';

// Better (loads on demand)
const FusionSimulationPage = lazy(() => import('./pages/FusionSimulationPage'));
```

### How to Analyze

```bash
cd LENR_SIM_APP_v2/frontend
npm run build
# Or for detailed analysis:
npx source-map-explorer build/static/js/*.js
```

### Acceptance Criteria

- [ ] Reduce main bundle to under 500KB gzipped
- [ ] Implement route-based code splitting for all major pages
- [ ] Lazy load Three.js visualizations
- [ ] Document any performance trade-offs

---

## Issue 3: [Frontend] Migrate to MUI Grid v2 API

**Labels:** `enhancement`

### Description

The application uses deprecated Material-UI Grid v1 props that will be removed in a future MUI version. Console shows multiple warnings about deprecated props.

### Warnings

```
MUI Grid v2 migration warnings:
- 'item' prop deprecated
- 'xs', 'md', 'sm' props deprecated  
- Use 'size' prop instead
```

### Migration Guide

#### Before (Grid v1)
```jsx
<Grid container spacing={2}>
  <Grid item xs={12} md={6}>
    Content
  </Grid>
</Grid>
```

#### After (Grid v2)
```jsx
<Grid container spacing={2}>
  <Grid size={{ xs: 12, md: 6 }}>
    Content
  </Grid>
</Grid>
```

### Affected Components

Search for Grid usage across the codebase:
```bash
grep -r "Grid item" LENR_SIM_APP_v2/frontend/src --include="*.jsx" --include="*.tsx"
```

Key areas likely affected:
- Dashboard layouts
- Settings page
- Simulation pages
- Parameter control panels

### Acceptance Criteria

- [ ] No MUI Grid deprecation warnings in console
- [ ] All responsive layouts work correctly
- [ ] Visual regression testing passed

### Resources
- [MUI Grid v2 Migration](https://mui.com/material-ui/migration/migration-grid-v2/)

---

## Issue 4: [Frontend] Clean up duplicate/legacy page files

**Labels:** `enhancement`, `good first issue`

### Description

The `frontend/src/pages` directory contains multiple duplicate/legacy versions of page components that are no longer used but remain in the codebase.

### Duplicate Files Identified

| Active File | Unused/Legacy Versions |
|-------------|----------------------|
| `DashboardNew.jsx` | `Dashboard.js`, `Dashboard.jsx`, `Dashboard.tsx`, `DashboardConverted.jsx` |
| `SettingsPage.jsx` | `Settings.tsx` |
| `HomePage.jsx` | `HomePage.js`, `Home.tsx` |
| `SimulationPage.jsx` | `SimulationPage.js` |
| `AdvancedAnalysisPage.jsx` | `AdvancedAnalysisPage.js` |
| `VisualizationTest.jsx` | `VisualizationTest.tsx` |

### Potentially Unused Pages

The following pages are not imported in `App.tsx` and may be unused:
- `HistoryPage.jsx`
- `ReactionsPage.jsx`
- `LENRForm.jsx`
- `VisualizationPage.jsx`
- `SimulationDashboard.jsx`
- `PhysicsSimulationDashboard.tsx`
- `VisualizationStreamPage.jsx`

### Acceptance Criteria

- [ ] Verify which files are actually unused (check all imports)
- [ ] Remove confirmed duplicate/unused files
- [ ] Update any references if needed
- [ ] Ensure no broken imports after cleanup

### Notes

- Some files may be kept intentionally for reference or migration purposes
- Verify with the team before deleting any files

---

## Issue 5: [Backend] Fix failing physics test cases

**Labels:** `bug`

**Status:** 🟡 Mostly Fixed (4 remaining failures, down from 10)

### Description

Backend tests were failing due to various issues. Most have been resolved.

### Current Test Results

```
121 passed, 4 failed, 2 xfailed
```

### Fixed Issues ✅

- ✅ **Fluid Dynamics** - Fixed broadcasting error by reshaping lattice velocities for proper 4D broadcasting
- ✅ **API Docs** - Fixed test_docs_available to use correct `/api/docs` path
- ✅ **Placeholder Tests** - Marked as xfail (expected failures):
  - `test_interpolate_field_placeholder`
  - `test_calculate_tunneling_enhancement_placeholder`

### Remaining Failures

```
FAILED tests/test_hydrogen_flux_model.py::test_diffusion_coefficient_update
FAILED tests/test_hydrogen_flux_model.py::test_concentration_conservation
FAILED tests/test_hydrogen_flux_model.py::test_temperature_effect_on_detrapping
FAILED tests/test_integration/test_api_integration.py::TestEdgeCases::test_invalid_energy
```

### Issues by Category

#### Physics Edge Cases (Medium Priority)
- `test_diffusion_coefficient_update` - Assertion failure in hydrogen flux model
- `test_concentration_conservation` - Numerical precision issue
- `test_temperature_effect_on_detrapping` - Physics calculation issue

#### Edge Case Validation (Low Priority)
- `test_invalid_energy` - Edge case validation for very low energy values

### Acceptance Criteria

- [ ] All tests pass or are marked as expected failures with documentation
- [ ] Fix broadcasting issue in fluid dynamics solver
- [ ] Implement placeholder tests or mark them appropriately
- [ ] Fix API endpoint path issue

---

## Issue 6: [Backend] Migrate Pydantic V1 validators to V2

**Labels:** `enhancement`

### Description

The backend uses deprecated Pydantic V1 style validators that will be removed in Pydantic V3.

### Warnings

```
PydanticDeprecatedSince20: Pydantic V1 style `@validator` validators are deprecated. 
You should migrate to Pydantic V2 style `@field_validator` validators.

PydanticDeprecatedSince20: Pydantic V1 style `@root_validator` validators are deprecated.
You should migrate to Pydantic V2 style `@model_validator` validators.
```

### Affected Files

- `app/physics/models.py` (lines 199, 216, 222, 228, 234)
- `app/routers/physics_routes.py` (line 156)

### Migration Guide

#### Before (Pydantic V1)
```python
from pydantic import validator, root_validator

class MyModel(BaseModel):
    value: int
    
    @validator('value')
    def validate_value(cls, v):
        return v
    
    @root_validator
    def validate_model(cls, values):
        return values
```

#### After (Pydantic V2)
```python
from pydantic import field_validator, model_validator

class MyModel(BaseModel):
    value: int
    
    @field_validator('value')
    @classmethod
    def validate_value(cls, v):
        return v
    
    @model_validator(mode='after')
    def validate_model(self):
        return self
```

### Acceptance Criteria

- [x] No Pydantic deprecation warnings during tests
- [x] All validators migrated to V2 style
- [x] Tests pass after migration

**Status:** ✅ Fixed

**Changes Made:**
- Migrated `app/physics/models.py` to use `@field_validator` and `@model_validator`
- Migrated `app/routers/physics_routes.py` to use `@model_validator`

### Resources
- [Pydantic V2 Migration Guide](https://docs.pydantic.dev/latest/migration/)

---

## Issue 7: [Backend] Fix overflow warnings in physics calculations

**Labels:** `bug`

### Description

Several physics calculations produce `RuntimeWarning: overflow encountered in exp` which may lead to `inf` values in edge cases.

### Affected Files

- `app/physics/wkb_tunneling.py:314` - screening factor calculation
- `app/physics/lenr_enhancement.py:187` - enhancement calculation
- `app/routers/physics_simulation_router.py:123` - electron enhancement
- `app/routers/physics_simulation_router.py:242` - screening enhancement

### Example Warning

```
RuntimeWarning: overflow encountered in exp
    screen_factor = np.exp(np.pi * eta * (screening_ev/1000) / energy_kev)
```

### Potential Solutions

1. Add bounds checking before exponential calculations
2. Use `np.clip` to limit input values
3. Handle `inf` results gracefully
4. Consider using `np.expm1` for better numerical stability where applicable

### Acceptance Criteria

- [ ] No overflow warnings during normal operation
- [ ] Edge cases handled gracefully with meaningful error messages
- [ ] Physics accuracy maintained within acceptable tolerance

---

## Summary

| Issue | Priority | Difficulty | Status |
|-------|----------|------------|--------|
| Unused variables cleanup | Low | Easy | 🟡 Partially Fixed |
| Bundle size optimization | Medium | Medium | ⬜ Open |
| MUI Grid v2 migration | Low | Easy | ⬜ Open |
| Duplicate page files cleanup | Low | Easy | ⬜ Open |
| Backend test failures | Medium | Medium | 🟡 Mostly Fixed (4 remaining) |
| Pydantic V2 migration | Low | Easy | ✅ Fixed |
| Physics overflow warnings | Medium | Medium | ⬜ Open |

---

*Last updated: January 2, 2026 - v0.2-beta verification*
*Updated after PR fixes: 121 passed, 4 failed, 2 xfailed backend tests*
