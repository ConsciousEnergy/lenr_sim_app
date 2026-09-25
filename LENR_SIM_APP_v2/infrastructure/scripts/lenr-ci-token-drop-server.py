#!/usr/bin/env python3
"""Operator drop for GH_RUNNER_REGISTRATION_TOKEN + optional hPanel creds."""
from __future__ import annotations
import json, os
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

SECRET = Path("/tmp/lenr-ci-drop-secret").read_text().strip()
WATCH_ENV = Path("/tmp/lenr-ci-watch.env")
DROP_DIR = Path("/tmp/lenr-ci-drop-artifacts")
HPANEL_ENV = Path("/tmp/lenr-ci-hpanel.env")
HOSTINGER = os.environ.get("HOSTINGER_API_TOKEN", "")

HTML = f"""<!doctype html>
<html><head><meta charset=utf-8><title>lenr-ci unlock drop</title>
<style>body{{font-family:system-ui;max-width:42rem;margin:2rem auto;padding:0 1rem}}
input,textarea,button{{width:100%;margin:.35rem 0;padding:.6rem;font-size:1rem}}
.ok{{color:green}}.err{{color:#a00}}small{{color:#555}}</style></head>
<body>
<h1>lenr-ci unlock drop</h1>
<p>Complete Hostinger 3DS in another tab, then paste a fresh GitHub runner token here.</p>
<form method=POST action="/drop/{SECRET}">
<label>GH_RUNNER_REGISTRATION_TOKEN (required for migrate)</label>
<input name=token autocomplete=off minlength=40 placeholder="AQP... from New self-hosted runner">
<label>Notes (optional — e.g. 3DS done, VM id/IP)</label>
<textarea name=notes rows=2 placeholder="3DS done for 61660939"></textarea>
<hr>
<label>HOSTINGER_HPANEL_EMAIL (optional — agent-assisted login)</label>
<input name=hpanel_email autocomplete=username type=email placeholder="you@example.com">
<label>HOSTINGER_HPANEL_PASSWORD (optional)</label>
<input name=hpanel_password autocomplete=current-password type=password>
<button type=submit>Submit</button>
</form>
<p><small>Orders awaiting 3DS: 61660939 (KVM2) or 61662216 (KVM1). Do not register on 185.211.4.66.</small></p>
</body></html>
"""

class H(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"drop: {self.address_string()} {fmt % args}", flush=True)

    def _send(self, code, body, ctype="text/html; charset=utf-8"):
        data = body if isinstance(body, bytes) else body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlparse(self.path).path
        if path in ("/", f"/drop/{SECRET}"):
            return self._send(200, HTML)
        if path == "/health":
            return self._send(200, "ok\n", "text/plain")
        if path == "/status":
            st = {
                "token_usable": False,
                "hpanel_creds": HPANEL_ENV.exists(),
                "drop_received": (DROP_DIR / "token_received").exists(),
            }
            if WATCH_ENV.exists():
                for line in WATCH_ENV.read_text().splitlines():
                    if line.startswith("GH_RUNNER_REGISTRATION_TOKEN="):
                        t = line.split("=", 1)[1]
                        st["token_usable"] = len(t) >= 40 and not t.startswith("G1th")
            return self._send(200, json.dumps(st) + "\n", "application/json")
        return self._send(404, "not found\n", "text/plain")

    def do_POST(self):
        path = urlparse(self.path).path
        if path != f"/drop/{SECRET}":
            return self._send(403, "forbidden\n", "text/plain")
        n = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(n).decode("utf-8", "replace")
        token = notes = email = password = ""
        ctype = self.headers.get("Content-Type", "")
        if "application/json" in ctype:
            try:
                d = json.loads(raw)
            except Exception:
                return self._send(400, "bad json\n", "text/plain")
            token = str(d.get("token") or d.get("GH_RUNNER_REGISTRATION_TOKEN") or "")
            notes = str(d.get("notes") or "")
            email = str(d.get("hpanel_email") or d.get("HOSTINGER_HPANEL_EMAIL") or "")
            password = str(d.get("hpanel_password") or d.get("HOSTINGER_HPANEL_PASSWORD") or "")
        else:
            qs = parse_qs(raw)
            token = (qs.get("token") or [""])[0]
            notes = (qs.get("notes") or [""])[0]
            email = (qs.get("hpanel_email") or [""])[0]
            password = (qs.get("hpanel_password") or [""])[0]
        token = token.strip()
        email = email.strip()
        password = password.strip()
        DROP_DIR.mkdir(parents=True, exist_ok=True)
        parts = []
        if email and password:
            HPANEL_ENV.write_text(
                f"HOSTINGER_HPANEL_EMAIL={email}\nHOSTINGER_HPANEL_PASSWORD={password}\n"
            )
            HPANEL_ENV.chmod(0o600)
            (DROP_DIR / "hpanel_creds_received").write_text("ok\n")
            parts.append("hPanel credentials saved")
        if token:
            if len(token) < 40 or token.startswith("G1th") or token.startswith("placeholder"):
                return self._send(400, HTML.replace("</form>", "<p class=err>Token rejected (need real one-time token, len≥40).</p></form>"))
            ht = HOSTINGER
            if WATCH_ENV.exists():
                for line in WATCH_ENV.read_text().splitlines():
                    if line.startswith("HOSTINGER_API_TOKEN="):
                        ht = line.split("=", 1)[1]
            WATCH_ENV.write_text(
                f"HOSTINGER_API_TOKEN={ht}\n"
                f"GH_RUNNER_REGISTRATION_TOKEN={token}\n"
                f"POLL_SECONDS=20\n"
            )
            WATCH_ENV.chmod(0o600)
            (DROP_DIR / "token_received").write_text("ok\n")
            parts.append("runner token saved")
        if notes.strip():
            (DROP_DIR / "notes.txt").write_text(notes.strip() + "\n")
            parts.append("notes saved")
        if not parts:
            return self._send(400, HTML.replace("</form>", "<p class=err>Provide a token and/or hPanel credentials.</p></form>"))
        msg = "; ".join(parts)
        return self._send(200, f"<html><body><h1 class=ok>Accepted</h1><p>{msg}. Watcher / agent will pick this up.</p></body></html>")

HTTPServer(("127.0.0.1", 8787), H).serve_forever()
