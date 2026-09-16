# Operator: ship tip of main to Compose share (post #196/#197)

## Live status (agent probe 2026-09-16T18:41Z)

| Check | Result |
|-------|--------|
| Share host | `https://lenr-sim-beta.conscious.energy` (healthy, `version=0.3.7-beta`) |
| `GET /api/physics/bubble-fusion/defaults` | `dynamics_mode=legacy`; options **lack** `auto` |
| `POST …/bubble-fusion` `dynamics_mode=auto` @ 4 bar | Still `dynamics_mode_used=legacy`, `km_auto_selected=false` |
| Conclusion | **#196/#198 on `main` + GHCR; Compose share not yet pulled** |

Evidence: `/opt/cursor/artifacts/live_bf_defaults.json`, `live_bf_km_probe_now.json`.

P0 fidelity squash-merged as #198 (`6d1f44d`).

## What already ran automatically on merge

Push to `main` triggers `Build and Deploy` **image build only**:

| Run | Event | build-* | `deploy-vps` |
|-----|-------|---------|--------------|
| [#196 merge](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/35129116154) | push/main | success | **skipped** (`if: workflow_dispatch`) |
| [#197 merge](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/35129159390) | push/main | success | **skipped** |

So GHCR tags `0.3.7-beta` / `latest` already contain KM auto. The VPS job never
runs on push — it requires a manual `workflow_dispatch`.

## Blockers for this cloud agent

- `gh workflow run "Build and Deploy" --ref main` → **HTTP 403** (token cannot dispatch)
- No `VPS_SSH_KEY` / SSH key mounted in the agent environment

## Operator ship (preferred helper)

From a machine with `workflow_dispatch` rights and repo secrets `VPS_HOST` +
`VPS_SSH_KEY` set:

```bash
# Plan / preflight
./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh check

# Dispatch deploy-vps on main, wait, verify-beta-share
CONFIRM=I_SHIP_VPS_0_3_8 EXECUTE=1 \
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ship
```

Equivalent one-liner:

```bash
gh workflow run "Build and Deploy" --ref main
# Watch: gh run list --workflow "Build and Deploy" --limit 3
# Verify:
EXPECT_VERSION=0.3.7-beta \
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh
```

(Or SSH + `IMAGE_TAG=0.3.7-beta` via `infrastructure/vps/scripts/deploy.sh`.)

### Post-ship probe

High drive (~4 bar). Expect:

- `dynamics.dynamics_mode_requested == "auto"`
- when peak Mach ≥ 0.3: `km_auto_selected` true / `dynamics_mode_used == "keller_miksis"`

APP_VERSION on tip may still read `0.3.7-beta` until the 0.3.8 version bump;
ship still required for KM auto behavior on the public URL.
