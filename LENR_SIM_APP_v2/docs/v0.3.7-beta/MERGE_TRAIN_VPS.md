# Merge train → `main` → VPS (v0.3.7-beta)

Best-practice order for landing the open `consciousenergy/*-98d8` stack so the
Hostinger VPS can run **0.3.7-beta** without stacking conflicts.

## Why this order

GitHub Actions’ full Test workflow only runs on PRs targeting `main`. Stacked
PRs (#186–#188) base on topic branches and stay CodeRabbit-only until the
governance PR (#185) is on `main`. Deploy the VPS only from a tip that includes
**both** current `main` and the science stack.

## Open stack (as of 2026-09-12)

| Order | PR | Head | Base | Role |
|------:|----|------|------|------|
| 1 | [#185](https://github.com/ConsciousEnergy/lenr_sim_app/pull/185) | `consciousenergy/v0.3.7-beta-98d8` | `main` | Governance, maturity ledger, Beta badges |
| 2 | [#186](https://github.com/ConsciousEnergy/lenr_sim_app/pull/186) | `consciousenergy/v037-bubble-engine-truth-98d8` | #185 head | Phase A single-fetch + provenance |
| 3 | [#187](https://github.com/ConsciousEnergy/lenr_sim_app/pull/187) | `consciousenergy/v037-bf-ui-honesty-98d8` | #186 head | BF HUD readability + honesty |
| 4 | [#188](https://github.com/ConsciousEnergy/lenr_sim_app/pull/188) | `consciousenergy/v037-bubble-km-bridge-98d8` | #187 head | Phase B opt-in RP/KM + handoff |

**Parallel / conflict risk**

| PR | Notes |
|----|--------|
| [#184](https://github.com/ConsciousEnergy/lenr_sim_app/pull/184) `ui-readability-playback-98d8` → `main` | Overlaps #187. Prefer **close or residual-only rebase after #187**. Do not merge #184 and #187 both blindly. |

**VPS branch**

| Branch | Status |
|--------|--------|
| `consciousenergy/vps-public-beta-rebase-98d8` | **No open PR**; tip is **behind `main`** (missing later main commits). Not a deploy source until rebased. |

## Merge procedure (human-approved)

1. Squash-merge **#185** into `main` (CI already green on `main`).
2. Retarget **#186** to `main` (or merge via updated base) → squash-merge when CI green.
3. Same for **#187**, then **#188**.
4. Close **#184** as superseded by #187, or cherry-pick any unique playback bits.
5. Rebase VPS tip onto `main`:

   ```bash
   git fetch origin
   git checkout consciousenergy/vps-public-beta-rebase-98d8
   git rebase origin/main
   # resolve conflicts; keep infrastructure/vps Compose+Caddy as ship path
   git push --force-with-lease origin consciousenergy/vps-public-beta-rebase-98d8
   ```

6. Open `consciousenergy/vps-public-beta-rebase-98d8` → `main` (or merge VPS deltas into `main` if already included).
7. `workflow_dispatch` deploy; probe `https://<beta-host>/api/health`.

Do **not** merge the science tip into the stale VPS branch and deploy — rebase VPS onto `main` first.

## VPS verify after deploy

```bash
curl -fsS "https://lenr-sim-beta.conscious.energy/api/health"
# After DNS A cutover for the intended public name:
curl -fsS "https://lenr-simp-app.conscious.energy/api/health"
```

SPA load + WebSocket (if used) in a clean browser profile. Console: PostHog provider warning must be absent when analytics is off; MetaMask/`contentscript.js` noise is non-app.

## Explicitly deferred to **v0.3.8-beta**

Terraform + Ansible + Docker Swarm + Traefik + Cloudflare Pages **apply/cutover**.
Prep checklist lives in [`../v0.3.8-beta/SWARM_PAGES_CUTOVER_PREP.md`](../v0.3.8-beta/SWARM_PAGES_CUTOVER_PREP.md).
