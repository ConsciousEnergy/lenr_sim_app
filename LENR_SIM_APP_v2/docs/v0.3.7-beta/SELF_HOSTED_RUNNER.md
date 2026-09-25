# Self-hosted GitHub Actions runner (lenr-ci)

**Train:** v0.3.7-beta ops / CI cost  
**Goal:** Near-zero GitHub-hosted Actions minutes for PR/test work.

| Item | Value |
|------|--------|
| Labels (exact) | `self-hosted`, `linux`, `x64`, `lenr-ci` |
| Repo variable (optional override) | `LENR_CI_RUNS_ON` — unset uses lenr-ci; set `["ubuntu-latest"]` to force hosted |
| Default (runner Idle) | unset → `["self-hosted","linux","x64","lenr-ci"]` |
| Deploy / ship jobs | Stay on GitHub-hosted (`ubuntu-latest`) or a future `lenr-deploy` label — **never** on `lenr-ci` with untrusted PR code + `VPS_*` secrets |

---

## Placement: share KVM2 co-tenant (active) vs dedicated VM

### Active cutover — Compose share KVM2 (operator override)

| Item | Value |
|------|--------|
| Host | `185.211.4.66` / VM `1280333` / `lenr-sim-app.conscious.energy` |
| Also serves | Live Compose beta https://lenr-sim-beta.conscious.energy/ (`0.3.7-beta`) |
| Runner name | `lenr-ci-share-1` (registered; systemd enabled) |
| Labels | `self-hosted`, `linux`, `x64`, `lenr-ci` |
| Override | `ALLOW_SHARE_RUNNER=1` |

**Do not** put `VPS_*` / deploy secrets on workflows that use `lenr-ci`. Keep
`deploy.yml` on `ubuntu-latest`. Prefer wiping `_work` after jobs.

Unpaid second-KVM orders (`61650992`, `61651905`, `61656286`, `61656290`) were
`payment_initiated` only — **abandon in hPanel**; co-tenant CI avoids that cost.

### Dedicated CI KVM (optional later)

When budget allows isolation, move `lenr-ci` off the share onto a second Hostinger
KVM (hostname `lenr-ci`) via `provision-dedicated-lenr-ci.sh` +
`CONFIRM_PURCHASE_LENR_CI=I_BUY_DEDICATED_CI`, then remove the share runner.

---

## Why isolation still matters

- PR jobs execute untrusted branch code; isolating that from production Compose
  reduces blast radius.
- See also [`CI_CD_COST_REDUCTION_PROPOSAL.md`](../../../CI_CD_COST_REDUCTION_PROPOSAL.md).

## One KVM2 vs two (decision guide)

Hostinger does not “partition” a VPS into isolated tenants. Co-locating means
the same OS runs Compose/Swarm **and** `actions-runner`.

| | Single KVM2 (co-tenant) | Dedicated CI KVM2 (this goal) |
|--|--|--|
| Cost | No new Hostinger line item | Extra monthly/yearly KVM2 |
| Security | Untrusted PR code next to live stack | Blast radius limited to CI box |
| Capacity | 2 vCPU / 8 GB shared with app/Swarm | CI load does not starve beta |
| Swarm later | Possible for light staging; tight for busy CI + prod Swarm | Safer when both grow |
| Deploy secrets | Must stay off `lenr-ci` either way | Same rule |

**Active placement is single-KVM2 co-tenant** (`lenr-ci-share-1` on the Compose
share). A dedicated CI KVM remains optional for stronger isolation later.

Pending second-KVM payments: **abandon** unpaid orders in hPanel
(`61650992`, `61651905`, `61656286`, `61656290`) unless you later choose a
dedicated box.

## Provision (operator) — dedicated VM

1. Pay/provision a **second** Hostinger KVM (not `1280333`):
   - hPanel: complete **one** pending order `61650992`/`61651905` as hostname
     `lenr-ci`, **or**
   - Gated script:
     ```bash
     export HOSTINGER_API_TOKEN=...
     export CONFIRM_PURCHASE_LENR_CI=I_BUY_DEDICATED_CI
     ./LENR_SIM_APP_v2/infrastructure/scripts/provision-dedicated-lenr-ci.sh
     ```
2. Wait until Hostinger lists a VM id ≠ `1280333` with a public IP ≠
   `185.211.4.66`. Confirm post-install (`/opt/actions-runner` on that host).
3. Register (**no** `ALLOW_SHARE_RUNNER`):

   ```bash
   export GH_RUNNER_REGISTRATION_TOKEN=...
   ./LENR_SIM_APP_v2/infrastructure/scripts/finish-lenr-ci.sh
   ```

4. Confirm **Idle** under Settings → Actions → Runners (`lenr-ci-1`).
5. Workflows already default to lenr-ci labels when `LENR_CI_RUNS_ON` is unset.
   Optional: set the variable explicitly, or set `["ubuntu-latest"]` to force
   hosted. Hosted jobs on this repo may fail with **0 steps** when the Actions
   spending limit is hit — self-hosted is the unblock.
6. Confirm share `185.211.4.66` still has **no** GitHub runner registration.

## Secrets that stay in GitHub

Keep these in GitHub Actions secrets / environments — **not** on the CI disk
and **not** available to `lenr-ci` PR workflows:

- `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, and any deploy tokens
- Cloudflare / Hostinger API keys used by ship workflows
- Codecov and other upload tokens (optional on self-hosted)

Registration tokens are single-use / short-lived; rotate by removing the runner
in the UI and re-running `config.sh`.

## Secure setup: registration token + optional admin PAT

**Threat model:** `lenr-ci` runs untrusted PR code. Keep it off the live Compose
share. Keep deploy credentials off the runner pool.

### A) Runner registration token (required once)

1. Repo admin →
   [Settings → Actions → Runners](https://github.com/ConsciousEnergy/lenr_sim_app/settings/actions/runners)
   → **New self-hosted runner** → Linux / x64.
2. Copy only the `--token` value from the configure snippet (~1 hour TTL,
   single-use). Do **not** paste into chat, commits, Slack, or the PR body.
3. Prefer injecting as Cursor / agent secret `GH_RUNNER_REGISTRATION_TOKEN`,
   or run on the **dedicated** CI VM / via finish helper:

   ```bash
   export GH_RUNNER_REGISTRATION_TOKEN='…'
   ./LENR_SIM_APP_v2/infrastructure/scripts/finish-lenr-ci.sh
   unset GH_RUNNER_REGISTRATION_TOKEN
   ```

4. Confirm **Idle** name `lenr-ci-1`, labels `self-hosted,linux,x64,lenr-ci`,
   on a host that is **not** `185.211.4.66`. If configure fails, remove any
   half-created runner in the UI and mint a **new** token.

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

Workflows default to `["self-hosted","linux","x64","lenr-ci"]` when
`LENR_CI_RUNS_ON` is unset. Optional: set the variable explicitly for clarity,
or to `["ubuntu-latest"]` to force hosted. Require approval for first-time
contributors’ workflows before they run on self-hosted. Rotate any root
password used for SSH unlock.

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
runs-on: ${{ fromJSON(vars.LENR_CI_RUNS_ON || '["self-hosted","linux","x64","lenr-ci"]') }}
```

[`deploy.yml`](../../../.github/workflows/deploy.yml) stays on `ubuntu-latest`.

## Verification checklist

- [x] Runner Idle/Listening with labels `self-hosted`, `linux`, `x64`, `lenr-ci` (name `lenr-ci-share-1`)
- [x] Workflow default fallback is lenr-ci (optional `LENR_CI_RUNS_ON` override)
- [x] `lenr-ci-smoke` green on self-hosted
- [x] Live beta still healthy: https://lenr-sim-beta.conscious.energy/api/health (`0.3.7-beta`)
- [x] Deploy workflow never `runs-on` `lenr-ci`
- [x] Four version markers unchanged (`0.3.7-beta`)
- [ ] Root password rotated if it was shared for unlock
- [ ] Unpaid Hostinger duplicate KVM orders abandoned in hPanel
