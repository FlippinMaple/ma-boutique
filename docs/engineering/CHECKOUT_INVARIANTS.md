# Invariants checkout & paiement

**Document :** `docs/engineering/CHECKOUT_INVARIANTS.md`
**Statut :** référence fonctionnelle du pipeline de paiement
**Sources code :** `checkoutController.js`, `webhookController.js`, `stripeService.js`, `checkoutRoutes.js`, `webhookRoutes.js`
**Schéma associé :** `docs/engineering/DATA_MODEL.md`

---

## Préambule

Les invariants décrivent les règles métier qui doivent rester vraies, indépendamment de l’implémentation technique.

Ils constituent la référence fonctionnelle du pipeline de paiement. Les contrôleurs, services, routes ou technologies peuvent évoluer, mais ces règles doivent demeurer valides.

Ce document n’est pas un tutoriel Stripe ni une référence API.

---

## Synthèse des responsabilités

| Phase | Qui écrit `pending` / snapshots / items | Qui écrit `paid` / `paid_at` | Qui écrit `cancelled` | Qui lock le panier |
|---|---|---|---|---|
| Checkout | `checkoutController` | — | — | — |
| Webhook signé | — | `webhookController` (`completed` / `async_payment_succeeded`) | `webhookController` (`expired`, `pending` uniquement) | `webhookController` (si `metadata.cart_id` historique) |

Pipeline :

```text
Panier
  ↓
Clé d’idempotence (fast path ou nouvelle tentative)
  ↓
TX : orders + checkout_idempotency + order_items + history
  ↓
Session Stripe
  ↓
Webhook signé  POST /webhook/stripe
  ├─ completed (si payment_status === 'paid') / async_payment_succeeded → paid
  └─ expired → cancelled (si encore pending)
```

---

## Table des matières

1. [Création de commande](#creation-de-commande)
2. [Stripe (session)](#stripe-session)
3. [Webhook](#webhook)
4. [Idempotence](#idempotence)
5. [Paiement](#paiement)
6. [Snapshots](#snapshots)
7. [Montants](#montants)
8. [Sécurité](#securite)
9. [Cohérence des données](#coherence-des-donnees)
10. [Reprise après erreur](#reprise-apres-erreur)

---

## Création de commande

### Commande créée avant la session Stripe

| | |
|---|---|
| **Description** | Une ligne `orders` avec `status = 'pending'` est créée en base avant l’appel `stripe.checkout.sessions.create`, dans la même transaction que `checkout_idempotency`, les `order_items` et l’historique initial. |
| **Justification** | Observer dans `createCheckoutSession` : TX dédiée puis création de session ; échec d’insert → réponse `ORDER_INIT_FAILED` sans session. |
| **Si violé** | Impossible de rattacher un paiement Stripe à une commande interne préexistante ; perte de snapshots et d’items avant paiement. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Le checkout ne marque jamais une commande paid

| | |
|---|---|
| **Description** | Le contrôleur checkout n’écrit jamais `status = 'paid'` ni `paid_at`. |
| **Justification** | Commentaire d’invariants et flux du contrôleur : statut initial `pending` uniquement. |
| **Si violé** | Commande considérée payée sans confirmation Stripe signée. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Historique initial init vers pending

| | |
|---|---|
| **Description** | Dans la transaction d’initialisation, après `orders` et `checkout_idempotency` et les `order_items`, une ligne `order_status_history` est insérée avec `old_status = 'init'`, `new_status = 'pending'`. |
| **Justification** | Insert explicite dans `createCheckoutSession` avant `COMMIT`. |
| **Si violé** | Timeline de commande incomplète dès la création. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Les order_items existent avant Stripe

| | |
|---|---|
| **Description** | Pour toute nouvelle tentative actuelle, les `order_items` sont insérés dans la transaction d’initialisation **avant** `stripe.checkout.sessions.create`. Il n’existe plus de mode dégradé webhook qui les reconstruit. |
| **Justification** | TX checkout (P3-B) : `orders` + `checkout_idempotency` + tous les `order_items` + history, puis session Stripe. P5-A/B : plus de fallback metadata. |
| **Si violé** | Commande sans preuve des articles ; le webhook refuse `paid` (fail-closed). |
| **Fichiers** | `server/controllers/checkoutController.js`, `server/controllers/webhookController.js` |

### Prix, adresse et livraison validés avant la commande pending

| | |
|---|---|
| **Description** | Avant tout `INSERT INTO orders`, le checkout valide le panier, résout les variantes DB, calcule le sous-total, normalise l’adresse, valide le `shipping_rate.id`, interroge Printful et convertit le tarif matché. Un échec de ces étapes ne crée pas de commande `pending`. Exception : une `idempotency_key` déjà connue reprend la tentative existante **avant** ces validations (fast path). |
| **Justification** | Ordre de `createCheckoutSession` : lookup variantes et Printful `shipping/rates` avant l’insert `orders` sur une clé nouvelle. |
| **Si violé** | Commandes `pending` orphelines, ou totaux figés à partir de données encore non autoritaires. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Initialisation atomique orders, idempotency, items et history

| | |
|---|---|
| **Description** | La transaction dédiée insère, dans cet ordre : `orders`, `checkout_idempotency`, tous les `order_items`, `order_status_history` (`init` → `pending`), puis `COMMIT`. Un échec avant commit annule tout, y compris l’order temporaire. Aucun appel Stripe n’a lieu dans cette transaction. |
| **Justification** | Bloc TX de `createCheckoutSession` (P3-B + P3-E1). |
| **Si violé** | Commande sans items, sans mapping d’idempotence, ou order fantôme commité. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Le panier n’est pas verrouillé au checkout

| | |
|---|---|
| **Description** | À la fin de `createCheckoutSession`, le panier n’est pas passé en `ordered` ; il reste `open`. Le verrouillage est effectué par le webhook après paiement. |
| **Justification** | Commentaire et code checkout : « Panier laissé 'open' ici. Le webhook le verrouille après paiement. » |
| **Si violé** | Double lock / unlock incohérent ; panier bloqué sans paiement, ou panier réutilisable après paiement. |
| **Fichiers** | `server/controllers/checkoutController.js`, `server/controllers/webhookController.js` |

### La route checkout crée uniquement une session

| | |
|---|---|
| **Description** | `POST` sur la route checkout délègue uniquement à `createCheckoutSession`. |
| **Justification** | `checkoutRoutes.js` n’expose que cette action. |
| **Si violé** | Surface de paiement non contrôlée. |
| **Fichiers** | `server/routes/checkoutRoutes.js` |

---

## Stripe (session)

### Session liée à l’identifiant de commande

| | |
|---|---|
| **Description** | La session Checkout est créée avec `client_reference_id = String(orderId)` et `metadata.order_id = String(orderId)`, et `{ idempotencyKey }` égal à l’UUID de tentative. Après création, `orders.stripe_session_id` et `orders.client_reference_id` sont mis à jour. La clé Stripe complète la PK DB ; elle ne la remplace pas. |
| **Justification** | `sessions.create(params, { idempotencyKey })` puis `UPDATE orders SET stripe_session_id, client_reference_id`. |
| **Si violé** | Le webhook ne peut pas résoudre la commande de façon fiable. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Un identifiant Stripe exact pour au plus une commande

| | |
|---|---|
| **Description** | Une Checkout Session Stripe (`orders.stripe_session_id`) et un PaymentIntent Stripe (`orders.stripe_payment_intent_id`) correspondent chacun à **au plus une** order. Les colonnes restent nullable ; plusieurs NULL sont permis. La comparaison en base est **case-sensitive** (`utf8mb4_bin`). Les index `idx_orders_stripe_session` et `idx_orders_pi` sont UNIQUE (P20-D4). |
| **Justification** | Schéma production après P20-D4 ; lecteurs `WHERE … = ? LIMIT 1` ; le code ne lower/uppercase pas ces IDs. |
| **Si violé** | Deux commandes pour la même session ou le même PaymentIntent, ou comparaison case-insensitive pouvant confondre deux identifiants Stripe distincts. |
| **Fichiers** | `docs/engineering/DATA_MODEL.md`, `db/migrations/2026-09-04_orders_stripe_identifiers_unique.sql` |

### Métadonnées Checkout minimales

| | |
|---|---|
| **Description** | Les **nouvelles** sessions portent en `metadata` uniquement : `source`, `order_id`, `shipping_rate` (représentation serveur `{ id, name, shipping_cents }`). Elles n’envoient **pas** `metadata.shipping`, **pas** `metadata.cart_items`, **pas** `cart_id`. `order_id` reste la référence principale posée à la création (avec `client_reference_id`) ; les fallbacks de résolution webhook existants sont inchangés. Les lecteurs legacy de `session.metadata.shipping` / `cart_items` / `cart_id` restent dans le webhook pour les **anciennes** sessions : compatibilité historique, pas le contrat des nouvelles sessions. `order_items` restent l’autorité locale (P5). Le webhook ne reconstruit pas `order_items` à partir de `metadata.cart_items`. |
| **Justification** | Objet `metadata` passé à `sessions.create` après P13-E ; lecteurs legacy conservés ; P5-A/B. |
| **Si violé** | Duplication d’adresse / lignes panier dans Stripe metadata, ou reconstruction d’items depuis metadata. |
| **Fichiers** | `server/controllers/checkoutController.js`, `server/controllers/webhookController.js` |

### Montants Stripe issus des valeurs serveur

| | |
|---|---|
| **Description** | Les `line_items` Stripe utilisent `price_data.unit_amount` égal au prix DB en cents. L’option de livraison Stripe, si présente, utilise `shippingCents` (Printful revalidé) et `display_name` égal à `matchedRate.name`. |
| **Justification** | Construction `line_items` depuis `normalizedLines` ; `shipping_options` seulement si `shippingCents > 0`. |
| **Si violé** | Session Stripe facturant un prix ou un shipping fourni par le navigateur. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Clé secrète Stripe requise pour créer une session

| | |
|---|---|
| **Description** | Sans `STRIPE_SECRET_KEY` (ou `STRIPE_SK`), le checkout répond `STRIPE_KEY_MISSING` et ne crée ni commande ni session. |
| **Justification** | Garde en tête de `createCheckoutSession`. |
| **Si violé** | Appels Stripe impossibles ou non authentifiés. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Client Stripe partagé côté webhook

| | |
|---|---|
| **Description** | Le webhook obtient le client Stripe via `getStripe()` (`stripeService.js`), qui exige `STRIPE_SECRET_KEY`. |
| **Justification** | `handleStripeWebhook` appelle `getStripe()`. |
| **Si violé** | Impossible de vérifier la signature ou d’utiliser l’API Stripe côté webhook. |
| **Fichiers** | `server/controllers/webhookController.js`, `server/services/stripeService.js` |

---

## Webhook

### Body brut pour vérification de signature

| | |
|---|---|
| **Description** | Le webhook Stripe est monté sans `express.json()` ; le body arrive brut pour `constructEvent`. |
| **Justification** | Commentaire dans `webhookRoutes.js` ; `constructEvent(req.body, sig, secret)`. |
| **Si violé** | Échec de signature ou acceptation d’événements non authentiques. |
| **Fichiers** | `server/routes/webhookRoutes.js`, `server/controllers/webhookController.js` (montage raw hors de ces fichiers, référencé par la route) |

### Signature Stripe obligatoire

| | |
|---|---|
| **Description** | Chaque requête webhook est validée avec `STRIPE_WEBHOOK_SECRET` et l’en-tête `stripe-signature`. Échec → HTTP 400. |
| **Justification** | Bloc `constructEvent` en tête de `handleStripeWebhook`. |
| **Si violé** | Traitement d’événements forgés. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Événements de paiement traités

| | |
|---|---|
| **Description** | `checkout.session.completed` n’entre dans le chemin paid que si `session.payment_status === 'paid'`. Toute autre valeur (`unpaid`, `no_payment_required`, absent, inattendue) → 200 `payment_not_yet_paid`, aucune mutation. `checkout.session.async_payment_succeeded` conserve le chemin paid (succès différé). `checkout.session.expired` ferme une `pending` liée à **cette** session (`cancelled`). Les autres types sont journalisés sans changer le statut de paiement. `no_payment_required` n’est pas assimilé à paid. |
| **Justification** | Branches dédiées + garde P4-E dans `handleStripeWebhook`. |
| **Si violé** | Paiement confirmé non enregistré, pending éternelle après expiration, ou statut `paid` sur un mauvais type / un completed encore unpaid. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Résolution de commande pour le paiement

| | |
|---|---|
| **Description** | Pour `completed` / `async_payment_succeeded` : (1) `orders.stripe_session_id = session.id` ; (2) sinon `client_reference_id` et `metadata.order_id` parsés en entiers positifs sûrs — s’ils sont tous deux valides et différents, aucune résolution ; une candidate n’est acceptée que si `orders.id` correspond **et** (`stripe_session_id = session.id` OU `stripe_session_id IS NULL`). Une order déjà liée à une autre session est refusée. Aucun fallback email. Erreur DB → 500 `WEBHOOK_ORDER_RESOLUTION_FAILED`. Aucun match sûr → 200 `order_not_found_no_fallback`. |
| **Justification** | `resolveOrderIdFromSession` (P4-D). |
| **Si violé** | Mauvaise commande marquée payée, ou aucune. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Résolution stricte pour l’expiration

| | |
|---|---|
| **Description** | Pour `checkout.session.expired`, la commande est trouvée **uniquement** par `orders.stripe_session_id = session.id`. Aucun fallback email, `client_reference_id`, `metadata.order_id` ou dernière pending. Si aucune row : HTTP 200 `expired_order_not_found`, rien n’est créé. |
| **Justification** | Branche dédiée ; `resolveOrderIdFromSession` n’est pas utilisée. |
| **Si violé** | Fermeture d’une autre commande que celle de la session expirée. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Expiration : pending vers cancelled uniquement

| | |
|---|---|
| **Description** | `UPDATE orders SET status = 'cancelled', cancelled_at, updated_at` seulement si `status = 'pending'`. History `pending` → `cancelled` si et seulement si `affectedRows === 1`. Une commande `paid` ou déjà `cancelled` n’est pas réécrite. |
| **Justification** | Branche `checkout.session.expired` (P3-E2). |
| **Si violé** | Pending zombies, ou annulation d’une commande déjà payée. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Pas de création de commande magique si introuvable

| | |
|---|---|
| **Description** | Si aucune commande n’est résolue, le webhook ne crée pas de nouvelle commande ; il journalise et répond `order_not_found_no_fallback`. |
| **Justification** | Branche `if (!resolvedOrderId)` dans `handleStripeWebhook`. |
| **Si violé** | Commandes inventées hors du chemin checkout. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Route webhook Stripe unique

| | |
|---|---|
| **Description** | L’endpoint applicatif est `POST /webhook/stripe`. Il appelle uniquement `handleStripeWebhook`. |
| **Justification** | Montage du routeur webhook ; `webhookRoutes.js`. |
| **Si violé** | Entrées de paiement non signées ou non centralisées. |
| **Fichiers** | `server/routes/webhookRoutes.js` |

---

## Idempotence

### Clé d’idempotence checkout obligatoire

| | |
|---|---|
| **Description** | `POST /api/create-checkout-session` exige `idempotency_key` : UUID v4 strict, normalisé lowercase. Absent ou invalide → 400 `INVALID_IDEMPOTENCY_KEY`. Le serveur ne génère jamais la clé. |
| **Justification** | `parseIdempotencyKey` en tête de `createCheckoutSession` (P3-E1). |
| **Si violé** | Doublons de pending / sessions, ou clés non corrélables. |
| **Fichiers** | `server/controllers/checkoutController.js`, `src/pages/Checkout.jsx` |

### Fast path avant validations coûteuses

| | |
|---|---|
| **Description** | Dès que la clé est valide, le checkout lit `checkout_idempotency` JOIN `orders` par `idempotency_key` uniquement, **avant** `pickCart`, lookup variantes, Printful et la transaction. Une tentative connue ignore le body. Lookup DB en échec → 500 `CHECKOUT_IDEMPOTENCY_LOOKUP_FAILED` (fail-closed). |
| **Justification** | `findExistingCheckoutAttempt` puis `respondWithExistingCheckoutAttempt`. |
| **Si violé** | Retry séquentiel revalide Printful / peut diverger ; ou création d’un doublon si le lookup est impossible. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Réutilisation d’une tentative existante

| | |
|---|---|
| **Description** | Tentative connue : status ≠ `pending` → 409 `CHECKOUT_NO_LONGER_OPEN` ; `pending` sans `stripe_session_id` → 409 `CHECKOUT_IN_PROGRESS` + `Retry-After: 2` ; `pending` + session Stripe `open` + `url` → 200 `{ id, url, reused: true }` via `sessions.retrieve` ; session non-`open` → 409 `CHECKOUT_NO_LONGER_OPEN` ; erreur retrieve → 502 `CHECKOUT_SESSION_LOOKUP_FAILED`. Aucune nouvelle session ni order depuis le body du retry. |
| **Justification** | `respondWithExistingCheckoutAttempt`. |
| **Si violé** | Deux sessions / deux orders pour une même tentative logique. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### PRIMARY KEY checkout_idempotency comme garantie de concurrence

| | |
|---|---|
| **Description** | Le fast SELECT n’est pas la garantie d’unicité. Dans la TX, `INSERT checkout_idempotency` après `orders` : une seule requête obtient la PK. L’autre reçoit MySQL 1062, rollback (l’order temporaire disparaît), puis lookup de la tentative gagnante. |
| **Justification** | Table `checkout_idempotency` ; catch `ER_DUP_ENTRY` / 1062 ciblé sur cet INSERT. |
| **Si violé** | Deux orders commitées pour la même clé. |
| **Fichiers** | `server/controllers/checkoutController.js`, `docs/engineering/DATA_MODEL.md` |

### Tentative logique frontend

| | |
|---|---|
| **Description** | `Checkout.jsx` génère un UUID v4 (`crypto.randomUUID()`) dans un `useRef` **après** validation + confirmation, pas au montage. Une signature locale `JSON.stringify(checkoutPayload)` décide si le retry est la même tentative. Cette signature n’est ni envoyée, ni stockée, ni une autorité métier. `CHECKOUT_NO_LONGER_OPEN` reset le ref ; `CHECKOUT_IN_PROGRESS` / erreurs temporaires conservent la clé. |
| **Justification** | `checkoutAttemptRef` dans `handleCheckout`. |
| **Si violé** | Nouvelle clé à chaque retry (doublons) ou clé éternelle globale. |
| **Fichiers** | `src/pages/Checkout.jsx` |

### Identifiant d’événement Stripe comme clé d’idempotence

| | |
|---|---|
| **Description** | Avant traitement métier, `INSERT IGNORE` réserve `event_id` dans `stripe_events` (table déjà provisionnée). Échec de l’INSERT → 500 `WEBHOOK_IDEMPOTENCE_UNAVAILABLE` (fail-closed). `affectedRows === 0` signifie « event_id déjà vu », pas « métier terminé ». Duplicate non métier → 200 `{ received: true, duplicate: true }`. Duplicate métier (`expired`, `completed`, `async_payment_succeeded`) **rejoue** les branches existantes ; les gardes de statut et la TX paid rendent le rejeu idempotent. |
| **Justification** | Bloc idempotence P4-A/B/C dans `handleStripeWebhook`. |
| **Si violé** | Perte d’événement après crash post-réservation, ou double transition métier. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Upsert ultérieur de l’événement avec payload

| | |
|---|---|
| **Description** | Après traitement (ou pour les autres types), `upsertStripeEvent` enregistre / met à jour `event_type`, `payload` minimal, et `order_id` si résolu. `payload` n’est plus l’événement Stripe complet : `checkout.session.*` / `payment_intent.*` → `{"object_id":"..."}` ; `charge.*` → `{"payment_intent_id":"..."}` ; sinon SQL `NULL` (jamais `{}`). |
| **Justification** | `upsertStripeEvent` + minimisation P13-B. |
| **Si violé** | Réintroduction de PII Stripe dans `stripe_events.payload`, ou perte du lien `event_id` / `order_id`. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Le webhook n’écrit jamais d’order_items

| | |
|---|---|
| **Description** | Le webhook ne possède aucun `INSERT INTO order_items`. Les `order_items` existants sont des snapshots créés au checkout avant Stripe. Le webhook les traite comme précondition du paiement, pas comme données à reconstruire. Il ne les supprime ni ne les réécrit. |
| **Justification** | P5-A (plus d’appel fallback) + P5-B (helper et INSERT supprimés). |
| **Si violé** | Snapshots d’achat inventés après paiement. |
| **Fichiers** | `server/controllers/webhookController.js` |

---

## Paiement

### Seul le webhook signe le paiement

| | |
|---|---|
| **Description** | Seul le webhook Stripe signé passe une commande à `status = 'paid'` et écrit `paid_at`. |
| **Justification** | Commentaires d’invariants webhook + `UPDATE` dans le handler ; checkout interdit `paid`. |
| **Si violé** | Paiement fantôme (front ou autre endpoint). |
| **Fichiers** | `server/controllers/webhookController.js`, `server/controllers/checkoutController.js` |

### Historisation pending vers paid

| | |
|---|---|
| **Description** | L’INSERT `order_status_history` (`pending` → `paid`) fait partie du **même** COMMIT que l’UPDATE paid. Un échec history rollback toute la transition. |
| **Justification** | Noyau transactionnel P4-F. |
| **Si violé** | Order paid sans preuve temporelle, ou paid partiel. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Noyau paid atomique

| | |
|---|---|
| **Description** | Après résolution et **vérification** des `order_items`, une connexion dédiée : `BEGIN` → `SELECT orders … FOR UPDATE` → recheck d’au moins un item → `UPDATE` `pending` → `paid` (totaux, `paid_at`, email COALESCE, `stripe_payment_intent_id` COALESCE) + history → `COMMIT`. `WHERE id = ? AND status = 'pending'`. Échec avant COMMIT → rollback, 500 `WEBHOOK_PAYMENT_TX_FAILED`, `event_id` conservé. Side effects (reconcile, cart historique, abandoned, Printful, upsert) **après** COMMIT. |
| **Justification** | P4-F. |
| **Si violé** | Paid sans history / sans PI, ou double transition. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Une commande cancelled ne redevient jamais paid

| | |
|---|---|
| **Description** | Sous `FOR UPDATE`, seul `pending` peut devenir `paid`. `cancelled` (ou tout statut non-pending / non-paid) → no-op, 200, aucune history paid. `checkout.session.expired` ne peut pas non plus annuler une `paid`. |
| **Justification** | Lock P4-F + `AND status = 'pending'` ; branche expired P3-E2. |
| **Si violé** | Commande annulée réécrite en paid, ou paid annulée. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Totaux mis à jour depuis Stripe à l’encaissement

| | |
|---|---|
| **Description** | Au paiement, `orders.total` et `orders.shipping_cost` sont recalculés / renseignés à partir de la session Stripe (et fallbacks metadata / valeur DB précédente pour le shipping). |
| **Justification** | `amount_total`, `total_details.amount_shipping`, metadata `shipping_rate`, `prevShippingCost`. |
| **Si violé** | Écart comptable entre Stripe et la commande interne. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Payment intent stocké quand disponible

| | |
|---|---|
| **Description** | `stripe_payment_intent_id` est écrit dans le **même** `UPDATE` paid (`COALESCE` : n’écrase pas une valeur existante par NULL). Plus d’UPDATE PI séparé après coup. |
| **Justification** | Noyau transactionnel P4-F. |
| **Si violé** | Order paid sans PI, ou PI écrit sans paid. |
| **Fichiers** | `server/controllers/webhookController.js` |

---

## Snapshots

### Snapshots adresse et email figés au checkout

| | |
|---|---|
| **Description** | À la création de commande : `email_snapshot`, `shipping_name_snapshot` et `shipping_address_snapshot` (JSON) sont écrits depuis l’adresse et le contact saisis par le client, après normalisation. Ces champs ne sont pas des sources de prix. |
| **Justification** | `INSERT INTO orders` dans `createCheckoutSession` après validation d’adresse. |
| **Si violé** | Perte de la preuve de livraison / contact au moment de la vente. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Le webhook ne réécrit pas les snapshots checkout

| | |
|---|---|
| **Description** | Le webhook ne met pas à jour `shipping_address_snapshot`, `email_snapshot`, ni les prix figés des items existants. |
| **Justification** | Commentaire d’invariants webhook ; `UPDATE orders` touche status, total, shipping_cost, paid_at, customer_email (COALESCE), payment_intent — pas les snapshots adresse. |
| **Si violé** | Preuve légale altérée après paiement. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Prix article figé dans order_items

| | |
|---|---|
| **Description** | Chaque item stocke `price_at_purchase` et `unit_price_cents` au moment de l’insert checkout. Ces montants proviennent du prix officiel DB de la variante, pas du navigateur. Le webhook ne recrée plus ces lignes et ne réécrit pas ces prix. |
| **Justification** | Insert `order_items` dans `createCheckoutSession` uniquement (P5). |
| **Si violé** | Montant vendu non reconstituable, ou prix d’achat réécrit après changement de catalogue. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Meta vitrine sur les items checkout

| | |
|---|---|
| **Description** | Au checkout, `order_items.meta` reçoit un JSON (nom, sku, couleur, taille, images, etc.) avec `source: 'checkoutController'`. |
| **Justification** | Construction `metaPayload` avant insert. |
| **Si violé** | Perte du contexte produit affiché au moment de l’achat. |
| **Fichiers** | `server/controllers/checkoutController.js` |

---

## Montants

### Le navigateur ne détermine jamais le prix vendu

| | |
|---|---|
| **Description** | Le prix de chaque ligne provient de `product_variants.price` après lookup de la PK interne. Tout `price` / `unit_amount` / Price ID soumis par le navigateur est ignoré. |
| **Justification** | `officialPriceToCents(row.price)` dans `createCheckoutSession` ; construction des `line_items` depuis `normalizedLines`. |
| **Si violé** | Le client peut s’auto-facturer un montant inférieur au catalogue. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Quantités strictes avant calcul monétaire

| | |
|---|---|
| **Description** | Chaque quantité doit être un entier positif sûr (`Number.isSafeInteger`, `> 0`) avant tout calcul de ligne ou de sous-total. |
| **Justification** | `parsePositiveSafeInteger` sur le panier ; rejet `INVALID_QUANTITY`. |
| **Si violé** | Totaux faux, overflow, ou lignes à quantité nulle / non entière. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Prix officiels invalides refusés avant commande

| | |
|---|---|
| **Description** | Si le prix DB d’une variante retenue ne se convertit pas en cents strictement positifs, le checkout répond `INVALID_OFFICIAL_PRICE` et n’insère pas de commande. |
| **Justification** | `officialPriceToCents` avant l’insert `orders`. |
| **Si violé** | Session Stripe ou commande avec prix absurdes. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Devis de livraison public borné et non autoritaire

| | |
|---|---|
| **Description** | `POST /api/shipping/rates` est public pour le checkout invité, derrière `shippingLimiter` (20/min/IP). Recipient limité à CA/US, champs bornés (`name`/`address1`/`city`/`state`/`zip`) ; email non transmis. Items : 1–20 lignes ; `quantity` 1–20 ; seul `printful_variant_id` sert à la résolution ; le `variant_id` court Printful est lu en DB (`product_variants` JOIN `products`, `is_active` et `is_visible`). Aucun prix renvoyé par cette route n’est autoritaire pour le paiement : `createCheckoutSession` recalcule / revalide le tarif. Le frontend debounce 800 ms, abort les requêtes encore annulables, et `isCurrent` bloque une réponse obsolète dans l’état React. |
| **Justification** | P14 (`getRates`, `ShippingOptions`) ; autorité du montant : P1/P3. |
| **Si violé** | Amplification / abus Printful, quote hors catalogue, rafales frontend, tarif périmé à l’écran. Cela ne se confond pas avec l’autorité du montant final Stripe. |
| **Fichiers** | `server/controllers/shippingController.js`, `server/routes/shippingRoutes.js`, `server/middlewares/rateLimiters.js`, `src/components/ShippingOptions.jsx`, `server/controllers/checkoutController.js` |

### Livraison serveur-authoritative

| | |
|---|---|
| **Description** | Le navigateur fournit uniquement `shipping_rate.id`. Le checkout recharge `POST https://api.printful.com/shipping/rates` avec l’adresse normalisée et les `bizVariantId` / quantités des `normalizedLines`, puis exige `String(rate.id) === selectedShippingRateId`. Aucun fallback par nom, prix, position ou premier tarif. |
| **Justification** | Bloc Printful de `createCheckoutSession` ; codes `INVALID_SHIPPING_RATE`, `SHIPPING_RATE_LOOKUP_FAILED`, `SHIPPING_RATE_UNAVAILABLE`. |
| **Si violé** | Frais de livraison choisis ou falsifiés par le client. |
| **Fichiers** | `server/controllers/checkoutController.js`, `src/pages/Checkout.jsx` |

### Totaux commande en cents au checkout

| | |
|---|---|
| **Description** | `subtotal_cents` = somme des prix DB × quantités. `shipping_cents` = tarif Printful revalidé (`matchedRate.rate` converti strictement). `total_cents` = subtotal + shipping, avec protections d’overflow (`canAddCents`). Ces trois champs, ainsi que `shipping_cost` et `total`, sont stockés sur `orders` à partir de ces valeurs serveur. |
| **Justification** | Calculs puis `INSERT INTO orders`. |
| **Si violé** | Totaux internes non alignés avec Stripe, ou montants encore issus du body navigateur. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Devise depuis l’environnement

| | |
|---|---|
| **Description** | La devise utilisée pour les montants / Stripe vient de `process.env.CURRENCY` (défaut CAD / cad selon le contexte). |
| **Justification** | Usage de `CURRENCY` dans line_items et insert order. |
| **Si violé** | Incohérence monétaire Stripe / DB. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Panier vide refusé

| | |
|---|---|
| **Description** | Un panier absent ou vide produit `EMPTY_CART` (400), sur le chemin d’une **nouvelle** tentative (après le fast path). |
| **Justification** | Garde après `pickCart`. |
| **Si violé** | Session ou commande sans articles. |
| **Fichiers** | `server/controllers/checkoutController.js` |

---

## Sécurité

### Identité utilisateur depuis cookies httpOnly uniquement

| | |
|---|---|
| **Description** | `customer_id` / `userId` provient exclusivement des JWT dans les cookies `access` / `refresh`. Aucun `userId` du body n’est utilisé. Cookies absents ou invalides → checkout invité (`customer_id` null), pas un 401. |
| **Justification** | Commentaire d’invariants + lecture `req.cookies`. |
| **Si violé** | Usurpation d’identité au checkout. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Limites d’abus du checkout public

| | |
|---|---|
| **Description** | `checkoutLimiter` : 10 requêtes / 60 s / IP → 429 `CHECKOUT_RATE_LIMITED`. Panier > 20 lignes → 400 `CART_TOO_LARGE`. Quantité > 20 par ligne → 400 `QUANTITY_LIMIT_EXCEEDED`. |
| **Justification** | P3-A ; `rateLimiters.js` + gardes dans `createCheckoutSession`. |
| **Si violé** | Spam de pending / sessions Stripe. |
| **Fichiers** | `server/middlewares/rateLimiters.js`, `server/controllers/checkoutController.js` |

### Validation email et adresse avant Printful

| | |
|---|---|
| **Description** | Email obligatoire, trim + lowercase, longueur max 100, format basique. Shipping requis (name, address1, city, state, country, zip) avec longueurs max. Pays uniquement `CA` / `US`. State/province exactement 2 caractères. Échec → 400 (`INVALID_EMAIL`, `INVALID_SHIPPING_ADDRESS`, `SHIPPING_FIELD_TOO_LONG`, `INVALID_SHIPPING_COUNTRY`, `INVALID_SHIPPING_STATE`) avant l’appel Printful et avant l’INSERT. |
| **Justification** | P3-D. |
| **Si violé** | Commandes / appels Printful avec données invalides. |
| **Fichiers** | `server/controllers/checkoutController.js`, `src/pages/Checkout.jsx` |

### Aucun ID relationnel client comme autorité checkout

| | |
|---|---|
| **Description** | Le checkout n’utilise pas `cartId`, `shipping_address_id` ni `billing_address_id` fournis par le client. L’adresse et l’email saisis, après validation, deviennent des snapshots. |
| **Justification** | P3-C. |
| **Si violé** | Commande liée à un panier ou une adresse d’un autre client. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Secret webhook requis

| | |
|---|---|
| **Description** | Sans `STRIPE_WEBHOOK_SECRET`, le webhook répond 500 et ne traite pas. |
| **Justification** | Garde en tête de `handleStripeWebhook`. |
| **Si violé** | Endpoint webhook inutilisable ou non vérifiable. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Pas de confiance au front pour un paiement réussi

| | |
|---|---|
| **Description** | Le marquage `paid` n’est pas déclenché par une route succès front ; uniquement par événement Stripe vérifié. |
| **Justification** | Absence de passage `paid` dans checkout ; présence exclusive dans webhook signé. |
| **Si violé** | Confirmation client spoofable. |
| **Fichiers** | `server/controllers/checkoutController.js`, `server/controllers/webhookController.js`, `server/routes/checkoutRoutes.js`, `server/routes/webhookRoutes.js` |

---

## Cohérence des données

### order_items.variant_id égale la clé primaire product_variants.id

| | |
|---|---|
| **Description** | Le checkout traite `db_variant_id ?? id` uniquement comme PK interne `product_variants.id`. Lookup groupé `WHERE pv.id IN (...)`. Identifiants business / Printful non utilisés comme substituts de la PK. Variante absente, inactive ou produit non visible → 400 `VARIANT_UNAVAILABLE`. |
| **Justification** | `parsedLines` + `variantById` dans `createCheckoutSession`. |
| **Si violé** | Échec FK MySQL, mauvaise variante fulfillment, ou association ambiguë d’identifiants. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Trois identifiants variante non interchangeables

| | |
|---|---|
| **Description** | Le code distingue `product_variants.id` (PK / FK `order_items.variant_id`), `variant_id` métier (identifiant court Printful / catalogue), et `printful_variant_id` (exécution Printful). Aucun de ces identifiants ne doit être interprété comme un autre. |
| **Justification** | `normalizedLines` expose `dbVariantId`, `bizVariantId`, `printfulVariantId` ; insert items utilise la PK ; requête Printful shipping utilise `bizVariantId`. |
| **Si violé** | Mauvaise référence Printful ou FK cassée. |
| **Fichiers** | `server/controllers/checkoutController.js`, `server/controllers/webhookController.js` |

### Verrouillage panier après paiement

| | |
|---|---|
| **Description** | Après `paid`, si un `metadata.cart_id` **historique** est présent, `carts.status` passe de `open` à `ordered` (UPDATE conditionnel `status = 'open'`). Les nouvelles sessions checkout n’envoient plus `cart_id`. |
| **Justification** | Bloc « Verrouiller le panier » du webhook ; P3-C. |
| **Si violé** | Même panier open réutilisable après un ancien paiement encore lié à un cart. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Abandoned cart marqué récupéré après paiement

| | |
|---|---|
| **Description** | Après paiement, `markAbandonedRecovered` met `is_recovered = 1` pour un abandoned cart lié à la session ou à l’email (fenêtre 30 jours). |
| **Justification** | Appel dans le webhook après marquage paid. |
| **Si violé** | Relances marketing sur panier déjà converti. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Journalisation event liée à la commande quand possible

| | |
|---|---|
| **Description** | Après résolution, les events Stripe sont associés à `order_id` (upsert / reconcile). `reconcileStripeEvents` est dual-path : ancien JSON Stripe complet **et** format minimal P13 (`object_id` / `payment_intent_id`). |
| **Justification** | `upsertStripeEvent`, `reconcileStripeEvents` (compatibilité P13-B). |
| **Si violé** | Audit chargeback / support sans lien event→commande. |
| **Fichiers** | `server/controllers/webhookController.js` |

---

## Reprise après erreur

### Items absents : paiement bloqué, aucune reconstruction

| | |
|---|---|
| **Description** | Avant paid, le webhook appelle `orderHasItems`. Erreur DB → HTTP 500 `WEBHOOK_ORDER_ITEMS_CHECK_FAILED`. Zéro item → HTTP 500 `WEBHOOK_ORDER_ITEMS_MISSING`. Aucun INSERT `order_items`, aucune reconstruction depuis `metadata.cart_items`, aucune transition paid. `event_id` est conservé ; P4-C permet le replay du même business event. P4-F refait le check sous transaction (`SELECT id FROM order_items … LIMIT 1`). Jamais `paid` sans item. |
| **Justification** | P5-A + recheck P4-F. |
| **Si violé** | Snapshots inventés après paiement, ou paid sans preuve d’articles. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Échec de résolution commande : event conservé, pas de paid

| | |
|---|---|
| **Description** | Si `resolveOrderIdFromSession` échoue, l’event est upserté avec `order_id` null et aucune mise à jour `paid`. |
| **Justification** | Branche `order_not_found_no_fallback`. |
| **Si violé** | Argent Stripe sans commande, ou marquage arbitraire. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Échecs non bloquants périphériques

| | |
|---|---|
| **Description** | Certaines étapes annexes **après** COMMIT paid (lock panier historique, abandoned recovered, Printful automatique, reconcile) sont dans des `try/catch` qui journalisent sans annuler le paid déjà commité. L’historisation paid et le payment_intent ne sont plus best-effort : ils sont dans la TX. Le checkout ne crée plus d’`abandoned_carts`. |
| **Justification** | Patterns `console.warn` / `logWarn` autour de ces blocs. |
| **Si violé** | (Observation) Un échec annexe peut laisser des écarts (panier non locké, Printful non créé) alors que la commande est `paid`. |
| **Fichiers** | `server/controllers/checkoutController.js`, `server/controllers/webhookController.js` |

### Échec Stripe après insert : commande pending possible

| | |
|---|---|
| **Description** | La résolution des variantes, la validation d’adresse et la revalidation Printful du tarif ont lieu avant l’insert `orders` (sauf fast path d’une clé déjà connue). Un échec sur ces étapes ne crée pas de commande. Si Stripe échoue après commit, une `pending` sans `stripe_session_id` peut subsister : un retry de la **même** clé reçoit `CHECKOUT_IN_PROGRESS` et ne recrée pas de session depuis un autre body. Une session Stripe **expirée** ne laisse plus la commande `pending` indéfiniment : `checkout.session.expired` la passe `cancelled` si elle est encore `pending`. |
| **Justification** | Ordre actuel + P3-E1 / P3-E2. |
| **Si violé** | (Observation) Pending orphelines sans session, ou pending éternelles après expiration Stripe. |
| **Fichiers** | `server/controllers/checkoutController.js`, `server/controllers/webhookController.js` |

### Idempotence fail-closed si insert ignore échoue

| | |
|---|---|
| **Description** | Si l’assert d’idempotence (`INSERT IGNORE`) échoue, le webhook log et retourne 500 `WEBHOOK_IDEMPOTENCE_UNAVAILABLE` sans aucun traitement métier. |
| **Justification** | P4-A. |
| **Si violé** | Traitement métier sans garantie d’unicité d’événement. |
| **Fichiers** | `server/controllers/webhookController.js` |

---

**Fin du document.**
