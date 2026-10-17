# Dual KVM2 ≠ production Swarm cutover (readiness audit)

**Date:** 2026-10-17 (re-verified; KVM1 recorded)  
**Question:** Now that both Hostinger KVM2s exist, can we complete the full
build with Docker Swarm, Ansible, Traefik, and Cloudflare?

**Short answer:** **In-repo stack validates; live staging/public apply does not.**
Dual KVM2s unlock **Compose share + isolated CI**. A third **KVM1**
(`2071323` / `31.220.55.113`) is bootstrapped for staging Swarm but
**not** Swarm-inited until `CONFIRM_SWARM_0_3_8`. Full Swarm + Traefik +
Cloudflare Pages remains a **gated v0.3.8 staging / v0.3.9 production** path.
Operator unlock list: [`FULL_STACK_BUILD_UNLOCK.md`](FULL_STACK_BUILD_UNLOCK.md).
Topology: [`THREE_NODE_SWARM_TOPOLOGY.md`](THREE_NODE_SWARM_TOPOLOGY.md).
Do **not** set `CONFIRM_SWARM_0_3_9` without an announced window and live credentials.

## What we have now

Verified via Hostinger VPS API (2026-10-04T15:48Z) for KVM2s; KVM1 SSH
probe 2026-10-17 (`Docker` installed, `Swarm=inactive`).

| VM | Id | IP | Hostname (Hostinger) | Role **today** |
|----|----|----|----------------------|----------------|
| Compose share / beta | `1280333` | `185.211.4.66` | `lenr-sim-app.conscious.energy` (Ubuntu 24.04) | Compose beta healthy `0.3.7-beta` (restored 2026-10-17); keep until v0.3.9 |
| Dedicated CI | `2012566` | `45.93.100.251` | `srv2012566.hstgr.cloud` (Ubuntu 26.04) | **GitHub Actions only** (runner `lenr-ci-1`); **zero** Compose projects; **never** Swarm |
| Staging / data KVM1 | `2071323` | `31.220.55.113` | `srv2071323` (Ubuntu; Docker 29.x) | **0.3.8 staging manager** (await confirm); **0.3.9+** prod worker + observability — [`KVM1_OPERATOR_WALKTHROUGH.md`](KVM1_OPERATOR_WALKTHROUGH.md) |

Dedicated CI docs/workflows are on `main` (#218). Recommended PR merge queue is
**complete** (#218→#220→#210→#219→#212→#217→#215→#224).

Local stack gate (agent, 2026-10-04T15:48:57Z):
`./infrastructure/scripts/staging-swarm-dry-run.sh local` — confirm gates exit 2,
`terraform validate` OK, Ansible syntax-check OK
(`/opt/cursor/artifacts/staging_swarm_local_dry_run_2026-10-04.log`).

## What dual KVM2 enables

- Untrusted PR CI **off** the live Compose host (blast-radius win).
- Continue Compose ship / KM / VNC unlock on share without CI starving the app.
- Run `staging-swarm-dry-run` (local gate checks) on every PR via `lenr-ci`.

## What it does **not** enable (yet)

| Capability | Blocker |
|------------|---------|
| Multi-node Swarm for public share | Need **Swarm nodes** that are **not** the CI box; do not `docker swarm init` on `185.211.4.66` without a written migration plan ([`STAGING_SWARM_DRY_RUN.md`](STAGING_SWARM_DRY_RUN.md)) |
| Use CI VM as Swarm worker | **Forbidden** for goal security: `lenr-ci` runs untrusted PR code; must never hold `VPS_*` / deploy secrets |
| Traefik edge for `api.` | Ansible stack + inventory + TLS; staging validate under `CONFIRM_SWARM_0_3_8` |
| Cloudflare Pages SPA + DNS | Terraform `backend.hcl` + `staging.tfvars` / prod vars; Pages on `app.` only; `api.` A `proxied=false` ([`DNS_AND_HOSTINGER_DECISIONS.md`](DNS_AND_HOSTINGER_DECISIONS.md)) |
| Production cutover | Version bump to `0.3.9-beta` + `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9` ([`../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`](../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md)) |

## Component readiness matrix (repo artifacts vs live apply)

| Component | In-repo ready? | Live / operator gate |
|-----------|----------------|----------------------|
| **Compose share** | Yes — live on `1280333` (`running(4)`, healthy backend) | Keep until v0.3.9; see [`COMPOSE_SHIP_HANDOFF.md`](COMPOSE_SHIP_HANDOFF.md) |
| **Dedicated CI (`lenr-ci`)** | Yes — runner `lenr-ci-1` on `2012566` | Merge [#218](https://github.com/ConsciousEnergy/lenr_sim_app/pull/218); never put `VPS_*` on this host. Stalled queue (queued, no in_progress) → Hostinger-restart **only** `2012566` ([`../v0.3.7-beta/SELF_HOSTED_RUNNER.md`](../v0.3.7-beta/SELF_HOSTED_RUNNER.md)) |
| **Docker Swarm** | Playbooks + dry-run script | Needs staging nodes ≠ CI VM; `CONFIRM_SWARM_0_3_8` then `0_3_9` ([`STAGING_SWARM_DRY_RUN.md`](STAGING_SWARM_DRY_RUN.md), [`../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`](../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md)) |
| **Ansible** | `infrastructure/ansible/playbooks/{site,deploy-stack,setup-docker}.yml` + `inventory.staging.yml.example` | Copy example → untracked `inventory.staging.yml`; `--check` then apply under staging confirm |
| **Traefik** | `ansible/templates/traefik.yml.j2` + `traefik-dynamic.yml.j2` (wired in `deploy-stack.yml`) | Staging TLS/ACME + stack deploy after Swarm nodes exist |
| **Cloudflare** | Terraform Cloudflare module + [`DNS_AND_HOSTINGER_DECISIONS.md`](DNS_AND_HOSTINGER_DECISIONS.md) | Untracked `backend.hcl` / `staging.tfvars`; Pages on `app.`; `api.` A `proxied=false` |

**Full build complete?** Only when the right-hand column is satisfied under the confirm strings — **not** merely because two KVM2s exist. Step-by-step unlock: [`FULL_STACK_BUILD_UNLOCK.md`](FULL_STACK_BUILD_UNLOCK.md).

## Recommended next milestones (ordered)

1. ~~Merge dedicated CI docs/PR (#218)~~ **done**
2. ~~Land hygiene + product/ops merge queue~~ **done** (see hygiene doc)
3. **Merge ladder (ask):** #232 audit gates → #233 Actions → #228/#229 → #230 docs
   → #231 science — see [`PR_AND_BRANCH_HYGIENE.md`](PR_AND_BRANCH_HYGIENE.md)
4. **Learn + rehearse locally:** [`TWO_KVM2_SWARM_TOPOLOGY.md`](TWO_KVM2_SWARM_TOPOLOGY.md)
   + [`SWARM_OPERATOR_LAB.md`](SWARM_OPERATOR_LAB.md); keep running
   `staging-swarm-dry-run.sh local`.
5. **UMLENR Goal 1 (parallel):** open docs hub PR from
   [`../program/UMLENR_GOAL1_HUB_PACK/`](../program/UMLENR_GOAL1_HUB_PACK/README.md)
   (needs write access on `UMLENR`).
6. **Operator staging remote dry-run** (plan/check only) — needs untracked
   `backend.hcl`, `staging.tfvars`, `inventory.staging.yml` (see unlock doc).
7. **~~Order / bootstrap KVM1~~** — **done** (`2071323` / `31.220.55.113`);
   Swarm init still blocked on `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8`
   ([`KVM1_OPERATOR_WALKTHROUGH.md`](KVM1_OPERATOR_WALKTHROUGH.md)).
8. Validate Traefik → API replicas, Pages CORS/WS, health on staging.
9. Only then schedule **v0.3.9** public cutover under `CONFIRM_SWARM_0_3_9`.

## Invariants (do not weaken)

- Live beta stays Compose until cutover; keep rollback tag ≥ one release.
- `EQ-OPEN-*` stay OPEN; academic PRs stay split from infra.
- Deploy/ship workflows remain on GitHub-hosted (`ubuntu-latest`), never on
  `lenr-ci` with `VPS_*`.
- No production `terraform apply` / Swarm init without the matching confirm string.
