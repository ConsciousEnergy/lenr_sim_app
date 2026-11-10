# Bug triage — v0.3.7-beta

Classes relevant to honesty, physics UX, and beta operations. Not a full
issue tracker — seed for Milestone issues.

| id | class | summary | severity | status | next |
|----|-------|---------|----------|--------|------|
| BUG-BF-DUAL-FETCH | dual fetch | `BubbleFusionPage` and `BubbleFusionVisualizer` each POST `/api/physics/bubble-fusion`; one can succeed while the other shows schematic fallback | high (honesty) | fixed (Phase A) | Page owns single POST; visualizer consumes `enginePayload` / `provenance` props |
| BUG-BF-FALLBACK-COPY | honesty | Footer may still advertise WKB/RP while showing schematic N/A pressure/velocity | medium | fixed (Phase A) | Footer + alert driven by `provenance` (`physics_engine` vs `schematic_fallback`) |
| BUG-ANALYTICS-403 | analytics honesty | Save-to-Analytics without write token must surface 403, not success toast / silent local-only | medium | fixed (v037-bf-ui-honesty) | 403/401 throw + warning; offline local_only returns warning, not “saved to analytics” |
| BUG-AUTO-PERSIST | persist coupling | `LENR_AUTO_PERSIST=1` can write without SPA token; public beta relies on flag=0 | high (ops) | mitigated by default | Keep documented; never flip on public VPS casually |
| BUG-RP-MACH-DOMAIN | physics domain | Default Rayleigh–Plesset may run outside valid Mach band; KM underused | medium | mitigated (v0.3.8 S1) | BF + Unified auto-select KM when Mach≥0.3; legacy/RP remain overrides |
| BUG-EMPTY-ANALYTICS-COPY | UX | Empty History copy can imply visitors grow shared SQL | low | fixed (v037-bf-ui-honesty) | Empty-state copy states public beta does not auto-persist visitor runs |
| BUG-LEAN-MISREAD | epistemic | Visitors may read Lean “PROVED” as nature proof | medium | fixed (v037-bf-ui-honesty) | EngineMaturityBadge tooltip: formal Lean ≠ laboratory/nature proof |

## Related docs

- `docs/v0.3.6-beta/MASTER_PROGRESS_AND_KNOWN_ISSUES.md`
- `BUG_TRIAGE` follow-ups belong in GitHub Milestone `v0.3.7-beta` when created

## Literature cite note (2026-11-10)

Pyyhtiä et al. 2026 (`pyyhtia2026`, DOI 10.1016/j.jelechem.2026.120104) is cited beside Taleyarkhan / SPAWAR CR-39 peers as electrolytic cavitation / detector-confounder evidence. Does not close `EQ-OPEN-RAD-01` or reclassify Bubble Fusion nuclear claims.
