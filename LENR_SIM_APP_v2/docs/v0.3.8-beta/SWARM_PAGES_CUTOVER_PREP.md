# v0.3.8-beta prep — Swarm + Cloudflare Pages (staging dry-run)

**Status:** Prep/hardening + **staging dry-run** for v0.3.8.  
**Public share stays Compose** until **v0.3.9-beta** under `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9`.

Do not move the public SPA to Cloudflare Pages or init Swarm on the live Compose
box while WordPress.com still owns `conscious.energy` / `www` NS — and do not
treat staging confirm as production cutover.

## Confirm gates (dual)

| Path | Env | Required string |
|------|-----|-----------------|
| Staging Swarm dry-run (0.3.8) | `CONFIRM_SWARM_0_3_8` | `I_STAGING_0_3_8` (legacy `I_CUTOVER_0_3_8` still accepted for staging-only experiments) |
| **Production** multi-node cutover (0.3.9) | `CONFIRM_SWARM_0_3_9` | `I_CUTOVER_0_3_9` |

`infrastructure/scripts/deploy.sh` enforces the above. A mistaken production run
without `CONFIRM_SWARM_0_3_9` exits before Terraform/Ansible apply.

## Decision records

| Topic | Doc |
|-------|-----|
| DNS topology + Hostinger import-vs-new | [DNS_AND_HOSTINGER_DECISIONS.md](./DNS_AND_HOSTINGER_DECISIONS.md) |
| Remote Terraform state / staging workspace | [TERRAFORM_REMOTE_STATE.md](./TERRAFORM_REMOTE_STATE.md) |
| Compose rollback drill + staging checklist | [ROLLBACK_AND_STAGING_CHECKLIST.md](./ROLLBACK_AND_STAGING_CHECKLIST.md) |
| Staging dry-run evidence (this release) | [STAGING_SWARM_DRY_RUN.md](./STAGING_SWARM_DRY_RUN.md) |

## Why public cutover waits until 0.3.9

| Constraint | Impact |
|------------|--------|
| WordPress.com NS on apex/`www` | Pages/Swarm DNS modules must not steal marketing apex |
| Single shareable beta URL | Compose + Caddy same-origin remains the live path in 0.3.8 |
| Operator familiarity | Finish staging plan/check + Compose rollback before multi-node |

## Already in-repo (reuse, do not reinvent)

| Area | Path |
|------|------|
| Terraform (Pages / R2 / DNS / VPS) | [`../../infrastructure/terraform/`](../../infrastructure/terraform/) |
| Ansible (Swarm, Traefik, stack) | [`../../infrastructure/ansible/`](../../infrastructure/ansible/) |
| Orchestration scripts | [`../../infrastructure/scripts/`](../../infrastructure/scripts/) |
| Compose VPS path (live) | [`../../infrastructure/vps/`](../../infrastructure/vps/) |

**Prep defaults:**

- Ansible / Terraform version tags default toward **`0.3.8-beta`** for staging experiments; production image tag bump is a **0.3.9** release-gate item.
- Terraform `pages_hostname` defaults to **`app`** (never `@` / `www`).
- Terraform `hostinger_vps_mode` defaults to **`disabled`**.
- Traefik static vs dynamic split: middlewares only in `traefik-dynamic.yml.j2`.

## Staging dry-run checklist (0.3.8)

- [x] Remote state + staging workspace documented
- [x] Deploy script dual-gate (`I_STAGING_0_3_8` vs `I_CUTOVER_0_3_9`)
- [x] Ansible `--syntax-check` evidence recorded (see STAGING_SWARM_DRY_RUN.md)
- [ ] Operator: `terraform plan` against **staging** workspace (credentials on operator machine)
- [ ] Operator: Ansible `--check` then staging apply under `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8`
- [ ] Traefik `api.<staging>` → backend replicas; Pages/static SPA on staging host
- [ ] CORS / WS split-origin validated
- [ ] Live share remains Compose (`lenr-sim-beta`)

## Production cutover checklist (0.3.9 only)

See [../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md](../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md).

Requires `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9`, multi-node Swarm, Pages on `app.`,
`api.` A `proxied=false`, Hostinger import/existing only.

## Phase exit (0.3.8 infra)

- [x] DNS + Hostinger decisions written
- [x] Remote state / GHCR login prep in IaC (no prod apply)
- [x] Compose rollback drill checklist + share health evidence
- [x] Staging confirm string documented; **production** hard gate is `CONFIRM_SWARM_0_3_9`
