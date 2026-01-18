#!/bin/bash
# LENR Simulation App - Full Deployment Script
# Usage: ./deploy.sh [production|staging] [--app-only]

set -e

ENVIRONMENT=${1:-production}
APP_ONLY=${2:-}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform"
ANSIBLE_DIR="$PROJECT_ROOT/infrastructure/ansible"

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
    
    # Get VPS IP from output
    VPS_IP=$(terraform output -raw vps_ip)
    echo -e "${GREEN}Infrastructure provisioned. VPS IP: $VPS_IP${NC}"
    
    # Update Ansible inventory with VPS IP
    echo -e "${YELLOW}Updating Ansible inventory...${NC}"
    sed -i.bak "s/ansible_host:.*/ansible_host: $VPS_IP/" "$ANSIBLE_DIR/inventory.yml"
}

# Configure server with Ansible
configure_server() {
    echo -e "${YELLOW}Configuring server with Ansible...${NC}"
    cd "$ANSIBLE_DIR"
    
    # Test connection
    ansible all -i inventory.yml -m ping
    
    # Setup Docker
    ansible-playbook -i inventory.yml playbooks/setup-docker.yml
    
    echo -e "${GREEN}Server configuration complete${NC}"
}

# Deploy application stack
deploy_stack() {
    echo -e "${YELLOW}Deploying application stack...${NC}"
    cd "$ANSIBLE_DIR"
    
    # Generate PostgreSQL password if not set
    if [ -z "$POSTGRES_PASSWORD" ]; then
        export POSTGRES_PASSWORD=$(openssl rand -base64 32)
        echo -e "${YELLOW}Generated PostgreSQL password (save this securely!)${NC}"
    fi
    
    # Deploy stack
    ansible-playbook -i inventory.yml playbooks/deploy-stack.yml \
        -e "postgres_password=$POSTGRES_PASSWORD"
    
    echo -e "${GREEN}Application stack deployed${NC}"
}

# Verify deployment
verify_deployment() {
    echo -e "${YELLOW}Verifying deployment...${NC}"
    
    # Get API URL from Terraform output
    cd "$TERRAFORM_DIR"
    API_URL=$(terraform output -raw api_url)
    
    echo "Waiting for services to start..."
    sleep 30
    
    # Check health endpoint
    if curl -f -s "$API_URL/api/health" > /dev/null; then
        echo -e "${GREEN}✓ API health check passed${NC}"
    else
        echo -e "${RED}✗ API health check failed${NC}"
        return 1
    fi
    
    # Check SSL certificate
    if curl -f -s -I "$API_URL" > /dev/null; then
        echo -e "${GREEN}✓ SSL certificate valid${NC}"
    else
        echo -e "${YELLOW}⚠ SSL certificate may still be provisioning${NC}"
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
