# LENR Simulation Application

**Research-preview software for modeling and visualizing Low-Energy Nuclear Reaction (LENR) hypotheses** — with claim-tiered physics engines, interactive 3D views, and a companion theoretical framework.

[![Version](https://img.shields.io/badge/version-0.3.7--beta-blue.svg)](CHANGELOG.md)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-public%20beta-orange.svg)](https://lenr-sim-beta.conscious.energy)

> **Epistemic honesty.** Every number in this app is **model output**, not a laboratory measurement. Lean formalization checks *mathematical consistency* only — it does **not** prove that LENR occurs. `lenr_proved` stays `false`; the five `EQ-OPEN-*` obligations remain **OPEN**.

**Public beta:** [https://lenr-sim-beta.conscious.energy](https://lenr-sim-beta.conscious.energy) (Compose + Caddy on Hostinger VPS)

### Docs map (public vs team)

| Audience | Start here |
|----------|------------|
| Public / contributors | This README, [`CONTRIBUTING.md`](CONTRIBUTING.md), [`LENR_SIM_APP_v2/README.md`](LENR_SIM_APP_v2/README.md) |
| Branching / releases | [`.github/BRANCHING.md`](.github/BRANCHING.md) |
| Operators (Compose now, Swarm later) | [`docs/v0.3.8-beta/README.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/README.md) — start with [`FULL_STACK_BUILD_UNLOCK.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/FULL_STACK_BUILD_UNLOCK.md), [`DUAL_KVM2_SWARM_READINESS.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/DUAL_KVM2_SWARM_READINESS.md), [`PR_AND_BRANCH_HYGIENE.md`](LENR_SIM_APP_v2/docs/v0.3.8-beta/PR_AND_BRANCH_HYGIENE.md) |
| Academic parallel train | [`LENR_SIM_APP_v2/docs/v0.3.7-beta/`](LENR_SIM_APP_v2/docs/v0.3.7-beta/) (`EQ-OPEN-*` stay OPEN) |

**Live share today:** Compose + Caddy on the beta VPS. Dual KVM2 (app + dedicated CI) does **not** by itself complete Swarm + Traefik + Cloudflare cutover — that stays behind `CONFIRM_SWARM_0_3_8` (staging) / `CONFIRM_SWARM_0_3_9` (production).

---

## What this application is for

LENR_SIM_APP helps researchers, reviewers, and curious engineers **explore contested LENR mechanisms under explicit claim tiers** — without conflating simulation with experiment.

| You can… | You cannot (by design)… |
|----------|-------------------------|
| Run unified bubble–lattice, quantum tunneling, and bubble-fusion *models* | Treat UI numbers as lab measurements |
| Compare theory modules with provenance and maturity badges | Close `EQ-OPEN-*` or claim `LENR_PROVED` |
| Export runs (`lenr-run-export-v1`) for review packs | Get a deployed FEM / COMSOL stack on the public beta |
| Read the in-app theory paper and methods honesty | Assume speculative mechanisms are validated |

**Primary audiences:** condensed-matter / nuclear-adjacent researchers, CMNS reviewers, and contributors who need a reproducible software companion to the [Unified Theory Paper](docs/A_Unified_Theoretical_Framework_for_LENR.md).

---

## Screenshots (v0.3.7-beta public beta)

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

## Scope of the v0.3.7-beta train

**Shipped / live on the public beta**

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
| [`LENR_SIM_APP_v2/`](LENR_SIM_APP_v2/) | Application: FastAPI backend, React/Vite frontend, VPS Compose infrastructure, release docs |
| [`formalization/`](formalization/) | Equation IR + Lean 4 consistency checks (not a nature proof) |
| [`docs/`](docs/) | Repository docs, Unified Theory Paper, formalization status, README screenshots |
| [`archive/status-reports/`](archive/status-reports/) | Historical status reports (provenance) |
| [`.github/`](.github/) | CI workflows, Dependabot, PR template, CODEOWNERS |

👉 **Install & run:** see [`LENR_SIM_APP_v2/README.md`](LENR_SIM_APP_v2/README.md)

---

## Quick start

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

## Architecture (high level)

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

## Documentation map

| Doc | Use when |
|-----|----------|
| [`LENR_SIM_APP_v2/README.md`](LENR_SIM_APP_v2/README.md) | Local install, features, troubleshooting |
| [`docs/A_Unified_Theoretical_Framework_for_LENR.md`](docs/A_Unified_Theoretical_Framework_for_LENR.md) | Canonical theory paper |
| [`LENR_SIM_APP_v2/docs/v0.3.7-beta/`](LENR_SIM_APP_v2/docs/v0.3.7-beta/) | Maturity ledger, proof matrix, goals |
| [`docs/FORMALIZATION/FORMAL_PROOF_STATUS.md`](docs/FORMALIZATION/FORMAL_PROOF_STATUS.md) | Lean theorem status |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) / [`.github/BRANCHING.md`](.github/BRANCHING.md) | How to contribute |
| [`SECURITY.md`](SECURITY.md) | Vulnerability reporting |

---

## Development

Branch from **`main`** (trunk-based; releases are `v*` tags). See [CONTRIBUTING.md](CONTRIBUTING.md).

```bash
# Backend
cd LENR_SIM_APP_v2/backend && python -m pytest tests/ app/tests/ -o addopts="" --tb=short

# Frontend
cd LENR_SIM_APP_v2/frontend && npm ci && npm test
```

CI includes release-blocking science gates and (where configured) `lake build` over `formalization/lean`.

---

## License

**GNU GPL-3.0** — see [LICENSE](LICENSE).

## Support

1. Application README troubleshooting: [`LENR_SIM_APP_v2/README.md`](LENR_SIM_APP_v2/README.md)
2. Beta feedback: email linked from the public beta banner (`diadon@conscious.energy`)
3. Security issues: [SECURITY.md](SECURITY.md) (not public GitHub issues)

## Project status

- **Current app version markers:** `0.3.7-beta`
- **Trunk:** `main`
- **Public share:** Compose + Caddy (Swarm cutover is a later train; not applied here)

---

**Last updated:** 2026-09-25 · Maintainers: [CODEOWNERS](.github/CODEOWNERS)
