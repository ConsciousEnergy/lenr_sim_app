# Consistency Source of Truth Notes

## Implemented
- Added `frontend/src/utils/simulationDerivedState.js`.
- Unified headline state derivation (`peakEnhancement`, `nuclearFraction`, contradiction flag).
- Wired contradiction warning into `UnifiedTheoryPage`.

## Rule
- Headline badges must not imply nuclear-active status when `NUCLEAR` phase share is zero for the same run snapshot, unless explicitly annotated.

