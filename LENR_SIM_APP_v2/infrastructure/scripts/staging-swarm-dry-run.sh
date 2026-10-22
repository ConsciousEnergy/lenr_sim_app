#!/usr/bin/env bash
# Staging Swarm dry-run helper (v0.3.8) — never public cutover.
#
# Default: plan-only. Remote terraform plan / ansible --check require
# EXECUTE=1 and CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8 plus local credential files.
# Legacy alias: CONFIRM=I_STAGING_0_3_8 (still accepted).
#
# Usage (repo root):
#   ./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh
#   ./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh local
#   CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8 EXECUTE=1 \
#     ./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh remote
#
# remote expects (do not commit):
#   LENR_SIM_APP_v2/infrastructure/terraform/backend.hcl
#   LENR_SIM_APP_v2/infrastructure/terraform/staging.tfvars
#   LENR_SIM_APP_v2/infrastructure/ansible/inventory.staging.yml
# Copy from *.example / staging.tfvars.example / inventory.staging.yml.example.
# Optional env: CLOUDFLARE_API_TOKEN / HOSTINGER_API_TOKEN if tfvars references them.
set -euo pipefail

CONFIRM_TOKEN="I_STAGING_0_3_8"
# Primary: CONFIRM_SWARM_0_3_8 (matches deploy.sh). Alias: CONFIRM.
_EFFECTIVE_CONFIRM="${CONFIRM_SWARM_0_3_8:-${CONFIRM:-}}"
MODE="${1:-plan}"
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
TF_DIR="LENR_SIM_APP_v2/infrastructure/terraform"
ANSIBLE_DIR="LENR_SIM_APP_v2/infrastructure/ansible"
DEPLOY_SH="LENR_SIM_APP_v2/infrastructure/scripts/deploy.sh"
# Prefer agent artifact dir when writable; else repo-local / CI temp via STAGING_EVIDENCE_DIR.
if [[ -n "${STAGING_EVIDENCE_DIR:-}" ]]; then
  EVIDENCE_DIR="$STAGING_EVIDENCE_DIR"
elif [[ -d /opt/cursor/artifacts && -w /opt/cursor/artifacts ]]; then
  EVIDENCE_DIR="/opt/cursor/artifacts"
else
  EVIDENCE_DIR="${ROOT}/.staging-evidence"
fi

need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: missing $1" >&2; exit 2; }; }

print_plan() {
  cat <<EOF
==> Staging Swarm dry-run plan (no public cutover)

# Local (no cloud creds):
./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh local

# Remote plan + ansible --check (credentials on operator/agent machine):
#   copy backend.hcl.example → backend.hcl
#   copy staging.tfvars.example → staging.tfvars (staging-safe values)
#   copy inventory.staging.yml.example → inventory.staging.yml
CONFIRM_SWARM_0_3_8=${CONFIRM_TOKEN} EXECUTE=1 \\
  ./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh remote

# Staging apply (separate; not this helper):
CONFIRM_SWARM_0_3_8=${CONFIRM_TOKEN} ./LENR_SIM_APP_v2/infrastructure/scripts/deploy.sh staging

# Production cutover remains separate (v0.3.9 train):
CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 ./LENR_SIM_APP_v2/infrastructure/scripts/deploy.sh production
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
      # .yml.example is not auto-detected as YAML inventory; materialize a temp .yml.
      inv_tmp="$(mktemp -t staging-inv.XXXXXX.yml)"
      trap 'rm -f "$inv_tmp"' EXIT
      if [[ -f inventory.staging.yml ]]; then
        cp inventory.staging.yml "$inv_tmp"
      else
        cp inventory.staging.yml.example "$inv_tmp"
      fi
      ansible-playbook --syntax-check -i "$inv_tmp" playbooks/deploy-stack.yml
      ansible-playbook --syntax-check -i "$inv_tmp" playbooks/site.yml
      ansible-playbook --syntax-check -i "$inv_tmp" playbooks/join-workers.yml
      ansible-playbook --syntax-check -i "$inv_tmp" playbooks/setup-docker.yml
      ansible-playbook --syntax-check -i "$inv_tmp" playbooks/leave-staging-swarm.yml
      ansible-playbook --syntax-check -i "$inv_tmp" playbooks/backup.yml
    )
  } | tee "$EVIDENCE_DIR/staging_swarm_local_dry_run.log"
  echo "OK: local staging dry-run evidence → $EVIDENCE_DIR/staging_swarm_local_dry_run.log"
}

cmd_remote() {
  if [[ "$_EFFECTIVE_CONFIRM" != "$CONFIRM_TOKEN" ]]; then
    echo "ERROR: refuse remote without CONFIRM_SWARM_0_3_8=${CONFIRM_TOKEN}" >&2
    echo "(legacy alias CONFIRM=${CONFIRM_TOKEN} is also accepted)" >&2
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
    echo "confirm_source=${CONFIRM_SWARM_0_3_8:+CONFIRM_SWARM_0_3_8}${CONFIRM_SWARM_0_3_8:-${CONFIRM:+CONFIRM}}"
    echo "== terraform init (remote backend) + workspace staging + plan =="
    (
      cd "$TF_DIR"
      terraform init -backend-config=backend.hcl -input=false
      terraform workspace select staging 2>/dev/null || terraform workspace new staging
      terraform plan -var-file=staging.tfvars -out="$EVIDENCE_DIR/staging.tfplan"
    )
    echo "== ansible-playbook --check --diff (setup-docker + join-workers + deploy-stack) =="
    (
      cd "$ANSIBLE_DIR"
      ansible-playbook --syntax-check -i inventory.staging.yml playbooks/join-workers.yml
      ansible-playbook --check --diff \
        -i inventory.staging.yml \
        playbooks/deploy-stack.yml
    )
    echo "NOTE: no terraform apply / no Swarm apply / no public cutover performed"
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
