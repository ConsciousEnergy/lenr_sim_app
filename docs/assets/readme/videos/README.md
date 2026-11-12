# README demo videos (Original captures)

Cloud-agent screen recordings can pick up Cursor or tooling chrome. **Do not** commit agent-captured MP4s here. Diadon records clean walkthroughs locally (1080p, muted or soft VO, no browser update UI).

## Naming convention

| File | Content (60–90s) |
|------|------------------|
| `01-home-walkthrough.mp4` | Home → first Unified Theory run → 3D tab |
| `02-unified-theory.mp4` | Unified bubble–lattice config, run, export |
| `03-quantum-tunneling.mp4` | Quantum Tunneling barrier / WKB exploration |
| `04-theory-paper-methods.mp4` | Theory Paper + Theory Methods honesty surfaces |

Optional extras:

- `00-hero-teaser.mp4` — short loop for README hero (15–20s)
- `NN-<slug>.mp4` — additional module demos; keep numeric prefix for sort order

## Technical notes

- Prefer H.264 MP4, ~8–12 Mbps, 1920×1080 or 1280×720.
- Crop all OS/browser chrome before export.
- When a file exists, wire it in the root [`README.md`](../../../../README.md) **Demo videos** section (HTML5 `<video>` + a plain download link — GitHub embed is inconsistent).
- Long-term hosting on [conscious.energy](https://conscious.energy) or GitHub Releases is fine; keep these paths as source-of-truth filenames.
