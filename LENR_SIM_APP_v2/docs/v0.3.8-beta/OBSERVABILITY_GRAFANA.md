# Observability — Prometheus + Grafana (v0.3.8 prep)

**Goal:** infra/API SLOs and host performance for Swarm cutover, plus a clear
split for **user metrics** (PostHog). Not a second product-analytics warehouse.
Product events stay in **PostHog** (env-gated, no PII in Prometheus).

Placement: KVM1 worker with `node.labels.role == observability`
([`THREE_NODE_SWARM_TOPOLOGY.md`](THREE_NODE_SWARM_TOPOLOGY.md)).

## What we monitor

| Signal | Source | Notes |
|--------|--------|-------|
| API liveness + latency | blackbox → `GET /api/health` | `probe_success`, `probe_duration_seconds` |
| Edge request rates | Traefik Prometheus on overlay `:8082` | Enabled in `traefik.yml.j2`; not public |
| Host CPU / mem / disk | `node-exporter` **global** service | One task per Swarm node |
| Replica / task health | `docker service ps` + Grafana stats | Prefer Swarm-native first |
| Optional API process metrics | `/metrics` on overlay only | Disabled on public Compose |
| **User / product metrics** | **PostHog** | Funnels, SPA events, flags — never scraped into Prom |

## Performance vs user metrics (do not mix)

| Layer | Tool | Examples |
|-------|------|----------|
| Performance / SLO | Grafana + Prometheus | API probe latency, host CPU, Traefik RPS, disk free |
| User behavior | PostHog | page views, theory toggles, simulation runs (env-gated) |

Dashboards must not invent LENR claim scores from uptime. Closing
`EQ-OPEN-*` via charts is forbidden.

## Trust boundaries

- Grafana and Prometheus bind to the **overlay / localhost**; expose via
  Traefik only with Basic Auth or SSO, or SSH tunnel for staging.
- Never put Grafana credentials in git. Use Swarm secrets / Ansible vault.
- CI host (`2012566`) is not scraped as a Swarm node (it is not in the cluster).
- Do not publish Traefik `:8082`, Prometheus `:9090`, or Grafana `:3000` on the
  public Hostinger firewall.

## Stack wiring

Services in
[`docker-stack.yml.j2`](../../infrastructure/ansible/templates/docker-stack.yml.j2)
behind `observability_enabled | default(true)`:

- `prometheus`, `grafana` — pin with `require_observability_label` in prod
- `blackbox` — health probes
- `node-exporter` — `deploy.mode: global`

Config skeletons (no secrets):

- [`infrastructure/observability/prometheus/prometheus.yml`](../../infrastructure/observability/prometheus/prometheus.yml)
- [`infrastructure/observability/prometheus/blackbox.yml`](../../infrastructure/observability/prometheus/blackbox.yml)
- [`infrastructure/observability/grafana/provisioning/`](../../infrastructure/observability/grafana/provisioning/)

Ansible `deploy-stack.yml` rsyncs `infrastructure/observability/` →
`/opt/lenr-sim/observability/` before `docker stack deploy`.

## Staging vs production

| Env | Access |
|-----|--------|
| Staging (KVM1 manager) | SSH tunnel `ssh -L 3000:127.0.0.1:3000 …` or Traefik host `grafana-staging.` + Basic Auth |
| Production | Traefik host `grafana.` (or internal only) with auth; scrape API over overlay |

## Operator bring-up (after labels)

```bash
# On manager — confirm labels
docker node ls -q | xargs -I{} docker node inspect {} --format '{{.Description.Hostname}} {{.Spec.Labels}}'

# After stack deploy
docker service ls | grep -E 'prometheus|grafana|blackbox|node-exporter'
```

Dashboard JSON: API health, probe latency, node CPU/mem, Traefik RPS, plus a
PostHog pointer panel.

## Explicit non-goals

- Replacing PostHog with Grafana for product funnels
- Closing any `EQ-OPEN-*` via uptime charts
- Public unauthenticated metrics endpoints on the Compose share
- Scraping session replay / identify payloads into Prometheus
