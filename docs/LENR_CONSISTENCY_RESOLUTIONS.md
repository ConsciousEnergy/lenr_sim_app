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

**Resolved: Split regimes**

| Regime | P_overlap | Applicability |
|--------|-----------|---------------|
| **Halo** | ~5×10⁻³ | Extended orbitals, a ≈ 10a₀, r₀ ≈ 0.1 nm; electron overlap with nuclear volume |
| **Interface** | 10⁻¹⁰ – 10⁻¹² | Metal–electrolyte interface; decay length 1–5 pm, nuclear radius ~1 fm |

**Formula for halo regime:** \( P_{\text{overlap}} \approx (r_0/a)^3 e^{-2r_0/a} \) with a = 0.53 nm, r₀ = 0.1 nm.

**Usage:** Neutron formation via electron capture (p+e⁻→n) in §2.4 uses σ₀×P_overlap. Given IL-007, the p+e⁻→n pathway is energetically forbidden at low energy; do not use halo P_overlap for that. Use halo P_overlap only for overlap-sensitive *electronic* effects (e.g., screening, wavefunction penetration), and interface P_overlap for interface-specific processes. For neutron yield, adopt a different pathway (e.g., Widom–Larsen) or treat P_overlap as a placeholder until pathway is specified.

---

## 4. Thomas–Fermi Screening (IL-004)

**Problem:** Exponent Z₁Z₂e²k_TF/(4πϵ₀E) in eV units gives ~144 for E=0.1 eV, not 0.1–1.

**Resolved (aligned with RR-007 / Assenbaum):** Do **not** use the raw TF Coulomb exponent with incident energy as \(E\). Production code and the paper use the Assenbaum–Rolfs screened-cross-section form with **cited, material-dependent** \(U_e\) ranges (`screening_data.py` / RR-007):

\[
f_{\text{screening}} = \exp\left( \frac{\pi\,\eta\,U_e}{E_{\mathrm{kin}}} \right)
\]

**Domain honesty (EQ-ASSEN-DOM-01 / Lean `Assenbaum`):** the expansion is claimed only when \(U_e < E_{\mathrm{kin}}\) (machine stand-in for ≪). Thermal metal hosts with \(U_e\sim 300\text{–}800\,\mathrm{eV}\) and \(E\sim 0.1\,\mathrm{eV}\) are outside that domain; the software still reports a capped sensitivity factor (\(10^3\text{–}10^5\), IL-002) but sets `formula_claimed=false`.

**Do not conflate** Assenbaum domain validity with the separate RR-007 adiabatic gas-target floor (\(U_e\sim 20\text{–}25\,\mathrm{eV}\)).

| Parameter | Value | Notes |
|-----------|-------|-------|
| \(U_e\) | cited material ranges (e.g. Pd typical 800 eV) | RR-007 / `screening_data.py` |
| \(E_{\mathrm{kin}}\) | collision / thermal CM energy | Lean compares against \(U_e\) |
| \(f_{\text{screening}}\) | Assenbaum form, governance-capped | Not claimed outside \(U_e < E\) |

**Historical note:** An earlier IL-004 draft used the simplified \(f=\exp(U_e/E)\). That form is superseded; keep Assenbaum + domain predicate as the single SOT so RR/IL no longer diverge.

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
