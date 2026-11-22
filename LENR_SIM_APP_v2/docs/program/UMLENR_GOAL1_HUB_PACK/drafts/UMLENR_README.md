<!--
  Apply before publishing to UMLENR (see APPLY_TO_UMLENR.md):
    {{GITHUB_OWNER}}  -> GitHub owner login
    {{PROGRAM_BRAND}} -> program brand display name (two words)
    {{PROGRAM_SITE}}  -> https:// + program apex domain
-->

<p align="center">
  <img src="https://github.com/{{GITHUB_OWNER}}/UMLENR/assets/23019934/63ef47ed-e045-4ea0-b909-aaff1a1acfd6" alt="UMLENR program mark" width="120" />
</p>

<h1 align="center">UMLENR</h1>

<p align="center">
  <strong>Utilizing Machine Learning &amp; Modeling for LENR / LANR</strong> — the public program hub for {{PROGRAM_BRAND}}’s open-science suite: agentic research tooling, the LENR Simulation Application, and (later) lab DAQ.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-In%20Development-e87722?style=flat-square" alt="Status: In Development" />
  <img src="https://img.shields.io/badge/License-GPLv3-002454?style=flat-square" alt="License GPL v3" />
  <a href="https://github.com/users/{{GITHUB_OWNER}}/projects/6"><img src="https://img.shields.io/badge/roadmap-Project%206-005490?style=flat-square" alt="Roadmap Project 6" /></a>
  <a href="{{PROGRAM_SITE}}"><img src="https://img.shields.io/badge/site-program%20home-185f97?style=flat-square" alt="Program site" /></a>
</p>

> **Epistemic honesty.** Program software produces **model output** and research tooling — not laboratory proof that LENR occurs. Scientific open obligations (`EQ-OPEN-*`) stay **OPEN** in the simulation ledgers. Do not treat UI numbers or agent summaries as experimental measurements.

**At a glance:** public program hub · **In Development** · GPL-3.0 · simulation app **v0.4.0-beta** · LENR-ARA / DAQ **Coming soon**

---

## Table of contents

- [Purpose](#purpose)
- [Program suite](#program-suite)
- [LENR Simulation Application (v0.4.0-beta)](#lenr-simulation-application-v040-beta)
- [Later goals (not cutover gates)](#later-goals-not-cutover-gates)
- [History and archive](#history-and-archive)
- [Roadmap](#roadmap)
- [Limitations](#limitations)
- [Cite this work](#cite-this-work)
- [Contribute / License](#contribute--license)

---

## Purpose

**UMLENR** is the public **umbrella hub** for the {{PROGRAM_BRAND}} program. Child products keep their own repositories and release cadences. This hub owns shared narrative, schemas, registries, and release manifests — not a dump of unfinished private application trees.

| You can… | You should not… |
|----------|-----------------|
| Learn the program scope and status | Expect private DAQ credentials or unfinished product source here |
| Follow the simulation app via its public repo and live beta | Treat hub docs as closing scientific `EQ-OPEN-*` items |
| Track later goals (Purple TUI, ARA↔Sim, DAQ data) | Assume later goals are cutover or release blockers |
| Read archived historical UMLENR materials | Confuse legacy AutoGPT / Math_Sim trees with current Sim |

**Primary audiences:** CMNS / LENR-adjacent researchers, open-source contributors, and collaborators following this multi-repo program.

---

## Program suite

| Pillar | Status | Where |
|--------|--------|--------|
| **Program hub (this repo)** | **In Development** | `{{GITHUB_OWNER}}/UMLENR` — docs, schemas, registries |
| **LENR Simulation Application** | Public · research preview **v0.4.0-beta** | `{{GITHUB_OWNER}}/lenr_sim_app` · live beta at lenr-sim-beta on the program domain |
| **LENR-ARA** (agentic lab assistant) | **Coming soon** | Private product path — not merged into this hub yet |
| **LENR-ARA DAQ software** | **Coming soon** | Separate trust plane (CI ≠ deploy ≠ runtime ≠ DAQ) |
| **Operator TUI** | Near-term: D-Force (`d4s`); **later:** [Purple](https://github.com/erickochen/purple) | Optional day-2 ops aids — **not** cutover gates |

Private application source and DAQ credentials are **not** published here until each product passes a written public-disclosure gate.

---

## LENR Simulation Application (v0.4.0-beta)

Confirmed from the simulation repository version markers (`APP_VERSION` / frontend `version` / `BUILD_VERSION`): **0.4.0-beta**.

The sim app is the most developed product in this suite today: claim-tiered physics engines, interactive 3D views, `lenr-run-export-v1` exports, and a companion theoretical framework — with explicit honesty that **model ≠ measurement**.

- **Repository:** `{{GITHUB_OWNER}}/lenr_sim_app` (public)
- **Live research preview:** `https://lenr-sim-beta.` + program apex domain
- **Template / deep README:** use the sim app root `README.md` for modules, demos, local quick start, and citation details
- **License:** GNU GPL-3.0 (same program-wide policy)

Hub docs **link** sim runbooks and contracts; they do not fork conflicting inventories into UMLENR.

---

## Later goals (not cutover gates)

These are locked program directions. They do **not** block Swarm/share cutover or this hub’s docs baseline.

1. **Purple TUI** — Adopt [erickochen/purple](https://github.com/erickochen/purple) as the later program operator workstation (SSH fleet, containers over SSH, MCP for agents). Near-term Swarm/Compose browsing may still use D-Force (`d4s`). Purple is **optional** and **not** a cutover dependency.
2. **Connect LENR-ARA ↔ Simulation Application** — Product integration (e.g. Research Mode / shared export contracts such as `lenr-run-export-v1`) after the sim train is stable. Private ARA remains private until ready.
3. **LENR-ARA DAQ data** — Ingest sanitized DAQ samples via a hub-registered schema (planned `lenr-ara-daq-sample-v1`). DAQ hosts and secrets stay on a separate trust plane — never co-tenant with CI or the public sim database.

---

## History and archive

Earlier UMLENR trees (Py Sims, `LENR_ARA_GPT`, `LENR_Math_Sim`, training datasets) are **historical research inventory**. Prefer soft-archive branches/tags (e.g. `archive/legacy-main`) over deleting history.

Conference / theory artifacts are archived as **PDF** when available (for example the unified theory PDF already in-tree). A placeholder PowerPoint stub is **not** restored when a PDF is present.

---

## Roadmap

Track program work on GitHub Project **Project 6** under the {{GITHUB_OWNER}} user projects board.

Suggested epic themes: hub staging · sim release train · LENR-ARA (Coming soon) · DAQ trust plane · Purple evaluation · public-disclosure checklist.

---

## Limitations

- Hub status is **In Development** — schemas and registries grow over time.
- LENR-ARA and DAQ remain **Coming soon**; do not expect private clone URLs or DAQ data on this public README.
- Scientific claim maturity lives in the sim ledgers (`PHYSICS_MATURITY_LEDGER`, `PROOF_MATRIX`, `GOALS`) — this hub does not close `EQ-OPEN-*`.
- Later goals (Purple, ARA↔Sim, DAQ) are **not** infrastructure cutover gates.

---

## Cite this work

If you use the **simulation application**, cite that software version and the unified theory companion (see the sim app README “Cite this work” section).

**Program hub:** {{PROGRAM_BRAND}}. *UMLENR* — public program hub (In Development). Repository: `{{GITHUB_OWNER}}/UMLENR`.

```bibtex
@software{umlenr_hub,
  author       = {{{PROGRAM_BRAND}}},
  title        = {UMLENR — program hub},
  year         = {2026},
  howpublished = {GitHub repository — \texttt{{{GITHUB_OWNER}}/UMLENR}},
  note         = {In Development; umbrella docs/schemas for the LENR suite.}
}
@software{lenr_sim_app_040,
  author       = {{{PROGRAM_BRAND}}},
  title        = {LENR Simulation Application},
  year         = {2026},
  version      = {0.4.0-beta},
  howpublished = {GitHub repository — \texttt{{{GITHUB_OWNER}}/lenr\_sim\_app}},
  note         = {Research preview; model output is not laboratory data.}
}
```

---

## Contribute / License

- **Program / hub docs:** PRs against this repository’s default branch once the docs-first hub lands.
- **Simulation application:** contributions on **`dev`** by default — see the sim app `CONTRIBUTING.md`.
- **Feedback:** program maintainer email on {{PROGRAM_SITE}}

**License:** [GNU GPL-3.0](LICENSE) across the program suite (hub, simulation application, and future public LENR-ARA surfaces). Third-party dependencies keep their own licenses.

**Site:** {{PROGRAM_SITE}}
