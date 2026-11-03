# Live share status (v0.3.9-beta Swarm)

Probed **2026-11-02** (post-0.3.9 public Swarm cutover **2026-10-31**). The
share host (`1280333` / `185.211.4.66`) is the **Swarm manager** running Traefik
+ Postgres; KVM1 is the **worker** (`app=true`, `observability=true`). Compose
+ Caddy is **retired** on this host — keep Compose rollback tag/images ≥ one
release (see cutover step 8).

## What works today (share this)

| URL | DNS / edge | `/api/health` | App version reported |
|-----|------------|---------------|----------------------|
| `https://api.conscious.energy` | **A → `185.211.4.66`** (Traefik) | **200** healthy, DB connected | **`0.3.9-beta`** |
| `https://lenr-sim-beta.conscious.energy` | **A → `185.211.4.66`** (Traefik SPA + API) | **200** healthy, DB connected | **`0.3.9-beta`** |
| `https://app.conscious.energy` | Cloudflare Pages → API at `api.` | SPA origin (split CORS) | Pages build train |

**Shareable API / same-origin SPA:**  
https://lenr-sim-beta.conscious.energy  

**Split-origin Pages SPA:**  
https://app.conscious.energy  

Operator probe:

```bash
EXPECT_VERSION=0.3.9-beta \
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh
# or:
curl -fsS https://api.conscious.energy/api/health | jq .
curl -fsS https://lenr-sim-beta.conscious.energy/api/health | jq .
```

## Release line vs tip

| Surface | Ref | Notes |
|---------|-----|-------|
| Live Swarm | `0.3.9-beta` | Traefik stack on share manager + KVM1 worker/obs |
| `main` tip | `0.3.9-beta` markers | Matches live after cutover promote |
| `dev` | `0.3.9-beta` integration | Never auto-deployed by `deploy.yml` |
| Compose rollback | `/opt/lenr-sim/.rollback-image-tag` → `0.3.8-beta` | Images for `0.3.8-beta` retained on share for ≥1 release |

## Intended public name — still blocked by DNS

| URL | DNS today | Result |
|-----|-----------|--------|
| `https://lenr-simp-app.conscious.energy` | **CNAME → `conscious.energy`** (WordPress) | Does **not** reach the VPS |

Prefer **`app.conscious.energy`** (Pages) or **`lenr-sim-beta`** (same-origin).
Apex/`www` stay WordPress. See
[`../v0.3.8-beta/DNS_AND_HOSTINGER_DECISIONS.md`](../v0.3.8-beta/DNS_AND_HOSTINGER_DECISIONS.md).

## CI placement (must stay true)

| Host | Role |
|------|------|
| Share `1280333` / `185.211.4.66` | Swarm manager / public Traefik — **no** `.runner` |
| KVM1 `2071323` / `31.220.55.113` | Swarm worker + observability |
| CI `2012566` / `45.93.100.251` | `lenr-ci-1` (`self-hosted,linux,x64,lenr-ci`) |

Never put `VPS_*` on `lenr-ci` PR jobs. Runbook:
[`SELF_HOSTED_RUNNER.md`](./SELF_HOSTED_RUNNER.md).

## Honesty (unchanged)

- `lenr_proved` remains **false**
- All `EQ-OPEN-*` stay **OPEN**
- Research-preview only — not a laboratory or energetic-freedom claim
