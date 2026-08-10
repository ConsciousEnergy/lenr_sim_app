# LENR Unified Framework — Audit Index

**Audit completed:** 2025-02-15  
**Plan:** LENR-paper-math-audit

---

## Documents

| Document | Purpose |
|----------|---------|
| [LENR_FRAMEWORK_ISSUE_LEDGER.md](LENR_FRAMEWORK_ISSUE_LEDGER.md) | Single source of truth: 18 atomic issues (Tier A/B) with claim, re-derivation, severity, assumptions |
| [LENR_CONSISTENCY_RESOLUTIONS.md](LENR_CONSISTENCY_RESOLUTIONS.md) | Resolved values for Casimir, tunneling enhancement, overlap, screening, symbols |
| [LENR_NUCLEAR_CHANNELS_AUDIT.md](LENR_NUCLEAR_CHANNELS_AUDIT.md) | Nuclear reaction channels, thresholds, branching, signatures |
| [LENR_ENERGY_PRODUCT_AUDIT.md](LENR_ENERGY_PRODUCT_AUDIT.md) | W·hr ↔ reactions ↔ He/T/n bookkeeping; reconciliation |
| [LENR_CONDENSED_MATTER_AUDIT.md](LENR_CONDENSED_MATTER_AUDIT.md) | Screening, fields, coherence, BEC, RM; modeled vs heuristic |
| [LENR_CAVITATION_AUDIT.md](LENR_CAVITATION_AUDIT.md) | Bubble collapse T, P, electric term, rate coupling |
| [LENR_SIMULATION_MAPPING.md](LENR_SIMULATION_MAPPING.md) | RORO inputs/outputs; enhancement decomposition; no double counting |
| [REVIEWER_PACKETS.md](REVIEWER_PACKETS.md) | Packets A–E for parallel review (Math, Nuclear, Condensed Matter, Cavitation, Stats/UQ) |

---

## Quick Reference

### Key resolved parameters
- Casimir force (A=1 µm², d=1 nm): **-1.3 mN**
- f_enhancement: **10³–10⁵** (adopt; drop 10⁸)
- P_overlap: halo ~5×10⁻³; interface 10⁻¹⁰–10⁻¹²
- f_screening: use the Assenbaum form exp(π·η·Ue/E) with cited material-dependent Ue (`screening_data.py`; e.g. Pd typical 800 eV, Er ~347 eV); cap at 10⁵

### Tier A issues (fix first)
IL-001, IL-002, IL-003, IL-004, IL-005, IL-007, IL-008, IL-010, IL-013, IL-017, IL-018

### Suggested LENR-ARA questions
- "Given low gammas, what mechanisms for D+D→He-4 energy into phonons?"
- "Realistic Ue in metal hydrides and mapping to enhancement factors?"
- "Best neutron-catalyzed pathway consistent with low neutron flux?"
