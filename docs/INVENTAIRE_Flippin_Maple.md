Inventaire technique — Flippin’ Maple

Document de référence vivant. Sert à comprendre toute l'architecture (code + BDD), suivre les impacts des modifs, et éviter de briser ce qui fonctionne déjà.

Ce document a deux gros blocs :

Le profil BDD complet (structure, relations, contraintes métier).

Une TODO list vivante / dette technique à tenir à jour.

Plus tard on ajoutera aussi la cartographie code → tables (quelles routes touchent quelles tables) pour traçabilité.

IMPORTANT — Contraintes d’hébergement (Hostinger / prod actuelle)

→ Contenu migré vers [engineering/HOSTING_CONSTRAINTS.md](engineering/HOSTING_CONSTRAINTS.md) (2026-07-16).

Profil BDD — Schéma métier et cohérence

→ Préambule et gabarit migrés vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#preambule-profil-bdd) (2026-07-16).
→ Les sections de tables non encore migrées restent ci-dessous dans l’inventaire.
→ Les TODO restent dans l’inventaire jusqu’à migration vers un backlog officiel.

1.1 customers

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#customers--inventaire-11) (2026-07-16).

TODO

Ajouter une FK souple carts.user_id → customers.id ON DELETE SET NULL, ou documenter pourquoi on ne veut pas de FK (paniers anonymes).

Documenter clairement la règle "commande invité vs commande client" : comment on remplit orders.customer_id et orders.customer_email.

1.2 addresses

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#addresses--inventaire-12) (2026-07-16).

TODO

Décider officiellement si on ajoute ces FKs ou pas :

Option A: on ajoute orders.shipping_address_id → addresses.id ON DELETE SET NULL et pareil pour billing, donc c’est référentiel.

Option B: on assume que ces colonnes peuvent devenir invalides et la vraie source est le snapshot (voir orders.shipping_address_snapshot).

Dans tous les cas, écrire dans le code serveur que orders.shipping_address_snapshot est la preuve légale. On ne doit jamais la modifier après paiement.

1.3 carts

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#carts--inventaire-13) (2026-07-16).

TODO

Ajouter FK carts.user_id → customers.id ON DELETE SET NULL, ou documenter explicitement que des paniers orphelins sont autorisés (cas anonymes/conversion invité).

Dans le flux checkout, avant de créer la commande, on doit marquer le panier open → ordered pour respecter l’unicité uq_user_open.

1.4 abandoned_carts

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#abandoned_carts--inventaire-14) (2026-07-16).

TODO

Dans le code backend: exiger qu’on ait AU MOINS soit user_id, soit (anonymous_token + customer_email).

Documenter quand on met is_recovered = 1 exactement (création d’une commande payée? ouverture de la session Stripe?).

1.5 orders

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#orders--inventaire-15) (2026-07-16).

paid_at datetime NULL ← défini uniquement par le webhook Stripe une fois le paiement confirmé

Important (métier) :

La ligne est créée en status='pending' AVANT de rediriger l’utilisateur chez Stripe.

Les snapshots email*snapshot / shipping*\*\_snapshot sont figés à ce moment-là et ne doivent jamais être modifiés après.

paid_at est posé plus tard par le webhook Stripe quand Stripe confirme le paiement réussi, jamais par le contrôleur checkout.

TODO

Choisir :

Option A: ajouter FK orders.shipping_address_id → addresses.id ON DELETE SET NULL et orders.billing_address_id → addresses.id ON DELETE SET NULL.

Option B: ne pas mettre de FK parce qu’une adresse peut être supprimée du profil après coup, et s’appuyer uniquement sur les snapshots immuables (shipping_address_snapshot, shipping_name_snapshot, etc.) comme preuve légale.

Documenter dans le code: les snapshots dans orders sont la source de vérité légale/fiscale. Ils ne doivent jamais être modifiés après coup.

Stripe et stripe_events: décider comment on relie un event Stripe à une commande pour audit post-mortem (voir stripe_events plus bas). paid_at doit être synchronisé avec cet event Stripe.

1.6 order_items

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#order_items--inventaire-16) (2026-07-16).

Connexions logiques supplémentaires
order_items.variant_id est toujours la PK réelle product_variants.id (pas le variant_id “marketing” du front).
Le backend mappe/convertit avant INSERT :

Le front peut envoyer un ID de variante “business” (variant_id interne vitrine).

Le serveur retrouve la vraie clé primaire product_variants.id.

Si on ne peut pas résoudre, on bloque la création et on n’insère pas l’item (sinon FK casse).

TODO

Écrire dans le code backend que price_at_purchase et unit_price_cents sont immuables après création. On ne les “recalcule” jamais à partir du prix courant.

Valider au moment de l’insertion que printful_variant_id correspond bien à la variante vendue.

1.7 order_status_history

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#order_status_history--inventaire-17) (2026-07-16).

TODO

Dans la logique serveur, chaque update de orders.status doit créer une ligne ici. Sinon cette table ment.

1.8 shipping_logs

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#shipping_logs--inventaire-18) (2026-07-16).

TODO

Décider ce qu’on fait si on supprime une commande mais qu’on garde un historique de livraison pour preuve. ON DELETE CASCADE supprime aussi le shipping_log : est-ce souhaité légalement ?

1.9 product_variants

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#product_variants--inventaire-19) (2026-07-16).

TODO

Écrire noir sur blanc dans la doc interne la différence entre :

product_variants.id (clé primaire DB)

product_variants.variant_id (ID interne métier/front)

product_variants.printful_variant_id (ID Printful réel pour la prod)

Confondre ces IDs = envoyer la mauvaise référence à Printful.

Décider si main_category_id doit devenir une vraie FK vers categories ou si ça reste un champ libre.

1.10 products

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#products--inventaire-110) (2026-07-16).

TODO

Décider si products.category doit devenir une FK :

soit products.category_id → categories.id,

soit on assume que category est un tag marketing libre, et categories sert à autre chose (filtres front / navigation).

Harmoniser external_id vs printful_product_id si les deux représentent la même chose.

1.11 product_images

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#product_images--inventaire-111) (2026-07-16).

TODO

Décider si on autorise des images pour des variantes désactivées (is_active = 0). Ça peut être utile pour archive / SEO ou ça peut polluer l’affichage en boutique.

1.12 product_promotions

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#product_promotions--inventaire-112) (2026-07-16).

TODO

Le backend doit ignorer automatiquement une promo expirée (end_date passée). Sinon le front peut afficher un rabais périmé.

1.13 reviews

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#reviews--inventaire-113) (2026-07-16).

TODO

Si on veut marquer “Acheté chez nous”, ajouter customer_id ou order_id dans reviews.

S’assurer que les insert respectent la contrainte rating 1..5 (sinon erreur SQL).

1.14 wishlists

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#wishlists--inventaire-114) (2026-07-16).

TODO

Décider si on veut :

garder product_id comme “cache non-sûr” (rapide mais peut dévier),

ou bien forcer une FK product_id → products.id pour cohérence stricte.

1.15 refresh_tokens

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#refresh_tokens--inventaire-115) (2026-07-16).

TODO

Mettre en place une purge cron des tokens expirés pour éviter l’enflure lente de la table.

1.16 user_sessions

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#user_sessions--inventaire-116) (2026-07-16).

TODO

Vérifier si session_token est stocké en clair ou hashé. Si c’est un token réutilisable pour s’authentifier, il doit être traité comme un mot de passe (jamais en clair).

1.17 unsubscribes

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#unsubscribes--inventaire-117) (2026-07-16).

TODO

Politique marketing à écrire noir sur blanc : si un email est dans unsubscribes, il bat consents. Autrement dit : se désabonner gagne toujours sur “j’avais dit oui avant”.

1.18 consents

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#consents--inventaire-118) (2026-07-16).

TODO

Définir comment on gère l’expiration / révocation (revoked_at).

S’aligner avec unsubscribes : l’opt-out doit annuler l’opt-in même si consents dit “express”.

1.19 email_events

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#email_events--inventaire-119) (2026-07-16).

TODO

S’assurer que les webhooks du fournisseur courriel écrivent bien ici, et que le champ type correspond vraiment aux valeurs attendues côté reporting marketing.

1.20 stripe_events

→ Descriptif migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#stripe_events--inventaire-120) (2026-07-16).

TODO

Décider si on veut ajouter un champ order_id dans stripe_events quand on sait à quelle commande il correspond, pour debug rapide.

Sinon : documenter la procédure “comment retrouver la commande associée à un event Stripe ?”.

1.21 cron_logs / logs

→ Descriptif `cron_logs` migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#cron_logs--inventaire-121) (2026-07-16).
→ Descriptif `logs` migré vers [engineering/DATA_MODEL.md](engineering/DATA_MODEL.md#logs--inventaire-121) (2026-07-16).

TODO

Normaliser logs.context (par ex: 'checkout', 'printful_sync', 'auth', 'webhook') pour faciliter les filtres d’investigation.

Décider rétention : combien de temps on garde les logs en base avant purge/archivage.

(REFORMAT TÂCHES PRIORISÉES)

Je reprends ta TODO list vivante, mais triée par catégories opérationnelles et transformée en tâches concrètes. Chaque tâche reçoit un ID court. Ça te donne une base de suivi sans risquer la grande réécriture qui casse tout.

2.a Sécurité / conformité

SEC-001 — Hash des sessions persistantes
Problème: user_sessions.session_token pourrait être stocké en clair.
Tâche: Vérifier comment session_token est généré et stocké. Si ce token peut être réutilisé pour authentifier un user, il doit être hashé avant INSERT, exactement comme un mot de passe.
Tables: user_sessions.
Contrôleurs touchés: authController.
Risque si ignoré: vol de compte juste en volant une entrée DB.

SEC-002 — Purge des refresh_tokens expirés
Problème: refresh_tokens garde potentiellement des tokens expirés à l’infini.
Tâche: Ajouter un cron job / job planifié qui supprime (ou invalide) les refresh_tokens dont expires_at < NOW().
Tables: refresh_tokens.
Risque: surface d’attaque & gonflement DB.

SEC-003 — unsubscribes > consents
Problème: légalement, si un email est dans unsubscribes, on ne doit plus jamais lui envoyer de marketing, même s’il a un consentement "express".
Tâche: Dans toute logique d’envoi marketing, appliquer en priorité unsubscribes.email.
Tables: unsubscribes, consents.
Risque: conformité anti-spam.

SEC-004 — Désalignement cookie vs localStorage auth
Problème: le backend (checkoutController) lit les JWT d’auth uniquement via cookies httpOnly (access / refresh), mais le front stocke aussi des tokens dans localStorage.
Risque: un utilisateur peut être “connecté” pour le front mais pas pour le backend, ou inversement.
Tâche: Documenter ce dualisme et décider une seule source d’autorité (cookies httpOnly uniquement, ou bien header Bearer depuis localStorage).
Tables: customers, refresh_tokens.
Impact: cohérence de l’état login pendant le checkout.

2.b Argent / commandes / intégrité transactionnelle

PAY-001 — Invariants checkout dans le code
Problème: rien empêche un refactor futur de casser les étapes critiques (snapshot avant Stripe, lock panier, etc.).
Tâche: Ajouter en haut de createCheckoutSession dans checkoutController un bloc de commentaire expliquant les invariants critiques :

snapshot first,

order_items écrits avec prix figé,

order_status_history initial,

stripe_session_id lié à la commande,

lock du panier et respect uq_user_open.
Tables: carts, orders, order_items, order_status_history.

PAY-002 — Marquage 'paid' via webhook Stripe seulement
Problème: faut s’assurer qu’aucun autre endroit que le webhook ne passe une commande à status='paid'.
Tâche: Dans stripeWebhookController, documenter clairement :

"C’est UNIQUEMENT ici qu’on passe pending → paid."

"On doit écrire paid_at, puis ajouter order_status_history (pending→paid)."
Tables: orders, order_status_history, stripe_events.

PAY-003 — Lien entre stripe_events et orders
Problème: aujourd’hui stripe_events est juste un log brut sans lien direct vers orders.
Tâche: Dans le webhook Stripe, quand on sait associer l’event Stripe à une commande (via stripe_session_id / payment_intent), ajouter aussi orders.id dans stripe_events (nouvelle colonne order_id ou champ existant si déjà prévu).
But: retracer rapidement une plainte de paiement.
Tables: stripe_events, orders.
Note: côté SQL pur, tant qu’on n’a pas ALTER TABLE sur Hostinger, on le documente comme intention produit; la liaison peut aussi être logique (lookup) tant qu’on ne peut pas créer la FK.

PAY-004 — Préserver les snapshots d’adresse
Problème: risque qu’un dev futur "corrige" une adresse d’expédition après paiement.
Tâche: Commentaire clair dans checkoutController ET dans le modèle Order expliquant que:

shipping_address_snapshot, shipping_name_snapshot, email_snapshot sont la preuve légale,

INTERDIT de les modifier après le paiement.
Tables: orders.

PAY-005 — Mapping variant_id → product_variants.id
Problème: erreur FK "Cannot add or update a child row" quand on insère dans order_items avec le mauvais ID de variante.
Tâche: Toujours résoudre l’ID reçu du front (variant_id business / printful_variant_id) vers la vraie PK product_variants.id avant INSERT dans order_items.variant_id, sinon MySQL crache et la commande part pas.
Tables: product_variants, order_items.

2.c Marketing / CRM

MKT-001 — Statut des promos expirées
Problème: product_promotions peut contenir des promos dont end_date est passée, mais le front pourrait encore afficher le rabais.
Tâche: Le backend doit filtrer les promos expirées automatiquement: si NOW() > end_date, ignorer.
Tables: product_promotions.
Impact: éviter les faux rabais illégaux.

MKT-002 — Reviews "achat vérifié"
Problème: reviews n’a pas de lien garanti avec une commande payée.
Tâche: Spécifier dans le backlog produit si on veut ajouter customer_id ou order_id à reviews pour marquer "Acheteur vérifié".
Tables: reviews, orders, customers.
Note: ça impacte l’UX marketing, pas critique technique immédiate.

2.d Observabilité / traçabilité

OBS-001 — logs.context normalisé
Problème: Les logs systèmes (logs / cron_logs) sont difficiles à filtrer parce que context n’est pas normalisé.
Tâche: Définir une liste fermée de context acceptés: 'checkout', 'auth', 'printful_sync', 'webhook_stripe', etc. Écrire ça dans la doc du logger + l’appliquer quand on log.
Tables: logs, cron_logs.
Bénéfice: incident response rapide.

OBS-002 — Procédure de résolution Stripe → Commande
Problème: aujourd’hui le lien mental "event Stripe X → order Y" vit juste dans nos têtes.
Tâche: Définir et documenter dans stripeWebhookController:

Comment on récupère la commande (via stripe_session_id ou payment_intent_id).

Comment on journalise ça (order_status_history, stripe_events.order_id).
Tables: stripe_events, orders, order_status_history.
Impact: permet d’enquêter un remboursement, une fraude, un litige carte.

Règles critiques (ne pas casser)

Quand on écrit order_items, on doit mapper l’ID de variante du front vers la vraie clé primaire product_variants.id pour respecter la FK. Ne jamais insérer directement l’ID "marketing" du front dans order_items.variant_id.

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

Flux Checkout — version live du 2025-10-25

Ce bloc décrit exactement ce que le backend fait (ou doit faire maintenant qu’on a mis à jour checkoutController.js et webhookController.js). Ce n’est pas théorique. C’est la vérité utilisée pour l’argent qui sort de la poche du client.

Étapes :

Auth utilisateur

Le contrôleur createCheckoutSession essaie de lire req.cookies.access.

Si le token d’accès (access token JWT) est expiré, il tente req.cookies.refresh.

Si le refresh est valide, il réémet un nouveau access token sans forcer le re-login.

Résultat : on obtient un userId (customers.id) OU null si invité.

Note : ça veut dire que le checkout marche aussi pour les invités. On supporte "guest checkout".

Normalisation du panier

Le front envoie cart (ou items/lineItems/cartItems) + cartId.

Le contrôleur construit les line_items Stripe :

soit avec priceId existant,

soit en générant price_data à la volée (name, unit_amount en cents, images http(s) valides).

Si un item n’a pas de prix valide, on refuse la requête avec code 400 (BAD_LINE_ITEMS).

Calcul des montants

On calcule cartSubtotalCents en additionnant chaque (prix_unitaire \* quantité) des items.

On calcule shippingCents à partir de raw.shipping_rate.rate (valeur envoyée par le front).

totalCents = cartSubtotalCents + shippingCents.

La devise vient de process.env.CURRENCY (ex: CAD).

Snapshot légal d’adresse et d’email

On construit un objet shippingNormalized { name, address1, city, state, country, zip } à partir de ce que le front a envoyé.

On capture aussi raw.customer_email, en minuscules, pour l’envoyer dans :

orders.customer_email

orders.email_snapshot

Pourquoi c’est critique :

Même si le client change son adresse plus tard dans son profil, la commande garde le snapshot original qu’on a facturé / promis d’expédier.

Ce snapshot devient la "preuve légale/fiscale".

Création de la commande en base (status = 'pending')

On insère dans orders une nouvelle ligne avec :

customer_id (nullable si invité),

customer_email,

status = 'pending',

subtotal_cents, shipping_cents, total_cents,

shipping_cost (shippingCents converti en décimal),

total (totalCents converti en décimal),

currency,

email_snapshot,

shipping_name_snapshot,

shipping_address_snapshot (JSON.stringify du shippingNormalized),

created_at / updated_at = NOW().

paid_at reste NULL ici. On ne touche pas paid_at tant que Stripe n’a pas confirmé. paid_at sera rempli par le webhook Stripe, pas ici.

On récupère l’orderId nouvellement créé.

Snapshot des items vendus

Pour chaque item du panier, on insère une ligne dans order_items avec :

order_id = l’orderId ci-dessus,

variant_id = product_variants.id correspondant à la variante achetée (et pas juste l’ID marketing envoyé par le front),

printful_variant_id (ID Printful réel pour la prod),

quantity,

price_at_purchase (prix unitaire en dollars à ce moment-là, genre "29.99"),

unit_price_cents (le même prix mais en cents exacts, ex: 2999),

meta (JSON libre : taille choisie, couleur choisie, etc. au moment du checkout).

Surtout : on NE REVIENT PLUS JAMAIS réécrire ces valeurs après coup, même si on change les prix des produits dans la boutique. C’est l’historique contractuel.

Historique initial de statut

On insère dans order_status_history une première ligne :

old_status = 'pending'

new_status = 'pending'

changed_at = NOW()

Ça crée le début de la traçabilité pour cette commande.

Client Stripe

On cherche / crée un Stripe Customer basé sur l’email et l’adresse fournie.

On met à jour orders.stripe_customer_id avec cet ID Stripe.

Session Stripe Checkout

On crée une session Stripe Checkout (stripe.checkout.sessions.create) :

mode = 'payment'

line_items = construit plus haut

shipping_address_collection.allowed_countries = ['CA','US']

shipping_options = une option livrée avec le coût shippingCents

customer = stripe_customer_id

client_reference_id = orderId (string)

metadata.order_id = orderId aussi

success_url = FRONTEND_URL + /checkout/success?session_id={CHECKOUT_SESSION_ID}

cancel_url = FRONTEND_URL + /checkout/cancel

Stripe nous retourne session.id.

Liaison commande ↔ Stripe

On met à jour la ligne orders qu’on vient de créer avec:

stripe_session_id = session.id

C’est critique pour les webhooks Stripe : ça nous permettra de retrouver l’ordre depuis un event Stripe signé.

Verrouillage du panier

On prend cartId (fourni par le front dans la requête).

On exécute UPDATE carts SET status='ordered', updated_at=NOW() WHERE id = ? AND status='open'.

Résultat :

l’utilisateur n’a plus de panier open,

la contrainte UNIQUE uq_user_open reste vraie,

impossible de relancer un autre checkout sur le même panier sans recréer un nouveau panier.

C’est l’équivalent applicatif d’une contrainte d’intégrité qu’on ne peut pas faire en dur dans MySQL sans ALTER TABLE.

Réponse envoyée au front

On renvoie { id: session.id, url: session.url }.

Le front redirige l’utilisateur vers Stripe Checkout.

Note routing frontend :

Stripe redirigera ensuite vers /checkout/success?session_id=....

Le frontend doit déclarer une route React Router sur /checkout/success.

On expose aussi /success comme alias interne pour compatibilité interne, mais Stripe appelle bien /checkout/success.

Le composant Success.jsx :

lit session_id,

tente un /api/payments/verify (best effort, juste informatif pour l’UX),

vide le panier côté front,

redirige immédiatement vers /shop?flash=merci.

L’utilisateur ne reste pas sur /checkout/success, c’est un trampoline technique.

Conséquences importantes :

Les snapshots (adresse, prix, contenu du panier) sont déjà écrits dans la DB AVANT que Stripe prenne le paiement.

On sait exactement quelle commande correspond à quelle session Stripe (lien stripe_session_id).

Le panier est gelé en ordered et ne peut plus être réutilisé comme panier actif.

L’historique d’état de la commande commence déjà (order_status_history).

paid_at est encore NULL ici → pas de mensonge comptable.

Webhook Stripe (après paiement)

Quand Stripe confirme le paiement (event checkout.session.completed ou payment_intent.succeeded), le backend doit :

retrouver la commande via stripe_session_id (client_reference_id = orderId) ou payment_intent_id,

mettre orders.status = 'paid',

mettre orders.paid_at = UTC_TIMESTAMP() (NOW en UTC),

éventuellement finaliser total / shipping_cost avec les montants réels renvoyés par Stripe,

insérer dans order_status_history une ligne old_status='pending', new_status='paid'.

À ce moment-là on peut aussi lancer :

création de commande Printful,

enregistrement du tracking plus tard dans shipping_logs quand Printful nous rendra un numéro de suivi.

Résumé du flux checkout :

Ce n’est pas juste "Stripe nous donne un succès".
C’est "on fabrique une commande pending complète et historisée AVANT le paiement, puis Stripe vient juste valider l’argent et on passe cette commande en paid via le webhook signé".

CARTOGRAPHIE ROUTES → TABLES

But
Relier chaque contrôleur critique du backend aux tables qu’il touche, et rappeler les règles métier qu’il doit absolument respecter pour ne pas briser la boutique (argent, légalité, sécurité).

5.1 authController

Endpoints couverts (typique):
POST /api/auth/login
POST /api/auth/refresh-token
POST /api/auth/logout
GET /api/auth/whoami (ou équivalent)

Tables lues/écrites

customers

LECTURE: on lit l’utilisateur par email pour vérifier le mot de passe (password_hash).

ÉCRITURE: on met à jour last_login (timestamp) quand le login réussit.

refresh_tokens

ÉCRITURE: à la connexion réussie, on génère un refresh_token (longue durée) qu’on associe à user_id et à une date d’expiration future.

LECTURE: lors de /refresh-token, on vérifie si le refresh_token soumis existe, est valide (pas expiré), et correspond bien à cet utilisateur.

SUPPRESSION / NETTOYAGE attendu: tout token expiré devrait être purgé régulièrement (cron).

user_sessions

ÉCRITURE: on peut créer une session (session_token, customer_id, created_at, last_seen).

LECTURE/MÀJ: on met à jour last_seen quand le user fait des requêtes authentifiées.

SÉCURITÉ IMPORTANTE: si session_token est réutilisé côté client comme preuve d’identité, il ne doit jamais être stocké en clair en base. Il doit être hashé comme un mot de passe.

Règles critiques associées à authController (NE PAS CASSER)

password_hash est la seule source de vérité pour la vérification du mot de passe. On ne stocke jamais le mot de passe brut.

À chaque login réussi:

last_login dans customers doit être mis à jour.

Un refresh_token DOIT être créé/renouvelé proprement et lié à l’utilisateur.

/refresh-token doit:

refuser un refresh_token expiré ou inconnu (sinon vol de session facile),

idéalement invalider/rotater l’ancien token (anti-rejeu).

Toute session persistante (user_sessions.session_token) doit être traitée comme un secret:

si c’est un bearer token, il doit être hashé en DB, pas stocké tel quel en clair.

Il doit exister (ou être prévu) un job planifié pour purger refresh_tokens expirés, sinon la table enfle et les vieux tokens restent techniquement volables.

Impact si on brise ces règles:

Compromission de compte (sécurité).

Sessions zombies impossibles à gérer.

Risque légal si fuite de tokens en clair.

Note cohérence auth :

Backend checkoutController lit les cookies httpOnly (access + refresh).

Front garde aussi des tokens dans localStorage.

Cette double source d’état auth doit être unifiée ou assumée comme telle. (SEC-004)

5.2 checkoutController (createCheckoutSession)

Endpoint critique:
POST /api/checkout/create-checkout-session (nom exact côté code)

Tables lues/écrites

carts

LECTURE: on reçoit cartId + contenu du panier (cartItems) du front.

ÉCRITURE: après avoir créé la session Stripe et la commande, on met à jour ce panier: status='ordered', updated_at = NOW().
Important: Ce UPDATE ne doit cibler que les paniers qui étaient encore status='open'. Ça protège l’unicité uq_user_open (un seul panier ‘open’ par user).

orders

ÉCRITURE (INSERT): on crée une ligne orders AVANT Stripe avec:

customer_id (ou NULL si invité),

customer_email et email_snapshot,

snapshots d’adresse d’expédition (shipping_address_snapshot, shipping_name_snapshot),

les montants en cents (subtotal_cents, shipping_cents, total_cents),

status='pending',

currency,

stripe_customer_id (quand dispo),

created_at / updated_at,

paid_at = NULL (pas payé encore).

MÀJ (UPDATE): après création de la session Stripe, on met à jour orders.stripe_session_id.

order_items

ÉCRITURE (INSERT MULTIPLE): pour chaque item du panier, on écrit:

order_id = l’ID de la commande qu’on vient de créer,

variant_id = product_variants.id (clé primaire réelle en base),

printful_variant_id (ID réel Printful qui part en prod),

quantity,

price_at_purchase (en dollars genre 29.99),

unit_price_cents (en cents genre 2999),

meta (JSON libre décrivant l’item choisi à ce moment-là: taille, couleur, etc.).
Ces valeurs sont contractuelles: on ne les réécrit plus jamais après coup.

order_status_history

ÉCRITURE (INSERT): on log une première ligne avec:

order_id,

old_status='pending',

new_status='pending',

changed_at = NOW().
Ça marque le début de la vie de la commande dans le système.

stripe_events

Rien ici à la création de session. Ça arrive dans les webhooks Stripe plus tard.

Règles critiques associées à checkoutController (NE PAS CASSER)

La commande (orders) et les lignes (order_items) DOIVENT être écrites avant d’envoyer le client chez Stripe.
Pourquoi: ça gèle le contrat légal (adresse de livraison, email, prix exact). Sans ça, tu n’as pas de preuve de ce que le client a acheté.

On doit sauvegarder la relation orders.stripe_session_id = session.id (la session Stripe qu’on crée).
Pourquoi: au moment du webhook Stripe, ça te permet de retrouver l’ordre sans guesser.

On doit créer l’entrée initiale order_status_history tout de suite avec status 'pending'.
Pourquoi: ça construit ton audit trail légal dès la création, pas juste après paiement.

On doit ensuite verrouiller le panier:
UPDATE carts SET status='ordered' ... WHERE id = cartId AND status='open'
Pourquoi: ça garantit l’unicité uq_user_open (un seul panier open par user).
Si tu oublies ça, un client peut “dupliquer” son panier, relancer plusieurs checkout, et tu peux te ramasser avec des incohérences de stock / fulfillment.

Les snapshots d’adresse et d’email (shipping_address_snapshot, email_snapshot) sont immuables.
Interdit de les réécrire après coup pour “corriger une adresse”.
Pourquoi: c’est ta preuve légale de où tu t’es engagé à envoyer le colis, et à qui tu as facturé.

paid_at ne doit PAS être posé ici. Ce contrôleur ne marque jamais une commande comme "paid".

Impact si on brise ces règles:

Tu perds la traçabilité légale (mauvais en cas de litige ou remboursement).

Tu peux générer plusieurs commandes pour le même panier.

Tu peux expédier à la mauvaise adresse parce qu’elle a changé après coup.

Tu peux te retrouver avec une commande “déjà payée” côté app alors qu’aucun argent n’a été confirmé par Stripe.

5.3 stripeWebhookController

Endpoint:
POST /api/stripe/webhook

Rôle:
Réception des webhooks Stripe (paiement complété, remboursements, etc.). C’est la seule porte d’entrée autorisée pour faire passer une commande de 'pending' à 'paid'. C’est aussi là qu’on fige paid_at.

Tables lues/écrites

stripe_events

ÉCRITURE (INSERT ou UPSERT idempotent): on journalise chaque événement Stripe reçu avec:

event_id (ID unique Stripe, utilisé aussi comme clé d’idempotence)

event_type (ex: 'checkout.session.completed')

created_at (horodatage côté Stripe)

payload (le JSON brut de Stripe qu’on stocke tel quel)
Objectif: audit / litige carte / preuves légales. C’est la boîte noire Stripe.

orders

LECTURE:
On retrouve la commande en utilisant l’info Stripe.
Chemins typiques:

session.client_reference_id ou metadata.order_id → correspond à orders.id qu’on a créé au checkout et auquel on a déjà assigné stripe_session_id.

sinon fallback par email + status='pending' (mode dégradé si la commande n’existait pas en base pour une raison X).

MISE À JOUR (UPDATE):

status = 'paid'

paid_at = UTC_TIMESTAMP()

total / shipping_cost finalisés à partir des montants Stripe

updated_at rafraîchi
Important:

On ne touche pas aux snapshots address/email/price déjà enregistrés par le checkout (shipping_address_snapshot, email_snapshot, etc.).

On ne les "corrige" pas après coup.

On ne les réécrit pas.

order_items
CAS NORMAL (commande créée proprement par checkoutController avant Stripe):

Les lignes order_items existent déjà (variant_id, printful_variant_id, quantity, price_at_purchase, unit_price_cents, meta).

Le webhook NE DOIT PAS les supprimer, NE DOIT PAS les réécrire.

Le webhook ne doit surtout pas faire DELETE FROM order_items pour “réinsérer du propre”. C’est illégalement dangereux car ça altère l’historique contractuel.

CAS DÉGRADÉ (commande pas trouvée en base parce que checkoutController n’a pas pu écrire avant Stripe):

Le webhook va créer une nouvelle ligne orders en 'paid'.

Ensuite, et seulement dans ce cas, il va insérer des order_items à partir de session.metadata.cart_items.

Avant d’insérer, il vérifie que order_items n’existe pas déjà pour cette commande.

Les valeurs écrites ici (price_at_purchase, unit_price_cents, printful_variant_id, etc.) deviennent le snapshot contractuel pour cette commande de secours.

Moral:
Le webhook peut compléter une commande “orpheline”, mais ne doit jamais réécrire une commande déjà figée par checkoutController.

order_status_history

ÉCRITURE (INSERT):
On ajoute une ligne:

order_id = la commande

old_status = 'pending'

new_status = 'paid'

changed_at = NOW()
Ça fabrique la timeline légale: "cette commande a été considérée payée à tel moment précis par Stripe".

abandoned_carts

MISE À JOUR (UPDATE):
Le webhook marque l’abandoned cart relié à cette session Stripe ou à cet email comme is_recovered=1, recovered_at=NOW().
Pourquoi: marketing / relance. Ça permet de savoir que ce panier abandonné a fini par convertir.

shipping_logs

Pas encore à ce moment-là, mais dans ce même flow post-paiement on enclenche ensuite (potentiellement via Printful) la création logistique. shipping_logs va être alimentée une fois qu’on reçoit le tracking / fulfillment.

Règles critiques associées à stripeWebhookController (NE PAS CASSER)

Le webhook est la seule autorité pour dire “cette commande est payée”.

C’est ici qu’on passe orders.status='paid'.

C’est ici qu’on écrit paid_at.

Le checkoutController ne doit jamais faire ça.

Les snapshots contractuels ne bougent pas.

On ne modifie jamais shipping_address_snapshot, email_snapshot, price_at_purchase, unit_price_cents après coup.

On ne “corrige” pas l’adresse de livraison d’une commande déjà payée en réécrivant la colonne snapshot.

Toute correction réelle (genre client s’est trompé d’appart numéro 12 vs 21) doit passer par la logistique/fulfillment, pas par un UPDATE du snapshot historique.

Pas de delete/rewrite sauvage des items.

On ne doit pas faire DELETE FROM order_items pour une commande existante juste parce que Stripe nous renvoie aussi cart_items.

Si la commande avait déjà des order_items (écrits par checkoutController avant Stripe), ils sont la source de vérité. Le webhook n’y touche pas.

Le webhook n’insère des order_items que si la commande vient d’être créée par le webhook (mode dégradé / rattrapage).

Historisation obligatoire.

Dès qu’on passe une commande à 'paid', on écrit une nouvelle entrée dans order_status_history (pending → paid).

Sans ça, on perd la traçabilité temporelle légale.

Journalisation Stripe obligatoire.

Chaque event Stripe (checkout.session.completed etc.) doit être inséré ou upserté dans stripe_events avec son event_id original Stripe.

Ça permet d’investiguer les chargebacks et les fraudes: “Stripe a dit quoi, quand, pour quel paiement”. Sans ça tu voles à l’aveugle.

Pas de paiement fantôme.

On ne doit JAMAIS marquer une commande 'paid' parce que le front dit "paiement réussi".

On ne doit le faire QUE si Stripe a envoyé un event validé cryptographiquement (vérif signature Stripe).

Ça ferme la porte aux petits pirates qui essaient de faker une confirmation en appelant ton endpoint succès côté front.

Impact si on brise ces règles:

— Tu peux te retrouver avec une commande en 'paid' sans argent reçu (catastrophe comptable).
— Tu peux détruire le snapshot légal (donc plus de preuve de ce qui a été vendu à quel prix, à qui, à quelle adresse).
— Tu perds la capacité de défendre un litige Stripe (“chargeback”), parce que tu n’as pas la ligne du webhook + l’event signé + paid_at.
