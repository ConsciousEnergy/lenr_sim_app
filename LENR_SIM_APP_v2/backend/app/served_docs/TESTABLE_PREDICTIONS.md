# LENR Unified Framework — Testable Predictions and Measurement Requirements

**Purpose:** Explicit list of predictions from the unified LENR framework that can be experimentally verified or falsified. Each prediction includes the theoretical basis, expected value, measurement method, and falsification criterion.

---

## Prediction 1: Heat-Helium Correlation Ratio

**Theoretical Basis:** If D+D → ⁴He + 23.8 MeV (channeled to lattice) is the dominant channel, then:

\[
\frac{\text{He-4 atoms/s}}{\text{Excess power (W)}} = \frac{1}{23.8 \times 10^6 \times 1.602 \times 10^{-19}} = 2.63 \times 10^{11} \text{ atoms/s/W}
\]

**Prediction:** He-4 production rate = (2.6 ± 0.5) × 10^11 atoms/s per watt of excess heat.

**Measurement Requirements:**
- Closed-cell calorimetry with ±1% power measurement accuracy
- Mass spectrometry (QMS) with helium detection limit < 10^9 atoms
- Simultaneous, time-resolved heat and helium measurement
- Background helium control (sealed cell, helium gettering)

**Falsification Criterion:** If He-4/heat ratio differs from predicted value by > factor of 10 across multiple independent experiments, the D+D → ⁴He channel is not dominant.

**Current Status:** Miles (1993) reported (2.6 ± 0.6) × 10^11 He-4/s/W, consistent with prediction within 2σ. Needs replication with modern instrumentation.

**Virtual lab crosswalk:** `EQ-MILES-EMP-01` → `occurrence.anchored` / `oracle_emp.miles_band_gate` → falsifier: Q outside 24±4 MeV/He with simultaneous calorimetry + MS.

---

## Prediction 2: Neutron Energy Spectrum Shape

**Theoretical Basis:** If D+D → ³He + n occurs (even at suppressed rates), the neutron energy should be:
- 2.45 MeV for free D+D fusion (two-body kinematics)
- Broadened and downshifted if lattice momentum is involved

**Prediction:** Neutron energy peaked near 2.45 MeV but with FWHM > 100 keV (broader than free D+D due to lattice momentum transfer). Total flux < 10^3 n/s for typical excess heat of ~1 W.

**Measurement Requirements:**
- Neutron spectrometer with energy resolution < 50 keV in 1-5 MeV range
- Time-of-flight or liquid scintillator with pulse shape discrimination
- Active cosmic ray veto
- Run time > 72 hours for adequate statistics

**Falsification Criterion:** (a) Neutron spectrum sharply peaked at 2.45 MeV with no broadening → no lattice momentum participation. (b) No neutrons detected above background at > 5σ for > 100 hours → D+D → ³He + n channel fully suppressed.

---

## Prediction 3: Gamma Radiation Upper Bound

**Theoretical Basis:** The framework predicts that 23.8 MeV gamma radiation from D+D → ⁴He + γ is suppressed by factor > 10^11 due to lattice momentum absorption.

**Prediction:** Gamma flux at 23.8 MeV < 10^-8 γ/s per watt of excess heat (< 10^-11 of conventional D+D fusion branching).

**Measurement Requirements:**
- High-purity germanium (HPGe) detector with efficiency > 10% at 20+ MeV
- Energy resolution < 10 keV FWHM
- Background measurement of > 24 hours before and after active run
- Shielding from environmental and cosmic backgrounds

**Falsification Criterion:** Detection of 23.8 MeV gammas at rate > 10^-5 γ/s/W → radiation suppression mechanism fails. This would fundamentally challenge the lattice-mediated energy transfer hypothesis.

---

## Prediction 4: Tritium Production Rate and Branching Ratio

**Theoretical Basis:** In conventional D+D, the T+p and ³He+n branches have ~50% each. In LENR, the ⁴He + lattice channel dominates, suppressing both two-body branches.

**Prediction:** Tritium branching ratio < 10^-9 relative to ⁴He production. For 1 W excess heat, tritium production < 0.26 atoms/s.

**Measurement Requirements:**
- Liquid scintillation counting with tritium detection limit < 1 Bq
- Closed-cell design with electrolyte sampling
- Control cells (H₂O) run in parallel for contamination monitoring
- Time-integrated measurement over > 100 hours

**Falsification Criterion:** Tritium branching ratio > 10^-6 → two-body channels not as suppressed as predicted; lattice momentum mechanism insufficient.

---

## Prediction 5: Threshold Sensitivity Parameters

**Theoretical Basis:** Monte Carlo sensitivity analysis predicts sharp bifurcation thresholds:

**Predictions:**
| Parameter | Threshold | Effect |
|-----------|-----------|--------|
| Loading ratio H/Pd | > 0.9 | Abrupt increase in overlap density |
| Defect density | > 10^10 /cm³ | Creation of localized quantum wells |
| Surface roughness | < 10 nm | Enhancement of Casimir confinement |
| Local electric field | > 10^8 V/m | Barrier flattening |
| Temperature (Pd-D) | 50-90°C optimal | Balance of loading vs thermal de-loading |
| Temperature (Ni-H) | > 700°C (973 K) | Ni-H thermal activation threshold |

**Measurement Requirements:**
- In-situ loading ratio measurement (resistivity or four-probe)
- TEM/FIB characterization of defect microstructure
- AFM surface roughness mapping before and after runs
- Kelvin probe or EELS for local field measurement

**Falsification Criterion:** If excess heat occurs reproducibly at loading ratios < 0.85 and defect densities < 10^8 /cm³, the threshold model is wrong.

---

## Prediction 6: Non-Equilibrium BEC Signatures

**Theoretical Basis:** If the non-equilibrium phonon-driven BEC mechanism (Section 2.6) is operative, it should produce measurable changes in deuteron dynamics.

**Predictions:**
- Deuteron momentum distribution narrows below thermal width at specific phonon drive frequencies
- Phase-space density n × λ_dB³ > ζ(3/2) ≈ 2.612 in localized ~6 nm domains
- Enhanced coherent scattering in neutron diffraction at BEC onset conditions

**Measurement Requirements:**
- Neutron Compton scattering (deep inelastic neutron scattering) for deuteron momentum distribution
- Inelastic neutron scattering for phonon spectrum characterization
- Small-angle neutron scattering for coherent domain detection

**Falsification Criterion:** If deuteron momentum distribution remains purely thermal (Maxwell-Boltzmann) under all drive conditions, the non-equilibrium BEC mechanism is excluded.

---

## Prediction 7: Activation Product Mass Spectrum

**Theoretical Basis:** If Oppenheimer-Phillips transmutation occurs on lattice nuclei via low-energy neutron capture:
- Pd + n → Pd isotope shifts (mass +1)
- Ni + n → Ni isotope shifts, possible Cu production

**Prediction:** Post-experiment isotopic ratios deviate from natural abundance:
- Pd: enrichment in Pd-105, Pd-107 relative to natural Pd-104, Pd-106
- Ni: enrichment in Ni-59, Ni-61; possible Cu-63 appearance

**Measurement Requirements:**
- Secondary ion mass spectrometry (SIMS) or ICP-MS
- Depth-resolved analysis (surface vs bulk)
- Pre- and post-experiment isotopic analysis on same sample
- Control samples (unexposed) analyzed simultaneously

**Falsification Criterion:** No isotopic shifts beyond natural variation (2σ) after prolonged LENR-active runs → transmutation mechanism excluded.

---

## Summary Table

| # | Prediction | Key Observable | Current Evidence | Priority |
|---|-----------|---------------|-----------------|----------|
| 1 | Heat-He correlation | 2.6×10^11 He-4/s/W | Miles (1993): consistent | HIGH |
| 2 | Neutron spectrum | Broadened 2.45 MeV peak | Limited data | MEDIUM |
| 3 | Gamma upper bound | < 10^-8 γ/s/W at 23.8 MeV | Consistent with null detection | HIGH |
| 4 | Tritium branching | < 10^-9 of He-4 rate | Consistent with low tritium | MEDIUM |
| 5 | Threshold parameters | Loading > 0.9, defects > 10^10/cm³ | Partially confirmed | HIGH |
| 6 | BEC momentum narrowing | Sub-thermal deuteron distribution | No data yet | LOW |
| 7 | Isotopic shifts | Pd-105/107 enrichment, Cu appearance | Suggestive SIMS data | MEDIUM |

## Virtual lab crosswalk (open_questions v2)

| Prediction # | EQ / IR id | Virtual lab field / status | Falsifier |
|--------------|------------|------------------------|-----------|
| 1 | EQ-MILES-EMP-01 | `occurrence.anchored`, `OCCURRENCE_ANCHORED_EMP` | Q outside 24±4 MeV/He with simultaneous heat + He |
| 2 | EQ-OPEN-RAD-01 | `q_radiation.detector_ul_log10`, `BRANCHING_INCONSISTENT_WITH_UL` | γ UL violated under assumed branching |
| 3 | EQ-OPEN-RATE-01 | `when.threshold_crossed`, `RATE_BUDGET_DOES_NOT_CLOSE` (two_body ref) | FGR rate below calorimetric floor under named path |
| 4 | EQ-OPEN-MEV-01 | `q_mev_gap.energy_partition_mev.open_remainder` | Partition sums without OPEN remainder |
| 5 | EQ-WHEN-DUTY-01 | `when.duty_cycle_s` | Integrated yield vs duty-cycle mismatch |

---

*Generated: 2026-02-15*
*Source: Consolidated Mathematical Review Plan (76bcec90)*
