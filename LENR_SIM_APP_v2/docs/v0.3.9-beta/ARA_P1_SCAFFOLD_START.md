# ARA P1 — Hagelstein / Storms / Takahashi rebuild start (v0.3.9)

**Status:** Scaffold started after v0.3.8 P0. Does **not** change numerics,
close EQ-OPEN-*, or endorse mechanisms.

| Theory | Module | `p1_rebuild_status` | First rebuild targets |
|--------|--------|---------------------|------------------------|
| Hagelstein | `hagelstein_phonon.py` | `started_scaffold` | Coupling matrix elements; excitation-transfer expansion |
| Storms NAE | `nae_model.py` | `started_scaffold` | 2012–13 void dynamics; 2026 electron-channel dynamics |
| Takahashi TSC | `takahashi_tsc.py` | `started_scaffold` | Langevin condensation trajectory; 4D geometry observables |
| Widom–Larsen | `widom_larsen.py` | `started_scaffold` | See [ARA_P1_WIDOM_START.md](./ARA_P1_WIDOM_START.md) |

## Non-goals for this scaffold PR

- No equation fidelity upgrades (still `model_fidelity=approximate`)
- No new paper benchmarks beyond P0
- No claim-tier elevation

## Exit for each rebuild (later PRs)

- Cited conversion path or explicit free-param isolation
- ≥1 additional paper numeric/regime benchmark in CI
- Maturity axes update only when equations match
- EQ-OPEN-* remain OPEN
