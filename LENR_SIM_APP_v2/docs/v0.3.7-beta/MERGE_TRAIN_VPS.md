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
| `consciousenergy/vps-public-beta-rebase-98d8` | **Rebased onto `main` (2026-09-12)** — tip == `main` @ `360c94c` (duplicate deps commit dropped). Ready to deploy **current main**; re-pull after #185–#188 land before calling the deploy 0.3.7. Live share: [LIVE_SHARE_STATUS.md](./LIVE_SHARE_STATUS.md). |

## Merge procedure (human-approved)

1. Squash-merge **#185** into `main` (CI already green on `main`).
2. Retarget **#186** to `main` (or merge via updated base) → squash-merge when CI green.
3. Same for **#187**, then **#188**.
4. Close **#184** as superseded by #187, or cherry-pick any unique playback bits.
5. Fast-forward / rebase VPS tip onto updated `main` (already synced once on 2026-09-12):

   ```bash
   git fetch origin
   git checkout consciousenergy/vps-public-beta-rebase-98d8
   git rebase origin/main
   git push --force-with-lease origin consciousenergy/vps-public-beta-rebase-98d8
   ```

6. `workflow_dispatch` deploy from that tip; probe health on **`lenr-sim-beta`** (shareable now). Cut over `lenr-simp-app` DNS A record when ready (see live status doc).

Do **not** deploy a stale VPS tip that lags `main`.

## VPS verify after deploy

```bash
# Working share host (A → VPS) — use this until DNS cutover:
curl -fsS "https://lenr-sim-beta.conscious.energy/api/health"
# Intended public name — only after A record replaces WP CNAME:
curl -fsS "https://lenr-simp-app.conscious.energy/api/health"
```

Live probe log: [LIVE_SHARE_STATUS.md](./LIVE_SHARE_STATUS.md).

SPA load in a clean browser profile. Console: PostHog provider warning must be absent when analytics is off (#189); MetaMask/`contentscript.js` noise is non-app.

## Explicitly deferred to **v0.3.8-beta**

Terraform + Ansible + Docker Swarm + Traefik + Cloudflare Pages **apply/cutover**.
Prep checklist lives in [`../v0.3.8-beta/SWARM_PAGES_CUTOVER_PREP.md`](../v0.3.8-beta/SWARM_PAGES_CUTOVER_PREP.md).
