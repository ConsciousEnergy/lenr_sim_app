# v0.3.8-beta docs map (public vs team)

Audience split for release / ops communication. Prefer linking here over
duplicating long tables in the root README.

## Public / contributors

| Doc | Use when |
|-----|----------|
| Root [`README.md`](../../../README.md) | Product scope, how to run, what is not claimed |
| [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) | PR workflow, scientific honesty, confirm-string map |
| [`LENR_SIM_APP_v2/README.md`](../../README.md) | App-local setup + cutover table |
| [`.github/BRANCHING.md`](../../../.github/BRANCHING.md) | Trunk-based naming; self-hosted CI labels |

## Team / operators

| Doc | Use when |
|-----|----------|
| [`FULL_STACK_BUILD_UNLOCK.md`](FULL_STACK_BUILD_UNLOCK.md) | “Can we finish Swarm/Ansible/Traefik/Cloudflare?” — unlock checklist |
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
