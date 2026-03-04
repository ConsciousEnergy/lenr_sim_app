# LENR Framework — Condensed Matter / Interface Physics Audit

**Purpose:** Verify screening models, field enhancement, coherence/BEC/RM assumptions for length-scale and unit consistency; specify what is physically modeled vs heuristic.  
**References:** [LENR_FRAMEWORK_ISSUE_LEDGER.md](LENR_FRAMEWORK_ISSUE_LEDGER.md), [LENR_CONSISTENCY_RESOLUTIONS.md](LENR_CONSISTENCY_RESOLUTIONS.md)

---

## 1. Screening Models

| Model | Formula / parameters | Length scale | Applicability |
|-------|----------------------|--------------|---------------|
| Thomas–Fermi | k_TF = √(3e²n_e/(2E_F)); λ_TF = 1/k_TF | λ_TF ~ 0.1 nm (metals) | Static screening, high density |
| Debye | k_D = √(e²n/(ε₀k_B T)) | λ_D ~ nm–µm (electrolytes) | Mobile ions, low density |
| Dynamic | Frequency-dependent; Lindhard, etc. | Depends on ω | Fast processes |

**Paper:** Uses Thomas–Fermi for metallic screening. k_TF ~ 10¹⁰ m⁻¹ ⇒ λ_TF ~ 0.1 nm. Nuclear scale ~1 fm. Screening length is 10⁸× larger than nuclear scale—screening acts at atomic/electronic scale, not inside nucleus.

**Resolution:** Screening reduces Coulomb barrier between approaching nuclei at separations > λ_TF. At r < λ_TF, bare Coulomb applies. Use Ue (screening energy) as effective barrier reduction; see consistency resolutions.

---

## 2. Interface Electric Fields

| Parameter | Value | Notes |
|-----------|-------|-------|
| E = ΔV/d | 10⁸ V/m | ΔV=0.1 V, d=1 nm |
| Field enhancement | 10⁸–10⁹ V/m | Tip/corner enhancement |
| E_cr (Schwinger) | 1.3×10¹⁸ V/m | QED critical field |

**Length-scale check:** 1 nm is atomic scale; 0.1 V over 1 nm is plausible for double layer. Field enhancement at tips: E_local = β E_avg, β ~ 10–100 for sharp nanostructures.

**Resolution:** E ~ 10⁸ V/m is consistent. Do not attribute large QED effects (vacuum polarization) at this field; see IL-005.

---

## 3. Coherence Length ξ

| Formula | ξ = ℏv_F / ΔE |
|---------|----------------|
| v_F | 10⁶ m/s (Pd, Ni) |
| ΔE | 0.1–1 eV (LENR scale) |
| ξ | ~6.6 nm (ΔE=0.1 eV) |

**Physical meaning:** Spatial extent over which phase coherence persists. For superconducting gap, ΔE would be gap; for LENR, ΔE is poorly defined.

**Resolution:** Use ξ as maximum coherent-cluster diameter. Define ΔE explicitly (e.g., energy scale of tunneling, or activation energy). Heuristic until tied to specific collective mode.

---

## 4. Bose–Einstein Condensation of Deuterons

| Formula | T_c = (2πℏ²/(mk_B)) (n/ζ(3/2))^(2/3) |
|---------|--------------------------------------|
| n | 10²⁸ m⁻³ |
| T_c | ~7.9 K |
| Assumption | Ideal Bose gas |

**Problem:** Deuterons in Pd are not free; they sit in interstitial sites, screened by electrons. Ideal-gas formula assumes no potential. Lattice breaks translational invariance.

**Resolution:** Treat T_c as order-of-magnitude estimate only. For lattice-confined bosons, use band structure or tight-binding. BEC claim for "coherent nuclear effects" is heuristic until lattice model is specified.

---

## 5. Rydberg Matter (RM)

| Definition | Highly excited electronic states, n~10 |
|------------|---------------------------------------|
| E_n | -13.6/n² eV ≈ -0.136 eV for n=10 |
| Spatial extent | ~n² a₀ ~ 100 a₀ ~ 5 nm |

**Length scale:** RM orbitals extend ~5 nm; nuclear scale ~1 fm. Overlap with nuclear volume is negligible for direct nuclear overlap. RM may affect *electronic* environment (screening, field) but not nuclear wavefunction overlap directly.

**Resolution:** Use RM for enhanced screening or charge redistribution; do not use for P_overlap with nucleus.

---

## 6. Halo vs Interface Overlap

| Regime | P_overlap | Length scales |
|--------|-----------|---------------|
| Halo | ~5×10⁻³ | a~0.5 nm, r₀~0.1 nm (nuclear "size" as electronic screening radius) |
| Interface | 10⁻¹⁰–10⁻¹² | Decay ~1–5 pm, nuclear ~1 fm |

**Note:** Halo overlap uses r₀=0.1 nm (100× nuclear radius). That is the *electronic* extent of the nucleus (charge distribution), not the nuclear matter radius. For weak processes (e.g., p+e⁻→n), the overlap is at the weak-interaction vertex; nuclear size ~1 fm. The 0.1 nm may refer to the proton+electron system extent, not the nucleus.

**Resolution:** Keep split regimes; label halo r₀ as "effective overlap radius" (electronic) and interface as "nuclear-scale overlap."

---

## 7. Summary: Modeled vs Heuristic

| Item | Modeled (first-principles) | Heuristic |
|------|---------------------------|-----------|
| Thomas–Fermi screening | Yes (standard) | Ue value |
| Double-layer E | Yes (ΔV/d) | Enhancement factor β |
| Coherence length ξ | Formula yes | ΔE definition |
| BEC T_c | Formula yes (ideal gas) | Applicability to lattice |
| RM | Definition yes | Role in LENR |
| P_overlap | Formula yes | Regime choice |

---

## 8. Simulation Recommendations

1. **Screening:** Implement f_screening = exp(Ue/E) with Ue as input (10–100 eV range).
2. **Field:** E_field = β × ΔV/d; β as input (1–100).
3. **Coherence:** ξ = ℏv_F/ΔE; require ΔE as input.
4. **BEC:** Use T_c formula with caveat; or omit if lattice model not implemented.
5. **P_overlap:** Select halo or interface regime per reaction type; do not mix without justification.
