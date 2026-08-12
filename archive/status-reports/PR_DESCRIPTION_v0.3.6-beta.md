# Pull Request: v0.3.6-beta -> main

## Summary
- Aligns the release to `v0.3.6-beta` across backend, frontend, Docker, docs, and CI surfaces.
- Unifies electrolyte guardrail logic to a single shared backend source and propagates it across unified simulation paths.
- Improves contract transparency and runtime consistency for Unified Theory API/UI integration.
- Completes CRA -> Vite migration in-scope for `v0.3.6-beta` and validates local build/test/dev workflows.
- Hardens CI and release governance artifacts for pre-push verification and auditability.
- Resolves desktop zoom-control overlap by moving controls into the right-side visualization control stack.

## Base and Compare
- Base branch: `main`
- Compare branch: `lenr_sim_app_v0.3.6-beta`

## Included Workstreams
- Contract and version lock
- Backend electrolyte and theory-pipeline parity
- Frontend contract/env/websocket consistency
- Vite migration and post-migration stabilization
- CI and security gate hardening
- Governance and deployment documentation refresh
- Verification evidence bundle update

## Verification Checklist
- [ ] Backend tests pass
- [ ] Frontend lint/test/build pass
- [ ] `npm audit --audit-level=high` passes
- [ ] `pip-audit` reviewed with residual-risk notes for transitive findings
- [ ] Unified Theory runtime parity checks documented
- [ ] v0.3.6-beta docs and changelog updated
