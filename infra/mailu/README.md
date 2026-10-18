# Configuration et Exploitation du Serveur Mailu — Mail.oussamma.tn

## 1. Vue d'Ensemble

La pile Mailu assure les services de messagerie fondateurs :
- Réception et émission SMTP (Postfix).
- Accès sécurisé IMAP/IMAPS (Dovecot).
- Filtrage antispam et signature cryptographique DKIM (Rspamd).
- Ségrégation réseau et persistance sur volumes Docker.

---

## 2. Configuration DNS Requise pour `oussamma.tn`

> [!IMPORTANT]
> Ne pas modifier les enregistrements MX en production avant validation complète des tests de non-régression.

| Type | Hôte / Nom | Valeur / Cible | TTL | Rôle |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `mail.oussamma.tn` | `<IP_VPS_OVH>` | 3600 | Résolution du serveur mail |
| **MX** | `@` ou `oussamma.tn` | `10 mail.oussamma.tn.` | 3600 | Routage des courriels entrants |
| **TXT** | `@` ou `oussamma.tn` | `v=spf1 mx a:mail.oussamma.tn ~all` | 3600 | Politique SPF anti-spoofing |
| **TXT** | `mail._domainkey` | `v=DKIM1; k=rsa; p=<CLE_PUBLIQUE_DKIM>` | 3600 | Signature cryptographique DKIM |
| **TXT** | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@oussamma.tn` | 3600 | Politique DMARC de rejet/quarantaine |
| **PTR** | `<IP_VPS_REVERSE>` | `mail.oussamma.tn.` | 3600 | Résolution inverse (Reverse DNS OVH) |

---

## 3. Provisioning d'une Boîte Mail

Pour créer la boîte principale `contact@oussamma.tn` via la CLI Mailu :

```bash
docker compose -f infra/mailu/docker-compose.yml exec admin flask mailu admin contact oussamma.tn '<MOT_DE_PASSE_SECURISE>'
```

Pour créer un alias applicatif :

```bash
docker compose -f infra/mailu/docker-compose.yml exec admin flask mailu alias contact oussamma.tn noreply@oussamma.tn
```

---

## 4. Sauvegarde et Restauration

Les données d'emails Dovecot résident dans `./data/mail` et les bases SQLite/Rspamd dans `./data/data` et `./data/filter`.

Pour créer un snapshot cohérent :
```bash
tar -czvf mailu-backup-$(date +%Y%m%d).tar.gz ./data
```
