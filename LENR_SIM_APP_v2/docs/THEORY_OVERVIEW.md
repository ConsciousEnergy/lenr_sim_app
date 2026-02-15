# Unified LENR Theory Overview

**Version**: 0.3.3-beta  
**Last Updated**: February 2026

---

## Introduction

The Unified LENR (Low Energy Nuclear Reaction) Theory provides a comprehensive theoretical framework that integrates quantum mechanics, nuclear physics, and condensed matter phenomena to explain how nuclear reactions can occur at low energies in metal lattices loaded with hydrogen or deuterium.

This document provides an accessible overview of the unified framework. For detailed mathematical derivations and technical implementation, see the [Unified Bubble-Lattice Simulation Documentation](UNIFIED_BUBBLE_LATTICE_SIMULATION.md).

---

## What is LENR?

**Low Energy Nuclear Reactions (LENR)** are nuclear reactions that occur at temperatures and energies far below those required for traditional nuclear fusion. Unlike hot fusion (which requires millions of degrees), LENR can occur at room temperature or slightly elevated temperatures (300-500 K) when hydrogen or deuterium is loaded into certain metal lattices like palladium or nickel.

### Historical Context

- **1989**: Fleischmann and Pons reported "cold fusion" in palladium-deuterium systems
- **1990s-2000s**: Many researchers confirmed excess heat production but struggled to explain the mechanism
- **2010s-2020s**: Multiple theoretical frameworks emerged, each explaining different aspects
- **2025**: Unified framework integrates all major mechanisms into a single coherent model

---

## The Unified Framework: Six Key Mechanisms

The unified theory explains LENR through the interaction of six physical mechanisms:

### 1. Rydberg Matter

**What it is**: A state of matter where atoms have highly excited electrons in extended orbitals (n=10 or higher).

**Why it matters**: Extended orbitals allow energy to be concentrated in smaller volumes, effectively lowering the Coulomb barrier that normally prevents nuclear reactions.

**Key Equation**:
```
E_n = -13.6 eV / n²
```
For n=10, the energy is only -0.136 eV, much lower than ground state.

**In the simulation**: Temperature affects Rydberg state population, which influences enhancement factors.

---

### 2. Halo Electrons

**What it is**: Weakly bound electrons whose orbitals extend far beyond the nucleus, overlapping with nuclear wavefunctions.

**Why it matters**: This overlap increases the probability of electron capture processes (p + e⁻ → n + νₑ), which can lead to neutron formation and subsequent nuclear reactions.

**Key Concept**: Overlap probability depends on nuclear core radius r₀ ≈ 5 fm (not 0.1 nm, which is an ionic/atomic scale). Using the correct nuclear radius gives P_overlap ~ (r₀/a)³ exp(-2r₀/a) ~ 10⁻¹⁸, which is much smaller than earlier estimates but consistent with nuclear physics.

**In the simulation**: Halo electron effects are included in the screening enhancement calculations. The `proton_phase_model.py` uses r₀ = 1×10⁻¹⁵ m (1 fm) for the nuclear radius.

---

### 3. Confined-Mode QED / Coherent Domain Effects

**What it is**: In nano-confined geometries (lattice nano-gaps, bubble-lattice boundaries), the electromagnetic vacuum is modified. This is **not** standard Schwinger vacuum polarization (which gives negligible ε_eff - 1 ~ 10⁻²³ at LENR fields), but rather the Del Giudice/Preparata coherent domain model where collective N-particle coupling modifies virtual photon exchange.

**Why it matters**: Coherent domains (~10-100 nm radius) can form at room temperature and provide enhancement beyond what classical double-layer fields alone produce. This subsumes the earlier BEC model (which required an implausible T_c ~ 7.9 K).

**Key concepts**:
- Nano-gap geometry modifies EM mode density (analogous to Casimir but for virtual exchange photons)
- Collective coherent coupling of N particles inside a domain enhances the effect
- Standard vacuum polarization is negligible; the real contribution is geometry-dependent

**In the simulation**: The `CoherentQEDTheory` module in the Theory Testbed implements this, with parameters for coherence_domain_radius and particle_count_N. The `calculate_full_qed_enhancement()` function now includes both classical and confined-mode paths.

---

### 4. Bubble Collapse Dynamics

**What it is**: Acoustic cavitation creates bubbles that collapse violently, creating extreme conditions (high temperature, pressure, and electric fields).

**Why it matters**: The collapse concentrates energy in space and time, creating conditions where nuclear reactions become possible.

**Key Equation** (Modified Rayleigh-Plesset):
```
RR̈ + (3/2)Ṙ² = (1/ρ)[P_b - P_∞ - 2σ/R - 4μṘ/R + ε₀E²/2]
```

The additional electric field term (ε₀E²/2) is crucial for LENR applications.

**In the simulation**: You can adjust initial bubble radius, driving pressure, and frequency to see how they affect collapse dynamics.

---

### 5. Casimir Effect

**What it is**: Quantum vacuum fluctuations create an attractive force between closely spaced surfaces.

**Why it matters**: At nanoscale separations (during bubble collapse), this effect becomes significant and can help bring nuclei closer together.

**Key Equation**:
```
F_Casimir = -π²ℏc/240 × A/d⁴
```

The force scales with the inverse fourth power of separation distance, making it very strong at small distances.

**In the simulation**: Casimir effects are included in enhancement calculations, especially during bubble minimum phase.

---

### 6. Quantum Tunneling Enhancement

**What it is**: Combined effects of electron screening, phonon coupling, and QED enhancement can increase tunneling probability by factors of 10³ to 10⁵ (the more rigorous Part 2 analysis, 90% CI).

**Why it matters**: Even with all other enhancements, quantum tunneling through the Coulomb barrier is still required. These mechanisms make it much more probable.

**Key Concept**: WKB tunneling probability:
```
P_tunnel = exp(-2/ℏ ∫√[2m(V(x)-E)]dx)
```

**In the simulation**: Temperature and loading ratio affect screening, which directly impacts tunneling probability.

---

## Proton Phase Transitions

During bubble collapse, protons transition through four force regimes:

```
FREE (EM) → SCREENED → CAPTURE_READY (Weak) → NUCLEAR (Strong)
```

| Phase | Energy Range | Description |
|-------|-------------|-------------|
| **FREE** | E < 10 eV | Normal electromagnetic behavior, no nuclear effects |
| **SCREENED** | Enhancement > 10 | Coulomb barrier lowered by 10-100 eV due to electron screening |
| **CAPTURE_READY** | Enhancement > 10³ | Weak force coupling becomes significant (p + e⁻ → n + νₑ possible) |
| **NUCLEAR** | Enhancement > 10⁵ | Strong force engagement possible, nuclear reactions can occur |

**Visualization**: In the interactive simulation, protons are color-coded by phase:
- 🔵 Blue = FREE
- 🔷 Cyan = SCREENED  
- 🟡 Yellow = CAPTURE_READY
- 🔴 Orange-Red = NUCLEAR

---

## Theory Testbed: Peer-Level Theory Modules (v0.3.0)

In addition to the six integrated mechanisms above, the v0.3.0 release introduces a **Theory Testbed** architecture where competing LENR theories are implemented as peer-level modules that can be independently toggled, configured, and compared:

| Theory Module | Key Physics | References |
|---|---|---|
| **Electron Screening** | Debye screening reduces Coulomb barrier by 10-100 eV | Raiola 2004, Czerski 2001 |
| **Confined-Mode QED** | Del Giudice/Preparata coherent EM domains; replaces bulk Schwinger | Del Giudice 1998, Preparata 1995 |
| **Storms' Hydroton** | H-e-H-e-H covalent chain with resonance fusion and gradual photon cascade | Storms 2007, 2014 |
| **Nuclear Active Environment** | Crack-size filtering, simultaneity requirement, site probability, H-loading purity | Storms 2014 |
| **Bubble-MHD Confinement** | Nano-scale Ulam-Teller analog: Rayleigh-Plesset + Z-pinch + surface phase transitions | This work |
| **Casimir Confinement** | Quantum vacuum force with Lifshitz finite-conductivity correction | Casimir 1948, Lifshitz 1956 |
| **Quantum Tunneling** | WKB/Gamow base tunneling rate | Gamow 1928 |

### Validation Metrics

- **Miles heat-helium correlation**: 1 W excess heat ≈ 2.6×10¹¹ He-4 atoms/s (Miles 1993)
- **Ni-H thermal activation**: Reactions activate above ~700°C (973 K) for Ni-H systems
- **Hydrogen loading purity**: Continuous 0-1 parameter for H-accessible surface fraction

### Known Open Challenges

- **Multi-phonon energy gap problem**: Nuclear-scale energy transfer via phonons requires N ~ 10⁷-10⁸ coherent phonons, which is statistically implausible. Hagelstein's cascaded phonon-nuclear coupling model proposes a multi-step cascade as an alternative (see `phonon_interactions.py`).

---

## How It All Works Together

The unified framework shows how these mechanisms combine:

1. **Loading**: Hydrogen/deuterium is loaded into metal lattice (palladium, nickel, etc.)
2. **Bubble Formation**: Acoustic cavitation creates bubbles in the system
3. **Collapse**: Bubbles collapse, creating extreme conditions
4. **Enhancement**: Multiple mechanisms combine to enhance reaction probability:
   - Electron screening lowers Coulomb barrier
   - Rydberg matter concentrates energy
   - Double-layer fields modify dynamics
   - Casimir effect brings nuclei closer
   - Quantum tunneling becomes probable
5. **Reaction**: Nuclear reactions occur (D+D → ⁴He, p+e⁻ → n, etc.)
6. **Energy Release**: Excess heat and nuclear products are observed

---

## Interactive Simulation

The best way to understand the unified framework is through the interactive simulation:

**[Explore the Unified Theory Simulation →](/unified-theory)**

The simulation allows you to:
- Adjust parameters (temperature, loading ratio, pressure, frequency)
- See real-time 3D visualization of bubble collapse
- View enhancement factor timelines
- Observe proton phase transitions
- Export results for analysis

---

## Key Parameters

### Material Properties
- **Host Material**: Palladium, Nickel, or Titanium
- **Reactant**: Hydrogen or Deuterium
- **Loading Ratio**: H/M or D/M atomic ratio (0.9+ for LENR activity)

### Environmental Conditions
- **Temperature**: 200-800 K (affects screening length and Rydberg population)
- **Pressure**: Ambient pressure affects bubble dynamics

### Bubble Parameters
- **Initial Radius**: 2-10 μm (typical for sonoluminescence)
- **Driving Pressure**: 0.5-5 bar (controls collapse violence)
- **Frequency**: 5-50 kHz (acoustic frequency)

---

## Experimental Validation

The unified framework is consistent with experimental observations:

- ✅ **Excess Heat**: Predicted enhancement factors match observed heat production
- ✅ **Nuclear Products**: Theory explains why ⁴He is observed without high-energy neutrons
- ✅ **Material Dependence**: Framework explains why Pd-D and Ni-H show activity
- ✅ **Loading Threshold**: Theory predicts critical loading ratio (~0.85-0.9)
- ✅ **Temperature Effects**: Model matches observed temperature dependence

---

## Mathematical Foundations

For detailed mathematical derivations, see:
- [Unified Bubble-Lattice Simulation Documentation](UNIFIED_BUBBLE_LATTICE_SIMULATION.md)
- [Paper Corrections Applied](../../docs/PAPER_CORRECTIONS_APPLIED.md)

Key equations are implemented in:
- `backend/app/physics_engine/unified_lenr_model.py` -- Central simulation model
- `backend/app/physics_engine/theory_pipeline.py` -- Theory Testbed orchestrator (v0.3.0)
- `backend/app/physics_engine/theories/` -- Pluggable theory modules (v0.3.0)
- `backend/app/physics_engine/theories/bubble_mhd_confinement.py` -- Full MHD nano-confinement (v0.3.0.1)
- `backend/app/physics_engine/mhd/` -- MHD parameter package (v0.3.0.1):
  - `dimensionless_parameters.py` -- Rm, Ha, S, β, N, Pm, v_A + regimes
  - `mhd_induction_solver.py` -- 1D cylindrical + 3D induction equation
  - `hartmann_flow.py` -- Hartmann channel profiles + Casimir correction
  - `hall_faraday_channels.py` -- Conductivity tensor, Hall/Faraday EMF
  - `multiscale_bridge.py` -- 5-level macro→nuclear hierarchy
  - `nuclear_force_coupling.py` -- Gamow, S-factor, electron capture, branching
- `backend/app/physics_engine/bubble_lattice_interaction.py`
- `backend/app/physics/wkb_tunneling.py`
- `backend/app/physics/qed_effects.py` -- Confined-mode QED + classical QED
- `backend/app/physics/phonon_interactions.py` -- Phonon-assisted tunneling

For comprehensive MHD physics documentation, see:
- [MHD Nano-Confinement Physics](MHD_NANO_CONFINEMENT_PHYSICS.md)
- [MHD Proton Dynamics](MHD_PROTON_DYNAMICS.md)

---

## Complete Theory Module Inventory (v0.3.2-beta)

The simulation platform now includes **19 independently testable theory modules**, all implementing the `TheoryModule` protocol for composable pipeline execution.

### Existing Modules (1–7)

| # | Module ID | Researcher(s) | Category | Key Physics | product_He4 | product_neutrons | product_gamma |
|---|-----------|----------------|----------|-------------|------------|------------------|---------------|
| 1 | `electron_screening` | Raiola, Czerski | mechanism | Debye screening reduces Coulomb barrier by 10-100 eV | 1.0 | 0.0 | 0.0 |
| 2 | `coherent_qed` | Del Giudice, Preparata | mechanism | Coherent EM domains, QED vacuum modification | 1.0 | 0.0 | 0.0 |
| 3 | `hydroton` | Edmund Storms | mechanism | H-e-H-e-H chain, resonance fusion in nano-gaps | 1.0 | 0.01 | 0.0 |
| 4 | `nae_model` | Edmund Storms | mechanism | Nuclear Active Environment in cracks, loading threshold | 1.0 | 0.0 | 0.0 |
| 5 | `bubble_mhd_confinement` | (Novel) | mechanism | MHD flux compression, Hartmann flow confinement | derived | derived | 0.0 |
| 6 | `casimir_confinement` | Casimir, Lifshitz | mechanism | Quantum vacuum confinement at nanoscale | 1.0 | 0.0 | 0.0 |
| 7 | `quantum_tunneling` | Gamow | mechanism | WKB/Gamow base tunnelling rate | 1.0 | 0.0 | 0.0 |

### New Core Theories (8–12)

| # | Module ID | Researcher(s) | Category | Key Physics | product_He4 | product_neutrons | product_gamma |
|---|-----------|----------------|----------|-------------|------------|------------------|---------------|
| 8 | `takahashi_tsc` | Akito Takahashi | mechanism | 4D simultaneous tunnelling at tetrahedral sites → 2He-4 + 47.6 MeV | 1.0 | 0.0 | 0.0 |
| 9 | `hagelstein_phonon` | Peter Hagelstein | mechanism | 24 MeV → 10^8 phonons via anharmonic coupling (no gamma) | 1.0 | 0.0 | 0.0 |
| 10 | `vysotskii_ccs` | Vladimir Vysotskii | mechanism | Coherent Correlated States, up to 10^40 tunnelling enhancement | 1.0 | 0.0 | 0.0 |
| 11 | `swartz_nanor` | Mitchell Swartz | engineering | Optimal Operating Point in loading-current space (NANOR device) | 1.0 | 0.0 | 0.0 |
| 12 | `miles_heat_helium` | Melvin Miles | measurement | 1W = 2.6×10^11 He-4/s quantitative validation | 1.0 | 0.0 | 0.0 |

### Complementary Theories (13–15)

| # | Module ID | Researcher(s) | Category | Key Physics | product_He4 | product_neutrons | product_gamma |
|---|-----------|----------------|----------|-------------|------------|------------------|---------------|
| 13 | `widom_larsen` | Widom, Larsen | mechanism | Ultra-low momentum neutrons via weak interaction | 0.0 | 0.5 | 0.0 |
| 14 | `kim_bec` | Yeong Kim | mechanism | BEC of deuterons in nano-grains, N²-enhanced rate | 1.0 | 0.0 | 0.0 |
| 15 | `matsumoto_enc` | Takaaki Matsumoto | triggering | Electro-nuclear collapse, itonic clusters | 0.3 | 0.1 | 0.05 |

### Extended Theories (16–19)

| # | Module ID | Researcher(s) | Category | Key Physics | product_He4 | product_neutrons | product_gamma |
|---|-----------|----------------|----------|-------------|------------|------------------|---------------|
| 16 | `chubb_ion_band` | Scott & Talbot Chubb | mechanism | Ion band state D-D fusion, three miracles addressed | 1.0 | 0.0 | 0.0 |
| 17 | `piantelli_ni_h` | Francesco Piantelli | engineering | Ni-H thermal activation >400-700K, surface area scaling | 0.0 | 0.0 | 0.1 |
| 18 | `iwamura_transmutation` | Yasuhiro Iwamura | mechanism | Multi-D transmutation via Pd/CaO/Pd multilayers | 0.0 | 0.0 | 0.0 |
| 19 | `letts_laser` | Dennis Letts, Dennis Cravens | triggering | Dual-laser 680 nm stimulation, 10-30× enhancement | 1.0 | 0.0 | 0.0 |

### Theory Scoring and Validation

All 19 theories are scored using a 5-factor Predictive Probability Score:
- **Physical consistency** (25%): Conservation laws, no NaN/Inf, sensible enhancement
- **Experimental agreement** (25%): Miles correlation, He-4 production, no radiation
- **Parameter sensitivity** (15%): Robustness to ±10% parameter variation
- **Cross-theory agreement** (15%): Compatible predictions with other theories
- **Observables completeness** (20%): Coverage of key LENR observables

Scores are visualised in the **Relevance Map** (Analytics → Relevance Map tab), a D3 force-directed network graph where node size = score, edge thickness = relationship strength.

### Improved Scoring Methodology (v0.3.2-beta)

The scoring system has been refined with the following improvements:

- **Geometric mean floor at 0.05**: Factor scores use a minimum floor of 0.05 in the geometric mean calculation to avoid penalising theories excessively when a single factor is inapplicable or yields zero.

- **Alternative key mapping for completeness scoring**: The observables completeness factor supports alternative key mapping, allowing theories to be scored against a broader set of observable keys when the primary mapping does not apply (e.g. for theories with different product signatures).

- **Neutral score for inapplicable theories**: When a theory does not apply to a given validation criterion (e.g. a non-D-D theory vs. Miles He-4 correlation), the system assigns a neutral score rather than penalising the theory, improving fairness across diverse theory types.

For the full cross-examination framework, see [THEORY_CROSS_EXAMINATION.md](THEORY_CROSS_EXAMINATION.md).

---

## References

1. **Fleischmann, M. & Pons, S.** (1989). "Electrochemically Induced Nuclear Fusion of Deuterium". *J. Electroanal. Chem.*, 261, 301-308.

2. **Gamow, G.** (1928). "Zur Quantentheorie des Atomkernes". *Zeitschrift für Physik*, 51, 204-212.

3. **Hagelstein, P.L.** (2012). "Phonon-nuclear coupling and coherent energy transfer in condensed matter". *J. Condensed Matter Nucl. Sci.*, 6.

4. **Storms, E.** (2007). *The Science of Low Energy Nuclear Reaction*. World Scientific.

5. **Storms, E.** (2014). *The Explanation of Low Energy Nuclear Reaction*. Infinite Energy Press. (Hydroton model, NAE theory)

6. **Acs, D. et al.** (2025). "A Unified Theoretical Framework for Low-Energy Nuclear Reactions".

7. **Holmlid, L.** (2009). "Rydberg Matter and Mesoscopic Physics". *Physica Scripta*.

8. **Widom, A. & Larsen, L.** (2006). "Ultra Low Momentum Neutron Catalyzed Nuclear Reactions on Metallic Hydride Surfaces". *Eur. Phys. J. C*, 46, 107.

9. **Casimir, H.B.G.** (1948). "On the attraction between two perfectly conducting plates". *Proc. K. Ned. Akad. Wet.*, 51, 793.

10. **Miles, M.H.** (1993). "Correlation of excess enthalpy and helium-4 production". *J. Electroanal. Chem.*, 346, 99-117.

11. **Del Giudice, E. et al.** (1998). "Collective dynamics of water in the living cell and in bulk liquid". *J. Biol. Phys.*, 24, 121.

12. **Preparata, G.** (1995). *QED Coherence in Matter*. World Scientific.

13. **Takahashi, A.** (2008). "Tetrahedral Symmetric Condensate (TSC) model for cold fusion". *J. Condensed Matter Nucl. Sci.*, 1, 86.

14. **Raiola, F. et al.** (2004). "Enhanced electron screening in d(d,p)t for deuterated metals". *Eur. Phys. J. A*, 19, 283-287.

15. **Czerski, K. et al.** (2001). "Enhancement of the electron screening effect for d+d fusion reactions in metallic environments". *Europhys. Lett.*, 54, 449.

16. **Lifshitz, E.M.** (1956). "The Theory of Molecular Attractive Forces Between Solids". *Sov. Phys. JETP*, 2, 73.

17. **Rayleigh, Lord** (1917). "On the pressure developed in a liquid during the collapse of a spherical cavity". *Philos. Mag.*, 34, 94–98.

18. **Hartmann, J.** (1937). "Theory of laminar flow of an electrically conductive liquid in a homogeneous magnetic field". *Kgl. Danske Videnskab. Mat.-Fys. Medd.*, 15(6).

19. **Davidson, P.A.** (2001). *An Introduction to Magnetohydrodynamics*. Cambridge University Press.

20. **Ichimaru, S.** (1993). "Nuclear fusion in dense plasmas". *Rev. Mod. Phys.*, 65, 255–299.

21. **Xu, Y. et al.** (2013). "NACRE II: An update of the NACRE compilation". *Nucl. Phys. A*, 918, 61–169.

22. **Assenbaum, H.J., Langanke, K., & Rolfs, C.** (1987). "Effects of electron screening on low-energy fusion cross sections". *Z. Phys. A*, 327, 461–468.

23. **Bosch, H.-S. & Hale, G.M.** (1992). "Improved formulas for fusion cross-sections and thermal reactivities". *Nucl. Fusion*, 32, 611.

24. **Lindemuth, I.R. & Kirkpatrick, R.C.** (1983). "Parameter space for magnetized fuel targets in ICF". *Nucl. Fusion*, 23, 263.

25. **Takahashi, A.** (2004). "Deuteron cluster fusion and related nuclear reactions". *Proc. ICCF-10*, 809.

26. **Hagelstein, P.L. & Chaudhary, I.U.** (2015). "Phonon-nuclear coupling for anomalies in CMNS". *J. Condensed Matter Nucl. Sci.*, 16, 46-63.

27. **Vysotskii, V.I. & Kornilova, A.A.** (2013). "Coherent correlated states and low-energy nuclear reactions". *Eur. Phys. J. A*, 49, 99.

28. **Swartz, M.** (2006). "Optimal Operating Point Characteristics". *Proc. ICCF-11*, 335-346.

29. **Kim, Y.E.** (2009). "Bose-Einstein condensation mechanism for deuteron-induced nuclear reactions". *Naturwissenschaften*, 96, 803-811.

30. **Matsumoto, T.** (1995). "Observation of new particles emitted during cold fusion". *Fusion Technology*, 27, 235.

31. **Chubb, T.A. & Chubb, S.R.** (1990). "Cold fusion as an interaction between ion band states". *Fusion Technology*, 17, 710.

32. **Focardi, S. & Piantelli, F.** (1998). "Anomalous heat production in Ni-H systems". *Nuovo Cimento A*, 111, 1233.

33. **Iwamura, Y. et al.** (2002). "Elemental Analysis of Pd Complexes: Effects of D₂ Gas Permeation". *Jpn. J. Appl. Phys.*, 41, 4642.

34. **Letts, D. & Cravens, D.** (2003). "Laser stimulation of deuterated palladium". *Proc. ICCF-10*, 159-170.

35. **Kim, Y.E. & Ward, T.E.** (2012). "Bose-Einstein condensate theory of deuteron fusion in metal". *J. Condensed Matter Nucl. Sci.*, 6, 101.

36. **Bush, B.F. et al.** (1991). "Helium production during electrolysis of D₂O". *J. Electroanal. Chem.*, 304, 271.

37. **McKubre, M.C.H.** (1998). "Review of experimental measurements involving dd reactions". *Proc. ICCF-7*.

---

## Cross-Theory Coupling (v0.3.3-beta)

The theory pipeline now supports **coupled mode**, where theories execute in topological dependency order and upstream outputs feed into downstream conditions:

- **Execution Order**: Determined by `topological_sort()` on directed edges in the theory relationship graph (Kahn's algorithm)
- **Promoted Keys**: `screening_potential_eV`, `T_peak_K`, `P_peak_Pa`, `B_compressed_T`, `he4_production_rate` are auto-promoted to top-level conditions
- **Namespaced Outputs**: All observables injected as `{theory_id}__{key}` to avoid collisions
- **Coupling Map**: Visualized in the frontend via "Fed by" chips on each theory card

### Legacy Module Integration (v0.3.3-beta)

Two legacy physics modules have been wrapped as TheoryModule implementations:

| Module | Theory ID | Integration |
|--------|-----------|-------------|
| `phonon_nuclear_coupling.py` | `phonon_coupling_legacy` | Standalone theory module with Debye-Waller, Bose-Einstein phonon occupation |
| `non_equilibrium_thermo.py` | `non_equilibrium_thermo` | Standalone theory module with COP, excess power, entropy production |
| `rydberg_matter.py` | (integrated into `electron_screening`) | Rydberg state formation probability modulates screening potential |
| `boundary_layers.py` | (integrated into `bubble_mhd_confinement`) | Thermal/diffusion layer analysis at bubble wall |

---

## Further Reading

- **Interactive Simulation**: [Unified Theory Page](/unified-theory) - Full 3D visualization with parameter controls
- **Technical Documentation**: [UNIFIED_BUBBLE_LATTICE_SIMULATION.md](UNIFIED_BUBBLE_LATTICE_SIMULATION.md)
- **MHD Physics Reference**: [MHD_NANO_CONFINEMENT_PHYSICS.md](MHD_NANO_CONFINEMENT_PHYSICS.md) - Comprehensive MHD formulas and derivations
- **MHD Proton Dynamics**: [MHD_PROTON_DYNAMICS.md](MHD_PROTON_DYNAMICS.md) - Proton transport and confinement
- **API Documentation**: [API Reference](../api/physics_endpoints.md)
- **Known Issues**: [KNOWN_ISSUES_v0.2-beta.md](KNOWN_ISSUES_v0.2-beta.md)

---

## Questions?

For questions about the theory or simulation:
- Check the [Troubleshooting Guide](KNOWN_ISSUES_v0.2-beta.md)
- Review the [API Documentation](../api/physics_endpoints.md)
- Contact: diadon@conscious.energy

---

**Note**: This is a theoretical framework. While it explains experimental observations and makes testable predictions, further experimental validation is ongoing in the LENR research community.
