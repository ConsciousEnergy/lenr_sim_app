# Observability — Prometheus + Grafana (v0.3.8 prep)

**Goal:** infra/API SLOs and host health for Swarm cutover — not a second
product-analytics warehouse. Product events stay in **PostHog** (env-gated,
no PII in Prometheus).

Placement: KVM1 worker with `node.labels.role == observability`
([`THREE_NODE_SWARM_TOPOLOGY.md`](THREE_NODE_SWARM_TOPOLOGY.md)).

## What we monitor

| Signal | Source | Notes |
|--------|--------|-------|
| API liveness | `GET /api/health` via blackbox or Traefik healthcheck | Always available |
| API process metrics | Optional `/metrics` on overlay only | Disabled on public Compose; enable only on Swarm private network |
| Replica / task health | Docker / cAdvisor or `docker service ps` exporters | Prefer Swarm-native first |
| Host CPU / mem / disk | node_exporter on each Swarm node | Scrape from Prometheus on KVM1 |
| Traefik request rates | Traefik metrics endpoint (internal) | Do not expose unauthenticated |
| Product usage | PostHog | Separate system; do not scrape session payloads into Prom |

## Trust boundaries

- Grafana and Prometheus bind to the **overlay / localhost**; expose via
  Traefik only with Basic Auth or SSO, or SSH tunnel for staging.
- Never put Grafana credentials in git. Use Swarm secrets / Ansible vault.
- CI host (`2012566`) is not scraped as a Swarm node (it is not in the cluster).

## Stack wiring

Example services live in
[`docker-stack.yml.j2`](../../infrastructure/ansible/templates/docker-stack.yml.j2)
behind `observability_enabled | default(true)` for Swarm environments.

Config skeletons (no secrets):

- [`infrastructure/observability/prometheus/prometheus.yml`](../../infrastructure/observability/prometheus/prometheus.yml)
- [`infrastructure/observability/grafana/provisioning/`](../../infrastructure/observability/grafana/provisioning/)

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
docker service ls | grep -E 'prometheus|grafana'
```

Dashboards ship as JSON under Grafana provisioning (API health, service
replicas, node CPU/mem). Extend them; do not invent LENR claim scores.

## Explicit non-goals

- Replacing PostHog with Grafana for product funnels
- Closing any `EQ-OPEN-*` via uptime charts
- Public unauthenticated metrics endpoints on the Compose share
