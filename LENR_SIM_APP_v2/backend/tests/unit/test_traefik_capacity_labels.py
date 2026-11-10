"""Assert Swarm Traefik templates carry capacity-harden labels (no live apply)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # LENR_SIM_APP_v2
STACK = ROOT / "infrastructure" / "ansible" / "templates" / "docker-stack.yml.j2"
DYNAMIC = ROOT / "infrastructure" / "ansible" / "templates" / "traefik-dynamic.yml.j2"
STATIC = ROOT / "infrastructure" / "ansible" / "templates" / "traefik.yml.j2"


def test_backend_ratelimit_uses_ipstrategy_depth():
    text = STACK.read_text(encoding="utf-8")
    assert "backend-ratelimit.ratelimit.sourcecriterion.ipstrategy.depth=1" in text
    assert "backend-ratelimit.ratelimit.average=100" in text


def test_dead_api_ratelimit_file_middleware_removed():
    text = DYNAMIC.read_text(encoding="utf-8")
    assert "api-ratelimit:" not in text
    assert "unused `api-ratelimit`" in text or "api-ratelimit" in text.lower()


def test_traefik_forwarded_headers_insecure_false():
    text = STATIC.read_text(encoding="utf-8")
    assert "forwardedHeaders:" in text
    assert "insecure: false" in text
