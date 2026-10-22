# Staging Swarm dry-run evidence (v0.3.8)

**Goal:** Complete non-prod Swarm/Pages prep without public cutover.  
**Live share:** Compose + Caddy on `lenr-sim-beta` remains authoritative.  
**Topology / gates:** [`THREE_NODE_SWARM_TOPOLOGY.md`](THREE_NODE_SWARM_TOPOLOGY.md)
(Phased rollout — Phase 1 only under staging confirm; no public Swarm;
`EQ-OPEN-*` stay OPEN).

## Confirm string

```bash
CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8 ./infrastructure/scripts/deploy.sh staging
```

`deploy.sh staging` requires **staging** credentials only:

| File | Source example |
|------|----------------|
| `infrastructure/ansible/inventory.staging.yml` | `inventory.staging.yml.example` |
| `infrastructure/terraform/staging.tfvars` | `staging.tfvars.example` |
| `infrastructure/terraform/backend.hcl` | `backend.hcl.example` (optional for remote state) |

Do **not** point staging apply at prod `inventory.yml` / `terraform.tfvars`.

Production path requires a different variable (**do not set from staging docs PRs**):

```bash
CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 ./infrastructure/scripts/deploy.sh production
```

## Agent-executed checks (this branch)

Local helper (CI `staging-swarm-dry-run` job in `.github/workflows/test.yml`):

```bash
./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh local
```

| Check | Result |
|-------|--------|
| `deploy.sh production` (no confirm) | Exit **2** — requires `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9` |
| `deploy.sh staging` (no/wrong confirm) | Exit **2** — requires `I_STAGING_0_3_8` |
| `ansible-playbook --syntax-check` `setup-docker` / `join-workers` / `deploy-stack` / `site` | OK (uses `inventory.staging.yml.example` when real inventory absent) |
| Prod inventory syntax-check + stack render | Renders `docker-stack.yml.j2` from `inventory.yml.example`; asserts `postgres=true` pin, external `lenr-sim_postgres_data`, SPA `PathPrefix(/api)` + `lenr-sim-beta` host; refuses CI IP in inventory |
| `terraform init -backend=false` + `terraform validate` | **Success** (config valid; no credentials / no apply) |
| CI `staging-swarm-dry-run` job | Runs the local helper on infra path changes |
| Remote Cloudflare/Hostinger `terraform plan` | **Operator** — needs `backend.hcl` + `staging.tfvars` |
| Ansible `--check` against staging inventory | **Operator** — needs `inventory.staging.yml` + SSH to KVM1 |
| Swarm apply / public cutover | **Not** performed by agents without explicit ask |

Operator unlock for remote plan/check: [`FULL_STACK_BUILD_UNLOCK.md`](FULL_STACK_BUILD_UNLOCK.md).

## Operator remaining steps — remote dry-run (B1)

Preferred helper (credentials on operator/agent machine, **plan + check only**):

```bash
# Place (untracked) from examples:
#   infrastructure/terraform/backend.hcl          ← backend.hcl.example
#   infrastructure/terraform/staging.tfvars       ← staging.tfvars.example
#   infrastructure/ansible/inventory.staging.yml  ← inventory.staging.yml.example
#   (manager IP = KVM1 31.220.55.113 — never CI / never blind share promote)
CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8 EXECUTE=1 \
  ./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh remote
```

Legacy alias `CONFIRM=I_STAGING_0_3_8` is still accepted by the helper.

**Exit criteria (B1):** terraform plan succeeds; ansible `--check` shows expected
Traefik/stack changes; SSH target is KVM1 only; Compose share URL unchanged.

## Staging apply (B2) — human-gated

Only after B1 green and explicit operator intent:

```bash
CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8 \
  ./LENR_SIM_APP_v2/infrastructure/scripts/deploy.sh staging
```

This runs Terraform workspace `staging`, `setup-docker.yml`,
`join-workers.yml` (join + `swarm_node_labels`), then `deploy-stack.yml`.

### Validation barcode (must all pass)

Paste timestamps into release notes when green. Keep Compose share URL unchanged.

**Recorded (agent, 2026-10-22 UTC):** sslip bootstrap **200**; stack 7/7
(`backend`, `postgres`, `traefik`, `prometheus`, `grafana`, `blackbox`,
`node-exporter`); Compose share **200**; WordPress `api-staging` still parking
(ALLOW_STAGING_DNS_GAP). Pages CORS / WS against canonical `api-staging` still
open until WP DNS flips.

| # | Check | Command / proof |
|---|--------|-----------------|
| 1 | Traefik TLS + health on staging API | `curl -sS -o /dev/null -w '%{http_code}' https://api-staging.conscious.energy/api/health` → `200` |
| 1a | TLS bootstrap (while WP DNS lags) | Apex NS is WordPress.com — until `api-staging` A → KVM1, prove ACME with `https://api-staging.31.220.55.113.sslip.io/api/health` → `200` (`traefik_acme_bootstrap_host` in inventory). Remove bootstrap host after WP DNS flips. **Green on sslip.** |
| 2 | API replicas scheduled | `ssh kvm1 'docker service ls'` — backend replicas ≥ 1 — **1/1** |
| 3 | Postgres on manager only | `ssh kvm1 'docker service ps <stack>_postgres'` — node = manager |
| 4 | Pages CORS against staging origin | Browser or curl preflight from `app-staging` origin succeeds |
| 5 | WebSocket path (if used) | Live-stream / WS upgrade against `api-staging` (DNS-only, not orange-cloud) |
| 6 | Compose share still healthy | `curl -sS https://lenr-sim-beta.conscious.energy/api/health` → `200` — **green** |
| 7 | Backup playbook dry-run | `ansible-playbook --check -i inventory.staging.yml playbooks/backup.yml` |
| 8 | Observability (optional B3) | `docker service ls \| grep -E 'prometheus\|grafana\|blackbox'` when `observability_enabled=true`; Grafana **not** public without auth — **prometheus/grafana/blackbox/node-exporter 1/1** |

**Operator DNS (required for barcode #1):** WordPress.com DNS panel → create
`A api-staging 31.220.55.113` (leave `@`/`www` alone). See
[`DNS_AND_HOSTINGER_DECISIONS.md`](DNS_AND_HOSTINGER_DECISIONS.md).

**Forbidden:** Swarm init on share `185.211.4.66`; `VPS_*` on `lenr-ci`;
`CONFIRM_SWARM_0_3_9`; closing `EQ-OPEN-*`.

## Single-node staging caveat

A one-node Swarm validates Traefik routing and stack deploy but does **not**
prove multi-node HA. Public cutover (0.3.9) requires ≥2 nodes or an explicit
accepted single-node risk sign-off. See
[`THREE_NODE_SWARM_TOPOLOGY.md`](THREE_NODE_SWARM_TOPOLOGY.md).

## Related

- Join + labels: [`../../infrastructure/ansible/playbooks/join-workers.yml`](../../infrastructure/ansible/playbooks/join-workers.yml)
- Observability: [`OBSERVABILITY_GRAFANA.md`](OBSERVABILITY_GRAFANA.md)
- Public cutover (separate train): [`../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`](../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md)
