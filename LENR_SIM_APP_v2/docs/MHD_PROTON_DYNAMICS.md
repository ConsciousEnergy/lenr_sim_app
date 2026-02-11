# MHD Proton Dynamics in LENR Bubble Collapse

**Version:** v0.2.2-beta  
**Author:** LENR Simulation Team  
**Last Updated:** January 2026

## Overview

This document describes the magnetohydrodynamic (MHD) physics model used to simulate proton confinement and transport during cavitation bubble collapse in the LENR Simulation App. The implementation draws inspiration from the Vortex Particle Flow Maps (VPFM) methodology for improved trajectory coherence and visualization.

## Table of Contents

1. [Physical Motivation](#physical-motivation)
2. [MHD Force Equations](#mhd-force-equations)
3. [Vortex Particle Flow Maps](#vortex-particle-flow-maps)
4. [Cavitation Site Geometry](#cavitation-site-geometry)
5. [Implementation Details](#implementation-details)
6. [Validation](#validation)
7. [References](#references)

---

## Physical Motivation

During sonoluminescence-driven bubble collapse, extreme conditions create:

- **Temperature peaks**: 10,000 - 100,000 K at collapse
- **Pressure gradients**: GPa-scale pressure differentials
- **Electric field intensification**: Double-layer compression (E ~ 10⁸ V/m)
- **Induced magnetic fields**: From ionized plasma currents

These conditions produce MHD forces that confine and focus protons (deuterons) toward specific cavitation sites at the bubble-lattice interface.

### Key Physical Insight

Unlike simple radial compression, MHD dynamics create **spiral trajectories** that:
1. Increase dwell time in high-enhancement regions
2. Focus multiple protons to the same cavitation site
3. Enhance effective collision probability through vortex confinement

---

## MHD Force Equations

### 1. Lorentz Force

The fundamental electromagnetic force on a charged particle:

$$\vec{F}_{Lorentz} = q(\vec{E} + \vec{v} \times \vec{B})$$

Where:
- $q = 1.602 \times 10^{-19}$ C (proton charge)
- $\vec{E}$ = electric field vector
- $\vec{v}$ = proton velocity
- $\vec{B}$ = magnetic field vector

### 2. Z-Pinch Azimuthal Magnetic Field

The bubble collapse drives radial currents that generate an azimuthal magnetic field:

$$B_\theta = \frac{\mu_0 I}{2\pi r}$$

Where:
- $\mu_0 = 4\pi \times 10^{-7}$ H/m (vacuum permeability)
- $I$ = effective pinch current (estimated from ionization)
- $r$ = radial distance from axis

This field creates a **Z-pinch configuration** that confines plasma radially.

### 3. Pinch Force (J × B)

The resulting pinch force per unit volume:

$$\vec{F}_{pinch} = \vec{J} \times \vec{B} = -\frac{B_\theta^2}{\mu_0 r}\hat{r}$$

This force points **radially inward**, compressing the plasma toward the axis.

### 4. Pressure Gradient Force

The pressure gradient from bubble collapse:

$$\vec{F}_{pressure} = -V_p \nabla P$$

Where:
- $V_p = \frac{4}{3}\pi r_p^3$ = proton effective volume
- $r_p \approx 0.87$ fm = proton charge radius
- $\nabla P$ = pressure gradient toward cavitation site

During collapse, this gradient is directed **toward the cavitation point**.

### 5. Radial Electric Field (Coulomb Focusing)

An effective radial electric field from charge separation:

$$E_r = E_0 \cdot \chi^2 \cdot f(r)$$

Where:
- $E_0 \approx 10^8$ V/m (reference field strength)
- $\chi$ = compression ratio ($R_0/R$)
- $f(r)$ = spatial decay function

### 6. Total Confinement Force

The total force on a proton:

$$\vec{F}_{total} = \vec{F}_{Lorentz} + \vec{F}_{pressure} + \vec{F}_{pinch}$$

In component form:

```
F_r = q·E_r - V_p·(∂P/∂r) - B_θ²/(μ₀·r)  [radial]
F_θ = q·(v_r·B_z - v_z·B_r)               [azimuthal, creates spiral]
F_z = q·(E_z + v_r·B_θ)                   [axial]
```

---

## Vortex Particle Flow Maps

The VPFM approach improves simulation accuracy by tracking vorticity on particles rather than on a fixed grid.

### Reference

> Wang, Y., Deng, Y., Jiang, Y., Lin, C., & Chen, B. (2025). *Vortex Particle Flow Maps*. SIGGRAPH 2025.  
> arXiv:2505.21946 [cs.GR]

### Vorticity Transport Equation

$$\frac{D\vec{\omega}}{Dt} = (\vec{\omega} \cdot \nabla)\vec{v} + \nu \nabla^2 \vec{\omega}$$

Where:
- $\vec{\omega} = \nabla \times \vec{v}$ (vorticity)
- $(\vec{\omega} \cdot \nabla)\vec{v}$ = vorticity stretching term
- $\nu$ = kinematic viscosity

### Key VPFM Concepts Applied

1. **Lagrangian Vorticity Tracking**
   - Vorticity carried by particles: $\omega_p = \omega(\vec{x}_p, t)$
   - Avoids numerical diffusion of Eulerian grids

2. **Flow Map Distance**
   - Tracks particle trajectories over extended time
   - Maintains coherent structures for 3-12× longer than traditional methods

3. **Velocity Reconstruction (Biot-Savart)**
   $$\vec{v}(\vec{x}) = -\frac{1}{4\pi} \int \frac{(\vec{x} - \vec{x}') \times \vec{\omega}(\vec{x}')}{|\vec{x} - \vec{x}'|^3} d^3x'$$

4. **Stretching Update**
   $$\frac{d\omega_p}{dt} = (\vec{\omega}_p \cdot \nabla)\vec{v}|_{\vec{x}_p}$$

### Adaptation for LENR Proton Dynamics

In our implementation:

| VPFM Concept | LENR Application |
|--------------|------------------|
| Fluid particles | Protons/deuterons |
| Vorticity | Angular momentum from MHD fields |
| Flow map | Trajectory history for visualization |
| Stretching | Enhancement during compression |

---

## Cavitation Site Geometry

### Lattice Interstitial Sites

Protons converge to specific sites in the FCC metal lattice:

#### Octahedral Sites (O-sites)
- Located at face centers and edge centers
- Position: $(\frac{1}{2}, \frac{1}{2}, 0)$ and permutations
- 4 per unit cell

#### Tetrahedral Sites (T-sites)
- Located at $(\frac{1}{4}, \frac{1}{4}, \frac{1}{4})$ and equivalents
- 8 per unit cell
- Smaller but more numerous

### Lattice Constants

| Material | Structure | Lattice Constant (Å) |
|----------|-----------|---------------------|
| Palladium (Pd) | FCC | 3.89 |
| Nickel (Ni) | FCC | 3.52 |
| Titanium (Ti) | HCP | 2.95 (a), 4.68 (c) |

### Cavitation Point Calculation

The cavitation point is where the bubble meets the lattice surface:

$$\vec{x}_{cav} = \vec{x}_{bubble} - R_{bubble} \cdot \hat{n}_{surface}$$

Where:
- $\vec{x}_{bubble}$ = bubble center position
- $R_{bubble}$ = current bubble radius
- $\hat{n}_{surface}$ = unit normal toward lattice

At minimum radius, this point is searched for the nearest interstitial site.

---

## Implementation Details

### Backend Module: `mhd_proton_confinement.py`

```python
class MHDProtonConfinement:
    """
    Calculates MHD confinement forces on protons during bubble collapse.
    """
    
    def calculate_z_pinch_field(self, r: float) -> float:
        """B_theta = mu_0 * I / (2 * pi * r)"""
        
    def calculate_radial_electric_field(self, position, cavitation_point, compression):
        """Radial E-field toward cavitation site"""
        
    def calculate_total_confinement_force(self, position, velocity, cavitation_point, compression):
        """Sum of all MHD forces"""
```

### Backend Module: `vortex_particle_system.py`

```python
class VortexParticleFlowMapSystem:
    """
    VPFM-inspired system for tracking proton vorticity and flow.
    """
    
    def compute_vorticity_stretching(self, vorticity, velocity_gradient):
        """(omega . grad) v term"""
        
    def reconstruct_velocity(self, point):
        """Biot-Savart velocity from vortex particles"""
        
    def step(self, phase, compression_ratio, cavitation_point):
        """Advance simulation by one timestep"""
```

### Frontend: `physicsWorker.js`

Heavy calculations offloaded to Web Worker:

```javascript
function calculateMHDForces(params) {
  const { position, velocity, cavitationPoint, compressionRatio } = params;
  // Z-pinch field, Lorentz force, pressure gradient
  return { total, lorentz, pressure, B_field, E_field };
}

function updateVortexParticles(params) {
  // VPFM-style particle update with vorticity tracking
  return { particles, statistics };
}
```

---

## Validation

### Physical Consistency Checks

1. **Force Direction**: Net force points toward cavitation during collapse
2. **Energy Conservation**: Total kinetic energy bounded (with damping)
3. **Vorticity Bounds**: No unbounded growth (viscous damping applied)

### Comparison with Theory

| Quantity | Expected | Simulated |
|----------|----------|-----------|
| Collapse velocity | ~1000 m/s | 800-1200 m/s |
| Peak compression | ~10-100× | 10-50× |
| Confinement time | ~ns | 1-10 ns |

### Visualization Validation

The spiral convergence pattern should show:
- Increasing vorticity magnitude during collapse
- Particle clustering at cavitation point
- Reexpansion after minimum radius

---

## References

1. **VPFM Paper**:
   Wang, Y., et al. (2025). "Vortex Particle Flow Maps." SIGGRAPH 2025.
   [arXiv:2505.21946](https://arxiv.org/abs/2505.21946)

2. **MHD Fundamentals**:
   Freidberg, J.P. (2014). *Ideal MHD*. Cambridge University Press.

3. **Sonoluminescence Physics**:
   Brenner, M.P., Hilgenfeldt, S., & Lohse, D. (2002). "Single-bubble sonoluminescence."
   *Reviews of Modern Physics*, 74(2), 425-484.

4. **LENR in Metal Lattices**:
   Storms, E. (2007). *The Science of Low Energy Nuclear Reaction*.
   World Scientific Publishing.

5. **Z-Pinch Plasma**:
   Liberman, M.A., et al. (1999). *Physics of High-Density Z-Pinch Plasmas*.
   Springer.

6. **Deuterium in Palladium**:
   Fukai, Y. (2005). *The Metal-Hydrogen System*. Springer.

---

## Appendix: Physical Constants

| Constant | Symbol | Value | Unit |
|----------|--------|-------|------|
| Elementary charge | e | 1.602×10⁻¹⁹ | C |
| Proton mass | mₚ | 1.673×10⁻²⁷ | kg |
| Vacuum permeability | μ₀ | 4π×10⁻⁷ | H/m |
| Vacuum permittivity | ε₀ | 8.854×10⁻¹² | F/m |
| Boltzmann constant | kB | 1.381×10⁻²³ | J/K |
| Planck constant | ℏ | 1.055×10⁻³⁴ | J·s |

---

*Document generated for LENR Simulation App v0.2.2-beta*
