# Modèle de données

**Document :** `docs/engineering/DATA_MODEL.md`  
**Rôle :** description de l’état actuel documenté du schéma métier (tables, colonnes, clés, relations, contraintes, comportements).  
**Statut :** source officielle pour le modèle de données (sections migrées uniquement).  
**Provenance :** `docs/INVENTAIRE_Flippin_Maple.md` — section `Profil BDD — Schéma métier et cohérence`  
**Date de migration :** 2026-07-16  

**Avertissement — contraintes Hostinger :** la prod MySQL peut différer du schéma local (ALTER TABLE / FK). Voir [HOSTING_CONSTRAINTS.md](HOSTING_CONSTRAINTS.md).

Les TODO, décisions ouvertes et dettes techniques restent dans `docs/INVENTAIRE_Flippin_Maple.md` jusqu’à migration vers un backlog officiel.

---

## Table des matières

1. [Préambule Profil BDD](#preambule-profil-bdd)
2. [Lot 1 — Identité client et conformité](#lot-1--identite-client-et-conformite)
   - [customers](#customers--inventaire-11)
   - [addresses](#addresses--inventaire-12)
   - [refresh_tokens](#refresh_tokens--inventaire-115)
   - [user_sessions](#user_sessions--inventaire-116)
   - [unsubscribes](#unsubscribes--inventaire-117)
   - [consents](#consents--inventaire-118)
   - [email_events](#email_events--inventaire-119)

---

## Préambule Profil BDD

Profil BDD — Schéma métier et cohérence

Pour chaque table :

Colonnes importantes (type, null, défaut)

PK / Index / FK

Rôle métier

Connecté à (FK déjà présentes)

Connexions logiques supplémentaires (ce qui devrait être relié)

---

## Lot 1 — Identité client et conformité

### customers ← inventaire §1.1

Colonnes clés
id int PK AUTO_INCREMENT
email varchar(100) UNIQUE
first_name, last_name
password_hash
is_subscribed tinyint(1) DEFAULT 0
role enum('user','admin') DEFAULT 'user'
created_at, updated_at, last_login

PK / Index / Contraintes
PK(id)
UNIQUE(email)
Index(created_at), Index(last_login)

Rôle métier
Compte utilisateur. Sert à l’auth, aux commandes, au marketing, et comme point d’ancrage du profil client.

Connecté à (FK dans d’autres tables)
addresses.customer_id → customers.id
consents.customer_id → customers.id
email_events.customer_id → customers.id
orders.customer_id → customers.id
abandoned_carts.user_id → customers.id
refresh_tokens.user_id → customers.id
unsubscribes.customer_id → customers.id
user_sessions.customer_id → customers.id
wishlists.customer_id → customers.id

Note : carts.user_id pointe logiquement vers customers.id, mais il n’y a pas de FK formelle en base.

Connexions logiques supplémentaires
orders.customer_email est une copie de l’email utilisé à l’achat. Ça peut différer de customers.email plus tard (changement d’adresse ou commande invité). C’est volontaire.

### addresses ← inventaire §1.2

Colonnes clés
id int PK AUTO_INCREMENT
customer_id int NOT NULL
type enum('shipping','billing') DEFAULT 'shipping'
address_line1, address_line2, city, postal_code, province, country
created_at timestamp DEFAULT current_timestamp()

PK / Index / FK
PK(id)
Index(customer_id)
FK customer_id → customers.id (ON DELETE CASCADE)

Rôle métier
Carnet d’adresses d’un client. Une adresse peut être “shipping” (livraison) ou “billing” (facturation). Les deux peuvent être différentes pour la même commande, c’est normal et supporté.

Connecté à
customers via customer_id

Connexions logiques supplémentaires
orders.shipping_address_id devrait référencer addresses.id
orders.billing_address_id devrait référencer addresses.id
Ces deux colonnes existent dans orders, mais il n’y a pas de FK en base.

C’est important : shipping et billing PEUVENT être différentes pour une même commande. Donc, dans orders, on veut potentiellement deux FKs vers deux rows différentes de addresses.

Pourquoi elles ne sont pas FK dans la base actuellement :

une adresse peut être supprimée du compte après la commande

l’info légale doit rester dans la commande elle-même (snapshot immuable)

### refresh_tokens ← inventaire §1.15

Colonnes clés
id PK AUTO_INCREMENT
user_id FK → customers.id
refresh_token varchar(255) (indexé)
created_at, expires_at

PK / Index / FK
PK(id)
Index(user_id)
Index(refresh_token)
FK user_id → customers.id ON DELETE CASCADE

Rôle métier
Auth longue durée (token de rafraîchissement / renouvellement d’accès).

### user_sessions ← inventaire §1.16

Colonnes clés
id PK AUTO_INCREMENT
customer_id FK → customers.id (nullable)
session_token varchar(255)
created_at timestamp DEFAULT current_timestamp()
last_seen timestamp DEFAULT current_timestamp() ON UPDATE current_timestamp()

PK / Index / FK
PK(id)
Index(customer_id)
FK customer_id → customers.id ON DELETE CASCADE

Rôle métier
Sessions actives (probablement côté front / app). Peut servir à afficher “dernière activité”.

### unsubscribes ← inventaire §1.17

Colonnes clés
id PK AUTO_INCREMENT
customer_id FK → customers.id (nullable)
email varchar(255) UNIQUE
reason varchar(255)
created_at datetime DEFAULT current_timestamp()

PK / Index / FK
PK(id)
UNIQUE(email)
Index(customer_id)
FK customer_id → customers.id ON DELETE SET NULL

Rôle métier
Liste “ne plus jamais envoyer de marketing à cette adresse”.

### consents ← inventaire §1.18

Colonnes clés
id PK AUTO_INCREMENT
customer_id FK → customers.id (nullable)
subject_type enum('user','email')
subject_id bigint (peut référer un user ou juste une adresse…)
email varchar(255) (peut être rempli même sans compte)
purpose enum('marketing_email')
basis enum('express','implied')
method enum('checkbox','double_opt_in','import')
text_snapshot longtext (copie exacte du texte de consentement donné à ce moment)
locale varchar(10) DEFAULT 'fr-CA'
source varchar(50)
ip, user_agent
granted_at, expires_at, revoked_at

PK / Index / FK
PK(id)
Index(customer_id), Index(email), Index(purpose,granted_at)
FK customer_id → customers.id ON DELETE SET NULL

Rôle métier
Preuve légale qu’on a le droit d’envoyer un courriel marketing à cette personne/adresse.

### email_events ← inventaire §1.19

Colonnes clés
id PK AUTO_INCREMENT
customer_id FK → customers.id (nullable)
email varchar(255) NOT NULL
message_id varchar(255)
type enum('delivered','bounce','complaint','open','click','reject')
meta longtext (CHECK json_valid(meta))
occurred_at datetime NOT NULL

PK / Index / FK
PK(id)
Index(email), Index(type,occurred_at), Index(customer_id)
FK customer_id → customers.id ON DELETE SET NULL
CHECK json_valid(meta)

Rôle métier
Historique des événements d’envoi d’email (livré, ouvert, rejeté, plainte spam…).
