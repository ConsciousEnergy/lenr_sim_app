# Operator: ship tip of main to Compose share (post #196/#197)

Cloud agents cannot `workflow_dispatch` Build and Deploy (HTTP 403) and have no
VPS SSH key. After squash-merging science/infra PRs to `main`, an operator must
ship so KM auto reaches the public Compose URL.

## Live status (agent probe 2026-09-16)

| Check | Result |
|-------|--------|
| `GET /api/health` | `version=0.3.7-beta`, healthy |
| `POST /api/physics/bubble-fusion` with `dynamics_mode=auto` | Live returns `dynamics_mode_used=legacy`, `km_auto_selected=false` |
| Conclusion | **#196 KM auto is on `main` but NOT yet live on Compose share** |

Evidence: `/opt/cursor/artifacts/live_bf_km_probe.json` (agent workspace).

## Operator ship

```bash
# From a machine with deploy rights:
gh workflow run "Build and Deploy" --ref main
# or SSH + BUILD_LOCALLY / IMAGE_TAG deploy via infrastructure/vps/scripts/deploy.sh

EXPECT_VERSION="$(grep -oP 'APP_VERSION: str = "\K[^"]+' LENR_SIM_APP_v2/backend/app/core/config.py)" \
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh
```

After ship, re-probe with high drive (~4 bar) and confirm:
- `dynamics.dynamics_mode_requested == "auto"`
- when peak Mach ≥ 0.3: `km_auto_selected` / `dynamics_mode_used == "keller_miksis"`

#196 (KM auto) and #197 (infra prep) landed on `main` 2026-09-16.
APP_VERSION on tip may still read `0.3.7-beta` until the 0.3.8 version bump;
ship still required for KM auto behavior.
