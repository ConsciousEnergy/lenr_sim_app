#!/usr/bin/env python3
"""Hostinger-assisted unlock for Compose KM ship (no SSH private key required).

Requires HOSTINGER_API_TOKEN from hPanel → API.

Subcommands:
  list          List VMs (match IPv4) and Docker Manager projects
  attach-key    Create/attach cloud-agent pubkey to the live VPS
  docker-update Pull+recreate a Docker Manager project (if registered)
  unlock        attach-key, then docker-update if a project is found, then probe-km

Notes:
  - Current live share was deployed via SSH compose under /opt/lenr-sim — Docker
    Manager may show zero projects. In that case attach-key + ssh-ship is the path.
  - docker-update needs the stack registered in Hostinger Docker Manager with
    GHCR pull credentials already configured in hPanel.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE_URL = os.environ.get("HOSTINGER_API_BASE", "https://developers.hostinger.com").rstrip("/")
DEFAULT_IPV4 = "185.211.4.66"
DEFAULT_KEY_NAME = "cursor-agent-compose-ship-v038"
PROBE = "LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh"


def die(msg: str, code: int = 2) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(code)


def api(method: str, path: str, token: str, body: dict | None = None) -> object:
    data = None if body is None else json.dumps(body).encode()
    # Cloudflare Error 1010 bans default Python-urllib UA on developers.hostinger.com
    # (probed 2026-09-18 from Cloud Agent). Use a normal client signature.
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": os.environ.get(
                "HOSTINGER_API_UA",
                "Mozilla/5.0 (compatible; LENR-Compose-Unlock/0.3.8; +https://conscious.energy)",
            ),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")
        die(f"HTTP {exc.code} {method} {path}: {detail[:900]}", 5)


def as_list(payload: object) -> list:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("data", "items", "virtual_machines", "public_keys", "projects"):
            val = payload.get(key)
            if isinstance(val, list):
                return val
            if isinstance(val, dict) and isinstance(val.get("data"), list):
                return val["data"]
    return []


def require_token() -> str:
    token = os.environ.get("HOSTINGER_API_TOKEN") or os.environ.get("hostinger_api_token")
    if not token:
        die("set HOSTINGER_API_TOKEN (hPanel → API)")
    return token


def find_vm_id(vms: list, ipv4: str) -> int:
    for vm in vms:
        if ipv4 in json.dumps(vm):
            vm_id = vm.get("id")
            if vm_id is not None:
                return int(vm_id)
    die(f"no Hostinger VM matched IPv4 {ipv4}; sample={json.dumps(vms[:2])[:700]}", 4)


def find_key_id(keys: list, pubkey: str, name: str) -> int | None:
    pub = pubkey.strip()
    token = pub.split()[1] if len(pub.split()) >= 2 else pub
    for key in keys:
        material = str(key.get("key") or "").strip()
        if material == pub or token in material or key.get("name") == name:
            kid = key.get("id")
            if kid is not None:
                return int(kid)
    return None


def ssh_ok(identity: Path, host: str) -> bool:
    try:
        subprocess.run(
            [
                "ssh",
                "-i",
                str(identity),
                "-o",
                "BatchMode=yes",
                "-o",
                "ConnectTimeout=8",
                "-o",
                "IdentitiesOnly=yes",
                "-o",
                "StrictHostKeyChecking=accept-new",
                f"root@{host}",
                "echo SSH_OK",
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=20,
        )
        return True
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return False


def cmd_list(token: str, ipv4: str) -> int:
    vms = as_list(api("GET", "/api/vps/v1/virtual-machines", token))
    vm_id = find_vm_id(vms, ipv4)
    print(f"VM_ID={vm_id} ipv4={ipv4}")
    projects = as_list(api("GET", f"/api/vps/v1/virtual-machines/{vm_id}/docker", token))
    if not projects:
        print("Docker Manager projects: (none) — use attach-key + ssh-ship")
        return 0
    print(f"Docker Manager projects ({len(projects)}):")
    for p in projects:
        name = p.get("name") or p.get("project_name") or p
        status = p.get("status") or p.get("state")
        print(f"  - {name} status={status}")
    return 0


def cmd_attach_key(token: str, ipv4: str, key_name: str) -> int:
    pubkey_path = Path(
        os.environ.get("AGENT_PUBKEY_FILE", str(Path.home() / ".ssh" / "lenr_vps_agent_ed25519.pub"))
    )
    identity_path = Path(
        os.environ.get("AGENT_IDENTITY_FILE", str(Path.home() / ".ssh" / "lenr_vps_agent_ed25519"))
    )
    if not pubkey_path.is_file():
        die(f"pubkey not found: {pubkey_path}")
    pubkey = pubkey_path.read_text().strip()

    vms = as_list(api("GET", "/api/vps/v1/virtual-machines", token))
    vm_id = find_vm_id(vms, ipv4)
    print(f"VM_ID={vm_id}")

    # Prefer non-deprecated VM ssh-keys endpoint (injects into root authorized_keys).
    # Legacy public-keys/attach often no-ops on live KVMs.
    print(f"==> POST /virtual-machines/{vm_id}/ssh-keys (inject root authorized_keys)")
    injected = api(
        "POST",
        f"/api/vps/v1/virtual-machines/{vm_id}/ssh-keys",
        token,
        {"keys": [pubkey]},
    )
    print(json.dumps(injected)[:500] if not isinstance(injected, list) else f"keys_on_vm={len(injected)}")

    print("==> Waiting for SSH auth (up to ~90s)")
    for _ in range(12):
        if ssh_ok(identity_path, ipv4):
            print(f"OK: SSH authorized root@{ipv4}")
            return 0
        time.sleep(7)

    # Fallback: account-level public key + deprecated attach
    keys = as_list(api("GET", "/api/vps/v1/public-keys", token))
    key_id = find_key_id(keys, pubkey, key_name)
    if key_id is None:
        print(f"==> Creating account public key {key_name!r}")
        created = api(
            "POST",
            "/api/vps/v1/public-keys",
            token,
            {"name": key_name, "key": pubkey},
        )
        if isinstance(created, dict):
            key_id = created.get("id") or (created.get("data") or {}).get("id")
        if key_id is None:
            die(f"create pubkey failed: {created}", 5)
        key_id = int(key_id)
    print(f"KEY_ID={key_id} — fallback attach")
    attach = api(
        "POST",
        f"/api/vps/v1/public-keys/attach/{vm_id}",
        token,
        {"ids": [key_id]},
    )
    print(json.dumps(attach)[:500])
    for _ in range(6):
        if ssh_ok(identity_path, ipv4):
            print(f"OK: SSH authorized root@{ipv4} (fallback attach)")
            return 0
        time.sleep(7)
    print(
        "WARN: SSH still denied after ssh-keys + attach — use VNC keydrop",
        file=sys.stderr,
    )
    return 6


def cmd_docker_update(token: str, ipv4: str, project: str | None) -> int:
    vms = as_list(api("GET", "/api/vps/v1/virtual-machines", token))
    vm_id = find_vm_id(vms, ipv4)
    projects = as_list(api("GET", f"/api/vps/v1/virtual-machines/{vm_id}/docker", token))
    names: list[str] = []
    for p in projects:
        if isinstance(p, str):
            names.append(p)
        elif isinstance(p, dict):
            n = p.get("name") or p.get("project_name")
            if n:
                names.append(str(n))
    if not names:
        die(
            "no Docker Manager projects on this VPS — cannot docker-update; "
            "use attach-key + ssh-ship instead",
            7,
        )
    chosen = project
    if chosen is None:
        for candidate in ("lenr-sim", "lenr_sim", "lenr-sim-app", "compose"):
            if candidate in names:
                chosen = candidate
                break
        if chosen is None:
            chosen = names[0]
            print(f"NOTE: using first project {chosen!r}; pass --project to override")
    if chosen not in names:
        die(f"project {chosen!r} not in {names}", 8)

    print(f"==> Docker Manager update VM={vm_id} project={chosen}")
    result = api(
        "POST",
        f"/api/vps/v1/virtual-machines/{vm_id}/docker/{chosen}/update",
        token,
    )
    print(json.dumps(result)[:800])
    print("OK: update requested — waiting for health/KM probe")
    time.sleep(20)
    return subprocess.call(["bash", PROBE, "probe-km"], env={**os.environ, "BETA_SHARE_URL": f"https://lenr-sim-beta.conscious.energy"})


def cmd_unlock(token: str, ipv4: str, key_name: str, project: str | None) -> int:
    # Prefer attach-key (works for SSH compose path), then optionally ssh-ship.
    # If attach does not enable SSH (Hostinger often no-ops on live KVM), fall through
    # to Docker Manager update — never docker compose down from unlock automation.
    rc = cmd_attach_key(token, ipv4, key_name)
    if rc != 0:
        print(f"WARN: attach-key rc={rc}; attempting Docker Manager update without SSH")
        try:
            return cmd_docker_update(token, ipv4, project)
        except SystemExit as exc:
            print(f"docker-update unavailable after attach failure: {exc}")
            return rc
    if os.environ.get("CONFIRM") == "I_SHIP_VPS_0_3_8" and os.environ.get("EXECUTE") == "1":
        env = os.environ.copy()
        env["VPS_HOST"] = ipv4
        env["VPS_SSH_IDENTITY_FILE"] = str(
            Path(
                os.environ.get(
                    "AGENT_IDENTITY_FILE",
                    str(Path.home() / ".ssh" / "lenr_vps_agent_ed25519"),
                )
            )
        )
        print("==> ssh-ship after attach-key")
        ship_rc = subprocess.call(["bash", PROBE, "ssh-ship"], env=env)
        if ship_rc == 0:
            return 0
        print("WARN: ssh-ship failed; attempting Docker Manager update fallback")
        try:
            return cmd_docker_update(token, ipv4, project)
        except SystemExit as exc:
            print(f"docker-update unavailable: {exc}")
            return ship_rc
    print(
        "OK: pubkey attached. To ship:\n"
        "  CONFIRM=I_SHIP_VPS_0_3_8 EXECUTE=1 \\\n"
        "    ./LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh ssh-ship"
    )
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "command",
        choices=("list", "attach-key", "docker-update", "unlock"),
        help="list | attach-key | docker-update | unlock",
    )
    parser.add_argument("--ipv4", default=os.environ.get("VPS_IPV4", DEFAULT_IPV4))
    parser.add_argument("--key-name", default=os.environ.get("HOSTINGER_SSH_KEY_NAME", DEFAULT_KEY_NAME))
    parser.add_argument("--project", default=os.environ.get("HOSTINGER_DOCKER_PROJECT"))
    args = parser.parse_args()
    token = require_token()

    if args.command == "list":
        raise SystemExit(cmd_list(token, args.ipv4))
    if args.command == "attach-key":
        raise SystemExit(cmd_attach_key(token, args.ipv4, args.key_name))
    if args.command == "docker-update":
        raise SystemExit(cmd_docker_update(token, args.ipv4, args.project))
    raise SystemExit(cmd_unlock(token, args.ipv4, args.key_name, args.project))


if __name__ == "__main__":
    main()
