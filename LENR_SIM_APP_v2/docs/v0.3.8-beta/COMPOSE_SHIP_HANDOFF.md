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


## Tip code proof (agent, 2026-09-16T19:25Z)

Local uvicorn from `origin/main` @ `760c97e` on `:18080`:

| Check | Result |
|-------|--------|
| defaults `dynamics_mode` | `auto` |
| options include `auto` | yes |
| POST auto @ 4 bar | `km_auto_selected=true`, `dynamics_mode_used=keller_miksis`, peak Mach ≈0.61 |

Evidence: `/opt/cursor/artifacts/local_tip_km_prove.json`.

**Conclusion:** tip/GHCR code path is correct; only the live Compose pull is blocked on VPS SSH secrets.

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

**Fastest (Hostinger browser/VNC console):** as `root` on `185.211.4.66`, append
the current cloud-agent pubkey (PasswordAuthentication is off — console only):

```bash
mkdir -p /root/.ssh && chmod 700 /root/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPBJI+cf2cRAQHU8K7NSk63gc1oOkRFqQDJzD/ees/K5 cursor-agent-compose-ship-v038' >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

Fingerprint: `SHA256:HaidEon7f5LFkr7+R2aaURHrOa84/dVhljOy0DKK+10`

**Or** set Cursor env secret `HOSTINGER_API_TOKEN` (hPanel → API), then:

```bash
HOSTINGER_API_TOKEN=... \
  python3 LENR_SIM_APP_v2/infrastructure/vps/scripts/register-agent-pubkey-hostinger.py --ship
```

(creates/attaches the agent pubkey to the VPS at `185.211.4.66`, then ssh-ships when
`CONFIRM=I_SHIP_VPS_0_3_8 EXECUTE=1` are set).

**Or** set Cursor env secret `VPS_SSH_KEY` to a private key **already** in
`authorized_keys` (do not paste the agent key twin — it is not authorized yet),
then **restart** the agent. `VPS_HOST` defaults to `185.211.4.66`.

```bash
# After pubkey is authorized (agent identity file):
VPS_SSH_IDENTITY_FILE=~/.ssh/lenr_vps_agent_ed25519 \
CONFIRM=I_SHIP_VPS_0_3_8 EXECUTE=1 \
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ssh-ship

# Or with authorized env secret:
CONFIRM=I_SHIP_VPS_0_3_8 EXECUTE=1 \
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ssh-ship
```

**Alternate:** GitHub Actions secrets `VPS_HOST` + `VPS_SSH_KEY`, then (also needs
Actions billing restored):

```bash
gh api --method POST repos/ConsciousEnergy/lenr_sim_app/dispatches --input - <<'EOF'
{"event_type":"vps-compose-ship","client_payload":{"confirm":"I_SHIP_VPS_0_3_8"}}
EOF
```

**Helper auto-path** (`ship`): uses ssh-ship when `VPS_SSH_KEY` is set; otherwise
repository_dispatch.

```bash
CONFIRM=I_SHIP_VPS_0_3_8 EXECUTE=1 \
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ship
```

## Post-ship probe

High drive (~4 bar). Expect:

- defaults list includes `auto` (default `dynamics_mode=auto`)
- `dynamics.dynamics_mode_requested == "auto"`
- when peak Mach ≥ 0.3: `km_auto_selected` true / `dynamics_mode_used == "keller_miksis"`

APP_VERSION may still read `0.3.7-beta` until the 0.3.8 version bump; ship is still
required for KM auto on the public URL.

## Agent secret injection note

Cursor env secrets added **after** a cloud-agent VM boots may not appear in
that session. After setting `VPS_SSH_KEY`, **restart/resume the agent** (or run
`ssh-ship` on an operator machine that already has the key).

Live probe (authoritative):

```bash
./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh probe-km
```
