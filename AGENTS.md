# Agent guidance (LENR_SIM_APP)

Preferences for Cursor agents and human contributors working in this repo.

## Pull requests and GitHub Actions cost

GitHub Actions minutes are a **financial constraint** for this org. Prefer
**dense, batched PRs** over micro-PRs that each burn a full CI matrix.

- **Batch related work** into one PR when changes share a topic (e.g. VPS
  handoff docs + unlock scripts + ship helpers for the same milestone).
- **Avoid Actions-churning micro-PRs** (one-line docs, tiny script tweaks,
  sequential “follow-up” PRs that could have been one commit).
- **Still keep PRs coherent** — do not mix unrelated features, science
  changes, and infra in one PR just to save runs. Prefer one *dense topic*
  over one *tiny change*.
- **Run gates locally first** when Actions is blocked or expensive:
  - version markers: same check as `.github/workflows/test.yml`
    `version-consistency`
  - backend tests / frontend build for code you touched
  - release-quality-gate skill when cutting a release
- **CodeRabbit** (when enabled) is for review only — it does **not** replace
  required Actions checks (`version-consistency`, tests, secret scan,
  dependency-review). Local green + dense PRs reduce spend; org billing
  still must allow Actions when those checks are required to merge.
- When Actions jobs fail at **0 steps** with a billing/spending-limit
  message, do not “fix” the PR for that — escalate org **Billing & plans**,
  then rerun.

See also: [`.github/BRANCHING.md`](.github/BRANCHING.md).

## Cursor Cloud specific instructions

- Prefer local/script verification over re-running full GitHub Actions for
  every iteration while Actions billing is constrained.
- Do not treat tip/`BETA_SHARE_URL` alone as proof for Compose KM ship;
  public `LIVE_COMPOSE_URL` + `verify-v038-exit.sh` remain authoritative for
  that gate when relevant.
