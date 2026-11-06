# LENR Simulation Application

**Research-preview software for modeling and visualizing Low-Energy Nuclear Reaction (LENR) hypotheses** — with claim-tiered physics engines, interactive 3D views, and a companion theoretical framework. Built by **Diadon / Conscious Energy**.

[![Live beta](https://img.shields.io/badge/live%20beta-0.3.9--beta-brightgreen.svg)](https://lenr-sim-beta.conscious.energy)
[![Markers](https://img.shields.io/badge/markers-0.3.9--beta-blue.svg)](CHANGELOG.md)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-public%20beta-orange.svg)](https://lenr-sim-beta.conscious.energy)

> **Epistemic honesty.** Every number in this app is **model output**, not a laboratory measurement. Lean formalization checks *mathematical consistency* only — it does **not** prove that LENR occurs. `lenr_proved` stays `false`; the five `EQ-OPEN-*` obligations remain **OPEN**. Do not treat UI results as experimental proof.

**Try the public beta (no install):** [https://lenr-sim-beta.conscious.energy](https://lenr-sim-beta.conscious.energy) · version **0.3.9-beta** · API docs via the same origin `/api/docs`. Optional SPA mirror: [https://app.conscious.energy](https://app.conscious.energy). Marketing site [conscious.energy](https://conscious.energy) is WordPress — not the sim.

Operators and agents: current live/ops truth lives in [`AGENTS.md`](AGENTS.md) and the versioned ops docs under `LENR_SIM_APP_v2/docs/` — not in this README.

### Docs map (public vs team)

| Audience | Start here |
|----------|------------|
| Invited beta visitors | This README (walkthrough below) |
| Public / contributors | This README, [`CONTRIBUTING.md`](CONTRIBUTING.md), [`LENR_SIM_APP_v2/README.md`](LENR_SIM_APP_v2/README.md) |
| Agents / operators | [`AGENTS.md`](AGENTS.md) |
| Branching / releases | [`.github/BRANCHING.md`](.github/BRANCHING.md) |
| Academic parallel train | [`LENR_SIM_APP_v2/docs/v0.3.7-beta/`](LENR_SIM_APP_v2/docs/v0.3.7-beta/) (`EQ-OPEN-*` stay OPEN) |

---

## What this application is for

LENR_SIM_APP helps researchers, reviewers, and curious engineers **explore contested LENR mechanisms under explicit claim tiers** — without conflating simulation with experiment.

| You can… | You cannot (by design)… |
|----------|-------------------------|
| Run unified bubble–lattice, quantum tunneling, and bubble-fusion *models* | Treat UI numbers as lab measurements |
| Compare theory modules with provenance and maturity badges | Close `EQ-OPEN-*` or claim `lenr_proved` / `LENR_PROVED` |
| Export runs (`lenr-run-export-v1`) for review packs | Get a deployed FEM / COMSOL stack on the public beta |
| Read the in-app theory paper and methods honesty | Assume speculative mechanisms are validated |

**Primary audiences:** condensed-matter / nuclear-adjacent researchers, CMNS reviewers, invited public-beta visitors, and contributors who need a reproducible software companion to the [Unified Theory Paper](docs/A_Unified_Theoretical_Framework_for_LENR.md).

---

## Honesty invariants (do not relax)

These stay true on every surface (UI, API, docs, Lean):

1. **`lenr_proved` is `false`** — the software never asserts that LENR is experimentally proved.
2. **`EQ-OPEN-*` stay OPEN** — open equation / proof obligations are not closed by this release train.
3. **Model ≠ measurement** — every plotted or exported number is simulation / model output.
4. **Lean = consistency, not nature** — formalization under [`formalization/`](formalization/) checks math; it does not prove physical occurrence.
5. **Claim tiers are first-class** — Beta / Approximate / Speculative / Aspirational badges mean what they say; aspirational FEM is not on the public beta.

Science track sources of truth: [`PHYSICS_MATURITY_LEDGER.md`](LENR_SIM_APP_v2/docs/v0.3.7-beta/PHYSICS_MATURITY_LEDGER.md), [`PROOF_MATRIX.md`](LENR_SIM_APP_v2/docs/v0.3.7-beta/PROOF_MATRIX.md), [`GOALS.md`](LENR_SIM_APP_v2/docs/v0.3.7-beta/GOALS.md).

---

## Try the live beta (signed-out walkthrough)

Open [https://lenr-sim-beta.conscious.energy](https://lenr-sim-beta.conscious.energy) in a modern browser (no account required for the public preview).

1. **Home** — confirm the beta / research-preview banner and version chip (**0.3.9-beta**). Feedback should point to email (`diadon@conscious.energy`), not a broken Issues CTA.
2. **Unified Theory** — open Unified Theory (or Run from the dashboard). Leave defaults; press **Run** once. When it finishes, open the **3D Visualization** tab and confirm the canvas mounts (no “Visualization Error”).
3. **Theory Paper** — skim the in-app Theory Paper and Theory Methods pages for honesty / known-limitations language. Open questions stay open.
4. **Optional** — try Bubble Fusion or Quantum Tunneling from the home dashboard; export JSON/CSV once if you want a reproducible review pack.
5. **Feedback** — email `diadon@conscious.energy` with page URL, browser/OS, app version, settings (if not default), what you expected, and what you saw.

Participation is not an endorsement. Do not quote results as laboratory measurements.

---

## Screenshots (public beta UI)

<p align="center">
  <img src="docs/assets/readme/01-home.png" alt="Dashboard — LENR Simulation Platform home" width="800" />
</p>

<p align="center"><em>Dashboard — quick entry to Unified Theory, Quantum Tunneling, and Bubble Fusion</em></p>

<p align="center">
  <img src="docs/assets/readme/02-unified-theory.png" alt="Unified Bubble-Lattice LENR Simulation" width="800" />
</p>

<p align="center"><em>Unified Theory — material/electrolyte config, parameters, and 3D lattice–bubble workspace</em></p>

<p align="center">
  <img src="docs/assets/readme/03-bubble-fusion.png" alt="Bubble Fusion / acoustic cavitation simulation" width="800" />
</p>

<p align="center"><em>Bubble Fusion — acoustic cavitation controls with engine-maturity labeling</em></p>

<p align="center">
  <img src="docs/assets/readme/04-quantum-tunneling.png" alt="Quantum Tunneling visualization" width="800" />
</p>

<p align="center"><em>Quantum Tunneling — WKB / Gamow barrier exploration</em></p>

<p align="center">
  <img src="docs/assets/readme/05-theory-paper.png" alt="In-app Unified Theory Paper view" width="800" />
</p>

<p align="center"><em>Theory Paper — curated in-app view of the unified LENR framework</em></p>

<p align="center">
  <img src="docs/assets/readme/06-theory-methods.png" alt="Theory Methods — computational honesty" width="800" />
</p>

<p align="center"><em>Theory Methods — what the public beta actually runs vs aspirational FEM</em></p>

> **Demo video.** A walkthrough video will be linked here when available (owned separately from this docs pack).

---

## Scope of the public beta

**Shipped / live on the public beta (0.3.9-beta)**

- Unified bubble–lattice simulation API (`/api/unified/*`) with claim-tiered theory pipeline
- Bubble dynamics: Rayleigh–Plesset baseline; Keller–Miksis auto-select when Mach ≥ 0.3 (approximate maturity)
- Quantum tunneling (WKB/Gamow) reference path with domain-limited screening honesty
- Engine maturity badges (Beta / Approximate / Speculative / Aspirational)
- Open-questions / working-hypothesis surfaces; export envelope `lenr-run-export-v1`
- Lean 4 + equation IR under [`formalization/`](formalization/) for consistency / non-closure lemmas
- Multi-format governance docs under [`LENR_SIM_APP_v2/docs/v0.3.7-beta/`](LENR_SIM_APP_v2/docs/v0.3.7-beta/)

**Explicitly not on the public beta (deferred / aspirational)**

- Full FEM / Poisson–Schrödinger / COMSOL-class continuum solvers
- Declaring any `EQ-OPEN-*` closed
- Energetic or “practical freedom” product claims

Adopted sensitivity bands (do not reintroduce superseded values): tunneling enhancement \(10^{3}\)–\(10^{5}\); Casimir check geometry \(\approx -1.3\,\mathrm{mN}\); Miles He-4/heat band \(24\pm4\,\mathrm{MeV}\).

---

## Project layout

| Path | Purpose |
|------|---------|
| [`LENR_SIM_APP_v2/`](LENR_SIM_APP_v2/) | Application: FastAPI backend, React/Vite frontend, infrastructure, release docs |
| [`formalization/`](formalization/) | Equation IR + Lean 4 consistency checks (not a nature proof) |
| [`docs/`](docs/) | Repository docs, Unified Theory Paper, formalization status, README screenshots |
| [`archive/status-reports/`](archive/status-reports/) | Historical status reports (provenance) |
| [`.github/`](.github/) | CI workflows, Dependabot, PR template, CODEOWNERS |

👉 **Install & run locally:** see [`LENR_SIM_APP_v2/README.md`](LENR_SIM_APP_v2/README.md)

---

## Quick start (local)

```bash
cd LENR_SIM_APP_v2
# Windows: start_app.bat
# Linux/macOS:
chmod +x start_app.sh && ./start_app.sh
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8010 (`/api/docs`)

Canonical ports: [`LENR_SIM_APP_v2/docs/v0.3.6-beta/PORT_TOPOLOGY_POLICY.md`](LENR_SIM_APP_v2/docs/v0.3.6-beta/PORT_TOPOLOGY_POLICY.md)

---

## Application architecture (high level)

```
┌─────────────────────────────────────────┐
│  React / Vite frontend (:3000)          │
│  Dashboard · Unified Theory · QT · BF   │
│  Theory Paper / Methods · Analytics     │
└──────────────────┬──────────────────────┘
                   │ REST + WebSocket
┌──────────────────┴──────────────────────┐
│  FastAPI backend (:8010)                │
│  /api/unified/* · /api/physics/*        │
│  Theory pipeline · run export           │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────┴──────────────────────┐
│  Physics engines (claim-tiered)         │
│  WKB/Gamow · bubble RP/KM · theories/*  │
│  Open questions / WH-ENP · guardrails   │
└─────────────────────────────────────────┘
         │
         ▼
  formalization/  (Lean + IR — consistency only)
```

---

## Version trains

| Branch | Markers must be | Role |
|--------|-----------------|------|
| `main` | **`0.3.9-beta`** | Live public beta release line; ship / hotfix |
| `dev` | **`0.3.9-beta`** | Integration tip; default PR base |

Four version markers must match **within** a branch:

- `LENR_SIM_APP_v2/backend/app/core/config.py` → `APP_VERSION`
- `LENR_SIM_APP_v2/frontend/package.json` → `"version"`
- `LENR_SIM_APP_v2/frontend/src/config/version.js` → `APP_VERSION`
- `LENR_SIM_APP_v2/infrastructure/docker/Dockerfile.backend` → `BUILD_VERSION`

Default PR base is **`dev`**. Promote to public with a controlled `dev` → `main` PR. Do **not** bump `main` markers except via that promote. Full policy: [`.github/BRANCHING.md`](.github/BRANCHING.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Documentation map

| Doc | Use when |
|-----|----------|
| [`AGENTS.md`](AGENTS.md) | Short current-truth map for humans and agents (ops detail) |
| [`LENR_SIM_APP_v2/README.md`](LENR_SIM_APP_v2/README.md) | Local install, features, troubleshooting |
| [`docs/A_Unified_Theoretical_Framework_for_LENR.md`](docs/A_Unified_Theoretical_Framework_for_LENR.md) | Canonical theory paper |
| [`LENR_SIM_APP_v2/docs/v0.3.7-beta/`](LENR_SIM_APP_v2/docs/v0.3.7-beta/) | Maturity ledger, proof matrix, goals |
| [`docs/FORMALIZATION/FORMAL_PROOF_STATUS.md`](docs/FORMALIZATION/FORMAL_PROOF_STATUS.md) | Lean theorem status |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) / [`.github/BRANCHING.md`](.github/BRANCHING.md) | How to contribute |
| [`SECURITY.md`](SECURITY.md) | Vulnerability reporting |

---

## Development

Branch from **`dev`** by default. Use **`main`** only for live **0.3.9-beta** ship / hotfix. See [CONTRIBUTING.md](CONTRIBUTING.md) and [`.github/BRANCHING.md`](.github/BRANCHING.md).

```bash
# Backend
cd LENR_SIM_APP_v2/backend && python -m pytest tests/ app/tests/ -o addopts="" --tb=short

# Frontend
cd LENR_SIM_APP_v2/frontend && npm ci && npm test
```

CI includes release-blocking science gates and (where configured) `lake build` over `formalization/lean`. Prefer **one topic per PR**; keep CI/ops PRs separate from academic claim edits (`EQ-OPEN-*` stay OPEN).

---

## License

**GNU GPL-3.0** — see [LICENSE](LICENSE). Free to use, study, modify, and distribute under the same terms.

## Support

1. Application README troubleshooting: [`LENR_SIM_APP_v2/README.md`](LENR_SIM_APP_v2/README.md)
2. Beta feedback: email linked from the public beta banner (`diadon@conscious.energy`)
3. Security issues: [SECURITY.md](SECURITY.md) (not public GitHub issues)

## Project status

| Item | State |
|------|-------|
| Live public beta | **0.3.9-beta** at [lenr-sim-beta.conscious.energy](https://lenr-sim-beta.conscious.energy) |
| Current app version markers | **`0.3.9-beta`** (`main` and `dev`) |
| `main` | Live release line |
| `dev` | Integration tip; default PR base |
| `lenr_proved` / `EQ-OPEN-*` | `false` / stay **OPEN** |

---

**Last updated:** 2026-11-06 · Maintainers: [CODEOWNERS](.github/CODEOWNERS)
