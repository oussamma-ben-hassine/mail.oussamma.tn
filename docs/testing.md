# Stratégie de Tests & Validation — Mail.oussamma.tn

## 1. Vue d'Ensemble des Tests

Conformément aux exigences de la mission, aucun test ne doit envoyer de véritables emails à des destinataires externes sans autorisation. Tous les tests sont exécutés en mode sécurisé ou simulé (*Sandbox / In-Memory Isolation*).

---

## 2. Inventaire des Suites de Tests

| Catégorie | Fichier de Test | Responsabilités & Vérifications |
| :--- | :--- | :--- |
| **Unitaires** | `tests/unit/template-engine.test.ts` | Échappement anti-XSS des variables, gestion des blocs `{{#if}}`, boucles `{{#each}}`, détection des variables manquantes |
| **Unitaires** | `tests/unit/crypto-security.test.ts` | Chiffrement symétrique AES-256-GCM, rejet des altérations (Authentication Tag), génération de clés d'API et timing-safe hash comparison |
| **Unitaires** | `tests/unit/email-sanitizer.test.ts` | Suppression des balises `<script>`, `<iframe>`, `javascript:`, désactivation des gestionnaires d'événements, blocage des images distantes espionnes |
| **Intégration** | `tests/integration/smtp-provider.test.ts` | Fournisseur SMTP avec mode de livraison simulée, intégrité du journal en mémoire, détection des codes d'erreur transitoires (4xx) vs permanents (5xx) |
| **Sécurité** | `tests/security/rbac-and-quotas.test.ts` | Contrôle d'accès RBAC (Superadmin, Admin, User, Auditor), isolation stricte des domaines expéditeurs pour les applications tierces |

---

## 3. Exécution des Tests en Local

```bash
# Exécution de l'ensemble des suites de tests unitaires et de sécurité
node --test tests/unit/template-engine.test.ts
node --test tests/unit/crypto-security.test.ts
node --test tests/unit/email-sanitizer.test.ts
node --test tests/integration/smtp-provider.test.ts
node --test tests/security/rbac-and-quotas.test.ts
```
