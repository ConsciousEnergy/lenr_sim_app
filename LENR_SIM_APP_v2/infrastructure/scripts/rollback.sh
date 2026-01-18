#!/bin/bash
# LENR Simulation App - Rollback Script
# Usage: ./rollback.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="$PROJECT_ROOT/infrastructure/ansible"

echo "=========================================="
echo "LENR Simulation App Rollback"
echo "Environment: $ENVIRONMENT"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Rollback backend service
rollback_backend() {
    echo -e "${YELLOW}Rolling back backend service...${NC}"
    
    cd "$ANSIBLE_DIR"
    
    ansible all -i inventory.yml -m shell \
        -a "docker service rollback lenr-sim_backend"
    
    echo -e "${GREEN}Backend service rolled back${NC}"
}

# Verify rollback
verify_rollback() {
    echo -e "${YELLOW}Verifying rollback...${NC}"
    
    cd "$ANSIBLE_DIR"
    
    # Check service status
    ansible all -i inventory.yml -m shell \
        -a "docker service ps lenr-sim_backend --no-trunc" \
        | head -20
    
    echo -e "${GREEN}Rollback verification complete${NC}"
}

main() {
    read -p "Are you sure you want to rollback? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Rollback cancelled"
        exit 0
    fi
    
    rollback_backend
    verify_rollback
    
    echo -e "${GREEN}Rollback complete${NC}"
}

main "$@"
