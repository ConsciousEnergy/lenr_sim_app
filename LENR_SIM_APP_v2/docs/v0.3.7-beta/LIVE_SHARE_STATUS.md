# Live share status (v0.3.7-beta VPS)

Probed from CI agent host on **2026-09-12 ~22:30 UTC** (retries via verify-beta-share.sh).
Stack tip ready to merge: `consciousenergy/v037-share-uptime-prep-98d8` @ `b98e206` (#190 Test+Benchmark **green** — [run 34722505921](https://github.com/ConsciousEnergy/lenr_sim_app/actions/runs/34722505921); `check-merge-train.sh` → READY).

## What works today (share this)

| URL | DNS | `/api/health` | App version reported |
|-----|-----|---------------|----------------------|
| `https://lenr-sim-beta.conscious.energy` | **A → `185.211.4.66`** (VPS) | **200** healthy, DB connected | `0.3.6-beta` |
| `https://srv1280333.hstgr.cloud` | Hostinger host | **200** healthy | `0.3.6-beta` |

**Shareable link for testers right now:**  
https://lenr-sim-beta.conscious.energy  

Operator probe:

```bash
./LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh
# or:
curl -fsS https://lenr-sim-beta.conscious.energy/api/health | jq .
```

Latest agent probe: share host **OK**; intended host **WARN** (TLS/DNS still WordPress).

## Intended public name — still blocked by DNS

| URL | DNS today | Result |
|-----|-----------|--------|
| `https://lenr-simp-app.conscious.energy` | **CNAME → `conscious.energy`** (WordPress `192.0.78.x`) | Does **not** reach the VPS; TLS/health fail for the app stack |

### Cutover (WordPress.com DNS UI)

1. Delete the CNAME `lenr-simp-app` → `conscious.energy`.
2. Create **A** `lenr-simp-app` → `185.211.4.66` (optional AAAA per VPS README).
3. Add `lenr-simp-app.conscious.energy` to the Caddy site line; recreate Caddy.
4. Confirm:

```bash
dig +short lenr-simp-app.conscious.energy A   # expect 185.211.4.66
curl -fsS https://lenr-simp-app.conscious.energy/api/health
```

Until then, keep sharing **`lenr-sim-beta`**.

## VPS git tip

`consciousenergy/vps-public-beta-rebase-98d8` was **rebased onto `origin/main`** on 2026-09-12
(duplicate deps commit dropped). Tip == `main` @ `360c94c` (includes Caddy multi-host fix #180,
WH-ENP #182, `/api` path honesty #183).

**Deploy of 0.3.7 science stack still waits on merge train #185→#189**
(see [MERGE_TRAIN_VPS.md](./MERGE_TRAIN_VPS.md)). After those land on `main`, pull/rebase
VPS tip again and `workflow_dispatch` deploy; health should report `0.3.7-beta`
(`EXPECT_VERSION=0.3.7-beta ./LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh`).

## Console noise (testers)

| Message | Action |
|---------|--------|
| PostHog “No apiKey or client” | Fixed in #189 (`WrapWithPostHog`) once that PR is on the deployed tip |
| `contentscript.js` MaxListeners / ObjectMultiplex / phishing URL check | Browser extension — ignore; use a clean profile to verify |
