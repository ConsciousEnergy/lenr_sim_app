# LENR Framework — Energy–Product Bookkeeping Audit

**Purpose:** Reconcile W·hr ↔ reactions ↔ He/T/n yields; identify what must change if numbers don't close.  
**References:** [LENR_FRAMEWORK_ISSUE_LEDGER.md](LENR_FRAMEWORK_ISSUE_LEDGER.md), [LENR_NUCLEAR_CHANNELS_AUDIT.md](LENR_NUCLEAR_CHANNELS_AUDIT.md)

---

## 1. Conversion Factors

| Quantity | Value |
|----------|-------|
| 1 eV | 1.602×10⁻¹⁹ J |
| 1 MeV | 1.602×10⁻¹³ J |
| 1 W | 1 J/s |
| 1 W·hr | 3600 J |
| 1 W·hr | 3600 / (1.602×10⁻¹³) ≈ 2.25×10¹⁶ MeV |

---

## 2. D+D → ⁴He Channel

| Parameter | Value |
|-----------|-------|
| Q | 23.8 MeV per reaction |
| Q_J | 23.8 × 1.602×10⁻¹³ ≈ 3.81×10⁻¹² J per reaction |

**Reactions per W·hr for 100% heat from this channel:**
\[
N_{\text{reactions}} = \frac{3600 \text{ J}}{3.81\times 10^{-12} \text{ J}} \approx 9.45\times 10^{14} \text{ reactions per W·hr}
\]

**He-4 atoms per W·hr (1:1 with reactions):** 9.45×10¹⁴

**Paper claim:** 10¹¹ – 10¹³ He-4 atoms/(W·hr)

**Discrepancy:** Claimed yield is 10–10⁴× *smaller* than full conversion.

**Interpretations:**
- (a) **Retention/detection loss:** Only 10⁻³ – 10⁻¹ of He-4 is detected (trapping, sampling, MS sensitivity).
- (b) **Heat not from D+D→⁴He:** If heat is from another channel (e.g., D+D→T+p or chemical), He-4 would be a side product at lower rate.
- (c) **Different Q-value:** If effective Q < 23.8 MeV (e.g., excited states, lattice coupling), more reactions per W·hr.

**Required change if (a):** State retention/detection efficiency explicitly.  
**Required change if (b):** State primary heat channel; He-4 as tracer.  
**Required change if (c):** Provide Q-value and mechanism.

---

## 3. D+D → T + p Channel

| Parameter | Value |
|-----------|-------|
| Q | 4.03 MeV per reaction |
| Tritium per reaction | 1 atom |

**Tritium per W·hr (100% heat from T+p):**
\[
N_T = \frac{3600}{4.03 \times 1.602\times 10^{-13}} \approx 5.58\times 10^{15} \text{ atoms/W·hr}
\]

**Paper claim:** 10⁵ – 10⁷ atoms/hr (Bockris, Texas A&M).

**Discrepancy:** 10⁵–10⁷ atoms/hr ≈ 28–2800 atoms/s. For 1 W excess: 5.58×10¹⁵/(3600) ≈ 1.55×10¹² atoms/s. Claimed rate is ~10⁵–10⁸× smaller.

**Interpretation:** Either (a) excess power in those experiments was far below 1 W, or (b) tritium is from a different channel/contamination, or (c) retention is very high.

---

## 4. D+D → ³He + n Channel

| Parameter | Value |
|-----------|-------|
| Q | 3.27 MeV per reaction (2.45 MeV of it as neutron kinetic energy) |
| Neutrons per reaction | 1 |
| Neutron energy | ~2.45 MeV |

**Neutrons per W·hr (100% heat from n branch, Q = 3.27 MeV deposited per
reaction):**
\[
N_n = \frac{3600}{3.27 \times 1.602\times 10^{-13}} \approx 6.87\times 10^{15} \text{ n/W·hr}
\]

**Observed:** "Low-level" neutron flux, 2–4× background. Background ~0.01–1 n/s typical. So observed maybe 0.02–4 n/s ≈ 70–1.4×10⁴ n/hr.

**Interpretation:** If heat were from n branch, neutron rate would be enormous. Observed low neutrons ⇒ heat is not from n branch, or neutrons are heavily moderated/absorbed, or different channel.

---

## 5. Reconciliation Table

| Channel | Reactions/W·hr (100% heat) | Product | Claimed yield | Implied efficiency / note |
|---------|---------------------------|---------|---------------|---------------------------|
| D+D→⁴He | 9.45×10¹⁴ | He-4 | 10¹¹–10¹³ | 10⁻³–10⁻¹ retention or heat not from this channel |
| D+D→T+p | 5.58×10¹⁵ | T | 10⁵–10⁷/hr | Very low excess power or retention |
| D+D→³He+n | 9.17×10¹⁵ | n | Low | Heat not from n branch; or strong absorption |

---

## 6. What Must Change

1. **State primary heat channel** in paper: ⁴He, T+p, mixed, or other.
2. **Add retention/detection factors** if He-4 or T yields are used to infer reaction rate.
3. **Provide He/heat correlation slope** in units atoms/J or atoms/(W·hr) with uncertainty.
4. **Clarify neutron branching:** If D+D→⁴He dominates, neutron yield should be negligible; if standard D+D dominates, neutron yield should be high unless absorbed.

---

## 7. Simulation Output Requirements

Simulation must output, per unit excess power:
- Reactions per second by channel
- He-4 atoms/s
- Tritium atoms/s
- Neutron flux (n/s)
- Gamma flux (if any)

With configurable retention/detection efficiency for He and T.
