# Wave 1-C — API contract and production surface

**Date:** 2026-08-31
**Agent:** C (api-contract-tester)
**HEAD reviewed:** `d6be618` (`lenr_sim_app_v0.3.6-beta`) via review branch `consciousenergy/public-release-review-7a95` (`6783c16` ledger seed)
**Method:** static review of lock docs + FastAPI config/routers. Targeted pytest **not run** — `fastapi` / `pydantic` are not installed in this environment (`ModuleNotFoundError`). Agent A owns the full suite.
**Seed:** [00-architecture.md](00-architecture.md) hypotheses 3 and 10 (OpenAPI hiding vs checklist; dual CORS).

This file is the Wave 1-C ledger. Passing locks are in the verification matrix. Findings below are deviations, classifications the orchestrator asked for, or residuals that can break a public browser client.

## Verification matrix

| Check | Result | Evidence |
|---|---|---|
| `contract_version` ends with `-science-gate-1` | **PASS** (dual-source residual: [API-007](#api-007)) | `CONTRACT_VERSION = f"v{settings.APP_VERSION}-science-gate-1"` in `unified_simulation.py` → `v0.3.6-beta-science-gate-1`. Pipeline `to_dict()` hardcodes the same string. `DATA_CONTRACT_LOCK.md` matches. Tests assert `.endswith("-science-gate-1")` and the exact token. |
| Export `schema_version` is `lenr-run-export-v1` | **PASS** | `run_export.SCHEMA_VERSION = "lenr-run-export-v1"`; envelope key `schema_version`. `POST /api/unified/export` builds this envelope. `test_run_export.py` + `test_open_questions_contract.py` lock it. |
| OpenAPI / Swagger / ReDoc / metrics off in production | **PASS** | `openapi_surface(PRODUCTION)` returns all-`None`. `FastAPI(docs_url=..., redoc_url=..., openapi_url=...)` uses that. Prometheus `Instrumentator.expose("/metrics")` is skipped when `ENVIRONMENT == PRODUCTION`. Unit test: `test_openapi_surface_disabled_in_production`. |
| Dev routers gated | **PASS** | `fitting`, `logs`, `diagnostics`, mock `/api/simulations` included only when `ENVIRONMENT != PRODUCTION` (`main.py`). |
| `LENR_SECRET_KEY` required in production | **PASS** | `Settings` `env_prefix="LENR_"`; production validator raises if `SECRET_KEY` is empty after `*_FILE` load. Swarm `entrypoint.sh` exports `LENR_SECRET_KEY` from `/run/secrets/api_secret_key`. Tests: `test_production_settings_require_secret_key`. |
| `LENR_AUTO_PERSIST` default off in production | **PASS** | `persistence_enabled()`: unset flag → `ENVIRONMENT != PRODUCTION`; explicit `0/false/no/off` always off. Swarm sets `LENR_AUTO_PERSIST=0`. Test: `test_auto_persist_defaults_off_in_production`. |
| Analytics POST/PUT/DELETE require `X-LENR-Write-Token`; GET public | **PASS** for experiment mutations; compute POSTs classified in [API-005](#api-005) | `Depends(require_analytics_write)` on create/update/delete experiment and POST timeline. Guard is no-op outside production; HMAC compare in production. GET `/stats`, lists, exports stay public. HTTP test: `test_analytics_http_writes_gated_in_production`. |
| CORS production fallback to `https://conscious.energy` + www | **PASS** as a Settings safety net; live stack also sets both FastAPI and Traefik CORS — [API-003](#api-003), [API-004](#api-004) | `load_secrets_from_files` replaces default localhost origins in production. Ansible `LENR_CORS_ORIGINS=["https://{{ app_domain }}","https://www.{{ app_domain }}"]`. |
| `docs_router` `/api/docs/{slug}` still mounted in production | **Intended, not Swagger** — [API-002](#api-002) | Unconditional `include_router(docs_router)`. Frontend `DocViewerPage` fetches `/api/docs/{slug}`. Production image cannot serve the markdown. |
| `GET /` advertises `/api/fitting`, `/diagnostics`, `/docs` in production | **Confirmed stale map** — [API-001](#api-001) | `root()` always returns those keys. Dev routers are not mounted in production; FastAPI docs were never at `/docs`. |
| `/memory` and `/cache/stats` 404 in production | **PASS** (routes still registered) | `GET /memory`, `POST /memory/cleanup`, `GET /cache/stats`, `POST /cache/clear` raise `HTTPException(404)` when `ENVIRONMENT == PRODUCTION`. Not unmounted; response is 404. |

Science-gate body fields from `DATA_CONTRACT_LOCK.md` are present on the pipeline `to_dict()` (`combined_enhancement`, `combined_reaction_rate_modifier`, `total_energy_watts`, `per_theory[]` with confidence / breakdown / interval / falsification / evidence_class / reproducibility_tier / claim_tier / provenance, plus `observables_bridge` and `analytics_transparency`). Unified `SimulationResponse` carries `confidence`, `uncertainty_interval`, `falsification_conditions`, `observables_bridge`, `contract_version`, `analytics_transparency`. Additive `open_questions` / `reaction_rate_engine` do not change the token.

## Findings

### API-001
- severity: minor
- surface: api
- status: confirmed
- evidence: `GET /` in `backend/app/main.py` always returns `endpoints.fitting=/api/fitting`, `logs=/api/logs`, `diagnostics=/api/diagnostics`, and `docs=/docs`, plus `environment`. Those routers are omitted in production (`include_router` gated a few lines above). FastAPI Swagger, when enabled, is `/api/docs` not `/docs`. The map is therefore stale in every environment and advertises gated surfaces on the public API. This is reconnaissance, not a live handler.
- recommendation: Build the `endpoints` dict from what is actually mounted (omit fitting/logs/diagnostics/mock in production; advertise `/api/docs/{slug}` and `/api/health` if you keep a public catalog). Do not list `/docs`. Optional: drop the catalog from `GET /` entirely and keep `/api/health` as the public probe.

### API-002
- severity: major
- surface: api
- status: confirmed
- evidence: Markdown `docs_router` (`backend/app/api/routes/docs_routes.py`, prefix `/docs`) is included with no environment gate. That is **not** FastAPI Swagger. `openapi_surface(PRODUCTION)` sets `docs_url=None`, so `GET /api/docs` (no slug) is 404 in production — the intended hide. `GET /api/docs/{slug}` remains mounted because `DocViewerPage.tsx` does `fetch(`${API_BASE_URL}/api/docs/${slug}`)` for `issue-ledger`, `testable-predictions`, `reviewer-packets`, `researcher-review-pack`. Serving those slugs from repo-root `docs/` is a deliberate public-docs feature (scientific honesty), not an accidental OpenAPI leak. **However** the production image cannot fulfill it: `Dockerfile.backend` copies only `backend/app`, `alembic`, and the entrypoint (no repo-root `docs/`). `_get_docs_dir()` walks six parents from `docs_routes.py`; in the image that is `/app/app/api/routes/docs_routes.py` → `/docs`, which is not in the image. Locally the same walk lands on `/workspace/docs` and works. Operator checklists that `curl -I https://api.conscious.energy/api/docs` ([PUBLIC_DEPLOYMENT_TRACKER.md](../PUBLIC_DEPLOYMENT_TRACKER.md), [DEPLOYMENT_CHECKLIST.md](../../DEPLOYMENT_CHECKLIST.md) line 43 still says Swagger should **load**) will confuse “Swagger off” with “in-app docs on”. Seed hypothesis 3 is confirmed as a docs/operator contradiction; hiding Swagger in code is correct.
- recommendation: Keep slug routes public if the SPA documentation pages stay public. Copy `docs/ISSUE_LEDGER.md` (and the other three mapped files) into the image at a stable path, or bake them into the Pages bundle so the API is not the store. Point `_get_docs_dir()` at that path instead of a six-parent walk. Treat `GET /api/docs` (no slug) 404 as the Swagger-off probe; treat `GET /api/docs/issue-ledger` as a separate product check. Align `DEPLOYMENT_CHECKLIST.md` (Agent G).

### API-003
- severity: major
- surface: api
- status: confirmed
- evidence: Two CORS layers both fire on the public API host. FastAPI: `setup_middlewares` adds `CORSMiddleware` with `allow_origins=settings.CORS_ORIGINS`, `allow_credentials=True`, methods/headers `*`. Traefik (Swarm): `docker-stack.yml.j2` attaches `backend-cors` with `accesscontrolalloworiginlist=https://{{ app_domain }},https://www.{{ app_domain }}`, methods `GET,POST,PUT,DELETE,OPTIONS`, headers `Content-Type,Authorization,X-LENR-Write-Token`. There is **no** Traefik `accesscontrolallowcredentials`. The SPA origin is `https://conscious.energy` (Pages custom domain) calling `https://api.conscious.energy` (cross-origin). Duplicate `Access-Control-Allow-Origin` values are a classic browser failure. `main.py` imports `CORSMiddleware` but does not add a second FastAPI layer; the dual stack is FastAPI + Traefik. Seed hypothesis 10 is confirmed for CORS (GHCR image-name casing is out of scope here). No CORS unit test exists.
- recommendation: Keep **one** CORS enforcer. Prefer FastAPI `CORSMiddleware` (it already echoes `X-LENR-Write-Token` via `allow_headers=["*"]` and matches Settings) and delete the Traefik `backend-cors` middleware from the backend router; or disable FastAPI CORS in production and make Traefik complete (add credentials if the client ever sends cookies). Before go-live, `curl -sD - -o /dev/null -H "Origin: https://conscious.energy" -H "Access-Control-Request-Method: POST" -X OPTIONS https://api.conscious.energy/api/health` and confirm a **single** `Access-Control-Allow-Origin`. Elevate to blocker if live headers are duplicated. Agent F should pair on the Traefik labels.

### API-004
- severity: minor
- surface: api
- status: confirmed
- evidence: Production fallback in `config.py` only replaces origins when the configured set is empty or a subset of `{localhost:3000,3001,5173}`. Swarm already sets apex + www, so the fallback is a misconfig net, not the live path. Gaps: (1) `LENR_CORS_ORIGINS=http://localhost:3000,https://conscious.energy` is **not** a subset of the local set, so localhost survives in production. (2) Cloudflare Pages default hostname (`lenr-sim-${environment}.pages.dev` from `cloudflare_pages_project.frontend`) and preview deployments are not in the allow-list; apex custom domain is. Traefik CORS list matches apex + www only. Frontend production `API_BASE_URL` falls back to `https://api.conscious.energy`.
- recommendation: If production origins are non-empty, strip any `http://localhost*` / `127.0.0.1` entries rather than requiring a pure-localhost set. Add `https://www.conscious.energy` (already present) and, if operators still open the `*.pages.dev` URL, that origin too — or redirect Pages.dev to the custom domain and leave CORS tight. Add a Settings unit test for the fallback and the mixed-origin footgun (none today).

### API-005
- severity: accepted-residual
- surface: api
- status: confirmed
- evidence: Experiment **mutations** are token-gated: `POST /api/analytics/experiments`, `PUT /api/analytics/experiments/{id}`, `DELETE /api/analytics/experiments/{id}`, `POST /api/analytics/experiments/{id}/timeline`. Guard matches `X-LENR-Write-Token` to `LENR_ANALYTICS_WRITE_TOKEN` or, if unset, `SECRET_KEY` (`analytics_write_guard.py`). GET `/stats`, distributions, experiment list/detail, timeline GET, `GET /export/csv`, `GET /export/json` are public by design (public dashboard + CSV dump of the demo pack). These POSTs are **compute**, not experiment inserts, and have no write dependency: `/compare`, `/theory-scores`, `/theory-comparison`, `/parameter-sweep`. `POST /analytics/theories/run-coupled` can call `persist_theory_pipeline`, which no-ops when `persistence_enabled()` is false. Production default + Swarm `LENR_AUTO_PERSIST=0` keep that path from writing. The hardening HTTP test monkeypatches `settings.ENVIRONMENT` on the already-constructed test app; it correctly exercises the request-time guard, not router inclusion.
- recommendation: Keep GET/stats public. Do not require the write token on scoring POSTs unless you want to cap anonymous compute (rate-limit already exists). If an operator sets `LENR_AUTO_PERSIST=1` in production, treat that as an explicit choice to persist anonymous `/simulate` and `/theories/run-coupled` runs. Document that CSV/JSON export is world-readable.

### API-006
- severity: major
- surface: api
- status: confirmed
- evidence: Analytics is not the only production mutate surface. Still mounted with no write token: `POST /api/physics/enhancement-cache-clear` (clears process cache), `POST /api/simulations/save` and `POST /api/simulations/share` (session_id only; architecture seed), `POST /api/results/simulations/{id}/save` and `DELETE /api/results/simulations/{id}` (disk under the results dir), `POST /api/physics/reactions/custom` and `DELETE /api/physics/reactions/custom/{reaction_name}`. These are in `app/routers/` and included outside the dev-router gate. Agent E owns abuse/DoS; they are listed here because they are public API contract, not hidden debug.
- recommendation: Environment-gate cache-clear, custom-reaction mutate, and results delete/save the same way as diagnostics, **or** reuse `require_analytics_write` / a generic write dependency. Shared-simulation save can stay if you want anonymous collaboration, but bound it (size, rate, no public flag without a token). Pair with Agent E.

### API-007
- severity: minor
- surface: api
- status: confirmed
- evidence: Unified HTTP + websocket use `CONTRACT_VERSION = f"v{settings.APP_VERSION}-science-gate-1"` (`unified_simulation.py`). `theory_pipeline.TheoryPipelineResult.to_dict()` hardcodes `"contract_version": "v0.3.6-beta-science-gate-1"`. Today both equal the lock. A version bump that only changes `APP_VERSION` would split `/api/unified/simulate` from `/api/physics/theories/run` until the pipeline string is edited. Integration tests mix exact-string and `.endswith("-science-gate-1")` asserts, so some would catch it.
- recommendation: Import `CONTRACT_VERSION` (or `f"v{settings.APP_VERSION}-science-gate-1"`) in `theory_pipeline.py` so one bump updates every science-gate payload.

### API-008
- severity: minor
- surface: api
- status: confirmed
- evidence: `test_production_hardening.py` covers `openapi_surface()`, `Settings()` boot, `persistence_enabled()`, and the write-guard function, plus one HTTP write against the **test-constructed** app with `ENVIRONMENT` monkeypatched. It does not construct `FastAPI` with `openapi_surface(PRODUCTION)`, so it never asserts `GET /api/docs`, `/api/redoc`, `/api/openapi.json`, `/metrics`, `/api/fitting`, `/memory` as HTTP 404 on a production app. Router inclusion is import-time; monkeypatch cannot unmount OpenAPI or fitting.
- recommendation: Add a fixture that instantiates Settings with `ENVIRONMENT=production` and a dummy `SECRET_KEY`, builds a minimal app (or imports main under that env in a subprocess), and asserts the hide/404 matrix. Keep it out of the full-suite wall-clock budget (Agent A).

## Explicitly not blockers (this wave)

- **Swagger/ReDoc/OpenAPI JSON** are disabled in production via `openapi_surface`. `app.openapi = custom_openapi` remains assigned but FastAPI does not mount `/api/openapi.json` when `openapi_url` is `None`.
- **Prometheus `/metrics`** is not instrumented in production.
- **Dev routers** (fitting, logs, diagnostics, mock simulations) are not included.
- **`LENR_SECRET_KEY`** is required at Settings init; Swarm entrypoint maps `api_secret_key`.
- **Auto-persist** defaults off; Swarm sets `0`.
- **`/memory` and `/cache/*`** return 404 in production.
- **Export envelope** `schema_version` is exactly `lenr-run-export-v1`.
- **`HTTPS_REDIRECT`** in Settings is unused (Traefik redirects HTTP→HTTPS). Not an API-contract defect; Agent F.

## Pytest

```
cd /workspace/LENR_SIM_APP_v2/backend
python3 -c "import fastapi, pydantic, pytest"
# ModuleNotFoundError: No module named 'fastapi'
```

Did not run `pytest tests/test_integration/test_production_hardening.py tests/test_physics/test_run_export.py`. Static reading of those tests matches the production-hardening behavior described above.

## Summary

The science-gate tokens (`v0.3.6-beta-science-gate-1`, `lenr-run-export-v1`) and the 08-27 production boot lock (OpenAPI off, metrics off, dev routers off, secret key required, auto-persist default off, analytics experiment writes token-gated, `/memory` 404) hold in code.

Public-release friction is the **browser surface**, not the version strings: dual FastAPI+Traefik CORS ([API-003](#api-003)), in-app `/api/docs/{slug}` mounted but empty in the production image ([API-002](#api-002)), a stale `GET /` catalog ([API-001](#api-001)), and several unauthenticated mutate routes outside Analytics ([API-006](#api-006)). None of those is a contract-token break. [API-003](#api-003) is the one to re-check on the live API before calling the SPA go.

**Go/no-go from Agent C:** no API-contract **blocker** on tokens or the documented production hide-list. **Do not ship the SPA against this API** until [API-003](#api-003) is disproved on live headers or one CORS layer is removed.
