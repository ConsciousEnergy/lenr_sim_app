# v0.3.9-beta — public Swarm + Pages cutover gate

**Target:** Public community share path cuts over to multi-node Docker Swarm +
Traefik (+ Cloudflare Pages SPA host), replacing single-VPS Compose+Caddy as the
primary share URL.

**This is a separate train from v0.3.8 staging.** Do not mix
`CONFIRM_SWARM_0_3_8` (staging / KVM1 only) with this cutover. Topology SOT:
[`../v0.3.8-beta/THREE_NODE_SWARM_TOPOLOGY.md`](../v0.3.8-beta/THREE_NODE_SWARM_TOPOLOGY.md).

**Hard gate:**

```bash
CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 EXECUTE=1 \
  ./infrastructure/scripts/swarm-039-cutover.sh
```

`deploy.sh production` with the same confirm **delegates** to
`swarm-039-cutover.sh` (drain / leave staging / import Compose `.env` secrets /
join worker). Do not use a bare Terraform+Ansible production path against the
live share — it would mint a random DB password and skip Compose drain.

Do not weaken the confirm string. Staging experiments continue to use
`CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8` only.

Prod inventory (required by the executor):

| File | Source example |
|------|----------------|
| `infrastructure/ansible/inventory.yml` | `inventory.yml.example` |

## Prerequisites before the window

1. Staging barcode green ([`STAGING_SWARM_DRY_RUN.md`](../v0.3.8-beta/STAGING_SWARM_DRY_RUN.md)).
2. Compose rollback rehearsed once on live share
   ([`ROLLBACK_AND_STAGING_CHECKLIST.md`](../v0.3.8-beta/ROLLBACK_AND_STAGING_CHECKLIST.md)).
3. Node label contract understood: `app=true` / `observability=true`
   ([`join-workers.yml`](../../infrastructure/ansible/playbooks/join-workers.yml)).
4. Announced maintenance window; DNS TTLs lowered if needed.
5. Version markers prepared for `0.3.9-beta` (release-quality-gate).
6. Read-only prep script green:
   `./infrastructure/scripts/swarm-039-cutover-prep.sh`
   (checks share health, staging TLS/DNS, GHCR env, prod inventory; never arms confirm).
7. Full readiness barcode (prep + topology + version markers):
   `./infrastructure/scripts/swarm-039-readiness-barcode.sh`
8. Prod inventory copied from
   [`inventory.yml.example`](../../infrastructure/ansible/inventory.yml.example)
   (share manager + KVM1 worker; no CI node).

## Cutover sequence

**Preferred executor** (dry-run by default; never auto-sets confirm):

```bash
# Plan + prep only:
./LENR_SIM_APP_v2/infrastructure/scripts/swarm-039-cutover.sh

# Live (human-armed confirm + EXECUTE=1). Prefer GHCR; or LOCAL_IMAGES=1 to
# docker build on the share manager when registry auth is unavailable.
# ALLOW_API_DNS_GAP=1: accept https://lenr-sim-beta…/api/health when WordPress
# A api is still parking (Traefik traefik_extra_api_hosts on the share manager).
CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 EXECUTE=1 LOCAL_IMAGES=1 \
  ALLOW_STAGING_DNS_GAP=1 ALLOW_API_DNS_GAP=1 SKIP_IMAGE_BUILD=1 \
  ./LENR_SIM_APP_v2/infrastructure/scripts/swarm-039-cutover.sh
```

`SKIP_IMAGE_BUILD=1` reuses prebuilt
`ghcr.io/consciousenergy/lenr-sim-backend:<tag>` and
`…/lenr-sim-frontend:<tag>` on the share manager (omit it to force a fresh
`docker build`). With `LOCAL_IMAGES=1`, the executor then `docker save|load`s
both tags onto KVM1 and deploys with `--resolve-image never`.

Preferred at the window: WordPress.com `A api → <share IP>` for
`https://api.conscious.energy/api/health`. Until that record exists, prod inventory
must list `traefik_extra_api_hosts: [lenr-sim-beta.conscious.energy]` and the
executor may pass `ALLOW_API_DNS_GAP=1`. Compose drain uses
`drain-compose-share.yml` (`CONFIRM_DRAIN_COMPOSE=I_DRAIN_COMPOSE_FOR_SWARM`).
Compose and Swarm both name the DB volume `lenr-sim_postgres_data` (project/stack
`lenr-sim` + `postgres_data`); drain keeps volumes so Swarm reuses that data.
Named volumes are **node-local**: prod inventory labels the share manager
`postgres=true`, and the stack constrains Postgres to
`node.role == manager` **and** `node.labels.postgres == true` when
`postgres_volume_external` is set (so the task cannot land on KVM1).
After `swarm init`, the executor imports `LENR_DB_PASSWORD` / `LENR_SECRET_KEY`
from `/opt/lenr-sim/.env` into Docker secrets **before** `deploy-stack.yml` so
Ansible does not mint a new random DB password against the existing volume.
`setup-docker.yml` advertises `ansible_host` and opens UFW Swarm ports
(`2377/tcp`, `7946/tcp+udp`, `4789/udp`) so KVM1 can join.

Manual checklist (same order as the script):

1. Version bump to `0.3.9-beta` across four version surfaces; run
   release-quality-gate.
2. Maintenance window open.
3. WordPress.com DNS (apex NS): `A api → <share/Swarm VIP>`; keep
   `lenr-sim-beta` for Compose rollback. Staging used `A api-staging → KVM1`.
   ([DNS_AND_HOSTINGER_DECISIONS.md](../v0.3.8-beta/DNS_AND_HOSTINGER_DECISIONS.md)).
4. Promote **share** (`185.211.4.66`) to Swarm manager; leave CI
   (`45.93.100.251`) forever outside the cluster.
5. On KVM1: leave staging Swarm
   (`playbooks/leave-staging-swarm.yml` + `CONFIRM_LEAVE_STAGING=I_LEAVE_STAGING`),
   then join as **worker**; labels via `join-workers.yml`
   (`app=true` + `observability=true`).
6. Ansible Traefik stack; GHCR auth; rolling update
   (`require_app_label=true`, `require_observability_label=true` in prod).
7. Flip public share hostname(s); watch `/api/health` + error rate + Grafana.
8. Keep Compose artifacts + rollback tag for ≥ one release; document RTO.

## Status on this train

| Item | State |
|------|-------|
| Confirm gate in `deploy.sh` | Implemented |
| Staging path uses staging inventory/tfvars | Implemented (0.3.8 tooling); KVM1 Swarm live (sslip) |
| Swarm SPA on share host | `swarm_frontend_enabled` + `traefik_spa_hosts` + API `PathPrefix(/api)` |
| Version markers | `0.3.9-beta` on this train (four surfaces + ansible `app_version`) |
| Cloudflare Pages (`app.`) | Optional later; same-origin Traefik SPA unblocks cutover without CF apply |
| Operator production apply | **Blocked** until human sets `CONFIRM_SWARM_0_3_9` with live credentials |
| Compose retained for rollback | Required |
| Manager raft quorum (≥3 managers) | **Out of scope** for this cutover |

EQ-OPEN-* remain OPEN; fidelity work does not authorize theory endorsement.
Agents must not set `CONFIRM_SWARM_0_3_9` without an explicit human ask.
