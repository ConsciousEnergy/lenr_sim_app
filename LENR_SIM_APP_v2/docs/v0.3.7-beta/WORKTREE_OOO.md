# Worktree — order of operations (v0.3.7-beta)

Critical path for responsible progress. Later work waits on earlier exits.

## Now (governance train)

1. **Safety / honesty** — Beta / Approximate / Speculative badges; fallback provenance; Analytics write honesty.
2. **Security residuals** — Document (this pack); fix only high+ or cheap token-separation.
3. **Maturity ledger + proof matrix** — P0/P1 rows with MD/JSON/LaTeX/Lean links; `lenr_proved: false`.

## After governance (deferred queue)

4. **Multiphysics fidelity Phase A** — **done** on `consciousenergy/v037-bubble-engine-truth-98d8` (single-fetch + provenance). UI readability HUD ported on `consciousenergy/v037-bf-ui-honesty-98d8` (parity with private-beta fixed top HUD).
5. **Multiphysics fidelity Phase B** — Opt-in RP/KM + handoff/verification **shipped** on `consciousenergy/v037-bubble-km-bridge-98d8`; KM auto-default still deferred ([DEFERRED_MULTIPHYSICS_FIDELITY.md](./DEFERRED_MULTIPHYSICS_FIDELITY.md)).
6. **Merge train → `main` → VPS** — Follow [MERGE_TRAIN_VPS.md](./MERGE_TRAIN_VPS.md): #185→#186→#187→#188, then rebase `vps-public-beta-rebase-98d8` onto `main` before deploy.
7. **Share / uptime / console hygiene** — PostHog provider gate + VPS share docs on `consciousenergy/v037-share-uptime-prep-98d8`; Swarm/Pages **prep only** for [v0.3.8](../v0.3.8-beta/SWARM_PAGES_CUTOVER_PREP.md).
8. **OPEN scientific obligations** — Research tracks only; status stays OPEN in UI/MD/JSON/Lean.
9. **Solver stubs / continuum aspirational** — Last (FEM, Poisson–Schrödinger, etc.); Swarm HA cutover earliest **v0.3.8-beta**.

## Permanent non-goals

- Product claims of energetic / practical freedom
- Declaring `EQ-OPEN-*` closed without new analytical/EMP evidence
- Public auto-persist without security review
- Live Terraform/Swarm/Pages apply during v0.3.7-beta

## Suggested git topic branches (after this pack)

| Order | Branch | Purpose |
|-------|--------|---------|
| 1 | `consciousenergy/v037-bubble-engine-truth-98d8` | Phase A **done** (single-fetch + provenance; KM still deferred) |
| 1b | `consciousenergy/v037-bf-ui-honesty-98d8` | BF HUD readability + honesty residuals (empty Analytics / Lean tooltip) |
| 2 | `consciousenergy/v037-bubble-km-bridge-98d8` | Phase B **shipped slice** (opt-in `dynamics_mode` + Mach + tunneling handoff + verification; KM auto-default still deferred) |
| 2b | `consciousenergy/v037-share-uptime-prep-98d8` | PostHog gate + merge-train/VPS docs + 0.3.8 Swarm prep |
| 3 | `consciousenergy/vps-public-beta-rebase-98d8` | Rebase onto `main` after #185–#188; VPS deploy source |
| 4 | `consciousenergy/v037-open-research-<q>-98d8` | Per OPEN question |
