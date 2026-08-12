# Known Issues and Warnings

This document tracks known issues, warnings, and their explanations for the LENR Simulation Application.

## Backend Physics Warnings

### 1. Overflow Warnings in NumPy Exponentials

**Warning:** `RuntimeWarning: overflow encountered in exp`

**Location:** Multiple physics modules (unified_lenr_model.py, unified_enhancement.py, etc.)

**Explanation:** These warnings occur during extreme parameter calculations where exponential functions approach the limits of floating-point representation. The physics models involve enhancement factors that can span many orders of magnitude (1 to 10^8+).

**Mitigations Applied:**
- Added `np.clip()` guards to prevent exponent overflow (capped at ±700)
- Added factor capping in multiplication operations
- Non-finite results are detected and capped to reasonable values (e.g., 1e6)

**Impact:** Low - calculations still produce valid results due to capping

---

### 2. ODE Integration Warnings

**Warning:** `ODEintWarning: Excess work done on this call`

**Location:** `bubble_lattice_interaction.py` via SciPy's `odeint`

**Explanation:** The Rayleigh-Plesset equation governing bubble dynamics is numerically stiff, especially during the rapid collapse phase. The ODE solver may need extra iterations for convergence.

**Mitigations Applied:**
- Singularity protection for near-zero radius values
- Minimum radius floor to prevent numerical instabilities
- Adaptive time stepping via `full_output=1` monitoring

**Impact:** Low - results remain physically reasonable despite warnings

---

### 3. Enhancement Saturation at the Reporting Ceiling

**Location:** `physics_engine/constants.py`, `physics_engine/enhancement_saturation.py`

**Explanation:** The canonical ceiling is `MAX_ENHANCEMENT_FACTOR = 1e5`, the
claim-tier governance limit, not `1e6`. The legacy `1e6` numeric guard survives only
in `unified_lenr_model/screening.py`; every other path imports the canonical value.

When a mechanism exceeds the ceiling it is reported *at* the ceiling with
`is_saturated: true` plus `log10_value_raw`, so a clamped value is distinguishable
from a computed one. Saturated values are reporting limits, not predictions.

**Impact:** Low, and now explicit in the response rather than silent. See
`PHYSICS_EQUATION_VERIFICATION.md` §9A/§9C.

---

## Frontend Warnings

### 1. Source Map Warning (@mediapipe)

**Warning:** `Failed to parse source map from '@mediapipe/tasks-vision/vision_bundle_mjs.js.map'`

**Explanation:** The @mediapipe package includes a reference to a source map file that doesn't exist. This is a third-party package issue.

**Mitigation Applied:** Added `GENERATE_SOURCEMAP=false` to `.env` file

**Impact:** None - only affects debugging

---

### 2. Vite CJS Node API Notice

**Warning:** `The CJS build of Vite's Node API is deprecated.`

**Explanation:** The Vite config is loaded through the CommonJS entry point. The
frontend migrated off Create React App and webpack-dev-server during v0.3.6-beta,
so the old `onAfterSetupMiddleware` / `onBeforeSetupMiddleware` deprecations no
longer occur.

**Impact:** None - informational; resolves when the config moves to ESM

---

## API Serialization

### Fixed: NumPy Type Serialization

**Issue:** Pydantic couldn't serialize `numpy.bool_`, `numpy.float64` types

**Resolution:** Added explicit type conversion to Python native types in all API endpoint response handlers:
- `bool()` conversion for numpy.bool_
- `float()` conversion for numpy.float64
- List comprehensions with type conversion for arrays

---

## Test Suite Notes

### Pytest Configuration Warnings

**Warning:** `Unknown config option: showlocals` / `xvs`

**Explanation:** Minor pytest.ini configuration mismatches with installed pytest version.

**Impact:** None - tests run correctly

---

## Performance Considerations

### Memory Threshold Warnings

**Warning:** `Memory threshold exceeded: XX% (threshold: 75.0%)`

**Explanation:** The backend monitors memory usage and triggers garbage collection when crossing 75% threshold. This is informational, not an error.

**Impact:** None - automatic garbage collection handles cleanup

---

## Recommended Monitoring

When running the application, the following should be monitored:
1. Backend memory usage (via `/health` endpoint)
2. API response times (logged via middleware)
3. Simulation timeout errors (30s default)

For detailed API documentation, visit `http://localhost:8010/api/docs` when the backend is running.
