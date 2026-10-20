# Observability scaffolds (Prometheus + Grafana + blackbox + node_exporter)

Copied by Ansible `deploy-stack.yml` (and operators) to
`/opt/lenr-sim/observability/` on Swarm nodes. Stack services are defined in
`ansible/templates/docker-stack.yml.j2` when `observability_enabled=true`.

| Path | Role |
|------|------|
| `prometheus/prometheus.yml` | Scrape jobs (health probe, Traefik, node) |
| `prometheus/blackbox.yml` | HTTP 2xx + healthy-body module |
| `grafana/provisioning/` | Datasource + Swarm overview dashboard |

Docs: [`docs/v0.3.8-beta/OBSERVABILITY_GRAFANA.md`](../../docs/v0.3.8-beta/OBSERVABILITY_GRAFANA.md).

**No secrets in this tree.** Grafana admin password via vault / Swarm secret.
User/product metrics stay in PostHog — not scraped here.
