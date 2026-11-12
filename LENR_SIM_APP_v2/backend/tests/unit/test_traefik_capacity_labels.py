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
    # Comments may mention XFO; ensure no active add_header sets it.
    active_headers = [
        line.strip()
        for line in nginx.splitlines()
        if line.strip().startswith("add_header")
    ]
    assert not any("X-Frame-Options" in line for line in active_headers)
    assert "frame-ancestors" in nginx
    assert any('X-Frame-Policy "csp-frame-ancestors"' in line for line in active_headers)


def test_dockerfile_backend_restricts_forwarded_allow_ips():
    dockerfile = (ROOT / "infrastructure" / "docker" / "Dockerfile.backend").read_text(
        encoding="utf-8"
    )
    assert "forwarded-allow-ips='*'" not in dockerfile
    assert "FORWARDED_ALLOW_IPS" in dockerfile
    assert "10.0.0.0/8" in dockerfile


def test_backend_bodylimit_matches_request_max_body_size():
    """LP-M1: Traefik buffering 413 before upstream (10 MiB == REQUEST_MAX_BODY_SIZE)."""
    dynamic = DYNAMIC.read_text(encoding="utf-8")
    stack = STACK.read_text(encoding="utf-8")
    assert "backend-bodylimit:" in dynamic
    assert "maxRequestBodyBytes: 10485760" in dynamic
    assert "backend-bodylimit@file" in stack
    # Every backend middleware chain must include the bodylimit before ratelimit.
    for line in stack.splitlines():
        if "routers.backend" in line and ".middlewares=" in line:
            assert "backend-bodylimit@file" in line


def test_nginx_spa_body_limit_and_scanner_exact_404():
    """LP-M1/LP-L2: SPA nginx caps bodies and 404s /.env /.git before SPA fallback."""
    nginx = (ROOT / "infrastructure" / "docker" / "nginx.frontend.conf").read_text(
        encoding="utf-8"
    )
    assert "client_max_body_size 10m;" in nginx
    assert "location = /.env { return 404; }" in nginx
    assert "location = /.git { return 404; }" in nginx


def test_caddy_request_body_limit_and_scanner_404():
    """LP-M1/LP-L2: Compose Caddy 10MB + scanner path 404s."""
    caddy = (ROOT / "infrastructure" / "vps" / "Caddyfile").read_text(encoding="utf-8")
    assert "max_size 10MB" in caddy
    assert "path /.env /.git /.git/*" in caddy


def test_robots_txt_disallow_all_until_seo_flip():
    """LP-M5: robots Disallow:/ while public beta keeps x-robots-tag noindex."""
    robots = (ROOT / "frontend" / "public" / "robots.txt").read_text(encoding="utf-8")
    assert "Disallow: /" in robots
    assert "Allow: /" not in robots
    assert "noindex" in robots.lower() or "SEO" in robots
