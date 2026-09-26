# Contributing to LENR Simulation App

Thank you for considering a contribution. The application lives under
[`LENR_SIM_APP_v2/`](LENR_SIM_APP_v2/); all work happens in that tree. (The
legacy `LENR_SIM_APP_v1/` tree and root `backend/` / `frontend/` mirrors were
removed from the working tree; they remain in history at the
`archive/pre-legacy-removal` tag.)

## License

This project is licensed under **GNU GPL-3.0**. By contributing you agree that
your contributions are licensed under the same terms. See [`LICENSE`](LICENSE).

## Security

Do **not** open public issues for vulnerabilities that could be exploited in
production. Follow [`SECURITY.md`](SECURITY.md) for private reporting.

Never commit secrets, real `.env` files, cloud tokens, or SSH keys. Use
`LENR_SIM_APP_v2/backend/.env.example` and infrastructure `*.example` templates.

## Scientific honesty (required)

This codebase ships contested LENR hypotheses under explicit **claim tiers** and
**evidence classes**. Contributions must:

- Keep quantitative UI claims next to a claim-tier chip / provenance metadata.
- Not reintroduce superseded numeric bands (e.g. tunneling enhancement \(10^{8}\);
  the adopted software band is \(10^{3}\)–\(10^{5}\)).
- Prefer additive API contract changes; do not drop locked
  `contract_version` / `lenr-run-export-v1` fields.
- Treat formalization / Lean results as **mathematical consistency** checks, not
  as proofs that LENR occurs.

See `LENR_SIM_APP_v2/docs/v0.3.6-beta/RUBRIC_GOVERNANCE.md` and
`.cursor/rules/scientific-rigor-provenance.mdc`.

## Getting started

1. Fork and clone the repository.
2. Work in `LENR_SIM_APP_v2/`.
3. Backend: create a venv, `pip install -r backend/requirements.txt`, run
   `uvicorn app.main:app --reload --port 8010` from `backend/`.
4. Frontend: `cd frontend && npm ci` (honours `.npmrc` `legacy-peer-deps=true`),
   then `npm run dev`.
5. Optional local stack: `docker compose` from `LENR_SIM_APP_v2/` (see
   `infrastructure/docker/`).

## Development workflow

The repository is trunk-based: `main` is the only long-lived branch and
releases are `v*` tags. See [`.github/BRANCHING.md`](.github/BRANCHING.md) for
the full model, naming rules, and the hotfix flow.

1. Create a short-lived branch from `main`: `feat/<topic>`, `fix/<topic>`,
   `chore/<topic>`, or `docs/<topic>`.
2. Keep changes focused; do not mix unrelated refactors.
3. Add or update tests for behaviour you change.
4. Before opening a PR, run the [release quality gate](.cursor/skills/release-quality-gate/SKILL.md)
   slice that applies (at minimum: relevant pytest, frontend lint/test/build,
   and `npm audit --audit-level=high` / `pip-audit` when touching deps).
5. Update [`CHANGELOG.md`](CHANGELOG.md) for user-visible changes.
6. Open a PR against `main` using [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md).
   PRs are squash-merged once CI is green and reviewed; the head branch is
   deleted automatically on merge.

## Code style

### Python / FastAPI

- Type hints on public functions; Pydantic models for request/response bodies.
- Prefer early returns and guard clauses.
- Physics modules implement the `TheoryModule` protocol; scaffold with
  `.cursor/skills/theory-module-scaffold/SKILL.md`.

### React / Vite

- Use the shared Axios client in `frontend/src/api/client.ts`.
- Prefer `.jsx` / `.tsx` for new components; follow existing MUI patterns.
- Do not add a fourth WebSocket client; reuse the three documented ones.

## Version markers

Keep these four strings identical when bumping a release:

- `LENR_SIM_APP_v2/backend/app/core/config.py` → `APP_VERSION`
- `LENR_SIM_APP_v2/frontend/package.json` → `"version"`
- `LENR_SIM_APP_v2/frontend/src/config/version.js` → `APP_VERSION`
- `LENR_SIM_APP_v2/infrastructure/docker/Dockerfile.backend` → `BUILD_VERSION`

## Questions

Use GitHub Discussions/Issues for product questions.

## Cutover & deployment (current truth)

Dual KVM2 (Compose share + dedicated `lenr-ci`) does **not** authorize public
Swarm/Traefik/Cloudflare cutover by itself — see
[`DUAL_KVM2_SWARM_READINESS.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/DUAL_KVM2_SWARM_READINESS.md).
Open-PR cleanup order:
[`PR_AND_BRANCH_HYGIENE.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/PR_AND_BRANCH_HYGIENE.md).

| Stage | Confirm | Notes |
|-------|---------|-------|
| Live Compose share (now) | Operator `VPS_*` / SSH | [`LENR_SIM_APP_v2/docs/v0.3.7-beta/LIVE_SHARE_STATUS.md`](LENR_SIM_APP_v2/docs/v0.3.7-beta/LIVE_SHARE_STATUS.md) |
| Staging Swarm | `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8` | [`docs/v0.3.8-beta/STAGING_SWARM_DRY_RUN.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/STAGING_SWARM_DRY_RUN.md) |
| Public Swarm + Pages | `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9` | [`docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`](LENR_SIM_APP_v2/docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md) |

Do not apply public Swarm without the 0.3.9 confirm. Checklist overview:
[`LENR_SIM_APP_v2/docs/DEPLOYMENT_QUICK_REFERENCE.md`](LENR_SIM_APP_v2/docs/DEPLOYMENT_QUICK_REFERENCE.md).

## CI expectations

- Prefer dense, single-topic PRs ([`.github/BRANCHING.md`](.github/BRANCHING.md)).
- Self-hosted runner labels and `LENR_CI_RUNS_ON`:
  [`LENR_SIM_APP_v2/docs/v0.3.7-beta/SELF_HOSTED_RUNNER.md`](LENR_SIM_APP_v2/docs/v0.3.7-beta/SELF_HOSTED_RUNNER.md).
- Academic / ledger / proof-matrix edits belong on a **separate** PR from
  CI/infra changes. Never close `EQ-OPEN-*` in drive-by docs.
- Agent orientation: root [`AGENTS.md`](AGENTS.md).
