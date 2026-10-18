# Architecture Logicielle — Mail.oussamma.tn

## 1. Vue d'Ensemble

**Mail.oussamma.tn** est une plateforme unifiée et indépendante combinant deux missions critiques au sein de l'écosystème `oussamma.tn` :
1. **Webmail Utilisateur PWA :** Messagerie mobile-first responsive avec navigation par dossiers, recherche, lecture HTML désinfectée, pièces jointes Cloud (ByteVault Drive), et assistance IA contextuelle (LiteLLM).
2. **Mailing Transactionnel Centralisé :** API REST sécurisée pour toutes les applications de l'écosystème (`cv`, `messenger`, `drive`, `devspace`), avec authentification M2M par clés d'API hachées, gestion fine des scopes, quotas, rate limiting, files d'attente asynchrones BullMQ, gestion de l'idempotence et supervision centrale.

---

## 2. Diagramme d'Architecture Globale

```mermaid
flowchart TD
    subgraph Clients["Clients & Utilisateurs"]
        User["Utilisateur Webmail (Navigateur / PWA)"]
        Apps["Applications Écosystème (cv, messenger, drive)"]
        ExtClient["Clients Lourds (Thunderbird, Apple Mail)"]
    end

    subgraph FrontLayer["Routage & Terminaison TLS (Coolify / Traefik)"]
        Traefik["Traefik Reverse Proxy (Let's Encrypt)"]
    end

    subgraph AppMonorepo["Monorepo Mail.oussamma.tn"]
        WebPwa["apps/web (Next.js 14 PWA)"]
        ApiNest["apps/api (NestJS REST API)"]
        BullWorker["apps/worker (BullMQ Worker)"]
        CorePkg["packages/mail-core"]
        IntPkg["packages/integrations"]
        ContractsPkg["packages/contracts"]
        UiPkg["packages/ui"]
    end

    subgraph DataLayer["Persistance & Cache Dédiés"]
        Postgres[(PostgreSQL 16 - mail_db)]
        RedisCache[(Redis 7 - Files & Cache)]
    end

    subgraph MailuStack["Infrastructure Mailu"]
        MailuFront["Front Mailu (Ports 25, 465, 587, 993)"]
        Postfix["Postfix (SMTP In / Out)"]
        Dovecot["Dovecot (IMAP Storage)"]
        Rspamd["Rspamd (Antispam & DKIM)"]
    end

    subgraph Ecosysteme["Services Écosystème oussamma.tn"]
        SSO["SSO AuthCore (sso-a.oussamma.tn)"]
        LiteLLM["Passerelle LiteLLM (ai.oussamma.tn)"]
        Drive["ByteVault Drive (drive.oussamma.tn)"]
        Supervisor["Superviseur Central (supervisor.oussamma.tn)"]
        NotifHub["Notification Hub"]
    end

    User -->|HTTPS :443| Traefik
    Apps -->|HTTPS :443 X-API-Key| Traefik
    ExtClient -->|IMAPS :993 / SMTPS :465| MailuFront

    Traefik -->|Routage /| WebPwa
    Traefik -->|Routage /api| ApiNest

    WebPwa --> ApiNest
    WebPwa --> UiPkg
    WebPwa --> ContractsPkg

    ApiNest --> CorePkg
    ApiNest --> IntPkg
    ApiNest --> Postgres
    ApiNest --> RedisCache

    BullWorker --> RedisCache
    BullWorker --> Postgres
    BullWorker --> CorePkg
    BullWorker --> IntPkg

    IntPkg -->|OIDC PKCE / JWKS| SSO
    IntPkg -->|Résumés / Réponses / Traductions| LiteLLM
    IntPkg -->|Pièces jointes / Partages WeTransfer| Drive
    IntPkg -->|Événements v1 Batch| Supervisor
    IntPkg -->|Alertes Telegram & Hub| NotifHub

    CorePkg -->|IMAP TCP| Dovecot
    CorePkg -->|SMTP Relais| Postfix

    MailuFront --> Postfix
    MailuFront --> Dovecot
    Postfix --> Rspamd
```

---

## 3. Flux Séquentiel — Envoi Transactionnel Sécurisé

```mermaid
sequenceDiagram
    autonumber
    actor App as Application Écosystème (ex: cv-builder)
    participant API as Mail API (NestJS)
    participant Redis as Redis (BullMQ Queue)
    participant Worker as Mail Worker
    participant DB as PostgreSQL
    participant SMTP as Serveur SMTP (Mailu / Externe)
    participant Sup as Superviseur Central

    App->>API: POST /api/v1/emails (X-API-Key, Idempotency-Key)
    API->>API: Validation DTO & Hash SHA-256 de la clé API
    API->>DB: Vérification de l'application, des scopes et du quota journalier
    API->>DB: Contrôle de la liste de suppression (rebonds/désabonnements)
    API->>DB: Création du travail (MailJob: QUEUED)
    API->>Redis: Mise en file d'attente (email-delivery)
    API->>Sup: Publication événement mail.message.sent (Métadonnées uniquement)
    API-->>App: HTTP 201 Created (id, status: QUEUED)

    Redis->>Worker: Dépilage du travail
    Worker->>DB: Mise à jour statut PROCESSING
    Worker->>SMTP: Envoi SMTP avec TLS & DKIM
    alt Succès d'envoi
        SMTP-->>Worker: 250 2.0.0 OK
        Worker->>DB: Statut DELIVERED + Enregistrement tentative
        Worker->>Sup: Télémétrie de succès
    else Échec transitoire (4xx / Timeout)
        SMTP-->>Worker: Erreur temporaire
        Worker->>Redis: Reprogrammation avec backoff exponentiel
        Worker->>DB: Enregistrement tentative TEMPORARY_FAILURE
    else Échec permanent (5xx / Max retries)
        Worker->>DB: Statut FAILED (Dead-Letter)
        Worker->>Sup: Alerte mail.message.failed
    end
```

---

## 4. Modèle de Responsabilité des Packages

- **`packages/contracts` :** Source unique de vérité pour les types, schémas Zod et contrats partagés entre le frontend, le backend et les workers.
- **`packages/mail-core` :** Moteur d'envoi SMTP (avec mode simulé étanche), adaptateur IMAP avec pagination incrémentale, moteur de templates typé avec échappement XSS, et cryptographie AES-256-GCM / Argon2.
- **`packages/integrations` :** Connecteurs certifiés pour l'écosystème : SSO OIDC (PKCE S256), passerelle LiteLLM avec prompt isolation, Drive ByteVault, Superviseur v1, et Notification Hub avec déduplication.
- **`packages/ui` :** Composants réutilisables basés sur Tailwind CSS et respectant la charte visuelle unifiée (Plus Jakarta Sans, palette slate/blue, badges et boutons ergonomiques).
