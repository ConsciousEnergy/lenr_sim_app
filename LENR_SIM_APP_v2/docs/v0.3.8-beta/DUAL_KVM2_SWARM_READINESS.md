# Dual KVM2 ≠ production Swarm cutover (readiness audit)

**Date:** 2026-09-26  
**Question:** Now that both Hostinger KVM2s exist, can we complete the full
build with Docker Swarm, Ansible, Traefik, and Cloudflare?

**Short answer:** **Not yet for public cutover.** Dual KVM2s unlock **Compose
share + isolated CI**. Full Swarm + Traefik + Cloudflare Pages remains a
**gated v0.3.8 staging / v0.3.9 production** path. Do **not** set
`CONFIRM_SWARM_0_3_9` without an announced window and live credentials.

## What we have now

| VM | Id | IP | Role **today** |
|----|----|----|----------------|
| Compose share / beta | `1280333` | `185.211.4.66` | Production-like **Compose + Caddy** (`lenr-sim-beta`, `0.3.7-beta`) |
| Dedicated CI | `2012566` | `45.93.100.251` | **GitHub Actions only** (`lenr-ci-1`, labels `self-hosted,linux,x64,lenr-ci`) |

Evidence CI is landable: dedicated runner online; merge
[#218](https://github.com/ConsciousEnergy/lenr_sim_app/pull/218) for the
canonical `SELF_HOSTED_RUNNER.md` + smoke refuse-share gate on `main`.

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

## Recommended next milestones (ordered)

1. **Merge dedicated CI docs/PR (#218)** so all subsequent rebases see green `lenr-ci`.
2. **Operator staging remote dry-run** (plan/check only):
   ```bash
   CONFIRM=I_STAGING_0_3_8 EXECUTE=1 \
     ./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh remote
   ```
   Requires untracked `backend.hcl`, `staging.tfvars`, `inventory.staging.yml`.
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
