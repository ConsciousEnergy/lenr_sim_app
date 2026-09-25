#!/usr/bin/env python3
"""Operator drop + live status for dedicated lenr-ci cutover."""
from __future__ import annotations
import json, os, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

SECRET = Path("/tmp/lenr-ci-drop-secret").read_text().strip()
WATCH_ENV = Path("/tmp/lenr-ci-watch.env")
DROP_DIR = Path("/tmp/lenr-ci-drop-artifacts")
HPANEL_ENV = Path("/tmp/lenr-ci-hpanel.env")
HOSTINGER = os.environ.get("HOSTINGER_API_TOKEN", "")
SHARE_VM = 1280333

def hostinger_vms():
    if not HOSTINGER:
        return []
    req = urllib.request.Request(
        "https://developers.hostinger.com/api/vps/v1/virtual-machines",
        headers={"Authorization": f"Bearer {HOSTINGER}", "Accept": "application/json", "User-Agent": "lenr-ci-drop"},
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read().decode())
    return data if isinstance(data, list) else data.get("data", [])

def status_dict():
    vms = []
    try:
        vms = hostinger_vms()
    except Exception as e:
        vms = [{"error": str(e)}]
    dedicated = [v for v in vms if isinstance(v, dict) and int(v.get("id", 0)) != SHARE_VM]
    tok_usable = False
    if WATCH_ENV.exists():
        for line in WATCH_ENV.read_text().splitlines():
            if line.startswith("GH_RUNNER_REGISTRATION_TOKEN="):
                t = line.split("=", 1)[1]
                tok_usable = len(t) >= 40 and not t.startswith("G1th") and not t.startswith("placeholder")
    return {
        "vm_count": len([v for v in vms if isinstance(v, dict) and "id" in v]),
        "vms": [
            {
                "id": v.get("id"),
                "hostname": v.get("hostname"),
                "ip": ((v.get("ipv4") or [{}])[0].get("address")),
                "state": v.get("state"),
            }
            for v in vms if isinstance(v, dict) and "id" in v
        ],
        "dedicated_found": bool(dedicated),
        "token_usable": tok_usable,
        "hpanel_creds": HPANEL_ENV.exists(),
        "drop_received": (DROP_DIR / "token_received").exists(),
        "orders_awaiting_3ds": ["61660939", "61662216", "61663818"],
        "goal_ready": bool(dedicated) and tok_usable,
    }

def page_html():
    st = status_dict()
    rows = "".join(
        f"<tr><td>{v.get('id')}</td><td>{v.get('hostname')}</td><td>{v.get('ip')}</td><td>{v.get('state')}</td></tr>"
        for v in st["vms"]
    ) or "<tr><td colspan=4>none</td></tr>"
    ready = "READY TO MIGRATE" if st["goal_ready"] else "BLOCKED — need 3DS + token"
    color = "#0a0" if st["goal_ready"] else "#a40"
    return f"""<!doctype html>
<html><head><meta charset=utf-8><title>lenr-ci unlock</title>
<meta http-equiv=refresh content=30>
<style>
body{{font-family:system-ui;max-width:46rem;margin:2rem auto;padding:0 1rem;line-height:1.4}}
table{{border-collapse:collapse;width:100%;margin:.5rem 0 1rem}}
td,th{{border:1px solid #ccc;padding:.4rem .55rem;text-align:left;font-size:.95rem}}
.banner{{padding:.8rem 1rem;border-radius:8px;background:{color};color:#fff;font-weight:600}}
input,textarea,button{{width:100%;margin:.35rem 0;padding:.6rem;font-size:1rem}}
a.btn{{display:inline-block;margin:.4rem 0 1rem;padding:.7rem 1rem;background:#0b5fff;color:#fff;text-decoration:none;border-radius:8px}}
.ok{{color:green}}.err{{color:#a00}}small{{color:#555}}
</style></head><body>
<h1>lenr-ci dedicated unlock</h1>
<p class=banner>{ready}</p>
<p><a class=btn href="https://hpanel.hostinger.com/billing" target=_blank rel=noopener>Open hPanel billing → complete ONE 3DS</a></p>
<p>Orders: <b>61660939</b> (KVM2) or <b>61662216</b>/<b>61663818</b> (KVM1). Cancel the other unpaid duplicates. Do not touch share VM 1280333.</p>
<h2>Live Hostinger VMs</h2>
<table><tr><th>id</th><th>hostname</th><th>ip</th><th>state</th></tr>{rows}</table>
<p>dedicated_found=<b>{st['dedicated_found']}</b> · token_usable=<b>{st['token_usable']}</b> · hpanel_creds=<b>{st['hpanel_creds']}</b></p>
<hr>
<h2>Drop secrets</h2>
<form method=POST action="/drop/{SECRET}">
<label>GH_RUNNER_REGISTRATION_TOKEN</label>
<input name=token autocomplete=off minlength=40 placeholder="from GitHub → Runners → New self-hosted runner">
<label>Notes (optional)</label>
<textarea name=notes rows=2 placeholder="3DS done for 61660939; new VM id/IP"></textarea>
<label>HOSTINGER_HPANEL_EMAIL (optional)</label>
<input name=hpanel_email type=email autocomplete=username>
<label>HOSTINGER_HPANEL_PASSWORD (optional)</label>
<input name=hpanel_password type=password autocomplete=current-password>
<button type=submit>Submit</button>
</form>
<p><small>Auto-refresh 30s. Never register a runner on 185.211.4.66. Beta must stay 0.3.7-beta.</small></p>
</body></html>"""

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
            return self._send(200, page_html())
        if path == "/health":
            return self._send(200, "ok\n", "text/plain")
        if path == "/status":
            return self._send(200, json.dumps(status_dict()) + "\n", "application/json")
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
        token = token.strip(); email = email.strip(); password = password.strip()
        DROP_DIR.mkdir(parents=True, exist_ok=True)
        parts = []
        if email and password:
            HPANEL_ENV.write_text(f"HOSTINGER_HPANEL_EMAIL={email}\nHOSTINGER_HPANEL_PASSWORD={password}\n")
            HPANEL_ENV.chmod(0o600)
            (DROP_DIR / "hpanel_creds_received").write_text("ok\n")
            parts.append("hPanel credentials saved")
        if token:
            if len(token) < 40 or token.startswith("G1th") or token.startswith("placeholder"):
                return self._send(400, page_html().replace("</form>", "<p class=err>Token rejected (len≥40, not placeholder).</p></form>"))
            ht = HOSTINGER
            if WATCH_ENV.exists():
                for line in WATCH_ENV.read_text().splitlines():
                    if line.startswith("HOSTINGER_API_TOKEN="):
                        ht = line.split("=", 1)[1]
            WATCH_ENV.write_text(f"HOSTINGER_API_TOKEN={ht}\nGH_RUNNER_REGISTRATION_TOKEN={token}\nPOLL_SECONDS=20\n")
            WATCH_ENV.chmod(0o600)
            (DROP_DIR / "token_received").write_text("ok\n")
            parts.append("runner token saved")
        if notes.strip():
            (DROP_DIR / "notes.txt").write_text(notes.strip() + "\n")
            parts.append("notes saved")
        if not parts:
            return self._send(400, page_html().replace("</form>", "<p class=err>Provide a token and/or hPanel credentials.</p></form>"))
        return self._send(200, f"<html><body><h1 class=ok>Accepted</h1><p>{'; '.join(parts)}</p><p><a href='/'>Back to status</a></p></body></html>")

HTTPServer(("127.0.0.1", 8787), H).serve_forever()
