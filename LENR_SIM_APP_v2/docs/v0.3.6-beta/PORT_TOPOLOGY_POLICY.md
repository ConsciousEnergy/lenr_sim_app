# v0.3.6-beta Port Topology Policy

## Canonical Runtime Matrix

| Mode | Frontend | Backend Host | Backend Container | Notes |
|---|---:|---:|---:|---|
| Dev Local | `3000` | `8010` | n/a | Vite dev server + backend process |
| Dev Docker | `3000` | `8010` | `8000` | compose mapping `8010:8000` |
| CI | n/a | n/a | n/a | no fixed host port required |
| Production | hosted static | `https://api.conscious.energy` | managed | no localhost assumptions |

## Rules
- New frontend runtime defaults MUST use `8010` when bypassing proxy.
- Active frontend development should prefer relative `/api/*` paths through the
  Vite dev-server proxy (`vite.config.js` `server.proxy`).
- Scripts/docs mentioning `8000` or `8001` are legacy unless explicitly marked
  historical. The one legitimate `8000` is the *container-internal* backend port
  in Docker, which compose maps to `8010` on the host.
- WebSocket local development defaults MUST align to `ws://localhost:8010`.

## Updated Canonical References
- `frontend/src/config/api.js`
- `frontend/src/services/websocket.js`
- `frontend/src/utils/visualizationWebSocket.js`
- `frontend/src/pages/SettingsPage.jsx`
- `frontend/src/components/SimulationControlPanel.tsx`
- `frontend/src/pages/SimulationPage.jsx`

