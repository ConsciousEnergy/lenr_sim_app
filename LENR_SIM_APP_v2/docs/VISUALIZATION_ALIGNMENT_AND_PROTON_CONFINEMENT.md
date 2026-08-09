# Visualization Alignment and Proton Confinement

**Version:** 0.3.6-beta  
**Last Updated:** August 2026

## Summary

This document describes the development changes made to align the unified bubble–lattice 3D visualization with the physical model: moving the reaction formation to the top center of the lattice and constraining proton behavior to match LENR theory and experimental observations.

---

## 1. Reaction Formation at Top Center of Lattice

### Problem

The nucleation site was at `(spacing * 0.5, latticeY, spacing * 0.5)` in visualization units. With a centered lattice (atoms at `x * spacing - offset` for `offset = (dimension-1)*spacing/2`), that position coincided with an **atom** rather than the interstitial void. The bubble and related effects appeared off-center relative to the lattice.

### Solution

- Nucleation site set to **top center** of the lattice: `(0, latticeY, 0)`.
- This is the center of the interstitial void between the four central top-surface atoms at `(±halfSpacing, latticeY, ±halfSpacing)` (e.g. ±0.6 for `LATTICE_SPACING = 1.2`).

### Code and Asset Updates

- **Bubble group**: `nucleationOffsetX` / `nucleationOffsetZ` set to `0` in `createBubble`.
- **Protons**: Initial positions and cavitation point use `(0, latticeY, 0)`.
- **Field lines**: Creation and animation use nucleation at `(0, latticeY, 0)` with appropriate radius.
- **Effects**: Hotspots, nuclear emissions, shockwave, and secondary products positioned at top-center nucleation.
- **MHD vortex**: Parent group position set to `(0, latticeY + 0.3, 0)`; child at local origin for correct spin.
- **Casimir field**: `nearestAtoms` updated to the four atoms around the center void: `(-halfSpacing, latticeY, -halfSpacing)` and permutations with `+halfSpacing`.
- **Animation loop**: Cavitation point, field particle positions, shockwave reset, and secondary-product reset all use top-center coordinates.

---

## 2. MHD and Field Alignment

### MHD Vortex

- **Issue**: The MHD flow group was at world origin with the PlasmaVortexEffect child offset to the nucleation site. Incrementing `vortexGroup.rotation.y` made the vortex orbit the world Y-axis instead of spinning at the nucleation site.
- **Change**: Parent `vortexGroup` is positioned at the nucleation site; child is at local `(0, 0, 0)`. Rotation now spins the MHD flow in place at the reaction site.

### Field Lines and Effects

- Electric field lines and their animated particles are generated and updated using the same nucleation coordinates so they emanate from and stay centered on the reaction site.
- Hotspots, nuclear emissions, and shockwave are created and reset at the top-center nucleation site.

---

## 3. Proton Behavior and Physical Consistency

### COLLAPSE Orbit Centering

- During COLLAPSE/MINIMUM, proton circular motion used `proton.position.x = currentRadius * Math.cos(theta)` (and similarly for z) without adding the cavitation point, so the orbit was centered at world origin.
- **Change**: Orbit is explicitly centered on the cavitation point:  
  `proton.position.x = cavitationPoint.x + currentRadius * Math.cos(theta)` (and same for z).

### REBOUND Scatter and Confinement

- **Observation**: In LENR (e.g. Hagelstein phonon-coupling model, Storms/Fleischmann–Pons–type results), most of the reaction energy is transferred to the lattice as phonon energy rather than to ejecting boundary-layer particles. H/D in the boundary layer should be perturbed but remain confined.
- **Previous behavior**: A constant outward scatter force with no distance limit let protons drift arbitrarily far from the site.
- **Changes**:
  - **REBOUND**: Scatter only while distance &lt; ~1.2 lattice spacings; beyond that, a restoring force pulls protons back toward the cavitation point. Scatter force reduced; vertical component reduced.
  - **All phases**: Hard distance clamp at 2 lattice spacings from the cavitation point so protons cannot leave the reaction region.

These updates keep the visualization consistent with "reaction at the surface, energy into the lattice" and confined boundary-layer ions.

---

## 4. Files Touched

| Area | File |
|------|------|
| Visualization | `LENR_SIM_APP_v2/frontend/src/components/visualizations/UnifiedBubbleLatticeVisualization.jsx` |
| Changelog | `CHANGELOG.md` |
| This doc | `LENR_SIM_APP_v2/docs/VISUALIZATION_ALIGNMENT_AND_PROTON_CONFINEMENT.md` |

---

## 5. Frontend MHD Dashboard (v0.3.0.1-beta)

The **Theory Testbed → Bubble-MHD Nano-Confinement** accordion now includes an `MHDParameterDashboard` component displaying:

- **Regime chips**: Colour-coded dimensionless parameter chips (Rm, Ha, S, β, β_H, N, Pm) with thresholds indicating frozen-in, diffusive, MHD-dominated, or Hall regimes.
- **Key observables grid**: Alfvén velocity, compressed B-field, Faraday EMF, screening energy, flux compression ratio, nuclear power density, neutron rate, collapse velocity.
- **Confidence sub-scores**: Visible in observables — compression, MHD, loading, and screening quality scores.

Files: `frontend/src/components/physics/TheoryTogglePanel.tsx`

---

## 6. References

- Lattice creation and coordinate system: `UnifiedBubbleLatticeVisualization.jsx` – `createLattice`, `PHYSICS_CONFIG.LATTICE_SPACING`, `LATTICE_Y_OFFSET`, `LATTICE_SURFACE_OFFSET`.
- MHD and proton dynamics: `docs/MHD_PROTON_DYNAMICS.md`.
- MHD nano-confinement physics: `docs/MHD_NANO_CONFINEMENT_PHYSICS.md`.
- Theory (phonon coupling, lattice energy absorption): project unified theory document and Hagelstein-style LENR models.
