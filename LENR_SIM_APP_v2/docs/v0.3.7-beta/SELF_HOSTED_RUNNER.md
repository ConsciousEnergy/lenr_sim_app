# Self-hosted GitHub Actions runner (lenr-ci)

> **Status (2026-09-26):** Dedicated KVM2 **`2012566` / `45.93.100.251`** is registered
> as **`lenr-ci-1`** (Listening). Share `.runner` cleared. `lenr-ci runner smoke` green on
> dedicated. Cancel unpaid Hostinger orders
> `61660939` / `61662216` / `61663818` / `61665445` in hPanel if still pending.
> If GitHub still lists Offline `lenr-ci-share-1`, delete that orphan in the Runners UI.

**Train:** v0.3.7-beta ops / CI cost  
**Goal:** Near-zero GitHub-hosted Actions minutes for PR/test work.

| Item | Value |
|------|--------|
| Labels (exact) | `self-hosted`, `linux`, `x64`, `lenr-ci` |
| Repo variable (optional override) | `LENR_CI_RUNS_ON` — unset uses lenr-ci; set `["ubuntu-latest"]` to force hosted |
| Default (runner Idle) | unset → `["self-hosted","linux","x64","lenr-ci"]` |
| Deploy / ship jobs | Stay on GitHub-hosted (`ubuntu-latest`) or a future `lenr-deploy` label — **never** on `lenr-ci` with untrusted PR code + `VPS_*` secrets |

---

## Placement: dedicated CI VM (required) vs share interim

**Required end state:** runner on a Hostinger VM **≠** `1280333` / `185.211.4.66`,
labels `self-hosted,linux,x64,lenr-ci`, and **no** `.runner` on the Compose share.

### Dedicated VM online — awaiting runner registration token

| Item | Value |
|------|--------|
| VM id | **`2012566`** |
| IP | **`45.93.100.251`** |
| Hostname | `lenr-ci` |
| OS | Ubuntu 26.04 (Hostinger default) — Playwright e2e uses **system Google Chrome** (`LENR_CI_SYSTEM_CHROME=1`), not bundled Chromium |
| Runner package | 2.337.0 bootstrapped at `/opt/actions-runner` |
| CI deps | `bootstrap-dedicated-lenr-ci.sh` (ansible, unzip, Chrome, Playwright OS libs, docker group) |
| Access | Agent SSH key installed; root password rotated; password SSH disabled |
| Next | Inject fresh `GH_RUNNER_REGISTRATION_TOKEN` → `finish-lenr-ci.sh` / migrate |
| Then | `CONFIRM_REMOVE_SHARE_RUNNER=I_REMOVE_SHARE_RUNNER` remove share `lenr-ci-share-1` |

### Prior card orders (cancel unpaid)


| Item | Value |
|------|--------|
| Orders | **`61660939`** / **`61662216`** / **`61663818`** / **`61665445`** — all `payment_initiated`; complete **one** 3DS; cancel the rest. **Stop further card API purchases.** |
| Target hostname | `lenr-ci` |
| Post-install | Hostinger script **`5725`** (`lenr-ci-runner-bootstrap`) — runner package **2.337.0** + sha256 check |
| Next human step | Complete **one** 3DS in hPanel; abandon older unpaid duplicates |
| Alt (Hostinger API guidance) | Card 3DS often leaves API orders unprocessed — add **PayPal** (or non-card) in hPanel → Billing → Payment methods, set it default, then re-run `provision-dedicated-lenr-ci.sh` (do **not** stack more card orders while 3DS is open). Agent watcher: `watch-paypal-and-provision.sh` attempts **one** KVM1 purchase automatically when a non-card method appears. |
| Then | Inject fresh `GH_RUNNER_REGISTRATION_TOKEN` (real one-time token; not `G1th*` placeholder) → `migrate-to-dedicated-lenr-ci.sh` |
| Agent cannot mint token | Cursor `gh` integration lacks runner admin; `GH_ADMIN_PAT` must be a real `ghp_`/`github_pat_` if automation should mint tokens |
| Password assist | Hostinger reset email → set password → paste on unlock drop page (`HOSTINGER_HPANEL_PASSWORD`) so Playwright can open billing |

```bash
export GH_RUNNER_REGISTRATION_TOKEN=...   # fresh GitHub one-time token
export CONFIRM_REMOVE_SHARE_RUNNER=I_REMOVE_SHARE_RUNNER
./LENR_SIM_APP_v2/infrastructure/scripts/migrate-to-dedicated-lenr-ci.sh
# migrate ends with prove-dedicated-lenr-ci.sh (share clean + smoke)
```

Agent/tmux auto-path (when token becomes usable):
`watch-and-migrate-dedicated-lenr-ci.sh`.

Operator token/hPanel drop (ephemeral Cloudflare quick tunnel while agent is live):
`infrastructure/scripts/lenr-ci-token-drop-server.py` — serve locally and
`cloudflared tunnel --url http://127.0.0.1:8787`, then open `/drop/<secret>`.
Accepts `GH_RUNNER_REGISTRATION_TOKEN` and optional `HOSTINGER_HPANEL_*`.
When hPanel email+password are dropped, `watch-hpanel-3ds.sh` uses Playwright
(email login — not Google SSO) to open billing and attempt pending 3DS.

Or: `provision-dedicated-lenr-ci.sh` (needs `CONFIRM_PURCHASE_LENR_CI=I_BUY_DEDICATED_CI`)
then `finish-lenr-ci.sh` (**never** `ALLOW_SHARE_RUNNER`) then
`remove-share-lenr-ci-runner.sh`.

### Interim only — Compose share co-tenant (must be removed)

| Item | Value |
|------|--------|
| Host | `185.211.4.66` / VM `1280333` |
| Runner | `lenr-ci-share-1` (present until dedicated Idle) |
| Register override | `ALLOW_SHARE_RUNNER=1` (bootstrap only; migrate refuses this) |
| Smoke override | repo var `LENR_CI_ALLOW_SHARE=1` — **required** for share smoke to pass; default is refuse share |

`lenr-ci-smoke` **fails** when the job lands on `185.211.4.66` unless
`LENR_CI_ALLOW_SHARE=1`. A green smoke check therefore means dedicated placement
(or an explicit interim override) — not an accidental share co-tenant pass.

**Do not** put `VPS_*` / deploy secrets on `lenr-ci` workflows. Keep `deploy.yml`
on `ubuntu-latest`. Share bootstrap preinstalls `unzip`, `ansible`, Playwright OS libs.

Abandon unpaid duplicates in hPanel: `61650992`, `61651905`, `61656286`, `61656290`
(keep only **61660939** until it clears or is cancelled).

---

## Why isolation matters

- PR jobs execute untrusted branch code; isolating that from production Compose
  reduces blast radius.
- See also [`CI_CD_COST_REDUCTION_PROPOSAL.md`](../../../CI_CD_COST_REDUCTION_PROPOSAL.md).

## One KVM2 vs two (decision guide)

Hostinger does not “partition” a VPS into isolated tenants. Co-locating means
the same OS runs Compose/Swarm **and** `actions-runner`.

| | Single KVM2 (co-tenant interim) | Dedicated CI KVM2 (**goal**) |
|--|--|--|
| Cost | No new Hostinger line item | Extra KVM2 (order 61660939) |
| Security | Untrusted PR code next to live stack | Blast radius limited to CI box |
| Capacity | 2 vCPU / 8 GB shared with app/Swarm | CI load does not starve beta |
| Swarm later | Possible for light staging; tight for busy CI + prod Swarm | Safer when both grow |
| Deploy secrets | Must stay off `lenr-ci` either way | Same rule |

**Goal placement is dedicated CI KVM.** Share runner `lenr-ci-share-1` is interim
until dedicated registers Idle and `remove-share-lenr-ci-runner.sh` runs.
**Do not** purchase more Hostinger VMs — dedicated `2012566` already exists.

## Provision (operator) — dedicated VM

1. **Done:** dedicated Hostinger KVM2 `2012566` at `45.93.100.251` (OS hostname
   `lenr-ci`; runner package 2.337.0 at `/opt/actions-runner`). Cancel unpaid
   duplicate orders in hPanel. Do **not** run
   `CONFIRM_PURCHASE_LENR_CI` again.
2. Register on dedicated only (**no** `ALLOW_SHARE_RUNNER`):

   ```bash
   export GH_RUNNER_REGISTRATION_TOKEN=...   # fresh one-time token, len≥40
   export CI_VM_SSH_HOST=root@45.93.100.251
   ./LENR_SIM_APP_v2/infrastructure/scripts/finish-lenr-ci.sh
   export CONFIRM_REMOVE_SHARE_RUNNER=I_REMOVE_SHARE_RUNNER
   ./LENR_SIM_APP_v2/infrastructure/scripts/remove-share-lenr-ci-runner.sh
   ./LENR_SIM_APP_v2/infrastructure/scripts/prove-dedicated-lenr-ci.sh
   ```

3. Confirm **Idle** under Settings → Actions → Runners (`lenr-ci-1`).
4. Workflows already default to lenr-ci labels when `LENR_CI_RUNS_ON` is unset.
   Optional: set the variable explicitly, or set `["ubuntu-latest"]` to force
   hosted. Hosted jobs on this repo may fail with **0 steps** when the Actions
   spending limit is hit — self-hosted is the unblock.
5. Confirm share `185.211.4.66` has **no** GitHub runner registration.

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

### Goal (dedicated)
- [x] Hostinger VM id ≠ `1280333` (`2012566` / `45.93.100.251`, OS hostname `lenr-ci`)
- [x] Runner Idle on dedicated only (`lenr-ci-1`); labels `self-hosted,linux,x64,lenr-ci`
- [x] Share `185.211.4.66` has **no** `.runner` (delete orphan `lenr-ci-share-1` in GitHub UI if still listed Offline)
- [x] Smoke green on dedicated (`lenr-ci runner smoke` on `lenr-ci-1` / host `lenr-ci`)

### Interim / invariants
- [x] Workflow default fallback is lenr-ci (optional `LENR_CI_RUNS_ON` override)
- [x] Smoke refuses share by default (`LENR_CI_ALLOW_SHARE` gate) — share smoke fails intentionally
- [x] Live beta healthy: https://lenr-sim-beta.conscious.energy/api/health (`0.3.7-beta`)
- [x] Deploy workflow never `runs-on` `lenr-ci`
- [x] Four version markers unchanged (`0.3.7-beta`)
- [x] Root password rotated; password SSH disabled on dedicated
- [ ] Unpaid Hostinger duplicate KVM orders abandoned in hPanel
