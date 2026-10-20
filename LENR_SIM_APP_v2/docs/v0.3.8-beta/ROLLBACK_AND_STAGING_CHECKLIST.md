# Compose rollback drill + staging dry-run checklist

**Phase-1 deliverable:** prove Compose RTO path and fill non-prod plan/check-mode
boxes. **No** Swarm/Pages production apply.

## Compose rollback drill (VPS)

Public beta uses Hostinger Compose + Caddy, not Swarm `scripts/rollback.sh`.

| Step | Command | Expected |
|------|---------|----------|
| 1. Record current health | `EXPECT_VERSION=0.3.7-beta ./LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh` | `OK: share host healthy` |
| 2. Note previous tag | `ssh … cat /opt/lenr-sim/.rollback-image-tag` | Prior `IMAGE_TAG` from last deploy |
| 3. Roll back | `./LENR_SIM_APP_v2/infrastructure/vps/scripts/rollback.sh` (or `rollback.sh <tag>`) | Redeploys previous tag via `deploy.sh` |
| 4. Re-verify | same as step 1 with expected prior version | Healthy within RTO target (≤15 min) |
| 5. Re-ship tip (optional) | `post-merge-vps-ship` / deploy tip | Share returns to tip version |

### Evidence captured this prep run

- Live share probe (read-only from agent egress):
  `https://lenr-sim-beta.conscious.energy/api/health` →
  `status=healthy`, `version=0.3.7-beta` (see artifact
  `compose_rollback_drill_evidence.log`).
- Full SSH rollback against prod was **not** executed from this cloud agent
  (no deploy SSH key mounted). Operator must run steps 2–5 once on the VPS and
  paste timestamps into the release notes before Swarm cutover.
- Script contract verified: `vps/scripts/rollback.sh` requires a tag file or
  CLI tag and execs `deploy.sh` with `BUILD_LOCALLY=0`.

**RTO target:** restore previous healthy share within **15 minutes** of deciding
to roll back.

## Staging Terraform / Ansible checklist (no prod apply)

- [x] DNS / Hostinger decisions written
  ([DNS_AND_HOSTINGER_DECISIONS.md](./DNS_AND_HOSTINGER_DECISIONS.md))
- [x] Remote state backend example + staging workspace docs
  ([TERRAFORM_REMOTE_STATE.md](./TERRAFORM_REMOTE_STATE.md), `backend.hcl.example`)
- [x] Ansible GHCR login task before `docker stack deploy --with-registry-auth`
- [x] `pages_hostname` defaults to `app` (never `@` / `www`)
- [x] `hostinger_vps_mode` defaults to `disabled`
- [ ] Operator: `terraform init -backend-config=backend.hcl` + `workspace select staging` + `plan` (credentials on operator machine)
- [ ] Operator: `ansible-playbook --check --diff playbooks/deploy-stack.yml -i inventory.staging.yml` against a **non-prod** node
- [ ] Operator: complete Compose rollback steps 2–5 on live VPS once and attach timestamps

Hard gates for `infrastructure/scripts/deploy.sh`:

- Staging: `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8` (legacy `I_CUTOVER_0_3_8` accepted for staging-only).
- Production cutover (v0.3.9): `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9`.

## Swarm rolling update + rollback (prep — do not apply on public share)

Backend service in `docker-stack.yml.j2` ships zero-downtime defaults:

| Setting | Value | Intent |
|---------|-------|--------|
| `update_config.order` | `start-first` | New task healthy before old stops |
| `update_config.parallelism` | `1` | One replica at a time |
| `update_config.failure_action` | `rollback` | Auto revert on monitor failure |
| `update_config.monitor` | `30s` | Watch window after each task |
| `rollback_config.order` | `stop-first` | Conservative rollback path |

Operator drill (staging Swarm only, after `CONFIRM_SWARM_0_3_8`):

```bash
# Record baseline
docker service ps lenr_backend --no-trunc | head
curl -fsS https://api-staging.conscious.energy/api/health | jq .version

# Intentional bad image → expect auto rollback
docker service update --image ghcr.io/consciousenergy/lenr-sim-backend:does-not-exist \
  lenr_backend
# Watch: docker service ps lenr_backend  → Rollback complete

# Manual rollback if needed
docker service rollback lenr_backend
```

Public Compose share keeps using `vps/scripts/rollback.sh` until
`CONFIRM_SWARM_0_3_9`. Topology + storage contract:
[`THREE_NODE_SWARM_TOPOLOGY.md`](THREE_NODE_SWARM_TOPOLOGY.md)
(Persistent storage — no Longhorn; pin + off-box backup).

## Swarm volume backup (pin + off-box; not Longhorn)

Swarm volumes are **node-local**. Do not put Postgres datadir on NFS.

| Data | Host after cutover | Backup approach | RPO target (ops) |
|------|--------------------|-----------------|------------------|
| `postgres_data` | Share manager | Scheduled `pg_dump` / basebackup to off-box object storage or Hostinger snapshot | ≤ 24 h until tighter SLA |
| `prometheus_data` / `grafana_data` | KVM1 | Hostinger snapshot or rsync of `/var/lib/docker/volumes/…` | Best-effort (rebuildable) |
| ACME certs | Share manager Traefik disk | Included in host snapshot; Let’s Encrypt re-issue OK | n/a |

Operator: record first successful backup timestamps here before public cutover.
Staging single-node (KVM1) still uses local volumes — same backup discipline.
