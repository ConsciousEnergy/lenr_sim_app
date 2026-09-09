# The MeV-Gap Down-Conversion Hypothesis (claim-tier gated)

**Claim tier:** `speculative_exploratory`. **Status:** hypothesis with
falsifiable predictions; NOT a validated result. Owning phase: 6.

## The problem (the "MeV gap")

LENR calorimetry (e.g. Miles, McKubre) reports ~24 MeV of heat per He-4 atom
produced, with **no commensurate flux** of MeV gamma rays or energetic neutrons.
Conventional D+D fusion releases its 23.8 MeV as a prompt gamma (the rare
He-4 branch) or as energetic particles. The open question: **how is a nuclear
(MeV) quantum partitioned into ~10^7 lattice/optical quanta (~eV) without lethal
prompt radiation?** This is the energy-partition / "MeV gap" problem.

## Two coupled, citable mechanisms in this codebase

1. **Phonon-nuclear down-conversion** (Hagelstein, key `hagelstein2025` +
   lossy spin-boson model). A relativistic phonon-nuclear coupling
   matrix element lets a highly-excited nuclear state transfer energy
   coherently to a large phonon occupation, spreading the MeV quantum across
   many low-energy modes. Implemented as a theory module (`hagelstein_phonon`).

2. **KG-RP harmonic locking** (Mulnix, key `mulnix2026`). During cavitation
   collapse the Rayleigh-Plesset bubble dynamics can phase-lock to a
   Klein-Gordon field mode, localising acoustic-drive energy into a narrow
   resonance. Implemented as diagnostics + a coupled-field hypothesis in
   `backend/app/physics_engine/cavitation_kgrp.py`.

The hypothesis under test: **harmonic locking provides a coherent, high-Q
channel that, combined with phonon-nuclear coupling, enables MeV->multi-eV
down-conversion** during the final collapse phase.

For electrolytic PdD, the coupled working hypothesis is **WH-ENP-01**
(Hagelstein cascade on Takahashi TSC geometry). KG-RP locking is an optional
cavitation overlay, not the PdD core. See Lean `LenrFormal.WorkingHypothesis`
and `open_questions.working_hypothesis`. EQ-OPEN-MEV-01 remains OPEN.

### Quantitative status (WH-ENP-01 v2, 2026-09-04) — still OPEN

Two derived bounds now state what the down-conversion hypothesis must supply
(claim tier `speculative_exploratory`; Lean `LenrFormal.WorkingHypothesisBounds`;
runtime `working_hypothesis.q2.franck_condon` / `dicke`):

- **Franck-Condon requirement (`EQ-WH-FC-01`).** For linear phonon coupling
  (displaced-oscillator / Huang-Rhys model, a labelled **model assumption**) the
  N-phonon emission probability is a Poisson tail with phonon order
  \(N = Q/hf \approx 5.75\times10^{8}\) at \(f = 10^{13}\,\mathrm{Hz}\)
  (\(hf \approx 41.4\,\mathrm{meV}\), CODATA). On the scan grid
  \(S \in \{1,\dots,10^{4}\}\), \(\log_{10}P_N\) lies between \(-4.8\times10^{9}\)
  and \(-2.5\times10^{9}\) (Lean-certified conservative cap
  \(\le -7\times10^{5} \ll -11\)). The smallest Huang-Rhys factor reaching the
  \(10^{-11}\) target is \(S_{\min} \approx 0.9998\,N\), i.e. a lattice relaxation
  energy \(S_{\min} hf \approx 23.79\,\mathrm{MeV} \approx Q\). This is the
  quantitative form of the MeV gap: linear coupling closes it only if the lattice
  already relaxes by the full nuclear quantum. Anharmonic, Umklapp and Hagelstein
  lossy spin-boson enhancements remain named AX hypotheses and are **not**
  inserted into the derived bound.
- **Dicke count (`EQ-WH-DICKE-N-01`).** With \(n_D = 6.8\times10^{28}\,\mathrm{m^{-3}}\)
  and \(v_s = 3070\,\mathrm{m/s}\) (model assumptions), the cooperation sphere
  \(\tfrac{4}{3}\pi(\lambda/2\pi)^{3} \approx 4.9\times10^{-31}\,\mathrm{m^{3}}\)
  holds \(\approx 0.033 < 1\) deuterons, so \(N_{\mathrm{coh}}^{\max} = 0\) and a
  Dicke \(N^{2}\) enhancement is not licensed for even one coherent pair at the
  paper's phonon scale. The conservation-constrained coupling scan therefore keeps
  the cited remainder at \(23.8\,\mathrm{MeV}\) (`EQ-WH-PART-02`).

Neither bound closes EQ-OPEN-MEV-01 or EQ-OPEN-RAD-01 (`EQ-WH-NONCLOSE-02`);
they bound what a future constrained matrix element must overcome. WolframAlpha
MCP was unavailable for this pass; numbers were checked with `scipy.constants`
and `math.lgamma` (see `LENR_SIM_APP_v2/docs/PHYSICS_EQUATION_VERIFICATION.md`
§12.9-12.10).

## Falsifiable predictions (encoded as gates / diagnostics)

| # | Prediction | Where checked | Falsifier |
|---|------------|---------------|-----------|
| P1 | Excess heat correlates with He-4 at 24 +/- 4 MeV/atom with no MeV gamma burst | `test_experiment_anchored_gates.py` | heat branch is non-aneutronic |
| P2 | Energy localisation requires harmonic locking: `resonant_gain` peaks when KG frequency ~ collapse harmonic; off-resonance gain ~1 | `cavitation_kgrp.integrate_coupled_kg_field` | gain stays ~1 at lock (no resonance) |
| P3 | Locking is a *necessary* (not sufficient) condition: `is_locked` must hold in regimes claiming excess down-conversion | `compute_kgrp_diagnostics` | excess heat reported with detuning > tolerance |
| P4 | The mechanism must not raise the *two-body* rate magnitude; it only opens a down-conversion channel | rate engine keeps `two_body` baseline unchanged | trapped/KG path silently replaces baseline |

## Guardrails

- Nothing in the KG-RP layer modifies RP dynamics or the reaction-rate
  magnitude; it is diagnostic + hypothesis only.
- All outputs carry `claim_tier = speculative_exploratory` and cite
  `mulnix2026` / `hagelstein2025`.
- The coupled-field energy is reported in **model units** (dimensionless gain),
  explicitly not as a physical down-conversion efficiency.

## Change log
- 2026-06-04: Hypothesis documented (Phase 6) with falsifiable predictions.
- 2026-09-04: WH-ENP-01 v2 quantitative status added (Franck-Condon requirement, Dicke count); hypothesis remains OPEN.
