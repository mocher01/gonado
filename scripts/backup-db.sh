#!/bin/bash
# Database backup script for Gonado
# Run this before any potentially destructive operations

BACKUP_DIR="/var/apps/gonado/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/gonado_backup_$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"

echo "Creating database backup: $BACKUP_FILE"
docker exec gonado-postgres pg_dump -U gonado -d gonado > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    gzip "$BACKUP_FILE"
    echo "Backup created successfully: ${BACKUP_FILE}.gz"

    # Keep only last 10 backups
    ls -t "$BACKUP_DIR"/gonado_backup_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm

    echo "Current backups:"
    ls -lh "$BACKUP_DIR"/gonado_backup_*.sql.gz 2>/dev/null
else
    echo "ERROR: Backup failed!"
    exit 1
fi
