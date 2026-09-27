# Dual KVM2 ≠ production Swarm cutover (readiness audit)

**Date:** 2026-09-26 (re-verified)  
**Question:** Now that both Hostinger KVM2s exist, can we complete the full
build with Docker Swarm, Ansible, Traefik, and Cloudflare?

**Short answer:** **In-repo stack validates; live staging/public apply does not.**
Dual KVM2s unlock **Compose share + isolated CI**. Full Swarm + Traefik +
Cloudflare Pages remains a **gated v0.3.8 staging / v0.3.9 production** path.
Operator unlock list: [`FULL_STACK_BUILD_UNLOCK.md`](FULL_STACK_BUILD_UNLOCK.md).
Do **not** set `CONFIRM_SWARM_0_3_9` without an announced window and live credentials.

## What we have now

Verified via Hostinger VPS API (2026-09-26T21:24Z): both **KVM 2**, `state=running`.

| VM | Id | IP | Hostname (Hostinger) | Role **today** |
|----|----|----|----------------------|----------------|
| Compose share / beta | `1280333` | `185.211.4.66` | `lenr-sim-app.conscious.energy` (Ubuntu 24.04) | Compose project `lenr-sim` **running(4)** — backend/postgres healthy, Caddy 80/443, images `0.3.7-beta` |
| Dedicated CI | `2012566` | `45.93.100.251` | `srv2012566.hstgr.cloud` (Ubuntu 26.04) | **GitHub Actions only** (runner `lenr-ci-1`, labels `self-hosted,linux,x64,lenr-ci`); **zero** Compose projects |

Evidence CI is landable: dedicated runner online; smoke + Test jobs on
`lenr-ci-1`; merge [#218](https://github.com/ConsciousEnergy/lenr_sim_app/pull/218)
for the canonical `SELF_HOSTED_RUNNER.md` + smoke refuse-share gate on `main`.

Local stack gate (agent, 2026-09-26T21:24:11Z):
`./infrastructure/scripts/staging-swarm-dry-run.sh local` — confirm gates exit 2,
`terraform validate` OK, Ansible syntax-check OK
(`/opt/cursor/artifacts/staging_swarm_local_dry_run.log`).

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

1. **Merge dedicated CI docs/PR (#218)** so all subsequent rebases see green `lenr-ci`.
2. **Operator staging remote dry-run** (plan/check only) — needs untracked
   `backend.hcl`, `staging.tfvars`, `inventory.staging.yml` (see unlock doc).
3. **Provision staging Swarm nodes** (new VMs or documented single-node staging
   caveats) — **not** the CI KVM2; **not** blind promote of live Compose.
4. Validate Traefik → API replicas, Pages CORS/WS, health.
5. Only then schedule **v0.3.9** public cutover under `CONFIRM_SWARM_0_3_9`.

## Invariants (do not weaken)

- Live beta stays Compose until cutover; keep rollback tag ≥ one release.
- `EQ-OPEN-*` stay OPEN; academic PRs stay split from infra.
- Deploy/ship workflows remain on GitHub-hosted (`ubuntu-latest`), never on
  `lenr-ci` with `VPS_*`.
- No production `terraform apply` / Swarm init without the matching confirm string.
