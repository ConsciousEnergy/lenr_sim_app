# MHD Nano-Confinement Physics — Comprehensive Reference

**Version:** 0.3.5-beta  
**Author:** LENR Simulation Team  
**Date:** February 2026  
**Module Path:** `backend/app/physics_engine/mhd/`

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Physical Picture](#2-physical-picture)
3. [MHD Dimensionless Parameters](#3-mhd-dimensionless-parameters)
4. [MHD Induction Equation](#4-mhd-induction-equation)
5. [Hartmann Channel Flow](#5-hartmann-channel-flow)
6. [Hall and Faraday Channel Physics](#6-hall-and-faraday-channel-physics)
7. [Multi-Scale Bridging Framework](#7-multi-scale-bridging-framework)
8. [Nuclear Force Coupling](#8-nuclear-force-coupling)
9. [Enhancement Factor Model](#9-enhancement-factor-model)
10. [Confidence Calculation](#10-confidence-calculation)
11. [Mathematical Corrections Log](#11-mathematical-corrections-log)
12. [Test Coverage](#12-test-coverage)
13. [References](#13-references)

---

## 1. Introduction

The Bubble-MHD Nano-Confinement theory models a nanoscale analog of magnetised
inertial confinement.  During acoustic cavitation in a deuterium-loaded metal
lattice, a collapsing bubble compresses the ambient magnetic field, creates MHD
flows in the thin gap between the bubble wall and the lattice surface, and
potentially enhances nuclear reaction rates through a combination of flux
compression, Hartmann confinement, and Gamow barrier penetration.

This document serves as the definitive physics reference for the implementation
in `physics_engine/mhd/` and `theories/bubble_mhd_confinement.py`.

---

## 2. Physical Picture

### 2.1 Cavitation Bubble Collapse

A gas bubble in a liquid (e.g., D₂O on Pd) is driven by acoustic forcing.
The Rayleigh-Plesset equation governs the radial dynamics:

```
RR̈ + (3/2)Ṙ² = (1/ρ)[P_gas(R) - P_∞(t) - 2σ/R - 4μṘ/R]
```

**Collapse time** (Rayleigh, 1917):

```
t_c = 0.915 R₀ √(ρ/ΔP)
```

where the constant 0.915 = τ_R comes from the exact integral of the Rayleigh
equation for an empty cavity.

**Peak wall velocity** — more accurate than the average R₀/t_c for determining
peak MHD conditions:

```
v_max = √(2ΔP / 3ρ)
```

This is derived from energy conservation of the incompressible Rayleigh collapse
(Lord Rayleigh, 1917, Philos. Mag. 34, 94).

### 2.2 Adiabatic Compression

Gas inside the bubble compresses adiabatically (γ = 5/3 for monatomic gas):

```
compression_ratio = (P/P_ambient)^(1/(3γ))
R_min = R₀ / compression_ratio
T_peak = T × compression_ratio^(γ-1)
P_peak = P × compression_ratio^γ
```

### 2.3 MHD in the Collapse

As the bubble reaches minimum radius, several MHD phenomena occur simultaneously:

1. **Flux compression**: B ∝ (R₀/R_min)² amplifies the ambient field
2. **Hartmann flow**: MHD-modified fluid dynamics in the nano-gap
3. **Hall currents**: Decoupled electron-ion motion at high β_H
4. **Faraday EMF**: Moving conducting fluid generates voltage

---

## 3. MHD Dimensionless Parameters

**File:** `dimensionless_parameters.py`

### 3.1 Definitions

| Parameter | Symbol | Formula | Interpretation |
|-----------|--------|---------|----------------|
| Magnetic Reynolds No. | Rm | μ₀σvL | Field advection / diffusion |
| Hartmann Number | Ha | BL√(σ/(ρν)) | EM force / viscous force |
| Lundquist Number | S | μ₀σv_A L | Alfvén / resistive timescale |
| Plasma Beta | β | 2μ₀nk_BT / B² | Thermal / magnetic pressure |
| Alfvén Velocity | v_A | B / √(μ₀ρ) | MHD wave speed |
| Hall Parameter | β_H | eB / (m_e ν_c) | Gyrofrequency / collisions |
| Stuart Number | N | σB²L / (ρv) | EM braking / inertia |
| Magnetic Prandtl No. | Pm | ν / η = μ₀σν | Viscous / magnetic diffusion |

### 3.2 Derived Relations

- N = Ha² / Re (Stuart-Hartmann identity)
- S = Rm × (v_A / v)
- Pm = Rm / Re

### 3.3 Regime Classification

The code classifies regimes using threshold scoring:

| Regime | Condition | Physical Meaning |
|--------|-----------|------------------|
| Frozen-in flux | Rm ≫ 1 | Field lines move with fluid |
| Resistive diffusion | Rm ≪ 1 | Field decays rapidly |
| MHD-dominated | Ha ≫ 1 | Hartmann layers form |
| Hydrodynamic | Ha ≪ 1 | EM forces negligible |
| Hall regime | β_H ≫ 1 | Electron-ion decoupling |
| Pinch-dominated | N ≫ 1 | EM braking dominates |

**References:**
- Davidson, P. A. (2001). *An Introduction to Magnetohydrodynamics*. Cambridge University Press.
- Müller, U. & Bühler, L. (2001). *Magnetofluiddynamics in Channels and Containers*. Springer.
- Goedbloed, H. & Poedts, S. (2004). *Principles of Magnetohydrodynamics*. Cambridge University Press.

---

## 4. MHD Induction Equation

**File:** `mhd_induction_solver.py`

### 4.1 Generalised Form

```
∂B/∂t = ∇×(v×B) − ∇×(η∇×B) + (1/neμ₀)∇×[(∇×B)×B] − (1/neμ₀)∇×(∇Pₑ)
         ─────────   ──────────   ────────────────────────   ──────────────────
         Advection   Resistive     Hall term                 Electron pressure
                     diffusion                               gradient
```

where η = 1/(μ₀σ) is the magnetic diffusivity.

### 4.2 1D Cylindrical Solver (Z-Pinch)

For B_θ(r, t) in cylindrical geometry, the induction equation reduces to:

```
∂B_θ/∂t = -∂/∂r(v_r B_θ) + η [∂²B_θ/∂r² + (1/r)∂B_θ/∂r − B_θ/r²]
```

The current density is:

```
J_z = (1/μ₀r) ∂(rB_θ)/∂r
```

And the Lorentz body force:

```
F_r = -J_z × B_θ
```

### 4.3 Numerical Method

- Explicit Euler time-stepping
- CFL-limited adaptive timestep: dt ≤ 0.4 × min(Δr²/(2η), Δr/v_max)
- Second-order central differences for spatial derivatives
- Boundary conditions: B(0) = 0 (axis), ∂B/∂r(R) = 0 (outer)

### 4.4 3D Solver (Simplified)

A Cartesian grid solver for the full 3-component B-field using curl operations:

```
∂B/∂t = ∇×(v×B) + η∇²B
```

This simplified form neglects Hall and electron pressure terms.

---

## 5. Hartmann Channel Flow

**File:** `hartmann_flow.py`

### 5.1 Problem Setup

A conducting fluid flows between parallel plates separated by distance 2L,
with a transverse magnetic field B.  This models the nano-gap between the
collapsing bubble wall and the lattice surface.

### 5.2 Velocity Profiles

**Insulating walls** (Shercliff condition):

```
u(y)/u₀ = [1 - cosh(Ha·y/L)/cosh(Ha)] / [1 - tanh(Ha)/Ha]
```

**Conducting walls**:

```
u(y)/u₀ = [Ha - cosh(Ha·y/L)/cosh(Ha)] / [Ha - tanh(Ha)]
```

### 5.3 Key Derived Quantities

| Quantity | Formula |
|----------|---------|
| Boundary layer thickness | δ_Ha = L / Ha |
| Flow rate ratio | Q_MHD/Q_Poiseuille = (3/Ha) × [1 − tanh(Ha)/Ha] |
| Pressure drop ratio | (Q_MHD/Q_Poiseuille)⁻¹ |

### 5.4 Casimir Quantum Correction

At nanometre separations, the Casimir pressure becomes non-negligible:

```
P_C = −π²ℏc / (240 d⁴)
```

For d = 10 nm: P_C ≈ −1.3 × 10⁻³ Pa (small but measurable).
For d = 1 nm: P_C ≈ −1.3 × 10⁵ Pa (significant).

The quantum correction factor modifies the effective Hartmann number:

```
Ha_eff = Ha × f_Q,    f_Q = 1 + |P_C| / P_ref
```

**References:**
- Hartmann, J. (1937). *Kgl. Danske Videnskab. Mat.-Fys. Medd.* 15(6).
- Shercliff, J. A. (1953). *Proc. Camb. Phil. Soc.* 49, 136.
- Casimir, H. B. G. (1948). *Proc. K. Ned. Akad. Wet.* 51, 793.
- Lifshitz, E. M. (1956). *Sov. Phys. JETP* 2, 73.

---

## 6. Hall and Faraday Channel Physics

**File:** `hall_faraday_channels.py`

### 6.1 Anisotropic Conductivity Tensor

In a magnetised plasma where electrons gyrate around field lines:

```
σ_∥       = σ₀                           (parallel to B)
σ_Pedersen = σ₀ / (1 + β_H²)            (perpendicular, along E⊥)
σ_Hall     = σ₀ β_H / (1 + β_H²)        (perpendicular, along E×B)
```

The full tensor:

```
    ┌                          ┐
    │  σ_P    −σ_H    0       │
σ = │  σ_H     σ_P    0       │
    │  0        0     σ_∥     │
    └                          ┘
```

### 6.2 Hall Current

```
J_H = σ_H (E + v×B) × B̂
```

The Hall current flows perpendicular to both the electric field and the
magnetic field, creating a helical current pattern during bubble collapse.

### 6.3 Faraday EMF and Channel Power

A conducting fluid moving through a magnetic field generates:

```
ε = v × B × L_channel
```

For a Faraday channel with loading parameter K:

```
P_output = K(1 − K) σ v² B² V_channel
```

Maximum power occurs at K = 0.5 (impedance matching).

### 6.4 Bubble Collapse Flux Compression

During spherical collapse, the magnetic flux is approximately frozen into
the conducting shell:

```
B_compressed = B₀ × (R₀/R_current)²
```

The energy density scales as B²/(2μ₀), so the compressed field can be
orders of magnitude larger than the ambient field.

### 6.5 Ion Slip Factor

When ion-neutral collisions are important:

```
α_slip = 1 + β_i²
```

where β_i = eB/(m_i ν_in) is the ion Hall parameter.  The effective Pedersen
conductivity becomes σ_P / α_slip.

---

## 7. Multi-Scale Bridging Framework

**File:** `multiscale_bridge.py`

### 7.1 Scale Hierarchy

| Level | Name | Length Scale | Key Physics |
|-------|------|-------------|-------------|
| 0 | MACRO | mm–cm | Reactor MHD, acoustic driving |
| 1 | BUBBLE | ~μm | Rayleigh-Plesset, flux compression |
| 2 | SURFACE | ~nm | Hartmann flow, Casimir, double-layer |
| 3 | LATTICE | ~Å | Proton screening, interstitial sites |
| 4 | NUCLEAR | ~fm | Tunnelling, S-factor, fusion |

### 7.2 Downward Boundary Condition Cascade

Each scale receives its boundary conditions from the scale above:

```
MACRO → BUBBLE:   B_bubble = B_macro (uniform field assumption)
BUBBLE → SURFACE: B_surface = B_bubble × (R₀/R_min)² (flux compression)
SURFACE → LATTICE: E_screening = U_s(λ_D, T_peak, n_ion)
LATTICE → NUCLEAR: n_nuclear = n_ion × compression_ratio³
```

### 7.3 Upward Source Term Cascade

Nuclear events propagate their effects upward:

```
NUCLEAR → LATTICE: Q_nuclear = nuclear_power × V_reaction
NUCLEAR → BUBBLE:  P_radiation = neutron_momentum_flux
LATTICE → SURFACE: ΔT_lattice = Q / (ρCpV)
```

### 7.4 Independent MHD at Each Scale

Each scale level has its own set of MHD dimensionless parameters computed
with scale-appropriate values of B, L, v, σ, ρ, and ν.  This allows the
physics regime to vary across scales — e.g., the macro scale may be
hydrodynamic (Ha ≪ 1) while the surface scale is MHD-dominated (Ha ≫ 1).

---

## 8. Nuclear Force Coupling

**File:** `nuclear_force_coupling.py`

### 8.1 Electromagnetic Coupling — Screening

Debye screening energy:

```
U_s = e² / (4πε₀ λ_D)  [J]
U_s [eV] = e / (4πε₀ λ_D)
```

where:

```
λ_D = √(ε₀ k_B T / (n_e e²))
```

**Important**: The screening energy is the Coulomb energy at the Debye length
scale.  For plasmas where n_e ≈ n_ion (quasi-neutral), we use n_ion in the
Debye formula.

**References**: Ichimaru (1993) Rev. Mod. Phys. 65, 255;
Assenbaum et al. (1987) Z. Phys. A 327, 461.

### 8.2 Gamow Factor and S-Factor

The nuclear cross-section is parameterised as:

```
σ(E) = S(E)/E × exp(−2πη)
```

where the Sommerfeld parameter is:

```
η = Z₁Z₂ α √(μc²/(2E))

  = Z₁Z₂ e² / (4πε₀ ℏ) × √(μ/(2E))
```

The astrophysical S-factor is a slowly varying function of energy, parameterised as:

```
S(E) = S₀ + S₀'E + ½S₀''E²
```

**D+D S-factor data** (NACRE II — Xu et al. 2013):

| Reaction | S₀ (keV·b) | S₀' (b) | Channel |
|----------|-----------|---------|---------|
| D(d,n)He3 | 55.4 | 0 | Neutron branch |
| D(d,p)T | 56.2 | 0 | Proton branch |
| D(d,γ)He4 | 5.6×10⁻⁶ | 0 | Radiative capture |

**Gamow energy** (peak of Gamow window):

```
E_G = 2μc² (πZ₁Z₂α)²
```

For D+D: E_G ≈ 986 keV.

**Effect of screening**: Screening shifts the effective collision energy upward:

```
σ_screened(E) = σ(E + U_s) × (E + U_s) / E
```

This can dramatically enhance cross-sections at low energies.

### 8.3 Weak Nuclear Coupling — Electron Capture

Inverse beta decay (p + e⁻ → n + ν_e) rate depends on:

```
Γ_ec ∝ |ψ_e(0)|² × (Q + U_s)²
```

where |ψ_e(0)|² is the electron density at the nucleus and Q = −0.782 MeV
is the mass difference.

**Rydberg enhancement**: In Rydberg matter states, extended electron orbitals
increase |ψ_e(0)|² at specific nuclear sites, potentially enhancing the
electron capture rate.

**Reference**: Bahcall (1964) Phys. Rev. 135, B137.

### 8.4 D+D Branching Ratios

At E ≲ 100 keV:

| Channel | Branching Ratio | Products |
|---------|----------------|----------|
| D(d,n)He3 | ~50% | 2.45 MeV neutron + 0.82 MeV He-3 |
| D(d,p)T | ~50% | 3.02 MeV proton + 1.01 MeV tritium |
| D(d,γ)He4 | ~10⁻⁷ | 23.8 MeV gamma |

The near-exact 50/50 split between neutron and proton channels is a
consequence of isospin symmetry (Bosch & Hale, 1992).

---

## 9. Enhancement Factor Model

### 9.1 Design Philosophy

Each enhancement factor is derived from a distinct, non-overlapping physical
mechanism.  We use conservative, individually capped contributions.

### 9.2 Components

**a) Flux Compression Enhancement**

```
f_flux = max(1, B_compressed / B_initial) = max(1, (R₀/R_min)²)
```

Physical basis: Higher B-field increases confinement pressure and Faraday EMF.
Ref: Lindemuth & Kirkpatrick (1983) Nucl. Fusion 23, 263.

**b) MHD Confinement Quality (√Stuart)**

```
f_stuart = max(1, √N)
```

Physical basis: The confinement time scales as N^(1/2) for an MHD-dominated
collapse.  Using √N rather than N avoids overestimation.
Ref: Davidson (2001) §5.3.

**c) Gamow Screening Enhancement**

```
f_gamow = σ_screened / σ_bare
```

Physical basis: This is the most rigorous factor — directly comparing
cross-sections with and without screening.
Refs: Assenbaum et al. (1987), Ichimaru (1993).

### 9.3 Total Enhancement

```
f_total = f_flux × f_stuart × f_gamow
f_total = min(f_total, MAX_ENHANCEMENT_FACTOR)
```

where MAX_ENHANCEMENT_FACTOR = 10⁵ (configurable) prevents unphysical
extrapolation.

### 9.4 What Was Removed (v0.3.0.1)

- **Hartmann pressure-drop-ratio enhancement**: Removed because pressure drop
  reflects flow resistance, not confinement for fusion.  The physics link
  was questionable.
- **Raw Stuart number as enhancement**: Replaced with √N for better scaling.

---

## 10. Confidence Calculation

### 10.1 Design

The confidence score measures the regime validity of the underlying physics
models, not the magnitude of the enhancement.  A high enhancement with low
confidence means "the theory predicts a large effect, but the model conditions
may be outside its validated regime."

### 10.2 Sub-Scores

| Sub-Score | Formula | Range | Meaning |
|-----------|---------|-------|---------|
| Compression | min(χ/5, 1) | [0, 1] | Adiabatic compression ≥ 5× → full credit |
| MHD regime | 0.5×min(Rm/0.01, 1) + 0.5×min(Ha, 1) | [0, 1] | Both Rm and Ha contribute |
| Loading | min(loading, 1) | [0, 1] | H/Pd loading ratio |
| Screening | 1.0 if U_s < 1 keV, else 0.5 | {0.5, 1} | Plausibility check |
| Nuclear data | 0.9 | fixed | NACRE II data quality |

### 10.3 Combined Confidence

```
C = min(1, C_compression × C_mhd × C_loading × C_screening × C_nuclear)
```

### 10.4 Interpretation

- **C > 0.7**: High confidence — all conditions within validated regimes
- **C = 0.3–0.7**: Moderate — some extrapolation beyond validated conditions
- **C < 0.3**: Low — significant model uncertainty, results are indicative only

### 10.5 Methodology Reference

Inspired by Bayesian model evidence scoring:
Sivia, D. S. & Skilling, J. (2006). *Data Analysis: A Bayesian Tutorial*.
2nd ed. Oxford University Press.

---

## 11. Mathematical Corrections Log

This section documents corrections made for mathematical rigour.

### v0.3.0.1-beta (February 2026)

| Issue | Previous | Corrected | Impact |
|-------|----------|-----------|--------|
| **Screening energy unit bug** | `E_CHARGE / (4πε₀λ_D) / E_CHARGE` | `E_CHARGE / (4πε₀λ_D)` | Factor of ~1.6×10¹⁹ underestimation |
| **Collapse velocity** | v_c = R₀/t_c (average) | v_max = √(2ΔP/3ρ) (peak) | More accurate for MHD peak conditions |
| **Stuart enhancement** | max(1, N) | max(1, √N) | Avoids overestimation; scales with confinement time |
| **Hartmann enhancement** | max(1, pressure_drop_ratio) | Removed | Physically unjustified for fusion |
| **Confidence model** | (χ/10)×(Ha/10)×loading | Multi-factor regime-validity model | More physically meaningful |

---

## 12. Test Coverage

**File:** `tests/test_mhd_physics.py` — 47 tests

### Dimensionless Parameters (10 tests)
- Alfvén velocity known value
- Magnetic diffusivity
- Rm, Ha, β, β_H computations
- Regime classification (frozen-in, diffusive)
- Stuart number identity (N = Ha²/Re)
- Zero-field edge case

### Hartmann Flow (6 tests)
- Poiseuille limit (Ha → 0)
- No-slip boundary conditions
- Profile flattening with increasing Ha
- Boundary layer thickness δ = L/Ha
- Flow rate ratio bounds
- Casimir quantum correction at nanoscale

### Hall & Faraday Channels (7 tests)
- Zero-field isotropic limit
- Conductivity tensor anti-symmetry
- Pedersen-Hall relation
- Strong-field limit
- Faraday EMF calculation
- Maximum efficiency at K = 0.5
- Power conservation

### Nuclear Cross-Sections (7 tests)
- D+D S-factor order of magnitude
- Neutron vs proton channel parity
- Radiative capture suppression
- Screening increases cross-section
- Branching ratio sum to 1
- Sommerfeld parameter positivity
- Gamow energy for D+D

### Electron Capture (3 tests)
- Free proton EC suppressed
- Higher screening increases rate
- Rydberg enhancement increases rate

### Multi-Scale Bridge (4 tests)
- All 5 scales computed
- Downward BC increases field
- Full solve returns all keys
- Dominant physics classification

### Induction Solver (3 tests)
- Z-pinch initial condition
- Diffusion decays field
- Compression amplifies field (Rm ≫ 1)

### Full Integration (7 tests)
- Basic calculation produces valid output
- MHD observables present in results
- Branching ratios in observables
- Not applicable when conditions are zero
- Higher field increases observables
- Metadata has references
- Enhancement capped at MAX_ENHANCEMENT_FACTOR

---

## 13. References

### Bubble Dynamics
1. Rayleigh, Lord (1917). "On the pressure developed in a liquid during the collapse of a spherical cavity." *Philos. Mag.* 34, 94–98.
2. Plesset, M. S. (1949). "The dynamics of cavitation bubbles." *J. Appl. Mech.* 16, 277–282.
3. Brenner, M. P., Hilgenfeldt, S., & Lohse, D. (2002). "Single-bubble sonoluminescence." *Rev. Mod. Phys.* 74(2), 425–484.

### Magnetohydrodynamics
4. Hartmann, J. (1937). "Theory of laminar flow of an electrically conductive liquid in a homogeneous magnetic field." *Kgl. Danske Videnskab. Mat.-Fys. Medd.* 15(6), 1–28.
5. Shercliff, J. A. (1953). "Steady motion of conducting fluids in pipes under transverse magnetic fields." *Proc. Camb. Phil. Soc.* 49, 136.
6. Davidson, P. A. (2001). *An Introduction to Magnetohydrodynamics*. Cambridge University Press.
7. Müller, U. & Bühler, L. (2001). *Magnetofluiddynamics in Channels and Containers*. Springer.
8. Goedbloed, H. & Poedts, S. (2004). *Principles of Magnetohydrodynamics*. Cambridge University Press.
9. Sutton, G. W. & Sherman, A. (1965). *Engineering Magnetohydrodynamics*. McGraw-Hill.
10. Huba, J. D. (2003). "Hall magnetohydrodynamics — a tutorial." *Space Sci. Rev.* 107, 175–190.
11. Lindemuth, I. R. & Kirkpatrick, R. C. (1983). "Parameter space for magnetized fuel targets in inertial confinement fusion." *Nucl. Fusion* 23, 263.

### Quantum Vacuum
12. Casimir, H. B. G. (1948). "On the attraction between two perfectly conducting plates." *Proc. K. Ned. Akad. Wet.* 51, 793–795.
13. Lifshitz, E. M. (1956). "The theory of molecular attractive forces between solids." *Sov. Phys. JETP* 2, 73–83.

### Nuclear Physics
14. Xu, Y. et al. (2013). "NACRE II: An update of the NACRE compilation of thermonuclear reaction rates." *Nucl. Phys. A* 918, 61–169.
15. Caughlan, G. R. & Fowler, W. A. (1988). "Thermonuclear reaction rates V." *At. Data Nucl. Data Tables* 40, 283.
16. Bahcall, J. N. (1964). "Electron capture and nuclear matrix elements of Be-7." *Phys. Rev.* 135, B137.
17. Assenbaum, H. J., Langanke, K., & Rolfs, C. (1987). "Effects of electron screening on low-energy fusion cross sections." *Z. Phys. A* 327, 461–468.
18. Ichimaru, S. (1993). "Nuclear fusion in dense plasmas." *Rev. Mod. Phys.* 65, 255–299.
19. Bosch, H.-S. & Hale, G. M. (1992). "Improved formulas for fusion cross-sections and thermal reactivities." *Nucl. Fusion* 32, 611.

### LENR
20. Storms, E. (2007). *The Science of Low Energy Nuclear Reaction*. World Scientific.
21. Fleischmann, M. & Pons, S. (1989). "Electrochemically induced nuclear fusion of deuterium." *J. Electroanal. Chem.* 261, 301–308.
22. Hagelstein, P. L. (2012). "Phonon-nuclear coupling." *J. Condensed Matter Nucl. Sci.* 12, 18–40.

### Statistical Methodology
23. Sivia, D. S. & Skilling, J. (2006). *Data Analysis: A Bayesian Tutorial*. 2nd ed. Oxford University Press.

---

*Generated for LENR Simulation App v0.3.0.1-beta — February 2026*
