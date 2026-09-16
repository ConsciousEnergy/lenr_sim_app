#!/usr/bin/env bash
# Staging Swarm dry-run helper (v0.3.8) — never public cutover.
#
# Default: plan-only. Remote terraform plan / ansible --check require
# EXECUTE=1 and CONFIRM=I_STAGING_0_3_8 plus local credential files.
#
# Usage (repo root):
#   ./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh
#   ./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh local
#   CONFIRM=I_STAGING_0_3_8 EXECUTE=1 \
#     ./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh remote
#
# remote expects (do not commit):
#   LENR_SIM_APP_v2/infrastructure/terraform/backend.hcl
#   LENR_SIM_APP_v2/infrastructure/terraform/staging.tfvars
#   LENR_SIM_APP_v2/infrastructure/ansible/inventory.staging.yml
# Optional env: CLOUDFLARE_API_TOKEN / HOSTINGER_API_TOKEN if tfvars references them.
set -euo pipefail

CONFIRM_TOKEN="I_STAGING_0_3_8"
MODE="${1:-plan}"
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
TF_DIR="LENR_SIM_APP_v2/infrastructure/terraform"
ANSIBLE_DIR="LENR_SIM_APP_v2/infrastructure/ansible"
DEPLOY_SH="LENR_SIM_APP_v2/infrastructure/scripts/deploy.sh"
EVIDENCE_DIR="${STAGING_EVIDENCE_DIR:-/opt/cursor/artifacts}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: missing $1" >&2; exit 2; }; }

print_plan() {
  cat <<EOF
==> Staging Swarm dry-run plan (no public cutover)

# Local (no cloud creds):
./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh local

# Remote plan + ansible --check (credentials on operator/agent machine):
#   copy backend.hcl.example → backend.hcl
#   copy terraform.tfvars.example → staging.tfvars (staging-safe values)
#   copy inventory.yml.example → inventory.staging.yml
CONFIRM=${CONFIRM_TOKEN} EXECUTE=1 \\
  ./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh remote

# Production cutover remains separate:
CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 ./infrastructure/scripts/deploy.sh production
EOF
}

cmd_local() {
  need terraform
  need ansible-playbook
  mkdir -p "$EVIDENCE_DIR"
  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  {
    echo "timestamp_utc=$ts"
    echo "== deploy.sh production (expect exit 2) =="
    set +e
    (cd "$(dirname "$DEPLOY_SH")" && ./deploy.sh production)
    echo "exit=$?"
    echo "== deploy.sh staging wrong confirm (expect exit 2) =="
    (cd "$(dirname "$DEPLOY_SH")" && CONFIRM_SWARM_0_3_8=WRONG ./deploy.sh staging)
    echo "exit=$?"
    set -e
    echo "== terraform init -backend=false + validate =="
    (
      cd "$TF_DIR"
      terraform init -backend=false -input=false
      terraform validate
    )
    echo "== ansible syntax-check =="
    (
      cd "$ANSIBLE_DIR"
      ansible-playbook --syntax-check playbooks/deploy-stack.yml
      ansible-playbook --syntax-check playbooks/site.yml
    )
  } | tee "$EVIDENCE_DIR/staging_swarm_local_dry_run.log"
  echo "OK: local staging dry-run evidence → $EVIDENCE_DIR/staging_swarm_local_dry_run.log"
}

cmd_remote() {
  if [[ "${CONFIRM:-}" != "$CONFIRM_TOKEN" ]]; then
    echo "ERROR: refuse remote without CONFIRM=${CONFIRM_TOKEN}" >&2
    exit 2
  fi
  if [[ "${EXECUTE:-0}" != "1" ]]; then
    echo "ERROR: refuse remote without EXECUTE=1" >&2
    exit 2
  fi
  need terraform
  need ansible-playbook
  [[ -f "$TF_DIR/backend.hcl" ]] || { echo "ERROR: missing $TF_DIR/backend.hcl" >&2; exit 2; }
  [[ -f "$TF_DIR/staging.tfvars" ]] || { echo "ERROR: missing $TF_DIR/staging.tfvars" >&2; exit 2; }
  [[ -f "$ANSIBLE_DIR/inventory.staging.yml" ]] || { echo "ERROR: missing $ANSIBLE_DIR/inventory.staging.yml" >&2; exit 2; }

  mkdir -p "$EVIDENCE_DIR"
  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  {
    echo "timestamp_utc=$ts"
    echo "== terraform init (remote backend) + workspace staging + plan =="
    (
      cd "$TF_DIR"
      terraform init -backend-config=backend.hcl -input=false
      terraform workspace select staging 2>/dev/null || terraform workspace new staging
      terraform plan -var-file=staging.tfvars -out="$EVIDENCE_DIR/staging.tfplan"
    )
    echo "== ansible-playbook --check --diff =="
    (
      cd "$ANSIBLE_DIR"
      ansible-playbook --check --diff \
        -i inventory.staging.yml \
        playbooks/deploy-stack.yml
    )
    echo "NOTE: no terraform apply / no public cutover performed"
  } | tee "$EVIDENCE_DIR/staging_swarm_remote_dry_run.log"
  echo "OK: remote staging dry-run evidence → $EVIDENCE_DIR/staging_swarm_remote_dry_run.log"
}

case "$MODE" in
  plan|"") print_plan ;;
  local) cmd_local ;;
  remote) cmd_remote ;;
  *)
    echo "Usage: $0 [plan|local|remote]" >&2
    exit 2
    ;;
esac
