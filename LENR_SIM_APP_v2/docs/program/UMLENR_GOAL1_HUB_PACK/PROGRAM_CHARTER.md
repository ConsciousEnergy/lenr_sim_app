# Conscious Energy program charter (Goal 1)

## Purpose

UMLENR is the public **umbrella hub** for the Conscious Energy program. Child
products keep their own repos and release cadences; the hub owns shared
narrative, schemas, registries, and release manifests.

## In scope (Goal 1)

- Docs-first baseline under `docs/program/`
- Registry of child repositories and their trust roles
- Schema ownership rules (who publishes, who consumes)
- Example release manifest format
- GitHub Project tracking for Goal 1 → public beta readiness
- Clear pointers to LENR-Sim infrastructure as the reference stack

## Out of scope (Goal 1)

- Closing scientific `EQ-OPEN-*` items (remain OPEN in LENR-Sim ledgers)
- Live Swarm cutover or Cloudflare apex cutover
- Merging private LENR-ARA DAQ into public UMLENR
- Rewriting LENR-Sim Compose share topology
- Purchasing VPS or applying Terraform from the hub repo

## Child surfaces

| Surface | Repo / home | Public? | Notes |
|---------|-------------|---------|-------|
| Program hub | `ConsciousEnergy/UMLENR` | Yes | Docs, schemas, registries |
| LENR-Sim app | `ConsciousEnergy/lenr_sim_app` | Yes | Public beta Compose → Swarm |
| LENR-ARA DAQ | Private (TBD path) | No | Separate host/secrets |
| Project Proteus | TBD under org | Mixed | Refresh after hub baseline |
| Marketing site | WordPress.com → Astro/Pages | Yes | Apex phase-1 stays WP.com |

## Decision rights

| Topic | Decides in |
|-------|------------|
| Program narrative / registries | UMLENR hub PRs |
| Swarm / Traefik / Terraform apply | `lenr_sim_app` ops + confirm strings |
| Scientific claim maturity | LENR-Sim ledger / proof matrix PRs |
| DAQ hardware & private data | LENR-ARA owners (never CI runners) |
