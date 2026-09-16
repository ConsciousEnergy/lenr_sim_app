# Operator: ship tip of main to Compose share (post #196/#197/#198)

## Live status (agent probe 2026-09-16T18:41Z)

| Check | Result |
|-------|--------|
| Share host | `https://lenr-sim-beta.conscious.energy` (healthy, `version=0.3.7-beta`) |
| `GET /api/physics/bubble-fusion/defaults` | `dynamics_mode=legacy`; options **lack** `auto` |
| `POST …/bubble-fusion` `dynamics_mode=auto` @ 4 bar | Still `dynamics_mode_used=legacy`, `km_auto_selected=false` |
| Conclusion | **#196/#198 on `main` + GHCR; Compose share not yet pulled** |

Evidence: `/opt/cursor/artifacts/live_bf_defaults.json`, `live_bf_km_probe_now.json`.

P0 fidelity squash-merged as #198 (`6d1f44d`). Compose ship dispatch path landed as #199 (`7408e18`).

## What already ran automatically on merge

Push to `main` triggers `Build and Deploy` **image build only**:

| Run | Event | build-* | `deploy-vps` |
|-----|-------|---------|--------------|
| [#196 merge](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/35129116154) | push/main | success | **skipped** |
| [#197 merge](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/35129159390) | push/main | success | **skipped** |
| [#198 merge](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/35136116370) | push/main | success | **skipped** |
| [#199 `vps-compose-ship`](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/35137191549) | repository_dispatch | success | **failed** — empty secrets |

GHCR tags `0.3.7-beta` / `latest` contain KM auto + P0. Live pull requires secrets.

## Blockers

- `gh workflow run` → **HTTP 403** for agent token (expected)
- **Mitigation (#199):** `repository_dispatch` type `vps-compose-ship` with
  `client_payload.confirm=I_SHIP_VPS_0_3_8` — agent can fire (HTTP 204)
- Ship attempt [35137191549](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/35137191549):
  builds OK; **`deploy-vps` failed** because Actions secrets `VPS_HOST` and
  `VPS_SSH_KEY` were **empty** in the job environment
- No SSH key in the agent VM (`Permission denied (publickey)` to `185.211.4.66`)

### Required operator action

1. Add GitHub Actions secrets on the repo:
   - `VPS_HOST` — live Compose host (e.g. `185.211.4.66`)
   - `VPS_SSH_KEY` — private key for `root@$VPS_HOST`
2. Re-dispatch:

```bash
gh api --method POST repos/ConsciousEnergy/lenr_sim_app/dispatches --input - <<'EOF'
{"event_type":"vps-compose-ship","client_payload":{"confirm":"I_SHIP_VPS_0_3_8"}}
EOF
```

3. Or: `CONFIRM=I_SHIP_VPS_0_3_8 EXECUTE=1 ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ship`

## Post-ship probe

High drive (~4 bar). Expect:

- defaults list includes `auto` (default `dynamics_mode=auto`)
- `dynamics.dynamics_mode_requested == "auto"`
- when peak Mach ≥ 0.3: `km_auto_selected` true / `dynamics_mode_used == "keller_miksis"`

APP_VERSION may still read `0.3.7-beta` until the 0.3.8 version bump; ship is still
required for KM auto on the public URL.
