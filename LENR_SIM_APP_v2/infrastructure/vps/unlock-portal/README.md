# VPS unlock portal (agent runtime)

Temporary HTTP portal (trycloudflare → `:8765`) used during v0.3.8 Compose unlock.

- `GET /` — operator instructions + Hostinger API token form
- `POST /drop-hostinger-token` — writes `/opt/cursor/artifacts/HOSTINGER_API_TOKEN.txt` for `poll-and-ship.sh`
- `GET /unlock.sh`, `/enable-pw-and-keydrop.sh` — VNC paste scripts (served from runtime dir)
- `GET /live-status.json` — public share `has_auto` + `token_dropped`

Do not commit real tokens. Hostinger MCP is unavailable on Cloud Agents; prefer API token drop or VNC keydrop.
