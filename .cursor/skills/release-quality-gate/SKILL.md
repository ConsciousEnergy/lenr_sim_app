---
name: release-quality-gate
description: >-
  Run the LENR_SIM_APP pre-release definition-of-done - version consistency
  across all surfaces, the release-blocking science gates, security/lint/build,
  and the governance evidence (rubric, verification gate report, provenance).
  Use before tagging a release, cutting a release branch/PR, or bumping the app
  version.
---

# Release Quality Gate

## Overview

A release here is not just green unit tests - it must clear version consistency,
the experiment-anchored science gates, security audits, and the governance
evidence trail. This skill is the single pre-release definition of done that ties
those together so nothing ships half-verified.

## When to Use

- Before tagging a release or cutting a release branch/PR.
- When bumping `APP_VERSION` anywhere.
- Before deploying to a public environment.

## Process

```
- [ ] 1. Version consistency across ALL surfaces
- [ ] 2. Backend gates: audit, tests, V&V + science gates
- [ ] 3. Frontend gates: audit, lint, tests, build
- [ ] 4. Governance evidence: rubric, verification report, provenance
- [ ] 5. Reproducibility + CHANGELOG
- [ ] 6. Confirm CI is green on the release branch
```

**Step 1 - version must match in four places** (the CI `version-consistency` job fails fast otherwise):
- `LENR_SIM_APP_v2/backend/app/core/config.py` -> `APP_VERSION: str = "X"`
- `LENR_SIM_APP_v2/frontend/package.json` -> `"version": "X"`
- `LENR_SIM_APP_v2/frontend/src/config/version.js` -> `APP_VERSION = 'X'`
- `LENR_SIM_APP_v2/infrastructure/docker/Dockerfile.backend` -> `BUILD_VERSION=X`

**Step 2 - backend (mirror `.github/workflows/test.yml`):**

```bash
cd LENR_SIM_APP_v2/backend
pip-audit -r requirements.txt
python -m pytest tests/ app/tests/ --cov=app --cov-report=xml
python -m pytest tests/test_integration/test_physics_benchmark_gates.py -v
python -m pytest -v \
  tests/test_integration/test_experiment_anchored_gates.py \
  tests/test_integration/test_rate_engine_api.py \
  tests/test_physics/test_reaction_rate_engine.py \
  tests/test_physics/test_cavitation_kgrp.py \
  tests/test_physics/test_shell_pairing_prior.py \
  tests/test_physics/test_run_export.py
```

The last block is the **release-blocking experiment-anchored science gates** - do not waive them.

**Step 3 - frontend:**

```bash
cd LENR_SIM_APP_v2/frontend
npm audit --audit-level=high
npm run lint
npm test -- --watchAll=false --passWithNoTests --runInBand
npm run build
```

**Step 4 - governance evidence** (update, do not skip):
- `docs/v0.3.6-beta/RUBRIC_GOVERNANCE.md` - pre/post rubric scores + falsification evidence for the change slice.
- `docs/v0.3.6-beta/VERIFICATION_GATE_REPORT.md` - add/refresh the section for this release.
- `docs/v0.3.6-beta/RELEASE_EVIDENCE_PACK.md` + `PUBLIC_DEPLOYMENT_TRACKER.md` - link the evidence.
- New/changed UI claims carry provenance + a claim-tier chip (see [scientific-rigor-provenance.mdc](../../rules/scientific-rigor-provenance.mdc)); numeric changes verified via the `wolfram-verification` skill.

**Step 5 - reproducibility + changelog:**
- Confirm `POST /api/unified/export` still returns `schema_version: lenr-run-export-v1` with seeds + citations (use the `api-contract-tester` skill).
- Update `CHANGELOG.md` with the version, date, and change summary.

## Rationalizations (excuses -> rebuttal)

- "Unit tests pass, ship it." -> Version drift, a failing science gate, or missing provenance still block release; run the full gate.
- "The science gate is flaky, waive it." -> It is release-blocking by design; fix the cause or hold the release.
- "I'll update the CHANGELOG/evidence after tagging." -> Evidence is part of done; a release without it is non-release-ready.

## Red Flags

- Any of the four version markers disagree.
- An experiment-anchored gate is skipped, xfailed, or "temporarily" disabled.
- `pip-audit` or `npm audit --audit-level=high` reports unresolved high/critical issues.
- New UI numeric claim without a claim-tier chip / provenance.
- Export envelope or `contract_version` changed non-additively.

## Verification

- Four version markers identical; CI `version-consistency` passes.
- All backend + frontend gate commands above pass locally and in CI.
- Governance docs updated; CHANGELOG bumped; export envelope intact.
- CI is green on the release branch before tagging.

See [reference.md](reference.md) for the full gate inventory and evidence-doc map.
