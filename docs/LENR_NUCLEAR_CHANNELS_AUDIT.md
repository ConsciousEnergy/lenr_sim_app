# LENR Framework — Nuclear Reaction Channels Audit

**Purpose:** Audit each proposed nuclear channel for thresholds, branching ratios, expected radiation/neutron signatures, and whether condensed-matter mechanisms plausibly modify rates.  
**References:** [LENR_FRAMEWORK_ISSUE_LEDGER.md](LENR_FRAMEWORK_ISSUE_LEDGER.md)

---

## 1. D + D Standard Branches

| Channel | Q-value | Branching (beam) | Threshold | Expected radiation/neutron |
|---------|---------|------------------|-----------|----------------------------|
| D+D → ³He + n | 2.45 MeV | ~50% | ~0 | Neutron ~2.45 MeV |
| D+D → T + p | 4.03 MeV | ~50% | ~0 | Proton ~3 MeV |
| D+D → ⁴He + γ | 23.8 MeV | ~10⁻⁵ | ~0 | Gamma ~23.8 MeV |

**Condensed-matter modification:** Screening can reduce effective barrier; enhancement factors of 10³–10⁵ (per consistency resolutions) apply to penetration probability. Branching ratios are nuclear-structure dominated and unlikely to change in metal lattice.

**LENR compatibility:** Excess heat + low gamma + low neutron. Standard D+D produces neutrons and protons. To explain "minimal radiation," either:
- (a) D+D→⁴He branch dominates (needs large enhancement of rare branch; no established mechanism),
- (b) Neutrons/protons/gammas are absorbed or downscattered locally,
- (c) Different primary channel (e.g., neutron-catalyzed transmutation, Widom–Larsen).

---

## 2. p + e⁻ → n + νe (Inverse beta decay)

| Parameter | Value |
|-----------|-------|
| Q | -0.782 MeV (endothermic) |
| Threshold | ~0.782 MeV must be supplied |
| Cross-section | Weak interaction; very small at low energy |

**Condensed-matter modification:** Paper's "10–100 eV/atom" cap cannot supply 0.78 MeV. Widom–Larsen proposes surface plasmons to provide the energy; that requires a separate model. The simple σ = σ₀×P_overlap is not physically justified.

**Recommendation:** Do not use p+e⁻→n as primary neutron source without explicit energy-supply mechanism (e.g., plasmon decay). If retained, implement Widom–Larsen or equivalent.

---

## 3. Oppenheimer–Phillips Process

| Reaction | d + ʐᴬX → ᴬ⁺¹ᴬY + p |
|----------|------------------------|
| Mechanism | Neutron from deuteron captured; proton emitted |
| Energy | Typically keV incident d; Coulomb barrier for entrance |
| Rate | R = σ_OP × Φ_n × N |

**Condensed-matter modification:** Neutron flux Φ_n from D+D (or other) must be supplied. Screening may help d approach nucleus. OP cross-sections are well tabulated.

**LENR compatibility:** Explains transmutation (e.g., Ni→Cu) if neutrons are present. Requires neutron source; rate limited by neutron production.

---

## 4. D + D → ⁴He (dominant heat channel?)

| Parameter | Value |
|-----------|-------|
| Q | 23.8 MeV |
| Branching | ~10⁻⁵ in vacuo |
| Gamma | 23.8 MeV if radiative |

**Condensed-matter modification:** Hagelstein and others propose lattice-coupled ⁴He formation where gamma is suppressed and energy goes to phonons. No complete QFT derivation; treat as speculative.

**Energy accounting (IL-010):** If heat is from this channel, He-4 yield should scale as Q_heat / 23.8 MeV per reaction. Observed 10¹¹–10¹³ He atoms/(W·hr) vs ~9×10¹⁴ reactions/(W·hr) for full conversion implies either:
- Large retention/detection loss,
- Or heat is not dominantly from D+D→⁴He.

---

## 5. Minimal Consistent Channel Set

To satisfy: excess heat + low gamma + low neutron + He-4 + transmutation:

| Scenario | Primary heat | Neutron source | Gamma | He-4 |
|----------|--------------|----------------|-------|------|
| A | D+D→⁴He (lattice-coupled) | Negligible (suppressed) | Suppressed | Yes |
| B | D+D standard (T+p, ³He+n) | Yes | None from D+D | No direct He-4 |
| C | Neutron capture + β⁻ decay | Ultra-low-momentum n (W-L) | Low | Via decay chains |
| D | Mixed | Low n from D+D; OP for transmutation | Suppressed by absorption | From ⁴He branch or secondary |

**Recommendation:** Keep scenarios A, C, D as hypotheses. Implement in simulation as selectable "channel mode" with:
- Mode A: D+D→⁴He dominant; gamma_suppression_factor, He_per_reaction
- Mode C: Widom–Larsen style; neutron flux from surface plasmons
- Mode D: Combined; branching fractions and absorption lengths as inputs

---

## 6. Expected Signatures for Validation

| Observable | D+D standard | D+D→⁴He dominant | Widom–Larsen |
|------------|--------------|------------------|--------------|
| Neutron flux | ~10⁶–10⁸ n/(W·s) | Very low | Ultra-low momentum |
| Gamma 2.45 MeV | None | None | None |
| Gamma 23.8 MeV | None | Low/suppressed | None |
| He-4 | No direct | Yes | Via capture/decay |
| Tritium | Yes (T+p branch) | Possibly | Possibly |
| Proton | Yes (T+p branch) | Possibly | Possibly |

**Validation:** Require simulation to output neutron spectrum, gamma upper bound, He/heat ratio, T/heat ratio; compare to experimental limits.
