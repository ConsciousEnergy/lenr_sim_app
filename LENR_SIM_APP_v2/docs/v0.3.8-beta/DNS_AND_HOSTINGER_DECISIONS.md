# DNS topology + Hostinger strategy (v0.3.8-beta prep)

**Status:** Decision record for Swarm/Pages cutover prep.  
**Hard rule:** no production `terraform apply`, no Swarm init on live VPS, no Pages
cutover until **v0.3.9** under `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9` and an announced
window. Staging plan/check in 0.3.8 uses `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8`.

Related: [SWARM_PAGES_CUTOVER_PREP.md](./SWARM_PAGES_CUTOVER_PREP.md),
[OPERATOR_HOSTINGER_DNS.md](./OPERATOR_HOSTINGER_DNS.md) (operator login + DNS walkthrough),
[../infrastructure/vps/README.md](../../infrastructure/vps/README.md).

**Live probe (2026-09-18):** apex NS = WordPress.com; `lenr-sim-beta` already
`A → 185.211.4.66`. Cloudflare production CNAME is **not** the v0.3.8 unlock
blocker — Hostinger hPanel / VNC / SSH keydrop is. See
[OPERATOR_HOSTINGER_DNS.md](./OPERATOR_HOSTINGER_DNS.md).

---

## Locked DNS decision (phase 1)

**Keep WordPress.com nameservers for apex / `www`.** Do **not** migrate NS to
Cloudflare (or any other provider) in this cutover window.

| Host | Owner today | Cutover intent | Must not |
|------|-------------|----------------|----------|
| `conscious.energy` (`@`) | WordPress.com marketing | Stay WP | Terraform Pages CNAME on `@` |
| `www.conscious.energy` | WordPress.com | Stay WP | Pages / Traefik steal |
| `lenr-simp-app.conscious.energy` | A → `185.211.4.66` (intended app) | Compose today; later SPA may move to Pages **or** stay same-origin | CNAME-to-apex (WP mapping) |
| `lenr-sim-beta.conscious.energy` | A → `185.211.4.66` (share URL) | Keep as Compose rollback / share until cutover proven | Drop without verify |
| `api.conscious.energy` | reserved for Swarm path | A → Swarm VIP / VPS (`proxied=false` for WS) | Proxy through CF orange-cloud if WS breaks |
| Pages project host | not live | Dedicated hostname only (default prep: `app.conscious.energy`) | Never bind Pages custom domain to `@` / `www` |

### Why this topology

- Marketing site and the LENR SPA must not share apex ownership during cutover.
- Terraform module `cloudflare_record.pages_cname` historically targeted `@` for
  `environment=prod` — that **would steal the marketing apex**. Prep code now
  defaults Pages DNS to `var.pages_hostname` (default `app`), never `@`.
- Same-origin Compose (`lenr-simp-app` / `lenr-sim-beta`) remains the public path
  until Traefik + Pages CORS/WS are validated on staging.

### Operator map (WordPress.com DNS panel)

Leave `@` and `www` alone. App hosts stay **A records to the VPS** (or CNAME to
`srv1280333.hstgr.cloud`), never CNAME-to-apex.

```
A     lenr-simp-app   185.211.4.66
A     lenr-sim-beta   185.211.4.66
# Future Swarm only (do not create until cutover):
# A   api             <swarm-or-vps-ipv4>   (Cloudflare DNS, proxied=false)
# CNAME app           <pages-subdomain>     (Pages SPA host — not apex)
```

---

## Hostinger strategy (import vs new)

**Live production VPS:** `185.211.4.66` (`srv1280333.hstgr.cloud`), Compose + Caddy.

### Decision

| Option | When | Phase-1 stance |
|--------|------|----------------|
| **Import / attach existing** | Swarm cutover reuses the live KVM | **Preferred** for prod workspace |
| **Create new VPS** | Greenfield staging node only | Allowed only with `hostinger_vps_mode=create_new` + explicit confirm |
| **Blind `module.hostinger` create** | Accidental apply against live | **Forbidden** |

### Refuse blind create against live

`modules/hostinger` provisions a **new** `hostinger_vps` resource. Running
`terraform apply` with the historical root module against credentials that can
create VPS would **not** adopt `185.211.4.66` — it would spin a second billable
server and leave the live Compose box unmanaged.

Prep defaults:

- `hostinger_vps_mode = "disabled"` — no Hostinger VPS resource in plan.
- Staging workspace may set `create_new` with a non-prod hostname.
- Production cutover must use **import** (or `existing_vps_ipv4` data path) so
  state tracks `185.211.4.66` without recreate.

### Import checklist (later cutover — not now)

1. `terraform workspace select staging` (or `prod`) with remote state enabled.
2. `terraform plan` only; confirm **zero** `hostinger_vps` create/destroy on live IP.
3. If adopting the live node: `terraform import 'module.hostinger.hostinger_vps.app' <vps-id>`
   after documenting the Hostinger VPS ID from the panel (never guess).
4. Still require `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9` before any **production**
   apply that touches DNS or Swarm. Staging-only apply uses `I_STAGING_0_3_8`.

---

## Confirmation gates

| Gate | Value | Protects |
|------|-------|----------|
| Staging Swarm dry-run (0.3.8) | `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8` | `deploy.sh staging` |
| Production Swarm/Pages (0.3.9) | `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9` | `deploy.sh production` |
| Hostinger create_new | `CONFIRM_HOSTINGER_CREATE=I_CREATE_NEW_VPS` (env / tf var) | Accidental second VPS |
| This phase | docs + plan/check-mode only | Live Compose share stays up |
