# v0.3.6-beta Phase 0 Full-Stack Audit Report

## Scope
- Backend router topology and endpoint mount consistency.
- Frontend simulation, testbed, and visualization data flow.
- Backend->API->frontend contract coverage for confidence/observables.
- Runtime mode and local/dev-docker/prod port policy drift.

## Findings
- Backend route tree is mounted under `/api`, with primary simulation endpoints at `/api/unified/*` and theory testbed under `/api/physics/theories/*`.
- Frontend `UnifiedTheoryPage` requests `/api/unified/bubble-lattice` and renders timeline/phases/3D directly from simulation payload.
- Theory testbed runs through `PhysicsContext.runTheories()` and previously exposed only scalar confidence without rubric decomposition.
- Hydroton was still present as a default fallback frontend registry item and active backend theory registration path.
- Port references were inconsistent across code/docs/scripts (`8000`, `8001`, `8010`) creating local runtime ambiguity.

## Contract Risks Identified
- No explicit contract version to lock frontend parsing behavior.
- Missing uncertainty intervals and falsification conditions in theory contribution output.
- Missing observables bridge envelope for result cards and cross-page analytics coherence.
- Missing electrolyte/alkali bounded context in standard theory conditions.

## Implemented During Audit
- Added contract version and transparency payload fields in theory pipeline result.
- Added per-theory confidence breakdown, uncertainty interval, falsification conditions, evidence/reproducibility tiers, and provenance metadata.
- Added bounded electrolyte context fields to theory conditions and unified simulation request.
- Added contradiction detection support in frontend derived-state utility.
- Disabled Hydroton default registration path behind explicit `ENABLE_LEGACY_HYDROTON`.

## Decision Log
- Canonical local backend host port is `8010`.
- Dev frontend remains `3000` with proxy path `/api`.
- Hydroton remains legacy-only and opt-in for compatibility tests, not default runtime scoring.
- Confidence and evidence logic is backend-owned; frontend renders only.

## Open Risks
- Legacy/archival docs still include `8000` references and should be progressively corrected.
- Some legacy/utility components still hold hardcoded backend assumptions outside active route flow.
- Full rubric scoring threshold enforcement requires final verification run and report bundling.

