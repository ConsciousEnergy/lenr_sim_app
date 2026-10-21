#!/usr/bin/env bash
# Manual Swarm node label helper (v0.3.8+).
# Prefer Ansible playbooks/join-workers.yml with inventory swarm_node_labels.
#
# Label contract (separate keys — Swarm allows one value per key):
#   app=true
#   observability=true
#
# Usage (on a Swarm manager):
#   ./label-swarm-nodes.sh <node_id_or_hostname> app
#   ./label-swarm-nodes.sh <node_id_or_hostname> app,observability
set -euo pipefail

NODE="${1:-}"
LABELS="${2:-}"

if [[ -z "$NODE" || -z "$LABELS" ]]; then
  cat >&2 <<'EOF'
Usage: label-swarm-nodes.sh <node_id_or_hostname> <label[,label…]>

Labels: app | observability
Examples:
  label-swarm-nodes.sh share-host app
  label-swarm-nodes.sh kvm1-host app,observability
EOF
  exit 2
fi

if ! docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null | grep -qx active; then
  echo "ERROR: must run on an active Swarm node (manager preferred)" >&2
  exit 2
fi

NODE_ID="$NODE"
if ! docker node inspect "$NODE_ID" >/dev/null 2>&1; then
  NODE_ID="$(docker node ls -q | while read -r id; do
    host="$(docker node inspect "$id" --format '{{.Description.Hostname}}')"
    if [ "$host" = "$NODE" ]; then echo "$id"; break; fi
  done)"
fi

if [[ -z "$NODE_ID" ]]; then
  echo "ERROR: could not resolve node '$NODE'" >&2
  exit 2
fi

IFS=',' read -ra PARTS <<< "$LABELS"
for raw in "${PARTS[@]}"; do
  label="$(echo "$raw" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
  case "$label" in
    app|app=true)
      docker node update --label-add app=true "$NODE_ID"
      ;;
    observability|observability=true|obs)
      docker node update --label-add observability=true "$NODE_ID"
      ;;
    *)
      echo "ERROR: unknown label '$raw' (use app or observability)" >&2
      exit 2
      ;;
  esac
done

docker node inspect "$NODE_ID" --format '{{.Description.Hostname}} {{json .Spec.Labels}}'
echo "OK: labels applied on $NODE_ID"
