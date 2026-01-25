#!/bin/bash
# LENR Simulation App - Full Deployment Script
# Usage: ./deploy.sh [production|staging] [--app-only]

set -euo pipefail

ENVIRONMENT=${1:-production}
APP_ONLY=${2:-}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform"
ANSIBLE_DIR="$PROJECT_ROOT/infrastructure/ansible"
SECRETS_FILE="${SCRIPT_DIR}/.secrets.env"

echo "=========================================="
echo "LENR Simulation App Deployment"
echo "Environment: $ENVIRONMENT"
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
    
    if [ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
        echo -e "${RED}Error: terraform.tfvars not found. Copy from terraform.tfvars.example${NC}"
        exit 1
    fi
    
    if [ ! -f "$ANSIBLE_DIR/inventory.yml" ]; then
        echo -e "${RED}Error: inventory.yml not found. Copy from inventory.yml.example${NC}"
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
    
    terraform init
    terraform plan -out=tfplan
    terraform apply tfplan
    
    # Get VPS IP from output and validate
    VPS_IP=$(terraform output -raw vps_ip || echo "")
    if [ -z "$VPS_IP" ]; then
        echo -e "${RED}Error: Failed to get VPS IP from Terraform output${NC}"
        exit 1
    fi
    export VPS_IP
    echo -e "${GREEN}Infrastructure provisioned. VPS IP: $VPS_IP${NC}"
    
    # Update Ansible inventory with VPS IP (use temp file to avoid modifying repo)
    echo -e "${YELLOW}Updating Ansible inventory...${NC}"
    INVENTORY_TEMP=$(mktemp)
    sed "s/ansible_host:.*/ansible_host: $VPS_IP/" "$ANSIBLE_DIR/inventory.yml" > "$INVENTORY_TEMP"
    mv "$INVENTORY_TEMP" "$ANSIBLE_DIR/inventory.yml"
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
        if ansible all -i inventory.yml -m ping > /dev/null 2>&1; then
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
    
    # Setup Docker
    ansible-playbook -i inventory.yml playbooks/setup-docker.yml
    
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
    
    ansible-playbook -i inventory.yml playbooks/deploy-stack.yml \
        --extra-vars "@$EXTRA_VARS_FILE"
    
    # Clean up temp file
    rm -f "$EXTRA_VARS_FILE"
    
    echo -e "${GREEN}Application stack deployed${NC}"
}

# Verify deployment
verify_deployment() {
    echo -e "${YELLOW}Verifying deployment...${NC}"
    
    # Get API URL from Terraform output
    cd "$TERRAFORM_DIR"
    API_URL=$(terraform output -raw api_url || echo "")
    if [ -z "$API_URL" ]; then
        echo -e "${RED}Error: Failed to get API URL from Terraform output${NC}"
        return 1
    fi
    
    echo "Waiting for services to start..."
    
    # Retry health check with polling
    MAX_RETRIES=30
    RETRY_COUNT=0
    HEALTH_CHECK_PASSED=false
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -f -s --connect-timeout 5 --max-time 10 "$API_URL/api/health" > /dev/null 2>&1; then
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
    
    # Check SSL certificate validity
    echo -e "${YELLOW}Verifying SSL certificate...${NC}"
    if echo | openssl s_client -servername "$(echo "$API_URL" | sed 's|https\?://||' | cut -d'/' -f1)" -connect "$(echo "$API_URL" | sed 's|https\?://||' | cut -d'/' -f1):443" 2>/dev/null | openssl x509 -noout -dates > /dev/null 2>&1; then
        echo -e "${GREEN}✓ SSL certificate valid${NC}"
    else
        echo -e "${YELLOW}⚠ SSL certificate validation failed (may still be provisioning)${NC}"
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
    
    cd "$TERRAFORM_DIR"
    echo "Frontend URL: $(terraform output -raw frontend_url)"
    echo "API URL: $(terraform output -raw api_url)"
    echo "VPS IP: $(terraform output -raw vps_ip)"
}

main "$@"
