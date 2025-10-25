Inventaire technique — Flippin’ Maple

Document de référence vivant. Sert à comprendre toute l'architecture (code + BDD), suivre les impacts des modifs, et éviter de briser ce qui fonctionne déjà.

Ce document a deux gros blocs :

Le profil BDD complet (structure, relations, contraintes métier).

Une TODO list vivante / dette technique à tenir à jour.

Plus tard on ajoutera aussi la cartographie code → tables (quelles routes touchent quelles tables) pour traçabilité.

1. Profil BDD — Schéma métier et cohérence

Pour chaque table :

Colonnes importantes (type, null, défaut)

PK / Index / FK

Rôle métier

Connecté à (FK déjà présentes)

Connexions logiques supplémentaires (ce qui devrait être relié)

TODO (actions qu’on doit tenir en tête)

1.1 customers

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

TODO

Ajouter une FK souple carts.user_id → customers.id ON DELETE SET NULL, ou documenter pourquoi on ne veut pas de FK (paniers anonymes).

Documenter clairement la règle "commande invité vs commande client" : comment on remplit orders.customer_id et orders.customer_email.

1.2 addresses

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

TODO

Décider officiellement si on ajoute ces FKs ou pas :
Option A: on ajoute orders.shipping_address_id → addresses.id ON DELETE SET NULL et pareil pour billing, donc c’est référentiel.
Option B: on assume que ces colonnes peuvent devenir invalides et la vraie source est le snapshot (voir orders.shipping_address_snapshot).

Dans tous les cas, écrire dans le code serveur que orders.shipping_address_snapshot est la preuve légale. On ne doit jamais la modifier après paiement.

1.3 carts

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

carts.user_id devrait référencer customers.id
Il n’y a pas de FK en base, donc aujourd’hui on peut techniquement avoir un panier qui pointe vers un user supprimé.

TODO

Ajouter FK carts.user_id → customers.id ON DELETE SET NULL, ou documenter explicitement que des paniers orphelins sont autorisés (cas anonymes/conversion invité).

Dans le flux checkout, avant de créer la commande, on doit marquer le panier open → ordered pour respecter l’unicité uq_user_open.

1.4 abandoned_carts

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

TODO

Dans le code backend: exiger qu’on ait AU MOINS soit user_id, soit (anonymous_token + customer_email).

Documenter quand on met is_recovered = 1 exactement (création d’une commande payée? ouverture de la session Stripe?).

1.5 orders

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

paid_at, cancelled_at

created_at, updated_at

PK / Index / FK / CHECK

PK(id)

Index(status), Index(customer_email), Index(customer_id)

FK customer_id → customers.id ON DELETE SET NULL ON UPDATE CASCADE

CHECK json_valid(shipping_address_snapshot)

Rôle métier
Commande e-com complète : montant payé, infos d’expédition, association Stripe et Printful.

Connecté à

customers via customer_id

order_items.order_id → orders.id

order_status_history.order_id → orders.id

shipping_logs.order_id → orders.id

Connexions logiques supplémentaires

shipping_address_id devrait normalement correspondre à une ligne d’addresses de type 'shipping'

billing_address_id devrait normalement correspondre à une ligne d’addresses de type 'billing'
Important : shipping et billing PEUVENT être différentes (classique: cadeau envoyé à quelqu’un d’autre, mais facturation reste à l’acheteur).
La base permet deux IDs différents mais ne déclare pas de FK.

TODO

Choisir :

Option A: ajouter FK orders.shipping_address_id → addresses.id ON DELETE SET NULL et orders.billing_address_id → addresses.id ON DELETE SET NULL.

Option B: ne pas mettre de FK parce qu’une adresse peut être supprimée du profil après coup, et s’appuyer uniquement sur les snapshots immuables (shipping_address_snapshot, shipping_name_snapshot, etc.) comme preuve légale.

Documenter dans le code: les snapshots dans orders sont la source de vérité légale/fiscale. Ils ne doivent jamais être modifiés après coup.

Stripe et stripe_events: décider comment on relie un event Stripe à une commande pour audit post-mortem (voir stripe_events plus bas).

1.6 order_items

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

FK order_id → orders.id (on a vu au moins une contrainte ON DELETE CASCADE)

FK variant_id → product_variants.id ON DELETE CASCADE

CHECK json_valid(meta)

Rôle métier
Snapshot des lignes d’articles d’une commande. On capture le prix payé, la variante, et l’ID d’exécution Printful.

Connecté à

orders

product_variants → products

Connexions logiques supplémentaires

printful_variant_id doit correspondre à product_variants.printful_variant_id au moment de l’achat, sinon on ne sait plus quoi envoyer à Printful pour fulfillment.

TODO

Écrire dans le code backend que price_at_purchase et unit_price_cents sont immuables après création. On ne les “recalcule” jamais à partir du prix courant.

Valider au moment de l’insertion que printful_variant_id correspond bien à la variante vendue.

1.7 order_status_history

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

TODO

Dans la logique serveur, chaque update de orders.status doit créer une ligne ici. Sinon cette table ment.

1.8 shipping_logs

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

TODO

Décider ce qu’on fait si on supprime une commande mais qu’on garde un historique de livraison pour preuve. ON DELETE CASCADE supprime aussi le shipping_log : est-ce souhaité légalement ?

1.9 product_variants

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
Unité vendable concrète (taille/couleur/prix). C’est aussi la passeport vers Printful pour la production.

Connecté à

order_items.variant_id → product_variants.id

product_images.variant_id → product_variants.id

product_promotions.product_variant_id → product_variants.id

wishlists.variant_id → product_variants.id

Connexions logiques supplémentaires

main_category_id est un varchar alors que les catégories officielles vivent dans categories (id int, name unique). On doit clarifier ce que c’est : tag marketing libre ou vraie catégorie structurante.

variant_id vs printful_variant_id vs id sont trois identifiants différents, chacun avec un rôle distinct. Ça doit être documenté et respecté.

TODO

Écrire noir sur blanc dans la doc interne la différence entre :

product_variants.id (clé primaire DB)

product_variants.variant_id (ID interne métier/front)

product_variants.printful_variant_id (ID Printful réel pour la prod)
Confondre ces IDs = envoyer la mauvaise référence à Printful.

Décider si main_category_id doit devenir une vraie FK vers categories ou si ça reste un champ libre.

1.10 products

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

TODO

Décider si products.category doit devenir une FK :

soit products.category_id → categories.id,

soit on assume que category est un tag marketing libre, et categories sert à autre chose (filtres front / navigation).

Harmoniser external_id vs printful_product_id si les deux représentent la même chose.

1.11 product_images

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

TODO

Décider si on autorise des images pour des variantes désactivées (is_active = 0). Ça peut être utile pour archive / SEO ou ça peut polluer l’affichage en boutique.

1.12 product_promotions

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

TODO

Le backend doit ignorer automatiquement une promo expirée (end_date passée). Sinon le front peut afficher un rabais périmé.

1.13 reviews

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

TODO

Si on veut marquer “Acheté chez nous”, ajouter customer_id ou order_id dans reviews.

S’assurer que les insert respectent la contrainte rating 1..5 (sinon erreur SQL).

1.14 wishlists

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

TODO

Décider si on veut :

garder product_id comme “cache non-sûr” (rapide mais peut dévier),

ou bien forcer une FK product_id → products.id pour cohérence stricte.

1.15 refresh_tokens

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

TODO

Mettre en place une purge cron des tokens expirés pour éviter l’enflure lente de la table.

1.16 user_sessions

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

TODO

Vérifier si session_token est stocké en clair ou hashé. Si c’est un token réutilisable pour s’authentifier, il doit être traité comme un mot de passe (jamais en clair).

1.17 unsubscribes

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

TODO

Politique marketing à écrire noir sur blanc : si un email est dans unsubscribes, il bat consents. Autrement dit : se désabonner gagne toujours sur “j’avais dit oui avant”.

1.18 consents

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

TODO

Définir comment on gère l’expiration / révocation (revoked_at).

S’aligner avec unsubscribes : l’opt-out doit annuler l’opt-in même si consents dit “express”.

1.19 email_events

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

TODO

S’assurer que les webhooks du fournisseur courriel écrivent bien ici, et que le champ type correspond vraiment aux valeurs attendues côté reporting marketing.

1.20 stripe_events

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

TODO

Décider si on veut ajouter un champ order_id dans stripe_events quand on sait à quelle commande il correspond, pour debug rapide.

Sinon : documenter la procédure “comment retrouver la commande associée à un event Stripe ?”.

1.21 cron_logs / logs

cron_logs

id PK AUTO_INCREMENT

type, message, source, created_at

Sert à tracer les jobs planifiés (crons, batchs, synchronisations, etc.).

logs

id PK AUTO_INCREMENT (bigint unsigned)

level enum('debug','info','warn','error') INDEX

message (texte), context (INDEX), details (longtext), created_at (INDEX)

Sert de journal applicatif pour debug et audit interne.

TODO

Normaliser logs.context (par ex: 'checkout', 'printful_sync', 'auth') pour faciliter les filtres d’investigation.

Décider rétention : combien de temps on garde les logs en base avant purge/archivage.

2. TODO LIST VIVANTE

Ceci est le backlog technique / cohérence. À mettre à jour au fur et à mesure des changements.

 Ajouter ou documenter l’absence de FK carts.user_id → customers.id.
Recommandation: ON DELETE SET NULL pour garder le panier comme trace anonyme.

 Statuer sur les FKs orders.shipping_address_id et orders.billing_address_id → addresses.id.
Rappel : shipping et billing PEUVENT être différentes pour une même commande et c’est un comportement normal.
On doit soit ajouter les FKs (cohérence stricte), soit documenter officiellement que ces colonnes peuvent devenir invalides si l’adresse est supprimée, et que la vraie preuve est dans les snapshots.

 Documenter clairement dans le code backend que orders.shipping_address_snapshot, orders.shipping_name_snapshot, orders.email_snapshot sont des snapshots légaux immuables. On ne les retouche jamais après paiement.

 Clarifier products.category et product_variants.main_category_id vs la table categories.
Décider si c’est un système libre de tags, ou si on impose une FK vers categories.

 Documenter la triple identité des variantes :
- product_variants.id (PK DB),
- product_variants.variant_id (ID interne/front),
- product_variants.printful_variant_id (ID Printful).
Interdire les confusions dans le code.

 Vérifier que les prix historiques (order_items.price_at_purchase, order_items.unit_price_cents) ne sont jamais recalculés après coup.

 Vérifier que chaque changement de orders.status crée bien une entrée dans order_status_history.

 Purger régulièrement les refresh_tokens expirés.

 Vérifier si user_sessions.session_token est stocké en clair; si oui, migrer vers un hash.

 Normaliser logs.context pour rendre l’audit post-incident plus rapide.

 Marketing/compliance : définir la règle officielle “unsubscribes gagne toujours sur consents”, et l’appliquer partout.

 Stripe : définir la procédure pour relier stripe_events à une order (champ order_id direct, ou lookup par stripe_session_id/payment_intent_id).

 Promotions : s’assurer côté code que product_promotions expirées (end_date passée) sont ignorées automatiquement pour ne pas afficher de faux rabais.

3. Règles critiques (ne pas casser)

Un seul panier status='open' par utilisateur (contrainte UNIQUE uq_user_open). Le checkout doit mettre le panier en ordered au bon moment, sinon ça casse.

Les snapshots stockés dans orders (adresse, email, etc.) sont la vérité légale/fiscale. On ne les réécrit pas après coup.

Le prix payé dans order_items est un snapshot historique. On n’essaie pas de “recalculer” en fonction du prix actuel de la variante.

Les IDs reliés à Printful ne sont pas interchangeables :

product_variants.printful_variant_id = ID Printful réel, à envoyer à Printful;

product_variants.variant_id = ID interne métier/front;

product_variants.id = clé primaire DB.
Mélanger ces champs casse la fulfillment automatisée.

reviews.rating doit toujours rester entre 1 et 5 (contrainte CHECK). Toute insertion contournant ça est un bug logique, pas juste un warning.

Le couple shipping/billing pour une commande peut représenter deux adresses différentes. Ne jamais “forcer” billing = shipping côté code si l'utilisateur en a fourni deux.