# Single-VPS public beta (Caddy + Compose)

Same-origin stack. Intended public URL: `https://lenr-simp-app.conscious.energy`.
Terraform/Ansible/Swarm under `infrastructure/ansible` and
`infrastructure/terraform` remain the multi-node path; do not run them for this beta.

## DNS (WordPress.com)

Apex NS stay on WordPress.com. Leave `@` and `www` alone.

A **CNAME to `conscious.energy`** is WordPress.com mapping the subdomain onto
the marketing site. Let's Encrypt then sees `WP.com` and the VPS never receives
the browser. Use an **A record to this VPS**, or a CNAME to the VPS hostname.

| Type | Name | Value | Notes |
|---|---|---|---|
| A | `lenr-simp-app` | `185.211.4.66` | intended public name (replace the CNAME-to-apex) |
| AAAA (optional) | `lenr-simp-app` | `2a02:4780:10:fc6a::1` | |
| A | `lenr-sim-beta` | `185.211.4.66` | already live; used for TLS until `lenr-simp-app` points here |

Site hostnames are configured as a **literal comma-separated line in
`Caddyfile`** (Caddy cannot split multi-host values from env). After
`lenr-simp-app` is an A record (or CNAME to `srv1280333.hstgr.cloud`), add
`lenr-simp-app.conscious.energy` to that Caddyfile site line and recreate Caddy.

## Layout

| Path | Role |
|---|---|
| `docker-compose.prod.yml` | caddy, frontend, backend, postgres, migrate (profile) |
| `Caddyfile` | TLS, `/api*` -> FastAPI (incl. WebSockets), `/*` -> nginx SPA |
| `.env.production.example` | copied to `/opt/lenr-sim/.env` (mode 0600) |
| `scripts/bootstrap-host.sh` | SSH harden, UFW, fail2ban, swap, docker logs, backup cron |
| `scripts/deploy.sh` | pull/build, alembic, up, health (+ share probe); CI pins checkout to workflow SHA and forces `IMAGE_TAG=$APP_VERSION` |
| `scripts/check-merge-train.sh` | operator preflight: PR stack, tip==preview, ancestry, tip Test green |
| `scripts/dry-run-merge-train.sh` | throwaway FF merge #185→#189 onto `main` + VPS rebase simulation (no push) |
| `scripts/merge-train-execute.sh` | human-gated squash #185→#189 (`CONFIRM=I_MERGE_STACK_0_3_7 EXECUTE=1`) |
| `scripts/post-merge-vps-ship.sh` | post-merge plan/check/verify; ship only with `CONFIRM=I_SHIP_VPS_0_3_7 EXECUTE=1` |
| `scripts/verify-beta-share.sh` | public DNS/TLS/`/api/health` probe (`EXPECT_VERSION`, retries) |
| `scripts/rollback.sh` | redeploy previous `IMAGE_TAG` |
| `scripts/backup-db.sh` | `pg_dump` -> `/opt/lenr-sim/backups` (14 days) |
| `scripts/hydrate-demo.sh` | seed + `--hydrate-demo` |

## First boot

1. DNS: `A lenr-simp-app.conscious.energy -> 185.211.4.66` (not a CNAME to apex).
2. `./LENR_SIM_APP_v2/infrastructure/vps/scripts/bootstrap-host.sh` as root (install a deploy key first).
3. Clone this monorepo to `/opt/lenr-sim/src`, copy
   `LENR_SIM_APP_v2/infrastructure/vps/.env.production.example` to `/opt/lenr-sim/.env`, fill `CHANGE_ME`.
4. From `/opt/lenr-sim/src`:
   `BUILD_LOCALLY=1 LENR_ENV_FILE=/opt/lenr-sim/.env ./LENR_SIM_APP_v2/infrastructure/vps/scripts/deploy.sh`
5. `./LENR_SIM_APP_v2/infrastructure/vps/scripts/hydrate-demo.sh` once.

Always pass `--env-file /opt/lenr-sim/.env` (deploy.sh does this). Never start
backend from `.env.production.example` — that sets `LENR_DB_PASSWORD=CHANGE_ME`
while the Postgres volume keeps the real password.


## CI deploy pin

`workflow_dispatch` on `.github/workflows/deploy.yml` checks out the **exact**
`github.sha` on the VPS (not “current branch + ff-pull”), then runs
`IMAGE_TAG=$APP_VERSION UPDATE_ENV_IMAGE_TAG=1`. That keeps scripts/Caddyfile
and the running image tag aligned with the tip that built GHCR images.

Probe: `GET /api/health` must return `"status": "healthy"` and `"version"` matching
tip `APP_VERSION` (see `backend/app/core/config.py`). Prefer:

```bash
EXPECT_VERSION="$(grep -oP 'APP_VERSION: str = "\K[^"]+' LENR_SIM_APP_v2/backend/app/core/config.py)" \
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh
```

`GET /api/docs` and `GET /metrics` must 404. Until `lenr-simp-app` points here, share
`https://lenr-sim-beta.conscious.energy` (also `https://srv1280333.hstgr.cloud`).
