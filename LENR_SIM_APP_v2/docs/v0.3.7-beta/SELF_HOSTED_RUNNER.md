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

## Why a separate VM

- PR jobs execute untrusted branch code; isolating that from production Compose
  reduces blast radius.
- Compose share already runs the public beta stack; CI load must not contend
  with live traffic or share its SSH/`VPS_*` credentials with general CI.
- See also [`CI_CD_COST_REDUCTION_PROPOSAL.md`](../../../CI_CD_COST_REDUCTION_PROPOSAL.md)
  (proposal history). **Authoritative placement is this dedicated VM**, not the
  share host suggested in early draft Option 1.

## Provision (operator)

1. Order a separate Hostinger KVM (~2–4 vCPU, ≥8 GB RAM, ≥50 GB disk,
   Ubuntu 22.04 or 24.04). Confirm it is **not** VM `1280333`.
2. Harden baseline:
   - Create non-root user `github-runner` (docker group if Docker is used).
   - Enable unattended security updates.
   - Firewall: allow outbound; SSH only from known admin IPs if practical.
   - **No** production `docker compose` project on this box.
3. Install tooling to match CI needs (or rely on `actions/setup-*` on each job):
   - Docker + Buildx
   - Node 22
   - Python 3.10–3.12 (PR matrix is 3.12-only; main still exercises 3.10/3.11)
   - Playwright OS deps (`npx playwright install-deps` once)
   - Optional: elan/Lean cache under the runner workdir; Ansible + Terraform 1.5.x
     for `staging-swarm-dry-run` local validate
4. Register the runner against `ConsciousEnergy/lenr_sim_app`:

   ```bash
   # As github-runner — token from:
   # Settings → Actions → Runners → New self-hosted runner
   # (or short-lived registration API token; never commit it)
   ./config.sh --url https://github.com/ConsciousEnergy/lenr_sim_app \
     --token "$GH_RUNNER_REGISTRATION_TOKEN" \
     --labels self-hosted,linux,x64,lenr-ci \
     --name lenr-ci-1 \
     --work _work
   sudo ./svc.sh install github-runner
   sudo ./svc.sh start
   ```

5. Confirm **Idle** under Settings → Actions → Runners.
6. Set repository **variable** `LENR_CI_RUNS_ON` to:

   ```json
   ["self-hosted","linux","x64","lenr-ci"]
   ```

   Until the runner is Idle, **leave the variable unset** so jobs stay on
   `ubuntu-latest`.

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
- [ ] `LENR_CI_RUNS_ON` set only after Idle
- [ ] Docs-only PR: heavy jobs skipped; `version-consistency` still green
- [ ] Code-touching PR: jobs land on `lenr-ci`
- [ ] Deploy workflow never lists `lenr-ci`
- [ ] Four version markers unchanged (`0.3.7-beta`)
