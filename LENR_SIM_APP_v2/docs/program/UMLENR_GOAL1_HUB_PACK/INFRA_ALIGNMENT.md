# Infrastructure alignment (hub → LENR-Sim reference)

LENR-Sim owns the **working** Docker Swarm + Ansible + Traefik + Terraform +
Cloudflare stack. UMLENR documents the program and **links** those runbooks.
Do not fork conflicting inventories or confirm strings into UMLENR.

## Reference docs (in `lenr_sim_app`)

| Topic | Path |
|-------|------|
| Two-KVM2 topology + Mermaid | `LENR_SIM_APP_v2/docs/v0.3.8-beta/TWO_KVM2_SWARM_TOPOLOGY.md` |
| Hands-on operator lab | `LENR_SIM_APP_v2/docs/v0.3.8-beta/SWARM_OPERATOR_LAB.md` |
| Unlock checklist | `LENR_SIM_APP_v2/docs/v0.3.8-beta/FULL_STACK_BUILD_UNLOCK.md` |
| Dual-KVM2 readiness | `LENR_SIM_APP_v2/docs/v0.3.8-beta/DUAL_KVM2_SWARM_READINESS.md` |
| Staging dry-run | `LENR_SIM_APP_v2/docs/v0.3.8-beta/STAGING_SWARM_DRY_RUN.md` |
| DNS decisions | `LENR_SIM_APP_v2/docs/v0.3.8-beta/DNS_AND_HOSTINGER_DECISIONS.md` |
| Public cutover | `LENR_SIM_APP_v2/docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md` |
| IaC tree | `LENR_SIM_APP_v2/infrastructure/{ansible,terraform,scripts}/` |

## Confirm strings (do not paraphrase)

| Stage | Env |
|-------|-----|
| Staging Swarm | `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8` |
| Public Swarm + Pages | `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9` |

## Two-VPS budget (current Hostinger truth)

| Role | VM | IP |
|------|----|----|
| Compose share / future single-node Swarm manager | `1280333` | `185.211.4.66` |
| Dedicated CI (`lenr-ci-1`) — never Swarm | `2012566` | `45.93.100.251` |

Hub docs should repeat this table only as a **pointer**; inventory audits stay
in `lenr_sim_app` ops PRs.

## Alignment rule for future children

When Proteus or conscious.energy Astro need hosting:

1. Prefer Cloudflare Pages for static frontends.
2. Prefer LENR-Sim Traefik patterns for any API edge.
3. Never attach GitHub Actions runners that execute untrusted PR code to hosts
   holding production volumes or DAQ credentials.
