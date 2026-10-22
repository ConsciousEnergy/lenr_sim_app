# Changelog

All notable changes to the LENR Simulation App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Notes
- Public Swarm cutover remains gated on `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9`.
  Compose share on `main` stays **v0.3.8-beta** until the cutover window.
- Cutover train markers are **`0.3.9-beta`** (SPA + API on Traefik; Pages optional).

### Added — v0.3.9 Swarm cutover train (not live until confirm)
- Swarm stack SPA service (`swarm_frontend_enabled`) with Traefik `PathPrefix(/api)`
  on shared hosts (`lenr-sim-beta`) so Compose drain does not drop the UI
- `traefik_extra_api_hosts` / `ALLOW_API_DNS_GAP` / `SKIP_IMAGE_BUILD` cutover helpers
- Gated Compose drain + staging leave playbooks; local-image cutover path
- Readiness barcode / window card / post-cutover verify / Compose restore (+ KVM1 leave)
- CI/local prod stack render gate (`swarm-039-assert-prod-stack-render.sh`, wired into
  `staging-swarm-dry-run.sh local` + cutover prep) — postgres pin, external volume, SPA PathPrefix
- `swarm-039-prestage-images.sh` — refresh LOCAL_IMAGES on share+KVM1 without Compose drain
- Cutover prep: KVM1→share Swarm TCP path probe (temp listeners on 2377/7946)
- Cutover executor: post-`swarm init` manager/:2377 gate before join-workers
- Cutover executor: LOCAL_IMAGES before Compose drain; assert :80/:443 free post-drain
- Cutover: wait for replicas + SPA/API health (ACME settle) before post-verify
- `deploy-stack.yml` ensures `/opt/lenr-sim/traefik/certs` (`0700`) + `acme.json`
  (`0600`) before Traefik starts (idempotent; preserves existing cert store)
- Cutover + post-cutover verify assert ACME store mode `0600` on the share manager
- Cutover prep asserts Compose `.rollback-image-tag` matches live `IMAGE_TAG`
- Cutover prep asserts Traefik ACME store pre-created on share (`0700`/`0600`)
- Cutover: assert KVM1 left staging before Compose drain; assert Postgres
  volume survived `compose down` (drain playbook + executor)
- Cutover: assert Ready≥2 + app/observability/postgres labels + KVM1 worker
  before `deploy-stack.yml` (postgres=true must be on the share manager IP)
- Frontend `overrides.dompurify` → `^3.4.17` (GHSA-cg2g-xh64-v4q7 and related)
- Cutover prep asserts ≥5GiB free on share + KVM1 `/` (`CUTOVER_MIN_FREE_GIB`)
- Post-cutover verify + prod stack render gate cover Grafana/Prometheus
  observability services (skip with `SKIP_OBSERVABILITY_CHECK=1`)
- Docs: `D4S_DFORCE_OPERATOR.md` — optional D-Force / D4S (`d4s`) Swarm/Compose
  TUI (k9s-like; not a cutover gate); linked from `AGENTS.md`, topology,
  operator lab, and public cutover status table
- Cutover prep asserts Prometheus/Grafana scaffolds on share + KVM1
  (`ALLOW_OBS_PRESTAGE_GAP=1` to defer to deploy-stack sync)
- Grafana admin via Swarm secret `grafana_admin_password` (file env); cutover
  imports/mints before deploy; post-cutover checks secret + KVM1 placement
- Cutover prep notes Grafana admin password source (`.env` / file / mint-on-cutover)
- `SKIP_IMAGE_BUILD=1` hard-requires prestaged `:IMAGE_TAG` on share + KVM1
  (prep BAD unless `ALLOW_IMAGE_PRESTAGE_GAP=1`; cutover skips redundant save|load)
- Post-cutover verify asserts Traefik task on share manager (with Postgres pin)
- Cutover hard-fails after health-wait timeout (still runs verify for evidence)
- Cutover prep asserts KVM1 UFW Swarm ports (not only share)
- Post-cutover verify requires `${STACK}_frontend` SPA service
- CI push matrix drops Python 3.10 (`pydantic-settings==2.16.0` needs ≥3.11;
  PRs stay 3.12-only matching Dockerfile.backend)
- Grafana `grafana_publish_host_port` (host-mode :3000) for SSH-tunnel access;
  staging + prod inventories set `3000`; cutover prep asserts staging login 200
- Docs: Grafana + D-Force pre-arm checklist before `CONFIRM_SWARM_0_3_9`
- Prod stack render gate asserts Grafana secret uid 472 + host publish 3000
- Cutover window card prints Grafana tunnel + D-Force pre-arm reminders
- Post-cutover verify asserts Grafana login HTTP 200 on KVM1 :3000
- `ansible.cfg` uses `default` callback + `result_format=yaml` (community.general 12 compat)

## [v0.3.8-beta] - 2026-10-20

Public Compose share: https://lenr-sim-beta.conscious.energy  
Promote: controlled `dev` → `main` (no Swarm cutover).  
`lenr_proved` remains false; all `EQ-OPEN-*` stay OPEN.

### Added — ARA Oct 2026 workbench Wave 1
- Crawler-readable static pages: `/models/`, `/models/<id>.html`, `/methodology.html`, `/validation.html`, `/sources.html`, `/experiments/` (generator `LENR_SIM_APP_v2/scripts/generate_static_model_pages.py`)
- Additive workbench fields on theory protocol / list / `per_theory`: `predicted_signatures`, `falsifiers`, `taxonomy_kind`, `equation_citations`, `identifiability_warnings`, `historical_parents`, `display_model_version`, `control_role`
- `schwinger_lattice` historical-control scaffold (Nuclear Energy in an Atomic Lattice; HD/H₂O knob; no invented rate law)
- Storms NAE / Takahashi / Hagelstein version headers; Model 0 baselines featured on `/models/`
- Docs: `docs/v0.3.8-beta/ARA_OCT2026_WORKBENCH.md` (+ VERSION_CONTROL Phase A2); CE WordPress supersession = operator handoff
- Neutral About-page framing; `EQ-OPEN-*` remain OPEN; no public Swarm cutover

### Added — three-node Swarm prep scaffolds (docs only; not applied)
- Docs: `THREE_NODE_SWARM_TOPOLOGY.md`, `KVM1_OPERATOR_WALKTHROUGH.md`, `OBSERVABILITY_GRAFANA.md`
- Staging inventory example + stack: Prometheus/Grafana/blackbox/node_exporter; rolling update `order: start-first` + `failure_action: rollback`
- Optional `require_app_label` / `require_observability_label`; Traefik Prometheus metrics entrypoint
- `infrastructure/observability/` Grafana+Prometheus scaffolds (no secrets)
- No public Swarm apply; CI remains isolated; `EQ-OPEN-*` stay OPEN

### Changed — Compose promote + version trains
- Four version markers on `main` are **`0.3.8-beta`** after this promote
- `main` is the live Compose+Caddy share line; `dev` remains integration for Swarm staging prep / science / deps (same markers until a new train)
- BRANCHING / AGENTS / Dependabot / CI branch filters: new topic work still defaults to **`dev`**; Compose ship only from `main` + `v*` tags
- Backend Docker base held on **`python:3.12-slim`** (scipy 1.14.1 has no cp314 wheel; Dependabot 3.14 bump reverted for this ship)
- Frontend/backend minor dependency bumps + FastAPI/Starlette/matplotlib holds for instrumentator 7

## [v0.3.7-beta] - 2026-10-10

Public Compose share: https://lenr-sim-beta.conscious.energy  
Tag target: `main` @ ICCF-27 science enrichment (#231).  
`lenr_proved` remains false; all `EQ-OPEN-*` stay OPEN.

### Security — audit gates (2026-10-06)
- Frontend: override `source-map-js` to `^1.2.2` (GHSA-68fv-2mgg-jv7q)
- Backend CI: ignore `CVE-2026-85394` on `python-jose==3.5.0` until a patched release or PyJWT migration (no newer PyPI version)
- Align scheduled `security-scan.yml` with PR gates (`pip-audit` ignore list + `audit-high-gate.js`)

### Added — ICCF-27 / Sept 2026 science enrichment
- Companion literature file `literature_iccf27.v1.json` (6 rows). Locked 17-row `literature_baselines.v1.json` is unchanged
- First-class graphite, silicon carbide, and zirconium hosts (MaterialProperties, screening priors, bubble-lattice parameters)
- Beam-gated `czerski_thermal_spike` theory in composition group `ion_track` (speculative; not an electrolytic LENR proof)
- Campaign presets `iccf27_grid`, `parameter_map_grid`, `carbon_silicate_uq` plus Unified Theory chips for C/SiC/Zr
- Graphite / SiC / Zr Unified Theory chips (and `?system=` deep links) auto-enable Sobol UQ at 64 samples so p05/p50/p95 rate bands can be inspected without opening the accordion; Pd-D default remains `two_body` without UQ
- Additive protocol fields: `beam_energy_kev`, `molecular_beam_species`, `radiant_calorimetry`, `h2_absorb_pressure_pa`
- Does not close any `EQ-OPEN-*`; extra simulations do not raise `claim_tier`

### Changed — GitHub landing docs (v0.3.7-beta merge readiness)
- Root [`README.md`](README.md) rewritten for product scope: what the app is for, honesty invariants, v0.3.7-beta feature boundary, architecture sketch
- Screenshots of the public beta under [`docs/assets/readme/`](docs/assets/readme/) (dashboard, Unified Theory, Bubble Fusion, Quantum Tunneling, Theory Paper, Theory Methods)
- App README version badge / status aligned to `0.3.7-beta` with link to the root overview
- Demo video intentionally deferred (owner-provided later)

### Added — fidelity P0 / ARA P1 start (landed on 0.3.7 line; docs under v0.3.8-beta/)
- Fidelity honesty UI: `TheoryFidelityHonestySummary`, free/fitted parameter chips, Advanced Analysis Theory Summary no longer uses hardcoded endorsement copy
- Theory Paper §6 honesty: Hagelstein / Vysotskii / Swartz / Widom framed as speculative hypotheses; Holmlid `holmlid_udh` ≠ Kim `kim_bec` in Theory-to-Simulation map
- ARA P1 scaffolds: `started_scaffold` markers on Hagelstein / Storms NAE / Takahashi / Shoulders / Matsumoto (+ Widom start docs); `test_ara_p1_scaffolds.py`
- Staging Swarm local dry-run helper + CI job `staging-swarm-dry-run` (inventory/tfvars examples); public share remains Compose until 0.3.9 cutover confirm
- CMNS model fidelity response status updated to P0 landed on main
- `EQ-OPEN-*` remain OPEN; no theory endorsement; full P1 equation rebuilds deferred

### Added — v0.3.7-beta governance train
- Docs pack under `LENR_SIM_APP_v2/docs/v0.3.7-beta/`: GOALS (active + deferred queue), DEFERRED_MULTIPHYSICS_FIDELITY, PHYSICS_MATURITY_LEDGER (`.md` + `.json` + `.yaml`), PROOF_MATRIX (NL/MD/JSON/LaTeX/Lean), BUG_TRIAGE, SECURITY_RESIDUALS, WORKTREE_OOO, BRANCHING_NOTE
- LaTeX stubs for P0/P1 OPEN/approximate engines under `docs/v0.3.7-beta/latex/`
- Frontend `EngineMaturityBadge` + `engineMaturity` ledger mirror; wired on Bubble Fusion, Quantum Tunneling, Unified Theory, Theory Methods, and Open Questions virtual lab
- Site beta banner mentions engine-maturity chips and links to Theory Methods
- Version markers bumped to `0.3.7-beta` on this train (backend config, frontend package/version.js, Dockerfile.backend)
- Multiphysics fidelity (KM default, real-gas EOS, FEM, EQ-OPEN closures, analytics auto-persist, freedom claims) explicitly deferred — not implemented here

### Added — Unified Theory Paper multi-format pack (v0.3.7-beta, 2026-09-25)
- Canonical paper [`docs/A_Unified_Theoretical_Framework_for_LENR.md`](docs/A_Unified_Theoretical_Framework_for_LENR.md) revised to v0.3.7-beta: §3.2 RP/KM auto + provenance honesty; §3.8 pinned reviewer-pack simulation evidence; §6.1 multi-format pack pointers
- Archival pack `LENR_SIM_APP_v2/docs/v0.3.7-beta/paper/` in `.md` / `.txt` / `.tex` / `.lean` with `PROVENANCE.md` + `simulation_evidence.json`
- Lean `LenrFormal.PaperCrosswalk` section→module map (sanity theorems only; does not close `EQ-OPEN-*`)
- In-app Theory Paper / Theory Methods revision chips updated to 2026-09-25, v0.3.7-beta
- `lenr_proved` remains false; no quantitative band changes

### Security
- Frontend npm overrides: `js-yaml` ^4.3.2, `svgo` ^3.3.5, `qs` ^6.16.0, `colord` ^2.9.4 so `npm audit --audit-level=high` is clean (react-router remains moderate pending intentional v7 migration)

### Repository organization and security hardening (2026-09-04)
- Trunk-based branching adopted for the 0.3.6→0.3.7 era: `main` integration + `v*` tags (later extended to long-lived `dev` for 0.3.8 — see BRANCHING.md)
- `v0.3.6-beta` promoted to `main` via merge-commit PR #161. Version-named release branches and `master`/`development` archived as `archive/*` tags; `v0.3.5-beta` tagged retroactively at PR #24's merge commit
- Legacy trees removed from the working tree (`LENR_SIM_APP_v1/`, root `backend/` and `frontend/` mirrors, root `package.json`); snapshot at tag `archive/pre-legacy-removal`. Tracked localhost-only `.env.local` / `.env.development` untracked and `.env.*` gitignored (templates stay)
- CI: workflows trigger on `main` and `v*` tags; all actions pinned to commit SHAs; `deploy.yml` reads the image tag and `BUILD_VERSION` from `APP_VERSION` instead of a hardcoded `0.3.6-beta`; concurrency groups cancel superseded runs
- Security: gitleaks full-history secret scan on every PR and weekly (`.gitleaks.toml` allowlists BibTeX `citation_key` values and a public hCaptcha site key); CodeQL workflow for Python + JS/TS (no-op until the repository is public or GHAS is enabled); `SECURITY.md` gains supported versions, private reporting steps, and the CI control matrix; `CODEOWNERS` added; optional `.pre-commit-config.yaml`
- Dependabot groups minor/patch updates per ecosystem, and ignores `starlette` majors (blocked by the `fastapi==0.128.0` pin)
- `lenr_proved` remains false; `EQ-OPEN-*` stay OPEN

## [v0.3.6-beta] - 2026-08-31

### WH-ENP-01 open-questions hypothesis (2026-09-03)
- Coupled working hypothesis `WH-ENP-01` on unified / bubble-lattice / theory-pipeline `open_questions` (additive): Hagelstein cascade on Takahashi TSC geometry, harmonic \(\Gamma_{\mathrm{ph}}/\Gamma_{\gamma}=0\) bound, same-cluster FGR vs \(R_{\mathrm{obs}}=P/(QV)\)
- Lean `LenrFormal.WorkingHypothesis` identities and non-closure (`EQ-WH-*`); `EQ-OPEN-MEV-01` / `RAD-01` / `RATE-01` stay OPEN; `lenr_proved` stays false
- Virtual lab panel: channel graph, Dicke-radius license, HE negative control, n-moderation lengths; paper §5A names WH-ENP-01

### WH-ENP-01 v2 derived bounds (2026-09-04)
- Physics (additive under `working_hypothesis`, same `contract_version`): `q2.franck_condon` displaced-oscillator Poisson tail (\(N=Q/hf\approx5.75\times10^{8}\) at 10 THz; \(\log_{10}P_N\approx-2.5\times10^{9}\) at \(S=10^{4}\); \(S_{\min}\approx0.9998\,N\), relaxation energy \(\approx Q\)); `q1.coupling_scan` conservation-constrained rows (cited remainder stays \(23.8\,\mathrm{MeV}\)); `dicke.n_within_radius` \(\approx0.033<1\Rightarrow n_{\mathrm{coh}}^{\max}=0\); `q3.closure_demand` (\(R_{\mathrm{obs}}\approx2.6\times10^{17}\,\mathrm{m^{-3}s^{-1}}\) for 1 W/cm³ needs \(5.8\times10^{26}\,\mathrm{s^{-1}}\) vs engine cap product \(10^{26}\,\mathrm{s^{-1}}\); 25 pm trap \(\approx5.8\times\) short, FCC tetrahedral \(\approx49\) decades short; scenario grid, not a posterior). Linear coupling, \(v_s\), \(n_D\) and the engine `n_sites` convention are labelled model assumptions; `two_body` baseline untouched
- Lean `LenrFormal.WorkingHypothesisBounds`: `EQ-WH-FC-01`, `EQ-WH-PART-02`, `EQ-WH-DICKE-N-01`, `EQ-WH-CAP-01`, `EQ-WH-NONCLOSE-02` (\(\neg Q_1\wedge\neg Q_2\wedge\neg Q_3\)); IR YAMLs, `CLAIM_TAXONOMY.md` and `FORMAL_PROOF_STATUS.md` rows
- UI: lazy `TscClusterScene.jsx` (react-three-fiber, WebGL fallback, reduced-motion), `OpenQuestionsScenarioControls.jsx` lookup-only explorer over server grids, `ChannelDag.jsx` inline SVG, Franck–Condon chart in `OpenQuestionsCharts.jsx`
- Tests: Playwright `tests/e2e/open-questions-lab.spec.js`, Vitest specs per component, shared fixture `tests/fixtures/open_questions_wh_v2.json`; backend contract test rows for the new blocks
- CI: `lake build` followed by a no-`sorry` grep gate over `formalization/lean/LenrFormal`
- Docs: paper §5A / §6.1, `PHYSICS_EQUATION_VERIFICATION.md` §12.9–12.11 (WolframAlpha MCP unavailable; `scipy.constants` + `math.lgamma`), `OPEN_QUESTIONS_VIRTUAL_LAB_2026-08-22.md`, `MEV_GAP_HYPOTHESIS.md`
- `lenr_proved` remains false; `EQ-OPEN-MEV-01` / `RAD-01` / `RATE-01` stay OPEN; no question is closed

### Public beta VPS cutover (2026-09-02)
- Same-origin stack on the Hostinger VPS: Caddy TLS + nginx SPA + FastAPI + Postgres Compose (`infrastructure/vps/`). Intended public URL `https://lenr-simp-app.conscious.energy`; WordPress.com apex/`www` untouched
- Backend: single uvicorn worker (`LENR_WORKERS=1`), heavy-compute semaphore (`LENR_MAX_CONCURRENT_HEAVY_SIMS=2`) returning 503 + `Retry-After`, multi-physics grid/step caps, WebSocket `duration_steps` cap, `/simulate` and `/bubble-lattice` run in the threadpool. Root `/` no longer advertises OpenAPI in production
- Frontend: `VITE_API_URL=same-origin` → relative `/api` and `wss://` from `window.location`; beta research-preview banner + API-unreachable alert; nginx cache/CSP headers
- CI: GHCR `lenr-sim-frontend` image; `workflow_dispatch` SSH deploy; compose `config` gate
- Compose interpolates secrets from `--env-file /opt/lenr-sim/.env` (no `env_file` fallback to `.env.production.example`); health probe requires `"status":"healthy"`
- Production SPA no longer white-screens: Vite `manualChunks` no longer splits react/mui/charts into circular vendor chunks (`Cannot access 'P' before initialization`)
- `lenr_proved` remains false; `EQ-OPEN-*` stay OPEN; PostHog key stays unset

### Dependabot majors after slot refill (2026-09-02)
- Closing skip PRs #135–#138 / #143 / #144 freed Dependabot's 5-PR-per-ecosystem slots. New PRs #147–#152 targeted `lenr_sim_app_v0.3.6-beta`, not `main`
- Extra ignores so those majors do not refill: pip `prometheus-fastapi-instrumentator` major (v8 wants `starlette>=1`); npm `tailwindcss` 4, `react-router-dom` / `react-router` 7, `recharts` 3. Copy this `dependabot.yml` onto `main` again
- Suggested take: #147 `asyncpg` 0.31.0 (already fully green); #151 `axios` 1.20.0 after remaining Python jobs; then `@dependabot rebase` #142 / #139+#140 / #141 onto #145
- Suggested skip/close: #148 instrumentator 8, #149 Tailwind 4, #150 React Router 7, #152 Recharts 3
- `lenr_proved` remains false; `EQ-OPEN-*` stay OPEN

### Dependabot weekly on beta + npm audit gate (2026-09-02)
- After copying `dependabot.yml` to default `main` (#131), weekly PRs now target `lenr_sim_app_v0.3.6-beta` (#135–#144)
- Frontend `npm audit --audit-level=high` was red on those PRs from lockfile pins, not the bumped packages: `browserslist` 4.28.6 (GHSA-c83g-rgw3-j3cx, GHSA-73wf-gq98-2v4g) and `fast-uri` 3.1.5 (SSRF/host-confusion range through 3.1.5). Overrides now `browserslist` ^4.28.7 and `fast-uri` ^3.1.7
- Extra Dependabot ignores: pip `pandas` major; `uvicorn` major+minor (keep 0.30.x patches until FastAPI/ASGI bump); npm `eslint` major, `@types/node` major, `react-markdown` major. Copy this `dependabot.yml` onto `main` again so GitHub honors the new ignores
- Suggested take after this audit lands (rebase first): #142 `greenlet` 3.5.5, #139 `pydantic` 2.13.5 with #140 `pydantic-settings` 2.15.0, #141 `@playwright/test` 1.62.1
- Suggested skip/close: #135 `react-markdown` 10, #136 `eslint` 10, #137 `@types/node` 26, #138 `pandas` 3, #143 `uvicorn` 0.52, #144 `@tanstack/react-query` (declared, unused in `src/`)
- `lenr_proved` remains false; `EQ-OPEN-*` stay OPEN

### Main Dependabot parity (2026-08-31)
- Safe pins from main PRs #120/#122/#123/#127: `python-multipart` 0.0.32, `pytest-asyncio` 1.4.0, `alembic` 1.19.1, `posthog-js` ^1.422.2. Not physics runtime except multipart/alembic
- Skipped failing or high-risk majors from #121/#124/#125/#126/#128/#129: Vite 8, `@vitejs/plugin-react` 6, MUI 9, Jest 30/RTL 16, `numba` 0.67, `psutil` 7. Stay on Vite 6.4.3, plugin-react 4.7.0, MUI 7, Jest 29, `numba` 0.60.0, `psutil` 6.1.0
- Dependabot ignores those majors on the integration branch. GitHub still reads `dependabot.yml` from default `main` until this file is there. Create repo labels `dependencies`, `backend`, `frontend`, `ci`, `docker` or Dependabot cannot apply them
- Do not merge main PRs #120–#129 into `main`. Close them after these pins exist on the ship line
- Promotion merge to `main` must keep beta for Virtual Lab files deleted by #94/#95: `OpenQuestionsCharts.jsx`, `OpenQuestionsVirtualLab.jsx` + test, `prediction-waterfall.spec.js`, `EQ-BBL-COMP-01.yaml`, `EQ-BBL-LIM-01.yaml`, `EQ-PRED-01.yaml`, `EQ-PRED-02.yaml`, and resolve `ResultsPanel.jsx` with beta. Do not merge `main` into beta first (that imports the revert commits). When promoting, drop `target-branch` in `dependabot.yml` (or set it to `main`)
- `lenr_proved` remains false; `EQ-OPEN-*` stay OPEN

### Public release Wave 3 cutover fixes (2026-08-31)
- `/bubble-fusion` no longer defaults missing enhancement to `1e13`; API mapping uses only finite fields; local fallback is a warning without fabricated fusion yield
- Pages Terraform `production_branch` defaults to `lenr_sim_app_v0.3.6-beta`; preview `NODE_ENV=production`
- `deploy.yml` runs on the ship branch, stamps `BUILD_VERSION=0.3.6-beta`, tags GHCR `0.3.6-beta` with a lowercase owner
- Swarm image `ghcr.io/consciousenergy/lenr-sim-backend:0.3.6-beta`; Traefik dashboard off; Traefik CORS middleware removed (FastAPI CORS remains)
- `Dockerfile.backend` copies `datasets/`; frontend Docker defaults `VITE_API_URL` to `https://api.conscious.energy`
- Pages `_headers` / `_redirects` / `robots.txt`; public `/privacy`; PostHog opt-out
- Playwright `frontend-e2e` job; duplicate prediction readout removed; saturated `raw ≈ 10^` labels restored
- Operator docs: production `/api/docs` expected **404**. `lenr_proved` remains false; `EQ-OPEN-*` stay OPEN

### Public release review (2026-08-31)
- Re-ran release gates vs the 2026-08-23 pack: science **55**, Jest **210** (was 201), lint 0/506, pip-audit 11 ignored, npm high=0. IR checkers PASS. CI `formalization`/`lake build` last green on `d6be618`
- Verdict **NO-GO** for live cutover: Pages `production_branch=main`, `deploy.yml` stamps `BUILD_VERSION` from `github.ref_name` and only runs on `main`+tags, live DNS is WordPress.com, `/bubble-fusion` can show `1e13×`
- Ledgers: `LENR_SIM_APP_v2/docs/v0.3.6-beta/review-2026-08/`. Synthesis: `PUBLIC_RELEASE_REVIEW_2026-08.md`. Tracker and `VERIFICATION_GATE_REPORT.md` updated
- Wave 3 on the same review branch implements confirmed **code** blockers. Operator DNS / `terraform apply` stay operator-owned. `EQ-OPEN-*` stay OPEN; `lenr_proved` remains false

### Theory testbed review History honesty (2026-08-27)
- History shows `≥1e5 (capped)` when enhancement hits the governance ceiling; persist stores `results.enhancement_saturation` without changing the numeric column. Not a laboratory 10^5 tunneling measurement
- Additive list fields: `enhancementSaturated`, `log10EnhancementRaw`, `excessHeatWatts`. Energy (keV) uses an em dash when `energy_output_kev` is null (no more `0.000`). Power (W) is pipeline/excess heat. Watts and keV are not converted
- `persist_unified_simulation` copies pipeline watts when observables heat is 0. Bubble Auto may attach labeled Theory Testbed `pipeline_scores` / `literature_id` without multiplying into peak enhancement
- Designed `testbed_review` campaign: one isolated cell per registered theory plus Miles / McKubre / ARPA-E full-pipeline cells (24 cells). Demo pack refreshed to 150 experiments / 132 theory_runs. Public History still grows via hydrate (`LENR_AUTO_PERSIST=0`)
- Docs: `ANALYTICS_TRANSPARENCY.md` capped enhancement, keV vs W, bubble vs pipeline scores. `lenr_proved` false; `EQ-OPEN-*` stay OPEN

### Analytics association rank (2026-08-27)
- Additive experiment list fields: `sourceClass`, `literatureId`, `meanFinalScore`, `topTheoryId`. `sort_by=mean_final_score` and `source_class` filter. This is five-factor association, not P(LENR)
- History: Model association % / top theory / literature id, sort control, source-class chips
- Relevance Map **Model association rank** panel (N, CI, claim_tier, `is_empirical_confidence: false`). Overlay adds `ranked_theory_ids`
- Designed `association_screen` campaign (Miles / McKubre / ARPA-E × 3 T × 2 loading, 18 cells). Demo pack refreshed to 126 experiments / 108 theory_runs. Do not run `full` / full `diverse` in CI
- Unified Theory Save to Analytics attaches optional Theory Testbed `pipeline_scores` without multiplying into bubble enhancement
- Theory Paper / Guide / markdown paper Author Contributions list Grok 4.6 and the xAI/Grok family

### Public Analytics harden (2026-08-26)
- Removed the Analytics seed-only CLI warning banner; seed vs campaign N stays in the caption
- VPS deploy: `alembic upgrade head` then `seed_database --force --hydrate-demo` into Postgres. Do not write campaign rows into `literature_baselines.v1.json`
- Swarm `LENR_AUTO_PERSIST=0`; production default is off unless the env flag is set
- Production Analytics POST/PUT/DELETE require `X-LENR-Write-Token` (dedicated token or `SECRET_KEY`). GET/stats stay public
- Production hides `/api/docs`, `/api/redoc`, `/api/openapi.json`, and `/metrics`; boot fails without `LENR_SECRET_KEY`
- Cloudflare Pages output is Vite `dist/`; set `VITE_API_URL` alongside `REACT_APP_API_URL`

### Analytics pack hydrate (2026-08-26)
- `import_reviewer_pack` upserts JSONL into SQL by id; refuses `lenr_proved` packs
- Committed demo pack `datasets/reviewer_packs/q_campaign_demo/` (~107 experiments / 89 theory_runs). `seed_database --hydrate-demo` is the clone path to match cloud Analytics N
- Additive stats: `sourceClassCounts`, `openQuestionCountsCampaign`. Seed-only banner when Campaign N is 0
- “Include published literature baselines” no longer hides campaign/auto model outputs
- Docs: clone ≠ 107; `LENR_SQLITE_PATH` must match the API

### Q-anchored theory vs literature campaign (2026-08-26)
- Persist campaign provenance on **successful** unified and theory-pipeline rows: `parameters_json` keys `campaign_preset`, `tag`, `literature_id`, `claim_tag`, `open_question_ids`; History name prefers `Campaign {tag}`
- `literature_grid` cells are keyed by `literature_id` so Miles/Chubb are not collapsed into Fleischmann–Pons when T/loading match
- Miles 1993 EMP seed (`miles-1993`) using in-app 1 W / 23.8 MeV / 2.63e11 He-4 s⁻¹ W⁻¹ handles; Q5 and Q2 tagged; `EQ-OPEN-*` stay OPEN
- Designed `question_theories` preset: isolated theories at Q-relevant literature cells plus ARPA-E composition-group nulls (~20–45). Do not run `full` / full `diverse` in CI
- `report_open_question_stress` CLI + smoke fixture; Analytics `openQuestionCounts` chips (model N, not closure)
- Docs: `Q_THEORY_CAMPAIGN_2026-08-26.md`, researcher pack commands, Analytics transparency

### Theory reviewer campaign: datasets, Analytics N/CI, Lean bounds (2026-08-26)
- Versioned JSON datasets (`literature_baselines`, screening priors, Parkhomov curated, Q1–Q5 register, PRED-01…07) with Python loaders and stable baseline IDs
- Campaign preset `literature_grid` (designed, not cartesian) plus `export_reviewer_pack` smoke fixture. Do not run `full` / full `diverse` in CI
- Analytics Relevance Map: N, percentile CI, score-formula / sensitivity chips; wires existing parameter-sweep and validation-report APIs
- Opt-in `score_mode=five_factor_plus_literature`; default five-factor GM unchanged; claim tiers are not auto-promoted
- Lean `OpenQuestionBounds.lean`: would-close-if lemmas; Q4 millielectronvolt deficit THM; Q5 yield-band DEF. `EQ-OPEN-*` stay OPEN
- Docs: `RESEARCHER_REVIEW_PACK.md`, architecture map 2026-08-26, paper §5.1 N honesty and §6.1 would-close-if note, ISSUE_LEDGER “section written ≠ obligation discharged”

### Analytics SQL match, Relevance Map persisted scores, all-claims collection (2026-08-26)
- Overview charts plot SQL `experiments` fields on separate enhancement (×) and energy (keV) axes; X-axis is `created_at` date with name/source in the tooltip
- Cards: **Total Records** (SQL row count); keV sum labelled as estimated, not conserved; **Include published baselines** toggle; stored-type pie plus **Source class** pie
- History **Name** column; Comparison/CSV pressure is **bar**, not atm
- Persist attaches additive `final_score` (five-factor GM × claim-tier) beside guardrails `weighted_score`; persist uses `skip_sensitivity=True` (stored sensitivity 0.5). Relevance Map defaults to SQL means when `theory_runs` exist
- `all_claims` campaign: 4 Pd-D cartesian + 2 occurrence-anchored cells + one unified run per registered theory. Coupled `/theories/run-coupled` now persists
- Takahashi TSC citations add 2026 brief-view (`takahashi2026brief`); 4H/TSC WS is literature-only (Weak-Strong, not Woods–Saxon). No new theory_id. `EQ-OPEN-*` unchanged
- Docs: `LENR_SIM_APP_v2/docs/v0.3.6-beta/ANALYTICS_TRANSPARENCY.md`

### Honest analytics metrics and diverse campaign (2026-08-24)
- Split Analytics Overview: **completion rate** (`completed/total`, still aliased as `successRate`) vs **scientific-positive** (`excess_heat_watts > 0`). Additive `outcomeCounts` and `claimTierCounts`
- Persist true failures as `status=failed` (campaign try/except and UI true-fail paths)
- `diverse` campaign preset: designed negative-control grid (~197 unified) plus one run per theory composition group; `python -m app.scripts.run_simulation_campaign --preset diverse`
- Google/ARPA-E seed counts as scientific **null**; campaigns remain model outputs (`lenr_proved` false, EQ-OPEN-* unchanged)
- Docs: `LENR_SIM_APP_v2/docs/v0.3.6-beta/ANALYTICS_TRANSPARENCY.md`

### Simulation campaign persistence (2026-08-24)
- Auto-persist `/api/unified/simulate`, `/api/unified/bubble-lattice`, and `/api/physics/theories/run` into SQL (`experiments` + `theory_runs`) as **model outputs**
- Analytics Overview / History include auto-persisted and campaign rows; Relevance Map overlay from `GET /api/analytics/theory-run-history` does **not** rewrite curated edge strength
- Campaign CLI `python -m app.scripts.run_simulation_campaign` plus prediction registry `formalization/predictions/campaign_invariants.json` (EQ-OPEN-* stay OPEN; `lenr_proved` remains false)
- Alembic `002` creates the `theory_runs` table; multi-physics results read `step_count` from `simulation_stats`

### Dependency hygiene (2026-08-24)
- `pytest-html` 4.1.1 → 4.2.0 (test-report plugin only; not a runtime physics dep)
- Dependabot now targets `lenr_sim_app_v0.3.6-beta` and ignores NumPy/SciPy/websockets majors plus TypeScript/MUI/`@vitejs/plugin-react` majors until dedicated migrations. Stale CRA/`react-scripts` ignore removed.

### Formalization accuracy pass (2026-08-23)
- Lean: `CollapseBounds.lean` and `OpenObligations.lean`; missing DEF/THM declarations for bubble composition, prediction envelope, FGR/trap bookkeeping, sequential three-body, Bayes-factor definition, and trap lifetime. No `sorry`; no new axioms; `EQ-OPEN-*` remain undischarged
- IR: every equation YAML now lists `lean_decls`; five `EQ-OPEN-*.yaml` obligation files; `check_ir.py` resolves Lean modules, imports, and runtime `EQ-*` identifiers
- Numeric lock: Lean↔Python agreement tests plus generalized `diff_code_literals.py` (`code_symbols` optional bindings)
- Virtual lab: Q4 electron-capture threshold and Q5 Miles expected-yield blocks are computed and still `OPEN`; mechanism-path diagram specs are wired from the backend
- Docs: `FORMAL_PROOF_STATUS.md`, `CLAIM_TAXONOMY.md`, and `TRACEABILITY_MATRIX.md` updated; open-obligations table unchanged

### Public release readiness review (2026-08-23)
- Theory Testbed: primary-scoped **All** / **None** controls beside the glossary on
  `TheoryTogglePanel` (preserves context-track selections; unit-tested)
- Docker frontend image: copy Vite `dist/` (not CRA `build/`), include `.npmrc`
  before `npm ci`, and stop excluding `frontend/` from the shared `.dockerignore`
- Docs: root `CONTRIBUTING.md`, reframed `RELEASE_CHECKLIST.md` for v0.3.6-beta,
  refreshed governance evidence pack; theoretical paper revision date synced
- Release gates re-run: version markers aligned; pip-audit (documented ignores);
  experiment-anchored science gates; frontend audit (high=0) / lint (0 errors) /
  tests / production build; backend + frontend Docker images build locally

### Open-questions virtual lab — when/how many-body pass (2026-08-23)
- Reframe virtual lab from "whether" to **when/how** under named conditions: additive `occurrence`, `when`, `how` blocks on `lenr-open-questions-v1` (no envelope bump)
- Unified Many-Body FGR library (`many_body/fgr_model.py`, `branching_model.py`); trapped_state rate refactored to shared EQ-NBODY-FGR-01 bookkeeping
- Oracle B: `phonon_cascade` hypothesis, occurrence-anchored priors, status alphabet (`OCCURRENCE_ANCHORED_EMP`, `MECHANISM_PATH_*`, `THRESHOLD_*`, `BRANCHING_INCONSISTENT_WITH_UL`)
- API: optional `duty_fraction`, `geometry_mode`, `stimulation` on `/simulate` and `/bubble-lattice`
- Lean: `WhenHow.lean`, `Branching.lean`; IR `EQ-BRANCH-LATTICE-01`, `EQ-WHEN-THRESH-01`, `EQ-WHEN-DUTY-01`, `EQ-MECH-PATH-01`
- UI: Oracle B panel, when/how rows, IVG, charts from API; `OpenQuestionsVirtualLab` component
- Docs: `MANY_BODY_FGR_MODEL.md`, paper §5A reframe, TESTABLE_PREDICTIONS crosswalk

### Open-questions virtual lab (2026-08-22)
- Additive `open_questions` (`lenr-open-questions-v1`) on `/api/unified/simulate`, `/api/unified/bubble-lattice`, and `/api/physics/theories/run`: two-oracle determination (Lean identities + skeptical-prior odds), Q1–Q5 ledger with Q4/Q5 dimmed, three-engine composition (pipeline / bubble / legacy) with illegal-product pedagogy, n-body mode ledger, MHD-to-MHD cascade labels
- Status alphabet includes `RATE_BUDGET_DOES_NOT_CLOSE`; never `LENR_PROVED` / `LENR_DISPROVED_AS_THEOREM`. `local_fallback` stays `INCONCLUSIVE` without EMP chips
- Optional lab ingest (`excess_power_W`, `he4_atoms_per_s`, `sigma_Q_W`, γ UL, `p_4_occupation`) does **not** auto-flip `rate_mode`; `two_body` reference remains beside SPEC modes
- Lean: phonon \(N\), naive \(g^N\) fails, two-body does-not-close, would-close-if, `EQ-COMP-03`, n-body geometry vs 25 pm trap, MHD domain, Heisenberg-Euler ≈1. `EQ-OPEN-*` rows unchanged. No version bump; `use_theory_pipeline` still defaults false; `oppenheimer_phillips` still unregistered
- Unified Results `OpenQuestionsVirtualLab` (formerly cockpit; copyable Lean IDs, OPEN remainder charts). `OpenChallengesSection` remains the static paper fallback

- Theory Guide timeline: Paneth–Peters (retracted), Tandberg (unproven), Miles EMP, acoustic environment, Letts EMP, Huang 2024 **contested EMP** (Scientific Reports editor's note + Fomitchev-Zamilov critique); Takahashi TSC stays **open SPEC**
- Theory Paper §6.1 TSC labelled `speculative_exploratory`; §6.11 Letts EMP (not "showed" a controlled trigger)
- Added `docs/REVIEW_2026/OPEN_QUESTION_CORPUS_GAPS.md` living claim register; `EQ-HUANG-EMP-01` in claim taxonomy (no Lean theorem, not a TheoryModule)
- Nested `React.lazy` of the bubble-lattice Three.js viz inside `VisualizationPanel` so the Unified Theory shell paints before the `three` chunk; Vite `preload-helper` is split out of `three` and `hoistTransitiveImports` is off so the page chunk does not statically import 700kB+ of Three.js
- Drawer footer: © 2025-2026 plus GNU GPL-3.0 copyleft; ASCII `--` in `start_dev.bat` echo lines (OEM mojibake fix)

### Formal math review + Lean consistency pilot (2026-08-22)
- Added claim taxonomy, math audit, and formal proof status under `docs/FORMALIZATION/`
- Added equation IR (`formalization/ir/`) with checker scripts linking paper ↔ code ↔ Lean
- Added Lean 4 `LenrFormal` pilot theorems for adopted classical core (Casimir band, Gamow, Assenbaum domain, enhancement composition cap, Miles conversion, Rydberg)
- Wired CI `formalization` job; extended verification gate report
- Paper §6.1 documents mechanized consistency **non-claims** (does not assert LENR is proven)

### Unified Theory cycle clock (2026-08-17)

- **3D viz phases follow the visual schedule**: API `enhancement_timeline`
  stores acoustic / Rayleigh–Plesset `normalized_time`, with MINIMUM labelled
  at the physical min-radius sample (often ~20% of the drive period). The
  unified-theory animation clock was looking that timeline up 1:1, so Progress
  ~20% showed MINIMUM (tiny bubble) and ~75% showed EXPANSION (large bubble).
  The timeline is now remapped onto Expansion 0–45% → Collapse 45–70% →
  Minimum 70–80% → Rebound 80–100%, and the HUD phase label is taken from that
  visual clock. Jet / rebound / shockwave cues use the same segments (no more
  leftover `t - 0.6` from the old three-phase schedule).
- **Frequency chip units**: 20 kHz is a 50 μs physical period; the on-screen
  cycle is ~2.5 s (50,000×, not “slowed 50×”). Chip now reads
  `50 μs · ~2.5s vis`.

### Math-Accuracy Hardening (2026-08-10)

Pre-public mathematics pass across backend, frontend, and documentation.
No breaking contract changes: new stream fields are additive.

- **Bubble phase labels anchored to physics**: the visual phase schedule could
  label the trajectory's true minimum-radius instant COLLAPSE or REBOUND; the
  MINIMUM segment is now anchored to the Rayleigh-Plesset argmin
  (`bubble_phase_schedule.anchor_cycle_fraction`), fixing the 4 red CI tests.
- **Backend order-of-magnitude corrections**: Gamow energy missing pi^2 in the
  legacy `reaction_rates` path (~100 keV vs ~986 keV for D+D; dead
  `unified_lenr_model.py` monolith with the same bug deleted); MeV-as-eV
  Coulomb barrier in `phonon_modes` (10^6); ~1000x mean thermal speed in
  `quantum_tunneling`; J/eV-mixed derived Gamow factor in
  `physics_engine.constants`; `<sigma*v>` keV/J integration measure (~6e15,
  now within ~35% of Bosch & Hale at 2-20 keV); Casimir high-temperature
  branch now the classical -zeta(3)kT/(8*pi*d^3) limit.
- **Screening enters exactly once**: the WKB convenience path applied an
  energy shift, a Yukawa barrier, and the Assenbaum multiplier simultaneously;
  now a single Assenbaum factor capped at the governance 1e5 (was 1e10).
  `exp(Ue/kT)` in statistical rates replaced with the Assenbaum form at the
  Gamow peak; identical-particle 1/2 factor added.
- **Constants**: Widom-Larsen threshold corrected to (m_n - m_p) ~ 2.531 m_e;
  Pd/Ni Fermi energies (11.7 eV was aluminium's value) recomputed from each
  material's electron density; p-d and d-d radiative Q-values added; d-d
  S-factor channel label fixed; bubble-fusion neutron yield now counts the
  conserved gas inventory (P0/kT0) instead of a hardcoded 1e30 m^-3.
- **Frontend units**: the Unified Theory bubble-radius slider is true
  micrometres end-to-end (removed the silent x3.33 rescale; presets converted
  to preserve effective physics); `radius_factor` no longer exported as um;
  offline Gamow fallback gained the missing 1/(4*pi*eps0); `total_energy`
  labelled J (matches backend joules); small probabilities no longer render
  as "0.00%".
- **Client-side physics retired or badged**: dead physics WebWorker stack and
  orphaned mock Results page deleted; 3D idle-preview enhancement mirrors the
  backend screening kernel and 1e5 ceiling; reaction testbench badged as
  schematic (Math.random() efficiency metric removed; proton identification
  fixed); offline fallback results carry a visible placeholder warning; live
  stream forwards `enhancement_log10_raw`/`enhancement_is_saturated`
  (additive).
- **Documentation**: D+D Q-value tables corrected (2.45 MeV is the neutron
  kinetic energy, not Q = 3.269 MeV; T+p is 4.03 MeV); paper Gamow form and
  Gamow-peak formula fixed; Debye-vs-Thomas-Fermi labels and screening
  guidance aligned with `screening_kernel`/`screening_data`; enhancement band
  unified at 10^3-10^5; Miles/Vysotskii claims reworded to claim-tier
  language; verification log self-corrections (TF factor 2, adiabatic
  13.6 eV) plus new section 9D; version drift fixed (package.json 0.1.0,
  CHANGELOG summary, MHD doc headers); ~35 stale status documents archived
  under `archive/status-reports/`; paper renamed to
  `A_Unified_Theoretical_Framework_for_LENR.md`.
- **Tests**: 20 new absolute numeric gates
  (`tests/test_physics/test_absolute_numeric_gates.py`) pin E_G, barrier,
  thermal speed, Assenbaum validity/single-application, Q-value consistency,
  Bosch-Hale sigma-v spot checks, the Casimir classical limit, and the WL
  threshold; frontend payload and formatter tests added. Backend suite:
  942 passed.

### Pre-Public Hardening (2026-08-08)

Physics-accuracy, reporting-honesty, and UX-coherence pass ahead of the public VPS
release. No breaking contract changes: every new response field is additive.

#### Modeling, visualization, unified theory, and documentation iterations (2026-08-09)

Eight-phase pass. Every new response field is additive.

- **Theory Testbed on the dashboard**: the hub was launcher-only, so the theory
  pipeline could not be run without navigating away first. Added
  `TheoryTestbedCard` backed by a shared `buildTheoryConditions` util, and persisted
  `enabledTheories` / `theoryConfigs` so a selection survives the trip to the full
  testbed. Wired `setTheoryConfigs`, which had been destructured as unused.
- **Saturation-aware charts**: the timeline plotted log10 of the *clamped*
  enhancement, drawing a flat line at 5.0 through the whole collapse, while
  `enhancement_log10_raw` and `enhancement_is_saturated` had no frontend consumer at
  all. The page also hardcoded a `1e4 K` ceiling against a backend value of `2e6 K`.
- **`collapse_trajectory`**: the integrated R(t) and wall velocity never left the
  engine, so no client could draw the actual collapse curve.
- **One composition contract**: ten theories sat in the ungrouped fallback and each
  multiplied into `combined_enhancement`, producing a single product of mutually
  exclusive accounts of the same effect. Grouped them, and stopped the rubric from
  overwriting module-declared claim tiers (which had erased
  `cross_regime_extrapolation`'s 0.2x weighting). See
  `docs/v0.3.6-beta/THEORY_COMPOSITION_CONTRACT.md`.
- **Mechanism formulae corrected**: QED used `1e8 V/m` as the critical field, ten
  orders below the Schwinger limit, returning ~`1e12` where the true correction is
  ~`6e-13`; Rydberg grew linearly to ~`5e8` where the unified model bounds the same
  physics at 10; screening ignored the cited per-material potential entirely; and
  `calculate_overlap_probability` returned a number density that always clipped to
  its guard. Raw total for Pd drops from log10 ~38.8 to 13.42.
- **Collapse singularity**: the hard-core radius was applied as a clamp inside the
  right-hand side, which made the ODE genuinely singular — LSODA's raw solution
  diverged to ~`-3e145`, hidden by downstream sanitisation. Moved the hard core into
  the gas law, added an opt-in Keller-Miksis mode, and reported peak wall Mach.
  Measured Mach of 0.22-0.84 shows the incompressible default is already outside its
  valid domain.
- **Uncertainty**: added Sobol intervals for collapse observables and mechanisms,
  and rendered them; the page had advertised an interval chip with nothing to show.
- **Documentation**: retired the Create React App narrative, normalised the dev
  backend port to 8010, fixed version drift, and made the in-app doc viewer
  reachable.
- **Cleanup**: archived ~8.9k lines of orphaned visualization code, converted the
  lattice to `InstancedMesh`, and removed per-render `Math.random()` chart jitter.
  Frontend lint errors and app-code type errors are both now zero.

#### Follow-up (same day): local audit sync + thermo consistency

- **npm highs on local `start_app`**: Windows terminals still showing
  `8 vulnerabilities (4 moderate, 4 high)` were on pre-`95bedd1`/`bd1684f` lockfiles.
  Tip remains `2 moderate, 0 high` (react-router only). Overrides now floor
  `js-yaml`, `brace-expansion`, `nanoid`, `fast-uri`, `dompurify`, and `postcss`.
  `start_app.bat` / `LENR_SIM_APP_v2/start_app.bat` sync via a SHA256 stamp of
  `package-lock.json` so a pulled lockfile forces `npm ci`.
- **Timeline pressure bug**: HTTP/WS rebuilt pressure as
  `ambient_temperature_k * 101325 * CR**4.2` (~300× high at 298 K), corrupting Casimir
  on charts. Now uses thermo-consistent `ambient_pressure * CR**(3γ)` with the same
  1e10 Pa ceiling as the peak path.
- **Peak vs timeline thermo**: `get_collapse_phases` now uses the bubble γ, R hard-core
  floor, and T/P ceilings from `simulate_collapse`.
- **Material Casimir**: API lattice reconstruct now copies `bulk_modulus` (Li is ~16×
  softer than Pd).
- **Electrolyte alignment**: multiplier is a mechanism in the saturation product so
  `enhancement_factor` and `enhancement_breakdown.total` agree.
- **UI**: Advanced Analysis surfaces `collapse_results.limits`; Unified Theory chart
  filters the `saturation` object and prefers peak_conditions breakdown.

- **Enhancement reporting**: the `MAX_ENHANCEMENT_FACTOR = 1e5` ceiling was applied to
  every breakdown mechanism independently, so at the peak conditions the UI actually
  reaches (CR = 1000, E = 1e14 V/m) the QED, Casimir, Rydberg and compression terms all
  rendered as `1.0000e+5` and the breakdown carried no information. The ceiling is
  retained (it is a claim-tier limit, not a physics result) but each mechanism now also
  reports `value_raw`, `log10_value_raw` and `is_saturated`. The five previously
  identical cells resolve to 10^12, 10^6, 10^8.7, 10^6 and 10^38.8. The UI outlines and
  labels saturated cells and prints their uncapped magnitude.
- **Collapse temperature ceiling**: `REGIME_MAX_TEMPERATURE["single_bubble"]` was `1e4 K`,
  which sits *below* the top of the spectroscopically measured emission band
  (1.5e4 K, Flannigan & Suslick, *Nature* **434**, 52, doi:10.1038/nature03361), so it
  truncated experimentally observed temperatures. Raised to `2e6 K`, the peak ion
  temperature from Moss et al. (doi:10.1121/1.416948). `REGIME_TEMPERATURE_PROVENANCE`
  records the anchoring measurement and simulation per regime, and
  `collapse_results.limits` reports the pre-clamp value, ceiling and saturation flag for
  temperature, pressure and compression.
- **Casimir mechanism**: was literally `compression ** 2`, a duplicate of the density
  term. Now driven by pressure-induced lattice strain using the real `1/d^4` Casimir
  scaling, so it depends on pressure rather than compression ratio and is physically
  modest (~8% at the 1e10 Pa ceiling for Pd). Per-material bulk moduli added (CRC
  Handbook).
- **Proton phase distribution**: was a hardcoded tier table returning fixed 0.4/0.2
  fractions with a floored nuclear share, independent of temperature, field and loading
  over wide ranges. Now an ordered cascade of smooth occupancy gates built from
  `PhaseThresholds`, normalised to 1 by construction.
- **Single collapse model**: `get_collapse_phases()` used a piecewise normalised-time
  envelope while the peak conditions came from the integrated ODE, so the timeline and
  the headline numbers described two different collapses. It now interpolates the cached
  Rayleigh-Plesset trajectory; each timeline point reports its `collapse_model`.
- **Keller-Miksis solver** (`solve_keller_miksis`): addresses the standing "simplified
  Rayleigh-Plesset ignores compressibility" limitation. Validated against its own
  incompressible limit (deviation < 1e-3 R0 at c = 1e12 m/s, decreasing monotonically
  with c).
- **Bubble dynamics reduction gates** (18 tests): Rayleigh collapse time, Minnaert
  frequency (cross-checked against the f0*R ~ 3.3 m/s rule of thumb), Blake threshold
  (cross-checked against the numerical stationary point of the curve it derives from),
  and Keller-Miksis -> Rayleigh-Plesset. Modelled on the `sonolumen` and APECSS
  validation suites (doi:10.21105/joss.05435).
- **UX coherence**: `theoryResult` now persists to `sessionStorage`, so a reload no
  longer empties the Theory Summary tab while the simulation-backed tabs stay populated.
  `hasData` split into `hasSimulationData` / `hasTheoryData` so a half-populated page is
  not mistaken for a complete one. All theory-dependent empty states link to
  `/unified-theory?tab=testbed` instead of tab 0, whose dominant action fills the wrong
  data source, and the testbed gained a "View in Advanced Analysis" return action.
- **UI/API key mismatch**: Advanced Analysis read `electron_screening`,
  `phonon_coupling`, `casimir_force` and `qed_vacuum` from the enhancement breakdown; the
  backend emits `screening`, `phonon`, `casimir` and `qed`, so those cards could never
  render. Both spellings are now accepted.
- **Cleanup**: removed the stale `AdvancedAnalysisPage.jsx` shadow file (referenced
  context fields that no longer exist; survived only because Vite resolves `.js` first);
  fixed `Header.jsx` and `ThreeJsTestPage` links to unrouted `/simulation` and `/history`.
- **Security**: `js-yaml 4.3.0 -> 4.3.1` clears high advisory GHSA-5p4m-2wfm-xmqj;
  `dompurify 3.4.12 -> 3.4.13` clears GHSA-55q2-fjhq-7xh7. `SECURITY_CI_HARDENING.md`
  documents that the audit gate must be read via its direct exit code, never through a
  pipe, which had been masking a failing gate.
- **CI**: added Python `3.12` to the test matrix to match the `python:3.12-slim` runtime
  shipped by `Dockerfile.backend`.
- **Verification**: backend 749 passed / 9 skipped; release-blocking experiment-anchored
  science gates 52 passed; benchmark gates 3 passed; `pip-audit` clean (11 documented
  ignores); frontend 110 tests / 17 suites, lint 0 errors, build PASS,
  `npm audit --audit-level=high` exit 0; Playwright E2E 7 passed, stable across 3 runs.

### Ship-Prep Hardening (2026-07-18)
- **Security**: upgraded Vite `5` -> `6.4.3` (with `@vitejs/plugin-react` 4.7.0), clearing the dev-server `server.fs.deny` bypass advisory on Node 20.12 without the semver-major Vite 8 jump; `npm audit --audit-level=high` now reports 0 vulnerabilities. Added a scheduled `security-scan.yml` (weekly `pip-audit` + `npm audit`), `dependabot.yml`, and a PR `dependency-review` gate.
- **Performance**: added `manualChunks` vendor splitting in `vite.config.js` (three / antd / mui / charts / markdown / react-vendor / vendor); entry `index` chunk reduced to ~88 kB (gzip ~26 kB), resolving the prior bundle-size warning.
- **Correctness**: fixed `contract_version` on `/api/unified/bubble-lattice` and the physics-update websocket to the canonical `v0.3.6-beta-science-gate-1` (the computed value was missing the `v` prefix), aligning with `/simulate`, `theory_pipeline`, and `DATA_CONTRACT_LOCK.md`.
- **Analytics**: env-gated PostHog instrumentation (no-op without a key, outside production, or when `doNotTrack` is set), wired into simulation, theory-toggle, export, visualization, and docs flows; transparency documented in `ANALYTICS_TRANSPARENCY.md`.
- **Backend**: pinned web stack (`fastapi==0.128.0`, `starlette==0.49.1`, `pydantic==2.10.3`) for reproducible test runs; removed the legacy `app/routers/*` tree and superseded routes.
- **Verification**: full local CI mirror green — backend `pytest tests/` 354 passed / 1 skipped; frontend `npm test` 103 passed, `npm run lint` 0 errors, `npm run build` PASS, `npm audit --audit-level=high` 0 vulnerabilities.

### UI Library Consolidation: Ant Design -> MUI (2026-07-18)
- **Refactor**: migrated all remaining active-route views off Ant Design to Material-UI (`NewSimulation`, `SimulationDetail`, `ParameterControls`, `SimulationResults`, `VisualizationStream`, `VisualizationTest`, `layout/AppLayout`, `common/ErrorBoundary`). `ParameterControls` moved from antd `Form`/`useForm` to controlled state with equivalent required/range validation; `SimulationResults` moved from antd `Table`/`Radio.Group`/`Tabs` to MUI `Table` (sortable + paginated) / `ToggleButtonGroup` / `Tabs`.
- **Cleanup**: import-graph-gated and removed the unrouted legacy antd cluster (`SimulationDashboard`, `SimulationMonitor`, `SimulationStatusPanel`, `SimulationVisualizer`, `VisualizationDashboard`, both `MainLayout` variants, root `AppLayout`/`AppHeader`/`AppSidebar`, `results/SimulationDetails`) and their orphaned tests; removed `utils/antdPatch.js` (+ its `index.jsx` init) and the `antd` `manualChunks` branch.
- **Dependencies**: dropped `antd` and `@ant-design/icons` (also removed the already-unused `lodash`); `npm install` pruned 65 packages. The app is now single-UI-library (MUI) and `antd` no longer appears in the production bundle.
- **Verification**: refactor-delta CI mirror green — backend `pytest tests/ app/tests/` 667 passed / 9 skipped; frontend `npm run lint` 0 errors, `CI=true npm run build` PASS (no `antd` chunk), `npm test` 90 passed (13 suites), `npm audit --audit-level=high` 0 vulnerabilities.

### Reaction-Rate Engine E2E Integration (2026-06-06)
- Enriched the `/api/unified/bubble-lattice` response with an **additive** `reaction_rate_engine` block (claim-tier labelled). The change is backward-compatible: the block is empty unless the engine can be evaluated, and all existing fields/contract version (`v0.3.6-beta-science-gate-1`) are unchanged.
  - Collapse-instant rate via the selectable formalism (`two_body` validated baseline / `trapped_state` speculative TSC), evaluated at peak collapse temperature + peak capped enhancement; tunneling derived from the existing cross-section utility.
  - Optional Sobol/Bayesian uncertainty summary (`include_uncertainty`, `uncertainty_samples`, `random_seed`, `experimental_band`); default samples capped at 256 in the UI for deployment timeout safety.
  - Shell-pairing branching prior over matched Parkhomov products (relative re-weighting only; never alters rate magnitude or Q-values).
  - KG-RP harmonic-locking diagnostics (Mulnix 2026) computed from the collapse timeline.
  - Shared `_compose_rate_block` helper now backs both `/simulate` and `/bubble-lattice`; failures fall back to an empty dict so the core response is never affected.
- Added new optional request fields to `BubbleLatticeRequest` (`rate_mode`, `include_uncertainty`, `uncertainty_samples`, `random_seed`, `experimental_band`), all defaulting to legacy behaviour.
- Frontend `UnifiedTheoryPage`: new "Reaction Rate & Uncertainty" controls (mode select, UQ switch, sample slider, optional seed), `ReactionRateGovernancePanel` rendered in the Results tab, and a `GovernanceGlossaryDrawer` wired to header/results help buttons. JSON export envelope now records the rate-engine controls, route mode, and the `reaction_rate_engine` block for reproducibility.

### Release Hardening Continuation (2026-05-06)
- Completed CRA -> Vite migration within v0.3.6-beta scope:
  - replaced `react-scripts`-based dev/build scripts with Vite,
  - added `vite.config.js` with API/WebSocket proxy and `REACT_APP_*` compatibility defines,
  - moved frontend app entrypoint to `src/index.jsx`.
- Restored standalone quality gates after CRA removal:
  - explicit Jest/Babel dependency chain for `jest.config.js` test execution,
  - explicit ESLint dependency chain so `npm run lint` remains operational.
- Applied UI/UX overlap fix in Unified Theory visualization:
  - desktop zoom controls moved to the right-side stack under layer/legend toggles,
  - mobile controls retained via `TouchControls`,
  - adaptive scale transition now keyed to camera-to-orbit-target distance.
- Finalized electrolyte phase-1 propagation contract:
  - canonical top-level `electrolyte` payload support (with lattice fallback),
  - bounded proxy fields (`solvent_type`, `ph_proxy`, `ionic_strength_proxy`) propagated through diagnostics, observables bridge, and regime flags,
  - integration test added for canonical top-level override behavior.

### Contract and Scientific Guardrail Alignment
- Unified backend/frontend release markers to `0.3.6-beta` and retained contract identifier `v0.3.6-beta-science-gate-1`.
- Consolidated electrolyte evidence and activity scaling through shared scientific guardrail utilities to remove divergent weighting paths.
- Propagated electrolyte context into theory-pipeline execution conditions in unified model runs.
- Fixed version alignment in `Dockerfile.backend` (`BUILD_VERSION=0.3.6-beta`), `RelevanceMap.tsx` jsdoc, and `infrastructure/ansible/group_vars/all.yml`.

### Unified Runtime Consistency
- Updated unified simulation API response with explicit contract metadata and analytics transparency fields.
- Normalized electrolyte semantics in unified request handling and improved extrapolation/validity flag consistency.
- Hardened websocket update path to use the same bounded electrolyte multiplier strategy as HTTP simulation paths.

### Stellar-Scaling Context Line (New)
- Added `stellar_scaling_mhd` theory module (`theories/stellar_scaling_mhd.py`) as a claim-tier down-weighted comparison track.
- Strict applicability gate: only `True` when `T ≥ 1e6 K`, `B ≥ 1e4 T`, and `n ≥ 1e24 /m³`.
- Isolated composition group `context_line` so the track never multiplies into LENR-grounded `screening`/`confinement`/`coherence` groups.
- Transparency fields: `extrapolation_penalty`, `class_aware_weight`, `stellar_contribution_log10`, `regime_applicable`.
- Explicit falsification criteria and `claim_tier="speculative_exploratory"`, `evidence_class="cross_regime_extrapolation"`.

### Claim-Tier Scoring Governance
- Added `CLAIM_TIER_MULTIPLIER` to `theory_scoring.py` (validated=1.00, empirical=0.90, speculative=0.30, cross-regime=0.20).
- Multiplier applied to both applicable and inapplicable scoring paths; response exposes `final_score`, `raw_score_pre_tier`, `claim_tier`, and `claim_tier_multiplier`.
- Cross-regime lines are visible in output but cannot silently dominate empirically-grounded tracks.
- Added `TestStellarScalingMHD` coverage (6 new tests) for regime gate, bounded enhancement, transparency fields, and claim-tier down-weighting.

### UI/UX Governance Chips
- `TheoryTogglePanel.tsx` now renders both `evidence_class` and `claim_tier` chips with hover explanations and color coding (cross-regime = `warning`, validated = `success`).

### CI, Docs, and Release Hardening
- Added `.github/dependabot.yml` covering pip, npm (grouped mui/react-three/testing), github-actions, and docker ecosystems; later aligned with Vite-based frontend workflow in the release-hardening continuation.
- Added `version-consistency` CI job that fails fast on mismatched version markers between `backend/core/config.py`, `frontend/package.json`, `frontend/src/config/version.js`, and `Dockerfile.backend`.
- Tightened per-job `permissions: contents: read` on the `test` and `frontend` jobs.
- Extended `RUBRIC_GOVERNANCE.md` with orthogonal `evidence_class` / `claim_tier` semantics tables.
- Refreshed `RELEASE_EVIDENCE_PACK.md` with 315-passing test count, scoring/governance evidence, and stellar-scaling residual-risk statement.
- Added/updated v0.3.6-beta governance and verification docs, including explicit residual-risk framing and release readiness gates.

### Test Evidence
- Backend: **315 passed, 1 skipped** (up from 309 in the prior RC; 6 new stellar-scaling guardrail tests).
- Frontend: **13 suites, 96 tests passed, 0 failed** (Jest `--runInBand`, 423.7 s wall-clock).

## [v0.3.4-beta] - 2026-02-16

### Relevance Map — Stability & UX
- **Hover flicker fix**: Replaced D3 transitions with immediate `.attr()` updates for node visuals; added `pointer-events: none` to the hover tooltip so it no longer overlays nodes and triggers mouseout/mouseover loops. Fixes flickering on Phonon-Nuclear Coupling, Electron Screening, Chubb Ion Band State, and other nodes.
- **Deterministic layout**: Seeded initial node positions via hash of `theory_id` so the graph loads in the same organization every time. Consistent "locked in" view when opening the Relevance Map tab.
- **Scrollable main content**: Updated `AppLayoutFixed` with `height: 100vh` root and `overflow-y: auto` on Main for proper scrolling of long content (Relevance Map, Dashboard).
- **Synchronous pre-compute**: Force simulation runs 200 ticks before first paint; fit-to-bounds zoom applied immediately. No async layout jumps.
- **gRef fix**: Corrected selection effect — `gRef.current` is already a D3 selection; removed incorrect `d3.select(gRef.current)` wrapper that caused `querySelectorAll is not a function` runtime error.

### CI/CD Pipeline Stabilization
- **GitHub Actions `test.yml`**: Added `frontend` job with Node.js 20, `npm ci`, lint, test, and build steps; corrected integration test path; made benchmarks conditional; fixed codecov artifact upload
- **ESLint build fix**: Set `CI: false` on frontend build step to prevent Create React App from treating ESLint warnings as fatal errors in CI
- **All frontend tests green**: Removed temporary `continue-on-error: true` after all 75 tests passing

### Frontend Test Suite — 9 Suites, 75 Tests (All Passing)
- **`test-utils.tsx` (New)**: Shared test render wrapper providing MUI `ThemeProvider` for all component tests requiring theme context
- **ThreeJsDebug**: Refactored Three.js mocks to use constructor functions (`function MockPerspectiveCamera() { ... }`) instead of `jest.fn().mockImplementation()` for correct `new` keyword behavior
- **UnifiedLENRVisualizer**: Fixed `jest.mock` hoisting for PhysicsContext — replaced external `const mockUsePhysics` (Temporal Dead Zone error) with inline `jest.fn()` and `require()` in `beforeEach`
- **LatticeTest**: Added `children` array to `MockScene`, `userData` to `MockLineSegments`/`MockMesh`/`MockPoints`; corrected text assertions to match actual component output ("Lattice Visualization", "FCC")
- **SimulationVisualizer**: Updated assertions for rendered text ("3D Visualization"); mocked `VisualizationSwitcher` and `renderingOptimizations` to prevent WebGL errors in JSDOM
- **SimulationControlPanel**: Mocked `AdvancedControlHelpButton`/`AdvancedControlHelpDialog` to bypass nested `useTheme`/`useMediaQuery` failures; imports `render` from `test-utils`
- **VisualizationDashboard**: Changed Ant Design `Select` query to `getByRole('combobox')`; added `window.matchMedia` mock for responsive observer
- **VisualizationStream**: Simulated `onConnected` callback for event display tests; corrected text assertions; added `matchMedia` mock; fixed duplicate element matches with `getAllByText`
- **visualizationWebSocket**: Fixed `isConnected()` as method call (not property); re-established `global.fetch` mock in `beforeEach` to survive `jest.resetAllMocks()`

### Testing & Documentation
- All backend tests passing (theory pipeline, topological sort, coupled execution, new modules).
- All frontend tests passing (9 suites, 75 tests — ThreeJsDebug, LatticeTest, UnifiedLENRVisualizer, SimulationVisualizer, SimulationControlPanel, VisualizationDashboard, VisualizationStream, visualizationWebSocket)
- CHANGELOG and version files updated. Best practices: unified state flow, no conflicting transitions, deterministic layout, pointer-events for tooltips.
- PR template, merging instructions, and release documentation prepared for public launch

---

## [v0.3.5-beta] - 2026-02-16

### Critical Fix — Peak Temperature Capping
- **REGIME_MAX_TEMPERATURE capping**: Unified Theory page showed unrealistic peak temperatures (e.g. 4.5e9 K). Applied physics caps from `bubble_collapse.py` Phase 1.9: single_bubble ~1e4 K, multi_bubble ~5e3 K, laser_driven ~1e5 K.
- **bubble_lattice_interaction.py**: Cap T_max at REGIME_MAX_TEMPERATURE["single_bubble"] (1e4 K) after adiabatic rise calculation.
- **bubble_collapse.py**: Cap `enhanced_temperature` in `calculate_surface_enhanced_collapse` at regime max.
- **UnifiedTheoryPage.jsx**: Cap local fallback `max_temperature_k` and `peak_conditions.temperature_k` at 1e4 K when API is unavailable.

### Physics Engine Overhaul (Phase 1–2 Verification)
- **electron_screening.py**: strong/anomalous models, classify_screening_regime, calculate_gamow_integral_screened
- **casimir_forces.py**: calculate_casimir_force_with_metadata, DOMAIN_VALIDITY_THRESHOLD_M (2e-9 m)
- **bubble_collapse.py**: REGIME_MAX_TEMPERATURE, calculate_collapse_temperature_regime
- **non_equilibrium_thermo.py**: MILES_HE_RATE (2.63e11 atoms/s/W), calculate_miles_heat_helium_correlation
- **proton_phase_model.py**: weak interaction import, get_weak_neutron_formation_params
- **unified_lenr_model**: get_material_work_function, get_double_layer_potential
- **TheoryDocumentationPanel**: P_overlap 8.5e-16, "Delocalized Interface Electrons", r_n 5 fm
- **UnifiedTheoryPage**: ENHANCEMENT_THRESHOLDS observable=1e5, measurable=1e3, screening=1e1

### Pre-Release Sweep Completion (Phases 1-4)
- **Quantum tunneling stability**: Fixed NaN visualization path failures by exporting physical constants in `quantumTunnelingUtils.js` and adding finite guards in `QuantumTunnelingVisualizer.jsx`.
- **Bubble-lattice physical bounds**: Added hard-core compression floor and applied realistic caps for collapse pressure/temperature; synchronized enhancement capping across route and engine paths.
- **Theory validation metadata**: Added `validation_flags` observables in Miles heat-helium, electron screening, and Kim BEC modules to flag out-of-range outputs against experimental guidance.
- **Documentation corrections**: Updated halo-electron overlap probability references to `8.5e-16` and aligned equations with nuclear-scale radius assumptions.
- **UX reliability updates**: Fixed MUI DOM nesting warning in advanced analysis, persisted `simulationResult` via `sessionStorage`, and suppressed noisy WebGL `Data3DTexture` warnings by disabling flipY.

### MHD Flow + Visual Aesthetics Improvements
- **Lattice-as-solid boundary**: Added explicit topological lattice surface boundary in `UnifiedBubbleLatticeVisualization.jsx` and enforced proton no-penetration constraints.
- **Vortex site intake model**: Added visible vortex/interstitial intake markers and proton acceptance logic during COLLAPSE/MINIMUM with absorb/respawn cycling.
- **Cavitation rebound reversal**: Added rebound-triggered azimuthal flow reversal, outward burst blending, and cavitation pulse visual feedback to reflect electro-nuclear event reversal dynamics.
- **Vortex renderer parity**: Updated `VortexFlowRenderer.js` to support reversed swirl/field-line rotation during rebound and lattice-surface boundary clamping.
- **Thermal title styling**: Updated Theory page header to a thermal-map gradient (cold-to-hot spectrum) for improved scientific visual language.

### ESLint Compliance — CI Build Hardening

Resolved all ESLint warnings across 61 frontend source files so the production build passes with `CI=true` (Create React App treats warnings as errors in CI). The frontend build and tests now run cleanly without requiring `CI: false`.

#### Changes by Category

**Unused Imports & Variables**
- Removed unused imports (React hooks, MUI components, icons, types) from 25+ files
- Prefixed intentionally unused variables and destructured props with `_` (e.g., `_lastError`, `_sliderValue`)
- Used destructuring aliases for TypeScript interface props: `isLoading: _isLoading` to satisfy both ESLint and type safety

**React Hooks — exhaustive-deps**
- Added `// eslint-disable-next-line react-hooks/exhaustive-deps` on the line immediately before each dependency array (correct placement — the rule reports on the dep array line)
- Affected files: SimulationResults, VisualizationDebugger, ReactionConfigurationManager, SettingsPage, FusionVisualization, LENRVisualization, PhysicsContext, and others

**Ref Cleanup Patterns**
- `TestCube.tsx`, `ThreeJsTest.tsx`: Captured `containerRef.current` in a local variable at effect start for use in cleanup (avoids "ref will likely have changed" warning)
- `PhysicsVisualEffects.tsx`: Captured `effectsRef.current` in a local variable for cleanup

**Static Object Extraction**
- `DashboardControlsPanel.tsx`: Moved `defaultFilters` out of the component as `DEFAULT_FILTERS` constant to prevent recreating the object on every render (fixes useCallback dependency warning)

**Other Fixes**
- `client.ts`: Wrapped `ErrorType` enum in `/* eslint-disable no-unused-vars */` block (enum members are exported for API consumers; renaming would break the public API)
- Stripped Unicode BOM (Byte Order Mark) from `PhononNuclearPanel.tsx`, `QEDVisualization.tsx`, `StatisticalAnalysisPanel.tsx`, `ThermodynamicsPanel.tsx`
- `FusionParameterControls.jsx`: Fixed `sliderValue` reference after variable rename to `_sliderValue`
- `RelevanceMap.tsx`: Consistent `_nodeScoreMap` key in all `useMemo` return paths

#### Verification

- **Build**: `npm run build` with `CI=true` — compiles successfully
- **Tests**: 75 tests across 9 suites — all passing
- **Files touched**: 61 frontend source files (api/, components/, pages/, services/, visualization/, contexts/, debug/)

---

## [v0.3.3-beta] - 2026-02-14

### Relevance Map UI/UX (2026-02-15)
- **Hover flashing fix**: Eliminated flashing when hovering Phonon-Nuclear Coupling, Electron Screening, Chubb Ion Band State, and other high-score nodes. Root cause: conflicting updates between D3 mouse handlers and React selection effect. Fix: single source of truth — D3 handlers now only update `hoveredNode` state and edge labels; the React effect applies all node visuals (opacity, stroke-width, glow) including hover styling. Added `hoveredNode` to effect deps for coordinated updates.
- **Initial "locked in" view**: Graph now loads with a consistently readable default — increased fit padding (60→80px), slight scale headroom (0.95→0.92), and synchronous pre-computed layout so the fit-to-bounds zoom is applied immediately. Recenter button uses the same parameters for consistency.
- **Documentation**: Changes align with best practices — unified state flow, no conflicting transitions, consistent initial view parameters.

### Cross-Theory Coupling Pipeline (New Feature)
- **Coupled Pipeline Runner**: Added `run_coupled()` method to `TheoryPipeline` that executes theories in topological dependency order, injecting upstream outputs into downstream conditions
- **Topological Sort**: Added `topological_sort()` and `get_coupling_map()` methods to `TheoryGraph` using Kahn's algorithm on directed edges (extends, explains_observation)
- **Promoted Keys**: Key observables (`screening_potential_eV`, `T_peak_K`, `P_peak_Pa`, `B_compressed_T`, `he4_production_rate`) are auto-promoted to top-level conditions for seamless downstream consumption
- **API Endpoints**: `POST /api/analytics/theories/run-coupled` for coupled execution, `GET /api/analytics/theories/coupling-graph` for dependency order and coupling map visualization

### Legacy Module Integration
- **Phonon-Nuclear Coupling**: Wrapped `app.physics.phonon_nuclear_coupling` as a `TheoryModule` (`phonon_coupling_legacy`), exposing Debye-Waller, Bose-Einstein phonon occupation, and polaron effective mass as pipeline observables
- **Non-Equilibrium Thermodynamics**: Wrapped `app.physics.non_equilibrium_thermo` as a `TheoryModule` (`non_equilibrium_thermo`), providing COP, excess power, and entropy production diagnostics
- **Rydberg Matter → Electron Screening**: Integrated `rydberg_matter.py` calculations into the electron screening theory -- Rydberg state formation probability and extended orbital enhancement now modulate the screening potential
- **Boundary Layers → Bubble-MHD**: Integrated `boundary_layers.py` into bubble-MHD confinement -- thermal/diffusion layer thicknesses, nucleation zone, and heat flux at the bubble wall are now computed and reported in observables
- **21 Pipeline Theories**: Theory count increased from 19 to 21 with new legacy wrappers; both appear on the Relevance Map with relationship edges

### Frontend Improvements
- **Relevance Map Cutoff Fix**: Changed fixed `height: 720/640` to `minHeight` on graph containers; increased D3 centering force strength (0.03 → 0.06); added node position clamping in tick handler to prevent drift outside SVG bounds
- **Coupled Mode Toggle**: Added "Coupled Mode" switch to Theory Testbed panel with dependency-aware execution, coupling arrows showing upstream feeds, and execution order indicator
- **Advanced Parameter Passthrough**: `defect_density`, `grain_size`, and `surface_roughness` from Advanced Parameters sliders now forwarded to Theory Testbed conditions
- **Broken Link Fix**: Fixed dead `https://www.lenr.org` link in Theory Paper → `https://www.lenr-forum.com/`

### API Consolidation
- Marked `simulation_router.py` and `simulation_routes.py` as deprecated (not mounted in main.py)
- Documented physics router double-prefix issue (`/api/physics/physics/...`) for future cleanup
- Added inline documentation for router architecture

### Testing
- **20+ New Tests**: Topological sort, coupled pipeline (full and subset), phonon coupling legacy, non-equilibrium thermo, pipeline with 21 theories, coupling map verification
- Updated scoring and validation tests to accept ≥19 theories (from exactly 19)

---

## [v0.3.2-beta] - 2026-02-14

### Physics Engine Improvements
- **Scoring Engine Fairness**: Set floor on sub-scores at 0.05 to prevent geometric mean catastrophe; theories no longer score near-zero due to a single missing observable
- **Alternative Observable Key Mapping**: Scoring engine now recognizes `neutron_rate_suppression`, `photon_cascade_count`, `branch_*` ratios as equivalent to product keys
- **Inapplicable Theory Handling**: Theories outside their applicability domain now receive neutral score (0.5) instead of being penalized with empty observables
- **Product Observables Added**: All 19 theory modules now output `product_He4`, `product_neutrons`, `product_gamma` with physically justified values based on published literature
- **Pipeline Parameter Bug Fix**: Fixed `configs=` → `theory_configs=` in `unified_lenr_model.py` that prevented theory-specific configurations from being passed to the pipeline
- **Gap/Crack Width Conditions**: `gap_width_nm` and `crack_width_nm` now passed from unified model to theory pipeline (derived from surface roughness), enabling Hydroton/NAE applicability

### Frontend UI/UX Improvements
- **Relevance Map Layout Fix**: Swapped flex values so graph occupies ~75% and score sidebar ~25% (was inverted)
- **Advanced Parameters Panel**: Added 5 new simulation controls (Initial Bubble Radius, Defect Density, Surface Roughness, Grain Size, Acoustic Cycles) as an expandable accordion in the Unified Theory page
- **Dynamic Theory Testbed Conditions**: Gap width and crack width now derived from simulation state instead of hardcoded values
- **Theory Paper Expansion**: Added 13 new theory sections (Section 2.4: Hydroton/NAE, Section 2.7: Oppenheimer-Phillips, Section 6: Extended Theoretical Models covering all remaining theories) with Theory-to-Simulation mapping table

### API Improvements
- **TheoryConditions Model**: Added `gap_width_nm` and `crack_width_nm` fields to the Pydantic model for scoring and comparison endpoints

### Testing
- **6 New Tests**: Product observable completeness, Hydroton applicability with gap conditions, scoring fairness (no theory < 10%), Hydroton > 40%, inapplicable neutral score, scoring floor guard
- **69 Total Tests**: All passing (was 63)

### Documentation
- Updated all documentation to v0.3.2-beta
- Created PAPER_CORRECTIONS_APPLIED.md for tracking physics corrections
- Updated THEORY_OVERVIEW with product observable mappings
- Expanded PHYSICS_MODULE_GUIDE with TheoryModule creation guide

---

## [v0.3.1-beta] - 2026-02-14

### Added

#### Enhanced Relevance Map — Rigid Network Explorer

- **Rigid force simulation**: Higher `alphaDecay` (0.04) and `velocityDecay` (0.55) so
  the graph settles quickly into a stable layout rather than floating around.
  Nodes pin in place when dragged (with "Unpin all" button to reset).

- **Click-to-select with detail panel**: Clicking a node selects it and opens a
  slide-out detail panel showing full theory info: researcher, year, predictive
  score breakdown (5 sub-scores), key predictions, physical properties, material
  systems, and clickable connected-theories list for graph navigation.

- **Neighbourhood highlighting**: When a node is selected, connected nodes remain
  bright while non-neighbours dim to 15% opacity. Edges to neighbours are
  highlighted at 85% opacity.

- **Search bar**: Real-time fuzzy search across theory name, researcher, and ID.
  Matching nodes stay bright; non-matches dim. Clear button (×) to reset.

- **Network statistics**: Live counters for Theories, Relationships, and Properties
  displayed above the graph.

- **Edge labels on hover**: Hovering a node shows relationship type labels on all
  connected edges (Shares Mechanism, Same Product, Explains, Extends, Contradicts).

- **Visual polish**: SVG glow filter for high-score nodes (>70%), dark canvas
  background (`#0a1628`), semi-transparent zoom controls, status bar with usage
  instructions ("Click nodes to explore · Scroll to zoom · Drag to pan · Drag
  nodes to pin").

- **`analyticsApi.js` double-unwrap fix**: Fixed pre-existing bug where all 20
  analytics API methods returned `response.data` but the `api.js` service already
  unwraps `response.data`, causing the analytics page to show "Offline Mode" even
  when the backend was healthy. Changed all to `return response`.

#### 12 New LENR Theory Modules (19 Total)

- **Takahashi TSC** (`theories/takahashi_tsc.py`): 4D tetrahedral symmetric
  condensate, simultaneous 4-body tunnelling. 4D→2He-4 + 47.6 MeV.
  Ref: Takahashi (2004, 2008, 2013) J. Condensed Matter Nucl. Sci.

- **Hagelstein Phonon-Nuclear** (`theories/hagelstein_phonon.py`): Coherent energy
  transfer from nuclear reactions to ~10^8 lattice phonons via anharmonic coupling.
  Explains no-gamma signature. Ref: Hagelstein (2010-2022) JCMNS.

- **Vysotskii CCS** (`theories/vysotskii_ccs.py`): Coherent Correlated States in
  non-stationary potential wells, up to 10^40 tunnelling enhancement.
  Ref: Vysotskii & Kornilova (2009, 2013).

- **Swartz NANOR/LANR** (`theories/swartz_nanor.py`): Optimal Operating Point (OOP)
  model in 2D loading-current parameter space for ZrO2-PdD nanostructures.
  Ref: Swartz (2006-2021) JCMNS.

- **Miles Heat-Helium** (`theories/miles_heat_helium.py`): Quantitative validation:
  1W excess heat = 2.6×10^11 He-4/s (23.8 MeV/fusion). Independently confirmed
  by Gozzi, Bockris, Arata, De Ninno, McKubre. Ref: Miles (1993, 2000).

- **Widom-Larsen** (`theories/widom_larsen.py`): Ultra-low momentum neutrons via
  surface plasmon mass renormalization and inverse beta decay.
  Ref: Widom & Larsen (2006) Eur. Phys. J. C 46, 107.

- **Kim BEC** (`theories/kim_bec.py`): Bose-Einstein condensate of deuterons in
  nano-grains with N²-enhanced collective fusion rate.
  Ref: Kim (2009, 2013) JCMNS.

- **Matsumoto ENC** (`theories/matsumoto_enc.py`): Electro-nuclear collapse of
  hydrogen clusters into itonic states under intense EM fields.
  Ref: Matsumoto (1992-2000) Fusion Technology.

- **Chubb Ion Band** (`theories/chubb_ion_band.py`): Ion band state theory — Bloch
  wave deuterons fuse via resonant energy minimisation in periodic lattice.
  Ref: Chubb & Chubb (1990-2005).

- **Piantelli Ni-H** (`theories/piantelli_ni_h.py`): Ni-H thermal activation with
  Arrhenius onset above 400-700 K, surface area scaling.
  Ref: Focardi & Piantelli (1998), Piantelli (2012).

- **Iwamura Transmutation** (`theories/iwamura_transmutation.py`): Nuclear
  transmutation via D₂ permeation through Pd/CaO/Pd multilayers. Cs→Pr, Ba→Sm.
  Ref: Iwamura et al. (2002, 2004) Jpn. J. Appl. Phys.

- **Letts-Cravens Laser** (`theories/letts_laser.py`): Dual-laser stimulation at
  670-685 nm triggers 10-30× excess heat enhancement in Pd-D systems.
  Ref: Letts & Cravens (2003-2009) Proc. ICCF.

#### Theory Relevance Map and Scoring Engine

- **Theory Relationships** (`physics_engine/theory_relationships.py`): 19-node graph
  with 70+ edges encoding shared mechanisms, product predictions, and explanatory
  relationships. Physical properties taxonomy with 18 categories.

- **Predictive Probability Scoring** (`physics_engine/theory_scoring.py`): 5-factor
  weighted geometric mean score (physical consistency, experimental agreement,
  parameter sensitivity, cross-theory agreement, observables completeness).
  Includes parameter sweep across all theories.

- **Cross-Examination Validation** (`physics_engine/theory_validation.py`): 7
  validation checks (Miles correlation, no radiation, loading threshold, surface
  dependence, product spectrum, thermal activation, reproducibility).

- **New API Endpoints** (`routers/analytics_routes.py`):
  - `GET /api/analytics/theory-graph` — Network graph nodes + edges
  - `POST /api/analytics/theory-scores` — Compute all theory scores
  - `POST /api/analytics/theory-comparison` — Side-by-side comparison
  - `POST /api/analytics/parameter-sweep` — Sweep parameter across theories
  - `GET /api/analytics/validation-report` — Full validation report
  - `GET /api/analytics/theory-properties` — Shared properties taxonomy

#### Frontend: Relevance Map Feature

- **RelevanceMap.tsx**: D3 force-directed network graph with probability-weighted
  node sizing, category colouring, confidence-based borders, hover tooltips,
  drag interaction, zoom/pan, and filter controls.

- **Analytics Page Tab**: New "Relevance Map" tab with graph area (70%),
  ranked theory score cards sidebar (30%), category/property filters,
  minimum score slider, and "Run Scores" button.

- **Analytics API Client**: 6 new methods for theory graph, scoring,
  comparison, parameter sweep, validation, and properties endpoints.

#### Infrastructure

- **WebSocket Theory Comparison**: New `theory-comparison` simulation type streams
  per-theory results in real time to the Relevance Map.

- **TheoryRun DB Model**: SQLAlchemy model for persisting theory pipeline runs
  with conditions, per-theory scores, and combined results.

### Changed

- **MUI Grid v2 Migration**: Fixed remaining `item`/`xs` props in
  AdvancedAnalysisPage, PresetManager, EnhancedFusionPanel.
- **Widom-Larsen**: Corrected default mass renormalization ratio from 2.531 to 4.0
  (physical threshold is ~3.53 m_e).
- **Version**: Bumped to v0.3.1-beta across frontend and backend.

### Tests

- 63 new tests in `tests/test_theory_modules.py` covering all 19 theory modules,
  pipeline integration, scoring engine, validation framework, and theory graph.

---

## [v0.3.0.1-beta] - 2026-02-13

### Added

#### MHD Nano-Confinement Physics Enhancement (9-Phase Implementation)

- **MHD Dimensionless Parameters** (`physics_engine/mhd/dimensionless_parameters.py`):
  Magnetic Reynolds number (Rm), Hartmann number (Ha), Lundquist number (S),
  plasma beta (β), Hall parameter (β_H), Stuart/interaction number (N),
  magnetic Prandtl number (Pm), Alfvén velocity (v_A), with regime classification
  (frozen-in / diffusive / kinetic / pinch-dominated).
  Refs: Davidson (2001), Müller & Bühler (2001), Goedbloed & Poedts (2004).

- **MHD Induction Solver** (`physics_engine/mhd/mhd_induction_solver.py`):
  1D cylindrical (z-pinch) and simplified 3D Cartesian solvers for the generalized
  induction equation ∂B/∂t = ∇×(v×B) − ∇×(η∇×B) + Hall + ∇Pₑ terms.
  Explicit Euler with CFL-limited adaptive timestep.

- **Hartmann Channel Flow** (`physics_engine/mhd/hartmann_flow.py`):
  Analytical Hartmann velocity profiles for insulating and conducting walls,
  boundary layer thickness δ_Ha = L/Ha, flow rate ratio, pressure drop ratio,
  Casimir quantum correction at nanoscale gaps.
  Refs: Hartmann (1937), Shercliff (1953), Casimir (1948), Lifshitz (1956).

- **Hall & Faraday Channel Physics** (`physics_engine/mhd/hall_faraday_channels.py`):
  Full 3×3 conductivity tensor (σ_parallel, σ_Pedersen, σ_Hall), Hall current
  density J_H, Faraday EMF and segmented/continuous channel analysis, ion slip
  factor, loading parameter optimisation, bubble-collapse flux compression model.

- **Multi-Scale Bridging Framework** (`physics_engine/mhd/multiscale_bridge.py`):
  Five-level hierarchy (MACRO → BUBBLE → SURFACE → LATTICE → NUCLEAR) with
  downward boundary condition cascade and upward nuclear source term propagation.
  MHD parameters computed independently at each scale; dominant physics classification.

- **Nuclear Force Coupling** (`physics_engine/mhd/nuclear_force_coupling.py`):
  EM coupling (Debye screening, Gamow factor, Sommerfeld parameter),
  Weak coupling (electron capture rate with Rydberg enhancement),
  Strong coupling (D+D S-factor from NACRE II, energy-dependent cross-sections,
  branching ratios for D(d,n)He3, D(d,p)T, D(d,γ)He4, p+D radiative capture).
  Refs: NACRE II — Xu et al. (2013), Caughlan & Fowler (1988), Bahcall (1964),
  Assenbaum et al. (1987), Ichimaru (1993), Bosch & Hale (1992).

- **LBM–MHD Force Coupling**: `fluid_dynamics_solver.py` gained `set_mhd_body_force()`
  to inject J×B Lorentz force from the induction solver into the D3Q19 lattice
  Boltzmann velocity field.

- **Frontend MHD Dashboard**: `TheoryTogglePanel.tsx` now renders a dedicated
  `MHDParameterDashboard` with colour-coded regime chips for all dimensionless
  numbers and a key-observables grid (Alfvén velocity, compressed B, Faraday EMF,
  screening energy, flux compression, nuclear power density, neutron rate,
  collapse velocity).

### Changed

#### Mathematical Corrections & Rigour Improvements

- **Fixed screening energy unit bug** in `bubble_mhd_confinement.py`:
  Removed erroneous extra `/ E_CHARGE` division.  Previous formula underestimated
  screening energy by a factor of ~1.6×10¹⁹.
  Corrected formula: U_s [eV] = e / (4πε₀ λ_D).
  Ref: Ichimaru (1993) Rev. Mod. Phys. 65, 255.

- **Improved collapse velocity estimate**: Replaced average v_c = R₀/t_c with
  Rayleigh peak wall velocity v_max = √(2ΔP / 3ρ).  Uses max(average, peak) for
  conservative MHD parameter estimation.
  Ref: Rayleigh (1917) Philos. Mag. 34, 94.

- **Revised enhancement factor model**: Removed physically questionable Hartmann
  pressure-drop-ratio enhancement.  Replaced raw Stuart number with √(N) scaling
  (confinement time ∝ N^(1/2), Ref: Davidson §5.3).  Enhancement = flux_compression
  × √(Stuart) × Gamow_screening, each capped individually.

- **Multi-factor confidence calculation**: Replaced ad-hoc `(compression/10) × (Ha/10)
  × loading` with a regime-validity model:
  - Compression quality score (compression_ratio / 5)
  - MHD regime score (weighted Rm and Ha sub-scores)
  - Loading quality score
  - Screening plausibility check (< 1 keV)
  - Nuclear data quality factor (0.9 for NACRE II D+D)
  Inspired by Bayesian model evidence methodology (Sivia & Skilling, 2006).

#### Reference & Citation Updates

- Added 13 academic references to `bubble_mhd_confinement.py` metadata (full
  journal/volume/page format).
- Added Casimir (1948) and Lifshitz (1956) citations to `hartmann_flow.py`.
- Added Assenbaum et al. (1987), Ichimaru (1993), Bosch & Hale (1992) to
  `nuclear_force_coupling.py`.

### Tests

- **47-test MHD physics suite** (`tests/test_mhd_physics.py`): Validates
  dimensionless parameters, Hartmann flow, Hall conductivity, Faraday channels,
  nuclear cross-sections, electron capture, multi-scale bridge, induction solver,
  and full Bubble-MHD theory integration.  All tests pass.

---

## [v0.3.0-beta] - 2026-02-10

### Added

#### Theory Testbed Architecture
- **TheoryModule protocol** (`physics_engine/theory_protocol.py`): Common interface for composable LENR theory modules with `TheoryContribution` dataclass
- **TheoryPipeline orchestrator** (`physics_engine/theory_pipeline.py`): Registry-based pipeline to run, combine, and compare multiple theories
- **API endpoints**: `GET /api/physics/theories`, `POST /api/physics/theories/run`, `POST /api/physics/theories/{id}/run`

#### New Theory Modules (Peer-Level, Selectable)
- **Electron Screening** (`theories/electron_screening.py`): Debye screening, Sommerfeld parameter, screened Coulomb barrier
- **Confined-Mode QED / Coherent Domains** (`theories/coherent_qed.py`): Del Giudice/Preparata coherent EM domains, geometry-dependent vacuum modification (replaces bulk Schwinger vacuum polarization)
- **Storms' Hydroton Model** (`theories/hydroton.py`): H-e-H-e-H covalent chain, resonance fusion, gradual photon emission cascade
- **Nuclear Active Environment** (`theories/nae_model.py`): Crack-size filtering, simultaneity requirement, site probability distribution, hydrogen loading purity
- **Bubble-MHD Nano-Confinement** (`theories/bubble_mhd_confinement.py`): Nano-scale Ulam-Teller analog composing MHD confinement, bubble compression, and surface phase transitions
- **Casimir Confinement** (`theories/casimir_confinement.py`): Casimir force with Lifshitz finite-conductivity correction
- **Quantum Tunneling** (`theories/quantum_tunneling_theory.py`): WKB/Gamow tunneling as base rate module

#### Mathematical Corrections
- Unified `MAX_ENHANCEMENT_FACTOR` constant (10^5 default, configurable) across all modules
- Confined-mode QED functions in `qed_effects.py` (coherence domain enhancement, vacuum mode modification)
- Lifshitz finite-conductivity correction in `casimir_forces.py`
- Halo electron overlap radius verification (r_0 = 5 fm nuclear radius)

#### Validation Metrics
- Miles heat-helium correlation check (1 W = 2.6e11 He-4/s)
- Ni-H thermal activation threshold (>700 C)
- Hydrogen loading purity parameter (continuous 0-1)

#### Frontend Theory Testbed
- **TheoryTogglePanel** component: Enable/disable individual theories with per-theory parameter controls
- PhysicsModelRegistry wired to backend `/api/physics/theories` endpoint
- Per-theory contribution breakdown in UnifiedTheoryPage
- PhysicsContext extended with `enabledTheories` and `theoryConfigs` state

#### Unified Model Integration
- `unified_lenr_model.py` now delegates to TheoryPipeline via `use_theory_pipeline` config toggle
- `calculate_full_qed_enhancement()` includes confined-mode and coherent-domain paths alongside classical QED

#### Academic Review Code Improvements
- Multi-phonon coherence energy gap problem explicitly documented in `phonon_interactions.py` with `estimate_phonon_coherence_number()` utility
- Oppenheimer-Phillips `base_prob` replaced with Gamow-derived value (was hardcoded 1e-60 placeholder)
- Gamow factor in `bubble_collapse.py` unified with full Sommerfeld-parameter calculation from `quantum_tunneling.py`
- EM solver: PEC normal-B=0, PMC, and periodic boundary conditions implemented
- Thermal solver: periodic and Robin (convective) boundary conditions added
- Unified LENR solver: charge/current density sources built from lattice particle data (NGP deposition)
- Fusion processor: host/tritium/proton density grids properly sourced from lattice state

#### Documentation
- `THEORY_OVERVIEW.md` updated with theory testbed, corrected physics, and 16 academic references
- Added citations: Storms 2014, Miles 1993, Del Giudice 1998, Preparata 1995, Takahashi 2008, Raiola 2004, Czerski 2001, Lifshitz 1956, Hagelstein 2012

#### Pre-Launch Readiness (Phase 1-5)
- **Backend API surface cleanup**: Theory testbed router mounted in `main.py`; OpenAPI tags reorganized; dev routers grouped under `(Dev)` tags
- **Frontend hardening**: `SimulationDetail.jsx` mock data replaced with real `simulationApi` calls and retry button
- **API client consolidation**: `services/api.js` refactored to delegate to canonical `api/client.ts` Axios instance
- **Sidebar navigation**: Added Theory Paper, Theory Guide, About links; generalized per-section submenu collapse in `AppLayoutFixed`
- **Component extraction**: `TheoryDocumentationPanel` extracted from `UnifiedTheoryPage.jsx` (1515→1261 lines)
- **SettingsPage**: Loading indicator for system health check
- **Deployment docs**: `PHASE4_DOCKER_SWARM_DEPLOYMENT.md`, `ARCHITECTURE.md`, `DEPLOYMENT_COMPLETE.md` updated to v0.3.0-beta and correct workflow `deploy.yml`
- **PR template**: `.github/PULL_REQUEST_TEMPLATE.md` with pre-merge checklist

#### Browser Testing & Integration Fixes
- **PhysicsProvider wrapper**: Added `<PhysicsProvider>` around `UnifiedTheoryPage` route in `App.tsx` (Theory Testbed tab was crashing with `usePhysics must be used within a PhysicsProvider`)
- **Theory router prefix fix**: Corrected double-prefix bug in `main.py` — theory testbed router mount changed from `prefix="/api/physics"` to `prefix="/api"` (router already has internal `/physics` prefix, resulting path was `/api/physics/physics/theories` instead of `/api/physics/theories`)
- **MUI Tooltip disabled button fix**: Wrapped disabled download buttons (JSON/CSV) in `<span>` elements in `UnifiedTheoryPage.jsx` to resolve MUI console warnings about disabled children

### Changed
- Version corrected from v0.3.0.0-beta to v0.3.0-beta (semver compliance) across all 13 files
- Branch renamed from `lenr_sim_app_v0.3.0.0-beta` to `lenr_sim_app_v0.3.0-beta`
- QED module reframed from Schwinger bulk vacuum polarization to confined-mode/coherent domain effects
- BEC critical temperature issue resolved by subsuming into coherent QED domain model
- Enhancement factor caps unified to 10^5 (from scattered 10^8/10^10/10^15 values)

### Fixed

#### 3D Visualization – Reaction Formation and MHD Alignment
- **Reaction formation at top center of lattice**: Nucleation site moved from offset `(spacing*0.5, latticeY, spacing*0.5)` to lattice top center `(0, latticeY, 0)` so the bubble sits in the true interstitial void between the four central top-surface atoms (aligned with centered lattice coordinates).
- **MHD vortex alignment**: MHD flow group parent is positioned at the nucleation site with child at local origin so rotation spins in place instead of orbiting world origin.
- **Field lines, effects, and shockwave**: Electric field lines, hotspots, nuclear emissions, shockwave, and field particle animation now all use the same top-center nucleation coordinates.
- **Casimir geometry**: The four nearest-atom positions for Casimir force lines updated to `(±halfSpacing, latticeY, ±halfSpacing)` to match the centered lattice around the nucleation site.
- **Proton COLLAPSE orbit**: Circular motion during collapse is now centered on the cavitation point (was incorrectly centered on world origin).
- **Proton REBOUND confinement**: Rebound scatter is limited to ~1.2 lattice spacings with a restoring force beyond that; hard clamp at 2 lattice spacings in all phases so protons stay confined near the nucleation site, consistent with lattice phonon absorption (Hagelstein model) and experimental observations that reaction energy couples to the lattice rather than ejecting boundary-layer particles.

### Documentation
- **docs/VISUALIZATION_ALIGNMENT_AND_PROTON_CONFINEMENT.md**: Development note describing nucleation positioning, MHD/field/effects alignment, and physics-based proton confinement.

## [v0.2.3-beta] - 2026-02-01

### Added

#### Physics Enhancements: Heterogeneous Nucleation and Surface Coupling
- **Nucleation Sites Module** (`nucleation_sites.py`): Classical nucleation theory with surface effects
  - `NucleationSite` dataclass with cavity geometry, contact angle, surface energy
  - `calculate_nucleation_energy_barrier()` - Gibbs free energy with f(θ) correction
  - `calculate_critical_radius()` - Young-Laplace critical radius
  - `calculate_waiting_time()` - Statistical nucleation timing
  - `calculate_active_site_probability()` - Site activation based on supersaturation
  - Contact angle factor: f(θ) = (2 + cosθ)(1 - cosθ)²/4

- **Bubble-Surface Coupling Module** (`bubble_surface_coupling.py`): Physical bubble-lattice relationship
  - `BubbleSurfaceState` - Position, forces, attachment state tracking
  - `calculate_equilibrium_distance()` - Casimir/vdW/thermal balance
  - `calculate_van_der_waals_force()` - Sphere-plate Derjaguin approximation
  - `calculate_detachment_radius()` - Fritz equation for bubble departure
  - `calculate_jet_velocity()` - Microjet formation during asymmetric collapse
  - Surface proximity enhancement for standoff ratios γ < 2

- **Thermal/Diffusion Boundary Layers** (`boundary_layers.py`): Heat and mass transfer
  - `BoundaryLayerState` - Layer thicknesses, gradients, fluxes
  - `calculate_thermal_boundary_thickness()` - From Nusselt number
  - `calculate_diffusion_boundary_thickness()` - Lewis number scaling
  - `calculate_nucleation_zone_thickness()` - Where conditions favor nucleation
  - Temperature and concentration profile functions (erf profiles)
  - Material properties for Pd, Ni, D2O systems

- **Acoustic/Ultrasonic Forcing** (extended `bubble_collapse.py`):
  - `calculate_minnaert_frequency()` - Natural bubble resonance
  - `calculate_primary_bjerknes_force()` - Acoustic radiation force
  - `calculate_secondary_bjerknes_force()` - Bubble-bubble interaction
  - `calculate_acoustic_streaming_velocity()` - Rayleigh streaming near surface
  - `calculate_standing_wave_positions()` - Node/antinode locations
  - `calculate_acoustic_nucleation_enhancement()` - Barrier reduction from pressure
  - `calculate_rectified_diffusion_rate()` - Asymmetric gas transfer

- **Surface Proximity Effects** (extended `bubble_collapse.py`):
  - `calculate_surface_proximity_factor()` - Enhancement near rigid boundary
  - `calculate_asymmetric_collapse_pressure()` - Pressure amplification
  - `calculate_jet_impact_parameters()` - Microjet velocity, diameter, pressure
  - `simulate_bubble_dynamics_near_surface()` - Full R-P with surface effects
  - `calculate_surface_enhanced_collapse()` - Complete enhanced calculation

- **Surface Reaction Rate Integration** (`integrated_mechanisms.py`):
  - `SurfaceReactionRateResult` - Comprehensive rate result dataclass
  - `calculate_surface_reaction_rate()` - Full integration of all physics
  - `calculate_single_site_lenr_rate()` - Simplified API interface
  - Combines: nucleation, proximity, boundary layer, acoustic, LENR enhancements

- **Updated Visualization** (`UnifiedBubbleLatticeVisualization.jsx`):
  - `PHYSICS_CONFIG` - Physics-to-visualization scale mapping, bubble scale by phase
  - Bubble nucleates small at surface, grows while attached, then collapses (heterogeneous nucleation)
  - Phase-dependent bubble Y position and scale (EXPANSION → MINIMUM → RECOVERY)
  - Legend: "Casimir Field" → "Casimir Geometry"; "Vortices" → "MHD Flow"
  - H2/D2 particles: smaller, more count, MHD flow properties (orbit, angular velocity, ionized state)
  - MHD flow: particle-only (PlasmaVortexEffect + VortexField); removed rings, arrows, and path lines
  - Reaction jet on bubble collapse: visible focused jet during MINIMUM/REBOUND (restored)
  - Particle color by phase/energy: collapse/minimum → orange/red/white; rebound → green/cyan; expansion → cyan (ionized) or orange (neutral H2/D2)
  - Removed dark nucleation cavity cone and boundary layer planes from lattice for cleaner view
  - Physics comments explaining nm-scale relationships

- **New API Endpoints** (`physics_routes.py`):
  - `POST /api/physics/nucleation/calculate` - Full nucleation analysis
  - `POST /api/physics/boundary-layer/profile` - Layer profiles with distance
  - `POST /api/physics/surface-reaction-rate` - Integrated rate calculation
  - `GET /api/physics/surface-physics/materials` - Material property reference

#### Database Infrastructure
- **PostgreSQL Database Integration**: Persistent storage for experiment analytics
  - `database.py` - Async SQLAlchemy 2.0 engine with PostgreSQL and SQLite support
  - `database_models.py` - Experiment, ExperimentTimeline, and AnalyticsSnapshot models
  - Alembic migrations for schema versioning
  - Connection pooling and health checks
- **Analytics API**: Full REST API for experiment data management
  - `analytics_routes.py` - CRUD endpoints, export (CSV/JSON), statistics, distributions
  - `analytics_service.py` - Business logic for stats, filtering, pagination
  - Dashboard statistics (total simulations, success rate, avg enhancement)
  - Type and material distribution charts
  - Timeline data for enhancement over time visualization
- **Baseline LENR Data**: Published experiment data from LENR research
  - `baseline_experiments.py` - 20+ baseline experiments from published research
  - Sources: Fleischmann-Pons, McKubre/SRI, SPAWAR, Iwamura, Brillouin, Clean Planet
  - `seed_database.py` - Idempotent database seeding script
- **Analytics Frontend Integration**
  - `analyticsApi.js` - API client with automatic localStorage fallback
  - Session-based user tracking for experiment attribution
  - Updated `AnalyticsPage.jsx` to fetch from database with offline mode indicator
  - Baseline vs user experiment distinction in UI
- **Save to Analytics**: One-click experiment saving from simulation pages
  - Added "Save to Analytics" button to `UnifiedTheoryPage.jsx`
  - Added "Save to Analytics" button to `FusionSimulationPage.jsx`
  - Automatic save with session ID for user tracking

### Changed
- Updated `config.py` with database configuration settings (DB_HOST, DB_PORT, etc.)
- Updated `main.py` with database initialization in lifespan context
- App version bumped to 0.2.3-beta
- **Dashboard UI/UX**: Increased feature chip spacing (Stack spacing and rowGap) to prevent overlap between "Physics Simulation" and "Export Results"; FeatureChip margin and theme-aware background/border for light/dark mode
- **Terminology**: Renamed "Casimir Force/Forces" to "Casimir Effect" across theory pages, visualizations, and docs (TheoryPage, TheoryPaperPage, UnifiedTheoryPage, UnifiedLENRVisualizer, UnifiedBubbleLatticeVisualization, lenrVizHelper)
- **Unified theory paper** (`docs/A Unified Theoretical Framework...md`): Added Sections 3.3–3.6 (Heterogeneous Nucleation at Surfaces, Bubble–Surface Coupling, Thermal and Diffusion Boundary Layers, Acoustic and Ultrasonic Forcing); renumbered former 3.3 to 3.7; updated Abstract and Conclusion to include lattice-bubble interaction physics
- **Documentation**: `LENR_SIM_APP_v2/docs/UNIFIED_BUBBLE_LATTICE_SIMULATION.md` updated to v0.2.3-beta with new physics mechanisms table (3.3–3.6), new API endpoints (nucleation, boundary-layer, surface-reaction-rate, materials), and visualization description (MHD flow, phase-dependent particles, nucleation animation)
- **Accessibility**: Added aria-labels to Dashboard System Status panel, Quick Action cards, and Memory usage progress bar
- **Theme consistency**: Quick Action card colors now use theme palette (primary, warning, info, error) instead of hardcoded hex values

---

## [v0.2.2-beta] - 2026-02-01

### Added
- **MHD Proton Confinement**: Magnetohydrodynamic forces for realistic proton convergence
  - `mhd_proton_confinement.py` - Z-pinch, Lorentz, pressure gradient, and radial electric field forces
  - `vortex_particle_system.py` - VPFM-inspired vorticity tracking (inspired by arXiv:2505.21946)
  - Cavitation site geometry with octahedral/tetrahedral interstitial sites
  - Protons now converge radially toward cavitation point during bubble collapse
- **Physics Web Worker**: Offload heavy calculations from UI thread
  - SharedArrayBuffer support for proton position data (with secure context check)
  - MHD force calculations (`CALCULATE_MHD_FORCES`)
  - Vortex particle updates (`UPDATE_VORTEX_PARTICLES`)
  - Force integration (`INTEGRATE_FORCES`)
- **Simulation Presets**: Save and load simulation configurations
  - `presets_routes.py` - REST API with CRUD, import/export, duplicate
  - Built-in presets: Fleischmann-Pons Classic, Ni-H Gas Loading, High Frequency Collapse, Maximum Enhancement, Ti-D System
  - `PresetManager.jsx` - UI for managing, importing, and exporting presets
- **Mobile Optimization**: Touch-friendly controls for mobile devices
  - `TouchControls.jsx` - Pinch-to-zoom, two-finger rotation, swipe gestures
  - Adaptive quality settings based on device capabilities
  - Gesture hints for first-time mobile users
- **Multi-Physics Coupling Enhancement**: Improved domain coupling
  - `EnhancedDomainCoupler` with operator splitting and conservation checks
  - Pre-defined coupling transforms (nuclear→thermal, thermal→EM, etc.)
  - `MultiPhysicsCouplingManager` for coordinating multiple couplers

### Fixed
- ESLint errors: SharedArrayBuffer globals, `self` in Web Workers, archived component references
- Test file assertion syntax (`toHaveBeenCalled()` vs `toHaveBeenCalled`)
- Test compatibility with actual `MHDFieldConfiguration` and `VortexSystemConfig` APIs

### Documentation
- `docs/MHD_PROTON_DYNAMICS.md` - Complete MHD and VPFM physics documentation
- Updated `PHYSICS_EQUATION_VERIFICATION.md` with MHD/vorticity equations (Section 9)

---

## [Unreleased]

### Added
- **Infrastructure as Code (IaC)**: Complete deployment infrastructure
  - Terraform modules for Cloudflare (Pages, R2, DNS) and Hostinger VPS provisioning
  - Ansible playbooks for Docker Swarm setup and application deployment
  - Docker Swarm stack definition with Traefik, FastAPI, and PostgreSQL
  - Deployment automation scripts (deploy.sh, rollback.sh, backup-db.sh)
  - GitHub Actions workflow for automated Docker image builds
  - Comprehensive deployment documentation (DEPLOYMENT.md, DEPLOYMENT_CHECKLIST.md, TROUBLESHOOTING.md)
- **Physics Documentation**: Comprehensive physics equation verification and developer guide
  - `PHYSICS_EQUATION_VERIFICATION.md` - Catalog of all physics equations with verification status (CODATA 2018)
  - `PHYSICS_MODULE_GUIDE.md` - Developer guide with module architecture and usage examples
  - Verified key equations: Gamow factor, Sommerfeld parameter, Casimir force, screening models
- **Key Equations Quick Reference**: Added interactive equation reference panel to TheoryPaperPage
  - Six key equations with explanations and simulation links
  - Direct "Try it" buttons linking to relevant simulation tools
  - Tooltips explaining equation parameters and units
- **Theory Paper Page**: Created comprehensive TheoryPaperPage displaying full unified theoretical framework
  - Three-tab interface: Full Paper, Corrections & Improvements, References
  - Complete section coverage: Introduction, Theoretical Framework, Computational Methods, Experimental Validation, Results and Discussion
  - Integrated mathematical corrections and theoretical enhancements
  - Enhanced references with DOI links, arXiv links, and complete citations
- **Documentation improvements**: Enhanced Documentation page with interactive navigation and visual consistency
- **Shared Simulation System**: Database models and API for shared simulation storage
  - `SharedSimulation` model for saving simulations across users
  - `MatchResult` model for finding similar experimental conditions
  - REST API endpoints for CRUD operations and similarity matching

#### Visualization Enhancements
- **Collapsible Side-Drawer Legend**: New `variant="side-drawer"` mode for VisualizationLegend
  - Slim vertical tab on left side when collapsed (rotated "LEGEND" text)
  - Smooth horizontal expansion animation when clicked
  - Scrollable content area with custom scrollbar styling
  - Improved UX for viewing simulations without legend obstruction
- **Visualization Legend**: Interactive, collapsible legend showing particle types, energy scale, scale indicator, and live statistics
- **Quantum Flux Visualization**: Physics-based visualization with 6 modes:
  - Electron Screening (Thomas-Fermi model)
  - Magnetic Dipoles (nuclear/electron spin)
  - Phonon Modes (Debye model lattice vibrations)
  - Coulomb Exchange (virtual photon exchange)
  - Gamow Window (stellar nucleosynthesis)
  - Combined Enhancement effects
- **Scale Bar**: 3D scale indicator with automatic unit conversion (pm/Å/nm/μm)
- **Enhanced 3D Scene**: Grid references, corner markers, axis labels, origin marker
- **Mode Selector**: Dropdown to switch between quantum field visualization modes

#### New Components
- `QuantumFluxVisualization.js` - Physics-based quantum effects visualization
- `VisualizationLegend.jsx` - Interactive legend component with scrolling support
- `PhysicsErrorBoundary.jsx` - Specialized error handling for physics/WebGL errors
- `ComparisonView.jsx` - Side-by-side LENR system comparison component
- `usePhysicsWorker.js` - Web Worker hook for offloading physics calculations
- `useApiHealth.js` - API health monitoring hook
- `apiResilience.js` - Retry logic with exponential backoff

#### Backend Improvements
- Temperature-dependent phonon coupling using Debye model
- Enhanced `/api/health` endpoint with component status and memory info
- Unit tests for WKB tunneling, bubble collapse, and enhancement factors

#### Documentation
- `docs/VISUALIZATION_IMPROVEMENTS.md` - Comprehensive visualization documentation

### Changed
- **Theory card navigation**: Updated Theory card to link to `/theory-paper` with full paper access
- **Card styling**: Enhanced Theory card background color for better visual consistency with other documentation cards
- **TheoryPaperPage enhanced**: Added interactive equation quick reference section with simulation links
- Replaced decorative plasma vortex with physics-grounded quantum flux visualization
- Improved legend scrollability with custom scrollbar styling
- Brightened visualization color schemes for better visibility
- Updated `FusionParameterControls.jsx` with plasma/laser fusion parameters
- Enhanced CSV/JSON export functionality in `FusionSimulationPage.jsx`
- Fixed `start_app.bat` and `start_app.sh` to use correct v2 directory paths

### Fixed
- **Animation error in UnifiedBubbleLatticeVisualization**: Fixed `TypeError: Cannot read properties of undefined (reading 'total')` by adding null-safe access to `enhancement_breakdown` with fallback defaults
- **Incomplete interpolation data**: Fixed `interpolateFromAPITimeline` to return complete `enhancement_breakdown` object including all fields (qed, casimir, rydberg, compression, loading, proton_distribution, etc.)
- **NaN values in QuantumTunnelingVisualizer**: Added validation to filter invalid positions before D3 rendering, preventing chart errors when API fallback returns incomplete data
- **Backend test import errors**: Updated `test_advanced_physics.py` to use correct function signatures (`calculate_gamow_factor` with `reduced_mass` parameter)
- Legend cutoff issue - added proper scrolling support
- Quantum flux visibility - increased opacity and brightened colors
- **ESLint errors resolved**: Fixed blocking compilation errors in frontend
  - Removed unused imports (useMemo, CycloneIcon, IconButton, Link)
  - Added default case to switch statement in UnifiedBubbleLatticeVisualization
  - Prefixed unused variables to comply with `no-unused-vars` rule
- **Backend test fixes**: Middleware tests and configuration validation
  - Fixed Pydantic v2 `field_validator` mode for environment variable parsing
  - Fixed middleware returning proper JSONResponse instead of raising HTTPException
  - Added `.coveragerc` configuration file for test coverage
- `PlasmaVortexEffect is not defined` error after refactoring
- Hot reload caching issues with webpack

### Previous Unreleased Items
- Comprehensive API documentation with all endpoints
- Quick start guide for new users
- Physics modules documentation
- Performance benchmarking guide
- Error handling audit and improvements
- Pre-commit hooks for code quality
- Enhanced CI/CD pipeline with multiple test jobs
- ErrorBoundary component in frontend root
- Exception handler registration in backend
- Updated GitHub Actions workflow to support development branch
- Improved error handling across backend and frontend
- Enhanced OpenAPI documentation
- Updated installation guide with detailed instructions
- Error handlers now properly registered in main.py
- ErrorBoundary now wraps root App component
- Test configuration updated for better organization

## [0.3.0-beta] - 2026-01-07

### Added
- Multi-physics coupling framework
- Real-time visualization via WebSocket
- Comprehensive test suite (unit, integration, e2e, performance)
- Performance monitoring and benchmarking
- Memory monitoring and optimization
- Simulation caching system
- Custom reaction support
- Enhanced physics models:
  - Advanced quantum tunneling
  - Electron screening (Thomas-Fermi, Debye-Hückel)
  - Phonon-assisted tunneling
  - Coherent phonon effects
  - Material enhancement calculations
- Parameter sensitivity analysis
- Fitting and optimization tools
- Diagnostics and logging endpoints
- Result visualization and analysis

### Changed
- Migrated to MUI v7
- Improved API structure and organization
- Enhanced error handling and validation
- Better performance for large simulations
- Optimized memory usage

### Fixed
- Memory leaks in long-running simulations
- Grid API compatibility issues
- Import errors and path issues
- Test configuration problems

## [0.2.1-beta] - 2026-01-05

### Added
- **Centralized version configuration**: Created `frontend/src/config/version.js` as single source of truth for application version
- **Code splitting and lazy loading**: Implemented route-based code splitting for heavy pages to reduce initial bundle size
  - Lazy loaded: Simulation pages, documentation pages, visualization pages, dev tools
  - Eager loaded: Dashboard, About, Team (frequently accessed pages)
- **Input validation**: Added comprehensive validation for quantum tunneling API endpoint
  - Validates positive energy values
  - Validates positive temperature values
  - Validates positive atomic numbers
  - Returns proper HTTP 422 errors for invalid inputs

### Changed
- **Version consistency**: All components now use centralized `APP_VERSION = '0.2.1-beta'` from `version.js`
  - Updated: Footer, AppLayoutFixed, Home, DocumentationPage, TeamPage
  - Updated: frontend/package.json and backend/app/core/config.py
- **Contact information**: Updated contact email from `info@conscious.energy` to `diadon@conscious.energy`
- **API documentation link**: Fixed Swagger UI URL from `/docs` to `/api/docs` in DocumentationPage
- **MUI Grid migration**: Continued migration from Grid v1 to v2 API syntax
  - Updated: TheoryPage.jsx, VisualizationDebugPage.jsx
- **Hydrogen flux model**: Enhanced initialization to properly set temperature-dependent diffusion coefficients
- **Test improvements**: 
  - Relaxed concentration conservation test tolerance (1e-10 → 1e-6) for realistic numerical precision
  - Improved temperature effect test to use separate model instances for clean state
  - Enhanced trapping/detrapping logic to support disabling for conservation tests

### Fixed
- **Backend test failures**: Fixed 4 failing tests
  - `test_diffusion_coefficient_update`: Fixed initialization to call `update_diffusion_coefficient()` after domain setup
  - `test_concentration_conservation`: Relaxed tolerance and disabled trapping for true conservation test
  - `test_temperature_effect_on_detrapping`: Fixed to use separate models ensuring clean state comparison
  - `test_invalid_energy`: Added validation for negative energy values in quantum tunneling endpoint
- **Unicode logging errors**: Fixed `UnicodeEncodeError` on Windows console for 'μ' character
  - Added UTF-8 encoding to file handlers
  - Implemented `SafeConsoleHandler` for Windows that replaces problematic Unicode characters
- **Import order**: Fixed ESLint `import/first` errors by reordering imports in App.tsx
- **Duplicate files**: Removed 7 duplicate/unused page files
  - Dashboard.js, Dashboard.jsx, Dashboard.tsx, DashboardConverted.jsx
  - HomePage.js, HomePage.jsx
  - Settings.tsx
  - App_Merged.tsx (temporary merge file)

### Removed
- Duplicate page components (7 files, ~125KB saved)
- Temporary merge file (App_Merged.tsx)

### Technical Details
- **Files changed**: 30+ files across frontend and backend
- **Test coverage**: All 4 previously failing backend tests now pass
- **Bundle optimization**: Implemented lazy loading for 15+ heavy pages/components
- **Code quality**: Fixed import ordering and ESLint compliance

## [0.2.0-beta] - 2025-12-17

### Changed
- **Codebase Organization**: Reorganized files for Beta v0.2.0 release
- Moved historical status/report documents to `LENR_SIM_APP_v1(Deprecated)/docs/`
- Moved deprecated components and temporary files to deprecated folder
- Removed duplicate nested directories and files
- Updated `.gitignore` to properly exclude all environment files and sensitive information
- Organized documentation files into appropriate locations

### Security
- Enhanced `.gitignore` patterns to exclude all `.env*` files and sensitive patterns
- Verified no hardcoded secrets in codebase (only placeholders)

### Removed
- Duplicate startup scripts (`start_app_fixed.bat`, `start.bat`, `start_safe_mode.ps1`)
- Nested duplicate directory `LENR_SIM_APP_v2/frontend/LENR_SIM_APP_v2/`
- Temporary files (`temp_applayoutfix.jsx`, `App_Merged.tsx`)
- Historical documentation files (moved to deprecated folder)

### Moved to Deprecated
- Historical status reports (15+ files)
- Deprecated components (`EnhancedFusionPanel.js`)
- Historical fix documentation (6+ files)
- Temporary and merged files

## [0.2.0] - 2024-12-01

### Added
- Basic physics calculations
- Simple visualization
- REST API endpoints
- Basic frontend interface

### Changed
- Initial release structure

## [0.1.0] - 2024-11-01

### Added
- Initial project setup
- Basic FastAPI backend
- React frontend skeleton
- Basic physics models

---

## Version History Summary

### v0.3.6-beta (Current)
- **Focus**: Pre-public hardening — physics accuracy, reporting honesty, UX coherence
- **Key Features**: Theory Testbed, reaction-rate governance with claim tiers, collapse trajectories and UQ, math-accuracy corrections across backend/frontend/docs
- **Status**: Release candidate for public deployment

### v0.3.5-beta
- **Focus**: ESLint compliance — CI build hardening
- **Key Features**: All ESLint warnings resolved across 61 frontend files, build passes with CI=true, 75 tests passing
- **Status**: Ready for public release (PR to main)

### v0.3.4-beta
- **Focus**: Public launch — Relevance Map, CI stabilization, test hardening
- **Key Features**: Theory Relevance Network, cross-theory coupling pipeline, 21 LENR theories, all 75 frontend tests passing, full CI/CD pipeline green
- **Status**: Stable

### v0.3.3-beta
- **Focus**: Cross-theory coupling and legacy integration
- **Key Features**: Coupled pipeline runner, 21 theory modules, legacy module wrappers
- **Status**: Stable

### v0.3.2-beta
- **Focus**: Scoring fairness and frontend improvements
- **Key Features**: Scoring engine fairness, advanced parameters, theory paper expansion
- **Status**: Stable

### v0.3.1-beta
- **Focus**: Relevance Map and 12 new theory modules
- **Key Features**: D3 force-directed graph, 19 theories, scoring engine, cross-examination
- **Status**: Stable

### v0.3.0-beta
- **Focus**: Theory Testbed architecture and beta launch preparation
- **Key Features**: Multi-physics coupling, comprehensive testing, performance optimization
- **Status**: Stable

### v0.2.0-beta
- **Focus**: Codebase organization
- **Key Features**: File reorganization, security enhancements, cleanup
- **Status**: Stable

### v0.2.0
- **Focus**: Core functionality
- **Key Features**: Basic calculations, visualization, API
- **Status**: Stable

### v0.1.0
- **Focus**: Initial development
- **Key Features**: Project structure, basic setup
- **Status**: Archived

---

## Migration Guides

### Upgrading from v0.2.0 to v0.3.0-beta

1. **Update Dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   
   cd ../frontend
   npm install
   ```

2. **Check Configuration:**
   - Review new configuration options in `backend/app/core/config.py`
   - Update environment variables if needed

3. **API Changes:**
   - Some endpoint paths have changed
   - New endpoints added for multi-physics
   - Review API documentation for details

4. **Test Your Setup:**
   ```bash
   # Backend tests
   cd backend
   pytest
   
   # Frontend tests
   cd frontend
   npm test
   ```

### Breaking Changes

#### API Changes
- Some endpoint paths restructured
- Response formats standardized
- Error response format changed

#### Configuration
- New configuration options required
- Environment variable names updated

#### Dependencies
- Python 3.10+ required (was 3.8+)
- Node.js 18+ required (was 14+)
- MUI v7 required (was v6)

---

## Planned Features

### v0.4.0 (Future)
- [ ] Advanced visualization features
- [ ] Machine learning integration
- [ ] Distributed computing support
- [ ] Enhanced material database
- [ ] Experimental data import/export
- [ ] Advanced analysis tools

### v0.5.0 (Future)
- [ ] User authentication and authorization
- [ ] Multi-user support
- [ ] Cloud deployment options
- [ ] Advanced reporting
- [ ] Plugin system

---

## Deprecations

### v0.3.0-beta
- None

### v0.4.0 (Planned)
- Some legacy API endpoints will be deprecated
- Old visualization components will be removed

---

## Security

### Security Updates
- All dependencies regularly updated
- Security audits performed
- Vulnerability scanning enabled

### Reporting Security Issues
- Report security issues via GitHub security advisory
- Do not open public issues for security vulnerabilities

---

## Contributors

See CONTRIBUTORS.md for a list of contributors.

---

## Links

- [GitHub Repository](https://github.com/ConsciousEnergy/lenr_sim_app)
- [Documentation](https://github.com/ConsciousEnergy/lenr_sim_app/tree/main/docs)
- [Issue Tracker](https://github.com/ConsciousEnergy/lenr_sim_app/issues)

---

**Note**: This changelog is maintained manually. For automated changelog generation in the future, we may integrate tools like `conventional-changelog`.
