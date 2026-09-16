# Staging Swarm dry-run evidence (v0.3.8)

**Goal:** Complete non-prod Swarm/Pages prep without public cutover.  
**Live share:** Compose + Caddy on `lenr-sim-beta` remains authoritative.

## Confirm string

```bash
CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8 ./infrastructure/scripts/deploy.sh staging
```

Production path requires a different variable:

```bash
CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 ./infrastructure/scripts/deploy.sh production
```

## Agent-executed checks (this branch)

Re-verified **2026-09-16T18:28:12Z** on `consciousenergy/v038-fidelity-p0-98d8`:

| Check | Result |
|-------|--------|
| `deploy.sh production` (no confirm) | Exit **2** — requires `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9` |
| `deploy.sh staging` (no/wrong confirm) | Exit **2** — requires `I_STAGING_0_3_8` |
| `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8 ./deploy.sh staging` | Gate opens; then exits **1** for missing `terraform.tfvars` (expected without operator secrets) |
| `ansible-playbook --syntax-check` `deploy-stack.yml` | OK |
| `terraform init -backend=false` + `terraform validate` | **Success** (config valid; no credentials / no apply) |
| Remote Cloudflare/Hostinger `terraform plan` | **Not executed** — needs operator `backend.hcl` + cloud credentials |
| Ansible `--check` against staging inventory | **Not executed** — no staging hosts/credentials in agent |

## Operator remaining steps

1. On operator machine with Cloudflare/R2 credentials:
   - `terraform init -backend-config=backend.hcl`
   - `terraform workspace select staging`
   - `terraform plan -var-file=staging.tfvars` (plan only)
2. Provision or designate ≥2 Swarm nodes (or document single-node staging caveats).
   Do **not** promote the live Compose VPS to Swarm manager without a written migration plan.
3. `ansible-playbook --check --diff playbooks/deploy-stack.yml -i inventory.staging.yml`
4. Staging apply only under `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8`.
5. Validate Traefik `api.<staging>` → replicas; Pages/static SPA; CORS/WS.
6. Paste plan/check timestamps into release notes; keep Compose share URL unchanged.

## Single-node staging caveat

A one-node Swarm validates Traefik routing and stack deploy but does **not**
prove multi-node HA. Public cutover (0.3.9) requires ≥2 nodes or an explicit
accepted single-node risk sign-off.
