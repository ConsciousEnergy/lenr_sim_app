# Merge train → `main` → VPS (v0.3.7-beta)

Best-practice order for landing the open `consciousenergy/*-98d8` stack so the
Hostinger VPS can run **0.3.7-beta** without stacking conflicts.

## Why this order

GitHub Actions’ full Test workflow only runs on PRs targeting `main`. Stacked
PRs (#186–#189) base on topic branches and stay CodeRabbit-only until each is
retargeted to `main` after the prior PR lands. Deploy the VPS only from a tip
that includes **both** current `main` and the science + share stack.

## Open stack (as of 2026-09-12)

| Order | PR | Head | Base | Role |
|------:|----|------|------|------|
| 1 | [#185](https://github.com/ConsciousEnergy/lenr_sim_app/pull/185) | `consciousenergy/v0.3.7-beta-98d8` | `main` | Governance, maturity ledger, Beta badges (**CI green on `main`**) |
| 2 | [#186](https://github.com/ConsciousEnergy/lenr_sim_app/pull/186) | `consciousenergy/v037-bubble-engine-truth-98d8` | #185 head | Phase A single-fetch + provenance |
| 3 | [#187](https://github.com/ConsciousEnergy/lenr_sim_app/pull/187) | `consciousenergy/v037-bf-ui-honesty-98d8` | #186 head | BF HUD readability + honesty |
| 4 | [#188](https://github.com/ConsciousEnergy/lenr_sim_app/pull/188) | `consciousenergy/v037-bubble-km-bridge-98d8` | #187 head | Phase B opt-in RP/KM + handoff |
| 5 | [#189](https://github.com/ConsciousEnergy/lenr_sim_app/pull/189) | `consciousenergy/v037-share-uptime-prep-98d8` | #188 head | PostHog gate, merge-train/VPS docs, verify-beta-share, 0.3.8 prep |

**Parallel / conflict risk**

| PR | Notes |
|----|--------|
| [#184](https://github.com/ConsciousEnergy/lenr_sim_app/pull/184) `ui-readability-playback-98d8` → `main` | Overlaps #187. Prefer **close or residual-only rebase after #187**. Do not merge #184 and #187 both blindly. |

**CI preview (do not squash-merge)**

| Branch | Role |
|--------|------|
| `consciousenergy/v037-ci-preview-98d8` → `main` ([#190](https://github.com/ConsciousEnergy/lenr_sim_app/pull/190) draft) | Same tip as #189. Exists only so Actions run the full Test workflow on the **entire** stack before human squash-merges. Close after #185–#189 land. |

**VPS branch**

| Branch | Status |
|--------|--------|
| `consciousenergy/vps-public-beta-rebase-98d8` | **Rebased onto `main` (2026-09-12)** — tip == `main` @ `360c94c` (duplicate deps commit dropped). Ready to deploy **current main**; re-pull after #185–#189 land before calling the deploy for 0.3.7. Live share: [LIVE_SHARE_STATUS.md](./LIVE_SHARE_STATUS.md). |

## Local dry-run + CI evidence (2026-09-12)

Operator preflight (no merge):

```bash
./LENR_SIM_APP_v2/infrastructure/vps/scripts/check-merge-train.sh
# Prove the *human* path (squash + rebase --onto) in a throwaway worktree (no push).
# Default mode is squash; `ff` only checks ancestry and does *not* match GitHub squash.
./LENR_SIM_APP_v2/infrastructure/vps/scripts/dry-run-merge-train.sh
```

**Do not** retarget stacked PRs onto `main` and squash without `git rebase --onto`.
After `#185` lands as a squash, a naive `#186` merge hits add/add conflicts (docs +
`BubbleFusionPage.jsx`). The executor rebases each remaining head `--onto origin/main`
using the **pre-rebase** tip of the previous head as the cutoff, then force-pushes,
retargets, waits for checks, and squash-merges. Reconfirmed tip `8df757a` via
`dry-run-merge-train.sh squash` (squash tree == share tip tree == VPS dry-rebase tree).

| Check | Result |
|-------|--------|
| Dynamics-mode pytest | **7 passed** |
| Jest `WrapWithPostHog` + Bubble Fusion | **13 passed** (reconfirmed tip `3a8d193`: 2/2 PostHog gate) |
| CI preview #190 tip `ce0279f` | **Test and Benchmark full green** (frontend, e2e, py3.10/11/12) |
| CI preview #190 tip `3a8d193` | **Test and Benchmark full green** ([run 34720144664](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/34720144664): frontend, e2e, py3.10/11/12) — SHA-pin deploy + IMAGE_TAG force + 0.3.7/0.3.8 prep |
| CI preview #190 tip `1252ab5` (docs evidence) | **Test and Benchmark full green** ([run 34720558740](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/34720558740)) — MERGE_TRAIN/LIVE_SHARE/VPS README evidence refresh |
| CI preview #190 tip `049fef9` | **Test and Benchmark full green** ([run 34721847767](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/34721847767)) — check-merge-train.sh READY |
| CI preview #190 tip `5193a66` | **Test and Benchmark full green** ([run 34721395036](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/34721395036)) — codecov-action v7 `files:` fix (no more Unexpected `file` annotations) |
| CI preview #190 tip `b98e206` | **Test and Benchmark full green** ([run 34722505921](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/34722505921)) — path/env docs + Traefik static/dynamic split; PostHog Jest 2/2 local |
| CI preview #190 tip `7650a15` | **Test and Benchmark full green** ([run 34723272272](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/34723272272)) — Traefik static http strip + EXPECT_VERSION hard-fail + PostHog skill align; check-merge-train READY |
| CI preview #190 tip `dc91e3d` | **Test and Benchmark full green** ([run 34724292610](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/34724292610)) — Traefik `security-headers@file` on backend; check-merge-train READY |
| CI preview #190 tip `52ffb6b` | **Test and Benchmark full green** ([run 34725341387](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/34725341387)) — Terraform module dedupe `validate` OK + ansible syntax-check; check-merge-train READY; browser PostHog gate verified locally |
| CI preview #190 tip `b0ec73d` | **Test and Benchmark full green** ([run 34726328172](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/34726328172)) — tip evidence + READY; `post-merge-vps-ship.sh` plan/check added for human-gated VPS ship |
| Live `verify-beta-share.sh` | share host OK (`0.3.6-beta`); `EXPECT_VERSION=0.3.7-beta` **fails closed** (exit 1); intended host WARN (WP CNAME) |
| Dry-run merge #185→#189 onto `main` | **FF ancestry OK**; **squash+rebase-onto OK** (tip `8df757a` via `dry-run-merge-train.sh squash`; tree == share == VPS dry-rebase). Naive retarget after squash **conflicts**. |
| Deploy harden | CI SSH pins `git checkout $GITHUB_SHA`, forces `IMAGE_TAG=$APP_VERSION` + `UPDATE_ENV_IMAGE_TAG=1`; compose/default fallback `0.3.7-beta` |
| Stack ancestry | engine ⊂ bf-ui ⊂ km ⊂ share (linear after lint-fix rebase) |

## Merge procedure (human-approved only)

Do **not** run these until an operator explicitly authorizes (e.g. “merge the stack”).

One-shot (preferred after approval):

```bash
./LENR_SIM_APP_v2/infrastructure/vps/scripts/check-merge-train.sh   # must be READY
./LENR_SIM_APP_v2/infrastructure/vps/scripts/merge-train-execute.sh plan
CONFIRM=I_MERGE_STACK_0_3_7 EXECUTE=1 \
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/merge-train-execute.sh merge
# Then ship (separate confirm):
CONFIRM=I_SHIP_VPS_0_3_7 EXECUTE=1 \
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ship
# ship waits for Build and Deploy, then fail-closes via verify-beta-share.sh
# (SKIP_WAIT=1 to dispatch-only)```

Manual equivalent (must rebase --onto; naive retarget conflicts):

```bash
# 1) Squash #185 (already targets main; CI green)
gh pr merge 185 --squash --delete-branch=false

# 2–5) Rebase each stacked head onto main, force-push, retarget, CI, squash.
# Cutoff for each step is the *pre-rebase* tip of the previous head.
git fetch origin
cutoff=$(git rev-parse origin/consciousenergy/v0.3.7-beta-98d8)
for row in \
  "186|consciousenergy/v037-bubble-engine-truth-98d8" \
  "187|consciousenergy/v037-bf-ui-honesty-98d8" \
  "188|consciousenergy/v037-bubble-km-bridge-98d8" \
  "189|consciousenergy/v037-share-uptime-prep-98d8"
do
  IFS='|' read -r n head <<<"$row"
  old_head=$(git rev-parse "origin/$head")
  git checkout -B "$head" "origin/$head"
  git rebase --onto origin/main "$cutoff" "$head"
  git push --force-with-lease origin "HEAD:refs/heads/$head"
  gh pr edit "$n" --base main
  gh pr checks "$n" --watch
  gh pr merge "$n" --squash --delete-branch=false
  cutoff=$old_head
done

# 6) Close superseded / preview PRs
gh pr close 184 --comment "Superseded by #187 BF HUD readability + honesty."
gh pr close 190 --comment "CI preview only; stack landed via #185–#189."

# 7) Rebase VPS tip and deploy (helper — plan/check safe; ship needs CONFIRM)
./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh check
# Manual equivalent:
git fetch origin
git checkout consciousenergy/vps-public-beta-rebase-98d8
git rebase origin/main
git push --force-with-lease origin consciousenergy/vps-public-beta-rebase-98d8
gh workflow run deploy.yml --ref consciousenergy/vps-public-beta-rebase-98d8
# Or gated helper:
# CONFIRM=I_SHIP_VPS_0_3_7 EXECUTE=1 \
#   ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ship
# Deploy workflow pins the VPS git tree to the workflow SHA, then forces
# IMAGE_TAG=$APP_VERSION into .env — stale checkout + IMAGE_TAG=0.3.6-beta
# cannot survive a 0.3.7 tip deploy.

# 8) Prove 0.3.7 on the share host
EXPECT_VERSION=0.3.7-beta ./LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh
# or: ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh verify-live
```

Do **not** deploy a stale VPS tip that lags `main`.
Do **not** squash-merge the CI-preview PR — it duplicates the stack tip.

## VPS verify after deploy

```bash
# Working share host (A → VPS) — use this until DNS cutover:
curl -fsS "https://lenr-sim-beta.conscious.energy/api/health"
# Wired probe (optional EXPECT_VERSION=0.3.7-beta after deploy):
./LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh
# Intended public name — only after A record replaces WP CNAME:
curl -fsS "https://lenr-simp-app.conscious.energy/api/health"
```

Live probe log: [LIVE_SHARE_STATUS.md](./LIVE_SHARE_STATUS.md).

SPA load in a clean browser profile. Console: PostHog provider warning must be absent when analytics is off (#189); MetaMask/`contentscript.js` noise is non-app.

## Explicitly deferred to **v0.3.8-beta**

Terraform + Ansible + Docker Swarm + Traefik + Cloudflare Pages **apply/cutover**.
Prep checklist lives in [`../v0.3.8-beta/SWARM_PAGES_CUTOVER_PREP.md`](../v0.3.8-beta/SWARM_PAGES_CUTOVER_PREP.md).
