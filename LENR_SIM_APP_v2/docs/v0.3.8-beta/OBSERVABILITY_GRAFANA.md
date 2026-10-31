# Observability — Prometheus + Grafana (Swarm train)

**Goal:** infra/API SLOs and host/container performance for Swarm staging and
post-cutover, plus a clear split for **user metrics** (PostHog). Not a second
product-analytics warehouse. Product events stay in **PostHog** (env-gated, no
PII in Prometheus).

Markers: scaffolds ship on **`dev` / 0.3.9-beta**. Live Compose share on
**`main` / 0.3.8-beta** stays Compose+Caddy; Grafana for Swarm runs on KVM1.

Placement: KVM1 worker with `node.labels.observability == true`
(separate from `app=true` — Swarm allows one value per label key).
Hardware ↔ Swarm diagrams (SOT):
[`THREE_NODE_SWARM_TOPOLOGY.md`](THREE_NODE_SWARM_TOPOLOGY.md)
(Architecture diagrams — Container view + Persistent storage).
Labels applied by [`join-workers.yml`](../../infrastructure/ansible/playbooks/join-workers.yml).

## What we monitor

| Signal | Source | Notes |
|--------|--------|-------|
| API liveness + latency | blackbox → `GET /api/health` | Overlay `backend`, `api-staging` TLS, Compose share |
| Edge request rates / 5xx | Traefik Prometheus on overlay `:8082` | Not public |
| Host CPU / mem / disk | `node-exporter` **global** | One task per Swarm node |
| Container CPU / mem | `cadvisor` **global** | Swarm service name labels |
| Replica / task health | `docker service ps` + **D4S** + Grafana | Prefer Swarm-native for tasks |
| Optional API process metrics | `/metrics` on overlay only | Disabled on public Compose |
| **User / product metrics** | **PostHog** | Funnels, SPA events, flags — never scraped into Prom |

## Dashboards (provisioned)

Folder **LENR-Sim** (file provider):

| UID | Title | Focus |
|-----|-------|-------|
| `lenr-swarm-overview` | LENR-Sim Swarm Overview | Health strip, latency, host CPU/mem/disk, Traefik RPS/5xx, cAdvisor summary |
| `lenr-swarm-services` | LENR-Sim Swarm Services | Per-`lenr-sim_*` container CPU/mem |
| `lenr-swarm-edge` | LENR-Sim Swarm Edge | Public probes + Traefik entrypoint/code panels |

## Alerting (Grafana unified)

Rules live under
[`infrastructure/observability/grafana/provisioning/alerting/`](../../infrastructure/observability/grafana/provisioning/alerting/).
They appear in **Alerting → Firing** over the SSH tunnel.

| Rule | Severity | Intent |
|------|----------|--------|
| `LenrApiHealthDown` | critical | Overlay and/or api-staging probe fail 2m |
| `LenrShareProbeDown` | warning | Share public probe fail 5m |
| `LenrTraefikScrapeDown` | critical | Traefik scrape `up != 1` |
| `LenrTraefik5xxHigh` | warning | 5xx rate > 0.5/s for 5m |
| `LenrNodeDiskLow` | warning | Root FS free < 15% |
| `LenrNodeExporterMissing` | critical | No node_exporter targets up |

### Email

Contact point `lenr-ops-email` → `ops@conscious.energy` (override via
provisioning). **Delivery** needs SMTP on the Grafana service:

1. Set inventory / `-e`:
   - `grafana_smtp_enabled: true`
   - `grafana_smtp_host` (e.g. `smtp.sendgrid.net:587`)
   - `grafana_smtp_user` / `grafana_smtp_from` / `grafana_alert_to`
2. Mint Swarm secret (never commit):
   ```bash
   # on KVM1 manager — or let deploy-stack.yml generate once when enabled
   printf '%s' "$SMTP_PASS" | docker secret create grafana_smtp_password -
   ```
3. Redeploy staging with `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8` only.

Default `grafana_smtp_enabled: false` so stacks start without SMTP. Rules still
**fire in the UI**.

## Performance vs user metrics (do not mix)

| Layer | Tool | Examples |
|-------|------|----------|
| Performance / SLO | Grafana + Prometheus | API probe latency, host CPU, Traefik RPS, disk free, cAdvisor |
| User behavior | PostHog | page views, theory toggles, simulation runs (env-gated) |

Dashboards must not invent LENR claim scores from uptime. Closing
`EQ-OPEN-*` via charts is forbidden.

## Trust boundaries

- Grafana and Prometheus bind to the **overlay / localhost**; expose via
  Traefik only with Basic Auth or SSO, or SSH tunnel for staging.
- Never put Grafana credentials in git. Use Swarm secret `grafana_admin_password`
  (`GF_SECURITY_ADMIN_PASSWORD__FILE`). Cutover imports `GRAFANA_ADMIN_PASSWORD`
  from share `.env` or mints one into `/opt/lenr-sim/.grafana-admin-password`
  (mode `600`). Ansible `deploy-stack.yml` can mint if the secret is missing.
- SMTP password: Swarm secret `grafana_smtp_password` only when
  `grafana_smtp_enabled=true`.
- CI host (`2012566`) is not scraped as a Swarm node (it is not in the cluster).
- Do not publish Traefik `:8082`, Prometheus `:9090`, Grafana `:3000`, or
  cAdvisor on the public Hostinger firewall.

## Stack wiring

Services in
[`docker-stack.yml.j2`](../../infrastructure/ansible/templates/docker-stack.yml.j2)
behind `observability_enabled | default(true)`:

- `prometheus`, `grafana` — pin with `require_observability_label` →
  `node.labels.observability == true` in prod
- `blackbox` — health probes (same observability constraint when required)
- `node-exporter` — `deploy.mode: global`
- `cadvisor` — `deploy.mode: global`
- Staging default: `observability_enabled=true`,
  `require_observability_label=false` (single-node KVM1)

Config skeletons (no secrets):

- [`infrastructure/observability/prometheus/prometheus.yml`](../../infrastructure/observability/prometheus/prometheus.yml)
- [`infrastructure/observability/prometheus/blackbox.yml`](../../infrastructure/observability/prometheus/blackbox.yml)
- [`infrastructure/observability/grafana/provisioning/`](../../infrastructure/observability/grafana/provisioning/)

Ansible `deploy-stack.yml` rsyncs `infrastructure/observability/` →
`/opt/lenr-sim/observability/` before `docker stack deploy`. Prefer prestaging
that tree onto share + KVM1 before the cutover window; cutover prep asserts the
files exist (override with `ALLOW_OBS_PRESTAGE_GAP=1`).

## Staging vs production

| Env | Access |
|-----|--------|
| Staging (KVM1 manager) | SSH tunnel `ssh -L 3000:127.0.0.1:3000 …` — `grafana_publish_host_port: 3000` (host-mode). Docker bypasses UFW; `deploy-stack.yml` installs **DOCKER-USER DROP** for :3000 from non-`lo`. |
| Production (after 0.3.9) | Same localhost tunnel path on the observability worker (KVM1); Traefik `grafana.` stays off by default |

### Pre-arm checklist (before `CONFIRM_SWARM_0_3_9`)

1. Staging stack has Grafana **1/1**, Prometheus **1/1**, cAdvisor global on KVM1.
2. Swarm secret `grafana_admin_password` exists (mint via `deploy-stack.yml`).
3. `curl … http://127.0.0.1:3000/login` on KVM1 → **200** (SSH tunnel target).
4. From outside KVM1, `http://<kvm1-public-ip>:3000` must **not** return 200 (DOCKER-USER / cutover prep asserts).
5. Share + KVM1 have `/opt/lenr-sim/observability/` scaffolds (cutover prep asserts).
6. Optional: install D-Force (`d4s`) on the **operator laptop** — see [`D4S_DFORCE_OPERATOR.md`](D4S_DFORCE_OPERATOR.md). Not a VM package.
7. Optional email: `grafana_smtp_enabled=true` + `grafana_smtp_password` secret.

Refresh staging (does **not** arm 0.3.9):

```bash
CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8 \
  ./LENR_SIM_APP_v2/infrastructure/scripts/deploy.sh staging
```

## Operator bring-up (after labels)

```bash
# On manager — confirm labels
docker node ls -q | xargs -I{} docker node inspect {} --format '{{.Description.Hostname}} {{.Spec.Labels}}'

# After stack deploy
docker service ls | grep -E 'prometheus|grafana|blackbox|node-exporter|cadvisor'
```

## Explicit non-goals

- Replacing PostHog with Grafana for product funnels
- Closing any `EQ-OPEN-*` via uptime charts
- Public unauthenticated metrics endpoints on the Compose share
- Scraping session replay / identify payloads into Prometheus
- Separate Alertmanager service in v1 (Grafana unified alerting only)
