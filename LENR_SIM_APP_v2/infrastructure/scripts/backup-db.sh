#!/bin/bash
# LENR Simulation App - Database Backup Script
# Usage: ./backup-db.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="$SCRIPT_DIR/../ansible"
BACKUP_DIR="$SCRIPT_DIR/../backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=========================================="
echo "LENR Simulation App - Database Backup"
echo "Environment: $ENVIRONMENT"
echo "Timestamp: $TIMESTAMP"
echo "=========================================="

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Run backup via Ansible
backup_database() {
    echo "Creating database backup..."
    
    cd "$ANSIBLE_DIR"
    
    ansible all -i inventory.yml -m shell \
        -a "docker exec \$(docker ps -q -f name=lenr-sim_postgres) pg_dump -U lenr_app lenr_sim | gzip" \
        > "$BACKUP_DIR/lenr_sim_${ENVIRONMENT}_${TIMESTAMP}.sql.gz"
    
    echo "Backup created: $BACKUP_DIR/lenr_sim_${ENVIRONMENT}_${TIMESTAMP}.sql.gz"
    
    # List recent backups
    echo ""
    echo "Recent backups:"
    ls -lh "$BACKUP_DIR"/*.sql.gz | tail -5
}

# Cleanup old backups (keep last 7 days)
cleanup_old_backups() {
    echo "Cleaning up backups older than 7 days..."
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
    echo "Cleanup complete"
}

main() {
    backup_database
    cleanup_old_backups
    
    echo "Backup complete!"
}

main "$@"
