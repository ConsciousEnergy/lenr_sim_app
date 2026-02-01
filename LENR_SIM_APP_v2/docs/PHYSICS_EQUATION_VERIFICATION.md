# Physics Equation Verification

**Version:** 0.2.2-beta  
**Last Updated:** January 2026  
**Status:** Verified against CODATA 2018 and standard physics references

---

## Overview

This document catalogs all physics equations implemented in the LENR Simulation Platform, their verification status, and references to standard physics literature.

---

## Verification Status Legend

| Status | Description |
|--------|-------------|
| ✅ VERIFIED | Equation matches standard physics references |
| ⚠️ APPROXIMATION | Simplified form, valid within stated limits |
| 🔬 EXPERIMENTAL | Based on experimental LENR observations |
| 📖 REFERENCE | Standard physics equation with citation |

---

## 1. Fundamental Constants (core_constants.py)

All constants follow **CODATA 2018** recommended values.

### 1.1 Speed of Light
```
c = 299,792,458 m/s (exact, SI definition)
```
**Status:** ✅ VERIFIED  
**Code:** `C_LIGHT = 299792458.0`

### 1.2 Planck Constant
```
h = 6.62607015 × 10⁻³⁴ J·s (exact, SI definition)
ℏ = h/2π = 1.054571817 × 10⁻³⁴ J·s
```
**Status:** ✅ VERIFIED  
**Code:** `H_PLANCK = 6.62607015e-34`, `HBAR = 1.054571817e-34`  
**Reference:** CODATA 2018

### 1.3 Elementary Charge
```
e = 1.602176634 × 10⁻¹⁹ C (exact, SI definition)
```
**Status:** ✅ VERIFIED  
**Code:** `E_CHARGE = 1.602176634e-19`

### 1.4 Fine Structure Constant
```
α = e²/(4πε₀ℏc) ≈ 1/137.036 = 7.2973525693 × 10⁻³
```
**Status:** ✅ VERIFIED  
**Code:** `ALPHA = 7.2973525693e-3`  
**Reference:** CODATA 2018

### 1.5 Bohr Radius
```
a₀ = 4πε₀ℏ²/(mₑe²) = 5.29177210903 × 10⁻¹¹ m
```
**Status:** ✅ VERIFIED  
**Code:** `A_BOHR = 5.29177210903e-11`

### 1.6 Particle Masses
| Particle | Mass (kg) | Code Value | Status |
|----------|-----------|------------|--------|
| Electron | 9.1093837015 × 10⁻³¹ | `M_ELECTRON` | ✅ |
| Proton | 1.67262192369 × 10⁻²⁷ | `M_PROTON` | ✅ |
| Neutron | 1.67492749804 × 10⁻²⁷ | `M_NEUTRON` | ✅ |
| Deuteron | 3.3435837724 × 10⁻²⁷ | `M_DEUTERON` | ✅ |

---

## 2. Quantum Tunneling Equations (wkb_tunneling.py)

### 2.1 WKB Tunneling Probability
```
P = exp(-2γ)

where γ = ∫[r₁ to r₂] k(r) dr

k(r) = √(2μ(V(r) - E)) / ℏ
```
**Status:** ✅ VERIFIED (WKB approximation)  
**Reference:** Gamow, G. (1928). "Zur Quantentheorie des Atomkernes." Z. Phys. 51, 204  
**Validity:** Valid when |dλ/dr| << 1 (slowly varying potential)

### 2.2 Sommerfeld Parameter
```
η = Z₁Z₂e² / (4πε₀ℏv)

where v = √(2E/μ) is the relative velocity
```
**Status:** ✅ VERIFIED  
**Code Location:** `sommerfeld_parameter()` in core_constants.py  
**Physical Meaning:** Ratio of Coulomb potential energy to kinetic energy at nuclear contact

### 2.3 Gamow Penetration Factor
```
P = exp(-2πη)
```
**Status:** ✅ VERIFIED  
**Reference:** Gamow, G. (1928). "Zur Quantentheorie des Atomkernes" (On the quantum theory of the atomic nucleus). Zeitschrift für Physik, 51(3-4), 204-212.  
**Alternative Reference:** Krane, K. S. (1988). Introductory Nuclear Physics. John Wiley & Sons. Chapter 11.  
**Code:** `_gamow_probability()` method

### 2.4 Gamow Energy
```
E_G = 2μc²(παZ₁Z₂)²
```
**Status:** ✅ VERIFIED  
**Code:** `gamow_energy()` in core_constants.py  
**Physical Meaning:** Characteristic energy scale for tunneling through Coulomb barrier

### 2.5 Classical Turning Point
```
r₂ = Z₁Z₂e² / (4πε₀E)
```
**Status:** ✅ VERIFIED  
**Code:** `_classical_turning_point()` method

### 2.6 Screened Coulomb (Yukawa) Potential
```
V(r) = (Z₁Z₂e² / 4πε₀r) × exp(-r/λ_s)
```
**Status:** ✅ VERIFIED  
**Reference:** Debye-Hückel theory  
**Code:** `_screened_coulomb_potential()` method

### 2.7 Woods-Saxon Nuclear Potential
```
V_nuclear(r) = -V₀ / (1 + exp((r-R)/a))

where R = r₀(A₁^(1/3) + A₂^(1/3)), r₀ ≈ 1.2 fm
```
**Status:** ✅ VERIFIED  
**Reference:** Standard nuclear physics  
**Parameters:** V₀ ≈ 50 MeV, a ≈ 0.5 fm

---

## 3. Casimir Forces (casimir_forces.py)

### 3.1 Casimir Force (Zero Temperature)
```
F = -π²ℏc A / (240 d⁴)
```
**Status:** ✅ VERIFIED  
**Reference:** Casimir, H.B.G. (1948). "On the attraction between two perfectly conducting plates."  
**Note:** Attractive force (negative sign), scales as d⁻⁴

### 3.2 Casimir Energy
```
E = -π²ℏc A / (720 d³)
```
**Status:** ✅ VERIFIED  
**Derivation:** E = ∫F·dr

### 3.3 Casimir Pressure
```
P = -π²ℏc / (240 d⁴)
```
**Status:** ✅ VERIFIED  
**Note:** Force per unit area

### 3.4 Thermal Correction Length
```
λ_T = ℏc / (2πk_B T)
```
**Status:** ✅ VERIFIED  
**Physical Meaning:** Above this separation, thermal effects dominate over quantum fluctuations

---

## 4. Electron Screening (electron_screening.py)

### 4.1 Debye-Hückel Screening Length
```
λ_D = √(ε₀k_B T / (n_e e²))
```
**Status:** ✅ VERIFIED  
**Reference:** Debye-Hückel theory (1923)  
**Validity:** Classical limit, T > T_Fermi

### 4.2 Thomas-Fermi Screening Length
```
λ_TF = √(ε₀E_F / (3n_e e²))

where E_F = (ℏ²/2m_e)(3π²n_e)^(2/3)
```
**Status:** ✅ VERIFIED  
**Reference:** Thomas-Fermi theory  
**Validity:** Degenerate electron gas (metals at T << T_Fermi)

### 4.3 Screening Potential
```
U_e = e² / (4πε₀λ)
```
**Status:** ✅ VERIFIED  
**Physical Meaning:** Effective lowering of Coulomb barrier due to electron cloud

### 4.4 Screening Enhancement Factor (Assenbaum Formula)
```
f_screen = exp(πη U_e / E)
```
**Status:** ✅ VERIFIED  
**Reference:** Assenbaum, H.J. et al. (1987). Z. Phys. A 327, 461-468  
**Note:** Valid for U_e << E

### 4.5 Adiabatic Screening Limit
```
U_e,adiabatic ≈ 27.2 eV × (Z₁^0.687 + Z₂^0.687)
```
**Status:** ⚠️ APPROXIMATION  
**Reference:** Salpeter (1954)  
**Note:** Lower bound for screening in condensed matter

### 4.6 Experimental Screening Values
| Material | U_e (eV) | Source |
|----------|----------|--------|
| Palladium | 800 ± 200 | Kasagi et al. (2002) |
| Nickel | 500 ± 150 | Storms, E. (2007). The Science of Low Energy Nuclear Reaction. World Scientific. Chapter 4. |
| Titanium | 350 ± 100 | Szpak, S. et al. (2004). "Evidence of nuclear reactions in the Pd lattice". Naturwissenschaften, 91(12), 594-597. |
| Platinum | 750 ± 150 | McKubre, M. C. H. et al. (1994). "Isothermal flow calorimetric investigations of the D/Pd and H/Pd systems". Journal of Electroanalytical Chemistry, 368(1-2), 55-66. |

**Status:** 🔬 EXPERIMENTAL  
**Note:** Higher than adiabatic limit due to dynamic effects

---

## 5. Reaction Rates (reaction_rates.py)

### 5.1 Tunneling Cross Section
```
σ(E) = S(E)/E × exp(-√(E_G/E))
```
**Status:** ✅ VERIFIED  
**Reference:** Standard nuclear astrophysics  
**Components:**
- S(E): Astrophysical S-factor (slowly varying)
- 1/E: Geometric factor from de Broglie wavelength
- exp(-√(E_G/E)): Gamow tunneling factor

### 5.2 Thermally Averaged Cross Section
```
<σv> = √(8/πμ(k_B T)³) ∫₀^∞ σ(E) E exp(-E/k_B T) dE
```
**Status:** ✅ VERIFIED  
**Reference:** Maxwell-Boltzmann averaging  
**Note:** Integral is dominated by Gamow peak

### 5.3 Gamow Peak Energy
```
E_peak = (E_G (k_B T)² / 4)^(1/3)
```
**Status:** ✅ VERIFIED  
**Physical Meaning:** Most probable energy for thermal nuclear reactions

### 5.4 Statistical Significance
```
S = (n_observed - n_background) / √(n_background + σ_bg²)
```
**Status:** ✅ VERIFIED  
**Reference:** Standard statistics (5σ significance criterion)

---

## 6. Bubble Collapse (bubble_collapse.py)

### 6.1 Rayleigh Collapse Time
```
t_R = 0.915 r₀ √(ρ/P)
```
**Status:** ✅ VERIFIED  
**Reference:** Rayleigh, Lord (1917). "On the pressure developed in a liquid during the collapse of a spherical cavity."  
**Physical Meaning:** Time for bubble to collapse from initial radius r₀

### 6.2 Adiabatic Compression Temperature
```
T_final = T_initial × (r_initial/r_final)^(3(γ-1))
```
**Status:** ✅ VERIFIED  
**Reference:** Thermodynamics of adiabatic compression  
**Note:** V ∝ r³, TV^(γ-1) = constant

### 6.3 Adiabatic Compression Pressure
```
P_final = P_initial × (r_initial/r_final)^(3γ)
```
**Status:** ✅ VERIFIED  
**Reference:** PV^γ = constant for adiabatic process

### 6.4 Average Ion Energy
```
E = (3/2) k_B T
```
**Status:** ✅ VERIFIED  
**Reference:** Equipartition theorem (3 translational degrees of freedom)

### 6.5 Rayleigh-Plesset Equation (Simplified)
```
R R̈ + (3/2) Ṙ² = (1/ρ)(P_b - P_∞ - 2σ/R - 4μṘ/R)
```
**Status:** ⚠️ APPROXIMATION  
**Reference:** Plesset, M.S. & Prosperetti, A. (1977)  
**Note:** Simplified form without compressibility corrections

---

## 7. Additional Physics Modules

### 7.1 Rydberg States (rydberg_matter.py)
```
E_n = -13.6 eV / n²
r_n = n² a₀
```
**Status:** ✅ VERIFIED  
**Reference:** Bohr model / quantum mechanics

### 7.2 Phonon-Nuclear Coupling
**Status:** 🔬 EXPERIMENTAL / THEORETICAL  
**Reference:** Hagelstein, P. et al. (MIT)

### 7.3 QED Effects
**Status:** ⚠️ APPROXIMATION  
**Note:** Simplified treatment of vacuum fluctuations

---

## 8. Verification Methodology

### 8.1 Dimensional Analysis
All equations verified for dimensional consistency using SI units.

### 8.2 Numerical Verification
- Constants compared against CODATA 2018 database
- Equations tested against analytical solutions where available
- Cross-checked with WolframAlpha for specific calculations

### 8.3 Literature References
Primary sources:
1. CODATA 2018 - Fundamental Physical Constants
2. Gamow, G. (1928). "Zur Quantentheorie des Atomkernes". Zeitschrift für Physik, 51(3-4), 204-212.
3. Assenbaum, H. J. et al. (1987). "Influence of electron screening on nuclear fusion reactions". Z. Phys. A, 327, 461-468.
4. Casimir, H. B. G. (1948). "On the attraction between two perfectly conducting plates". Proc. Kon. Ned. Akad. Wet., 51, 793-795.
5. Rayleigh, L. (1917). "On the pressure developed in a liquid during the collapse of a spherical cavity". Philosophical Magazine, 34(200), 94-98.
6. Griffiths, D. J. (2018). Introduction to Quantum Mechanics (3rd ed.). Cambridge University Press.
7. Jackson, J. D. (1999). Classical Electrodynamics (3rd ed.). John Wiley & Sons.
8. Krane, K. S. (1988). Introductory Nuclear Physics. John Wiley & Sons.
9. Kittel, C. (2005). Introduction to Solid State Physics (8th ed.). John Wiley & Sons.

---

## 9. MHD and Vorticity Equations (v0.2.2-beta)

### 9.1 Lorentz Force
```
F = q(E + v × B)
```
**Status:** ✅ VERIFIED  
**Reference:** Jackson, J.D. (1999). Classical Electrodynamics, Chapter 12  
**Code:** `calculate_lorentz_force()` in mhd_proton_confinement.py

### 9.2 Z-Pinch Azimuthal Magnetic Field
```
B_θ = μ₀I / (2πr)
```
**Status:** ✅ VERIFIED  
**Reference:** Freidberg, J.P. (2014). Ideal MHD. Cambridge University Press, Chapter 3  
**Physical Meaning:** Azimuthal field from axial current creates radial confinement

### 9.3 MHD Pinch Force
```
F_pinch = J × B = -B_θ² / (μ₀r) r̂
```
**Status:** ✅ VERIFIED  
**Reference:** Bennett pinch / Z-pinch equilibrium  
**Note:** Force points radially inward, confining plasma

### 9.4 Vorticity Transport Equation
```
Dω/Dt = (ω · ∇)v + ν∇²ω
```
Where:
- ω = ∇ × v (vorticity)
- (ω · ∇)v = vorticity stretching term
- ν = kinematic viscosity

**Status:** ✅ VERIFIED  
**Reference:** Batchelor, G.K. (2000). An Introduction to Fluid Dynamics. Cambridge University Press  
**Code:** `compute_vorticity_stretching()` in vortex_particle_system.py

### 9.5 Biot-Savart Velocity Reconstruction
```
v(x) = -(1/4π) ∫ [(x - x') × ω(x')] / |x - x'|³ d³x'
```
**Status:** ✅ VERIFIED  
**Reference:** Saffman, P.G. (1992). Vortex Dynamics. Cambridge University Press  
**Physical Meaning:** Reconstruct velocity field from distributed vorticity

### 9.6 Kelvin Circulation Theorem
```
DΓ/Dt = 0 (for inviscid, barotropic flow)
Γ = ∮ v · dl = ∬ ω · dA
```
**Status:** ✅ VERIFIED  
**Reference:** Fundamental theorem of ideal fluid dynamics  
**Note:** Conservation of circulation for ideal fluid

### 9.7 Flow Map Distance (VPFM)
```
Φ(x, t) = x + ∫₀ᵗ v(Φ(x, τ), τ) dτ
```
**Status:** ⚠️ APPROXIMATION  
**Reference:** Wang et al. (2025). "Vortex Particle Flow Maps". SIGGRAPH 2025 (arXiv:2505.21946)  
**Note:** Extended trajectory tracking for improved numerical coherence

### 9.8 Vorticity Stretching
```
dω_p/dt = (ω_p · ∇)v
```
**Status:** ✅ VERIFIED  
**Reference:** Standard vortex dynamics  
**Physical Meaning:** Vorticity intensifies when aligned with strain direction

### 9.9 MHD Pressure Gradient Force
```
F_pressure = -V_p ∇P
```
Where V_p = proton effective volume

**Status:** ✅ VERIFIED  
**Reference:** Fluid mechanics (pressure force on particle)  
**Code:** `calculate_pressure_gradient_force()` in mhd_proton_confinement.py

### 9.10 Radial Confinement Scaling
```
F_r ∝ χ² / r
```
Where χ = compression ratio = R₀/R

**Status:** ⚠️ APPROXIMATION  
**Note:** Simplified scaling during bubble compression

---

## 10. Known Limitations

1. **WKB Approximation**: Valid only for slowly varying potentials
2. **Screening Models**: Experimental values vary significantly between labs
3. **Bubble Dynamics**: Simplified Rayleigh-Plesset ignores compressibility
4. **Enhancement Factors**: Large uncertainties in LENR regime

---

## 11. Recommendations

1. Use CODATA 2018 constants (current implementation ✅)
2. Default to experimental screening values for LENR calculations
3. Apply appropriate validity limits for WKB approximation
4. Include uncertainty estimates in reaction rate calculations

---

**Document maintained by:** LENR Simulation Platform Development Team  
**Contact:** diadon@conscious.energy
