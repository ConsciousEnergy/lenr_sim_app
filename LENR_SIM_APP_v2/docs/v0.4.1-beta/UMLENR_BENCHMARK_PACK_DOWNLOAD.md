# UMLENR benchmark pack download (v0.4.1-beta)

**Status:** Live on tip-`dev` SPA + API. Aligns with Context draft
`umlenr-export-standard-v1` (additive; does not break `lenr-run-export-v1`).

## Hard locks

- `lenr_proved: false`
- All five `EQ-OPEN-*` stay **OPEN**
- Simulation model output ≠ laboratory proof
- Null / explicit `unavailable` stubs beat fabrication (Bao 2023, Kasagi 2002 raw)

## Surfaces

| Surface | Endpoint / UI | Schema |
|---------|---------------|--------|
| Atomic run export | `POST /api/unified/export` (Unified Theory **JSON** button) | `lenr-run-export-v1` |
| P1–P6 benchmark pack | `GET /api/benchmark-packs/umlenr-p1-p6-v1/download` | `umlenr-benchmark-pack-v1` |
| Campaign reviewer packs | `GET /api/docs/campaign-packs/{pack_id}/download` | `lenr-reviewer-pack-v1` zip |
| Honesty gate | `ExportHonestyModal` before every pack/export download | UI only |

## Pack layout (`umlenr-benchmark-pack-v1`)

```
umlenr-p1-p6-v1/
  PACK.json
  PROVENANCE.json          # umlenr-benchmark-pack-provenance-v1
  README.md
  INVENTORY-P1-P6.md
  json/
    lenr-run-export-v1_default.json
    unavailable_*.json
  priority-slices/
    P1_…P6_*_descriptor.json
```

Atomic runs remain `lenr-run-export-v1`. The pack **wraps** inventory + stubs +
one export envelope; it does not replace `/export`.

## UX

1. Unified Theory → **JSON** opens honesty modal → `POST /api/unified/export`
   (server envelope with citations / seed / claim tiers).
2. Unified Theory → **P1–P6 benchmark pack** or Docs → reviewer-packets index →
   honesty modal → zip download.
3. Campaign pack rows expose **Zip** with the same honesty modal.

## Out of scope (v1)

- Proteus push webhooks
- LENR-ARA private DAQ (`lenr-ara-daq-sample-v1` stays unavailable stub)
- Fabricated Bao / Kasagi 2002 time series
