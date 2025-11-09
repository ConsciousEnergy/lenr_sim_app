# Frontend Recovery Plan - November 6, 2025

## Executive Summary

Your documentation shows these errors were **fixed before** but have reappeared or there are new similar errors. All the files and hooks actually **EXIST** in the codebase - the issues are:
1. Wrong icon names
2. Import path mismatches  
3. Missing component files (that used to exist or need creation)

## Investigation Results

### ✅ What EXISTS and is CORRECT

1. **API Exports** - `getEnhancedFusion` is properly exported in `services/api.js` ✓
2. **MUI Icons** - `Visibility as ShowIcon` is correct ✓  
3. **Index Files** - Only `index.ts` exists (duplicate `index.js` was removed before) ✓
4. **Hooks Files**:
   - ✓ `/api/physics/hooks.ts` exports: `useInitializeSimulation`, `useSimulationControl`, `useSimulationStatus`
   - ✓ `/hooks/useLogger.js` exists
5. **Contexts**:
   - ✓ `/contexts/SettingsContext.js` exists

### ❌ What NEEDS FIXING

## Error 1: Ant Design `AtomOutlined` Icon

**File:** `src/pages/Dashboard.jsx`  
**Lines:** 26, 293

**Problem:** Ant Design doesn't have an `AtomOutlined` icon

**Solution:** Replace with `ExperimentOutlined` or `ApiOutlined`

```javascript
// BEFORE (line 26)
import { ..., AtomOutlined } from '@ant-design/icons';

// AFTER
import { ..., ExperimentOutlined } from '@ant-design/icons';

// BEFORE (line 293)
avatar={<AtomOutlined style={{ fontSize: '36px', color: '#1890ff' }} />}

// AFTER  
avatar={<ExperimentOutlined style={{ fontSize: '36px', color: '#1890ff' }} />}
```

---

## Error 2: MUI `LineChart` Icon

**File:** `src/components/visualizations/ReactionDynamicsVisualization.jsx`  
**Line:** 722

**Problem:** Code is trying to import `LineChart` from `@mui/icons-material` but it doesn't exist

**Investigation:** Line 44 has `ShowChart as LineChartIcon` which is CORRECT. Line 52 imports `LineChart` from `recharts` which is also CORRECT.

**Solution:** The error might be resolved once other errors are fixed. If not, verify no duplicate imports exist.

---

## Error 3: Import Path Issues

### 3a. PhysicsLatticeVisualization

**File:** `src/components/visualization/PhysicsLatticeVisualization.jsx`  
**Lines:** 23-24

**Problem:** Incorrect import paths

```javascript
// BEFORE
import useLogger from '../../hooks/useLogger';
import { useSettings } from '../../contexts/SettingsContext';

// AFTER (verify the actual paths)
// Option A: If hooks exports default
import useLogger from '../../hooks/useLogger';
// Option B: If hooks exports named
import { useLogger } from '../../hooks/useLogger';

// For SettingsContext
import { useSettings, SettingsProvider } from '../../contexts/SettingsContext';
```

**Action Required:** Check if `useLogger` is a default or named export

### 3b. Physics Hooks Not Found

**Files:** Multiple files importing from `'../../api/physics/hooks'`

**Problem:** `hooks.ts` exists and HAS these exports but they're not being found:
- `useSimulationStatus`
- `useInitializeSimulation`
- `useSimulationControl`

**Root Cause:** Two possibilities:
1. Both `hooks.ts` and `hooks.js` exist creating conflicts
2. Index file not re-exporting them

**Solution A:** Check which hooks file should be primary:

```bash
# Check what's exported from hooks.ts
grep "export" frontend/src/api/physics/hooks.ts

# Check what's exported from hooks.js  
grep "export" frontend/src/api/physics/hooks.js
```

**Solution B:** Create/update index file in `api/physics/`:

```typescript
// src/api/physics/index.ts
export * from './hooks.ts';
export * from './client';
// ... other exports
```

---

## Error 4: Missing Components

### Missing: `LENRSimulationPanel`

**Referenced in:** `src/pages/Dashboard.js` line 20

**Options:**
1. Create the component
2. Use existing `LENRParameterControls.jsx` instead
3. Remove the import if not used

**Quick Fix:** Check if component exists elsewhere:

```powershell
# Search for any LENR panel files
Get-ChildItem -Recurse -Filter "*LENR*Panel*" frontend/src/
```

### Missing: `ResultsPanel`

**Referenced in:** `src/pages/Dashboard.js` line 21

**Options:**
1. Use `SimulationResults.jsx` from `components/results/`
2. Create new `ResultsPanel` component

**Quick Fix:**

```javascript
// In Dashboard.js
// BEFORE
import ResultsPanel from '../components/ResultsPanel';

// AFTER (use existing component)
import { SimulationResults as ResultsPanel } from '../components/results/SimulationResults';
```

### Missing: `mockData`

**Referenced in:** `src/pages/FusionSimulationPage.jsx` line 15

**Problem:** Mock data utility doesn't exist

**Solutions:**
1. Create mock data file
2. Remove mock data usage (use real API)
3. Inline the mock data

**Quick Fix (Create Mock Data):**

```javascript
// src/utils/mockData.js
export const generateMockSimulationData = () => {
  return {
    temperature: 300,
    pressure: 101.325,
    energy: 0,
    // ... more mock fields
  };
};

export const mockFusionResults = {
  rate: 1e-10,
  probability: 0.0001,
  // ... more mock results
};
```

---

## Immediate Actions Checklist

### Priority 1: Fix Icon Errors (5 minutes)

- [ ] Replace `AtomOutlined` with `ExperimentOutlined` in Dashboard.jsx
- [ ] Verify no other non-existent icons

### Priority 2: Fix Physics Hooks Exports (10 minutes)

- [ ] Check if both hooks.ts and hooks.js should coexist
- [ ] Create/update `api/physics/index.ts` to re-export all hooks
- [ ] Or update imports to use specific file: `from './hooks.ts'`

### Priority 3: Fix Hook Import Paths (5 minutes)

- [ ] Check if `useLogger` is default or named export
- [ ] Update PhysicsLatticeVisualization.jsx imports accordingly

### Priority 4: Handle Missing Components (15 minutes)

- [ ] Create or alias `LENRSimulationPanel`
- [ ] Create or alias `ResultsPanel`  
- [ ] Create `mockData.js` utility

---

## Recovery Steps

### Step 1: Quick Fixes

```powershell
cd C:\Users\brand\LENR_SIM_APP\LENR_SIM_APP_v2\frontend
```

1. **Fix Icon**:
   - Open `src/pages/Dashboard.jsx`
   - Replace `AtomOutlined` with `ExperimentOutlined` (2 places)

2. **Fix Hooks Export** (Option A - Recommended):

Create `src/api/physics/index.ts`:

```typescript
// Re-export everything from hooks
export * from './hooks';
// Or be explicit
export {
  useInitializeSimulation,
  useSimulationControl,
  useSimulationStatus,
  useSimulationResults,
  useUpdateParameters,
  usePhysicsWebSocket,
  usePhysicsDataStream
} from './hooks';
```

### Step 2: Create Missing Files

1. **Create mockData.js**:

```javascript
// src/utils/mockData.js
export const mockFusionData = {
  temperature: 300,
  pressure: 101325,
  reactants: ['D', 'D'],
  products: ['He3', 'n'],
  energy: 3.27
};

export const mockSimulationResults = {
  rate: 1e-12,
  crossSection: 1e-28,
  probability: 0.0001,
  energy: 3.27,
  timestamp: Date.now()
};
```

2. **Create LENRSimulationPanel** (or alias):

```javascript
// src/components/LENRSimulationPanel.jsx
// Quick fix - re-export existing component
export { default } from './controls/LENRParameterControls';
```

3. **Create ResultsPanel** (or alias):

```javascript
// src/components/ResultsPanel.jsx
// Quick fix - re-export existing component  
export { SimulationResults as default } from './results/SimulationResults';
```

### Step 3: Test

```powershell
npm start
```

Watch for errors and verify:
- [ ] No icon errors
- [ ] No hook import errors
- [ ] No missing module errors
- [ ] Frontend compiles successfully

---

## Alternative: Use Previously Working Version

Your documentation (`IMPORT_ERRORS_FIXED.md`) shows these were fixed before. You may want to:

1. **Check Git History**:

```bash
git log --oneline --all -- frontend/src/
git diff HEAD~10 HEAD -- frontend/src/pages/Dashboard.jsx
```

2. **Find When It Worked**:

Look for commits around the date in `IMPORT_ERRORS_FIXED.md` (2025-11-06)

3. **Compare Changes**:

See what changed between working and non-working states

---

## Prevention

To prevent this from happening again:

1. **Use TypeScript** - Type errors caught at compile time
2. **Lint Imports** - Use ESLint rules for import validation  
3. **CI/CD** - Automated tests catch import errors
4. **Index Files** - Maintain proper index files for clean imports
5. **Documentation** - Keep import maps updated

---

## Status Tracking

| Issue | Status | Priority | ETA |
|-------|--------|----------|-----|
| AtomOutlined icon | ❌ Not Fixed | P0 | 2 min |
| Physics hooks exports | ❌ Not Fixed | P0 | 5 min |
| useLogger import | ❌ Not Fixed | P1 | 2 min |  
| LENRSimulationPanel | ❌ Missing | P1 | 5 min |
| ResultsPanel | ❌ Missing | P1 | 3 min |
| mockData utility | ❌ Missing | P2 | 5 min |

**Total Estimated Time:** 22 minutes

---

## Next Steps

1. Apply the fixes above
2. Test compilation
3. If still errors, check detailed error messages
4. Update this document with any new findings

---

*Generated: November 6, 2025*  
*By: Development Recovery Process*

