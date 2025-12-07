# LENR Simulation App - Beta Release Notes

## Version 0.2.0-beta

**Release Date:** December 7, 2025

---

## Overview

This beta release includes significant UI improvements, visualization fixes, and a rebuilt Settings page. The application is now more stable and provides better user experience across all simulation pages.

---

## What's New

### UI Improvements

#### Analytics Page
- **Pie Chart Enhancement**: Replaced truncated inline labels with a clean horizontal legend below the chart
- Added tooltip formatting showing simulation count per category
- Improved chart readability and responsiveness

#### Slider Controls
- **Quantum Tunneling Page**: Fixed slider mark overlaps for Temperature, Energy, Pressure, and Screening Factor controls
- **LENR Simulation Page**: Fixed all slider mark overlaps including:
  - Temperature (273K - 1273K)
  - Pressure (0.1 - 30 atm)
  - Magnetic Field Strength (0 - 2T)
  - Current Density (0 - 5 A/cm²)
  - Pulse Frequency (DC - 1kHz)
  - Pulse Width (0 - 500 μs)
  - Catalyst Concentration
  - Grain Size
  - Defect Density
  - Time Step Size
  - Simulation Time
- Added consistent 0.65rem font size for all mark labels
- Improved spacing to prevent value label collisions

### 3D Visualization Fixes

#### Fusion Simulation
- Fixed particle rendering - particles now display correctly after running simulation
- Fixed hotspot visualization with glowing effect
- Added default visualization parameters (showParticles and showHotspots default to true)
- Updated mock data generator to provide proper `timeSteps` format with particles and hotspots

#### LENR Simulation
- Added fallback lattice generation when simulation data is unavailable
- Fixed chart data preparation to handle missing summary data gracefully
- Lattice now renders with proper material colors (Nickel, Palladium, Hydrogen, etc.)
- Energy flow particles animate within lattice bounds

### New Settings Page
- **Completely rebuilt** using Material-UI components (previously used non-rendering Tailwind CSS)
- Four organized tabs:
  1. **Appearance**: Dark mode toggle, font size, animations, compact mode
  2. **Physics**: Calculation precision, default temperature/pressure, thread count
  3. **Visualization**: Quality level, max particles, antialiasing, axes/grid display
  4. **Debug & Advanced**: System status, API configuration, debug tools, danger zone

#### System Status Dashboard
- Real-time API connection status indicator
- WebGL support detection
- Memory usage monitoring
- Local storage usage display
- Quick access to debug tools

### Routing Updates
- `/settings` now routes to the new MUI-based Settings page
- All debug and test pages remain accessible

---

## Technical Changes

### Files Modified
| File | Change |
|------|--------|
| `pages/AnalyticsPage.jsx` | Pie chart legend implementation |
| `controls/TunnelingParameterControls.jsx` | Slider styling fixes |
| `controls/LENRParameterControls.jsx` | Slider styling fixes (10 sliders) |
| `visualizations/FusionVisualization.jsx` | Default params, proper data handling |
| `visualizations/LENRVisualization.jsx` | Fallback lattice generation |
| `utils/mockData.js` | New mock generators for visualizations |
| `App.tsx` | Settings page import and routing |

### Files Created
| File | Description |
|------|-------------|
| `pages/SettingsPage.jsx` | New MUI-based settings interface |

### Mock Data Updates
- `mockFusionSimulation()` now returns proper `timeSteps` array with particles and hotspots
- `mockLENRSimulation()` generates lattice structure with points and connections
- Both functions support async/await pattern with simulated delay

---

## Known Issues

1. **Memory Performance**: Large particle counts (>5000) may cause performance degradation on lower-end devices
2. **WebSocket**: Real-time simulation updates via WebSocket not yet implemented for all simulation types
3. **Data Persistence**: Settings are stored in localStorage; clearing browser data will reset them

---

## Testing Checklist

- [x] Analytics pie chart displays legend correctly
- [x] Quantum Tunneling sliders don't overlap
- [x] LENR page sliders don't overlap
- [x] Fusion simulation renders particles after running
- [x] LENR simulation renders lattice structure
- [x] Settings page renders with all tabs functional
- [x] Dark/Light mode toggle works from Settings
- [x] API connection status displays correctly
- [x] Debug tool links work

---

## Upgrade Instructions

1. Pull the latest changes from the beta branch
2. Run `npm install` in the frontend directory
3. Clear browser localStorage if experiencing settings issues
4. Restart both frontend and backend servers

---

## API Compatibility

This release is compatible with:
- Backend API: v1.0+
- Node.js: v16+
- React: v18+
- Three.js: v0.150+

---

## Contributors

- LENR Simulation Team

---

## Feedback

Please report any issues or suggestions via the GitHub Issues page or the in-app feedback mechanism.

---

*This is a beta release. Some features may be incomplete or subject to change.*
