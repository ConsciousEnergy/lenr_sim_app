#!/usr/bin/env bash
# Print the KVM1 Phase 0 checklist (no secrets). Usage: run from anywhere.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
DOC="${ROOT:-.}/LENR_SIM_APP_v2/docs/v0.3.8-beta/KVM1_OPERATOR_WALKTHROUGH.md"
cat <<EOF
==> KVM1 bootstrap checklist (manual)

1. Hostinger: note VPS id + public IPv4 (private ops notes only)
2. Rotate root password in panel (never commit / never paste into git)
3. ssh-copy-id your staging key; disable PasswordAuthentication
4. Firewall: 22 (admin IP), Swarm ports, 80/443 only if staging edge
5. Fill untracked inventory.staging.yml with KVM1 IP (not CI / not share)
6. ./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh local
7. Staging apply only under CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8

Full walkthrough: ${DOC}
Topology: LENR_SIM_APP_v2/docs/v0.3.8-beta/THREE_NODE_SWARM_TOPOLOGY.md
EOF
