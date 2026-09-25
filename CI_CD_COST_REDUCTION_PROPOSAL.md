# CI/CD Cost Reduction Proposal
## Alternative Solutions to GitHub Actions

**Date:** September 24, 2026  
**Status (Sept 2026):** **Dedicated CI VM is the goal.** Labels
`self-hosted,linux,x64,lenr-ci` + repo variable `LENR_CI_RUNS_ON` on a Hostinger
KVM that is **not** the Compose share (`185.211.4.66` / VM `1280333`). See
[`LENR_SIM_APP_v2/docs/v0.3.7-beta/SELF_HOSTED_RUNNER.md`](LENR_SIM_APP_v2/docs/v0.3.7-beta/SELF_HOSTED_RUNNER.md).
Unpaid orders `61650992` / `61651905` need one completed payment (or a fresh
gated purchase). Keep `deploy.yml` on GitHub-hosted runners so `VPS_*` never
shares the PR pool. Do **not** register a GitHub runner on the share.

**Current Problem:** GitHub Actions billing is expensive for frequent PRs and merges  
**Current Monthly Cost Drivers:**
- Test suite runs on every PR and push to main (Python 3.10, 3.11, 3.12 matrix)
- Frontend E2E tests with Playwright
- Docker image builds
- Security scans (CodeQL, gitleaks, npm/pip audit)
- Dependency review

---

## Option 1: Self-Hosted GitHub Actions Runner (RECOMMENDED — dedicated VM)

### ✅ Pros
- **Zero per-minute cost** — dedicated CI KVM (not the live Compose share)
- **Keeps existing workflows** — `LENR_CI_RUNS_ON` switches `runs-on` without dual-running hosted+self-hosted
- **Full GitHub integration** - Same UI, same approval flows
- **Isolated** - PR code does not share the production Compose host
- **Fast** - Faster builds due to local cache

### ⚠️ Cons
- Requires a separate ~2–4 vCPU / ≥8 GB RAM VM (extra Hostinger line item)
- Runner maintenance (updates, security)
- Single point of failure (unless you add more runners)

### 💰 Cost Analysis
- **Current:** $0.008/minute × ~30 minutes/PR × 20 PRs/month = **$4.80+/month**
- **With self-hosted:** **$0** Actions minutes (VM monthly cost only)
- **Savings:** ~$58/year minimum (likely more with image builds)

### 🛠️ Implementation Plan

> **Authoritative steps:** [`SELF_HOSTED_RUNNER.md`](LENR_SIM_APP_v2/docs/v0.3.7-beta/SELF_HOSTED_RUNNER.md).
> The sample SSH target below must be the **new CI VM IP**, never `185.211.4.66`.

#### Step 1: Install Runner on the dedicated CI VM (15 minutes)
```bash
ssh root@<CI_VM_IP>   # NOT 185.211.4.66

# Create runner user
useradd -m -s /bin/bash github-runner
usermod -aG docker github-runner

# Install dependencies
apt-get update
apt-get install -y curl git docker.io

# Download and install runner
cd /opt
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.320.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.320.0/actions-runner-linux-x64-2.320.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.320.0.tar.gz
chown -R github-runner:github-runner /opt/actions-runner

# Configure runner (as github-runner user)
su - github-runner
cd /opt/actions-runner
./config.sh --url https://github.com/ConsciousEnergy/lenr_sim_app \
  --token <GET_FROM_GITHUB> \
  --labels self-hosted,linux,x64,lenr-ci
```

**Get registration token:**
- Go to: https://github.com/ConsciousEnergy/lenr_sim_app/settings/actions/runners/new
- Copy the token
- Or use: `gh api repos/ConsciousEnergy/lenr_sim_app/actions/runners/registration-token --jq .token`

#### Step 2: Set Up as Systemd Service
```bash
# As root
cd /opt/actions-runner
./svc.sh install github-runner
./svc.sh start

# Check status
./svc.sh status
systemctl status actions.runner.ConsciousEnergy-lenr_sim_app.*
```

#### Step 3: Update Workflows (shipped)

Workflows already use:

```yaml
runs-on: ${{ fromJSON(vars.LENR_CI_RUNS_ON || '["self-hosted","linux","x64","lenr-ci"]') }}
```

Default fallback is lenr-ci once the runner is Idle. Optional `LENR_CI_RUNS_ON`
override (e.g. `["ubuntu-latest"]`). Do **not** dual-run hosted + self-hosted.
`deploy.yml` stays on `ubuntu-latest`.

#### Step 4: Optimize Runner Performance
```bash
# Pre-cache Docker images
docker pull python:3.12-slim
docker pull node:22-alpine
docker pull postgres:16-alpine

# Pre-install common tools
su - github-runner
pip install --user pytest pytest-cov
npm install -g npm@latest
```

### 📋 Workflow Changes Needed
Create: `.github/workflows/test-self-hosted.yml` (copy of test.yml with `runs-on: self-hosted`)

**What stays on GitHub Actions (free tier):**
- CodeQL (GitHub provides free minutes for security)
- Dependency Review (free for public repos)
- Occasional matrix testing on multiple OS (Linux, Windows, macOS)

**What moves to self-hosted:**
- All test runs
- Docker builds
- Deployments

---

## Option 2: Drone CI (Self-Hosted, Free)

### ✅ Pros
- **100% free** - Open source, self-hosted
- **Docker-native** - Every job is a container
- **Lightweight** - Lower resource usage than Jenkins
- **GitHub integration** - Good PR/commit status integration
- **Simple YAML** - Similar to GitHub Actions

### ⚠️ Cons
- Different syntax from Actions (migration effort)
- Less mature ecosystem
- No marketplace plugins
- Need to manage the Drone server

### 💰 Cost
- **Free** (self-hosted)
- **VPS overhead:** ~512MB RAM, minimal CPU

### 🛠️ Implementation
```bash
# Install Drone on VPS
docker run \
  --volume=/var/lib/drone:/data \
  --env=DRONE_GITHUB_CLIENT_ID=<your-github-oauth-app-id> \
  --env=DRONE_GITHUB_CLIENT_SECRET=<your-github-oauth-secret> \
  --env=DRONE_RPC_SECRET=<generate-random-secret> \
  --env=DRONE_SERVER_HOST=drone.conscious.energy \
  --env=DRONE_SERVER_PROTO=https \
  --publish=8080:80 \
  --publish=8443:443 \
  --restart=always \
  --detach=true \
  --name=drone \
  drone/drone:2

# Install Drone runner
docker run --detach \
  --volume=/var/run/docker.sock:/var/run/docker.sock \
  --env=DRONE_RPC_PROTO=https \
  --env=DRONE_RPC_HOST=drone.conscious.energy \
  --env=DRONE_RPC_SECRET=<same-secret> \
  --env=DRONE_RUNNER_CAPACITY=2 \
  --env=DRONE_RUNNER_NAME=runner-vps \
  --publish=3000:3000 \
  --restart=always \
  --name=runner \
  drone/drone-runner-docker:1
```

**Pipeline Example (`.drone.yml`):**
```yaml
kind: pipeline
type: docker
name: test

steps:
  - name: backend-test
    image: python:3.12-slim
    commands:
      - pip install -r requirements.txt
      - pytest tests/
  
  - name: frontend-test
    image: node:22-alpine
    commands:
      - npm ci
      - npm test
      - npm run build

trigger:
  branch:
    - main
  event:
    - push
    - pull_request
```

---

## Option 3: GitLab CI (Free Tier)

### ✅ Pros
- **400 minutes/month free** on shared runners
- **Can use self-hosted runners** for unlimited minutes
- **Better caching** than GitHub Actions
- **Integrated container registry**
- **Excellent Docker support**

### ⚠️ Cons
- Requires mirroring repo to GitLab (or moving entirely)
- Different UI/workflow than GitHub
- Team needs to learn GitLab

### 💰 Cost
- **Free tier:** 400 minutes/month
- **Premium:** $29/user/month (unlimited minutes)
- **Self-hosted:** Free + VPS resources

### 🛠️ Implementation
1. Mirror repo to GitLab (keep GitHub as source of truth)
2. Create `.gitlab-ci.yml`
3. Use GitLab CI for builds, GitHub for PRs

---

## Option 4: Hybrid Approach (GitHub + Selective Self-Hosted)

### 💡 Strategy
- **Keep expensive jobs on self-hosted:** Tests, builds, E2E
- **Keep cheap/free jobs on GitHub:** CodeQL, secret scan, dependency review
- **Use GitHub for visibility:** PR checks show in GitHub UI

### 📊 Cost Breakdown

**Current GitHub Actions Usage (estimated):**
```
Per PR:
- Version check: 1 min
- Python tests (3 versions): 3 × 8 min = 24 min
- Frontend lint/test/build: 10 min
- E2E tests: 8 min
- Formalization: 5 min
- Docker builds (on deploy): 15 min
Total: ~63 minutes per PR/deploy

Monthly (20 PRs + 10 pushes to main):
30 × 63 = 1,890 minutes
Cost: 1,890 × $0.008 = $15.12/month
Annual: ~$180
```

**With Self-Hosted (Recommended):**
```
Self-hosted: Tests, builds (0 minutes billed)
GitHub hosted: CodeQL, dependency review (free tier)
Monthly cost: $0
Annual savings: ~$180+
```

---

## Option 5: Sourcehut Builds (Alternative Platform)

### ✅ Pros
- **Simple YAML** configuration
- **Fast builds** (VPS-hosted)
- **Free for open source**
- **Lightweight** and minimal

### ⚠️ Cons
- Requires account on sr.ht
- Less integration with GitHub
- Smaller community

---

## Recommended Implementation: Hybrid Self-Hosted

### Phase 1: Immediate (This Week)
1. ✅ **Set up self-hosted runner** on your VPS
2. ✅ **Move test.yml to self-hosted** (biggest cost saver)
3. ✅ **Move deploy.yml to self-hosted** (second biggest)
4. ✅ **Keep security scans on GitHub** (often free tier)

### Phase 2: Optimization (Next Week)
5. ✅ **Add build caching** on runner (faster builds)
6. ✅ **Pre-pull Docker images** (save bandwidth)
7. ✅ **Monitor runner health** (set up alerts)

### Phase 3: Scale (Future)
8. ✅ **Add second runner** (redundancy)
9. ✅ **Consider GitLab mirror** (backup CI)

---

## Detailed Cost Comparison

| Solution | Setup Time | Monthly Cost | Annual Cost | Annual Savings |
|----------|------------|--------------|-------------|----------------|
| **Current (GitHub Actions)** | 0 | $15-30 | $180-360 | $0 |
| **Self-Hosted Runner** | 1 hour | $0 | $0 | $180-360 |
| **Drone CI** | 2 hours | $0 | $0 | $180-360 |
| **GitLab Free** | 1 hour | $0-8 | $0-96 | $84-360 |
| **Hybrid** | 1.5 hours | $0-2 | $0-24 | $156-360 |

---

## Security Considerations

### Self-Hosted Runner Risks
1. **Untrusted PRs** - Disable for public PRs from forks
2. **Secrets exposure** - Use GitHub secrets, not env files
3. **Resource exhaustion** - Set job timeouts
4. **Network access** - Firewall rules for runner

### Mitigation
```yaml
# Only run self-hosted for trusted users
jobs:
  test:
    runs-on: ${{ github.event.pull_request.head.repo.full_name == github.repository && 'self-hosted' || 'ubuntu-latest' }}
```

Or create separate workflows:
- `test.yml` - GitHub hosted (for external PRs)
- `test-trusted.yml` - Self-hosted (for internal PRs)

---

## VPS Resource Requirements

### Dedicated CI VM (not the Compose share)

Do **not** size the runner against `185.211.4.66` (VM `1280333`). Provision a
separate KVM and check it:

```bash
ssh root@<CI_VM_IP>   # NOT the share VPS
free -h
df -h
nproc
```

### Minimum Requirements for Runner
- **RAM:** 8 GB recommended (2–4 GB free under load is too tight for Playwright + Lean)
- **Disk:** ≥50 GB
- **CPU:** 2–4 vCPU
- **Network:** outbound HTTPS to GitHub + package indexes

### If Resources Are Tight
- PR Python matrix is already 3.12-only (full 3.10–3.12 on main push)
- Path filters skip e2e/matrix for docs-only PRs
- Keep deploy/image builds on GitHub-hosted

---

## Quick Start: Self-Hosted Setup

Follow [`SELF_HOSTED_RUNNER.md`](LENR_SIM_APP_v2/docs/v0.3.7-beta/SELF_HOSTED_RUNNER.md).

```bash
# 1. SSH to the dedicated CI VM (NOT 185.211.4.66)
ssh root@<CI_VM_IP>

# 2. Install runner per SELF_HOSTED_RUNNER.md (user github-runner, Docker, etc.)

# 3. Registration token from GitHub UI (short-lived; never commit)
TOKEN=...   # Settings → Actions → Runners → New self-hosted runner

# 4. Configure with exact labels
cd /opt/actions-runner
sudo -u github-runner ./config.sh \
  --url https://github.com/ConsciousEnergy/lenr_sim_app \
  --token "$TOKEN" \
  --name lenr-ci-1 \
  --labels self-hosted,linux,x64,lenr-ci

# 5. Start service
sudo ./svc.sh install github-runner
sudo ./svc.sh start

# 6. Set repo variable LENR_CI_RUNS_ON only after Idle:
#    ["self-hosted","linux","x64","lenr-ci"]
```

---

## Monitoring & Maintenance

### Health Checks
```bash
# Check runner status
systemctl status actions.runner.*

# Check disk usage
df -h /opt/actions-runner

# Check recent jobs
journalctl -u actions.runner.* -n 50

# Clean up old build artifacts
docker system prune -af --volumes
```

### Automated Cleanup (Cron)
```bash
# Add to root crontab
crontab -e

# Clean Docker weekly
0 2 * * 0 docker system prune -af --volumes

# Restart runner monthly
0 3 1 * * systemctl restart actions.runner.*
```

---

## Next Steps

1. **Review this proposal** with your team
2. **Check VPS resources** (run `free -h` and `df -h`)
3. **Choose preferred option** (recommend: Self-Hosted Runner)
4. **Schedule implementation** (1-2 hour maintenance window)
5. **Test with non-critical PR** first
6. **Monitor for 1 week** before full rollout

---

## Questions?

**How do I get the GitHub registration token?**
- GitHub repo → Settings → Actions → Runners → New self-hosted runner

**What if the runner fails?**
- GitHub falls back to queuing (won't block PRs)
- Or set up `runs-on: [self-hosted, ubuntu-latest]` as fallback

**Can I use multiple runners?**
- Yes! Add more for parallel builds or redundancy

**What about security?**
- Self-hosted runners are isolated from GitHub's network
- Use secrets properly, don't expose credentials

---

**Prepared by:** Cursor AI Assistant  
**Date:** September 24, 2026  
**For:** LENR Sim App Team (UMLENR Project)
