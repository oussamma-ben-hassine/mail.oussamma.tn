#!/bin/sh
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <chemin_vers_fichier_backup.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Erreur: Le fichier ${BACKUP_FILE} n'existe pas."
  exit 1
fi

echo "[Restore] Restauration de la base de données depuis ${BACKUP_FILE}..."
gunzip -c "${BACKUP_FILE}" | docker exec -i mail-postgres psql -U "${POSTGRES_USER:-mail_user}" -d "${POSTGRES_DB:-mail_db}"

echo "[Restore] Restauration achevée avec succès."
