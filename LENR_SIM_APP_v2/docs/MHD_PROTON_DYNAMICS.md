# MHD Proton Dynamics in LENR Bubble Collapse

**Version:** 0.3.6-beta  
**Author:** LENR Simulation Team  
**Last Updated:** February 2026

## Overview

This document describes the magnetohydrodynamic (MHD) physics model used to simulate proton confinement and transport during cavitation bubble collapse in the LENR Simulation App. The implementation draws inspiration from the Vortex Particle Flow Maps (VPFM) methodology for improved trajectory coherence and visualization.

## Table of Contents

1. [Physical Motivation](#physical-motivation)
2. [MHD Force Equations](#mhd-force-equations)
3. [MHD Dimensionless Parameters](#mhd-dimensionless-parameters)
4. [Hartmann Flow in Nano-Gaps](#hartmann-flow-in-nano-gaps)
5. [Hall and Faraday Channel Physics](#hall-and-faraday-channel-physics)
6. [Multi-Scale Bridging](#multi-scale-bridging)
7. [Nuclear Force Coupling](#nuclear-force-coupling)
8. [Vortex Particle Flow Maps](#vortex-particle-flow-maps)
9. [Cavitation Site Geometry](#cavitation-site-geometry)
10. [Implementation Details](#implementation-details)
11. [Validation](#validation)
12. [References](#references)

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

## MHD Dimensionless Parameters

**Module**: `physics_engine/mhd/dimensionless_parameters.py`

At each scale of the bubble-lattice system, the following dimensionless numbers determine which physics dominates:

| Parameter | Symbol | Formula | Physical Meaning |
|-----------|--------|---------|------------------|
| Magnetic Reynolds No. | Rm | μ₀σvL | Advection vs. resistive diffusion of B |
| Hartmann Number | Ha | BL√(σ/(ρν)) | EM body force vs. viscous drag |
| Lundquist Number | S | μ₀σv_A L | Alfvénic vs. resistive timescale |
| Plasma Beta | β | 2μ₀nk_BT / B² | Thermal vs. magnetic pressure |
| Alfvén Velocity | v_A | B / √(μ₀ρ) | Speed of magnetic disturbance propagation |
| Hall Parameter | β_H | eB / (m_e ν_c) | Electron gyro-frequency / collision frequency |
| Stuart Number | N | σB²L / (ρv) = Ha²/Re | EM interaction vs. inertia |
| Magnetic Prandtl No. | Pm | ν / η = μ₀σν | Viscous vs. magnetic diffusion |

### Regime Classification

The code automatically classifies the flow regime:

- **Rm ≫ 1**: Frozen-in flux — field lines advected with flow (ideal MHD)
- **Rm ≪ 1**: Resistive diffusion dominates — field decays rapidly
- **Ha ≫ 1**: MHD-dominated — Hartmann boundary layers form
- **β_H ≫ 1**: Hall regime — electron and ion motions decouple
- **N ≫ 1**: EM forces dominate over inertia (pinch-dominated)

**References**: Davidson (2001), Müller & Bühler (2001), Goedbloed & Poedts (2004).

---

## Hartmann Flow in Nano-Gaps

**Module**: `physics_engine/mhd/hartmann_flow.py`

The Hartmann channel flow describes MHD fluid dynamics in the nano-gap between the collapsing bubble and the lattice surface.

### Velocity Profile

For **insulating walls** (Shercliff boundary condition):

$$u(y)/u_0 = \frac{1 - \cosh(Ha \cdot y/L) / \cosh(Ha)}{1 - \tanh(Ha)/Ha}$$

For **conducting walls**:

$$u(y)/u_0 = \frac{Ha - \cosh(Ha \cdot y/L) / \cosh(Ha)}{Ha - \tanh(Ha)}$$

### Key Results

- **Boundary layer thickness**: δ_Ha = L/Ha (thins with increasing field)
- **Flow rate ratio**: Q_MHD/Q_Poiseuille < 1 (field suppresses flow)
- **Pressure drop ratio**: ΔP_MHD/ΔP_Poiseuille > 1 (field increases resistance)

### Casimir Quantum Correction

At nanometre gaps, Casimir pressure becomes significant:

$$P_C = -\frac{\pi^2 \hbar c}{240 d^4}$$

The quantum correction factor modifies the effective Hartmann number:

$$f_Q = 1 + |P_C| / P_{ref}$$

**References**: Hartmann (1937), Shercliff (1953), Casimir (1948), Lifshitz (1956).

---

## Hall and Faraday Channel Physics

**Module**: `physics_engine/mhd/hall_faraday_channels.py`

### Anisotropic Conductivity Tensor

In a magnetised plasma, the conductivity becomes a 3×3 tensor:

$$\boldsymbol{\sigma} = \begin{pmatrix} \sigma_P & -\sigma_H & 0 \\ \sigma_H & \sigma_P & 0 \\ 0 & 0 & \sigma_{\parallel} \end{pmatrix}$$

Where:
- σ_∥ = σ₀ (parallel to B — unchanged)
- σ_P = σ₀ / (1 + β_H²) (Pedersen / cross-field conductivity)
- σ_H = σ₀ β_H / (1 + β_H²) (Hall conductivity)

### Flux Compression During Bubble Collapse

The bubble acts as a natural flux compressor:

$$B_{compressed} = B_0 \cdot (R_0 / R_{min})^2$$

This can amplify milliTesla ambient fields to Tesla-scale at minimum radius.

### Faraday EMF

$$\mathcal{E} = v \cdot B \cdot L_{channel}$$

With loading parameter K, the power extraction is:

$$P = K(1-K) \sigma v^2 B^2 V_{channel}$$

Maximum at K = 0.5.

---

## Multi-Scale Bridging

**Module**: `physics_engine/mhd/multiscale_bridge.py`

### Five-Level Hierarchy

| Level | Scale | Characteristic Length | Physics |
|-------|-------|----------------------|---------|
| **MACRO** | mm–cm | Reactor vessel | Bulk MHD, acoustic driving |
| **BUBBLE** | μm | Bubble radius | Rayleigh-Plesset, flux compression |
| **SURFACE** | nm | Standoff gap | Hartmann flow, Casimir, double-layer |
| **LATTICE** | Å | Lattice constant | Proton screening, site occupation |
| **NUCLEAR** | fm | Nuclear radius | Tunnelling, S-factor, fusion |

### Downward Boundary Conditions

Each scale receives boundary conditions from the scale above:

```
MACRO.B_field  →  BUBBLE.B_initial
BUBBLE.B_compressed  →  SURFACE.B_applied
SURFACE.E_field  →  LATTICE.screening_potential
LATTICE.density  →  NUCLEAR.ion_density
```

### Upward Source Terms

Nuclear energy and particle production propagate upward:

```
NUCLEAR.energy_release  →  LATTICE.heating
NUCLEAR.neutron_rate    →  BUBBLE.radiation_pressure
```

---

## Nuclear Force Coupling

**Module**: `physics_engine/mhd/nuclear_force_coupling.py`

### Electromagnetic Coupling (Screening)

Debye screening energy:

$$U_s = \frac{e^2}{4\pi\varepsilon_0 \lambda_D}$$

Where λ_D = √(ε₀ k_B T / n_e e²). This reduces the effective Coulomb barrier.

### Gamow Factor and Cross-Sections

$$\sigma(E) = \frac{S(E)}{E} \exp(-2\pi\eta)$$

where the Sommerfeld parameter is:

$$\eta = \frac{Z_1 Z_2 e^2}{4\pi\varepsilon_0\hbar} \sqrt{\frac{\mu}{2E}}$$

D+D S-factor data from NACRE II (Xu et al. 2013):
- D(d,n)He3: S₀ = 55.4 keV·b, S₀' = 0 b
- D(d,p)T: S₀ = 56.2 keV·b, S₀' = 0 b

### Weak Nuclear Coupling (Electron Capture)

Inverse beta decay rate depends on electron density at the nucleus:

$$\Gamma_{ec} \propto |ψ_e(0)|^2 \cdot (Q + U_s)^2$$

Enhanced by Rydberg matter states (extended electron wavefunctions).

### D+D Branching Ratios

At low energies (≲ 100 keV):
- D(d,n)He3 ≈ 50%
- D(d,p)T ≈ 50%
- D(d,γ)He4 ≈ 10⁻⁷ (radiative capture — extremely rare)

**References**: NACRE II (Xu et al. 2013), Caughlan & Fowler (1988), Bahcall (1964),
Assenbaum et al. (1987), Ichimaru (1993), Bosch & Hale (1992).

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

### Backend Module: `mhd_proton_confinement.py` (Particle Dynamics)

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

### Backend Module: `mhd/` Package (v0.3.0.1-beta)

```python
# dimensionless_parameters.py
def compute_mhd_parameters(B, L, v, rho, sigma, nu, temperature, ion_density,
                           collision_frequency) -> MHDDimensionlessParameters:
    """Compute all 7 dimensionless MHD numbers + regime classification."""

# hartmann_flow.py
def compute_hartmann_flow(B, L, rho, sigma, nu, dP_dx, wall_type, temperature,
                          enable_quantum_correction) -> HartmannFlowResult:
    """Analytical Hartmann channel flow with Casimir correction."""

# hall_faraday_channels.py
def compute_bubble_collapse_mhd(v_collapse, B_initial, R_initial, R_current,
                                sigma, shell_thickness, collision_frequency) -> BubbleCollapseMHDResult:
    """Flux compression, Hall current, Faraday EMF during collapse."""

# multiscale_bridge.py
class MultiscaleBridge:
    """Five-level hierarchy from MACRO to NUCLEAR with MHD at each scale."""
    def solve(nuclear_energy_W, nuclear_neutron_rate) -> MultiscaleBridgeResult

# nuclear_force_coupling.py
def compute_nuclear_coupling(ion_density_m3, temperature_K, screening_energy_eV,
                             B_field_T, electron_density_m3, rydberg_enhancement,
                             deuterium_fraction) -> NuclearForceCouplingResult:
    """EM + Weak + Strong nuclear coupling from MHD conditions."""
```

### Backend Module: `theories/bubble_mhd_confinement.py`

```python
class BubbleMHDConfinementTheory:
    """
    Full Bubble-MHD theory module implementing TheoryModule protocol.
    Integrates all MHD sub-modules into a single enhancement calculation
    with multi-factor confidence scoring.
    """
    
    def calculate(self, conditions, config) -> TheoryContribution:
        """
        1. Rayleigh-Plesset collapse with peak velocity
        2. MHD dimensionless parameters at collapse conditions
        3. Hall/Faraday interaction + flux compression
        4. Hartmann flow in nano-gap with Casimir correction
        5. Multi-scale bridging (5 levels)
        6. Nuclear force coupling (D+D from NACRE II)
        7. Physics-derived enhancement: flux × √(Stuart) × Gamow
        8. Multi-factor confidence scoring
        """
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
4. **Dimensionless Parameter Consistency**: Rm, Ha, S satisfy algebraic identities (S = Rm × v_A/v)
5. **Hartmann Profile**: No-slip at walls; flattens with increasing Ha; recovers Poiseuille at Ha→0
6. **Conductivity Tensor Symmetry**: σ_Hall is anti-symmetric; σ_Pedersen is symmetric
7. **D+D Branching Ratios**: Sum to 1.0; neutron and proton channels are approximately equal
8. **Screening Enhancement**: σ_screened ≥ σ_bare for all energies

### Comparison with Theory

| Quantity | Expected | Simulated |
|----------|----------|-----------|
| Collapse velocity | ~1000 m/s | 800-1200 m/s |
| Peak compression | ~10-100× | 10-50× |
| Confinement time | ~ns | 1-10 ns |
| Alfvén velocity (bubble) | 10-100 m/s | Order-of-magnitude correct |
| Hartmann number (nano-gap) | 1-100 | Depends on B and gap width |
| D+D S-factor | 55 keV·b | 55.4 keV·b (NACRE II) |

### Test Suite

**47 automated tests** in `tests/test_mhd_physics.py` covering:
- Dimensionless parameter calculations (Rm, Ha, S, β, β_H, N, Pm)
- Regime classification (frozen-in, diffusive, kinetic, pinch-dominated)
- Hartmann flow profiles and boundary layers
- Hall conductivity tensor properties
- Faraday channel power conservation
- Nuclear cross-sections and branching ratios
- Multi-scale bridge boundary conditions
- MHD induction solver (diffusion and compression)
- Full Bubble-MHD theory integration

### Visualization Validation

The spiral convergence pattern should show:
- Increasing vorticity magnitude during collapse
- Particle clustering at cavitation point
- Reexpansion after minimum radius

---

## References

### Bubble Dynamics
1. Rayleigh, Lord (1917). "On the pressure developed in a liquid during the collapse of a spherical cavity." *Philos. Mag.* 34, 94–98.
2. Plesset, M. S. (1949). "The dynamics of cavitation bubbles." *J. Appl. Mech.* 16, 277–282.
3. Brenner, M. P., Hilgenfeldt, S., & Lohse, D. (2002). "Single-bubble sonoluminescence." *Rev. Mod. Phys.* 74(2), 425–484.

### MHD Fundamentals
4. Hartmann, J. (1937). "Theory of laminar flow of an electrically conductive liquid in a homogeneous magnetic field." *Kgl. Danske Videnskab. Mat.-Fys. Medd.* 15(6), 1–28.
5. Shercliff, J. A. (1953). "Steady motion of conducting fluids in pipes under transverse magnetic fields." *Proc. Camb. Phil. Soc.* 49, 136.
6. Davidson, P. A. (2001). *An Introduction to Magnetohydrodynamics*. Cambridge University Press.
7. Müller, U. & Bühler, L. (2001). *Magnetofluiddynamics in Channels and Containers*. Springer.
8. Goedbloed, H. & Poedts, S. (2004). *Principles of Magnetohydrodynamics*. Cambridge University Press.
9. Sutton, G. W. & Sherman, A. (1965). *Engineering Magnetohydrodynamics*. McGraw-Hill.
10. Huba, J. D. (2003). "Hall magnetohydrodynamics — a tutorial." *Space Sci. Rev.* 107, 175–190.
11. Freidberg, J. P. (2014). *Ideal MHD*. Cambridge University Press.
12. Liberman, M. A., et al. (1999). *Physics of High-Density Z-Pinch Plasmas*. Springer.
13. Lindemuth, I. R. & Kirkpatrick, R. C. (1983). "Parameter space for magnetized fuel targets in ICF." *Nucl. Fusion* 23, 263.

### Quantum & Nuclear
14. Casimir, H. B. G. (1948). "On the attraction between two perfectly conducting plates." *Proc. K. Ned. Akad. Wet.* 51, 793–795.
15. Lifshitz, E. M. (1956). "The theory of molecular attractive forces between solids." *Sov. Phys. JETP* 2, 73–83.
16. Ichimaru, S. (1993). "Nuclear fusion in dense plasmas." *Rev. Mod. Phys.* 65, 255–299.
17. Assenbaum, H. J., Langanke, K., & Rolfs, C. (1987). "Effects of electron screening on low-energy fusion cross sections." *Z. Phys. A* 327, 461–468.
18. Bosch, H.-S. & Hale, G. M. (1992). "Improved formulas for fusion cross-sections and thermal reactivities." *Nucl. Fusion* 32, 611.
19. Xu, Y. et al. (2013). "NACRE II." *Nucl. Phys. A* 918, 61–169.
20. Caughlan, G. R. & Fowler, W. A. (1988). "Thermonuclear reaction rates V." *At. Data Nucl. Data Tables* 40, 283.
21. Bahcall, J. N. (1964). "Electron capture and nuclear matrix elements of Be-7." *Phys. Rev.* 135, B137.

### LENR & Lattice
22. Storms, E. (2007). *The Science of Low Energy Nuclear Reaction*. World Scientific.
23. Fukai, Y. (2005). *The Metal-Hydrogen System*. 2nd ed. Springer.

### Computational Methods
24. Wang, Y., et al. (2025). "Vortex Particle Flow Maps." SIGGRAPH 2025. [arXiv:2505.21946](https://arxiv.org/abs/2505.21946)

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

*Document generated for LENR Simulation App v0.3.6-beta*
