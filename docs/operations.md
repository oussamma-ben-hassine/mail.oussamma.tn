# Guide d'Exploitation & Maintenance — Mail.oussamma.tn

## 1. Déploiement Initial sur Coolify

### 1.1 Prérequis
1. Accès à la console Coolify sur `https://coolify.oussamma.tn`.
2. Sous-domaine `mail.oussamma.tn` pointant vers l'IP du VPS OVH.
3. Certificat Let's Encrypt généré automatiquement par Traefik via Coolify.

### 1.2 Étapes de Déploiement
1. Créer une nouvelle ressource dans Coolify : **Docker Compose**.
2. Renseigner le dépôt Git : `https://github.com/oussamma-ben-hassine/mail.oussamma.tn`.
3. Spécifier le fichier compose : `infra/coolify/docker-compose.prod.yml`.
4. Renseigner les variables d'environnement documentées dans `infra/coolify/COOLIFY_DEPLOYMENT.md`.
5. Lancer le déploiement.
6. Exécuter les migrations Prisma initiales :
   ```bash
   docker exec -it <container_id_mail_api> pnpm run prisma:migrate
   docker exec -it <container_id_mail_api> pnpm run prisma:seed
   ```

---

## 2. Déploiement et Exploitation de Mailu

1. Cloner ou copier le répertoire `infra/mailu` sur le serveur hôte.
2. Définir un mot de passe robuste dans `mailu.env` (`SECRET_KEY`).
3. Démarrer les conteneurs :
   ```bash
   docker compose -f infra/mailu/docker-compose.yml up -d
   ```
4. Initialiser le compte administrateur Mailu :
   ```bash
   docker compose -f infra/mailu/docker-compose.yml exec admin flask mailu admin contact oussamma.tn '<MOT_DE_PASSE>'
   ```
5. Récupérer la clé DKIM générée pour votre DNS :
   ```bash
   cat infra/mailu/data/dkim/oussamma.tn.mail.pem
   ```

---

## 3. Procédure de Sauvegarde & Restauration

### Sauvegarde Automatisée (Cron quotidien)
Le script `infra/coolify/backup.sh` est programmé quotidiennement à 02:00 UTC :
```bash
0 2 * * * /opt/mail/infra/coolify/backup.sh >> /var/log/mail_backup.log 2>&1
```

### Restauration en Cas d'Incident
```bash
./infra/coolify/restore.sh /backups/mail/mail_backup_20261019_020000.sql.gz
```

---

## 4. Sondes de Santé & Monitoring

- **API REST :** `GET https://mail.oussamma.tn/health` (vérification HTTP standard).
- **Base de données :** `GET https://mail.oussamma.tn/api/health` (exécution `SELECT 1` sur PostgreSQL).
- **Files BullMQ :** Monitoring de la file `email-delivery` via Redis ping et logs worker.
- **Superviseur :** Ingestion automatique d'événements vers `https://supervisor.oussamma.tn`.
