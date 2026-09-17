#!/usr/bin/env python3
"""Register cloud-agent deploy pubkey on the live Compose VPS via Hostinger API.

Requires HOSTINGER_API_TOKEN (hPanel → API). Does not create a new VPS.

Usage (repo root):
  HOSTINGER_API_TOKEN=... \\
    python3 LENR_SIM_APP_v2/infrastructure/vps/scripts/register-agent-pubkey-hostinger.py

  HOSTINGER_API_TOKEN=... CONFIRM=I_SHIP_VPS_0_3_8 EXECUTE=1 \\
    python3 LENR_SIM_APP_v2/infrastructure/vps/scripts/register-agent-pubkey-hostinger.py --ship
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


def die(msg: str, code: int = 2) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(code)


def api(method: str, path: str, token: str, body: dict | None = None) -> object:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")
        die(f"HTTP {exc.code} {method} {path}: {detail[:800]}", 5)


def as_list(payload: object) -> list:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("data", "items", "virtual_machines", "public_keys"):
            val = payload.get(key)
            if isinstance(val, list):
                return val
            if isinstance(val, dict) and isinstance(val.get("data"), list):
                return val["data"]
    return []


def find_vm_id(vms: list, ipv4: str) -> int:
    for vm in vms:
        blob = json.dumps(vm)
        if ipv4 in blob:
            vm_id = vm.get("id")
            if vm_id is None:
                continue
            return int(vm_id)
    die(f"no Hostinger VM matched IPv4 {ipv4}; sample={json.dumps(vms[:2])[:600]}", 4)


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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ship", action="store_true", help="run ssh-ship after auth succeeds")
    parser.add_argument("--ipv4", default=os.environ.get("VPS_IPV4", DEFAULT_IPV4))
    parser.add_argument("--key-name", default=os.environ.get("HOSTINGER_SSH_KEY_NAME", DEFAULT_KEY_NAME))
    args = parser.parse_args()

    token = os.environ.get("HOSTINGER_API_TOKEN") or os.environ.get("hostinger_api_token")
    if not token:
        die("set HOSTINGER_API_TOKEN (hPanel → API)")

    pubkey_path = Path(
        os.environ.get("AGENT_PUBKEY_FILE", str(Path.home() / ".ssh" / "lenr_vps_agent_ed25519.pub"))
    )
    identity_path = Path(
        os.environ.get("AGENT_IDENTITY_FILE", str(Path.home() / ".ssh" / "lenr_vps_agent_ed25519"))
    )
    if not pubkey_path.is_file():
        die(f"pubkey not found: {pubkey_path}")
    pubkey = pubkey_path.read_text().strip()
    if not pubkey.startswith("ssh-"):
        die(f"{pubkey_path} is not an OpenSSH public key")

    print(f"==> Listing VMs for {args.ipv4}")
    vms = as_list(api("GET", "/api/vps/v1/virtual-machines", token))
    vm_id = find_vm_id(vms, args.ipv4)
    print(f"VM_ID={vm_id}")

    print("==> Listing account public keys")
    keys = as_list(api("GET", "/api/vps/v1/public-keys", token))
    key_id = find_key_id(keys, pubkey, args.key_name)
    if key_id is None:
        print(f"==> Creating public key {args.key_name!r}")
        created = api(
            "POST",
            "/api/vps/v1/public-keys",
            token,
            {"name": args.key_name, "key": pubkey},
        )
        if isinstance(created, dict):
            key_id = created.get("id") or (created.get("data") or {}).get("id")
        if key_id is None:
            die(f"create pubkey failed: {created}", 5)
        key_id = int(key_id)
    print(f"KEY_ID={key_id}")

    print(f"==> Attaching key {key_id} to VM {vm_id}")
    attach = api(
        "POST",
        f"/api/vps/v1/public-keys/attach/{vm_id}",
        token,
        {"ids": [key_id]},
    )
    print(json.dumps(attach)[:500])

    print("==> Waiting for SSH auth (up to ~90s)")
    for _ in range(12):
        if ssh_ok(identity_path, args.ipv4):
            print(f"OK: agent pubkey authorized on root@{args.ipv4}")
            break
        time.sleep(7)
    else:
        die(
            "attach returned but SSH still denied; Hostinger attach may be async — "
            "recheck shortly or use browser console authorized_keys append",
            6,
        )

    if args.ship:
        env = os.environ.copy()
        env["VPS_HOST"] = args.ipv4
        env["VPS_SSH_IDENTITY_FILE"] = str(identity_path)
        script = Path("LENR_SIM_APP_v2/infrastructure/vps/scripts/post-merge-vps-ship.sh")
        if not script.is_file():
            die(f"missing {script}")
        raise SystemExit(
            subprocess.call(
                ["bash", str(script), "ssh-ship"],
                env=env,
            )
        )


if __name__ == "__main__":
    main()
