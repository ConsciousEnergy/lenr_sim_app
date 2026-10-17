# Full stack build unlock (Swarm + Ansible + Traefik + Cloudflare)

**Question:** With both Hostinger KVM2s online, can we complete the full build?

**Answer (2026-10-04):** **Repo artifacts + local gates are ready. Merge queue
done. Live staging apply and public cutover are still not.** Dual KVM2 =
Compose share + isolated CI. Completing Swarm/Traefik/Cloudflare still needs
operator credentials, ≥1 staging Swarm node that is **not** the CI box, then
confirm strings.

## Live inventory (Hostinger API, 2026-10-04T15:48Z)

| VM | Id | IP | Role now | Swarm role |
|----|----|----|----------|------------|
| Share | `1280333` | `185.211.4.66` | Compose beta healthy `0.3.7-beta`; BF defaults advertise `dynamics_mode=auto` | **Keep Compose** until v0.3.9 cutover |
| CI | `2012566` | `45.93.100.251` | GitHub runner `lenr-ci-1` only (no Compose projects) | **Forbidden** as Swarm worker |

Third VPS: Hostinger **KVM1** `2071323` / `31.220.55.113` (`srv2071323`) —
Docker installed, UFW/SSH hardened; Swarm init awaits
`CONFIRM_SWARM_0_3_8`. Walkthrough:
[`KVM1_OPERATOR_WALKTHROUGH.md`](KVM1_OPERATOR_WALKTHROUGH.md).
Topology: [`THREE_NODE_SWARM_TOPOLOGY.md`](THREE_NODE_SWARM_TOPOLOGY.md).

## In-repo readiness (agent local dry-run)

Re-run **2026-10-04T15:48:57Z** on `main` tip `695a882`:

```bash
./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh local
```

| Check | Result |
|-------|--------|
| `deploy.sh` confirm gates | Exit 2 without `CONFIRM_SWARM_0_3_8` / `0_3_9` |
| `terraform init -backend=false` + `validate` | Success (Cloudflare + Hostinger providers) |
| `ansible-playbook --syntax-check` `deploy-stack.yml` + `site.yml` | OK (Traefik templates wired) |
| Traefik Jinja render (local) | OK — `/tmp/swarm-template-render/traefik.yml` |
| Evidence log | `/opt/cursor/artifacts/staging_swarm_local_dry_run_2026-10-04.log` |
| Recommended merge queue | **Complete** — see [`PR_AND_BRANCH_HYGIENE.md`](PR_AND_BRANCH_HYGIENE.md) |

## Operator unlock checklist (do these to finish staging build)

Copy examples → **untracked** files (never commit):

1. `infrastructure/terraform/backend.hcl` ← `backend.hcl.example`
2. `infrastructure/terraform/staging.tfvars` ← `staging.tfvars.example`
   - Real Cloudflare account/zone/token
   - `hostinger_vps_mode = "disabled"` or `create_new` **only** for a **new** staging IP
   - Do **not** point Swarm manager at `185.211.4.66` without a written migration plan
3. `infrastructure/ansible/inventory.staging.yml` ← `inventory.staging.yml.example`
   - `STAGING_MANAGER_IP` / worker IPs ≠ CI `45.93.100.251`
4. Provision staging node: new **KVM1** (preferred) —
   [`KVM1_OPERATOR_WALKTHROUGH.md`](KVM1_OPERATOR_WALKTHROUGH.md) —
   or accepted single-node caveat ([`STAGING_SWARM_DRY_RUN.md`](STAGING_SWARM_DRY_RUN.md))
5. Plan/check only:
   ```bash
   CONFIRM=I_STAGING_0_3_8 EXECUTE=1 \
     ./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh remote
   ```
6. Staging apply under `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8` — validate Traefik
   → API, Pages CORS/WS
7. Public cutover later under `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9`
   ([`../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`](../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md))

## What agents will not do without an explicit ask

- Merge open PRs
- `terraform apply` / Swarm init on live share
- Purchase a third Hostinger VPS
- Put `VPS_*` or deploy secrets on `lenr-ci`
- Set `CONFIRM_SWARM_0_3_9`

**Ops exception (already authorized by dedicated-CI goal):** if `lenr-ci` shows a
queued backlog with zero in-progress jobs, Hostinger-restart **only** VM
`2012566` to restore the runner (share `1280333` untouched). After reboot, if
the service logs `A session for this runner already exists`, stop the
`actions.runner…lenr-ci-1` unit, wait ~90s for the GitHub session to expire,
then start it again until the journal shows `Listening for Jobs`.

## Merge queue / branch model

**0.3.7 ladder complete** (#218→#231). Consolidation **2026-10-10**:

- `main` = live **v0.3.7-beta** (Compose share; tag `v0.3.7-beta`)
- `dev` = **v0.3.8-beta** integration (markers bumped; no auto deploy)
- See [`PR_AND_BRANCH_HYGIENE.md`](PR_AND_BRANCH_HYGIENE.md) and
  [`.github/BRANCHING.md`](../../../.github/BRANCHING.md)

## Immediate next steps (ordered)

0. **New work defaults to `dev`** (0.3.8 markers). Hotfix 0.3.7 only on `main`.
1. **Learn the topology (two KVM2s):** [`TWO_KVM2_SWARM_TOPOLOGY.md`](TWO_KVM2_SWARM_TOPOLOGY.md)
   + [`SWARM_OPERATOR_LAB.md`](SWARM_OPERATOR_LAB.md).
2. **Program hub (parallel):** copy
   [`../program/UMLENR_GOAL1_HUB_PACK/`](../program/UMLENR_GOAL1_HUB_PACK/README.md)
   into `ConsciousEnergy/UMLENR` and open Goal 1 docs PR (needs write access on
   UMLENR — not available to this agent’s token).
3. **Operator:** drop untracked Terraform/Ansible staging credentials (checklist above).
4. **Operator:** either stay on **local dry-run** (no 3rd VPS) or provision a
   staging manager ≠ `2012566` / accept single-node cutover rehearsal on share.
5. **Remote dry-run only:** `CONFIRM=I_STAGING_0_3_8 EXECUTE=1 ./…/staging-swarm-dry-run.sh remote`
6. **Staging apply** under `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8` — Traefik → API, Pages CORS/WS.
7. **Public cutover** later under `CONFIRM_SWARM_0_3_9` (do not set without an announced window).
