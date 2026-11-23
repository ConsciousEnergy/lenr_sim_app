# Later goals (locked — not cutover gates)

These directions are intentional for the UMLENR program. They do **not** block
Swarm/share cutover, Goal 1 hub docs baseline, or sim release trains.

## Ladder

1. **Goal 1 hub + sim train** — docs-first UMLENR hub; sim research preview continues on its own repo.
2. **Operator TUI** — near-term optional D-Force (`d4s`) for Swarm/Compose browsing; **later** adopt [Purple](https://github.com/erickochen/purple) as the program operator workstation (SSH fleet, containers over SSH, MCP for agents). Purple is optional and **not** a cutover dependency. Trust rules: no CI Docker socket; DAQ secrets out of MCP write mode by default.
3. **LENR-ARA ↔ Simulation Application** — product integration (e.g. Research Mode / shared `lenr-run-export-v1` contracts) after the sim train is stable. Private ARA may call public Sim APIs; no reverse DAQ credential flow onto Sim hosts. Aligns with science P2 “Research Mode + LENR-ARA” (post-stabilization), not Goal 1.
4. **DAQ sample ingestion** — publish public fields for planned schema `lenr-ara-daq-sample-v1` on the hub; Sim comparative overlays consume **sanitized** samples only. DAQ hosts remain a separate trust plane.

## Explicit non-goals for these items

- Replacing gated cutover scripts with TUI actions
- Co-tenanting DAQ with `lenr-ci` or the public Sim DB
- Merging private ARA/DAQ trees into public UMLENR before disclosure gates
- Closing `EQ-OPEN-*` via hub or operator tooling

## See also

- [`SCOPE_AND_MATURITY.md`](SCOPE_AND_MATURITY.md)
- [`ENGINEERING_PRACTICES.md`](ENGINEERING_PRACTICES.md)
- Sim ops TUI today: `../../v0.3.8-beta/D4S_DFORCE_OPERATOR.md`
