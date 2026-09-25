# Self-hosted GitHub Actions runner (lenr-ci)

**Train:** v0.3.7-beta ops / CI cost  
**Goal:** Near-zero GitHub-hosted Actions minutes for PR/test work via a
**dedicated** Hostinger KVM — **not** the live Compose share VPS.

| Item | Value |
|------|--------|
| Labels (exact) | `self-hosted`, `linux`, `x64`, `lenr-ci` |
| Repo variable (cutover) | `LENR_CI_RUNS_ON` = `["self-hosted","linux","x64","lenr-ci"]` |
| Default while offline | unset → workflows keep `ubuntu-latest` (no forever-queue) |
| Deploy / ship jobs | Stay on GitHub-hosted (`ubuntu-latest`) or a future `lenr-deploy` label — **never** on `lenr-ci` with untrusted PR code + `VPS_*` secrets |
| Share VPS | `185.211.4.66` / VM id `1280333` — **deploy target only**; do **not** register a runner here |

**Share / private beta (do not use as CI):** Hostinger VM `1280333`,
`root@185.211.4.66`, https://lenr-sim-beta.conscious.energy/ — live Compose +
Caddy private beta (`0.3.7-beta`). Deploy **target** only. Never install a
GitHub Actions runner here (PR code isolation + load).

**CI runner (this doc):** a **second** Hostinger KVM with labels
`self-hosted`, `linux`, `x64`, `lenr-ci`. See provision status below.

---

## Why a separate VM

- PR jobs execute untrusted branch code; isolating that from production Compose
  reduces blast radius.
- Compose share already runs the public beta stack; CI load must not contend
  with live traffic or share its SSH/`VPS_*` credentials with general CI.
- See also [`CI_CD_COST_REDUCTION_PROPOSAL.md`](../../../CI_CD_COST_REDUCTION_PROPOSAL.md)
  (proposal history). **Authoritative placement is this dedicated VM**, not the
  share host suggested in early draft Option 1.

## Provision (operator)

### In progress — Hostinger order

| Field | Value |
|-------|--------|
| API order ids | `61650992` (monthly KVM2) · `61651905` (yearly KVM2) |
| Status (last agent check) | both `payment_initiated` (HTTP 202) — confirm **one** in [hPanel](https://hpanel.hostinger.com/) / 3DS; cancel the duplicate |
| Plan | `hostingercom-vps-kvm2-usd-1m` or `-1y` (2 vCPU / 8 GB / 100 GB) |
| Hostname | `lenr-ci` |
| Data center | `24` (Boston) |
| Template | `1077` (Ubuntu 24.04 LTS) |
| Post-install script | `5725` (`lenr-ci-runner-bootstrap`) — user, UFW, Docker, Node 22, runner tarball |
| Must not be | Share VM `1280333` / `185.211.4.66` |

Until payment clears, Hostinger still lists **only** the Compose share VM.

### Steps after the VM is running

1. Confirm the new VM id ≠ `1280333`; attach SSH access if needed.
2. Wait for post-install (`/var/log/lenr-ci-bootstrap.log` / `/opt/actions-runner`).
3. Register with labels (helper refuses the share IP/hostname):

   ```bash
   # On the CI VM as root — token from:
   # Settings → Actions → Runners → New self-hosted runner (never commit)
   export GH_RUNNER_REGISTRATION_TOKEN=...
   ./infrastructure/scripts/register-lenr-ci-runner.sh
   # or the same config.sh flags documented in the script
   ```

4. Confirm **Idle** under Settings → Actions → Runners.
5. Set repository **variable** `LENR_CI_RUNS_ON` to:

   ```json
   ["self-hosted","linux","x64","lenr-ci"]
   ```

   Until the runner is Idle, **leave the variable unset**. Note: GitHub-hosted
   jobs on this repo currently fail with **0 steps** when the Actions spending
   limit is hit — self-hosted + `LENR_CI_RUNS_ON` is the intended unblock.

## Secrets that stay in GitHub

Keep these in GitHub Actions secrets / environments — **not** on the CI disk:

- `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, and any deploy tokens
- Cloudflare / Hostinger API keys used by ship workflows
- Codecov and other upload tokens (optional on self-hosted)

Registration tokens are single-use / short-lived; rotate by removing the runner
in the UI and re-running `config.sh`.

## What not to run here

- Production Compose deploys from **fork/PR** workflows.
- Mixing `lenr-ci` (general PR CI) with a pool that has `VPS_*` SSH access.
- Ephemeral workdir cleanup: prefer wiping `_work` after jobs (or ephemeral
  runners) to reduce PR supply-chain residue.

## Drain / restart

```bash
# Drain: Settings → Runners → … → Disable, or:
sudo ./svc.sh stop

# Restart after reboot / upgrade:
sudo ./svc.sh start
sudo ./svc.sh status
```

Upgrade the runner binary with GitHub’s documented `./config.sh` / replace
tarball flow; re-apply labels if reconfiguring.

## Workflow wiring

Heavy jobs in [`.github/workflows/test.yml`](../../../.github/workflows/test.yml)
(and optionally security/CodeQL) use:

```yaml
runs-on: ${{ fromJSON(vars.LENR_CI_RUNS_ON || '["ubuntu-latest"]') }}
```

[`deploy.yml`](../../../.github/workflows/deploy.yml) stays on `ubuntu-latest`
(or a future dedicated `lenr-deploy` label). Path filters skip frontend-e2e /
full Python matrix / image-adjacent heavy jobs for docs/academic-only PRs so
parallel academic review stays cheap.

## Verification checklist

- [ ] New VM id ≠ `1280333`; hostname not the Compose share
- [ ] Runner Idle with labels `self-hosted`, `linux`, `x64`, `lenr-ci`
- [ ] `LENR_CI_RUNS_ON` set only after Idle (or run `.github/workflows/lenr-ci-smoke.yml` which is hard-pinned to those labels)
- [ ] Docs-only PR: heavy jobs skipped; `version-consistency` still green
- [ ] Code-touching PR: jobs land on `lenr-ci`
- [ ] Deploy workflow never lists `lenr-ci`
- [ ] Four version markers unchanged (`0.3.7-beta`)
- [ ] Smoke: Actions → “lenr-ci smoke” → Run workflow (must not show share IP)
