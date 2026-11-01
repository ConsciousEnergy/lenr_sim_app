# Observability scaffolds (Prometheus + Grafana + blackbox + node_exporter + cAdvisor)

Copied by Ansible `deploy-stack.yml` (and operators) to
`/opt/lenr-sim/observability/` on Swarm nodes. Stack services are defined in
`ansible/templates/docker-stack.yml.j2` when `observability_enabled=true`.
Pin with `require_observability_label=true` → Swarm label `observability=true`
(applied by `playbooks/join-workers.yml`; separate from `app=true`).

| Path | Role |
|------|------|
| `prometheus/prometheus.yml` | Scrape jobs (overlay + `api.conscious.energy` + share; staging TLS retired) |
| `prometheus/blackbox.yml` | HTTP 2xx + healthy-body module |
| `grafana/provisioning/datasources/` | Prometheus datasource (`uid: prometheus`) |
| `grafana/provisioning/dashboards/json/` | Overview, Services, Edge dashboards |
| `grafana/provisioning/alerting/` | Unified alert rules + email contact point |

Docs: [`docs/v0.3.8-beta/OBSERVABILITY_GRAFANA.md`](../../docs/v0.3.8-beta/OBSERVABILITY_GRAFANA.md).

**No secrets in this tree.** Grafana admin / SMTP passwords via vault / Swarm
secrets (`grafana_admin_password`, optional `grafana_smtp_password`).
User/product metrics stay in PostHog — not scraped here.
