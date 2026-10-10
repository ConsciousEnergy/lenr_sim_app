# UMLENR Goal 1 — docs-first program hub pack

**Status:** portable scaffold for a PR against
[`ConsciousEnergy/UMLENR`](https://github.com/ConsciousEnergy/UMLENR) `main`  
**Intent:** make the public UMLENR repo the umbrella hub for the Conscious
Energy program (shared docs, schemas, registries, release manifests) while
LENR-Sim remains the **reference implementation** for Swarm / Ansible /
Traefik / Terraform / Cloudflare.

This pack lives in `lenr_sim_app` so agents and operators can review it before
opening the UMLENR PR. The cloud-agent GitHub token for this workspace has
**read-only** access to UMLENR (cannot fork/push). Open the hub PR from an
account with write access (copy this directory into UMLENR as `docs/program/`).

---

## Program goal (north star)

| Track | Near-term | Later |
|-------|-----------|-------|
| **UMLENR hub** | Goal 1 docs baseline PR + GitHub Project tracking | Registries + release manifests consumed by children |
| **LENR-Sim** (`lenr_sim_app`) | Compose public beta; Swarm cutover under confirm gates | Traefik `api.` + Pages `app.` |
| **LENR-ARA** (private DAQ) | Low-cost path; separate trust plane | Shared schemas from hub only |
| **Project Proteus** | Refresh after hub baseline | Align release manifests |
| **conscious.energy** | Apex stays WordPress.com (phase 1) | Headless: WP.com CMS → Astro on Cloudflare Pages |
| **DNS** | Phased move to Cloudflare | Apex last; `api.` DNS-only |

---

## How to open the UMLENR PR (human operator)

```bash
git clone https://github.com/ConsciousEnergy/UMLENR.git
cd UMLENR
git checkout -b docs/goal1-program-hub

# Copy pack contents into the umbrella repo
mkdir -p docs/program
cp -R /path/to/lenr_sim_app/LENR_SIM_APP_v2/docs/program/UMLENR_GOAL1_HUB_PACK/* \
      docs/program/

# Optional: point root README at docs/program/README.md (hub index)
git add docs/program
git commit -m "docs(program): Goal 1 docs-first hub baseline"
git push -u origin docs/goal1-program-hub
# Open PR against UMLENR main; track in GitHub Project "Conscious Energy program"
```

Suggested PR title: `docs(program): Goal 1 docs-first hub baseline`

Suggested Project board columns: `Backlog` → `In progress` → `Blocked (creds/VPS)` → `Done`

---

## Pack contents

| Path | Purpose |
|------|---------|
| [`PROGRAM_CHARTER.md`](PROGRAM_CHARTER.md) | Umbrella scope, child repos, non-goals |
| [`INFRA_ALIGNMENT.md`](INFRA_ALIGNMENT.md) | Pointers to LENR-Sim Swarm/CF runbooks (no fork) |
| [`TRUST_PLANES.md`](TRUST_PLANES.md) | CI ≠ deploy ≠ DAQ security model |
| [`DNS_PHASES.md`](DNS_PHASES.md) | Cloudflare migration phases |
| [`registries/repos.yml`](registries/repos.yml) | Child-repo registry |
| [`schemas/README.md`](schemas/README.md) | Shared schema ownership rules |
| [`release/manifest.example.yml`](release/manifest.example.yml) | Release manifest stub |
| [`GITHUB_PROJECT.md`](GITHUB_PROJECT.md) | Goal 1 tracking checklist |

---

## Relationship to LENR-Sim docs

Do **not** duplicate long runbooks here. Link:

- Topology learning: `lenr_sim_app` → `LENR_SIM_APP_v2/docs/v0.3.8-beta/TWO_KVM2_SWARM_TOPOLOGY.md`
- Hands-on lab: `…/SWARM_OPERATOR_LAB.md`
- Unlock checklist: `…/FULL_STACK_BUILD_UNLOCK.md`
- Public cutover: `…/docs/v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`
