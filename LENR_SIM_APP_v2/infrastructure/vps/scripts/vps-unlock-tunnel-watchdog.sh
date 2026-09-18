#!/usr/bin/env bash
# Keep VNC unlock HTTP + cloudflared quick tunnel alive; refresh URL on rotate.
# Agent-local defaults; override UNLOCK_HTTP_DIR / logs via env.
set +e
HTTP_DIR="${UNLOCK_HTTP_DIR:-/opt/cursor/artifacts/vnc-unlock-http}"
URL_FILE="${UNLOCK_URL_FILE:-/opt/cursor/artifacts/v038_unlock_tunnel_url.txt}"
LOG="${UNLOCK_WATCHDOG_LOG:-/opt/cursor/artifacts/v038_tunnel_watchdog.log}"
CF_LOG="${CLOUDFLARED_LOG:-/opt/cursor/artifacts/cloudflared_tunnel.log}"
CF="${CLOUDFLARED_BIN:-/tmp/cloudflared}"
TMUXC="${TMUX_CONF:-/exec-daemon/tmux.portal.conf}"
TMUX=(tmux -f "$TMUXC")

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }

tunnel_health() {
  local url="$1" host code ip
  host="${url#https://}"
  host="${host%%/*}"
  ip=$(dig @1.1.1.1 +short "$host" A 2>/dev/null | head -1)
  if [[ -n "$ip" ]]; then
    code=$(curl -sS -o /dev/null -w '%{http_code}' -m 12 --resolve "${host}:443:${ip}" "${url}/unlock.sh" 2>/dev/null || echo 000)
  else
    code=$(curl -sS -o /dev/null -w '%{http_code}' -m 12 "${url}/unlock.sh" 2>/dev/null || echo 000)
  fi
  echo "$code"
}

ensure_http() {
  if ss -ltn 2>/dev/null | grep -q ':8765'; then
    return 0
  fi
  log "unlock HTTP :8765 down — restarting"
  "${TMUX[@]}" kill-session -t v038-vnc-unlock-http 2>/dev/null
  sleep 1
  if [[ -f "$HTTP_DIR/server.py" ]]; then
    "${TMUX[@]}" new-session -d -s v038-vnc-unlock-http -c "$HTTP_DIR" -- python3 server.py
  else
    "${TMUX[@]}" new-session -d -s v038-vnc-unlock-http -c "$HTTP_DIR" -- python3 -m http.server 8765 --bind 0.0.0.0
  fi
  sleep 2
}

ensure_tunnel() {
  if ! pgrep -f 'cloudflared tunnel --url' >/dev/null 2>&1; then
    log "cloudflared missing — starting"
    "${TMUX[@]}" kill-session -t v038-cf-tunnel 2>/dev/null
    sleep 1
    : >> "$CF_LOG"
    "${TMUX[@]}" new-session -d -s v038-cf-tunnel -- \
      bash -lc "$CF tunnel --url http://127.0.0.1:8765 --no-autoupdate 2>&1 | tee -a $CF_LOG"
    sleep 10
  fi

  local url old code
  url=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" 2>/dev/null | tail -1)
  [[ -z "$url" ]] && return 0
  old=$(cat "$URL_FILE" 2>/dev/null || true)
  printf '%s\n' "$url" > "$URL_FILE"

  if [[ "$url" != "$old" ]]; then
    log "URL_ROTATED ${old:-none} -> $url"
    [[ -f "$HTTP_DIR/unlock.sh" ]] && sed -i -E "s|https://[a-z0-9-]+\.trycloudflare\.com|${url}|g" "$HTTP_DIR/unlock.sh"
    [[ -f "$HTTP_DIR/index.html" ]] && sed -i -E "s|https://[a-z0-9-]+\.trycloudflare\.com|${url}|g" "$HTTP_DIR/index.html"
    echo "ROTATED:$url"
  fi

  code=$(tunnel_health "$url")
  log "health=$code url=$url"
  if [[ "$code" != "200" ]] && ! pgrep -f 'cloudflared tunnel --url' >/dev/null 2>&1; then
    log "unhealthy + cloudflared dead — restart"
    "${TMUX[@]}" kill-session -t v038-cf-tunnel 2>/dev/null
    sleep 2
    "${TMUX[@]}" new-session -d -s v038-cf-tunnel -- \
      bash -lc "$CF tunnel --url http://127.0.0.1:8765 --no-autoupdate 2>&1 | tee -a $CF_LOG"
    sleep 10
  fi
}

log "watchdog start HTTP_DIR=$HTTP_DIR"
while true; do
  ensure_http
  ensure_tunnel
  sleep 60
done
