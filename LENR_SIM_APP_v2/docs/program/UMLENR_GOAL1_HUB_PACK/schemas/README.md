# Shared schemas (hub ownership)

## Rules

1. **Hub publishes** stable, versioned schema IDs used across products.
2. **Children consume** schemas; they may propose additive changes via hub PRs.
3. **Breaking changes** require a new major schema id (no silent breaks).
4. **Private DAQ** may extend with private fields; public exports must strip them.
5. LENR-Sim’s `lenr-run-export-v1` envelope remains defined in `lenr_sim_app`;
   the hub **registers** the id and links to the canonical doc/tests.

## Initial registry (Goal 1 stubs)

| Schema id | Owner repo | Status | Notes |
|-----------|------------|--------|-------|
| `lenr-run-export-v1` | `lenr_sim_app` | live | Simulation run export envelope |
| `umlenr-release-manifest-v1` | `UMLENR` (this hub) | stub | See `../release/manifest.example.yml` |
| `lenr-ara-daq-sample-v1` | LENR-ARA (private) | planned | Public fields only in hub later |

## How to add a schema

1. Open a hub PR adding a row here + a `schemas/<id>.md` (or JSON Schema file).
2. Link the child-repo contract tests that lock the shape.
3. Bump the hub pack `updated` date in `registries/repos.yml` if repos change.
