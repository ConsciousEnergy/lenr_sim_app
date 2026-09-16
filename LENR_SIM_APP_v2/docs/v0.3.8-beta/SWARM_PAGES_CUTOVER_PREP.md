# v0.3.8-beta prep — Swarm + Cloudflare Pages cutover

**Status:** Prep/hardening for **v0.3.8-beta phase 1** (docs + gated code).  
**Do not** `terraform apply`, init Swarm, or move the public SPA to Cloudflare Pages
while Compose remains the public beta and WordPress.com still owns `conscious.energy` / `www` NS.

This document makes the existing IaC executable for the **next** minor beta once
DNS and HA needs justify leaving single-VPS Compose.

## Decision records (phase 1)

| Topic | Doc |
|-------|-----|
| DNS topology + Hostinger import-vs-new | [DNS_AND_HOSTINGER_DECISIONS.md](./DNS_AND_HOSTINGER_DECISIONS.md) |
| Remote Terraform state / staging workspace | [TERRAFORM_REMOTE_STATE.md](./TERRAFORM_REMOTE_STATE.md) |
| Compose rollback drill + staging checklist | [ROLLBACK_AND_STAGING_CHECKLIST.md](./ROLLBACK_AND_STAGING_CHECKLIST.md) |

## Why wait until 0.3.8

| Constraint | Impact |
|------------|--------|
| WordPress.com NS on apex/`www` | Pages/Swarm DNS modules must not steal marketing apex |
| Single shareable beta URL | Compose + Caddy same-origin is simpler and already documented |
| Operator familiarity | Finish VPS health/deploy/rollback drills before multi-node |

## Already in-repo (reuse, do not reinvent)

| Area | Path |
|------|------|
| Terraform (Pages / R2 / DNS / VPS) | [`../../infrastructure/terraform/`](../../infrastructure/terraform/) |
| Terraform modules | [`../../infrastructure/terraform/modules/cloudflare/`](../../infrastructure/terraform/modules/cloudflare/), [`../../infrastructure/terraform/modules/hostinger/`](../../infrastructure/terraform/modules/hostinger/) |
| Ansible (Swarm, Traefik, stack) | [`../../infrastructure/ansible/`](../../infrastructure/ansible/) |
| Ansible playbooks | `setup-docker.yml` (Swarm init + Traefik dirs), `deploy-stack.yml` (GHCR login + stack), `backup.yml`, `site.yml` |
| Traefik templates | [`../../infrastructure/ansible/templates/traefik.yml.j2`](../../infrastructure/ansible/templates/traefik.yml.j2), `traefik-dynamic.yml.j2`, `docker-stack.yml.j2` |
| Orchestration scripts | [`../../infrastructure/scripts/`](../../infrastructure/scripts/) (`deploy.sh`, `rollback.sh`, `backup-db.sh`) |
| Compose VPS path (live) | [`../../infrastructure/vps/`](../../infrastructure/vps/) |
| Step runbook | [`../PHASE4_DOCKER_SWARM_DEPLOYMENT.md`](../PHASE4_DOCKER_SWARM_DEPLOYMENT.md) |
| Architecture overview | [`../DEPLOYMENT.md`](../DEPLOYMENT.md), [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| Authority split | [`../../infrastructure/README.md`](../../infrastructure/README.md) — VPS Compose now; Swarm + Traefik + Pages later |

**Explicit non-action until cutover confirm:** no `terraform apply`, no `ansible-playbook` against prod, no Swarm init on the live VPS, no Pages project cutover.  
`infrastructure/scripts/deploy.sh` is **hard-gated** (`CONFIRM_SWARM_0_3_8=I_CUTOVER_0_3_8`) so a mistaken run cannot apply.

**Prep defaults (phase 1):**

- Ansible `app_version` / stack image tag and Terraform `pages_production_branch` default to **`0.3.8-beta`** / `lenr_sim_app_v0.3.8-beta`.
- Terraform `pages_hostname` defaults to **`app`** (never `@` / `www`).
- Terraform `hostinger_vps_mode` defaults to **`disabled`** (refuse blind create vs `185.211.4.66`).
- Terraform remote state: partial `backend "s3" {}` + `backend.hcl.example`.
- Ansible `deploy-stack.yml` logs into GHCR before `--with-registry-auth`.

**Traefik static vs dynamic:** `traefik.yml.j2` is static only (`--configFile`); middlewares live in `traefik-dynamic.yml.j2` under `providers.file.directory`. Do not put top-level `http:` in the static file (Traefik v3 rejects it). Backend router labels chain `security-headers@file` with the Docker-defined `backend-ratelimit`.

**Validate-only:** `terraform init -backend=false && terraform validate`; `ansible-playbook --syntax-check` for `deploy-stack.yml` / `site.yml`. Still **do not apply**.

## Cutover checklist (execute later — not phase 1 apply)

### Prerequisites

- [x] Marketing apex/`www` DNS strategy agreed (**keep WP**; Pages on `app.` only) — [DNS_AND_HOSTINGER_DECISIONS.md](./DNS_AND_HOSTINGER_DECISIONS.md)
- [ ] Cloudflare account + Pages project name reserved
- [ ] At least two Swarm-capable nodes (or documented single-node Swarm caveats)
- [x] Secrets mapped: GHCR pull (Ansible vault/env), Postgres, Traefik ACME email, Pages API token (docs + group_vars placeholders)
- [x] Rollback path documented + share health evidence; operator must complete live SSH rollback once — [ROLLBACK_AND_STAGING_CHECKLIST.md](./ROLLBACK_AND_STAGING_CHECKLIST.md)

### Dry-run (staging subdomain)

- [x] Remote state + staging workspace documented (plan-only) — [TERRAFORM_REMOTE_STATE.md](./TERRAFORM_REMOTE_STATE.md)
- [ ] Operator: `terraform plan` only against a **non-production** workspace (credentials on operator machine)
- [ ] Operator: Ansible check-mode / deploy to staging Swarm
- [ ] Traefik routes `api.<staging>` → backend replicas; Pages serves SPA
- [ ] CORS / same-site cookie / WebSocket behavior validated (split origin ≠ today’s same-origin)
- [ ] `/api/health` uptime check + deploy annotations

### Production cutover

- [ ] Announce maintenance window if DNS TTLs require
- [ ] Apply Terraform workspace for prod Pages + `api` A (proxied=false as required)
- [ ] Ansible Swarm + Traefik stack with rolling `update_config`
- [ ] Flip public hostname; watch health + error rate
- [ ] Keep VPS Compose artifacts tagged for emergency rollback for ≥ one release

### Observability (required for “see how others use it”)

- [ ] External uptime on `/api/health` (both Compose and Swarm eras)
- [ ] Privacy-gated PostHog key in **production Pages/SPA env only** after counsel opt-in
- [ ] Structured access logs on Traefik; no public `/metrics` without auth

## Phase-1 exit criteria (this PR)

- [x] DNS + Hostinger decisions written
- [x] Remote state / GHCR login prep in IaC (no prod apply)
- [x] Compose rollback drill checklist + live share health evidence
- [x] Hard gate still requires `CONFIRM_SWARM_0_3_8=I_CUTOVER_0_3_8`
