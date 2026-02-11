# Worktree branch sync guide

## Error: "Unable to read file '...\\jie\\...\\WORKTREE_SYNC.md' (nonexistent file)"

This usually means **Cursor is trying to apply changes from a worktree that was removed** (e.g. `jie`). The worktree folder no longer exists, so the path fails.

**Fix (pick one):**

1. **Re-create the missing worktree** so the path exists (then apply again; you can remove the worktree afterward if you like). Run from the **main repo** in a normal terminal (not inside a Cursor sandbox). The branch may already be checked out in the main repo, so use the **commit hash** (detached HEAD) instead of the branch name:
   ```powershell
   cd C:\Users\brand\LENR_SIM_APP
   git worktree list
   git fetch origin
   # Use commit hash so the branch can stay checked out in the main repo
   git worktree add "C:\Users\brand\.cursor\worktrees\LENR_SIM_APP\jie" 6e387db4c32feeda85c543935ca38654733934dd
   ```
   To get the current branch commit if it has moved: `git rev-parse lenr_sim_app_v0.2.3-beta`  
   After "Apply worktree to current branch" succeeds, you can remove the worktree again:  
   `git worktree remove "C:\Users\brand\.cursor\worktrees\LENR_SIM_APP\jie"`

2. **Cancel the apply** and work in a worktree that still exists (e.g. open the main repo or another worktree like `fcj` / `zek`) so Cursor isn’t referencing the deleted worktree.

---

When "Apply worktree to current branch" fails with **Unable to read file '...\\hkt\\...\\TheoryPaperPage.jsx' (nonexistent file)**, the worktree (e.g. `hkt`) is likely at an older commit that doesn’t contain that file. Syncing that worktree to the same commit as `lenr_sim_app_v0.2.3-beta` fixes it.

## Current setup

- **Main repo:** `C:\Users\brand\LENR_SIM_APP` → branch `lenr_sim_app_v0.2.3-beta` (commit `f0b8d0a`)
- **Other worktrees** (jie, joh, lzx, etc.): detached HEAD at `f0b8d0a` (same tree as the branch)
- Each branch can be checked out in only **one** worktree at a time, so extra worktrees stay in detached HEAD at the desired commit.

## Option C: Sync so a worktree has the same files as the branch

### If the worktree **does not exist** (e.g. you removed `hkt`)

From the **main repo** (e.g. `C:\Users\brand\LENR_SIM_APP`), create a new worktree at the same commit as the branch (detached at that commit):

```powershell
cd C:\Users\brand\LENR_SIM_APP
git worktree add C:\Users\brand\.cursor\worktrees\LENR_SIM_APP\hkt f0b8d0a
```

This creates `hkt` with the same files as `lenr_sim_app_v0.2.3-beta`, including `TheoryPaperPage.jsx`.

### If the worktree **already exists** but is on an old commit (e.g. `hkt` exists and is missing the file)

1. Open a terminal and go to the **main repo**:
   ```powershell
   cd C:\Users\brand\LENR_SIM_APP
   ```

2. Update refs (optional but recommended):
   ```powershell
   git fetch origin
   ```

3. Go into the worktree that’s missing the file (e.g. `hkt`):
   ```powershell
   cd C:\Users\brand\.cursor\worktrees\LENR_SIM_APP\hkt
   ```

4. Move that worktree to the same commit as `lenr_sim_app_v0.2.3-beta` (stash or commit local changes first if you need to keep them):
   ```powershell
   git checkout f0b8d0a
   ```
   Or, to match the branch by name after fetching:
   ```powershell
   git fetch origin lenr_sim_app_v0.2.3-beta
   git checkout origin/lenr_sim_app_v0.2.3-beta
   ```
   That puts the worktree in detached HEAD at the same commit as the branch, so all files (including `TheoryPaperPage.jsx`) are present.

5. Confirm the file exists:
   ```powershell
   Test-Path "LENR_SIM_APP_v2\frontend\src\pages\TheoryPaperPage.jsx"
   ```
   Should output `True`.

### If `hkt` is not in `git worktree list`

Run from the main repo:

```powershell
cd C:\Users\brand\LENR_SIM_APP
git worktree list
```

If `hkt` doesn’t appear, it’s not a worktree anymore. Use the “If the worktree does not exist” section above to add it again at `f0b8d0a`.

## Summary

- **Missing file in a worktree** → that worktree is on an older commit. Check out commit `f0b8d0a` (or `origin/lenr_sim_app_v0.2.3-beta`) in that worktree so it has the same tree as the beta branch.
- **Recreating `hkt`** → from the main repo:  
  `git worktree add C:\Users\brand\.cursor\worktrees\LENR_SIM_APP\hkt f0b8d0a`

After syncing, "Apply worktree to current branch" should no longer fail on the missing `TheoryPaperPage.jsx` path.
