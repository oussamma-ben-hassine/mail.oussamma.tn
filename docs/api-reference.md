# Référence d'API REST — Mail.oussamma.tn (v1)

Base URL en production : **`https://mail.oussamma.tn`**  
Documentation Swagger interactive : **`https://mail.oussamma.tn/api/docs`**

---

## 1. Authentification

L'API supporte deux mécanismes d'authentification :

1. **Jeton Bearer SSO OIDC (Utilisateur) :**
   ```http
   Authorization: Bearer <sso_access_token>
   ```
2. **Clé API Applicative (Machine-to-Machine) :**
   ```http
   X-API-Key: mk_live_<random_48_chars>
   ```

---

## 2. Endpoints du Mailing Transactionnel

### `POST /api/v1/emails`
Envoie un email transactionnel unitaire.

- **Entêtes :**
  - `X-API-Key: mk_live_...` (Requis)
  - `Idempotency-Key: <unique_uuid_or_hash>` (Recommandé)
- **Corps de la requête (JSON) :**
```json
{
  "from": "noreply@oussamma.tn",
  "fromName": "Écosystème oussamma.tn",
  "to": ["destinataire@example.com"],
  "subject": "Confirmation de votre demande",
  "html": "<p>Bonjour, votre compte a été activé avec succès.</p>",
  "text": "Bonjour, votre compte a été activé avec succès.",
  "priority": "normal",
  "tags": ["activation", "bienvenue"]
}
```
- **Réponse HTTP 201 Created :**
```json
{
  "id": "c1f7b7a1-8d2a-4a62-95f7-8738ef991c2b",
  "status": "QUEUED",
  "from": "noreply@oussamma.tn",
  "to": ["destinataire@example.com"],
  "subject": "Confirmation de votre demande",
  "priority": "normal",
  "createdAt": "2026-10-19T01:30:00.000Z",
  "attemptsCount": 0,
  "idempotencyKey": "req-9912-audit"
}
```

---

### `POST /api/v1/emails/batch`
Envoie un lot d'emails (jusqu'à 100 messages par lot).

- **Entêtes :** `X-API-Key: mk_live_...`
- **Corps de la requête :**
```json
{
  "emails": [
    {
      "from": "noreply@oussamma.tn",
      "to": ["user1@example.com"],
      "subject": "Notification 1",
      "text": "Message 1"
    },
    {
      "from": "noreply@oussamma.tn",
      "to": ["user2@example.com"],
      "subject": "Notification 2",
      "text": "Message 2"
    }
  ]
}
```

---

### `GET /api/v1/emails/:id`
Récupère l'état et l'historique d'un envoi d'email.

- **Réponse HTTP 200 OK :**
```json
{
  "id": "c1f7b7a1-8d2a-4a62-95f7-8738ef991c2b",
  "status": "DELIVERED",
  "from": "noreply@oussamma.tn",
  "to": ["destinataire@example.com"],
  "subject": "Confirmation de votre demande",
  "priority": "normal",
  "createdAt": "2026-10-19T01:30:00.000Z",
  "sentAt": "2026-10-19T01:30:01.200Z",
  "attemptsCount": 1
}
```

---

## 3. Endpoints des Modèles d'Emails (Templates)

| Méthode | Route | Description | Rôles requis |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/templates` | Liste tous les modèles disponibles | Utilisateur authentifié |
| `POST` | `/api/v1/templates` | Crée un nouveau modèle | `superadmin`, `mail_admin` |
| `PATCH` | `/api/v1/templates/:id` | Met à jour un modèle (crée une version) | `superadmin`, `mail_admin` |
| `POST` | `/api/v1/templates/:id/preview` | Rendu prévisualisé avec variables de test | Utilisateur authentifié |

---

## 4. Endpoints des Applications M2M

| Méthode | Route | Description | Rôles requis |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/applications` | Enregistre une nouvelle application cliente | `superadmin`, `mail_admin` |
| `POST` | `/api/v1/applications/:id/credentials` | Génère une clé secrète API pour l'app | `superadmin`, `mail_admin` |
| `GET` | `/api/v1/applications/:id/usage` | Retourne la consommation journalière et le quota | Application ou Admin |

---

## 5. Endpoints du Webmail Utilisateur

| Méthode | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/webmail/folders` | Liste des dossiers IMAP avec compteurs non lus |
| `GET` | `/api/v1/webmail/messages` | Liste paginée des messages avec filtres et recherche |
| `GET` | `/api/v1/webmail/messages/:id` | Lecture sécurisée d'un message avec désinfection HTML |
| `POST` | `/api/v1/webmail/send` | Envoi d'un message depuis l'adresse de l'utilisateur |
| `POST` | `/api/v1/webmail/move` | Déplacement d'un message entre dossiers |
| `POST` | `/api/v1/webmail/flag` | Modification des indicateurs (lu, favori) |
| `DELETE` | `/api/v1/webmail/messages/:id` | Suppression d'un message (mise en corbeille) |

---

## 6. Endpoints d'Assistance IA (LiteLLM)

| Méthode | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/ai/summarize` | Résumé d'un email en 2-3 phrases |
| `POST` | `/api/v1/ai/reply-draft` | Projet de réponse assistée avec sélection de ton |
| `POST` | `/api/v1/ai/extract-actions` | Extraction des tâches, dates et niveaux d'urgence |
| `POST` | `/api/v1/ai/translate` | Traduction d'un email vers FR, EN ou AR |
