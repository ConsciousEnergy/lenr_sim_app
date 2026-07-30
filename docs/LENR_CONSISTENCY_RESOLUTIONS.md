# LENR Framework — Consistency Resolutions

**Purpose:** Resolve internal contradictions identified in the Issue Ledger by recomputation and adoption of a single consistent parameterization.  
**References:** [LENR_FRAMEWORK_ISSUE_LEDGER.md](LENR_FRAMEWORK_ISSUE_LEDGER.md)

---

## 1. Casimir Force (IL-001)

**Resolved parameterization:**

| Parameter | Value | Notes |
|-----------|-------|-------|
| Formula | \( F = -\frac{\pi^2 \hbar c}{240} \frac{A}{d^4} \) | Parallel-plate, ideal conductor |
| A | 1 µm² = 1×10⁻¹² m² | |
| d | 1 nm = 1×10⁻⁹ m | |
| **F** | **≈ -1.3×10⁻³ N (-1.3 mN)** | Use this in all downstream calculations |

**Recomputation:**
- π² ≈ 9.87, ℏ ≈ 1.055×10⁻³⁴ J·s, c ≈ 3×10⁸ m/s
- Numerator: 9.87 × 1.055×10⁻³⁴ × 3×10⁸ ≈ 3.13×10⁻²⁵
- A/d⁴ = 10⁻¹² / 10⁻³⁶ = 10²⁴
- F = -3.13×10⁻²⁵ × 10²⁴ / 240 ≈ -1.3×10⁻³ N

**For LaTeX section:** Replace "10⁻⁷ N" with "~1 mN" or state that for 10⁻⁷ N one would need d ≈ 3.2 nm or A ≈ 7.7×10⁻¹⁶ m².

---

## 2. Tunneling Enhancement (IL-002)

**Resolved parameterization:**

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **f_enhancement** | **10³ – 10⁵** | Adopt revised, conservative range from Monte Carlo/UQ |
| Prior for simulation | log-uniform over [10³, 10⁵] | Avoid overclaiming |

**Action:** Remove all claims of "10⁸" enhancement from abstract and body; add footnote: "Earlier estimates of 10⁸ were revised downward based on Monte Carlo uncertainty propagation and consistency with experimental bounds."

---

## 3. Overlap Probability (IL-003)

**Superseded note (kept for audit trail):** An earlier version of this resolution
adopted r₀ ≈ 0.1 nm for the "halo" regime, giving P_overlap ~5×10⁻³. That radius
is atomic-scale, not nuclear-scale, and was later identified as a genuine error
(13 orders of magnitude overestimate — see `ISSUE_LEDGER.md` issue C2), not a
legitimate second regime. The corrected resolution below replaces it.

**Resolved: nuclear-scale radius, two independent theory modules (not a hard selector)**

| Model | P_overlap | r₀ (nuclear-scale) | Code |
|-------|-----------|---------------------|------|
| Halo / electron-capture overlap | ≈8.5×10⁻¹⁶ (before screening enhancement) | 5 fm | `proton_phase_model.py` (`NUCLEAR_RADIUS_M = 5e-15` m) |
| Delocalized ion-band overlap | 10⁻¹⁰ – 10⁻¹² (volume-ratio, depends on delocalization length) | 1.5 fm | `theories/chubb_ion_band.py` (`R_nuclear = 1.5e-15` m) |

**Formula (halo/electron-capture model):** \( P_{\text{overlap}} \approx (r_0/a)^3 e^{-2r_0/a} \) with a = 0.529 nm (10 a₀), r₀ ≈ 5 fm. This matches Part 1 §2.2 of the current paper.

**Usage:** Both models now use nuclear-scale radii, so their outputs differ by ordinary model-parameter variation (delocalization length, effective wavefunction amplitude at the nucleus), not by an atomic-vs-nuclear regime error. They are intentionally run as two independent, claim-tier-weighted theory contributions in `theory_pipeline.py` rather than unified behind a single selector — the claim-tier/evidence-class weighting (see `theory_scoring.py`) is the app's regime-arbitration mechanism. Per IL-007, the halo P_overlap is not used to justify the p+e⁻→n pathway at low energy (that pathway remains energetically disfavored); it is used for overlap-sensitive electronic effects (screening, wavefunction penetration).

---

## 4. Thomas–Fermi Screening (IL-004)

**Problem:** Exponent Z₁Z₂e²k_TF/(4πϵ₀E) in eV units gives ~144 for E=0.1 eV, not 0.1–1.

**Resolved:** Use the *adiabatic screening energy* Ue (eV) in place of incident energy E. Standard form for enhancement:

\[
f_{\text{screening}} = \exp\left( \frac{U_e}{E} \right)
\]

where Ue is the electron screening energy (measured ~10–300 eV in some metal-hydride experiments). For Ue ≈ 10–30 eV and E ≈ 0.1 eV:

- Ue/E ≈ 100–300 → f_screening very large (overclaiming)

**Conservative parameterization:**

| Parameter | Value | Notes |
|-----------|-------|-------|
| Ue | 10 – 100 eV | From literature (Schwinger, etc.); barrier reduction |
| E | 0.01 – 0.1 eV | Effective deuteron kinetic energy |
| f_screening | exp(Ue/E) | Can exceed 10⁴; cap at 10³–10⁵ for consistency with IL-002 |

**Recommended:** Do not use the raw formula f = exp(Z₁Z₂e²k_TF/(4πϵ₀E)) with E as incident energy. Use f_screening = exp(Ue/E) with Ue as fitted/measured screening energy, and impose f_screening ≤ f_enhancement_max (e.g. 10⁵) to avoid double counting with other mechanisms.

---

## 5. QED Vacuum Polarization (IL-005)

**Resolved:** At E ~ 10⁸ V/m, (E/E_cr)² ~ 6×10⁻²¹. Correction to ε is negligible.

**Action:** Remove or qualify: "Vacuum polarization in strong fields (E~10⁸ V/m) modifies the effective dielectric constant" → "Vacuum polarization is negligible at E~10⁸ V/m; the Heisenberg–Euler correction becomes relevant only near E_cr ~ 10¹⁸ V/m."

---

## 6. Casimir Pressure (IL-018)

With resolved Casimir force F ≈ -1.3 mN and A = 1 µm²:

\[
P_{\text{Casimir}} = |F|/A \approx 1.3\times 10^{-3} / 10^{-12} \approx 1.3\times 10^9 \text{ Pa} \approx 1.3 \text{ GPa}
\]

**Resolved:** Casimir-induced pressure of 0.1–1 GPa is consistent *if* the force is ~mN and area is µm²-scale. Use F = 1.3 mN, A = 1 µm² → P ≈ 1.3 GPa as the reference.

---

## 7. Symbol Disambiguation (IL-015)

**Resolved naming:**

| Context | Symbol | Meaning |
|---------|--------|---------|
| Energy | E_kin, E_nuc, E_G | Kinetic, nuclear, Gamow |
| Electric field | E_field | Field strength [V/m] |
| Cross-section | σ_nuc | Nuclear reaction cross-section |
| Surface tension | σ_surf | [N/m] |
| Reaction rate | R_rate | [reactions/s or m⁻³s⁻¹] |
| Bubble radius | R_bubble | [m] |

Use these in all equations and simulation code.

---

## Summary Table for Simulation

| Parameter | Resolved value | Unit |
|-----------|----------------|------|
| F_Casimir (A=1 µm², d=1 nm) | -1.3×10⁻³ | N |
| P_Casimir (A=1 µm²) | ~1.3×10⁹ | Pa |
| f_enhancement | 10³ – 10⁵ | — |
| P_overlap (halo) | ~5×10⁻³ | — |
| P_overlap (interface) | 10⁻¹⁰ – 10⁻¹² | — |
| f_screening | exp(Ue/E), cap at 10⁵ | — |
| QED vacuum correction | Omitted (negligible) | — |
