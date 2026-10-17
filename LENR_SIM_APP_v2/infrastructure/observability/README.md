# Observability scaffolds (Prometheus + Grafana)

Copied by operators to `/opt/lenr-sim/observability/` on the node labeled
`role=observability` (KVM1). Stack services are defined in
`ansible/templates/docker-stack.yml.j2` when `observability_enabled=true`.

Docs: [`docs/v0.3.8-beta/OBSERVABILITY_GRAFANA.md`](../../docs/v0.3.8-beta/OBSERVABILITY_GRAFANA.md).

**No secrets in this tree.** Grafana admin password via vault / Swarm secret.
