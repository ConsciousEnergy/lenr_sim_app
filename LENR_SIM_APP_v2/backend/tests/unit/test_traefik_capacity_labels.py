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


def test_spa_security_headers_disable_frame_deny():
    """SEC-01: SPA must not emit X-Frame-Options DENY (CSP frame-ancestors only)."""
    text = DYNAMIC.read_text(encoding="utf-8")
    # Isolate the spa-security-headers block before the next middleware key.
    start = text.index("spa-security-headers:")
    rest = text[start:]
    end = rest.find("\n    # NOTE:")
    if end == -1:
        end = rest.find("\n    cors:")
    block = rest[: end if end != -1 else len(rest)]
    assert "frameDeny: false" in block
    assert "frameDeny: true" not in block
    assert "customFrameOptionsValue" not in block
    assert "frame-ancestors" in block
    assert "X-Frame-Policy" in block


def test_nginx_spa_omits_x_frame_options():
    nginx = (ROOT / "infrastructure" / "docker" / "nginx.frontend.conf").read_text(
        encoding="utf-8"
    )
    assert "X-Frame-Options" not in nginx or "omit X-Frame-Options" in nginx
    assert "X-Frame-Options: DENY" not in nginx
    assert "X-Frame-Options: SAMEORIGIN" not in nginx
    assert "frame-ancestors" in nginx
    assert 'X-Frame-Policy "csp-frame-ancestors"' in nginx


def test_dockerfile_backend_restricts_forwarded_allow_ips():
    dockerfile = (ROOT / "infrastructure" / "docker" / "Dockerfile.backend").read_text(
        encoding="utf-8"
    )
    assert "forwarded-allow-ips='*'" not in dockerfile
    assert "FORWARDED_ALLOW_IPS" in dockerfile
    assert "10.0.0.0/8" in dockerfile
