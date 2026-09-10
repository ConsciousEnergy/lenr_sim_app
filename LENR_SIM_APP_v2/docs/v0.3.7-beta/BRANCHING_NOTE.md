# Branching note — `v0.3.7-beta` development line

**Status:** Exception to trunk-only policy in [`.github/BRANCHING.md`](../../../.github/BRANCHING.md).

## Why an exception

The v0.3.7-beta train is a **governance / maturity** development line (physics
ledger, Beta UI labels, deferred multiphysics queue, proof matrix). It needs a
stable integration tip for docs + UI work before squash-merge to `main`.

## Agent naming vs long-lived line

Cursor Cloud agents must use `consciousenergy/<topic>-98d8`. This train’s
working branch is therefore:

- **`consciousenergy/v0.3.7-beta-98d8`** — PR head implementing the v0.3.7-beta
  governance pack (tracks the “v0.3.7-beta” product train).

Optional long-lived ref `v0.3.7-beta` may be created from `main` for human
operators; agents continue to open topic PRs with the `consciousenergy/…-98d8`
prefix against `main` (or against `v0.3.7-beta` if that ref is published).

## Rules that still apply

- Prefer short-lived topic branches off this train for subsequent work:
  `consciousenergy/v037-<topic>-98d8`.
- Squash-merge to `main` when the governance pack is ready; do not leave the
  exception open indefinitely.
- Version lives in the four `APP_VERSION` markers, not only in the branch name.

## GitHub Milestone

Milestone **`v0.3.7-beta`** should track P0–P3 ledger rows. Creating milestones
requires org write scope; if the agent token returns HTTP 403, a maintainer
should create the milestone manually and link issues to this docs pack.
