# LENR Framework — Cavitation and Bubble Collapse Audit

**Purpose:** Validate orders-of-magnitude for T, P, timescales near surfaces; determine which parts couple into nuclear rate models vs serve as activation triggers.  
**References:** [LENR_FRAMEWORK_ISSUE_LEDGER.md](LENR_FRAMEWORK_ISSUE_LEDGER.md)

---

## 1. Modified Rayleigh–Plesset Equation

**Equation:**
\[
R \ddot{R} + \frac{3}{2} \dot{R}^2 = \frac{1}{\rho} \left( P_{\text{bubble}} - P_{\infty} - \frac{2\sigma}{R} - \frac{4\mu \dot{R}}{R} + \frac{\epsilon_0 E^2}{2} \right)
\]

**Terms:**
- P_bubble: internal bubble pressure
- P_∞: ambient
- 2σ/R: Laplace (surface tension)
- 4μṘ/R: viscous damping
- ε₀E²/2: electric pressure

---

## 2. Electric Pressure Term (IL-006)

| E (V/m) | ε₀E²/2 (Pa) |
|---------|-------------|
| 10⁸ | ~4.4×10⁴ (~0.04 MPa) |
| 10⁹ | ~4.4×10⁶ (~4 MPa) |

**Collapse pressures:** GPa scale (0.1–1 GPa per paper). Electric term is 10⁻⁵–10⁻² of collapse pressure at E~10⁸ V/m.

**Resolution:** Treat electric term as secondary unless E >> 10⁸ V/m. Include in model but document as minor; do not rely on it for collapse severity.

---

## 3. Collapse Temperature (IL-014)

**Claim:** Localized T can exceed 10⁵ K.

**Reference:** Sonoluminescence typically 10⁴ K; 10⁵ K requires extreme collapse (small R_min, high drive).

**Timescale:** Collapse ~ µs–ns; temperature spike duration ~ ns. Too short for equilibrium nuclear processes but may create transient conditions.

**Resolution:** Use T_max as function of R_min, drive pressure. Recommend conservative range 10³–10⁴ K unless specific simulation/experiment supports 10⁵ K. Document regime (bubble size, drive, proximity to surface).

---

## 4. Collapse Pressure

**Claim:** 0.1–1 GPa, "multiple GPa."

**Order-of-magnitude:** Adiabatic compression P ~ P₀ (R₀/R_min)^(3γ). For R_min/R₀ ~ 0.01–0.1, γ~1.4, P can reach GPa. Plausible.

**Resolution:** Accept 0.1–1 GPa as achievable; "multiple GPa" for strong collapse.

---

## 5. How Cavitation Enters Rate Equations

**Option A – Direct:** Collapse T, P temporarily reduce barrier or increase local D density. Use as transient enhancement factor in rate:
\[
f_{\text{cavitation}} = f_{\text{ambient}} \times g(T_{\max}, P_{\max}, \tau_{\text{collapse}})
\]
Requires model for g.

**Option B – Trigger:** Cavitation creates defect activation, nucleation sites, or loading cycles. Affects P_threshold (probability of exceeding threshold) rather than f_enhancement directly.

**Option C – Neglect:** If collapse is rare or spatially localized, treat as secondary; focus on steady-state screening/field/coherence.

**Resolution:** Define coupling explicitly. Recommended: Option B (trigger) unless quantitative g(T,P,τ) is available. Do not double count with screening/field.

---

## 6. Surface Proximity Effects

**Claim:** For γ = h/R < 2, collapse pressure and temperature amplified (asymmetric collapse, microjet).

**Reference:** Known from sonoluminescence near boundaries (Lauterborn, etc.). Jet velocity can exceed 100 m/s; impact pressure ~ ρ c v.

**Resolution:** Include surface-proximity factor in collapse model: multiply P_max, T_max by factor depending on γ. Typical: 1–3× for γ~1.

---

## 7. Simulation Coupling

| Input | Output | Rate equation use |
|-------|--------|-------------------|
| R_bubble, P_drive, ρ, σ, μ, E_field | R(t), P_max, T_max, τ_collapse | f_cavitation or P_threshold |
| Surface proximity γ | Amplified P, T | Same |
| Nucleation rate (ΔG*, θ) | Bubble population | Affects active volume |

**Recommendation:** Implement bubble dynamics module; output P_max, T_max, τ. Use as modifier to P_threshold or separate f_cavitation. Do not add to f_screening or f_field to avoid double counting.

## 8. Detector honesty peer (Pyyhtiä 2026)

**Citation:** Pyyhtiä et al., *J. Electroanal. Chem.* 1013, 120104 (2026), DOI 10.1016/j.jelechem.2026.120104 (`pyyhtia2026`).

**Finding:** Electrolytic HER nanobubble cavitation damages CR-39; pits are not reliable nuclear-track proof under gas evolution (SPAWAR-class confounder).

**Resolution for this audit:** Cite as experimental cavitation / detector-confounder support. Do **not** retune nuclear-rate bands from CR-39 pit diameters; keep cavitation–nuclear coupling as modelled enhancement / contested hydro; `EQ-OPEN-RAD-01` stays OPEN.
