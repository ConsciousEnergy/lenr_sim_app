"""Assert Swarm Traefik templates carry capacity-harden labels (no live apply)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # LENR_SIM_APP_v2
STACK = ROOT / "infrastructure" / "ansible" / "templates" / "docker-stack.yml.j2"
DYNAMIC = ROOT / "infrastructure" / "ansible" / "templates" / "traefik-dynamic.yml.j2"
STATIC = ROOT / "infrastructure" / "ansible" / "templates" / "traefik.yml.j2"


def test_backend_ratelimit_uses_ipstrategy_depth():
    """LP-H2: rateLimit middlewares live on the file provider (dynamic.yml)."""
    dynamic = DYNAMIC.read_text(encoding="utf-8")
    stack = STACK.read_text(encoding="utf-8")
    assert "backend-ratelimit:" in dynamic
    assert "ipStrategy:" in dynamic
    assert "depth: 1" in dynamic
    # General edge budget aligned with FastAPI RATE_LIMIT_PER_MINUTE (shared).
    assert "average: 60" in dynamic
    assert "burst: 30" in dynamic
    # Swarm general router attaches the file middleware (not Swarm-defined RL).
    assert "backend-ratelimit@file" in stack
    assert "backend-ratelimit.ratelimit.average=" not in stack


def test_backend_path_ratelimit_heavy_and_write_tiers():
    """LP-H2: file-provider path routers apply shared heavy/write budgets."""
    dynamic = DYNAMIC.read_text(encoding="utf-8")
    stack = STACK.read_text(encoding="utf-8")
    assert "backend-ratelimit-heavy:" in dynamic
    assert "backend-ratelimit-write:" in dynamic
    assert "average: 10" in dynamic
    assert "burst: 5" in dynamic
    assert "average: 3" in dynamic
    # Mutate-only path families for compute + persistence abuse.
    # Traefik v3: Method() is unary — multi-arg form fails router load.
    assert (
        "(Method(`POST`) || Method(`PUT`) || Method(`PATCH`) || Method(`DELETE`))"
        in dynamic
    )
    assert "Method(`POST`,`PUT`,`PATCH`,`DELETE`)" not in dynamic
    assert "PathPrefix(`/api/physics/`)" in dynamic
    assert "PathPrefix(`/api/multi-physics/`)" in dynamic
    assert "PathPrefix(`/api/unified/`)" in dynamic
    assert "PathPrefix(`/api/analytics/`)" in dynamic
    assert "PathPrefix(`/api/simulations/save`)" in dynamic
    assert "PathPrefix(`/api/simulations/share`)" in dynamic
    assert "backend-heavy:" in dynamic
    assert "backend-write:" in dynamic
    assert "priority: 200" in dynamic
    assert "priority: 300" in dynamic
    assert "service: backend@swarm" in dynamic
    # Extra-host (lenr-sim-beta) same-origin routers also get path RL in file.
    assert "backend-extra-{{ loop.index }}-heavy:" in dynamic
    assert "backend-extra-{{ loop.index }}-write:" in dynamic
    # Swarm labels must not redefine heavy/write routers (avoid provider clash).
    assert "routers.backend-heavy.rule=" not in stack
    assert "routers.backend-write.rule=" not in stack
    assert "backend-ratelimit-heavy.ratelimit.average=" not in stack


def test_group_vars_fastapi_workers_pinned_for_lp_h2():
    """Default Swarm replicas ≤2 until shared RL store — honest dilution budget."""
    group_vars = (
        ROOT / "infrastructure" / "ansible" / "group_vars" / "all.yml"
    ).read_text(encoding="utf-8")
    assert "fastapi_workers: 2" in group_vars
    assert "fastapi_workers: 4" not in group_vars


def test_legacy_api_ratelimit_name_not_reintroduced():
    """Old unused `api-ratelimit` name stays gone; live names are backend-ratelimit*."""
    text = DYNAMIC.read_text(encoding="utf-8")
    assert "api-ratelimit:" not in text
    assert "backend-ratelimit:" in text
    assert "backend-ratelimit-heavy:" in text
    assert "backend-ratelimit-write:" in text


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


def _spa_csp_sources():
    """Pages _headers, Swarm nginx, and Traefik SPA middleware must stay in lockstep."""
    headers = (ROOT / "frontend" / "public" / "_headers").read_text(encoding="utf-8")
    nginx = (ROOT / "infrastructure" / "docker" / "nginx.frontend.conf").read_text(
        encoding="utf-8"
    )
    dynamic = DYNAMIC.read_text(encoding="utf-8")
    header_csp = next(
        line.split(":", 1)[1].strip()
        for line in headers.splitlines()
        if "Content-Security-Policy:" in line
    )
    nginx_csp = next(
        line.split('"')[1]
        for line in nginx.splitlines()
        if "set $spa_csp" in line
    )
    start = dynamic.index("spa-security-headers:")
    rest = dynamic[start:]
    end = rest.find("\n    # NOTE:")
    if end == -1:
        end = rest.find("\n    cors:")
    block = rest[: end if end != -1 else len(rest)]
    traefik_csp = next(
        line.split('contentSecurityPolicy:', 1)[1].strip().strip('"')
        for line in block.splitlines()
        if "contentSecurityPolicy:" in line
    )
    return header_csp, nginx_csp, traefik_csp


def test_spa_csp_das_m1_tightened_and_mirrored():
    """DAS-M1: no bare wss: / img-src https:; explicit api wss; three surfaces match."""
    header_csp, nginx_csp, traefik_csp = _spa_csp_sources()
    assert header_csp == nginx_csp == traefik_csp
    csp = header_csp
    assert "img-src 'self' data: blob:;" in csp
    assert "img-src" in csp and "https:" not in csp.split("img-src", 1)[1].split(";", 1)[0]
    assert " wss: " not in f" {csp} "
    assert "wss://api.conscious.energy" in csp
    assert "https://api.conscious.energy" in csp
    assert "https://us.i.posthog.com" in csp
    assert "https://lenr-sim-beta.conscious.energy" in csp
    assert "https://app.conscious.energy" in csp
    assert "script-src 'self'" in csp


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
    # General Swarm router chain uses file-provider middlewares only.
    assert (
        'set _mw_general = "security-headers@file,backend-bodylimit@file,backend-ratelimit@file"'
        in stack
    )
    for line in stack.splitlines():
        if "routers.backend" in line and ".middlewares=" in line:
            assert "backend-bodylimit@file" in line or "_mw_general" in line


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
