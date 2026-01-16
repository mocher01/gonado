#!/bin/bash
# Database restore script for Gonado
# Usage: ./restore-db.sh [backup_file.sql.gz]

BACKUP_DIR="/var/apps/gonado/backups"

if [ -z "$1" ]; then
    echo "Available backups:"
    ls -lht "$BACKUP_DIR"/gonado_backup_*.sql.gz 2>/dev/null
    echo ""
    echo "Usage: $0 <backup_file.sql.gz>"
    echo "Example: $0 /var/apps/gonado/backups/gonado_backup_20260116_121458.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will overwrite all current data!"
echo "Restoring from: $BACKUP_FILE"
echo ""

# Decompress and restore
gunzip -c "$BACKUP_FILE" | docker exec -i gonado-postgres psql -U gonado -d gonado

if [ $? -eq 0 ]; then
    echo "Database restored successfully!"
    docker restart gonado-backend
    echo "Backend restarted."
else
    echo "ERROR: Restore failed!"
    exit 1
fi
