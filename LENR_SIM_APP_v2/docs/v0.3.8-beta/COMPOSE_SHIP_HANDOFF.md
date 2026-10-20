# Operator: ship tip of main to Compose share (v0.3.8-beta)

**Goal:** pull GHCR `IMAGE_TAG=0.3.8-beta` onto the public Compose+Caddy share
at `https://lenr-sim-beta.conscious.energy`. **No Swarm apply.** Confirm string
`I_SHIP_VPS_0_3_8` is historical naming for Compose ship, not Swarm cutover.

## Current target (2026-10-20)

| Item | Value |
|------|-------|
| Share URL | `https://lenr-sim-beta.conscious.energy` |
| DNS | `A → 185.211.4.66` (VPS `1280333`) — leave alone |
| Expected `/api/health` version after ship | **`0.3.8-beta`** |
| BF defaults | already includes `dynamics_mode=auto` on live 0.3.7 |
| Compose/Caddy topology | unchanged vs 0.3.7 (no `docker-compose` / Caddy diff in promote) |
| Backend image base | **`python:3.12-slim`** (3.14 Dependabot bump held — scipy wheels) |
| Swarm | **do not** run `CONFIRM_SWARM_0_3_8` / `CONFIRM_SWARM_0_3_9` against share |

Rollback: [`ROLLBACK_AND_STAGING_CHECKLIST.md`](./ROLLBACK_AND_STAGING_CHECKLIST.md)
(prior tag / `.rollback-image-tag`).

## Preferred ship paths

### A. SSH deploy on share (after `main` has 0.3.8 markers + GHCR images)

```bash
cd /opt/lenr-sim/src
git fetch --prune origin && git checkout -qf origin/main
LENR_ENV_FILE=/opt/lenr-sim/.env \
  IMAGE_TAG=0.3.8-beta UPDATE_ENV_IMAGE_TAG=1 EXPECT_VERSION=0.3.8-beta \
  bash LENR_SIM_APP_v2/infrastructure/vps/scripts/deploy.sh
```

### B. Agent / laptop helper (requires authorized `VPS_SSH_KEY` or identity file)

```bash
CONFIRM=I_SHIP_VPS_0_3_8 EXECUTE=1 \
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ssh-ship
```

### C. GitHub Actions (secrets `VPS_HOST` + `VPS_SSH_KEY`)

```bash
# Cheap redeploy when GHCR already has 0.3.8-beta:
gh api --method POST repos/ConsciousEnergy/lenr_sim_app/dispatches --input - <<'EOF'
{"event_type":"vps-compose-redeploy","client_payload":{"confirm":"I_SHIP_VPS_0_3_8"}}
EOF

# Full rebuild + deploy:
gh api --method POST repos/ConsciousEnergy/lenr_sim_app/dispatches --input - <<'EOF'
{"event_type":"vps-compose-ship","client_payload":{"confirm":"I_SHIP_VPS_0_3_8"}}
EOF
```

Push to `main` / tag `v0.3.8-beta` builds GHCR images; `deploy-vps` still needs
secrets or path A/B.

## Post-ship verification

```bash
EXPECT_VERSION=0.3.8-beta \
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh
curl -fsS https://lenr-sim-beta.conscious.energy/api/health | jq .version
curl -fsSI https://lenr-sim-beta.conscious.energy/models/ | head -5
./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh probe-km
```

Expect: `version=0.3.8-beta`, `/models/` 200, BF `dynamics_mode=auto` still present.

## Historical notes (0.3.7 / KM auto unlock)

Earlier windows (2026-09) blocked on VPS pubkey unlock while tip already had
`dynamics_mode=auto`. By 2026-10-04 live share advertised `auto` while markers
still read `0.3.7-beta`. The remaining gap for this handoff is the **0.3.8
marker + ARA/static pages + deps** Compose pull — not KM auto discovery.

Legacy unlock portal / pubkey one-liners / Hostinger token drop paths remain in
git history and older agent artifacts; prefer paths A–C above once `VPS_*` or
SSH works.
