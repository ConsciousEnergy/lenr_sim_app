# Branching note — `v0.3.7-beta` development line

**Status:** **Closed.** The governance / maturity pack shipped on `main` and is
tagged `v0.3.7-beta`. The temporary exception to trunk-only is superseded by the
**main + `dev`** model in [`.github/BRANCHING.md`](../../../.github/BRANCHING.md).

## Current trains

| Branch | Markers | Role |
|--------|---------|------|
| `main` | `0.3.7-beta` | Live Compose release line (this train) |
| `dev` | `0.3.8-beta` | Integration for Swarm prep / next science |

See [`../v0.3.8-beta/VERSION_CONTROL.md`](../v0.3.8-beta/VERSION_CONTROL.md).

## Historical note

Cursor agents used `consciousenergy/v0.3.7-beta-98d8` (and topic
`consciousenergy/v037-*-98d8` heads) to land the governance pack before the
long-lived `dev` branch existed. That exception is no longer needed.

## Rules that still apply

- Hotfixes for the live share: short-lived PR → **`main`**, markers stay `0.3.7-beta`.
- New 0.3.8 work: short-lived PR → **`dev`**.
- Version lives in the four `APP_VERSION` markers, not only in branch names.
- Do not reopen version-named long-lived release branches.
