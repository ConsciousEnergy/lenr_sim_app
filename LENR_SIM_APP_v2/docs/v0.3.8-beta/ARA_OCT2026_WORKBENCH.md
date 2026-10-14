# ARA Oct 14, 2026 — scientific workbench Wave 1 (v0.3.8-beta)

**Source:** GPT LENR-ARA fresh review (2026-10-14).  
**Train:** `dev` @ `0.3.8-beta`.  
**Hard line:** No public Swarm cutover (`CONFIRM_SWARM_0_3_9`). No `EQ-OPEN-*` closures. No theory credibility leaderboard.

## Positioning

LENR-Sim should look less like a collection of theoretical calculators and more
like a **scientific hypothesis-comparison instrument**: under a specific
experiment, what do competing models predict, and which measurement could tell
them apart?

> LENR-Sim should not try to prove LENR. It should make the competing
> explanations of CMNS experiments precise enough that they can fail.

## Wave 1 (this train) — landed / landing

| ARA priority | Action |
|--------------|--------|
| 1 Static readable pages | `frontend/public/models/*.html` + methodology/validation/sources/experiments; generator `scripts/generate_static_model_pages.py` |
| 2 Sync old CE theory pages | **Operator handoff** — supersession banner copy below (WordPress not edited by agents) |
| 3 Model-version / provenance schema | Additive fields on `TheoryContribution` / list / `per_theory` |
| 4 Taxonomy separation | `taxonomy_kind` + `control_role` on registry |
| 5 Equation source citations | `equation_citations[]` |
| 6 Conventional / null baselines | Model 0 trio featured on `/models/` index |
| 7 Predictions + falsifiers first-class | `predicted_signatures`, structured `falsifiers` |
| 8 Version Storms / Takahashi / Hagelstein | Display headers + historical parents |
| 9 Holmlid ≠ Kim BEC | Already P0; static pages reinforce |
| 10 Schwinger scaffold | `schwinger_lattice` TheoryModule (no invented rate law) |

## Deferred

| ARA item | Where |
|----------|-------|
| Full P1 equation rebuilds | [`../v0.3.9-beta/ARA_P1_THEORY_REBUILDS.md`](../v0.3.9-beta/ARA_P1_THEORY_REBUILDS.md) |
| Dubinko / deeper Tier-1 upgrades | Post-scaffold / P1+ |
| Model-vs-model discriminator UI + H/D interactive lab | ARA P2 (post-0.3.9) |
| Monte Carlo / sensitivity SPA | [`../v0.3.6-beta/UQ_IDENTIFIABILITY_PLAN.md`](../v0.3.6-beta/UQ_IDENTIFIABILITY_PLAN.md) |
| Experiment-first SPA rewrite | P2 |
| Public Swarm + Pages | [`../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`](../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md) under `CONFIRM_SWARM_0_3_9` |

## Swarm parallel (ops)

Wave 1 science does **not** require Swarm apply. Staging dry-run remains
Phase B in [`VERSION_CONTROL.md`](VERSION_CONTROL.md) under
`CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8` only.

## Conscious Energy WordPress — operator supersession copy

Paste on older UMLENR / unified-theory pages that still label Holmlid as BEC
or Storms as neutron-chain:

> **Historical exploratory model — superseded by current LENR-Sim model
> definitions.** See the live registry at
> `https://lenr-sim-beta.conscious.energy/models/` (and tip `/models/` after
> Compose ship). Holmlid is ultra-dense H(0)/D(0), not Kim BECNF. Storms is
> versioned NAE (2012–13 active; 2026 electron channel tagged), not a neutron
> chain model.

Recommended neutral framing for marketing copy:

> LENR/CMNS refers to a class of reported anomalous thermal, nuclear and
> isotopic observations in hydrogen-loaded condensed-matter systems. The
> interpretation, reproducibility and underlying mechanism of these
> observations remain disputed.

> Potential energy applications have been proposed if the reported effects can
> be demonstrated reproducibly and engineered reliably.

## Regenerate static pages

```bash
cd LENR_SIM_APP_v2/backend
PYTHONPATH=. python ../scripts/generate_static_model_pages.py
```

CI smoke: `tests/test_integration/test_static_model_pages.py`.

## Related

- [`CMNS_MODEL_FIDELITY_RESPONSE.md`](CMNS_MODEL_FIDELITY_RESPONSE.md)
- [`../v0.3.7-beta/DATA_CONTRACT_LOCK.md`](../v0.3.7-beta/DATA_CONTRACT_LOCK.md)
