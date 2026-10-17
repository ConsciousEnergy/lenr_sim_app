# Live share status (v0.3.7-beta VPS)

Probed **2026-10-13** (healthy) and **2026-10-17** (Hostinger maintenance).
Public Compose+Caddy share is the **v0.3.7-beta** release line. Swarm /
Traefik / Cloudflare Pages cutover remains **out of scope** until
`CONFIRM_SWARM_0_3_9` (see v0.3.8 / v0.3.9 docs).

## Current: Hostinger maintenance (2026-10-17)

Operator report + agent probe **2026-10-17T14:33Z**:

| Check | Result |
|-------|--------|
| `185.211.4.66` ICMP | 100% loss |
| `tcp/22` SSH | timeout |
| `https://lenr-sim-beta.conscious.energy/api/health` | SSL connect timeout |
| Staging KVM1 `31.220.55.113` | SSH OK; Docker up; **Swarm=inactive** |
| CI `45.93.100.251` | SSH port OK (isolated; not share) |

**Do not** run `VPS_*` Compose ship, SSH deploy, or Swarm init/join against
share `1280333` while Hostinger shows maintenance. Staging work stays on
KVM1 only (`CONFIRM_SWARM_0_3_8` still required before Swarm init).

## What works when share is healthy (share this)

| URL | DNS | `/api/health` | App version reported |
|-----|-----|---------------|----------------------|
| `https://lenr-sim-beta.conscious.energy` | **A → `185.211.4.66`** (VPS `1280333`) | **200** when healthy | **`0.3.7-beta`** |
| `https://srv1280333.hstgr.cloud` | Hostinger host | **200** when healthy | **`0.3.7-beta`** |

**Shareable link for testers (when out of maintenance):**  
https://lenr-sim-beta.conscious.energy  

Operator probe:

```bash
EXPECT_VERSION=0.3.7-beta \
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh
# or:
curl -fsS https://lenr-sim-beta.conscious.energy/api/health | jq .
```

Last healthy agent probe (2026-10-13): `status=healthy`, `version=0.3.7-beta`,
`database.connected=true`. Re-run after Hostinger clears maintenance.

## Release line vs tip

| Surface | Ref | Notes |
|---------|-----|-------|
| Git tag / Release | `v0.3.7-beta` | Published prerelease on GitHub (target `04543b3` + CHANGELOG #234) |
| `main` tip | may be ahead of tag | Hotfix / docs only (e.g. CI re-trigger #236); markers stay `0.3.7-beta` |
| Live Compose share | operator-shipped from `main` / tags | Deploy via `VPS_*` / SSH — **not** auto from bare push |
| `dev` | `0.3.8-beta` integration | Never auto-deployed; Swarm prep only |

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
