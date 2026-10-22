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

# Assert cutover stack render invariants (postgres pin, external volume, SPA PathPrefix).
# Args: path to rendered docker-stack.yml
assert_prod_stack_render() {
  local rendered="$1"
  local fail=0
  grep -q 'node.labels.postgres == true' "$rendered" \
    || { echo "FAIL: missing postgres placement constraint"; fail=1; }
  grep -q 'name: "lenr-sim_postgres_data"' "$rendered" \
    || { echo "FAIL: missing external volume name lenr-sim_postgres_data"; fail=1; }
  grep -q 'external: true' "$rendered" \
    || { echo "FAIL: postgres_data volume not marked external"; fail=1; }
  grep -qF 'PathPrefix(`/api`)' "$rendered" \
    || { echo "FAIL: missing SPA/API PathPrefix(`/api`) router rule"; fail=1; }
  grep -qF 'Host(`lenr-sim-beta.conscious.energy`)' "$rendered" \
    || { echo "FAIL: missing SPA host lenr-sim-beta.conscious.energy"; fail=1; }
  grep -qE 'lenr-sim-frontend|routers\.frontend' "$rendered" \
    || { echo "FAIL: frontend/SPA service missing from render"; fail=1; }
  if [[ "$fail" -ne 0 ]]; then
    echo "ERROR: prod stack render invariants failed — see $rendered" >&2
    return 1
  fi
  echo "OK: prod stack render invariants (postgres pin, external volume, SPA PathPrefix)"
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
    echo "== ansible syntax-check (staging inventory) =="
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
      ansible-playbook --syntax-check -i "$inv_tmp" playbooks/drain-compose-share.yml
    )
    echo "== ansible syntax-check + prod stack render (inventory.yml.example) =="
    (
      cd "$ANSIBLE_DIR"
      prod_inv="$(mktemp -t prod-inv.XXXXXX.yml)"
      # Render to /tmp first — some evidence mounts reject ansible atomic rename.
      stack_tmp="$(mktemp -t docker-stack-prod.XXXXXX.yml)"
      stack_out="$EVIDENCE_DIR/docker-stack-prod-render.yml"
      render_pb="playbooks/.ci-render-prod-stack.yml"
      trap 'rm -f "$prod_inv" "$render_pb" "$stack_tmp"' EXIT
      cp inventory.yml.example "$prod_inv"
      # CI node must never appear as a Swarm host.
      if grep -vE '^[[:space:]]*#' "$prod_inv" | grep -qE '45\.93\.100\.251|2012566'; then
        echo "ERROR: prod inventory.yml.example lists CI node — refuse" >&2
        exit 1
      fi
      ansible-playbook --syntax-check -i "$prod_inv" playbooks/deploy-stack.yml
      ansible-playbook --syntax-check -i "$prod_inv" playbooks/join-workers.yml
      ansible-playbook --syntax-check -i "$prod_inv" playbooks/setup-docker.yml
      ansible-playbook --syntax-check -i "$prod_inv" playbooks/drain-compose-share.yml
      # Write under playbooks/ so relative template paths match deploy-stack.yml.
      cat >"$render_pb" <<'EOF'
---
# Local-only render of docker-stack.yml.j2 for cutover invariant gates (no SSH).
# Generated by staging-swarm-dry-run.sh local; not committed.
- hosts: swarm_managers
  connection: local
  gather_facts: false
  become: false
  tasks:
    - name: Render production Docker stack from inventory host vars
      ansible.builtin.template:
        src: ../templates/docker-stack.yml.j2
        dest: "{{ stack_render_dest }}"
      run_once: true
EOF
      ansible-playbook -i "$prod_inv" -c local \
        -e "stack_render_dest=$stack_tmp" \
        "$render_pb"
      assert_prod_stack_render "$stack_tmp"
      cp -f "$stack_tmp" "$stack_out"
      echo "rendered_stack=$stack_out"
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
