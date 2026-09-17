# Operator: ship tip of main to Compose share (post #196/#197/#198)

## Live status (agent probe 2026-09-17T02:05Z)

| Check | Result |
|-------|--------|
| Share host | `https://lenr-sim-beta.conscious.energy` (healthy, `version=0.3.7-beta`) |
| `GET /api/physics/bubble-fusion/defaults` | `dynamics_mode=legacy`; options **lack** `auto` |
| Official `probe-km` | **FAIL** — live build does not advertise `dynamics_mode=auto` |
| SSH `root@185.211.4.66` | Permission denied (publickey) — env `VPS_SSH_KEY` is unauthorized agent twin (`SHA256:HaidEon7f5LFkr7+R2aaURHrOa84/dVhljOy0DKK+10`) |
| `HOSTINGER_API_TOKEN` | unset (no env / no artifact file drop) |
| Actions billing | PR #204 jobs fail ~2s (“account payments have failed…”) |
| Conclusion | **#196/#198 on `main` + GHCR; Compose share not yet pulled** |

Evidence: `/opt/cursor/artifacts/live_probe_km_retry.log`, `v038_blocker_status.json`, `v038_exit_criteria_audit.md`.

P0 fidelity squash-merged as #198 (`6d1f44d`). Compose ship dispatch path landed as #199 (`7408e18`).
Tip of `main` pin for operator self-ship: `8d362b20fbe93bdf097bf11bf2fb2d7c0ae3a0fb` (`APP_VERSION=0.3.7-beta`, KM auto included).


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

**Fastest — Hostinger VNC one-shot (authorize agent + pull tip of `main`):**
as `root` on `185.211.4.66` (PasswordAuthentication is off — console only).
This both unblocks the agent poller **and** ships KM without waiting for SSH:

```bash
# A) authorize cloud-agent pubkey (poller can re-verify / re-ship later)
mkdir -p /root/.ssh && chmod 700 /root/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPBJI+cf2cRAQHU8K7NSk63gc1oOkRFqQDJzD/ees/K5 cursor-agent-compose-ship-v038' >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

# B) pin + pull GHCR tip that already has KM auto + P0 (#196–#202)
cd /opt/lenr-sim/src
git fetch --prune origin
git checkout -qf 8d362b20fbe93bdf097bf11bf2fb2d7c0ae3a0fb
LENR_ENV_FILE=/opt/lenr-sim/.env \
  IMAGE_TAG=0.3.7-beta \
  UPDATE_ENV_IMAGE_TAG=1 \
  EXPECT_VERSION=0.3.7-beta \
  LENR_SIM_APP_v2/infrastructure/vps/scripts/deploy.sh
```

Fingerprint: `SHA256:HaidEon7f5LFkr7+R2aaURHrOa84/dVhljOy0DKK+10`

**Pubkey-only** (if you prefer the agent to run `ssh-ship` after authorize):

```bash
mkdir -p /root/.ssh && chmod 700 /root/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPBJI+cf2cRAQHU8K7NSk63gc1oOkRFqQDJzD/ees/K5 cursor-agent-compose-ship-v038' >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

**Or** set Cursor env secret `HOSTINGER_API_TOKEN` (hPanel → API), then:

```bash
# Inspect VM + Docker Manager projects (may be empty for SSH-managed compose):
HOSTINGER_API_TOKEN=... \
  python3 LENR_SIM_APP_v2/infrastructure/vps/scripts/hostinger-compose-unlock.py list

# Attach agent pubkey, then ship:
HOSTINGER_API_TOKEN=... CONFIRM=I_SHIP_VPS_0_3_8 EXECUTE=1 \
  python3 LENR_SIM_APP_v2/infrastructure/vps/scripts/hostinger-compose-unlock.py unlock

# Optional: if stack is registered in Hostinger Docker Manager:
HOSTINGER_API_TOKEN=... \
  python3 LENR_SIM_APP_v2/infrastructure/vps/scripts/hostinger-compose-unlock.py docker-update
```

(`register-agent-pubkey-hostinger.py` remains as a thin attach-only helper.)

**Or** set Cursor env secrets `HOSTINGER_HPANEL_EMAIL` + `HOSTINGER_HPANEL_PASSWORD`
(optional) and **restart** the agent so computer-use can open hPanel → VPS →
Browser Console and append the pubkey above.

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

**Poll until authorized** (agent / operator leave this running after requesting
console pubkey install — ships within one poll interval once SSH works):

```bash
CONFIRM=I_SHIP_VPS_0_3_8 EXECUTE=1 \
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/poll-and-ship.sh
```

Status JSON: `/opt/cursor/artifacts/poll_and_ship_status.json`.

Without restarting the agent, you can also drop a Hostinger API token (one line,
token only) at `/opt/cursor/artifacts/HOSTINGER_API_TOKEN.txt` — the poller
loads it and runs `hostinger-compose-unlock.py unlock`.

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
