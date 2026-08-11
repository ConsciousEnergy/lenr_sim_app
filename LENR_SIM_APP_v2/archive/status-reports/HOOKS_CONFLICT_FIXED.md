# Hooks Conflict Resolution

## Issue
Frontend compilation errors - TypeScript hooks not being exported:
- `useSimulationStatus` not found
- `useInitializeSimulation` not found  
- `useSimulationControl` not found

Only JavaScript hooks were available:
- `usePhysicsDataStream`
- `usePhysicsWebSocket`
- `useSimulationResults`

## Root Cause
**File conflict**: Both `hooks.js` and `hooks.ts` existed in the same directory
- `src/api/physics/hooks.js` (old JavaScript version)
- `src/api/physics/hooks.ts` (new TypeScript version)

Webpack/TypeScript was prioritizing the `.js` file over `.ts`, causing the wrong hooks to be exported.

## Solution Applied
1. Renamed `hooks.js` to `hooks.js.old` to eliminate conflict
2. Now only `hooks.ts` is active
3. Backend restarted in safe mode
4. Frontend automatically recompiled

## Files Changed
- `src/api/physics/hooks.js` → `src/api/physics/hooks.js.old`

## Result
✅ All TypeScript hooks now properly exported:
- `useInitializeSimulation`
- `useSimulationControl`
- `useSimulationStatus`
- `useSimulationResults`
- `useUpdateParameters`
- `useSimulationSnapshots`
- `usePhysicsWebSocket`

## Current Status
- **Frontend**: ✅ Running at http://localhost:3000 (compilation fixed)
- **Backend**: ✅ Running at http://localhost:8001 (restarted)
- **Compilation**: ✅ No errors

## Prevention
To prevent this in the future:
1. Always check for duplicate `.js` and `.ts` files
2. Remove old JavaScript files when migrating to TypeScript
3. Use consistent file extensions throughout the project

---

*Fixed: November 7, 2025*
