# CMNS / LENR model fidelity response (v0.3.8-beta)

**Source:** LENR-ARA *Model Fidelity & Scientific Architecture Recommendation Report*
(16 September 2026).  
**Status:** P0 scientific-integrity foundation in flight on this release line.  
**Hard line:** Fidelity ≠ validity. `EQ-OPEN-*` remain OPEN. No endorsement of
contested mechanisms.

## Positioning

LENR-Sim is a **comparative scientific workbench**: competing CMNS/LENR
hypotheses under shared experiment conditions, with disagreement, missing
equations, free parameters, and negative predictions exposed rather than hidden.

## ARA roadmap map

| ARA tier | Intent | Repo action |
|----------|--------|-------------|
| **P0** | Registry/provenance, taxonomy, nulls, paper benchmarks, conservation | **This release (0.3.8)** |
| **P1** | Rebuild Widom / Hagelstein / Storms / Takahashi; phenomenological Shoulders/Matsumoto; add Dubinko/Kim/Chubb/… | Queued **0.3.9** |
| **P2** | Comparative workbench, discriminators, Research Mode + LENR-ARA | Post-0.3.9 |
| **P3** | Public research platform / community modules | Later |

## Taxonomy corrections (P0)

| Author / family | Finding | Module / action |
|-----------------|---------|-----------------|
| Holmlid | Must not be generic BEC | New `holmlid_udh` phenomenological module; UI no longer attributes Holmlid to BEC; `kim_bec` stays Kim BECNF |
| Kim BECNF | Separate from Holmlid | `kim_bec` unchanged id; maturity notes separation |
| Storms | Versioned NAE family | `nae_model` carries `storms_nae_2012_13` / `storms_nae_2026` metadata; legacy `hydroton` stays deprecated |
| Widom–Larsen | Electroweak entrance, not D-D tunneling | Module provenance + falsifiers; entrance channel flagged |
| Takahashi TSC | ≠ generic condensate rate | Metadata flags approximate rate vs Langevin (full dynamics = 0.3.9) |
| Matsumoto / Shoulders | Phenomenological | Explicit claim-tier / approximation labels |
| Multiplier stacks | Avoid un-derived products | Export warns when multiple composition groups multiply; combination redesign deferred |

## Maturity axes (independent)

Do **not** collapse into one score:

1. **Model fidelity** — how faithfully the module represents the named author equations / phenomenology.
2. **Empirical support** — replication / evidence class for the *claim*, not the simulator.
3. **Established-physics compatibility** — conventional baselines and nulls.
4. **Claim tier** — existing governance (`speculative_exploratory` …).

Ledger / UI: see `PHYSICS_MATURITY_LEDGER` updates and `engineMaturity.js`
`model_fidelity` / `empirical_support` fields on ENG-THEORY-PIPELINE rows.

## Provenance contract (additive)

Per-theory contributions now may carry:

- `primary_sources[]`
- `model_version` (theory-local) alongside app `provenance.model_version`
- `author_equations_vs_simulator_approximations`
- `free_or_fitted_parameters[]`
- `source_domain_limits`
- existing `falsification_conditions`, `claim_tier`, `references`

Pipeline **merges** module provenance instead of overwriting it.

## Null / conventional controls

| Control | Role |
|---------|------|
| `quantum_tunneling` | Established WKB/Gamow baseline (identity enhancement) |
| `electron_screening` | Shared mechanism layer (not a named LENR author theory) |
| `null_recombination` | Non-nuclear heat/artifact null under same experiment inputs |

## Paper benchmarks

CI package: `backend/tests/test_paper_benchmarks/`. Theories without a benchmark
remain labeled approximate / phenomenological.

## Explicit non-goals (0.3.8)

- Closing any `EQ-OPEN-*`.
- Full P1 equation rebuilds.
- Phase C EOS/FEM continuum.
- Public Swarm cutover (that is **0.3.9** under `CONFIRM_SWARM_0_3_9`).

## Infra coupling

- **0.3.8:** Compose remains public share; Swarm **staging** dry-run only.
- **0.3.9:** Public multi-node Swarm + Pages cutover (never steal WP apex/`www`).
