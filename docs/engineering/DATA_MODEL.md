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
3. [Lot 2 — Catalogue](#lot-2--catalogue)
   - [products](#products--inventaire-110)
   - [product_variants](#product_variants--inventaire-19)
   - [product_images](#product_images--inventaire-111)
   - [product_promotions](#product_promotions--inventaire-112)
   - [reviews](#reviews--inventaire-113)
4. [Lot 3 — Panier et listes](#lot-3--panier-et-listes)
   - [carts](#carts--inventaire-13)
   - [abandoned_carts](#abandoned_carts--inventaire-14)
   - [wishlists](#wishlists--inventaire-114)
5. [Domaine Commandes](#domaine-commandes)
   - [orders](#orders--inventaire-15)
   - [order_items](#order_items--inventaire-16)
   - [order_status_history](#order_status_history--inventaire-17)
   - [shipping_logs](#shipping_logs--inventaire-18)
6. [Paiement — événements Stripe](#paiement--evenements-stripe)
   - [stripe_events](#stripe_events--inventaire-120)
7. [Observabilité](#observabilite)
   - [cron_logs](#cron_logs--inventaire-121)
   - [logs](#logs--inventaire-121)

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

---

## Lot 2 — Catalogue

### products ← inventaire §1.10

Colonnes clés
id PK AUTO_INCREMENT
external_id bigint(20) UNIQUE
name, description, image, gallery_images, brand, tags
category varchar(100) (string libre)
is_visible tinyint(1) DEFAULT 1
is_featured tinyint(1) DEFAULT 0
discount_percentage decimal(5,2) DEFAULT 0.00
views int DEFAULT 0
printful_product_id varchar(255)
created_at, updated_at

PK / Index / FK
PK(id)
UNIQUE(external_id)

Rôle métier
Fiche produit marketing (titres, images, branding). C’est le parent d’un ensemble de variantes.

Connecté à
product_variants.product_id → products.id
reviews.product_id → products.id

Connexions logiques supplémentaires
products.category (varchar) n’est pas lié à la table categories.
printful_product_id est la référence côté Printful au niveau produit global (différent de printful_variant_id qui est par variante).

### product_variants ← inventaire §1.9

Colonnes clés
id PK AUTO_INCREMENT
product_id int NOT NULL
sku varchar(255) INDEX
color, size, image
prix : price decimal(10,2) NOT NULL, discount_price, custom_price
inventaire : stock tinyint(1) DEFAULT 0, is_active tinyint(1) DEFAULT 1
dimensions/shipping : weight, width, height, length
options (texte libre, peut contenir des options configurables)

intégrations :
printful_variant_id bigint(20) NOT NULL → ID externe Printful
variant_id int(11) NOT NULL → ID interne maison exposé au front / business

catégorisation : main_category_id varchar(255) (actuellement pas FK)
currency varchar(3)
created_at, updated_at

PK / Index / FK
PK(id)
Index(product_id)
Index(sku)
FK product_id → products.id ON DELETE CASCADE

Rôle métier
Unité vendable concrète (taille/couleur/prix). C’est aussi le passeport vers Printful pour la production.

Connecté à
order_items.variant_id → product_variants.id
product_images.variant_id → product_variants.id
product_promotions.product_variant_id → product_variants.id
wishlists.variant_id → product_variants.id

Connexions logiques supplémentaires
main_category_id est un varchar alors que les catégories officielles vivent dans categories (id int, name unique). On doit clarifier ce que c’est : tag marketing libre ou vraie catégorie structurante.

variant_id vs printful_variant_id vs id sont trois identifiants différents, chacun avec un rôle distinct. Ça doit être documenté et respecté.

### product_images ← inventaire §1.11

Colonnes clés
id PK AUTO_INCREMENT
variant_id (FK product_variants.id)
type, url, filename, mime_type
width, height, dpi
status
preview_url, thumbnail_url
created_at timestamp DEFAULT current_timestamp()

PK / Index / FK
PK(id)
Index(variant_id)
FK variant_id → product_variants.id ON DELETE CASCADE

Rôle métier
Images associées à une variante précise (ex: t-shirt rouge Large vs t-shirt noir Small). On stocke aussi des dérivés (thumbnail, preview).

### product_promotions ← inventaire §1.12

Colonnes clés
id PK AUTO_INCREMENT
product_variant_id FK → product_variants.id
discount_percent decimal(5,2)
start_date, end_date

PK / Index / FK
PK(id)
Index(product_variant_id)
FK product_variant_id → product_variants.id ON DELETE CASCADE

Rôle métier
Promotions ciblées par variante, avec une fenêtre temporelle.

### reviews ← inventaire §1.13

Colonnes clés
id PK AUTO_INCREMENT
product_id FK → products.id
author_name
rating int CHECK rating BETWEEN 1 AND 5
comment
created_at timestamp DEFAULT current_timestamp()

PK / Index / FK / CHECK
PK(id)
Index(product_id)
FK product_id → products.id ON DELETE CASCADE
CHECK rating BETWEEN 1 AND 5

Rôle métier
Avis clients visibles publiquement. Actuellement pas de lien direct vers un customer_id ou order_id, donc pas de preuve “verified purchase”.

---

## Lot 3 — Panier et listes

### carts ← inventaire §1.3

Colonnes clés
id int unsigned PK AUTO_INCREMENT
user_id int unsigned NULL
status enum('open','ordered','abandoned') DEFAULT 'open'
created_at, updated_at (timestamps avec ON UPDATE)

PK / Index / Contraintes
PK(id)
Index(user_id)
UNIQUE uq_user_open(user_id, status)
→ garantit qu’un utilisateur n’a pas deux paniers open

Rôle métier
Panier actif d’un utilisateur connecté ou invité (en combinaison avec abandoned_carts). Passe par les états open → ordered → (ensuite suivi ailleurs).

Connecté à
abandoned_carts.cart_id → carts.id

Connexions logiques supplémentaires
carts.user_id devrait référencer customers.id.
Il n’y a pas de FK en base, donc aujourd’hui on peut techniquement avoir un panier qui pointe vers un user supprimé.

### abandoned_carts ← inventaire §1.4

Colonnes clés
id PK AUTO_INCREMENT
cart_id (FK carts.id)
user_id (FK customers.id)
anonymous_token (visiteurs pas loggés)
customer_email (visiteurs pas loggés ou clients déconnectés)
cart_snapshot longtext
cart_contents longtext CHECK json_valid(cart_contents)
source enum('inactivity','beforeunload','manual') DEFAULT 'beforeunload'
abandoned_at, last_activity, is_recovered, recovered_at, last_email_sent_at
checkout_session_id (Stripe Checkout), campaign_id (marketing)
created_at, updated_at

PK / Index / FK
PK(id)
Index sur cart_id, user_id, anonymous_token, customer_email, (customer_email,created_at), created_at, last_email_sent_at, checkout_session_id, is_recovered
FK cart_id → carts.id ON DELETE SET NULL ON UPDATE CASCADE
FK user_id → customers.id ON DELETE SET NULL ON UPDATE CASCADE
CHECK json_valid(cart_contents)

Rôle métier
Machine de retarget: qui a abandonné quoi, quand, à quelle étape du checkout, et est-ce qu’on lui a envoyé des emails.

Connecté à
carts via cart_id
customers via user_id

Connexions logiques supplémentaires
checkout_session_id est un pont vers Stripe, mais pas de FK interne (normal, Stripe vit hors DB).

### wishlists ← inventaire §1.14

Colonnes clés
id PK AUTO_INCREMENT
customer_id (FK customers.id, nullable)
product_id int NOT NULL
variant_id int NOT NULL FK → product_variants.id
printful_variant_id bigint(20) NOT NULL
created_at, updated_at

PK / Index / FK / Contraintes
PK(id)
UNIQUE(customer_id,variant_id)
Index(variant_id)
FK customer_id → customers.id ON DELETE CASCADE
FK variant_id → product_variants.id ON DELETE CASCADE

Rôle métier
Liste de favoris du client. Peut stocker aussi l’ID Printful pour offrir le bon visuel / prix direct.

Connexions logiques supplémentaires
product_id n’a pas de FK vers products.id. En théorie variant_id suffit pour remonter au produit. Donc product_id est probablement un cache (optimisation : éviter une jointure quand on affiche la wishlist).
Si c’est un cache, il peut devenir faux.

---

## Domaine Commandes

### orders ← inventaire §1.5

Colonnes clés
id PK AUTO_INCREMENT
customer_id (FK customers.id, nullable)
customer_email (copie email utilisée à l’achat)
shipping_address_id int NULL
billing_address_id int NULL
status varchar(50) DEFAULT 'pending'
total decimal(10,2)
valeurs en cents: subtotal_cents, shipping_cents, tax_cents, total_cents
shipping_cost, currency
Stripe: stripe_session_id, stripe_payment_intent_id, stripe_customer_id, client_reference_id
Printful: printful_order_id

Snapshots immuables:
email_snapshot
shipping_name_snapshot
shipping_address_snapshot longtext CHECK json_valid(shipping_address_snapshot)

paid_at datetime NULL
cancelled_at datetime NULL
created_at, updated_at

PK / Index / FK / CHECK
PK(id)
Index(status), Index(customer_email), Index(customer_id)
FK customer_id → customers.id ON DELETE SET NULL ON UPDATE CASCADE
CHECK json_valid(shipping_address_snapshot)

Rôle métier
Commande e-com complète : montant payé, infos d’expédition, association Stripe et Printful. C’est aussi le conteneur légal du “contrat de vente” (adresse livrable, email de facturation, prix exact à la seconde du checkout).

Connecté à
customers via customer_id
order_items.order_id → orders.id
order_status_history.order_id → orders.id
shipping_logs.order_id → orders.id

Connexions logiques supplémentaires
shipping_address_id devrait normalement correspondre à une ligne d’addresses de type 'shipping'.
billing_address_id devrait normalement correspondre à une ligne d’addresses de type 'billing'.

shipping et billing PEUVENT être différentes (cadeau envoyé à quelqu’un d’autre, facture pour l’acheteur). La base permet deux IDs différents mais ne déclare pas de FK.

### order_items ← inventaire §1.6

Colonnes clés
id PK AUTO_INCREMENT
order_id int NOT NULL
variant_id int NOT NULL
printful_variant_id bigint NOT NULL
quantity int NOT NULL
price_at_purchase decimal(8,2) NOT NULL (prix payé à ce moment précis)
unit_price_cents int NULL
meta longtext NULL CHECK json_valid(meta)
created_at datetime DEFAULT current_timestamp()
updated_at datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()

PK / Index / FK / CHECK
PK(id)
Index(order_id), Index(variant_id)
FK order_id → orders.id (ON DELETE CASCADE)
FK variant_id → product_variants.id ON DELETE CASCADE
CHECK json_valid(meta)

Rôle métier
Snapshot des lignes d’articles d’une commande. On capture le prix payé, la variante, et l’ID d’exécution Printful.

Connecté à
orders
product_variants → products

### order_status_history ← inventaire §1.7

Colonnes clés
id PK AUTO_INCREMENT
order_id int NOT NULL
old_status, new_status
changed_at timestamp DEFAULT current_timestamp()

PK / Index / FK
PK(id)
Index(order_id)
FK order_id → orders.id ON DELETE CASCADE

Rôle métier
Historique d’état de chaque commande : pending → paid → fulfilled → shipped → etc.

### shipping_logs ← inventaire §1.8

Colonnes clés
id PK AUTO_INCREMENT
order_id int NULL
provider, tracking_number, status
shipped_at timestamp DEFAULT current_timestamp()

PK / Index / FK
PK(id)
Index(order_id)
FK order_id → orders.id ON DELETE CASCADE

Rôle métier
Suivi logistique : numéro de suivi, transporteur, statut d’expédition.

---

## Paiement — événements Stripe

### stripe_events ← inventaire §1.20

Colonnes clés
event_id varchar(255) PK
event_type varchar(64) INDEX
created_at datetime DEFAULT utc_timestamp()
payload longtext
received_at datetime DEFAULT current_timestamp()

PK / Index
PK(event_id)
Index(event_type,created_at)

Rôle métier
Log brut des webhooks Stripe (paiement, remboursement, etc.). C’est ta boîte noire Stripe pour audit.

Connexions logiques supplémentaires
Pas de FK vers orders, mais on peut relier un event Stripe à une commande en utilisant orders.stripe_session_id / orders.stripe_payment_intent_id qu’on retrouve dans le payload.

---

## Observabilité

### cron_logs ← inventaire §1.21

Colonnes clés
id PK AUTO_INCREMENT
type, message, source, created_at

Rôle métier
Sert à tracer les jobs planifiés (crons, batchs, synchronisations, etc.).

### logs ← inventaire §1.21

Colonnes clés
id PK AUTO_INCREMENT (bigint unsigned)
level enum('debug','info','warn','error') INDEX
message (texte), context (INDEX), details (longtext), created_at (INDEX)

Rôle métier
Sert de journal applicatif pour debug et audit interne.
