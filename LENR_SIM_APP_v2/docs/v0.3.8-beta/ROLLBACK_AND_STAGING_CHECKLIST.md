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

Hard gate remains: `CONFIRM_SWARM_0_3_8=I_CUTOVER_0_3_8` for
`infrastructure/scripts/deploy.sh`.
