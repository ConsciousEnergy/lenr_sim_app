# Wave 1-F — Infra / website / WordPress cutover

**Date:** 2026-08-31
**HEAD reviewed:** `lenr_sim_app_v0.3.6-beta` (`d6be618`) via PR branch `consciousenergy/public-release-review-7a95`
**Scope:** Cloudflare Pages Terraform, Swarm/Traefik, `deploy.yml`, Dockerfiles, `frontend/public/`, WordPress iframe/CORS. Review-first: no product-code edits.
**Live probe:** 2026-08-31 `dig` / `curl -sI` against `conscious.energy`, `www`, `api`, `app`, `lenr-sim-prod.pages.dev`.

## Summary

The v0.3.6-beta **code/infra templates are not what is serving the public domain today.** Authoritative DNS is **WordPress.com** (`ns1/2/3.wordpress.com`). Apex, `www`, `api`, and `app` all land on Automattic IPs (`192.0.78.147/239`). `api.conscious.energy` presents a `wordpress.com` certificate (TLS SAN mismatch). `lenr-sim-prod.pages.dev` does not resolve. Terraform `production_branch = "main"` and `.github/workflows/deploy.yml` (main + `v*` tags only) cannot ship the 88-commit-ahead `lenr_sim_app_v0.3.6-beta` branch as `:latest`.

Must-confirm seeds **1, 2, 3, 7** are **confirmed**. Dockerfile `REACT_APP_API_URL` vs `VITE_API_URL`, nginx-without-headers, and Swarm alembic/seed/`LENR_AUTO_PERSIST=0`/no lifespan seed are **confirmed**.

No **code** change is required to hide OpenAPI in production (that already works). The go-live blockers are **operator DNS/host placement**, **branch targeting**, and **GHCR `:latest`**. Blind `terraform apply` against the documented apex CNAME would replace the live WordPress.com marketing site.

## Seed hypotheses (this agent)

| # | Claim | Result |
|---|---|---|
| 1 | Pages Terraform `production_branch = "main"` while ship work is on `lenr_sim_app_v0.3.6-beta` | **Confirmed** (blocker) |
| 2 | `deploy.yml` `BUILD_VERSION=${{ github.ref_name }}` stamps `main` or `v0.3.6-beta`, not `0.3.6-beta`; workflow only on main+tags | **Confirmed** (blocker for image cutover) |
| 3 | Checklist says `/api/docs` should load; production hides OpenAPI | **Confirmed** (docs vs code; hiding is correct) |
| 4 | Traefik dashboard + placeholder basic-auth | **Confirmed** (major; not live yet) |
| 6 | No `robots.txt` on the SPA | **Confirmed** for Pages assets; live apex `robots.txt` is Yoast on WordPress.com. Pair [07-docs-legal.md](07-docs-legal.md) DOC-001 |
| 7 | WordPress iframe vs X-Frame-Options / CSP (embed is Pages SPA, not API) | **Confirmed**, plus live DNS inversion (blocker) |
| 10 | Dual CORS + GHCR `ConsciousEnergy` vs lowercase | **Confirmed** (major). Pair API-003 |

## Operator cutover punch-list vs code defects

### Operator punch-list (nothing in git will go live until these happen)

1. **Decide the public hostname map before touching DNS.** Live: WordPress.com owns apex **and** `www` (`www` CNAME → apex, 301 to `https://conscious.energy/`). Architecture seed assumed WordPress on `www` and the Vite SPA on apex. Those two plans cannot both be true without a move.
2. **Do not `terraform apply` the documented apex CNAME** (`@` → `lenr-sim-prod.pages.dev`) while NS remain `*.wordpress.com` (records would be inert) **or** after an NS cutover without first relocating WordPress (apex would become Pages and the marketing site disappears).
3. **Delegate DNS only after a written record plan.** Today NS are WordPress.com, not Cloudflare. Terraform’s Cloudflare zone is not authoritative. Keep WordPress A/CNAME (or Cloudflare CNAME-to-WP) for whichever host keeps the brochure site.
4. **Reclaim `api.conscious.energy`.** It is currently `CNAME conscious.energy` (WordPress). Traefik/Let’s Encrypt cannot issue `CN=api.conscious.energy` until that CNAME is an A/AAAA to the VPS (`proxied = false` in Terraform, which is correct for WebSockets).
5. **Create the Pages project from the ship branch, not stale `main`.** `origin/main` is **88 commits behind** `origin/lenr_sim_app_v0.3.6-beta` (and 6 unique commits on main, including the PR #95 revert). Either merge/promote the beta branch to `main` first, or change both Terraform `production_branch` values to `lenr_sim_app_v0.3.6-beta`.
6. **Build and pin the backend image.** `deploy.yml` does not run on `lenr_sim_app_v0.3.6-beta`. `:latest` is only applied on the default branch (`main`). Swarm pulls `:latest`. Cutover options: merge to `main` (then retag `BUILD_VERSION`), `workflow_dispatch` from the ship branch **and** change the stack tag from `:latest` to the SHA/tag, or build on the VPS.
7. **GHCR pull on the VPS.** Ansible uses `--with-registry-auth` but never `docker login ghcr.io`. Mixed-case `ghcr.io/ConsciousEnergy/lenr-sim-backend` may 404; GHCR wants `consciousenergy`. Confirm the package URL, login on the manager, then deploy.
8. **After stack is up, migrate and seed once** (not in entrypoint, not in lifespan): `alembic upgrade head` then `python -m app.scripts.seed_database --force --hydrate-demo` against **one** backend task (two replicas make `docker ps -q -f name=lenr-sim_backend` unsafe). Leave `LENR_AUTO_PERSIST=0`.
9. **WordPress embed:** iframe the **Pages origin**, never the API, never today’s apex if apex stays WordPress. If SPA is `https://app.conscious.energy`, add that origin to CORS (stack + Settings) and to Pages `frame-ancestors`. If SPA is apex, move WordPress first; `www` currently redirects to apex so it is not a distinct WP origin.
10. **Pages `_headers` / `_redirects` / `robots.txt`:** add at go-live (see INF-006, INF-012). Probe `curl -sI` for a single `Access-Control-Allow-Origin` (API-003) and for `frame-ancestors` allowing only the WP host.
11. **Do not enable Traefik dashboard DNS** (`traefik.conscious.energy`) until `traefik_dashboard_basic_auth` is a real htpasswd, not the template placeholder.
12. **Verification that matches production code:** `GET /api/health` 200 with `version: 0.3.6-beta`; `GET /api/docs` (no slug) **404**; `GET /metrics` **404**; frontend at the chosen Pages host; CORS from that host only.

### Code / template defects (repo must change before a safe apply)

| ID | Defect |
|---|---|
| INF-001 | Pages `production_branch` hardcoded `"main"` twice |
| INF-002 | `deploy.yml` version stamp + main-only + Swarm `:latest` |
| INF-003 | Checklists still require Swagger to load |
| INF-005 | `Dockerfile.frontend` ARG/ENV is `REACT_APP_API_URL` only; default `http://localhost:8000` |
| INF-006 | Neither Pages `_headers` nor nginx `add_header` |
| INF-009 | GHCR image owner mixed-case |
| INF-010 | Traefik CORS **and** FastAPI CORS |
| INF-011 | Traefik dashboard enabled with `admin:$apr1$xxxxx$xxxxx` |
| INF-012 | No Cloudflare `_redirects` SPA fallback |
| INF-014 | Pages **preview** `NODE_ENV=development` (debug routes in preview bundles) |
| INF-016 | Documented `docker exec $(docker ps -q …)` breaks with 2 replicas |
| INF-017 | No GHCR login task in Ansible |

---

### INF-001
- severity: blocker
- surface: infra
- status: confirmed
- evidence: [`infrastructure/terraform/modules/cloudflare/main.tf`](../../../infrastructure/terraform/modules/cloudflare/main.tf) sets `production_branch = "main"` on `cloudflare_pages_project.frontend` (line 68) and again in `source.config` (line 75). GitHub `default_branch` is `main` (`gh repo view`). `.github/dependabot.yml` states the integration branch is `lenr_sim_app_v0.3.6-beta` and that **main is behind**. `git rev-list --left-right --count origin/main...origin/lenr_sim_app_v0.3.6-beta` → `6 88`. Cloudflare Pages production custom-domain deploys follow `production_branch` only; the ship branch would at best get `*.pages.dev` previews (`preview_branch_includes = ["*"]`). Live `lenr-sim-prod.pages.dev` is NXDOMAIN (project not created).
- recommendation: Before the first Pages production deploy, either merge `lenr_sim_app_v0.3.6-beta` to `main` and keep Terraform as-is, or parameterize `production_branch` (default the ship branch) and set Pages production to that ref. Do not attach the custom domain until the production deployment is the 0.3.6-beta tree.

### INF-002
- severity: blocker
- surface: infra
- status: confirmed
- evidence: [`.github/workflows/deploy.yml`](../../../../.github/workflows/deploy.yml) `on.push.branches: [main]` and `tags: ["v*"]` plus `workflow_dispatch`. `test.yml` includes `lenr_sim_app_v0.3.6-beta`; deploy does not. Backend build-arg `BUILD_VERSION=${{ github.ref_name }}` therefore becomes `main` on a main push or `v0.3.6-beta` on tag `v0.3.6-beta`, never the four-marker string `0.3.6-beta`. That ARG only feeds `LABEL org.opencontainers.image.version` in [`Dockerfile.backend`](../../../infrastructure/docker/Dockerfile.backend); runtime `settings.APP_VERSION` stays `0.3.6-beta`. Image tags: `type=raw,value=latest,enable={{is_default_branch}}` so `:latest` updates **only** from `main`. Swarm [`docker-stack.yml.j2`](../../../infrastructure/ansible/templates/docker-stack.yml.j2) `image: ghcr.io/{{ github_owner }}/lenr-sim-backend:latest`. `PHASE4_DOCKER_SWARM_DEPLOYMENT.md` still says `git push origin lenr_sim_app_v0.3.5-beta` triggers GHCR — false for this workflow. CI `version-consistency` greps the Dockerfile **default** ARG, so a CI-stamped `main` label would not fail that job.
- recommendation: Stamp `BUILD_VERSION=0.3.6-beta` (or `vars.APP_VERSION`) instead of `github.ref_name`. Add the ship branch (or tags only) to `on.push`. Point Swarm at a digest or `v0.3.6-beta` tag, not floating `:latest`, until main equals the ship branch.

### INF-003
- severity: major
- surface: docs
- status: confirmed
- evidence: Production code hides the OpenAPI surface: `openapi_surface(PRODUCTION)` returns all-`None` in [`backend/app/core/config.py`](../../../backend/app/core/config.py); `FastAPI(docs_url=…)` in [`main.py`](../../../backend/app/main.py); covered by `test_openapi_surface_disabled_in_production`. Prometheus `/metrics` is also skipped when `ENVIRONMENT == PRODUCTION`. Tracker is correct: “Production API hides `/api/docs`, `/api/redoc`, `/api/openapi.json`, `/metrics`.” Contradictions: [`DEPLOYMENT_CHECKLIST.md`](../../DEPLOYMENT_CHECKLIST.md) “`https://api.conscious.energy/api/docs` loads Swagger UI”; same file still checks Prometheus at `/metrics`; [`PHASE4_DOCKER_SWARM_DEPLOYMENT.md`](../../PHASE4_DOCKER_SWARM_DEPLOYMENT.md) `curl -I …/api/docs` expects 200; tracker recommended sequence still `curl -I …/api/docs`. Markdown docs at `GET /api/docs/{slug}` remain mounted (Agent C API-002) and are a different path. Live `https://api.conscious.energy` is WordPress.com TLS, so this cannot be probed on the public hostname yet.
- recommendation: Change operator checklists to expect **404** on `/api/docs` (no slug), `/api/redoc`, `/api/openapi.json`, and `/metrics`. Keep `/api/health` as the public probe. Pair Agent C/G.

### INF-004
- severity: blocker
- surface: infra
- status: confirmed
- evidence: Embed target is the **Pages SPA**, not the API. API [`SecureHeadersMiddleware`](../../../backend/app/api/middleware/secure_headers.py) sets `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'` — irrelevant to an iframe of `https://conscious.energy` / a Pages host. SPA: [`LENR_SIM_APP_v2/frontend/public/`](../../../frontend/public/) has `index.html` + `favicon.svg` only (no `_headers`, no CSP meta in [`frontend/index.html`](../../../frontend/index.html)). [`Dockerfile.frontend`](../../../infrastructure/docker/Dockerfile.frontend) nginx config is a one-line `try_files` with no `add_header`. [`WORDPRESS_INTEGRATION.md`](../../WORDPRESS_INTEGRATION.md) iframe `src="https://conscious.energy"` and puts `frame-ancestors 'self' https://conscious.energy https://www.conscious.energy` on the **WordPress** `.htaccess` — that header controls who may iframe **WordPress**, not whether WordPress may iframe the SPA. Live 2026-08-31: apex is WordPress.com (`host-header: WordPress.com`, `wp-json`, cert SAN includes `conscious.energy`); **no** `X-Frame-Options` / `Content-Security-Policy` on the WP 200. `www` → 301 apex. Iframing `https://conscious.energy` today embeds the marketing site in itself. CORS allowlists apex + www in Swarm env and Traefik labels; after the WP 301 the browser origin is apex. `app.conscious.energy` is also CNAME to apex and is **not** in CORS — Option 2 of the WP guide would fail API calls until CORS is extended. Pair API-003/API-004.
- recommendation: Pick one embed topology and document it as the only supported one. Pages `_headers` (or Cloudflare Transform Rule) on the **SPA host**: `Content-Security-Policy: frame-ancestors 'self' https://<wordpress-origin>` and **do not** set `X-Frame-Options: DENY` on that host (DENY wins over CSP allowlists in several browsers). Add the SPA origin to `LENR_CORS_ORIGINS` / Traefik if it is not apex. Delete or invert the WP `.htaccess` snippet. Operator must curl the live SPA `X-Frame-Options`/`CSP` after Pages is attached.

### INF-005
- severity: major
- surface: infra
- status: confirmed
- evidence: [`Dockerfile.frontend`](../../../infrastructure/docker/Dockerfile.frontend) `ARG`/`ENV` `REACT_APP_API_URL` default `http://localhost:8000`; no `VITE_API_URL`. Vite [`vite.config.js`](../../../frontend/vite.config.js) `buildLegacyReactAppDefines` inlines `REACT_APP_*` into `process.env`, and [`config/api.js`](../../../frontend/src/config/api.js) reads `process.env.REACT_APP_API_URL || metaEnv.VITE_API_URL`, so a Docker build that passes the ARG still works — but the default bakes localhost, and any code that only reads `import.meta.env.VITE_API_URL` would be empty. Pages Terraform **does** set both `REACT_APP_API_URL` and `VITE_API_URL` to `https://api.${var.domain}`. `deploy.yml` frontend job also sets both. Swarm does **not** deploy this frontend image (Pages is the production UI). Checklist already treats `VITE_API_URL` as the Pages safety belt with the same api.js fallback.
- recommendation: Set `ARG`/`ENV VITE_API_URL` (and keep `REACT_APP_API_URL` for the define shim). Default both to `https://api.conscious.energy` for a production image, or fail the build if unset. Production cutover can ignore this image if Pages is the only UI, but do not publish the nginx image with the localhost default.

### INF-006
- severity: major
- surface: infra
- status: confirmed
- evidence: Dockerfile.frontend nginx: `server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }` — no `X-Content-Type-Options`, HSTS, Referrer-Policy, CSP, or frame-ancestors. Cloudflare Pages: no `public/_headers` (and no `_headers` anywhere in the repo). Live WordPress apex sends HSTS but not XFO/CSP. A future Pages custom domain will therefore be **embeddable by any origin** (needed for WP, unsafe without an allowlist) and will lack nosniff/HSTS from the app (Cloudflare SSL may still add HSTS via dashboard — needs-operator).
- recommendation: Add `LENR_SIM_APP_v2/frontend/public/_headers` for Pages (copied to `dist/`) with `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy: frame-ancestors 'self' https://<wp-host>`, and a tight `script-src`/`connect-src` once PostHog/API hosts are known. Mirror the same headers in the nginx snippet if that image is kept. Cross-ref INF-004.

### INF-007
- severity: accepted-residual
- surface: infra
- status: confirmed
- evidence: Swarm [`docker-stack.yml.j2`](../../../infrastructure/ansible/templates/docker-stack.yml.j2): `LENR_ENVIRONMENT=production`, `LENR_AUTO_PERSIST=0`. [`entrypoint.sh`](../../../infrastructure/docker/entrypoint.sh) only maps Docker secrets → `LENR_DB_PASSWORD` / `LENR_SECRET_KEY`; no alembic. [`main.py`](../../../backend/app/main.py) `lifespan` initializes the pool, `wait_for_connection`, and `create_tables()` **only** when env is development/test or SQLite — production Postgres is migrate-or-empty. No `seed_database` import in lifespan (grep). `persistence_enabled()` is false when `LENR_AUTO_PERSIST=0` or (unset) in production. Docs (`DEPLOYMENT.md`, PHASE4, tracker) correctly require a **manual** `alembic upgrade head` then `python -m app.scripts.seed_database --force --hydrate-demo`. `--force` deletes existing baselines. `deploy-stack.yml` / `deploy.sh` do not run either command. Public Analytics therefore stays at the frozen demo pack unless an operator hydrates; visitor `/simulate` does not persist. Intentional per tracker and `ANALYTICS_TRANSPARENCY.md`.
- recommendation: Keep auto-seed **off** in production. Put the two CLI commands in the operator runbook immediately after first `docker stack deploy`, with a one-replica `docker exec` (see INF-016). Do not add `--force` to a cron. Leave `LENR_AUTO_PERSIST=0` unless product wants anonymous SQL writes.

### INF-008
- severity: blocker
- surface: infra
- status: needs-operator
- evidence: 2026-08-31 live DNS: `NS` = `ns1/2/3.wordpress.com`. Apex A = `192.0.78.147`, `192.0.78.239` (WordPress.com Atomic). `www`, `api`, and `app` are all `CNAME conscious.energy`. TLS on apex: issuer Google Trust Services WR1, CN `tls.automattic.com`, SAN includes `conscious.energy`. `curl -sI https://conscious.energy` → `host-header: WordPress.com`. `curl https://api.conscious.energy/api/health` → TLS error `subjectAltName does not match` / cert `CN=wordpress.com`. `lenr-sim-prod.pages.dev` NXDOMAIN. Terraform [`main.tf`](../../../infrastructure/terraform/main.tf) `cloudflare_record.api` A to VPS and Cloudflare module apex CNAME to Pages **cannot take effect** until NS move to Cloudflare (or records are created on WordPress.com DNS, which Terraform does not manage). Tracker “Manual cloud execution: PENDING” is still true.
- recommendation: Written cutover: (1) inventory every WP.com DNS record (MX `smtp-fwd.wordpress.com`, SPF, Google verification, Outlook NETORG TXT); (2) create a Cloudflare zone **or** edit WP.com DNS; (3) keep WordPress on one hostname; (4) point `api` at the VPS; (5) point the SPA host at Pages; (6) only then change NS. Treat a naive `terraform apply` as a production outage for the marketing site.

### INF-009
- severity: major
- surface: infra
- status: confirmed
- evidence: GitHub owner login is `ConsciousEnergy` (`gh repo view`). [`docker-stack.yml.j2`](../../../infrastructure/ansible/templates/docker-stack.yml.j2) default `ghcr.io/ConsciousEnergy/lenr-sim-backend:latest`. Terraform `github_owner` default and `terraform.tfvars.example` are the same mixed case (correct for **GitHub Pages source**, wrong for **GHCR**). `deploy.yml` `images: ghcr.io/${{ github.repository_owner }}/lenr-sim-backend`. GHCR requires lowercase path `ghcr.io/consciousenergy/...`. Checklist `docker push ghcr.io/ConsciousEnergy/lenr-sim-backend:latest` repeats the casing. Ansible never lowercases. Seed 10.
- recommendation: Force `github_owner | lower` in the stack image name (keep mixed case only for the Cloudflare Pages GitHub app). Align `deploy.yml` with `github.repository_owner` lowercased. Operator: `docker pull` the real package name before Swarm deploy.

### INF-010
- severity: major
- surface: infra
- status: confirmed
- evidence: FastAPI `CORSMiddleware` in [`middleware.py`](../../../backend/app/core/middleware.py) with `allow_credentials=True`, methods/headers `*`, origins from Settings (Swarm sets `LENR_CORS_ORIGINS=["https://{{ app_domain }}","https://www.{{ app_domain }}"]`). Traefik backend labels attach `backend-cors` with the same two origins, methods GET/POST/PUT/DELETE/OPTIONS, headers `Content-Type,Authorization,X-LENR-Write-Token`, **no** `accesscontrolallowcredentials`. File-provider [`traefik-dynamic.yml.j2`](../../../infrastructure/ansible/templates/traefik-dynamic.yml.j2) defines another unused `cors` middleware (not referenced by the backend router). Duplicate `Access-Control-Allow-Origin` is a classic browser failure. Axios [`client.ts`](../../../frontend/src/api/client.ts) does not set `withCredentials` (default false). SPA origin after WP 301 is apex; `*.pages.dev` and `https://app.conscious.energy` are absent (API-004). Cannot probe live API headers until INF-008.
- recommendation: One CORS enforcer. Prefer FastAPI (already has write-token header via `*`) and drop Traefik `backend-cors` from the router. After go-live, `OPTIONS` with `Origin: https://<spa-host>` must return a **single** `Access-Control-Allow-Origin`. Add the real SPA host if it is not apex. Pair API-003.

### INF-011
- severity: major
- surface: infra
- status: confirmed
- evidence: [`docker-stack.yml.j2`](../../../infrastructure/ansible/templates/docker-stack.yml.j2) `--api.dashboard=true`, router `Host(\`traefik.{{ app_domain }}\`)` = `traefik.conscious.energy`, middleware `dashboard-auth` with `{{ traefik_dashboard_basic_auth | default('admin:$apr1$xxxxx$xxxxx') }}`. [`group_vars/all.yml`](../../../infrastructure/ansible/group_vars/all.yml) `traefik_dashboard_enabled: true` (the stack template does not even consult that flag). No Terraform DNS for `traefik.`. Live `traefik.conscious.energy` was not required for this finding; if an operator adds the record, the dashboard is on the public internet with a documented dummy htpasswd. Traefik also mounts `/var/run/docker.sock:ro` (needed for Swarm provider).
- recommendation: Default dashboard off, or bind it to localhost / IP allowlist. Require a vaulted htpasswd; fail the play if the placeholder is still present. Do not create public DNS for `traefik.` in production.

### INF-012
- severity: major
- surface: infra
- status: confirmed
- evidence: Vite SPA routes live in [`App.tsx`](../../../frontend/src/App.tsx) (`/unified-theory`, `/analytics`, …). Cloudflare Pages does not rewrite unknown paths to `index.html` unless `public/_redirects` (`/* /index.html 200`) or equivalent is in `dist/`. Repo-wide glob for `_redirects` / `_routes.json` is empty. Dockerfile nginx **does** `try_files … /index.html` (Docker UI only). Live `https://conscious.energy/unified-theory` is WordPress **404** (expected until Pages owns that host). WordPress iframe to `/` still works without `_redirects`; refresh/deep-link/share of in-app routes will 404 on Pages.
- recommendation: Add `LENR_SIM_APP_v2/frontend/public/_redirects` with `/*    /index.html   200`. Verify after first Pages deploy with `curl -sI https://<spa-host>/unified-theory` → 200 and HTML shell.

### INF-013
- severity: blocker
- surface: docs
- status: confirmed
- evidence: [`DEPLOYMENT.md`](../../DEPLOYMENT.md) DNS table: `@` CNAME `lenr-sim-prod.pages.dev` (frontend), `www` CNAME `@` (WWW redirect), Cloudflare SSL for both apex and www as “Frontend”. Terraform implements apex CNAME to Pages and **does not** manage `www` (good, given live WP). PHASE4 still tells operators to CNAME apex to Pages. [`WORDPRESS_INTEGRATION.md`](../../WORDPRESS_INTEGRATION.md) Option 1 iframes apex; Option 2 adds `app` CNAME to Pages **and** `www` CNAME to `conscious.energy`. Live `www` already CNAMEs to apex WP. Following DEPLOYMENT.md after an NS cutover without moving WordPress **replaces the brochure site**.
- recommendation: Rewrite the DNS table to match the chosen topology (INF-008). Explicitly: Terraform must not create `www` if WordPress stays there; Terraform must not steal apex if WordPress stays there. Mark DEPLOYMENT.md / WORDPRESS_INTEGRATION.md version headers (still 0.2.1-beta) stale — Agent G DOC-005.

### INF-014
- severity: major
- surface: infra
- status: confirmed
- evidence: Pages `deployment_configs.preview.environment_variables` sets `NODE_ENV = "development"` and `REACT_APP_ENVIRONMENT = "preview"`. [`App.tsx`](../../../frontend/src/App.tsx) `IS_PRODUCTION` is `REACT_APP_ENVIRONMENT === 'production' || NODE_ENV === 'production'`. `vite.config.js` defines `process.env.NODE_ENV` from `env.NODE_ENV || 'development'`. A `vite build` under `NODE_ENV=development` therefore inlines development and **keeps** `/diagnostics`, `/component-showcase`, lattice tests, etc. `preview_branch_includes = ["*"]` so every branch, including this review branch, would publish those routes on `*.pages.dev` if the project existed. Production block correctly sets `NODE_ENV=production` and `REACT_APP_ENVIRONMENT=production`.
- recommendation: Set preview `NODE_ENV=production` (keep `REACT_APP_ENVIRONMENT=preview` if you need a label). Disable `production_deployment_enabled` until INF-001 is resolved. Restrict `preview_branch_includes` if preview URLs must not leak debug UI.

### INF-015
- severity: accepted-residual
- surface: infra
- status: confirmed
- evidence: Terraform [`cloudflare_record.api`](../../../infrastructure/terraform/main.tf) `proxied = false` (“Direct traffic for WebSocket support”). Zone rulesets (rate-limit 100/min on path contains `/api/`, managed WAF, XSS query rule) therefore **do not apply** to `api.conscious.energy`. App-layer limits remain: Traefik `backend-ratelimit` 100 avg / 50 burst / 1m and FastAPI `LENR_ENABLE_RATE_LIMITING=true` (60/min). Cloudflare WAF still applies to proxied Pages/apex once that host is on Cloudflare.
- recommendation: Keep API grey-cloud for WebSockets. Do not treat the Terraform WAF ruleset as API protection. Tune Traefik/FastAPI limits for UQ `include_uncertainty` (checklist already warns about proxy timeouts).

### INF-016
- severity: major
- surface: docs
- status: confirmed
- evidence: Stack `replicas: 2` for backend. `DEPLOYMENT.md` / PHASE4: `docker exec -i $(docker ps -q -f name=lenr-sim_backend) python -m alembic upgrade head` (same for seed). Two matching container IDs make `docker exec` fail with extra arguments. Alembic is not in Ansible. `--force --hydrate-demo` is destructive to existing baselines.
- recommendation: Document `docker ps -f name=lenr-sim_backend --format '{{.ID}}' | head -1` (or `docker exec` a named task). Add an optional Ansible tag `migrate-and-seed` that targets one replica. Never `--force` on a database that already has non-demo rows.

### INF-017
- severity: major
- surface: infra
- status: confirmed
- evidence: [`deploy-stack.yml`](../../../infrastructure/ansible/playbooks/deploy-stack.yml) `docker stack deploy --with-registry-auth` but no `docker login`. [`setup-docker.yml`](../../../infrastructure/ansible/playbooks/setup-docker.yml) installs Docker/Swarm only. [`deploy.sh`](../../../infrastructure/scripts/deploy.sh) never logs in to GHCR. Checklist line 22 is a manual checkbox. Private GHCR packages (org default) will not pull.
- recommendation: Add a play that logs the manager into GHCR from a vaulted PAT (`read:packages`) before stack deploy, or mirror the image to a local registry. Confirm `packages: write` images are visible to the VPS identity.

### INF-018
- severity: minor
- surface: docs
- status: confirmed
- evidence: Checklist “Prometheus metrics available at `/metrics` (internal only)”. [`main.py`](../../../backend/app/main.py) skips Instrumentator entirely in production (not an internal bind). Tracker documents the hide. PHASE4 expected health JSON still `"version": "0.2.1-beta"`.
- recommendation: Drop `/metrics` from the public checklist or expose it on a Traefik IP-allowlist router if operators want it. Fix the expected health version to `0.3.6-beta`.

### INF-019
- severity: minor
- surface: infra
- status: confirmed
- evidence: PHASE4 backup cron text says daily **2 AM** and “you need to configure the cron job”; [`deploy-stack.yml`](../../../infrastructure/ansible/playbooks/deploy-stack.yml) already installs `ansible.builtin.cron` at **03:00**; `DEPLOYMENT.md` and `group_vars` say 3 AM. Backup filenames: playbook `lenr_sim_${TIMESTAMP}.sql.gz` vs PHASE4 `lenr_sim_production_YYYYMMDD_…`.
- recommendation: Trust the playbook (03:00). Delete the “add crontab yourself at 2 AM” PHASE4 step.

### INF-020
- severity: minor
- surface: infra
- status: confirmed
- evidence: Terraform Pages preview env and production both set API to `https://api.${var.domain}` (good). `frontend/package.json` `"homepage": "https://www.conscious.energy"` (WordPress, not the SPA). Vite ignores CRA `homepage` for asset prefixes (root `index.html` uses `/src/index.jsx`). Dead `public/index.html` still has `%PUBLIC_URL%` CRA placeholders; Vite uses repo-root `frontend/index.html`. Not a Pages build break.
- recommendation: Point `homepage` at the chosen SPA URL after INF-008. Do not treat `public/index.html` as the Pages entry.

## Cross-references

- Wave 0 seeds 1–3, 7, 10: [00-architecture.md](00-architecture.md)
- OpenAPI hide vs slug docs, dual CORS: [03-api-contract.md](03-api-contract.md) API-002, API-003, API-004
- `robots.txt` / privacy / PostHog key: [07-docs-legal.md](07-docs-legal.md) DOC-001, DOC-002, DOC-005
- Analytics persist + write token: Agent I; Swarm `LENR_AUTO_PERSIST=0` and no `LENR_ANALYTICS_WRITE_TOKEN` in the stack (writes fall back to `SECRET_KEY` / `api_secret_key`)

## Verdict for Hostinger + `conscious.energy`

**Not ready to apply.** Templates can be made ready, but live DNS, Pages branch, and GHCR `:latest` are cutover blockers independent of physics/API quality. After NS/host decisions, the remaining code defects (branch pin, image tag, `_headers`/`_redirects`, single CORS, dashboard auth, GHCR login/case) should land before the first public `terraform apply` / `docker stack deploy`.
