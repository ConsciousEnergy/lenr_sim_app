# Pull Request: v0.3.6-beta -> main

## Summary
- Aligns the release to `v0.3.6-beta` across backend, frontend, Docker, docs, and CI surfaces.
- Unifies electrolyte guardrail logic to a single shared backend source and propagates it across unified simulation paths.
- Improves contract transparency and runtime consistency for Unified Theory API/UI integration.
- Hardens CI and release governance artifacts for pre-push verification and auditability.

## Base and Compare
- Base branch: `main`
- Compare branch: `lenr_sim_app_v0.3.6-beta`

## Included Workstreams
- Contract and version lock
- Backend electrolyte and theory-pipeline parity
- Frontend contract/env/websocket consistency
- CI and security gate hardening
- Governance and deployment documentation refresh
- Verification evidence bundle update

## Verification Checklist
- [ ] Backend tests pass
- [ ] Frontend lint/test/build pass
- [ ] `npm audit --audit-level=high` passes
- [ ] `pip-audit` passes for backend dependencies
- [ ] Unified Theory runtime parity checks documented
- [ ] v0.3.6-beta docs and changelog updated
