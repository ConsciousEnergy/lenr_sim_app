# ICCF-27 / September 2026 harvest ledger

**Train:** v0.3.8-beta science (APP_VERSION remains `0.3.7-beta`)
**Conference:** ICCF-27, Niagara Falls, 31 August – 4 September 2026
([program](https://www.iccf-27.org/program/))
**Concurrent:** Zakopane Conference on Nuclear Physics, 30 August – 6 September 2026
**Epistemic rule:** this ledger does **not** close any `EQ-OPEN-*`. Extra
simulations do not raise `claim_tier`. Official ICCF-27 proceedings were still
under construction at harvest; talk-only rows stay `awaiting_proceedings`.

Locked seeds (`literature_baselines.v1.json`, 17 rows, demo pack Baseline=17)
are **not** rewritten. New literature lives in
[`literature_iccf27.v1.json`](../../datasets/literature_iccf27.v1.json) and the
`iccf27_grid` campaign preset.

| ID | Authors | Title / venue | Status | claim_tag | EQ-OPEN / PRED | Math extractables | Protocol extractables |
|----|---------|---------------|--------|-----------|----------------|-------------------|------------------------|
| kasagi2026 | Kasagi, Itoh, Shibasaki, Iwamura | Radiant spectrum excess heat, NiCu/Ni H₂ desorption. *JCMNS* 41 (2026) 62–72 | available | EMP | YIELD-01, PRED-01 | Q_ex ≈ 1.1 W (NiCu); τ_decay > 2000 h; spectrum peak ~0.2 eV ≠ gray-body | BREMS FT-IR 0.043–0.93 eV; 6×(Cu 3.8 nm / Ni 20 nm); absorb 200–300 Pa H₂; T ~1100 K |
| czerski2024a | Czerski et al. | Thermal DD fusion in ion tracks. arXiv:2409.02112 | available | EMP (accelerator) | RATE-01, PRED-02 | Track T₀ ~2540 K (2 keV ZrD₂); ⟨T⟩ ~980 K; E_ph ~100 meV; f_e-ph ~0.1 | UHV beam; yield plateau < 2.5 keV; thermal vs beam–target proton components |
| czerski2026 | Czerski / Targosz-Ślęczka / Thulichery | ICCF-27 thermal-spike + screening talks; Zakopane D₃⁺/D₂⁺ ~1.5 | awaiting_proceedings | contested until DOI | RATE-01 | Molecular-beam factor ~1.5; Ti/Pd plateau | D₁⁺/D₂⁺/D₃⁺ 3.5–20 keV; Pd/Ti/Zr hosts |
| hylenr2026 | Hylenr / Texas A&M | BRT-NiUCS-2 Phase 1 LCF, presented ICCF-27; press 22 Sep 2026 | available (press) | contested | RAD-01, PRED-03, PRED-07 | RGA He/Ar elevation; null γ/n | IR ΔT vs calibration; SEM/EDX; Phase-2 SIMS/ICP-MS planned |
| valat2026 | Valat, Czerski et al. | Heat bursts, Pd electrolysis in D₂O (ICCF-27) | awaiting_proceedings | contested | YIELD-01 | — | Electrolysis calorimetry |
| decapua2026 | DeCapua, Metzler, Hagelstein, Chiang et al. | Anomaly reports → parameter maps (ICCF-27 Session 7) | awaiting_proceedings | methodology | RATE-01 | Systematic grids not anecdotes | loading × defect × T × host maps |
| engrxiv6438 | Ir/Rh surface screening DFT | doi:10.31224/6438 | available | speculative (theory prior) | RATE-01 | U_e 600–1400 eV; λ_TF 0.45–0.48 Å | 5–30 nm Ir/Rh on porous ¹⁰⁵Pd |
| tanzella2026 | Tanzella | Dual-laser THz Pd ribbons in D₂ | awaiting_proceedings | — | MEV-01 | — | Dual-laser / Letts-class stimulation |
| benyo2026 | Benyo, Bakr, Wallace-Smith | IEC + lattice confinement (NASA) | awaiting_proceedings | — | RATE-01 | — | Combined IEC/LCF neutron diagnostics |

Citation keys used in code: `kasagi2026`, `czerski2024a`, `czerski2026`,
`hylenr2026`, `valat2026`, `decapua2026`, `engrxiv6438`.
