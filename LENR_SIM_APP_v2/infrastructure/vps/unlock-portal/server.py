#!/usr/bin/env python3
"""Serve unlock artifacts, record beacons, accept Hostinger API token drop."""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BEACON_LOG = ROOT / "beacon_hits.jsonl"
STATUS = ROOT / "beacon_status.json"
# Poller watches this path (see poll-and-ship.sh TOKEN_FILES).
TOKEN_DROP = Path(
    os.environ.get(
        "HOSTINGER_API_TOKEN_FILE",
        "/opt/cursor/artifacts/HOSTINGER_API_TOKEN.txt",
    )
)
LIVE_DEFAULTS = "https://lenr-sim-beta.conscious.energy/api/physics/bubble-fusion/defaults"
LIVE_HEALTH = "https://lenr-sim-beta.conscious.energy/api/health"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _record(kind: str, client: str, extra: dict | None = None) -> None:
    event = {"ts": _now(), "kind": kind, "client": client}
    if extra:
        event.update(extra)
    with BEACON_LOG.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(event) + "\n")
    status = {}
    if STATUS.exists():
        try:
            status = json.loads(STATUS.read_text())
        except Exception:
            status = {}
    status[kind] = event
    status["last"] = event
    STATUS.write_text(json.dumps(status, indent=2) + "\n")


def _live_status() -> dict:
    out: dict = {"ts": _now(), "has_auto": False, "modes": [], "version": None, "error": None}
    try:
        with urllib.request.urlopen(LIVE_HEALTH, timeout=12) as resp:
            health = json.load(resp)
        out["version"] = health.get("version")
    except Exception as exc:
        out["error"] = f"health:{exc}"
    try:
        with urllib.request.urlopen(LIVE_DEFAULTS, timeout=12) as resp:
            d = json.load(resp)
        modes = ((d.get("options") or {}).get("dynamics_modes") or [])
        out["modes"] = modes
        out["has_auto"] = "auto" in modes
        out["defaults_dynamics_mode"] = (d.get("defaults") or {}).get("dynamics_mode")
    except Exception as exc:
        out["error"] = f"defaults:{exc}"
    out["token_dropped"] = TOKEN_DROP.exists() and TOKEN_DROP.stat().st_size > 0
    return out


def _extract_token(raw: bytes, content_type: str) -> str:
    text = raw.decode("utf-8", errors="replace").strip()
    if not text:
        return ""
    ctype = (content_type or "").split(";")[0].strip().lower()
    if ctype == "application/x-www-form-urlencoded":
        parsed = urllib.parse.parse_qs(text, keep_blank_values=False)
        for key in ("token", "HOSTINGER_API_TOKEN", "api_token"):
            if key in parsed and parsed[key]:
                return parsed[key][0].strip()
        # single anonymous field
        if len(parsed) == 1:
            return next(iter(parsed.values()))[0].strip()
    if ctype == "application/json":
        try:
            obj = json.loads(text)
        except Exception:
            return text
        if isinstance(obj, dict):
            for key in ("token", "HOSTINGER_API_TOKEN", "api_token"):
                val = obj.get(key)
                if isinstance(val, str) and val.strip():
                    return val.strip()
        return ""
    return text


def _write_token(token: str) -> int:
    TOKEN_DROP.parent.mkdir(parents=True, exist_ok=True)
    TOKEN_DROP.write_text(token.strip() + "\n", encoding="utf-8")
    try:
        os.chmod(TOKEN_DROP, 0o600)
    except OSError:
        pass
    return len(token.strip())


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path in ("/beacon-started", "/beacon-done", "/beacon-failed"):
            kind = path.lstrip("/").replace("-", "_")
            _record(kind, self.client_address[0])
            body = b"ok\n"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path in ("/beacon-status", "/beacon_status", "/status.json"):
            body = (STATUS.read_text() if STATUS.exists() else "{}").encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path in ("/live-status", "/live-status.json"):
            body = json.dumps(_live_status(), indent=2).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

    def do_POST(self):  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path not in ("/drop-hostinger-token", "/drop-token"):
            self.send_error(404, "not found")
            return
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 16_384:
            self.send_error(400, "bad content-length")
            return
        raw = self.rfile.read(length)
        token = _extract_token(raw, self.headers.get("Content-Type") or "")
        if len(token) < 20:
            body = b'{"ok":false,"error":"token too short"}\n'
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        n = _write_token(token)
        # Never log or return the token value.
        _record("token_dropped", self.client_address[0], {"token_len": n})
        body = json.dumps(
            {
                "ok": True,
                "token_len": n,
                "path": str(TOKEN_DROP),
                "note": "poller will unlock+ship within ~15s",
            }
        ).encode() + b"\n"
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt: str, *args) -> None:
        sys_stderr = __import__("sys").stderr
        # Avoid logging POST bodies (may contain secrets).
        sys_stderr.write("%s - %s\n" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", 8765), Handler)
    print(f"unlock+beacon server on :8765 root={ROOT} token_drop={TOKEN_DROP}", flush=True)
    server.serve_forever()
