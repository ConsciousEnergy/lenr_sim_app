# Single-VPS public beta (Caddy + Compose)

Same-origin stack for `https://beta.conscious.energy`. Terraform/Ansible/Swarm under
`infrastructure/ansible` and `infrastructure/terraform` remain the multi-node path;
do not run them for this beta.

## Layout

| Path | Role |
|---|---|
| `docker-compose.prod.yml` | caddy, frontend, backend, postgres, migrate (profile) |
| `Caddyfile` | TLS, `/api*` -> FastAPI (incl. WebSockets), `/*` -> nginx SPA |
| `.env.production.example` | copied to `/opt/lenr-sim/.env` (mode 0600) |
| `scripts/bootstrap-host.sh` | SSH harden, UFW, fail2ban, swap, docker logs |
| `scripts/deploy.sh` | pull or build, alembic, up, health probe |
| `scripts/rollback.sh` | redeploy previous `IMAGE_TAG` |
| `scripts/backup-db.sh` | `pg_dump` -> `/opt/lenr-sim/backups` (14 days) |
| `scripts/hydrate-demo.sh` | seed + `--hydrate-demo` |

## First boot

1. DNS: `A beta.conscious.energy -> 185.211.4.66` (optional AAAA).
2. `bootstrap-host.sh` as root (install a deploy key first).
3. Clone this repo to `/opt/lenr-sim/src`, copy `.env.production.example` to `/opt/lenr-sim/.env`, fill `CHANGE_ME`.
4. `BUILD_LOCALLY=1 LENR_ENV_FILE=/opt/lenr-sim/.env infrastructure/vps/scripts/deploy.sh`
5. `hydrate-demo.sh` once.
6. Cron: `0 3 * * * root .../backup-db.sh`

Probe: `GET https://beta.conscious.energy/api/health` must return `"version": "0.3.6-beta"`.
`GET /api/docs` and `GET /metrics` must 404.
