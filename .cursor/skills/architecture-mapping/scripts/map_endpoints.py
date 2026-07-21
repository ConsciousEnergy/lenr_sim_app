"""Seed architecture diagrams by extracting the real wiring from the codebase.

Zero-dependency (stdlib only). Scans the LENR_SIM_APP_v2 backend and frontend
and prints:
  - backend route decorators (method + path) grouped by file
  - `include_router(...)` registrations with their prefix (from main.py etc.)
  - frontend context providers and WebSocket client entry points

Run from anywhere inside the repo:
  python .cursor/skills/architecture-mapping/scripts/map_endpoints.py
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROUTE_RE = re.compile(r"@\w+\.(get|post|put|delete|patch|websocket)\(\s*[\"']([^\"']+)[\"']")
INCLUDE_RE = re.compile(
    r"include_router\(\s*([\w.]+)(?:[^)]*?prefix\s*=\s*[\"']([^\"']+)[\"'])?",
    re.DOTALL,
)
CONTEXT_RE = re.compile(r"createContext|export\s+(?:const|function)\s+(\w*Provider)")
WS_RE = re.compile(r"createSimulationSocket|getVisualizationWebSocket|new\s+WebSocket|websocketClient")


def repo_root() -> Path:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        )
        return Path(out.stdout.strip()).resolve()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return Path.cwd().resolve()


def rel(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root)).replace("\\", "/")
    except ValueError:
        return str(path)


def scan_backend(backend: Path, root: Path) -> None:
    if not backend.exists():
        print(f"[map] backend not found: {rel(backend, root)}")
        return

    print("\n=== Backend routes (method path) ===")
    for py in sorted(backend.rglob("*.py")):
        text = py.read_text(encoding="utf-8", errors="replace")
        routes = ROUTE_RE.findall(text)
        if not routes:
            continue
        print(f"\n{rel(py, root)}")
        for method, path in routes:
            print(f"  {method.upper():9} {path}")

    print("\n=== include_router registrations (router -> prefix) ===")
    for py in sorted(backend.rglob("*.py")):
        text = py.read_text(encoding="utf-8", errors="replace")
        for router, prefix in INCLUDE_RE.findall(text):
            if router:
                print(f"  {rel(py, root)}: {router} -> {prefix or '(no prefix)'}")


def scan_frontend(frontend: Path, root: Path) -> None:
    if not frontend.exists():
        print(f"\n[map] frontend not found: {rel(frontend, root)}")
        return

    print("\n=== Frontend context providers ===")
    for f in sorted(frontend.rglob("*.*")):
        if f.suffix not in {".js", ".jsx", ".ts", ".tsx"}:
            continue
        text = f.read_text(encoding="utf-8", errors="replace")
        providers = {m for m in CONTEXT_RE.findall(text) if m}
        if "createContext" in text or providers:
            label = ", ".join(sorted(providers)) if providers else "createContext"
            print(f"  {rel(f, root)}: {label}")

    print("\n=== Frontend WebSocket entry points ===")
    for f in sorted(frontend.rglob("*.*")):
        if f.suffix not in {".js", ".jsx", ".ts", ".tsx"}:
            continue
        text = f.read_text(encoding="utf-8", errors="replace")
        if WS_RE.search(text):
            print(f"  {rel(f, root)}")


def main() -> int:
    root = repo_root()
    app = root / "LENR_SIM_APP_v2"
    backend = app / "backend" / "app"
    frontend = app / "frontend" / "src"

    print(f"[map] repo: {root}")
    scan_backend(backend, root)
    scan_frontend(frontend, root)
    print("\n[map] Turn this into a Mermaid diagram using the templates in SKILL.md.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
