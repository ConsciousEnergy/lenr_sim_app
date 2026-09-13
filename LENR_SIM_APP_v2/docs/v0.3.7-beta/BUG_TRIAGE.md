# Bug triage — v0.3.7-beta

Classes relevant to honesty, physics UX, and beta operations. Not a full
issue tracker — seed for Milestone issues.

| id | class | summary | severity | status | next |
|----|-------|---------|----------|--------|------|
| BUG-BF-DUAL-FETCH | dual fetch | `BubbleFusionPage` and `BubbleFusionVisualizer` each POST `/api/physics/bubble-fusion`; one can succeed while the other shows schematic fallback | high (honesty) | open | Unify under page-owned fetch (deferred Phase A) |
| BUG-BF-FALLBACK-COPY | honesty | Footer may still advertise WKB/RP while showing schematic N/A pressure/velocity | medium | open | Drive copy from provenance flag |
| BUG-ANALYTICS-403 | analytics honesty | Save-to-Analytics without write token must surface 403, not success toast / silent local-only | medium | partially fixed | Audit remaining toast paths |
| BUG-AUTO-PERSIST | persist coupling | `LENR_AUTO_PERSIST=1` can write without SPA token; public beta relies on flag=0 | high (ops) | mitigated by default | Keep documented; never flip on public VPS casually |
| BUG-RP-MACH-DOMAIN | physics domain | Default Rayleigh–Plesset may run outside valid Mach band; KM opt-in underused | medium | open | Deferred ENG-RP-KM-01 |
| BUG-EMPTY-ANALYTICS-COPY | UX | Empty History copy can imply visitors grow shared SQL | low | open | Align with hydrate honesty callout |
| BUG-LEAN-MISREAD | epistemic | Visitors may read Lean “PROVED” as nature proof | medium | open | Badge + About copy (this train) |

## Related docs

- `docs/v0.3.6-beta/MASTER_PROGRESS_AND_KNOWN_ISSUES.md`
- `BUG_TRIAGE` follow-ups belong in GitHub Milestone `v0.3.7-beta` when created
