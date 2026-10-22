#!/bin/bash
# LENR Simulation App - Full Deployment Script (Swarm / Terraform / Ansible)
# Usage: ./deploy.sh [production|staging] [--app-only]
#
# v0.3.7-beta / Compose share: infrastructure/vps/ (not this script).
# Swarm/Pages public cutover target is v0.3.9-beta.
# Staging (0.3.8): CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8 ./deploy.sh staging
# Production:     CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 ./deploy.sh production
#
# Staging uses inventory.staging.yml + staging.tfvars (never prod inventory/tfvars).

set -euo pipefail

ENVIRONMENT=${1:-production}
APP_ONLY=${2:-}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform"
ANSIBLE_DIR="$PROJECT_ROOT/infrastructure/ansible"
SECRETS_FILE="${SCRIPT_DIR}/.secrets.env"

_confirm_038="${CONFIRM_SWARM_0_3_8:-}"
_confirm_039="${CONFIRM_SWARM_0_3_9:-}"

if [[ "$ENVIRONMENT" == "staging" ]]; then
  if [[ "$_confirm_038" != "I_CUTOVER_0_3_8" && "$_confirm_038" != "I_STAGING_0_3_8" ]]; then
    cat >&2 <<'EOF'
ERROR: staging Swarm path requires:
  CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8 ./deploy.sh staging
(or legacy I_CUTOVER_0_3_8 for staging-only experiments).
Public Compose share must remain on infrastructure/vps/scripts/.
EOF
    exit 2
  fi
  INVENTORY_FILE="$ANSIBLE_DIR/inventory.staging.yml"
  TFVARS_FILE="$TERRAFORM_DIR/staging.tfvars"
  TF_WORKSPACE="staging"
elif [[ "$ENVIRONMENT" == "production" ]]; then
  if [[ "$_confirm_039" != "I_CUTOVER_0_3_9" ]]; then
    cat >&2 <<'EOF'
ERROR: production Swarm/Pages cutover is gated for v0.3.9-beta.

Public beta Compose path:
  LENR_SIM_APP_v2/infrastructure/vps/scripts/

Staging dry-run (0.3.8):
  CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8 ./deploy.sh staging

Production multi-node cutover (0.3.9 target) — use the cutover executor
(drain Compose, leave staging, import .env secrets, join worker):
  CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 EXECUTE=1 \
    ./infrastructure/scripts/swarm-039-cutover.sh
EOF
    exit 2
  fi
  # Do NOT run Terraform + random POSTGRES_PASSWORD against the live share.
  # That path skips drain/leave/secret-import and breaks postgres_volume_external.
  cat <<EOF
==========================================
Production cutover → swarm-039-cutover.sh
==========================================
Delegating (CONFIRM set). Set EXECUTE=0 for dry-run plan only.
EOF
  export CONFIRM_SWARM_0_3_9="$_confirm_039"
  export EXECUTE="${EXECUTE:-1}"
  exec "$SCRIPT_DIR/swarm-039-cutover.sh"
else
  echo "ERROR: ENVIRONMENT must be staging or production (got: $ENVIRONMENT)" >&2
  exit 2
fi

echo "=========================================="
echo "LENR Simulation App Deployment"
echo "Environment: $ENVIRONMENT"
echo "Inventory:   $INVENTORY_FILE"
echo "Tfvars:      $TFVARS_FILE"
echo "Workspace:   $TF_WORKSPACE"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}Error: terraform not found. Please install Terraform >= 1.5.0${NC}"
        exit 1
    fi

    if ! command -v ansible-playbook &> /dev/null; then
        echo -e "${RED}Error: ansible-playbook not found. Please install Ansible >= 2.15${NC}"
        exit 1
    fi

    if [ ! -f "$TFVARS_FILE" ]; then
        echo -e "${RED}Error: $TFVARS_FILE not found.${NC}"
        if [[ "$ENVIRONMENT" == "staging" ]]; then
            echo -e "${RED}Copy from staging.tfvars.example (do not commit).${NC}"
        else
            echo -e "${RED}Copy from terraform.tfvars.example (do not commit).${NC}"
        fi
        exit 1
    fi

    if [ ! -f "$INVENTORY_FILE" ]; then
        echo -e "${RED}Error: $INVENTORY_FILE not found.${NC}"
        if [[ "$ENVIRONMENT" == "staging" ]]; then
            echo -e "${RED}Copy from inventory.staging.yml.example (do not commit).${NC}"
        else
            echo -e "${RED}Copy from inventory.yml.example (do not commit).${NC}"
        fi
        exit 1
    fi

    echo -e "${GREEN}Prerequisites check passed${NC}"
}

# Provision infrastructure with Terraform
provision_infrastructure() {
    if [ "$APP_ONLY" = "--app-only" ]; then
        echo -e "${YELLOW}Skipping infrastructure provisioning (--app-only flag)${NC}"
        return
    fi

    echo -e "${YELLOW}Provisioning infrastructure with Terraform...${NC}"
    cd "$TERRAFORM_DIR"

    if [ -f "$TERRAFORM_DIR/backend.hcl" ]; then
        terraform init -backend-config=backend.hcl -input=false
    else
        terraform init -input=false
    fi

    if [[ "$TF_WORKSPACE" != "default" ]]; then
        terraform workspace select "$TF_WORKSPACE" 2>/dev/null || terraform workspace new "$TF_WORKSPACE"
    else
        terraform workspace select default 2>/dev/null || true
    fi

    terraform plan -var-file="$TFVARS_FILE" -out=tfplan
    terraform apply tfplan

    # Get VPS IP from output and validate
    VPS_IP=$(terraform output -raw vps_ip || echo "")
    if [ -z "$VPS_IP" ]; then
        echo -e "${RED}Error: Failed to get VPS IP from Terraform output${NC}"
        exit 1
    fi
    export VPS_IP
    echo -e "${GREEN}Infrastructure provisioned. VPS IP: $VPS_IP${NC}"

    # Update a *working copy* of inventory (never rewrite operator's source file in-place
    # when ansible_host is already set — sed only patches STAGING_MANAGER_IP / placeholders).
    echo -e "${YELLOW}Patching inventory ansible_host placeholders if present...${NC}"
    INVENTORY_TEMP=$(mktemp)
    sed -E "s/(ansible_host:[[:space:]]*)(STAGING_MANAGER_IP|STAGING_WORKER_IP|VPS_IP|CHANGE_ME)/\\1${VPS_IP}/" \
      "$INVENTORY_FILE" > "$INVENTORY_TEMP"
    # Only replace if sed changed something; keep original path for ansible -i
    if ! cmp -s "$INVENTORY_FILE" "$INVENTORY_TEMP"; then
        mv "$INVENTORY_TEMP" "$INVENTORY_FILE"
        echo -e "${YELLOW}Updated placeholder host(s) in $INVENTORY_FILE${NC}"
    else
        rm -f "$INVENTORY_TEMP"
    fi
}

# Configure server with Ansible
configure_server() {
    echo -e "${YELLOW}Configuring server with Ansible...${NC}"
    cd "$ANSIBLE_DIR"

    # Test connection with retry loop
    echo -e "${YELLOW}Testing Ansible connection (with retries)...${NC}"
    MAX_RETRIES=10
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if ansible all -i "$INVENTORY_FILE" -m ping > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Ansible connection successful${NC}"
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo -e "${YELLOW}Connection attempt $RETRY_COUNT/$MAX_RETRIES failed, retrying in 5 seconds...${NC}"
            sleep 5
        else
            echo -e "${RED}✗ Failed to connect after $MAX_RETRIES attempts${NC}"
            exit 1
        fi
    done

    # Setup Docker + Swarm init on managers; join workers + labels
    ansible-playbook -i "$INVENTORY_FILE" playbooks/setup-docker.yml
    ansible-playbook -i "$INVENTORY_FILE" playbooks/join-workers.yml

    echo -e "${GREEN}Server configuration complete${NC}"
}

# Deploy application stack
deploy_stack() {
    echo -e "${YELLOW}Deploying application stack...${NC}"
    cd "$ANSIBLE_DIR"

    # Load or generate PostgreSQL password
    if [ -f "$SECRETS_FILE" ]; then
        echo -e "${YELLOW}Loading secrets from $SECRETS_FILE${NC}"
        # shellcheck source=/dev/null
        source "$SECRETS_FILE"
    fi

    if [ -z "${POSTGRES_PASSWORD:-}" ]; then
        # Generate shell-safe password (hex avoids +/=/ characters)
        POSTGRES_PASSWORD=$(openssl rand -hex 32)
        echo -e "${YELLOW}Generated PostgreSQL password (saving to $SECRETS_FILE)${NC}"
        # Save to secrets file with restrictive permissions
        {
            echo "# LENR Sim Deployment Secrets"
            echo "# Generated: $(date)"
            echo "# WARNING: Keep this file secure and never commit to version control"
            echo "POSTGRES_PASSWORD='$POSTGRES_PASSWORD'"
        } > "$SECRETS_FILE"
        chmod 600 "$SECRETS_FILE"
        echo -e "${YELLOW}⚠ IMPORTANT: Save this password securely! File: $SECRETS_FILE${NC}"
    fi

    # Deploy stack using extra-vars file to avoid command-line exposure
    EXTRA_VARS_FILE=$(mktemp)
    {
        echo "postgres_password: '$POSTGRES_PASSWORD'"
    } > "$EXTRA_VARS_FILE"
    chmod 600 "$EXTRA_VARS_FILE"

    ansible-playbook -i "$INVENTORY_FILE" playbooks/deploy-stack.yml \
        --extra-vars "@$EXTRA_VARS_FILE"

    # Clean up temp file
    rm -f "$EXTRA_VARS_FILE"

    echo -e "${GREEN}Application stack deployed${NC}"
}

# Resolve a health base URL without requiring Terraform state (--app-only / local).
resolve_health_base_url() {
    if [[ -n "${DEPLOY_HEALTH_URL:-}" ]]; then
        echo "${DEPLOY_HEALTH_URL}"
        return 0
    fi
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        # Staging bootstrap TLS host (inventory traefik_acme_bootstrap_host).
        echo "${STAGING_HEALTH_URL:-https://api-staging.31.220.55.113.sslip.io}"
        return 0
    fi
    echo "${LIVE_COMPOSE_URL:-https://lenr-sim-beta.conscious.energy}"
}

# Verify deployment
verify_deployment() {
    echo -e "${YELLOW}Verifying deployment...${NC}"

    local API_URL=""
    if [[ "$APP_ONLY" != "--app-only" ]]; then
        cd "$TERRAFORM_DIR"
        API_URL=$(terraform output -raw api_url 2>/dev/null || echo "")
    fi
    if [[ -z "$API_URL" ]]; then
        API_URL="$(resolve_health_base_url)"
        echo -e "${YELLOW}Using inventory/env health URL (no Terraform api_url): ${API_URL}${NC}"
    fi

    echo "Waiting for services to start..."

    # Retry health check with polling
    MAX_RETRIES=30
    RETRY_COUNT=0
    HEALTH_CHECK_PASSED=false
    # Staging sslip often needs -k until SANs settle; production should be strict.
    CURL_INSECURE=()
    if [[ "$ENVIRONMENT" == "staging" || "${DEPLOY_HEALTH_INSECURE:-0}" == "1" ]]; then
        CURL_INSECURE=(-k)
    fi

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -f -s "${CURL_INSECURE[@]}" --connect-timeout 5 --max-time 10 "$API_URL/api/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ API health check passed${NC}"
            HEALTH_CHECK_PASSED=true
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo -e "${YELLOW}Health check attempt $RETRY_COUNT/$MAX_RETRIES failed, retrying in 10 seconds...${NC}"
            sleep 10
        fi
    done

    if [ "$HEALTH_CHECK_PASSED" = false ]; then
        echo -e "${RED}✗ API health check failed after $MAX_RETRIES attempts${NC}"
        return 1
    fi

    # Check SSL certificate validity (skip when using insecure staging probe)
    if [[ ${#CURL_INSECURE[@]} -eq 0 ]]; then
        echo -e "${YELLOW}Verifying SSL certificate...${NC}"
        if echo | openssl s_client -servername "$(echo "$API_URL" | sed 's|https\?://||' | cut -d'/' -f1)" -connect "$(echo "$API_URL" | sed 's|https\?://||' | cut -d'/' -f1):443" 2>/dev/null | openssl x509 -noout -dates > /dev/null 2>&1; then
            echo -e "${GREEN}✓ SSL certificate valid${NC}"
        else
            echo -e "${YELLOW}⚠ SSL certificate validation failed (may still be provisioning)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Skipping strict SSL verify (staging / DEPLOY_HEALTH_INSECURE)${NC}"
    fi

    echo -e "${GREEN}Deployment verification complete${NC}"
}

# Main execution
main() {
    check_prerequisites
    provision_infrastructure
    configure_server
    deploy_stack
    verify_deployment

    echo ""
    echo -e "${GREEN}=========================================="
    echo "Deployment Complete!"
    echo "==========================================${NC}"

    if [[ "$APP_ONLY" == "--app-only" ]]; then
        echo "Health URL: $(resolve_health_base_url)"
        echo "(--app-only: skipped Terraform frontend/api/vps outputs)"
    else
        cd "$TERRAFORM_DIR"
        echo "Frontend URL: $(terraform output -raw frontend_url)"
        echo "API URL: $(terraform output -raw api_url)"
        echo "VPS IP: $(terraform output -raw vps_ip)"
    fi
}

main "$@"
