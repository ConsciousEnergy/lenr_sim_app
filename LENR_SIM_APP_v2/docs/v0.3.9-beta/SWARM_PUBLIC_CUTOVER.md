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
   Keep `/opt/lenr-sim/.rollback-image-tag` equal to live Compose `IMAGE_TAG`
   (prep refuses otherwise unless `ALLOW_ROLLBACK_TAG_GAP=1`).
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
9. CI/local stack render gate green (also runs inside cutover prep / barcode):
   `./infrastructure/scripts/swarm-039-assert-prod-stack-render.sh`
   or `./infrastructure/scripts/staging-swarm-dry-run.sh local`
   (asserts rendered `docker-stack.yml.j2` has `node.labels.postgres == true`,
   external `lenr-sim_postgres_data`, SPA `PathPrefix(/api)` on
   `lenr-sim-beta.conscious.energy`, and Traefik ACME bind
   `/opt/lenr-sim/traefik/certs` → `/certs/acme.json`).

## Cutover sequence

**Preferred executor** (dry-run by default; never auto-sets confirm):

```bash
# Plan + prep only:
./LENR_SIM_APP_v2/infrastructure/scripts/swarm-039-cutover.sh

# Live (human-armed confirm + EXECUTE=1). Prefer GHCR; or LOCAL_IMAGES=1 to
# docker build on the share manager when registry auth is unavailable.
# ALLOW_API_DNS_GAP=1: accept https://lenr-sim-beta…/api/health when WordPress
# A api is still parking (Traefik traefik_extra_api_hosts on the share manager).
# Prefer prestaging images first so the drain window stays short:
#   EXECUTE=1 ./infrastructure/scripts/swarm-039-prestage-images.sh
CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 EXECUTE=1 LOCAL_IMAGES=1 \
  ALLOW_STAGING_DNS_GAP=1 ALLOW_API_DNS_GAP=1 SKIP_IMAGE_BUILD=1 \
  ./LENR_SIM_APP_v2/infrastructure/scripts/swarm-039-cutover.sh
```

`SKIP_IMAGE_BUILD=1` reuses prebuilt
`ghcr.io/consciousenergy/lenr-sim-backend:<tag>` and
`…/lenr-sim-frontend:<tag>` on the share manager (omit it to force a fresh
`docker build`). With `LOCAL_IMAGES=1`, the executor builds/loads **before**
Compose drain (Compose stays up during the long step), then
`docker save|load`s onto KVM1 and deploys with `--resolve-image never`.
After drain, cutover refuses to continue if host `:80`/`:443` are still bound.

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
Cutover prep probes KVM1→share TCP `2377`/`7946` with short-lived listeners
(nothing listens until `swarm init`; set `SKIP_SWARM_PORT_PROBE=1` to skip).

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
   Re-run evidence anytime:
   `ALLOW_API_DNS_GAP=1 ./infrastructure/scripts/swarm-039-post-cutover-verify.sh`
8. Keep Compose artifacts + rollback tag for ≥ one release; document RTO.
   Mid-window abort / failed verify → restore Compose (keeps volumes):

```bash
CONFIRM_RESTORE_COMPOSE=I_RESTORE_COMPOSE_AFTER_SWARM \
  CONFIRM_LEAVE_SWARM=I_LEAVE_SWARM_FOR_COMPOSE \
  ./LENR_SIM_APP_v2/infrastructure/scripts/swarm-039-restore-compose.sh
```

`CONFIRM_LEAVE_SWARM` also force-leaves KVM1 if it is still an orphaned
worker after the share manager is torn down (set `SKIP_KVM1_LEAVE=1` to skip).


## Status on this train

| Item | State |
|------|-------|
| Confirm gate in `deploy.sh` | Implemented |
| Staging path uses staging inventory/tfvars | Implemented (0.3.8 tooling); KVM1 Swarm live (sslip) |
| Swarm SPA on share host | `swarm_frontend_enabled` + `traefik_spa_hosts` + API `PathPrefix(/api)` |
| Traefik ACME persist | `deploy-stack.yml` creates `/opt/lenr-sim/traefik/certs` + `acme.json` (`0700`/`0600`) before stack deploy |
| Version markers | `0.3.9-beta` on this train (four surfaces + ansible `app_version`) |
| Cloudflare Pages (`app.`) | Optional later; same-origin Traefik SPA unblocks cutover without CF apply |
| Operator production apply | **Blocked** until human sets `CONFIRM_SWARM_0_3_9` with live credentials |
| Compose retained for rollback | Required |
| Manager raft quorum (≥3 managers) | **Out of scope** for this cutover |

EQ-OPEN-* remain OPEN; fidelity work does not authorize theory endorsement.
Agents must not set `CONFIRM_SWARM_0_3_9` without an explicit human ask.
