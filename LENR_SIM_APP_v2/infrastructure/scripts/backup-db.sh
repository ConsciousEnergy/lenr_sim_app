#!/bin/bash
# LENR Simulation App - Database Backup Script
# Usage: ./backup-db.sh [production|staging|development|test]

set -euo pipefail

ENVIRONMENT=${1:-production}

# Validate environment variable
ALLOWED_ENVS=("production" "staging" "development" "test")
if [[ ! " ${ALLOWED_ENVS[@]} " =~ " ${ENVIRONMENT} " ]]; then
    echo "Error: Invalid environment '$ENVIRONMENT'. Must be one of: ${ALLOWED_ENVS[*]}" >&2
    exit 1
fi

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
    
    # Find container by exact name to avoid multiple matches
    CONTAINER_NAME="lenr-sim_postgres"
    
    # Capture container ID directly (avoid subshell from pipe)
    container_id=$(ansible all -i inventory.yml -m shell \
        -a "docker ps --filter 'name=^${CONTAINER_NAME}$' -q" 2>/dev/null | head -1 | tr -d '\n')
    
    if [ -z "$container_id" ]; then
        echo "Error: PostgreSQL container not found" >&2
        exit 1
    fi
    
    # Create backup with error checking
    BACKUP_FILE="${BACKUP_DIR}/lenr_sim_${ENVIRONMENT}_${TIMESTAMP}.sql.gz"
    TEMP_FILE="${BACKUP_FILE}.tmp"
    
    # Run pg_dump and pipe to gzip, with error checking
    if ! ansible all -i inventory.yml -m shell \
        -a "docker exec '$container_id' pg_dump -U lenr_app lenr_sim" 2>/dev/null | \
        gzip > "$TEMP_FILE"; then
        # Remove partial file on failure
        rm -f "$TEMP_FILE"
        echo "Error: pg_dump or gzip failed" >&2
        exit 1
    fi
    
    # Only move temp file to final location on success
    mv "$TEMP_FILE" "$BACKUP_FILE"
    
    echo "Backup created: $BACKUP_FILE"
    
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
