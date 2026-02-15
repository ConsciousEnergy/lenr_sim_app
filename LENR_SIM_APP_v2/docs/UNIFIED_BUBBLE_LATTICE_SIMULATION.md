# Unified Bubble-Lattice LENR Simulation

**Version**: 0.3.2-beta  
**Date**: February 2026  
**Feature Branch**: lenr_sim_app_v0.3.0.0-beta

---

## Overview

The Unified Bubble-Lattice LENR Simulation is a comprehensive 3D visualization and physics calculation system that models **electrodynamic ionic double-layer bubble collapse onto lattice-loaded materials**. This feature integrates multiple physical phenomena from the unified LENR theoretical framework into a single interactive simulation.

### Key Capabilities

- **3D Visualization** of bubble collapse dynamics with ionic double-layer, MHD flow, and phase-dependent H₂/D₂ particles
- **Heterogeneous Nucleation** animation: bubble nucleates small at surface, grows while attached, then collapses
- **Proton Phase Transitions** through force regimes (EM → Weak → Strong)
- **Real-time Enhancement Calculations** based on theoretical physics
- **Time-series Analysis** of collapse events and enhancement factors

---

## Theoretical Foundation

Based on the unified theoretical framework document: *"A Unified Theoretical Framework for Low-Energy Nuclear Reactions: Integrating Quantum, Nuclear, and Condensed Matter Phenomena"*

### Core Physical Mechanisms

| Mechanism | Description | Section |
|-----------|-------------|---------|
| **Rydberg Matter** | Extended electron orbitals enabling energy localization | 2.1 |
| **Halo Electrons** | Enhanced nuclear overlap probability (~10⁻³) | 2.2 |
| **Double-Layer QED** | Field strengths up to 10⁸ V/m at interfaces | 2.3 |
| **Casimir Effect** | Quantum vacuum energy focusing at nanoscale | 2.4 |
| **Bubble Collapse** | Modified Rayleigh-Plesset dynamics | 3.2 |
| **Heterogeneous Nucleation** | Classical nucleation at surfaces; contact angle f(θ), critical radius, waiting time | 3.3 |
| **Bubble–Surface Coupling** | Equilibrium distance, vdW/Casimir, detachment, microjet, standoff enhancement | 3.4 |
| **Boundary Layers** | Thermal and diffusion layer thickness; Nusselt/Lewis scaling; nucleation zone | 3.5 |
| **Acoustic Forcing** | Minnaert resonance, Bjerknes forces, streaming, nucleation enhancement, rectified diffusion | 3.6 |
| **MHD Confinement** | Dimensionless parameters (Rm, Ha, S, β, N), flux compression, Hartmann flow | 4.1 |
| **Hall/Faraday Channels** | Anisotropic conductivity tensor, Hall current, Faraday EMF during collapse | 4.2 |
| **Multi-Scale Bridging** | Five-level hierarchy (macro→nuclear) with boundary condition cascade | 4.3 |
| **Nuclear Force Coupling** | Gamow screening, electron capture, D+D S-factor, branching ratios | 4.4 |

### MHD Dimensionless Parameters

The Bubble-MHD theory computes key dimensionless numbers at each scale to determine the dominant physics regime:

| Parameter | Symbol | Formula | Physical Meaning |
|-----------|--------|---------|------------------|
| Magnetic Reynolds No. | Rm | vLσμ₀ | Advection vs. diffusion of B-field |
| Hartmann Number | Ha | BL√(σ/ρν) | EM body force vs. viscous force |
| Lundquist Number | S | v_A L σ μ₀ | Alfvénic vs. resistive timescale |
| Plasma Beta | β | 2μ₀nk_BT / B² | Thermal vs. magnetic pressure |
| Hall Parameter | β_H | eB / (m_e ν_c) | Electron gyrofrequency vs. collisions |
| Stuart Number | N | σB²L / (ρv) | EM braking vs. inertial force |
| Magnetic Prandtl No. | Pm | ν / η | Viscous vs. magnetic diffusion |

**Regime classification**: Rm ≫ 1 → frozen-in flux; Ha ≫ 1 → MHD-dominated flow; β_H ≫ 1 → Hall regime.

### Proton Phase Model

Protons transition through four force regimes during bubble collapse:

```
FREE (EM) → SCREENED → CAPTURE_READY (Weak) → NUCLEAR (Strong)
```

| Phase | Color | Description |
|-------|-------|-------------|
| **FREE** | Blue (#3498db) | Normal electromagnetic behavior |
| **SCREENED** | Cyan (#00ffff) | Coulomb barrier lowered 10-100 eV |
| **CAPTURE_READY** | Yellow (#f1c40f) | Weak force coupling (p + e⁻ → n + νₑ) |
| **NUCLEAR** | Orange-Red (#ff4500) | Strong force engagement possible |

---

## Architecture

The unified model passes `gap_width_nm` and `crack_width_nm` through to the theory pipeline so theories (e.g., Casimir confinement, Hartmann flow) can use nano-gap and crack dimensions in their calculations.

### Backend Physics Engine

```
backend/app/physics_engine/
├── bubble_lattice_interaction.py       # Rayleigh-Plesset + lattice coupling
├── proton_phase_model.py               # Multi-force state transitions
├── unified_lenr_model.py               # Core enhancement calculations
├── udh_physics.py                      # Ultra-Dense Hydrogen physics
├── fluid_dynamics_solver.py            # D3Q19 LBM with MHD body force coupling
├── theories/                              # 19 TheoryModule implementations
│   ├── bubble_mhd_confinement.py       # Full MHD nano-confinement theory
│   ├── electron_screening.py           # Debye screening theory module
│   ├── coherent_qed.py                 # Confined-mode QED / coherent domains
│   ├── hydroton.py                     # Storms' Hydroton model
│   ├── nae_model.py                    # Nuclear Active Environment
│   ├── casimir_confinement.py          # Casimir + Lifshitz correction
│   ├── quantum_tunneling_theory.py     # WKB/Gamow tunneling
│   ├── takahashi_tsc.py                # Takahashi TSC 4D condensate
│   ├── hagelstein_phonon.py            # Hagelstein phonon-nuclear coupling
│   ├── vysotskii_ccs.py                # Vysotskii CCS tunnelling
│   ├── swartz_nanor.py                 # Swartz NANOR/LANR OOP model
│   ├── miles_heat_helium.py            # Miles He-4/heat correlation
│   ├── widom_larsen.py                 # Widom-Larsen ULM neutrons
│   ├── kim_bec.py                      # Kim BEC nuclear fusion
│   ├── matsumoto_enc.py                # Matsumoto electro-nuclear collapse
│   ├── chubb_ion_band.py              # Chubb ion band state fusion
│   ├── piantelli_ni_h.py              # Piantelli Ni-H thermal activation
│   ├── iwamura_transmutation.py        # Iwamura D permeation transmutation
│   └── letts_laser.py                  # Letts & Cravens dual-laser
├── theory_pipeline.py                  # Registry/runner for all 19 theories; receives gap_width_nm, crack_width_nm from unified model
├── theory_relationships.py             # Graph data model (nodes, edges)
├── theory_scoring.py                   # 5-factor Predictive Probability Score
├── theory_validation.py                # 7 cross-examination checks
├── mhd/
│   ├── __init__.py                     # MHD package exports
│   ├── dimensionless_parameters.py     # Rm, Ha, S, β, N, Pm, v_A + regimes
│   ├── mhd_induction_solver.py         # 1D cylindrical + 3D induction equation
│   ├── hartmann_flow.py                # Analytical Hartmann channel profiles
│   ├── hall_faraday_channels.py        # Conductivity tensor, Hall/Faraday EMF
│   ├── multiscale_bridge.py            # 5-level macro→nuclear hierarchy
│   └── nuclear_force_coupling.py       # EM/Weak/Strong nuclear coupling
└── __init__.py                         # Module exports
```

#### Key Classes

**BubbleLatticeInteraction**
- Implements modified Rayleigh-Plesset equation with electric field term
- Calculates peak conditions (temperature, pressure, field strength)
- Estimates proton phase distribution at collapse

**ProtonPhaseModel**
- Tracks protons through force regime transitions
- Calculates screening energy, overlap probability, tunneling enhancement
- Based on threshold conditions from theory paper

**BubbleMHDConfinementTheory** (v0.3.2-beta)
- Full Theory Module implementing the `TheoryModule` protocol
- Rayleigh-Plesset collapse with peak velocity estimate (Rayleigh 1917)
- Computes all MHD dimensionless parameters at collapse conditions
- Flux compression via bubble-collapse MHD model
- Hartmann channel flow in nano-gap with Casimir quantum correction
- Multi-scale bridging (MACRO → BUBBLE → SURFACE → LATTICE → NUCLEAR)
- Nuclear coupling: D+D cross-sections from NACRE II S-factors, electron capture
- Multi-factor confidence scoring based on regime validity

**MultiscaleBridge**
- Five-level hierarchy with independent MHD parameter computation at each scale
- Downward cascade: macro B-field → compressed B at bubble → surface-enhanced B
- Upward cascade: nuclear energy release → lattice heating → bubble pressure source

### Frontend Visualization

```
frontend/src/components/visualizations/
├── UnifiedBubbleLatticeVisualization.jsx  # Main 3D scene
├── ProtonPhaseSystem.js                   # Proton particle management
├── DoubleLlayerEffect.js                  # Electric field visualization
└── index.ts                               # Component exports
```

#### Three.js Scene Architecture

```
Scene
├── LatticeGroup (host atoms, loaded hydrogen, bonds)
├── BubbleGroup (bubble sphere, double-layer, pressure rings)
├── ProtonPhaseGroup (color-coded protons)
├── FieldVisualization (field lines, energy particles)
└── EffectsGroup (hotspots, collapse flash, shockwave)
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/unified/bubble-lattice` | POST | Run full simulation |
| `/api/unified/bubble-lattice/instant` | GET | Get instantaneous conditions |
| `/api/physics/nucleation/calculate` | POST | Full nucleation analysis (barrier, critical radius, waiting time) |
| `/api/physics/boundary-layer/profile` | POST | Thermal/diffusion layer profiles with distance |
| `/api/physics/surface-reaction-rate` | POST | Integrated surface reaction rate (nucleation + proximity + LENR) |
| `/api/physics/surface-physics/materials` | GET | Material property reference (Pd, Ni, D₂O) |
| `/api/analytics/theory-graph` | GET | Network graph nodes + edges for Relevance Map |
| `/api/analytics/theory-properties` | GET | Physical properties taxonomy |
| `/api/analytics/theory-scores` | POST | Compute Predictive Probability Scores |
| `/api/analytics/theory-comparison` | POST | Run multi-theory comparison |
| `/api/analytics/parameter-sweep` | POST | Parameter sweep across theories |
| `/api/analytics/validation-report` | GET | Cross-examination validation report |

---

## Key Equations

### Modified Rayleigh-Plesset (Bubble Collapse)

```
RR̈ + (3/2)Ṙ² = (1/ρ)[P_b - P_∞ - 2σ/R - 4μṘ/R + ε₀E²/2]
```

Where the electric field term `ε₀E²/2` accounts for double-layer effects.

**Rayleigh collapse time** (Rayleigh, 1917):

```
t_c = 0.915 R₀ √(ρ/ΔP)
```

**Peak wall velocity** (more accurate than average R₀/t_c):

```
v_max = √(2ΔP / 3ρ)
```

### MHD Induction Equation

```
∂B/∂t = ∇×(v×B) − ∇×(η∇×B) + (1/neμ₀)∇×[(∇×B)×B] − (1/neμ₀)∇×(∇Pₑ)
         ─────────   ──────────   ────────────────────────   ──────────────────
         Advection   Resistive     Hall term                 Electron pressure
                     diffusion
```

Where η = 1/(μ₀σ) is the magnetic diffusivity.

### Hartmann Velocity Profile

```
u(y)/u₀ = (1 - cosh(Ha·y/L) / cosh(Ha)) / (1 - 1/Ha·tanh(Ha))
```

Boundary layer thickness: δ_Ha = L/Ha

### Screening Energy (Debye Estimate)

```
U_s = e² / (4πε₀ λ_D)   [J]  →  U_s [eV] = e / (4πε₀ λ_D)

λ_D = √(ε₀ k_B T / (n_ion e²))
```

Ref: Ichimaru (1993) Rev. Mod. Phys. 65, 255.

### Gamow Factor and S-Factor

```
σ(E) = S(E)/E · exp(−2πη)

η = Z₁Z₂e² √(μ/2E) / (4πε₀ℏ)   (Sommerfeld parameter)
```

D+D S-factors from NACRE II: S₀ ≈ 55 keV·barn for D(d,n)He3.

### Tunneling Enhancement

```
P_tunnel = exp(-2/ℏ ∫√[2m(V(x)-E)]dx)
```

Combined screening, QED, and coherence effects can enhance tunneling by factors of 10³-10⁸.

### Halo Electron Overlap

```
P_overlap = (1/πa³)exp(-2r₀/a) ≈ 10⁻³
```

Critical for neutron formation pathway.

### Multi-Factor Confidence Model

```
C = min(1, C_compression × C_mhd × C_loading × C_screening × C_nuclear_data)

C_compression = min(χ/5, 1)          where χ = compression ratio
C_mhd         = 0.5·min(Rm/0.01, 1) + 0.5·min(Ha/1, 1)
C_loading     = min(loading, 1)
C_screening   = 1.0 if U_s < 1 keV, else 0.5
C_nuclear_data = 0.9                 (NACRE II quality)
```

---

## Usage

### Access Routes

- **Simulation Page**: `/unified-theory`
- **Theory Documentation**: `/theory`

### Sidebar Navigation

1. Click **"Unified Theory"** in the sidebar (marked with NEW badge)
2. Select a system preset (Pd-D, Ni-H, or Ti-D)
3. Adjust parameters using sliders
4. Click **"Run Physics Simulation"**

### Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| Loading Ratio | 0.5 - 1.0 | H/Pd atomic ratio |
| Temperature | 200 - 800 K | System temperature |
| Driving Pressure | 0.5 - 5.0 bar | Acoustic pressure amplitude |
| Frequency | 5 - 50 kHz | Acoustic driving frequency |
| Initial Bubble Radius | 1 - 50 μm | Starting bubble size before collapse |
| Defect Density | 1e14 - 1e18 m⁻³ | Lattice defect concentration |
| Surface Roughness | 0.1 - 100 nm | Electrode surface roughness scale |
| Grain Size | 10 - 500 nm | Crystallite size in host material |
| Number of Acoustic Cycles | 1 - 10 | Acoustic cycles per simulation |

### Visualization Tabs

1. **3D Visualization** - Interactive bubble collapse animation
2. **Enhancement Timeline** - Enhancement factor vs. collapse phase
3. **Proton Phases** - Distribution of protons across force regimes
4. **Results** - Peak conditions and numerical results
5. **Theory** - Summary and link to full documentation

---

## Files Added/Modified

### New Files

| File | Description |
|------|-------------|
| `backend/.../bubble_lattice_interaction.py` | Rayleigh-Plesset + lattice physics |
| `backend/.../proton_phase_model.py` | Proton phase transition model |
| `frontend/.../UnifiedBubbleLatticeVisualization.jsx` | Main 3D visualization |
| `frontend/.../ProtonPhaseSystem.js` | Proton particle system |
| `frontend/.../DoubleLlayerEffect.js` | Electric field effects |

### Modified Files

| File | Changes |
|------|---------|
| `backend/.../unified_simulation.py` | Added bubble-lattice endpoints |
| `backend/.../physics_engine/__init__.py` | Export new modules |
| `frontend/src/App.tsx` | Route for UnifiedTheoryPage |
| `frontend/.../index.ts` | Export new visualization |
| `frontend/.../UnifiedTheoryPage.jsx` | Complete rewrite with new visualization |

---

## Theory Testbed Integration (v0.3.2-beta)

The bubble-lattice simulation now connects to the **Theory Testbed Layer** — 19 independent LENR theory modules that can be run, scored, and compared against each other and experimental benchmarks.

### Theory Pipeline

Each theory implements the `TheoryModule` protocol and receives the same `PhysicalConditions` dict (temperature, loading_ratio, pressure, etc.). The `TheoryPipeline` orchestrator runs all enabled theories and returns per-theory contributions and a combined result.

### Relevance Map (Enhanced Network Explorer)

The `/analytics` → **Relevance Map** tab is a rigid force-directed network explorer
(inspired by [Epstein Doc Explorer](https://epstein-doc-explorer-1.onrender.com/)) showing:
- **Rigid layout** — high friction simulation that settles quickly; dragged nodes pin in place
- **Nodes** sized by predictive-probability score, coloured by category, with glow for high-score nodes
- **Edges** indicating shared physical properties (e.g., Coulomb barrier reduction, He-4 production)
- **Click-to-select** with detail panel — full theory info, score breakdown, connected theories
- **Neighbourhood highlighting** — selected node and neighbours bright, rest dimmed
- **Search bar** — real-time fuzzy search by theory name, researcher, or ID
- **Network stats** — live Theories / Relationships / Properties counters
- **Edge labels on hover** — shows relationship type on connected edges
- **Status bar** — usage instructions and "Unpin all" control
- **Filters** by category, physical property, and minimum score

### Theory Scoring

The Predictive Probability Score (`theory_scoring.py`) combines multiple factors into a geometric mean. Key design choices:

- **Scoring floor at 0.05** — Prevents geometric mean catastrophe when any factor approaches zero; individual factors are clamped to a minimum of 0.05 before aggregation.
- **Alternative key mapping for observables completeness** — Theories may report observables under different keys (e.g., `He4`, `he4`, `product_He4`); the scorer maps these to a canonical set for completeness evaluation.
- **Neutral score for inapplicable theories** — When a theory's `is_applicable()` returns `False`, it receives a neutral score (0.5) rather than penalizing the ensemble, so inapplicable conditions do not distort comparisons.

### Cross-Examination

Seven automated validation checks (`theory_validation.py`) test each theory against experimental benchmarks:
1. Miles correlation (He-4/heat ratio)
2. No dangerous radiation
3. Loading threshold (x > 0.85)
4. Surface-area dependence
5. Product spectrum (He-4 dominant)
6. Thermal activation window
7. Reproducibility across conditions

See [THEORY_CROSS_EXAMINATION.md](./THEORY_CROSS_EXAMINATION.md) for details.

---

## Future Improvements

1. ~~**Real-time Backend Integration** — WebSocket for live physics updates~~ ✅ (v0.3.2)
2. **Parameter Optimization** — ML-guided parameter suggestions
3. ~~**Export Capabilities** — Save simulation data and visualizations~~ ✅ (v0.3.0)
4. **Multi-bubble Dynamics** — Simulate multiple interacting bubbles
5. **Lattice Defect Mapping** — Visualize and configure defect sites
6. **Full 3D MHD Induction** — Couple the 3D induction solver to the LBM fluid dynamics
7. **Time-dependent Hartmann** — Transient Hartmann profiles during collapse
8. **Bayesian Uncertainty Propagation** — Full posterior estimation of enhancement factors
9. **Experimental Benchmarking** — Compare nuclear rates against published excess-heat datasets
10. **Theory Sensitivity Heatmaps** — Parameter sweep across all 19 theories
11. **Ensemble Model Selection** — Bayesian model averaging over theory contributions
12. **Experimental Dataset Ingestion** — Import published LENR datasets for direct comparison

---

## References

### Bubble Dynamics & Sonoluminescence
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

### Quantum & Nuclear
12. Casimir, H. B. G. (1948). "On the attraction between two perfectly conducting plates." *Proc. K. Ned. Akad. Wet.* 51, 793–795.
13. Lifshitz, E. M. (1956). "The theory of molecular attractive forces between solids." *Sov. Phys. JETP* 2, 73–83.
14. Ichimaru, S. (1993). "Nuclear fusion in dense plasmas." *Rev. Mod. Phys.* 65, 255–299.
15. Assenbaum, H. J., Langanke, K., & Rolfs, C. (1987). "Effects of electron screening on low-energy fusion cross sections." *Z. Phys. A* 327, 461–468.
16. Bosch, H.-S. & Hale, G. M. (1992). "Improved formulas for fusion cross-sections and thermal reactivities." *Nucl. Fusion* 32, 611.
17. Xu, Y. et al. (2013). "NACRE II: An update of the NACRE compilation." *Nucl. Phys. A* 918, 61–169.
18. Caughlan, G. R. & Fowler, W. A. (1988). "Thermonuclear reaction rates V." *At. Data Nucl. Data Tables* 40, 283.
19. Bahcall, J. N. (1964). "Electron capture and nuclear matrix elements of Be-7." *Phys. Rev.* 135, B137.

### LENR
20. Acs, D. et al. (2025). "A Unified Theoretical Framework for Low-Energy Nuclear Reactions."
21. Fleischmann, M. & Pons, S. (1989). "Electrochemically induced nuclear fusion of deuterium." *J. Electroanal. Chem.* 261, 301–308.
22. Storms, E. (2007). *The Science of Low Energy Nuclear Reaction*. World Scientific.
23. Hagelstein, P. L. (2012). "Phonon-nuclear coupling." *J. Condensed Matter Nucl. Sci.* 12, 18–40.

### Statistical Methodology
24. Sivia, D. S. & Skilling, J. (2006). *Data Analysis: A Bayesian Tutorial*. 2nd ed. Oxford University Press.

---

### LENR Theories (added v0.3.2-beta)
25. Takahashi, A. (2009). "TSC-induced nuclear reactions and cold transmutation." *Condensed Matter Nucl. Sci.* 1, 86–96.
26. Hagelstein, P. L. (2012). "Phonon-nuclear coupling." *J. Condensed Matter Nucl. Sci.* 12, 18–40.
27. Vysotskii, V. I. & Kornilova, A. A. (2009). "Coherent correlated states and low-energy nuclear reactions in non-stationary systems." *Eur. Phys. J. A* 40, 293–304.
28. Swartz, M. R. (2012). "NANOR-type CF/LANR quantum electronic device." *Proc. ICCF-17*.
29. Miles, M. H. (2004). "Correlation of excess enthalpy and helium-4 production." *Proc. ICCF-10*, 123–130.
30. Widom, A. & Larsen, L. (2006). "Ultra low momentum neutron catalyzed nuclear reactions." *Eur. Phys. J. C* 46, 107–111.
31. Kim, Y. E. (2009). "Theory of BEC mechanism for D-D nuclear fusion in micro/nano-scale metal grains." *Naturwissenschaften* 96, 803–811.
32. Matsumoto, T. (1995). "Observation of meshlike traces on nuclear emulsions." *Fusion Technol.* 27, 104.
33. Chubb, S. R. & Chubb, T. A. (1990). "Ion band state fusion." *Proc. ACCF-1* 5, 119–126.
34. Piantelli, F. et al. (2010). "Anomalous heat production in Ni-H systems." *Proc. ICCF-14*.
35. Iwamura, Y. et al. (2002). "Observation of nuclear transmutation reactions." *Jpn. J. Appl. Phys.* 41, 4642–4648.
36. Letts, D. & Cravens, D. (2003). "Laser stimulation of deuterated palladium." *Proc. ICCF-10*, 159–170.

*This documentation is part of the LENR Simulation App v0.3.2-beta release.*
