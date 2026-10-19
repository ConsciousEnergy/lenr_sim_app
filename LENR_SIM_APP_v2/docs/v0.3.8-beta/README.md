# v0.3.8-beta docs map (public vs team)

Audience split for release / ops communication. Prefer linking here over
duplicating long tables in the root README.

**Start here for version control + Swarm prep:**
[`VERSION_CONTROL.md`](VERSION_CONTROL.md).  
**ARA Oct 2026 workbench Wave 1:** [`ARA_OCT2026_WORKBENCH.md`](ARA_OCT2026_WORKBENCH.md).  
**Future UI locales (FR/ES/IT/JA/ZH/RU):** [`I18N_FUTURE.md`](I18N_FUTURE.md).

## Public / contributors

| Doc | Use when |
|-----|----------|
| Root [`README.md`](../../../README.md) | Product scope, how to run, what is not claimed |
| [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) | PR workflow, scientific honesty, confirm-string map |
| [`LENR_SIM_APP_v2/README.md`](../../README.md) | App-local setup + cutover table |
| [`.github/BRANCHING.md`](../../../.github/BRANCHING.md) | `main` (0.3.7) + `dev` (0.3.8); self-hosted CI labels |
| [`VERSION_CONTROL.md`](VERSION_CONTROL.md) | Implementation phases for Swarm/Ansible/Traefik/Cloudflare prep |
| [`ARA_OCT2026_WORKBENCH.md`](ARA_OCT2026_WORKBENCH.md) | Oct 14 ARA review → Wave 1 static models / schema / Schwinger |
| [`CMNS_MODEL_FIDELITY_RESPONSE.md`](CMNS_MODEL_FIDELITY_RESPONSE.md) | P0 fidelity map + Wave 1 pointer |

## Team / operators

| Doc | Use when |
|-----|----------|
| [`VERSION_CONTROL.md`](VERSION_CONTROL.md) | Branch trains + ordered 0.3.8 implementation phases |
| [`I18N_FUTURE.md`](I18N_FUTURE.md) | Planned translations (not a cutover blocker) |
| [`FULL_STACK_BUILD_UNLOCK.md`](FULL_STACK_BUILD_UNLOCK.md) | “Can we finish Swarm/Ansible/Traefik/Cloudflare?” — unlock checklist |
| [`TWO_KVM2_SWARM_TOPOLOGY.md`](TWO_KVM2_SWARM_TOPOLOGY.md) | **Start here to learn** — Mermaid maps, 2-VPS Swarm options, security, UMLENR/ARA |
| [`THREE_NODE_SWARM_TOPOLOGY.md`](THREE_NODE_SWARM_TOPOLOGY.md) | **2×KVM2 + 1×KVM1** — diagram SOT (physical / environments / containers + legends), storage, labels, gates |
| [`KVM1_OPERATOR_WALKTHROUGH.md`](KVM1_OPERATOR_WALKTHROUGH.md) | Manual Hostinger KVM1 order → staging → cutover join |
| [`OBSERVABILITY_GRAFANA.md`](OBSERVABILITY_GRAFANA.md) | Prometheus/Grafana placement + trust boundaries |
| [`SWARM_OPERATOR_LAB.md`](SWARM_OPERATOR_LAB.md) | Hands-on file walkthrough + CLI visualization + security checklist |
| [`../program/UMLENR_GOAL1_HUB_PACK/`](../program/UMLENR_GOAL1_HUB_PACK/README.md) | Portable Goal 1 pack for UMLENR hub PR (copy into `UMLENR`) |
| [`DUAL_KVM2_SWARM_READINESS.md`](DUAL_KVM2_SWARM_READINESS.md) | Dual-KVM2 inventory + component matrix |
| [`PR_AND_BRANCH_HYGIENE.md`](PR_AND_BRANCH_HYGIENE.md) | Open PR merge order; agents prepare, humans merge |
| [`STAGING_SWARM_DRY_RUN.md`](STAGING_SWARM_DRY_RUN.md) | Local/remote dry-run helper + evidence |
| [`DNS_AND_HOSTINGER_DECISIONS.md`](DNS_AND_HOSTINGER_DECISIONS.md) | Apex/WP vs `app.`/`api.` topology |
| [`COMPOSE_SHIP_HANDOFF.md`](COMPOSE_SHIP_HANDOFF.md) | Ship tip of `main` to Compose share |
| [`ROLLBACK_AND_STAGING_CHECKLIST.md`](ROLLBACK_AND_STAGING_CHECKLIST.md) | Rollback + staging gates |
| [`../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`](../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md) | Production cutover only under `CONFIRM_SWARM_0_3_9` |
| Root [`AGENTS.md`](../../../AGENTS.md) | Agent current-truth map |

## Communication norms

- **Merges:** explicit operator ask in GitHub/PR (or a clear “merge #N” message). Slack context alone is not authorization.
- **Secrets:** never in chat, commits, PR bodies, or Slack — use GitHub Actions secrets / untracked `*.tfvars` / `inventory.staging.yml`.
- **Academic vs infra:** keep Theory Paper / ledger PRs off the CI/ops train.
- **Confirm strings:** quote the exact env var; do not paraphrase gates.
