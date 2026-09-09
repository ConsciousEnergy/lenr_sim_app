# Release Quality Gate - Reference

Full gate inventory and evidence-doc map. Workflow is in [SKILL.md](SKILL.md).

## CI jobs (`.github/workflows/test.yml`)

- `version-consistency` (runs first; everything else `needs` it): compares the four version markers and fails on any mismatch.
- `test` (matrix Python 3.10 / 3.11 / 3.12): `pip-audit`, unit (`tests/ app/tests/` + coverage), integration, deterministic V&V benchmark gates, release-blocking experiment-anchored science gates, optional performance benchmarks, coverage upload.
- `frontend`: `npm ci`, `npm audit --audit-level=high`, `npm run lint`, `npm test`, `npm run build`.
- `frontend-e2e`: Playwright Chromium (`npm run e2e`).
- `formalization`: equation IR check, IR-vs-Python literal diff, `lake build`.
- `compose-config`: `docker compose ... config -q` for `infrastructure/vps/docker-compose.prod.yml`.

## Version markers (must all equal, e.g. `0.3.6-beta`)

- `LENR_SIM_APP_v2/backend/app/core/config.py` -> `APP_VERSION: str = "..."`
- `LENR_SIM_APP_v2/frontend/package.json` -> `.version`
- `LENR_SIM_APP_v2/frontend/src/config/version.js` -> `APP_VERSION = '...'`
- `LENR_SIM_APP_v2/infrastructure/docker/Dockerfile.backend` -> `BUILD_VERSION=...`

## Release-blocking science gates

- `tests/test_integration/test_experiment_anchored_gates.py` (experiment observables as falsifiable regressions: Miles 24+/-4 MeV band, He-4 primary ash, aneutronic clean branch, NASA LCF ErD3 screening, p-Li7 channels, Parkhomov subset, ordered+cited screening ranges).
- `tests/test_integration/test_rate_engine_api.py`, `tests/test_physics/test_reaction_rate_engine.py`, `test_cavitation_kgrp.py`, `test_shell_pairing_prior.py`, `test_run_export.py`.
- `tests/test_integration/test_physics_benchmark_gates.py` (deterministic V&V, includes the <=1e5 enhancement cap gate).

## Governance / evidence docs

- `docs/v0.3.6-beta/RUBRIC_GOVERNANCE.md` - 7-dimension research rubric; PR slices need pre/post rubric + falsification evidence; claim-tier multipliers (1.0 -> 0.2).
- `docs/v0.3.6-beta/VERIFICATION_GATE_REPORT.md` - running verification record; add a section per release.
- `docs/v0.3.6-beta/RELEASE_EVIDENCE_PACK.md`, `PUBLIC_DEPLOYMENT_TRACKER.md` - release evidence + deployment status.
- `docs/v0.3.6-beta/PROVENANCE_GOVERNANCE.md`, `DATA_CONTRACT_LOCK.md`, `REPRODUCIBILITY_EXPORT_SCHEMA.md` - metadata, locked contract, export envelope.
- `docs/DEPLOYMENT_CHECKLIST.md`, `DEPLOYMENT_QUICK_REFERENCE.md` - deploy steps.

## Known pre-existing issue

`TestPhysicsCalculations` can fail under full-suite request flooding (rate-limit
429) - a documented test-isolation issue (see VERIFICATION_GATE_REPORT.md), passes
in isolation. Do not confuse it with a regression, but do not use it to excuse a
real gate failure.

## Related skills/rules

- `api-contract-tester` - proves the export envelope + contract survive.
- `wolfram-verification` - verifies changed numeric values.
- [scientific-rigor-provenance.mdc](../../rules/scientific-rigor-provenance.mdc), [scientific-citations.mdc](../../rules/scientific-citations.mdc) - the always-on conventions the gate enforces.
