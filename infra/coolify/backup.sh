#!/bin/sh
set -e

BACKUP_DIR="/backups/mail"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/mail_backup_${DATE}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[Backup] Début de la sauvegarde de la base de données PostgreSQL..."
docker exec -t mail-postgres pg_dump -U "${POSTGRES_USER:-mail_user}" "${POSTGRES_DB:-mail_db}" | gzip > "${BACKUP_FILE}"

echo "[Backup] Sauvegarde achevée avec succès dans ${BACKUP_FILE}"

# Rétention des 7 derniers jours
find "${BACKUP_DIR}" -type f -name "mail_backup_*.sql.gz" -mtime +7 -delete
echo "[Backup] Nettoyage des anciennes sauvegardes effectué."
