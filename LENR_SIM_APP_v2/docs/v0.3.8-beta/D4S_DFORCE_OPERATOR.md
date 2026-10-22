# D-Force (d4s) — Swarm / Compose operator TUI

**What it is:** [D-Force](https://d4scli.io/) (`d4s`, pronounced *D-Force*) is a
keyboard-driven terminal UI for Docker **containers, Compose projects, and Swarm
nodes/stacks/services/tasks** — the Swarm-side analogue of Kubernetes **k9s**.
Upstream: [`jr-k/d4s`](https://github.com/jr-k/d4s) (Apache-2.0).

**Role in this repo:** optional **operator aid** for day-2 inspection (logs,
replicas, nodes). It is **not** required for cutover, Ansible apply, or CI.
Canonical apply path remains gated scripts + playbooks under
`CONFIRM_SWARM_*`. Observability SLOs stay in Prometheus/Grafana
([`OBSERVABILITY_GRAFANA.md`](OBSERVABILITY_GRAFANA.md)).

## When to use it

| Situation | Prefer |
|-----------|--------|
| Live cutover / drain / leave / restore | Gated scripts (`swarm-039-*.sh`) + Ansible |
| Staging Swarm on KVM1 (sslip) — browse services/tasks | `d4s` against staging manager (or SSH tunnel) |
| Post-cutover share manager + KVM1 worker — inspect stack | `d4s` via Docker context / SSH to **share manager only** |
| Product / API SLOs | Grafana + Prometheus (overlay; not public) |
| PR CI host | **Never** — CI node must not join Swarm and must not get deploy sockets |

**Before arming `CONFIRM_SWARM_0_3_9`:** install `d4s` on the operator
workstation and confirm it can list the staging stack (nodes/services). Pair with
Grafana login via SSH tunnel ([`OBSERVABILITY_GRAFANA.md`](OBSERVABILITY_GRAFANA.md)
pre-arm checklist). Cutover prep notes whether `d4s` is on PATH (optional OK).

## Install (operator laptop or bastion)

Official quick install (places binary in the path you pass):

```bash
curl -fsSL https://d4scli.io/install.sh | sh -s -- ~/.local/bin
# or Homebrew: brew install jr-k/d4s/d4s
d4s version
```

Prefer installing on an **operator workstation**, not baking into app images.
Do not commit binaries or API keys.

## Connect to our topology

Topology SOT: [`THREE_NODE_SWARM_TOPOLOGY.md`](THREE_NODE_SWARM_TOPOLOGY.md).

| Host | Role today | `d4s` guidance |
|------|------------|----------------|
| Share `185.211.4.66` | Compose beta now → Swarm **manager** after 0.3.9 cutover | After Swarm init: Docker context / SSH to manager; browse stack `lenr-sim` |
| KVM1 `31.220.55.113` | Staging Swarm manager now → prod **worker** after cutover | Staging: useful for `lenr-sim` services. After cutover: prefer manager API on share (worker has no Raft control plane) |
| CI `45.93.100.251` | `lenr-ci-1` only | **Do not** point `d4s` / Docker contexts here |

Example: SSH tunnel to staging manager Docker socket (adjust user/key), then
local `d4s` against the forwarded host — or use a Docker `ssh://` context if
your CLI already has one. Keep `DOCKER_HOST` / contexts out of git and Slack.

```bash
# Illustrative — use your existing SHARE_/KVM1_ SSH keys from inventory
# After cutover, prefer the share manager for cluster-wide Swarm views:
ssh -i "$HOME/.ssh/lenr-sim-share" -L 2375:/var/run/docker.sock \
  root@185.211.4.66 -N
# In another terminal (TLS not enabled on that local forward — laptop only):
DOCKER_HOST=tcp://127.0.0.1:2375 d4s
```

Safer long-term: a named `docker context` with `ssh://root@185.211.4.66` (or
staging IP) and `d4s --context <name>` so the socket never listens on TCP.

## What to look at for LENR Swarm

After stack deploy (staging or post-cutover):

1. **Nodes** — share manager Ready + KVM1 worker Ready; CI absent.
2. **Stack / services** — `lenr-sim_*` replicas (Traefik, backend, frontend,
   postgres, prometheus, grafana, blackbox, node-exporter).
3. **Tasks** — postgres on the **share** node (`postgres=true` volume pin);
   observability tasks on KVM1 (`observability=true`).
4. **Logs** — Traefik ACME / backend crash loops during settle window.

Complement (do not replace) with:

```bash
ALLOW_API_DNS_GAP=1 \
  ./LENR_SIM_APP_v2/infrastructure/scripts/swarm-039-post-cutover-verify.sh
```

## Safety rules

- Treat destructive TUI actions (delete service, prune, leave Swarm) like raw
  `docker` — **confirm strings and cutover scripts still own production apply**.
- Do not use `d4s` to “fix” a failed cutover by deleting the external
  `lenr-sim_postgres_data` volume.
- Do not expose the Docker socket publicly; tunnel or SSH context only.
- Product analytics remain **PostHog**; infra SLOs remain **Grafana/Prometheus**.
  Closing `EQ-OPEN-*` via a TUI is forbidden.

## Related docs

- [`SWARM_OPERATOR_LAB.md`](SWARM_OPERATOR_LAB.md) — file walkthrough without live cutover
- [`OBSERVABILITY_GRAFANA.md`](OBSERVABILITY_GRAFANA.md) — Prom/Grafana placement
- [`../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`](../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md) — confirm-gated cutover
- Upstream: https://d4scli.io/ · https://github.com/jr-k/d4s
