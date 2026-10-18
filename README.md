# Mail.oussamma.tn — Messagerie & Mailing Transactionnel

Application autonome et centralisée de messagerie électronique pour l'écosystème `oussamma.tn`.

Accessible en production à : **`https://mail.oussamma.tn`**

---

## 1. Vue d'Ensemble

Mail.oussamma.tn intègre deux composantes clés :

1. **Webmail Moderne & PWA Mobile-First** : Permet aux utilisateurs authentifiés via le SSO de lire, organiser, rédiger, rechercher et classer leurs emails avec support de pièces jointes (locales et Cloud Drive), assistance IA (résumé, reformulation, extraction d'actions) et mode clair/sombre.
2. **Mailing API Sécurisée Transactionnelle** : Fournit une API REST versionnée (`/api/v1/emails`) permettant à toutes les applications de l'écosystème (`cv`, `messenger`, `drive`, etc.) d'expédier des emails avec validation stricte, quotas, rate limiting, clés d'idempotence, templates versionnés, files d'attente BullMQ et livraison traçable.

---

## 2. Structure du Monorepo

```
mail.oussamma.tn/
├── apps/
│   ├── web/               # Frontend Next.js 14, React 18, Tailwind, PWA
│   ├── api/               # Backend NestJS (REST OpenAPI, Auth, Webmail, Admin)
│   └── worker/            # Traitement asynchrone BullMQ (Envois, retries, webhooks)
├── packages/
│   ├── contracts/         # Schémas DTO, types partagés et contrats Zod
│   ├── mail-core/         # Services métier IMAP, SMTP, templates et sécurité
│   ├── integrations/      # Adaptateurs écosystème (SSO, LiteLLM, Drive, Superviseur)
│   └── ui/                # Bibliothèque de composants graphiques partagés
├── infra/
│   ├── mailu/             # Configuration de la pile Mailu (Dovecot, Postfix, Rspamd)
│   └── coolify/           # Déploiement Docker Compose, Traefik et scripts de sauvegarde
├── docs/                  # Spécifications, audit, architecture, sécurité et exploitation
└── tests/                 # Suites de tests unitaires, d'intégration, e2e et sécurité
```

---

## 3. Démarrage Rapide en Local

### Prérequis

- Node.js 20+ et pnpm
- Docker & Docker Compose (ou environnement local PostgreSQL + Redis)

### Installation

```bash
# Installation des dépendances
pnpm install

# Configuration de l'environnement local
cp .env.example .env

# Génération et migration de la base de données
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed

# Lancement des services en développement
pnpm run dev:api    # Port 4000
pnpm run dev:web    # Port 3000
pnpm run dev:worker # Worker BullMQ
```

---

## 4. Documentation Technique

- [Audit d'Intégration Écosystème](docs/ecosystem-audit.md)
- [Architecture & Diagrammes](docs/architecture.md)
- [Politique de Sécurité & Conformité](docs/security.md)
- [Référence OpenAPI & Contrats](docs/api-reference.md)
- [Guide d'Exploitation & Déploiement Coolify](docs/operations.md)
