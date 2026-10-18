# Guide de Déploiement Coolify — Mail.oussamma.tn

## 1. Déploiement sur Coolify (`https://coolify.oussamma.tn`)

L'application **Mail.oussamma.tn** est déployée comme une ressource Docker Compose multi-services indépendante sur l'infrastructure Coolify OVH.

---

## 2. Configuration de la Ressource Coolify

- **Nom du Projet :** `mail.oussamma.tn`
- **Type de Ressource :** Docker Compose Application
- **Dépôt Git :** `https://github.com/oussamma-ben-hassine/mail.oussamma.tn`
- **Branche :** `main`
- **FQDN Principal :** `https://mail.oussamma.tn`
- **Chemin Compose :** `infra/coolify/docker-compose.prod.yml`

---

## 3. Routage Traefik & Ports Internes

| Service | Port Interne | Domaine / URL Publique | Accès Réseau |
| :--- | :--- | :--- | :--- |
| `mail-web` | 3000 | `https://mail.oussamma.tn` | Public (Reverse Proxy Traefik) |
| `mail-api` | 4000 | `https://mail.oussamma.tn/api` | Public via Traefik PathPrefix |
| `mail-worker` | — | Interne uniquement | `internal_net` |
| `mail-postgres` | 5432 | Interne uniquement | `internal_net` (Isolé, non exposé) |
| `mail-redis` | 6379 | Interne uniquement | `internal_net` (Isolé, non exposé) |

---

## 4. Variables d'Environnement Protégées à Déclarer dans Coolify

```env
NODE_ENV=production
POSTGRES_USER=mail_user
POSTGRES_PASSWORD=mail_secret_postgres_pass_2026
POSTGRES_DB=mail_db

REDIS_PASSWORD=mail_secret_redis_pass_2026

APP_CREDENTIAL_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# SSO OIDC (sso-a.oussamma.tn)
SSO_ISSUER=https://sso-a.oussamma.tn
SSO_CLIENT_ID=mail_oussamma_tn
SSO_CLIENT_SECRET=sso_client_secret_mail_2026
SSO_REDIRECT_URI=https://mail.oussamma.tn/auth/callback

# LiteLLM IA (ai.oussamma.tn)
LITELLM_BASE_URL=https://ai.oussamma.tn
LITELLM_API_KEY=sk-oussamma-master-gateway-2026

# ByteVault Drive
DRIVE_BASE_URL=https://drive.oussamma.tn

# Superviseur Central
SUPERVISOR_BASE_URL=https://supervisor.oussamma.tn
SUPERVISOR_KEY=es_mail_prod_secret_2026

# Mode de livraison (simulated en staging, smtp en production)
MAIL_DELIVERY_MODE=simulated
```

---

## 5. Procédures d'Exploitation & Migrations

Au premier démarrage sur Coolify :

```bash
# 1. Se connecter au conteneur mail-api
docker exec -it <container_id_mail_api> sh

# 2. Exécuter les migrations Prisma
pnpm run prisma:migrate

# 3. Initialiser les données de référence (Seed)
pnpm run prisma:seed
```
