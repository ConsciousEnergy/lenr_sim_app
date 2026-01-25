# Instructions to Commit and Create PR

## Step 1: Remove Git Lock File

Open PowerShell and run:

```powershell
# Remove the lock file
Remove-Item C:\Users\brand\LENR_SIM_APP\.git\index.lock -ErrorAction SilentlyContinue

# Verify it's gone
Test-Path C:\Users\brand\LENR_SIM_APP\.git\index.lock
# Should return: False
```

## Step 2: Stage and Commit Changes

```powershell
cd C:\Users\brand\LENR_SIM_APP

# Stage all changes
git add -A

# Verify what will be committed
git status

# Commit with message
git commit -m "docs: Add Hybrid K8s migration strategy and comprehensive Phase 4 deployment guide

- Add ARCHITECTURE.md with Hybrid Kubernetes migration strategy (3-phase approach)
- Add PHASE4_DOCKER_SWARM_DEPLOYMENT.md with detailed 16-step deployment guide
- Update DEPLOYMENT.md and infrastructure/README.md with cross-references
- Update PR_DESCRIPTION_v0.2.1-beta.md with new documentation references"
```

## Step 3: Push Branch

```powershell
# Push to remote
git push origin lenr_sim_app_v0.2.1-beta
```

## Step 4: Create Pull Request

```powershell
# Create PR using GitHub CLI
gh pr create \
  --title "v0.2.1-beta: Physics Documentation, Infrastructure as Code, and Architecture Planning" \
  --body-file PR_DESCRIPTION_v0.2.1-beta.md \
  --base lenr_sim_app_v0.2-beta
```

Or create PR via GitHub web interface:
1. Go to: https://github.com/ConsciousEnergy/lenr_sim_app/compare/lenr_sim_app_v0.2-beta...lenr_sim_app_v0.2.1-beta
2. Click "Create pull request"
3. Copy content from PR_DESCRIPTION_v0.2.1-beta.md into the description
4. Submit the PR
