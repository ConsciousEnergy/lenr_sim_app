# v0.3.8-beta prep — Swarm + Cloudflare Pages cutover

**Status:** Preparation only during **v0.3.7-beta**.  
**Do not** `terraform apply`, init Swarm, or move the public SPA to Cloudflare Pages
while v0.3.7 is the shared beta and WordPress.com still owns `conscious.energy` / `www` NS.

This document makes the existing IaC executable for the **next** minor beta once
DNS and HA needs justify leaving single-VPS Compose.

## Why wait until 0.3.8

| Constraint | Impact |
|------------|--------|
| WordPress.com NS on apex/`www` | Pages/Swarm DNS modules conflict with marketing site |
| Single shareable beta URL | Compose + Caddy same-origin is simpler and already documented |
| Operator familiarity | Finish VPS health/deploy/rollback drills before multi-node |

## Already in-repo (reuse, do not reinvent)

| Area | Path |
|------|------|
| Terraform (Pages / R2 / DNS / VPS) | [`../../infrastructure/terraform/`](../../infrastructure/terraform/) |
| Terraform modules | [`../../infrastructure/terraform/modules/cloudflare/`](../../infrastructure/terraform/modules/cloudflare/), [`../../infrastructure/terraform/modules/hostinger/`](../../infrastructure/terraform/modules/hostinger/) |
| Ansible (Swarm, Traefik, stack) | [`../../infrastructure/ansible/`](../../infrastructure/ansible/) |
| Ansible playbooks | `setup-docker.yml` (Swarm init + Traefik dirs), `deploy-stack.yml`, `backup.yml`, `site.yml` |
| Traefik templates | [`../../infrastructure/ansible/templates/traefik.yml.j2`](../../infrastructure/ansible/templates/traefik.yml.j2), `traefik-dynamic.yml.j2`, `docker-stack.yml.j2` |
| Orchestration scripts | [`../../infrastructure/scripts/`](../../infrastructure/scripts/) (`deploy.sh`, `rollback.sh`, `backup-db.sh`) |
| Step runbook | [`../PHASE4_DOCKER_SWARM_DEPLOYMENT.md`](../PHASE4_DOCKER_SWARM_DEPLOYMENT.md) |
| Architecture overview | [`../DEPLOYMENT.md`](../DEPLOYMENT.md), [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| Authority split | [`../../infrastructure/README.md`](../../infrastructure/README.md) — VPS Compose now; Swarm + Traefik + Pages later |

**Explicit non-action in 0.3.7:** no `terraform apply`, no `ansible-playbook` against prod, no Swarm init on the live VPS, no Pages project cutover.

**Traefik static vs dynamic:** `traefik.yml.j2` is static only (`--configFile`); middlewares live in `traefik-dynamic.yml.j2` under `providers.file.directory`. Do not put top-level `http:` in the static file (Traefik v3 rejects it). Backend router labels chain `security-headers@file` with the Docker-defined `backend-ratelimit`.

**Prep defaults (placeholders only):** Ansible `app_version` / stack image tag and Terraform `pages_production_branch` default to **`0.3.8-beta`** / `lenr_sim_app_v0.3.8-beta` so a mistaken 0.3.7 apply cannot silently target the live 0.3.6/0.3.7 Compose tag. Still do not apply.

## Cutover checklist (execute in 0.3.8, not now)

### Prerequisites

- [ ] Marketing apex/`www` DNS strategy agreed (keep WP **or** migrate NS) — no surprise CNAME-to-apex on API/SPA hosts
- [ ] Cloudflare account + Pages project name reserved
- [ ] At least two Swarm-capable nodes (or documented single-node Swarm caveats)
- [ ] Secrets mapped: GHCR pull, Postgres, Traefik ACME email, Pages API token
- [ ] Rollback path tested: restore Compose stack on current VPS within RTO target

### Dry-run (staging subdomain)

- [ ] `terraform plan` only against a **non-production** workspace
- [ ] Ansible check-mode / deploy to staging Swarm
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

## 0.3.7 exit criteria before starting 0.3.8 cutover

- [ ] Science stack (#185–#188) on `main`
- [ ] VPS branch rebased onto `main` and healthy public URL
- [ ] PostHog provider gate shipped (no false console warning)
- [ ] This checklist reviewed in release notes for 0.3.8-beta
