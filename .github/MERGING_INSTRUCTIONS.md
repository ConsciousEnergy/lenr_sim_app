# Merging v0.3.6-beta into main — Instructions for Public Launch

This document describes how to merge the release branch into `main` and handle common issues.

---

## Current Status

`main` and the release branch (e.g. `lenr_sim_app_v0.3.6-beta`) **share a common ancestor**. A standard PR from the release branch to `main` will work correctly. Use **Option A** (Standard Merge) below.

### Verify locally

```powershell
git fetch origin
git merge-base origin/main origin/lenr_sim_app_v0.3.6-beta
# Should return a commit hash (shared ancestor exists)
```

---

## Option A: Standard Merge (Recommended)

Best practice for most teams. **This is the recommended approach for v0.3.6-beta.**

1. Create PR: `lenr_sim_app_v0.3.6-beta` → `main`
2. Verify CI passes (backend + frontend jobs)
3. Review the PR description and checklist
4. Use **Create a merge commit** to preserve full history (recommended for release merges)
5. Tag the release: `git tag v0.3.6-beta && git push origin v0.3.6-beta`
6. Optionally create a GitHub Release from the tag with notes from CHANGELOG

---

## Option B: Reset main to Match Release (Force Push)

Use **only** when:
- You want `main` to exactly match the release branch for a clean public launch
- The current `main` contains work that should be discarded or moved elsewhere
- You have confirmed with the team

### Steps (run from repo root)

```bash
# 1. Ensure you have the latest
git fetch origin

# 2. Create a backup of main (optional safety)
git branch main-backup origin/main

# 3. Check out main and reset to the release branch
git checkout main
git reset --hard origin/lenr_sim_app_v0.3.6-beta

# 4. Force push (OVERWRITES remote main)
git push --force-with-lease origin main
```

> **`--force-with-lease`** is safer than `--force`: it fails if someone else has pushed to `main` since your fetch.

### After force push
- `main` will match `lenr_sim_app_v0.3.6-beta` exactly
- No PR needed; the release is now on main
- Tag the release: `git tag v0.3.6-beta && git push origin v0.3.6-beta`

---

## Option C: Merge with Conflict Resolution

If `main` has commits you want to keep:

1. Create PR: `lenr_sim_app_v0.3.6-beta` → `main`
2. If there are conflicts, resolve them locally:
   ```bash
   git checkout lenr_sim_app_v0.3.6-beta
   git fetch origin main
   git merge origin/main
   # Resolve conflicts in your editor
   git add .
   git commit -m "Merge main into release branch"
   git push origin lenr_sim_app_v0.3.6-beta
   ```
3. The PR will update; complete the merge on GitHub

---

## Industry Best Practices

| Practice | Recommendation |
|----------|----------------|
| **Force push to main** | Avoid in shared repos; use only for controlled release workflows |
| **Protected branches** | Enable branch protection on `main` (require PR, reviews, status checks) |
| **Semantic versioning** | Tag releases: `v0.3.6-beta`, `v0.3.6`, etc. |
| **CHANGELOG** | Keep CHANGELOG.md updated; reference in PR |
| **Release notes** | Use GitHub Releases for public downloads and notes |

---

## Post-Merge Checklist

- [ ] Tag release: `git tag v0.3.6-beta && git push origin v0.3.6-beta`
- [ ] Create GitHub Release (optional) with notes from CHANGELOG
- [ ] Rebuild and deploy from `main`
- [ ] Smoke test production
