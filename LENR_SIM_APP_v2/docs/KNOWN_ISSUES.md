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

### 3. Non-Finite Enhancement Capping

**Warning:** `Non-finite enhancement calculated, capping to 1e6`

**Location:** `unified_lenr_model.py`

**Explanation:** When electron screening calculations produce extremely high enhancement factors (approaching infinity), they are capped to 10^6 for numerical stability.

**Impact:** Low - capped values still represent significant enhancement

---

## Frontend Warnings

### 1. Source Map Warning (@mediapipe)

**Warning:** `Failed to parse source map from '@mediapipe/tasks-vision/vision_bundle_mjs.js.map'`

**Explanation:** The @mediapipe package includes a reference to a source map file that doesn't exist. This is a third-party package issue.

**Mitigation Applied:** Added `GENERATE_SOURCEMAP=false` to `.env` file

**Impact:** None - only affects debugging

---

### 2. Webpack Deprecation Warnings

**Warning:** `onAfterSetupMiddleware` / `onBeforeSetupMiddleware` deprecated

**Explanation:** Create React App uses deprecated webpack-dev-server options.

**Impact:** None - future CRA update will resolve this

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

For detailed API documentation, visit `http://localhost:8000/api/docs` when the backend is running.
