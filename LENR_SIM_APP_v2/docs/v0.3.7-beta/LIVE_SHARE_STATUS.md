# Live share status (v0.3.8-beta Compose VPS)

Probed **2026-10-20** during the Compose promote to **v0.3.8-beta**. Public
Compose+Caddy share is the **v0.3.8-beta** release line on `main`. Swarm /
Traefik / Cloudflare Pages cutover remains **out of scope** until
`CONFIRM_SWARM_0_3_9` (see v0.3.8 / v0.3.9 docs).

## What works today (share this)

| URL | DNS | `/api/health` | App version reported |
|-----|-----|---------------|----------------------|
| `https://lenr-sim-beta.conscious.energy` | **A → `185.211.4.66`** (VPS `1280333`) | **200** healthy, DB connected | **`0.3.8-beta`** after ship (was `0.3.7-beta` pre-promote) |
| `https://srv1280333.hstgr.cloud` | Hostinger host | **200** when healthy | same as share |

**Shareable link for testers:**  
https://lenr-sim-beta.conscious.energy  

Operator probe:

```bash
EXPECT_VERSION=0.3.8-beta \
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh
# or:
curl -fsS https://lenr-sim-beta.conscious.energy/api/health | jq .
```

Post-ship probe (2026-10-20T23:24Z): `status=healthy`, `version=0.3.8-beta`,
`database.connected=true`; `/models/` and `/methodology.html` HTTP 200; BF
`dynamics_mode=auto` with KM auto selected at high drive. Compose pull used
`BUILD_LOCALLY=1` on VPS from promote tip (PR #251); tag `v0.3.8-beta` on
`main` still pending merge for GHCR Actions publish.

## Release line vs tip

| Surface | Ref | Notes |
|---------|-----|-------|
| Git tag / Release | `v0.3.8-beta` | Annotated tag on `main` after Compose promote |
| `main` tip | `0.3.8-beta` markers | Compose share ship line; ARA Wave 1 + deps |
| Live Compose share | operator-shipped from `main` / tags | Deploy via `VPS_*` / SSH — **not** auto from bare push |
| `dev` | `0.3.8-beta` integration | Never auto-deployed; Swarm staging prep / science |

## Intended public name — still blocked by DNS

| URL | DNS today | Result |
|-----|-----------|--------|
| `https://lenr-simp-app.conscious.energy` | **CNAME → `conscious.energy`** (WordPress) | Does **not** reach the VPS |

Keep sharing **`lenr-sim-beta`** until an announced apex cutover under the
v0.3.9 confirm path. See
[`../v0.3.8-beta/DNS_AND_HOSTINGER_DECISIONS.md`](../v0.3.8-beta/DNS_AND_HOSTINGER_DECISIONS.md).

## CI placement (must stay true)

| Host | Role |
|------|------|
| Share `1280333` / `185.211.4.66` | Compose beta only — **no** `.runner` |
| CI `2012566` / `45.93.100.251` | `lenr-ci-1` (`self-hosted,linux,x64,lenr-ci`) |

Never put `VPS_*` on `lenr-ci` PR jobs. Runbook:
[`SELF_HOSTED_RUNNER.md`](./SELF_HOSTED_RUNNER.md).

## Honesty (unchanged)

- `lenr_proved` remains **false**
- All `EQ-OPEN-*` stay **OPEN**
- Research-preview only — not a laboratory or energetic-freedom claim
