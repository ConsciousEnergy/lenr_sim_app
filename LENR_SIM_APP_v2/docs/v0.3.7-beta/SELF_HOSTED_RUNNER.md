# Self-hosted GitHub Actions runner (lenr-ci)

**Train:** v0.3.7-beta ops / CI cost  
**Goal:** Near-zero GitHub-hosted Actions minutes for PR/test work.

| Item | Value |
|------|--------|
| Labels (exact) | `self-hosted`, `linux`, `x64`, `lenr-ci` |
| Repo variable (cutover) | `LENR_CI_RUNS_ON` = `["self-hosted","linux","x64","lenr-ci"]` |
| Default while offline | unset → workflows keep `ubuntu-latest` (no forever-queue) |
| Deploy / ship jobs | Stay on GitHub-hosted (`ubuntu-latest`) or a future `lenr-deploy` label — **never** on `lenr-ci` with untrusted PR code + `VPS_*` secrets |

---

## Placement: share KVM2 (current) vs dedicated VM

### Active cutover — Compose share KVM2 (operator override)

| Item | Value |
|------|--------|
| Host | `185.211.4.66` / VM id `1280333` / hostname `lenr-sim-app.conscious.energy` |
| Also serves | Live Compose + Caddy private beta https://lenr-sim-beta.conscious.energy/ (`0.3.7-beta`) |
| Runner name | `lenr-ci-share-1` |
| Override flag | `ALLOW_SHARE_RUNNER=1` on register/bootstrap/finish scripts |
| Why | Avoid a second Hostinger KVM purchase and extra secrets while Actions spend limit blocks hosted jobs |
| Tradeoffs | PR job code co-tenants production Compose; CI load can contend with live traffic; blast radius is larger |

**Do not** put `VPS_*` / deploy secrets on workflows that use `lenr-ci`. Keep
`deploy.yml` on `ubuntu-latest`. Prefer wiping `_work` (cron installed by
bootstrap) after jobs.

Abandoned second-KVM path: Hostinger API orders `61650992` / `61651905` were
`payment_initiated` only — **no second VM was provisioned**. Only subscription
`AzZiGtV8fVJvR9YlG` (this KVM2, yearly) is active. Cancel/abandon those unpaid
orders in [hPanel](https://hpanel.hostinger.com/) if they still appear; do not
complete 3DS.

### Preferred long-term — dedicated CI KVM (Option A)

When budget allows, move `lenr-ci` off the share onto a second Hostinger KVM
(hostname `lenr-ci`, labels unchanged) and remove `ALLOW_SHARE_RUNNER` usage.
Post-install script id `5725` (`lenr-ci-runner-bootstrap`) remains for that path.

---

## Why isolation still matters

- PR jobs execute untrusted branch code; co-tenancy with Compose increases blast
  radius (mitigate with no deploy secrets on `lenr-ci`, workdir cleanup, low
  concurrency).
- See also [`CI_CD_COST_REDUCTION_PROPOSAL.md`](../../../CI_CD_COST_REDUCTION_PROPOSAL.md).

## Provision (operator) — share override

1. SSH to `root@185.211.4.66` (pubkey). Confirm Compose healthy:
   `curl -fsS https://lenr-sim-beta.conscious.energy/api/health`.
2. Bootstrap (idempotent):

   ```bash
   export ALLOW_SHARE_RUNNER=1
   ./LENR_SIM_APP_v2/infrastructure/scripts/bootstrap-share-lenr-ci.sh
   ```

3. Register (token from Settings → Actions → Runners → New self-hosted runner;
   never commit):

   ```bash
   export ALLOW_SHARE_RUNNER=1
   export GH_RUNNER_REGISTRATION_TOKEN=...
   ./LENR_SIM_APP_v2/infrastructure/scripts/register-lenr-ci-runner.sh
   ```

   From an agent host with SSH key access:

   ```bash
   export ALLOW_SHARE_RUNNER=1
   export GH_RUNNER_REGISTRATION_TOKEN=...
   # optional: SHARE_SSH_HOST=root@185.211.4.66
   ./LENR_SIM_APP_v2/infrastructure/scripts/finish-lenr-ci.sh
   ```

4. Confirm **Idle** under Settings → Actions → Runners (`lenr-ci-share-1`).
5. Set repository **variable** `LENR_CI_RUNS_ON` to:

   ```json
   ["self-hosted","linux","x64","lenr-ci"]
   ```

   Until Idle, **leave the variable unset**. Hosted jobs on this repo may fail
   with **0 steps** when the Actions spending limit is hit — self-hosted is the
   unblock.

## Secrets that stay in GitHub

Keep these in GitHub Actions secrets / environments — **not** on the CI disk
and **not** available to `lenr-ci` PR workflows:

- `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, and any deploy tokens
- Cloudflare / Hostinger API keys used by ship workflows
- Codecov and other upload tokens (optional on self-hosted)

Registration tokens are single-use / short-lived; rotate by removing the runner
in the UI and re-running `config.sh`.

## Secure setup: registration token + optional admin PAT

**Threat model:** `lenr-ci` runs untrusted PR code on the same host as live
Compose. Anything available to that runner pool is in the blast radius. Keep
deploy credentials off it.

### A) Runner registration token (required once)

1. Repo admin →
   [Settings → Actions → Runners](https://github.com/ConsciousEnergy/lenr_sim_app/settings/actions/runners)
   → **New self-hosted runner** → Linux / x64.
2. Copy only the `--token` value from the configure snippet (~1 hour TTL,
   single-use). Do **not** paste into chat, commits, Slack, or the PR body.
3. Prefer injecting as Cursor / agent secret `GH_RUNNER_REGISTRATION_TOKEN`,
   or run locally and `unset` immediately after:

   ```bash
   export ALLOW_SHARE_RUNNER=1
   export GH_RUNNER_REGISTRATION_TOKEN='…'
   ./LENR_SIM_APP_v2/infrastructure/scripts/finish-lenr-ci.sh
   unset GH_RUNNER_REGISTRATION_TOKEN
   ```

4. Confirm **Idle** name `lenr-ci-share-1`, labels
   `self-hosted,linux,x64,lenr-ci`. If configure fails, remove any half-created
   runner in the UI and mint a **new** token.

### B) Optional fine-grained admin PAT (`GH_ADMIN_PAT`)

Use only if the agent must mint registration tokens or set `LENR_CI_RUNS_ON`
via API (Cursor’s default `gh` integration cannot — HTTP 403).

| Setting | Value |
|---------|--------|
| Type | Fine-grained PAT (not classic `repo`) |
| Resource owner | `ConsciousEnergy` |
| Repository access | **Only** `lenr_sim_app` |
| Expiration | 7–30 days |
| Permissions | Administration: R/W · Variables: R/W · Contents: Read · Actions: Read |
| Avoid | Org-wide access, Secrets write, delete, SSO-everything |

Store as agent secret `GH_ADMIN_PAT` only — never on the VPS disk, never in
Actions secrets readable by PR jobs on `lenr-ci`. Revoke after cutover.

### C) After Idle

Set repo **variable** (not secret) `LENR_CI_RUNS_ON` to
`["self-hosted","linux","x64","lenr-ci"]`. Leave unset until Idle.
Require approval for first-time contributors’ workflows before they run on
self-hosted. Rotate any root password used for SSH unlock.

## What not to run here

- Production Compose deploys from **fork/PR** workflows.
- Mixing `lenr-ci` (general PR CI) with a pool that has `VPS_*` SSH access.
- Heavy parallel matrices that starve the live Compose stack (2 vCPU / 8 GB shared).

## Drain / restart

```bash
sudo ./svc.sh stop   # from /opt/actions-runner
sudo ./svc.sh start
sudo ./svc.sh status
```

## Workflow wiring

Heavy jobs in [`.github/workflows/test.yml`](../../../.github/workflows/test.yml)
(and optionally security/CodeQL) use:

```yaml
runs-on: ${{ fromJSON(vars.LENR_CI_RUNS_ON || '["ubuntu-latest"]') }}
```

[`deploy.yml`](../../../.github/workflows/deploy.yml) stays on `ubuntu-latest`.

## Verification checklist

- [ ] Runner Idle with labels `self-hosted`, `linux`, `x64`, `lenr-ci` (name `lenr-ci-share-1` for share mode)
- [ ] `LENR_CI_RUNS_ON` set only after Idle (or run `.github/workflows/lenr-ci-smoke.yml`)
- [ ] Live beta still healthy after register: https://lenr-sim-beta.conscious.energy/api/health
- [ ] Unpaid Hostinger KVM orders abandoned in hPanel
- [ ] Deploy workflow never lists `lenr-ci`
- [ ] Four version markers unchanged (`0.3.7-beta`)
- [ ] Root password rotated if it was shared for unlock
