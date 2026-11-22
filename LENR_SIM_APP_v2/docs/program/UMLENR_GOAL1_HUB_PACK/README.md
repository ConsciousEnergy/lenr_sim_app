# UMLENR Goal 1 — docs-first program hub pack

**Status:** portable scaffold for a PR against `{{GITHUB_OWNER}}/UMLENR` `main`  
**Intent:** make the public UMLENR repo the **encompassing program hub** (shared
docs, schemas, registries, release manifests). The LENR Simulation Application
is **one pillar** among Sim, LENR-ARA, DAQ, and later operator tooling — not the
whole program. Sim remains the **reference implementation** for Swarm / Ansible
/ Traefik / Terraform / Cloudflare runbooks.

This pack lives in `lenr_sim_app` so agents and operators can review it before
opening the UMLENR PR. The cloud-agent GitHub token for this workspace has
**read-only** access to UMLENR (cannot fork/push). Open the hub PR from an
account with write access (see [`HUB_STAGING_RUNBOOK.md`](HUB_STAGING_RUNBOOK.md)).

---

## Program goal (north star)

| Track | Near-term | Later |
|-------|-----------|-------|
| **UMLENR hub** | **In Development** — docs-first README + Goal 1 pack; [Project 6](https://github.com/users/{{GITHUB_OWNER}}/projects/6) | Registries + manifests consumed by children |
| **LENR-Sim** (`lenr_sim_app`) | Public research preview **v0.4.0-beta** (one pillar) | Deeper ARA coupling |
| **LENR-ARA** | **Coming soon** (private) | Connect to Sim; agentic refresh |
| **DAQ** | **Coming soon** — separate trust plane | `lenr-ara-daq-sample-v1` sanitized samples |
| **Operator TUI** | Optional D-Force (`d4s`) | [Purple](https://github.com/erickochen/purple) (not a cutover gate) |
| **Project Proteus** | Refresh after hub baseline | Align release manifests |
| **Program site** | Apex stays WordPress.com (phase 1) | Headless Astro on Pages |
| **DNS** | Phased move to Cloudflare | Apex last; `api.` DNS-only |

---

## How to open the UMLENR PR (human operator)

See [`HUB_STAGING_RUNBOOK.md`](HUB_STAGING_RUNBOOK.md) and
[`drafts/APPLY_TO_UMLENR.md`](drafts/APPLY_TO_UMLENR.md). Soft-archive first,
then stage docs-first `main` with the **program hub** README (not a renamed sim
README).

Suggested PR title: `docs(program): Goal 1 docs-first program hub baseline`

Suggested Project board columns: `Backlog` → `Ready` → `In progress` → `Blocked` → `Done`

---

## Pack contents

| Path | Purpose |
|------|---------|
| [`PROGRAM_CHARTER.md`](PROGRAM_CHARTER.md) | Umbrella scope, child repos, non-goals |
| [`SCOPE_AND_MATURITY.md`](SCOPE_AND_MATURITY.md) | Three-repo matrix; In Development / Coming soon |
| [`LATER_GOALS.md`](LATER_GOALS.md) | Purple / ARA↔Sim / DAQ ladder (not cutover gates) |
| [`ENGINEERING_PRACTICES.md`](ENGINEERING_PRACTICES.md) | Program-wide practices; GPL-3.0 |
| [`HUB_STAGING_RUNBOOK.md`](HUB_STAGING_RUNBOOK.md) | Soft-archive + hub stage steps |
| [`PROJECT_6_SEED.md`](PROJECT_6_SEED.md) | Paste-ready Project 6 issues |
| [`INFRA_ALIGNMENT.md`](INFRA_ALIGNMENT.md) | Pointers to LENR-Sim Swarm/CF runbooks (no fork) |
| [`TRUST_PLANES.md`](TRUST_PLANES.md) | CI ≠ deploy ≠ DAQ security model |
| [`DNS_PHASES.md`](DNS_PHASES.md) | Cloudflare migration phases |
| [`registries/repos.yml`](registries/repos.yml) | Child-repo registry |
| [`schemas/README.md`](schemas/README.md) | Shared schema ownership rules |
| [`release/manifest.example.yml`](release/manifest.example.yml) | Release manifest stub |
| [`GITHUB_PROJECT.md`](GITHUB_PROJECT.md) | Goal 1 tracking checklist |
| [`drafts/UMLENR_README.md`](drafts/UMLENR_README.md) | Program-hub README draft |
| [`drafts/APPLY_TO_UMLENR.md`](drafts/APPLY_TO_UMLENR.md) | Human apply + placeholder substitution |

---

## Relationship to LENR-Sim docs

Do **not** duplicate long runbooks here. Link:

- Topology learning: `lenr_sim_app` → `LENR_SIM_APP_v2/docs/v0.3.8-beta/TWO_KVM2_SWARM_TOPOLOGY.md`
- Hands-on lab: `…/SWARM_OPERATOR_LAB.md`
- Unlock checklist: `…/FULL_STACK_BUILD_UNLOCK.md`
- Public cutover: `…/docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`
