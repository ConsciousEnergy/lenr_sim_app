# ADR: In-app UMLENR benchmark pack + server export wiring

## Context

Unified Theory “Export JSON” previously built a client-only object labeled
`schema_version: lenr-run-export-v1` without calling `POST /api/unified/export`,
so citations, seeds, and claim tiers drifted from the contract tests. Campaign
pack UI listed manifests but offered no zip download. Collaborators needed an
honesty-gated P1–P6 pack aligned with the UMLENR export standard draft.

## Decision

1. Wire Unified Theory JSON export to **`POST /api/unified/export`** behind a
   mandatory honesty modal.
2. Add **`umlenr-benchmark-pack-v1`** zip via
   `GET /api/benchmark-packs/{pack_id}/download` with PROVENANCE inventory and
   explicit unavailable stubs.
3. Add campaign pack zip via
   `GET /api/docs/campaign-packs/{pack_id}/download` for committed
   `lenr-reviewer-pack-v1` directories.
4. Keep `lenr-run-export-v1` as the atomic run contract; pack wraps it additively.

## Consequences

- SPA exports match backend contract tests when online.
- Pack downloads cannot claim lab proof or close EQ-OPEN.
- Full live P1–P6 physics dumps remain optional; in-app v1 ships descriptors +
  one export envelope + unavailable stubs (honest partial statuses).
