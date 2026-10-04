# DNS migration phases (Cloudflare)

Move DNS carefully so the marketing site and public beta do not break together.

## Phase 1 — now (protect apex)

| Host | Provider | Notes |
|------|----------|-------|
| `conscious.energy` / `www` | WordPress.com NS | Marketing site stays |
| `lenr-sim-beta` | A → Compose share `185.211.4.66` | Public beta |
| Future `app` / `app-staging` | Cloudflare Pages CNAME | When Pages project exists |
| Future `api` / `api-staging` | A, **proxied=false** | Required for WebSockets |

## Phase 2 — app hosts on Cloudflare

- Create Cloudflare zone (or partial) for app subdomains only if apex cannot move yet.
- Terraform module in LENR-Sim manages Pages hostname + API A record.
- Keep `manage_api_dns = false` until Traefik answers TLS on the Swarm manager.

## Phase 3 — headless conscious.energy

- WordPress.com remains CMS (content API).
- Astro frontend on Cloudflare Pages for the marketing site.
- Apex NS cutover to Cloudflare only after Pages + redirects proven on a staging
  hostname.

## Phase 4 — public Swarm cutover (LENR-Sim v0.3.9)

- Under `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9` only.
- `api.` → Traefik on Swarm; `app.` → Pages SPA.
- Keep Compose rollback path for one release window.

## Anti-patterns

- Orange-cloud (proxied) `api.` breaking WS.
- Pointing `@` Pages hostname before WP.com migration plan.
- Managing production DNS from the CI KVM2.
