# Archived components

Visualization components with **no import chain into the running app**, moved here
rather than deleted so the history and any reusable Three.js technique stay
available.

Nothing in this directory is bundled: no module under `src/` imports it, Jest
ignores `/_archived/` (see `jest.config.js`), and Vite tree-shakes what is never
imported.

| File | Lines | Why archived |
|---|---:|---|
| `FluidDynamicsVisualizer_new.jsx` | 1813 | Duplicate of `visualization/FluidDynamicsVisualizer.jsx`, which is the one exported by the barrel |
| `FluidDynamicsVisualizer_fixed.jsx` | 1814 | Third copy of the same component |
| `EnhancedFusionVisualization.js` | 997 | Only ever imported by the archived `pages/_archived/Dashboard.js` |
| `UnifiedLENRVisualizer.js` | 870 | Superseded by `visualization/UnifiedLENRVisualizer.jsx`; the `./UnifiedLENRVisualizer` imports elsewhere resolve to that file, not this one |
| `ComparisonView.jsx` | 728 | Exported by a barrel that nothing imported; charts were mock-only and never wired to the unified API |
| `UnifiedLENRVisualizer.fix.jsx` | 588 | Abandoned fix branch of the visualizer |
| `VortexFlowRenderer.js` | 575 | Alternate vortex renderer; production uses `FluidDynamicsEffects.js` |
| `EnhancedFusionPanel.js` | 536 | Archived-dashboard dependency |
| `DoubleLlayerEffect.js` | 395 | Zero imports; double-layer rendering lives in `UnifiedBubbleLatticeVisualization.jsx` |
| `VisualizationSwitcher.jsx` | 291 | Zero page imports |
| `SimplifiedLatticeVisualizer.jsx` | 185 | Only reachable through the archived `VisualizationSwitcher` |
| `PhysicsLatticeVisualizationContainer.tsx` | 131 | Zero page imports; `DashboardLatticeVisualization.tsx` is the live wrapper |
| `index.js` | 5 | The `comparison/` barrel, whose only export was `ComparisonView` |
| `SimulationPlaybackController.jsx` | 0 | Empty stub |

Total: ~8.9k lines.

## Before reviving any of these

Check the response contract first. Several were written against fields the API no
longer emits, or against `/api/physics/*` endpoints with different shapes.
`ComparisonView.jsx` in particular renders percentages on a `[0, 100]` polar axis
from mock data, which would misrepresent enhancement factors that legitimately span
many orders of magnitude. See `docs/v0.3.6-beta/DATA_CONTRACT_LOCK.md`.
