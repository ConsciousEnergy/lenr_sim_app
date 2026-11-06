# Deferred — multiphysics fidelity (post-governance)

**Status:** Queued for **after** the v0.3.7-beta maturity ledger and Beta UI ship.  
**Do not implement on the governance train.**

## Origin

Prior Cursor plan: multiphysics fidelity roadmap (Phase A connectivity / honesty →
Phase B Keller–Miksis bridge → Phase C continuum aspirational). Artifact path
(agent workspace):

`/opt/cursor/artifacts/plans/multi_physics_fidelity_roadmap_aca0eb1c.plan.md`

## Why deferred

The Bubble Fusion “Backend unreachable / approximate” banner can be (A) API
connectivity, (B) dual page/visualizer fetch + schematic fallback, and/or (C)
genuine low-fidelity adiabatic/Rayleigh calculator vs the stronger ODE stack on
`/api/unified/bubble-lattice`. Raising solver fidelity while the UI still falls
back to schematic power-laws would still show non-citable numbers on beta.

Governance first: provenance chips, maturity ledger, single source of truth for
claim tiers — then resume this queue.

## Queued phases (summary)

### Phase A — Engine-on-VPS truthfulness (Bubble Fusion)

1. Diagnose `POST /api/physics/bubble-fusion` on beta (proxy, mount, `API_BASE`).
2. [x] Unify clients: page owns the request; visualizer consumes props (no duplicate fetch).
3. [x] Provenance UI: `physics_engine` vs `schematic_fallback`.
4. [x] Contract test + browser evidence that the unreachable banner is absent on healthy backend (Phase A branch; Jest single-fetch + headed Playwright/browser demo).

### Phase B — Fidelity (gated)

1. [x] Bridge Bubble Fusion route to shared RP/KM core (`bubble_solver` /
   `bubble_lattice_interaction`) via opt-in `dynamics_mode` (default remains `legacy`).
2. [x] Dynamics mode policy: **auto default** selects KM when Mach ≥ 0.3
   (aligned with Unified Theory); explicit `legacy` / RP / KM remain overrides.
   Response reports `dynamics_mode_requested`, `dynamics_mode_used`,
   `km_auto_selected`, `peak_mach` / `km_recommended`.
3. [x] Collapse → tunneling handoff with explicit claim-tier labels
   (`tunneling_handoff` on BF response; UI surfaces status + claim tiers; never raises
   empirical claim tiers).
4. [x] Verification gates: KM→RP limit in `test_bubble_dynamics_gates`; BF response
   finiteness + no silent schematic via `verification` block
   (`test_bubble_fusion_dynamics_mode`).

### Phase C — Roadmap only (document)

Real-gas EOS, heat/mass transfer, continuum FEM / Poisson–Schrödinger as research
tracks behind Theory Methods aspirational callouts — **not** production Bubble
Fusion numerics in the same PR train as A/B. Remains deferred through **v0.3.8+**;
not a Swarm cutover dependency.

**Formalization (science track, non-deploy):** Lean `PoissonSchrodinger` + IR
`EQ-PS-*` encode discrete residual / domain / non-deployment honesty for
`ENG-ASPIRATIONAL-FEM-01` only. That does **not** ship continuum solvers on the
public beta, does **not** flip `lenr_proved`, and does **not** close any
`EQ-OPEN-*`.

### ARA P1 theory rebuilds (queued for v0.3.9)

Author-faithful equation rebuilds (Widom / Hagelstein / Storms / Takahashi / …)
are tracked in
[`docs/v0.3.9-beta/ARA_P1_THEORY_REBUILDS.md`](../v0.3.9-beta/ARA_P1_THEORY_REBUILDS.md).
P0 integrity (taxonomy, provenance, nulls, paper benchmarks) ships in 0.3.8
without closing any `EQ-OPEN-*`.

## Explicit non-goals (still)

- Declaring any `EQ-OPEN-*` closed.
- Enabling public analytics auto-persist.
- Product copy claiming energetic / practical freedom.

## Resume checklist

- [x] Maturity ledger P0/P1 rows complete and badges live (EngineMaturityBadge on BF/QT/Unified/Theory Methods/Open Questions)
- [x] Bubble Fusion dual-fetch bug triaged (see `BUG_TRIAGE.md`)
- [x] Open Phase A branch: `consciousenergy/v037-bubble-engine-truth-98d8`
- [x] Phase B opt-in bridge + handoff/verification: `consciousenergy/v037-bubble-km-bridge-98d8`
- [x] Phase B KM auto-default on BF (Mach≥0.3): `consciousenergy/v038-km-auto-bf-98d8`
