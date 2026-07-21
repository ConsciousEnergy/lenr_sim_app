# Architecture Mapping - Reference

Current known architecture of LENR_SIM_APP_v2 and details of the seed script.
Day-to-day workflow is in [SKILL.md](SKILL.md).

## Backend (FastAPI)

- Entry: `LENR_SIM_APP_v2/backend/app/main.py` - creates the app with a `lifespan`
  context manager, custom OpenAPI (`/api/openapi.json`, docs at `/api/docs`), and
  a middleware stack (request ID, logging, performance, secure headers, rate
  limit, CORS).
- Two router layouts (know which is canonical):
  - `app/api/routes/` - newer surface (`unified_simulation.py`, `physics.py`, `docs_routes.py`).
  - `app/routers/` - legacy/primary aggregate (`physics_routes.py`, `analytics_routes.py`, `shared_simulation_router.py`, ...).
- Dev-only routers are environment-gated (`settings.ENVIRONMENT != PRODUCTION`): diagnostics, logging, fitting, mock simulations.
- DI: `app/core/dependencies.py` (`get_physics_components`, `get_fusion_calculator`), `app/core/database.py` (`get_db_session`), config via `get_settings()` (`LENR_` env prefix).
- No auth implemented; `shared_simulation_router.py` uses a `session_id` query param for private simulation access.

## Physics pipeline (the scientific core)

- `physics_engine/theory_pipeline.py` + `theory_scoring.py` orchestrate the ~21 registered `physics_engine/theories/*.py` modules (each implements the theory protocol, declares `references`, emits `claim_tier`/`provenance`).
- `unified_lenr_model/` package is canonical (the same-named `.py` monolith is deprecated/shadowed).
- Reaction rate: `unified_lenr_model/reaction_rate_engine.py` (`two_body` validated baseline, `trapped_state` speculative) + `reaction_rate_uq.py` (Sobol/Bayesian intervals).
- `scientific_guardrails.py` applies domain validation on unified routes.
- `run_export.py` emits the reproducibility envelope `schema_version: lenr-run-export-v1` (params, results, seeds, per-run citations).

## Frontend (React + Vite)

- Entry `src/index.jsx` -> provider tree: `OfflineProvider > ThrottleProvider > SnackbarProvider > App` (App adds `ThemeProvider` + `PhysicsProvider`).
- State via Context API (`src/contexts/`); `@tanstack/react-query` installed but unused.
- Canonical HTTP client `src/api/client.ts` (Axios); base URL from `src/config/api.js` (dev uses Vite proxy `/api`, `/ws` -> backend `:8010`).
- Three WebSocket clients: `services/websocket.js` (simulation), `api/physics/websocketClient.ts` (typed physics), `utils/visualizationWebSocket.js` (viz).
- Science governance mirror: `src/utils/theoryGovernance.ts` (`CLAIM_TIER_MULTIPLIER`) <-> backend `theory_scoring.py`.

## Data contract

- Theory-pipeline responses carry `contract_version` (`v0.3.6-beta-science-gate-1`) with required fields `confidence_breakdown`, `uncertainty_interval`, `falsification_conditions`, `provenance`. Frontend renders; it does not score.

## Seed script

`scripts/map_endpoints.py` (stdlib only) scans `LENR_SIM_APP_v2/backend/app` and
`LENR_SIM_APP_v2/frontend/src` and prints:
- route decorators (`@router.get/post/...`) with method + path, grouped by file
- `include_router(...)` registrations with prefix
- frontend context providers and WebSocket entry points

It is a best-effort regex scan (not a full AST/route resolver): decorators split
across lines or built dynamically may be missed. Treat the output as a seed to
verify against the source, not an authoritative route table (the authoritative
list is `/api/openapi.json` at runtime).
