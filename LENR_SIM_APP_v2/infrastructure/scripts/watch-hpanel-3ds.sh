#!/usr/bin/env bash
# Watch for dropped hPanel creds, then attempt Playwright 3DS assist.
set -euo pipefail
ENV_FILE="${HPANEL_ENV_FILE:-/tmp/lenr-ci-hpanel.env}"
MARKER=/tmp/lenr-ci-drop-artifacts/hpanel_creds_received
LOG="${LOG:-/opt/cursor/artifacts/hpanel-3ds-watch.log}"
PY="${PY:-/tmp/pw-venv/bin/python}"
SCRIPT="${SCRIPT:-/tmp/hpanel-complete-3ds.py}"
mkdir -p "$(dirname "$LOG")" /tmp/lenr-ci-drop-artifacts

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }

log "hpanel-3ds watch start"
LAST_MTIME=""
while true; do
  if [[ -f "$ENV_FILE" ]]; then
    mt="$(stat -c %Y "$ENV_FILE" 2>/dev/null || echo 0)"
    if [[ "$mt" != "$LAST_MTIME" ]]; then
      LAST_MTIME="$mt"
      log "creds file changed — attempting hPanel 3DS assist"
      set +e
      "$PY" "$SCRIPT" 2>&1 | tee -a "$LOG"
      ec=${PIPESTATUS[0]}
      set -e
      log "hpanel-3ds exit=$ec"
      # Do not delete creds; operator may rotate. Sleep before retry on failure.
      if [[ "$ec" -eq 0 ]]; then
        log "assist reported progress — VM watcher should pick up dedicated host"
        sleep 120
      else
        sleep 60
      fi
      continue
    fi
  else
    log "wait: drop HOSTINGER_HPANEL_EMAIL+PASSWORD on unlock page"
  fi
  sleep 20
done
