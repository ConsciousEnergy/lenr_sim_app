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
4. Contract test + browser evidence that the unreachable banner is absent on healthy backend (in progress on this branch).

### Phase B — Fidelity (gated)

1. Bridge Bubble Fusion route to shared RP/KM core (`bubble_solver` /
   `bubble_lattice_interaction`) instead of a third adiabatic calculator.
2. Dynamics mode policy: RP for low Mach; auto/default KM when Mach ≥ 0.3.
3. Collapse → tunneling handoff with explicit claim-tier labels.
4. Verification gates: KM→RP limit, thermo consistency, finite P/v, no silent schematic.

### Phase C — Roadmap only (document)

Real-gas EOS, heat/mass transfer, continuum FEM / Poisson–Schrödinger as research
tracks behind Theory Methods aspirational callouts — **not** production Bubble
Fusion numerics in the same PR train as A/B.

## Explicit non-goals (still)

- Declaring any `EQ-OPEN-*` closed.
- Enabling public analytics auto-persist.
- Product copy claiming energetic / practical freedom.

## Resume checklist

- [ ] Maturity ledger P0/P1 rows complete and badges live
- [x] Bubble Fusion dual-fetch bug triaged (see `BUG_TRIAGE.md`)
- [x] Open Phase A branch: `consciousenergy/v037-bubble-engine-truth-98d8`
- [ ] Then Phase B: `consciousenergy/v037-bubble-km-bridge-98d8`
