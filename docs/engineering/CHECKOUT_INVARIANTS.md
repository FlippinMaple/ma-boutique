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

| Phase | Qui écrit `pending` / snapshots / items | Qui écrit `paid` / `paid_at` | Qui lock le panier |
|---|---|---|---|
| Checkout | `checkoutController` | — | — |
| Webhook signé | — (sauf fallback items) | `webhookController` | `webhookController` |

Pipeline :

```text
Panier
  ↓
Commande pending
  ↓
Session Stripe
  ↓
Webhook signé
  ↓
Commande paid
  ↓
Panier verrouillé
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
| **Description** | Une ligne `orders` avec `status = 'pending'` est créée en base avant l’appel `stripe.checkout.sessions.create`. |
| **Justification** | Observer dans `createCheckoutSession` : insert `orders` puis création de session ; échec d’insert → réponse `ORDER_INIT_FAILED` sans session. |
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
| **Description** | Après création de la commande, une ligne `order_status_history` est insérée avec `old_status = 'init'`, `new_status = 'pending'`. |
| **Justification** | Insert explicite dans `createCheckoutSession` après les `order_items`. |
| **Si violé** | Timeline de commande incomplète dès la création. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Les order_items existent avant Stripe

| | |
|---|---|
| **Description** | Les `order_items` de la commande sont insérés avant la création de la session Stripe (chemin nominal). |
| **Justification** | Boucle d’insert `order_items` puis `sessions.create`. |
| **Si violé** | Commande sans preuve des articles au moment du checkout ; dépendance accrue au mode dégradé webhook. |
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
| **Description** | La session Checkout est créée avec `client_reference_id = String(orderId)` et `metadata.order_id = String(orderId)`. Après création, `orders.stripe_session_id` et `orders.client_reference_id` sont mis à jour avec l’id de session / l’orderId. |
| **Justification** | Appels `sessions.create` puis `UPDATE orders SET stripe_session_id, client_reference_id`. |
| **Si violé** | Le webhook ne peut pas résoudre la commande de façon fiable. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Métadonnées panier et livraison embarquées

| | |
|---|---|
| **Description** | La session porte en `metadata` : `cart_items`, `shipping`, `shipping_rate`, `cart_id`, `source = 'flippin-maple'`. |
| **Justification** | Objet `metadata` passé à `sessions.create`. |
| **Si violé** | Mode dégradé items / Printful / abandon sans contexte session. |
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
| **Description** | Le passage à `paid` est déclenché pour `checkout.session.completed` et `checkout.session.async_payment_succeeded`. Les autres types sont journalisés sans marquer la commande payée. |
| **Justification** | Branche conditionnelle puis chemin « Event ignoré ». |
| **Si violé** | Paiement confirmé non enregistré, ou statut `paid` sur un mauvais type d’événement. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Résolution de commande ordonnée

| | |
|---|---|
| **Description** | L’`orderId` est résolu dans cet ordre : (1) `orders.stripe_session_id = session.id`, (2) `client_reference_id` ou `metadata.order_id` comme `orders.id`, (3) dernière commande `pending` pour le même email. |
| **Justification** | `resolveOrderIdFromSession`. |
| **Si violé** | Mauvaise commande marquée payée, ou aucune. |
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
| **Description** | `POST /stripe` sur le routeur webhook appelle uniquement `handleStripeWebhook`. |
| **Justification** | `webhookRoutes.js`. |
| **Si violé** | Entrées de paiement non signées ou non centralisées. |
| **Fichiers** | `server/routes/webhookRoutes.js` |

---

## Idempotence

### Identifiant d’événement Stripe comme clé d’idempotence

| | |
|---|---|
| **Description** | Avant traitement métier, insertion `INSERT IGNORE` dans `stripe_events` sur `event_id`. Si `affectedRows === 0`, réponse `{ received: true, duplicate: true }` sans re-traiter. |
| **Justification** | Bloc idempotence dans `handleStripeWebhook`. |
| **Si violé** | Double passage `pending` → `paid`, double historisation, double effets de bord. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Upsert ultérieur de l’événement avec payload

| | |
|---|---|
| **Description** | Après traitement (ou pour les autres types), `upsertStripeEvent` enregistre / met à jour `event_type`, `payload`, et `order_id` si résolu. |
| **Justification** | `upsertStripeEvent` + appels en fin de handler. |
| **Si violé** | Perte de boîte noire Stripe pour audit. |
| **Fichiers** | `server/controllers/webhookController.js` |

### Items non réécrits si déjà présents

| | |
|---|---|
| **Description** | Le webhook n’insère des `order_items` que si aucun item n’existe déjà pour `order_id`. |
| **Justification** | Contrôle `SELECT … LIMIT 1` puis `shouldInsertItems`. |
| **Si violé** | Doublons d’articles ou écrasement du snapshot contractuel. |
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
| **Description** | Après marquage payé, insertion `order_status_history` avec `old_status = 'pending'`, `new_status = 'paid'`. |
| **Justification** | Insert dans le handler après `UPDATE orders`. |
| **Si violé** | Pas de preuve temporelle du passage payé. |
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
| **Description** | Si la session expose `payment_intent`, il est écrit dans `orders.stripe_payment_intent_id`. |
| **Justification** | `UPDATE` conditionnel dans le webhook. |
| **Si violé** | Traçabilité support / rapprochement events PI dégradée. |
| **Fichiers** | `server/controllers/webhookController.js` |

---

## Snapshots

### Snapshots adresse et email figés au checkout

| | |
|---|---|
| **Description** | À la création de commande : `email_snapshot`, `shipping_name_snapshot`, `shipping_address_snapshot` (JSON) sont écrits depuis le body checkout. |
| **Justification** | `INSERT INTO orders` dans `createCheckoutSession`. |
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
| **Description** | Chaque item stocke `price_at_purchase` et `unit_price_cents` au moment de l’insert (checkout ou fallback webhook). |
| **Justification** | Inserts `order_items` dans les deux contrôleurs. |
| **Si violé** | Montant vendu non reconstituable. |
| **Fichiers** | `server/controllers/checkoutController.js`, `server/controllers/webhookController.js` |

### Meta vitrine sur les items checkout

| | |
|---|---|
| **Description** | Au checkout, `order_items.meta` reçoit un JSON (nom, sku, couleur, taille, images, etc.) avec `source: 'checkoutController'`. |
| **Justification** | Construction `metaPayload` avant insert. |
| **Si violé** | Perte du contexte produit affiché au moment de l’achat. |
| **Fichiers** | `server/controllers/checkoutController.js` |

---

## Montants

### Prix invalides refusés avant commande complète

| | |
|---|---|
| **Description** | Si un article sans `priceId` a un `unit_amount` invalide (`<= 0` après conversion cents), le checkout répond `BAD_LINE_ITEMS` et n’atteint pas la création de session (la validation des prix précède l’insert order dans le flux actuel après construction des line_items). |
| **Justification** | Tableau `errors` + return 400 `BAD_LINE_ITEMS`. |
| **Si violé** | Session Stripe ou commande avec prix absurdes. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Totaux commande en cents au checkout

| | |
|---|---|
| **Description** | `subtotal_cents`, `shipping_cents`, `total_cents` sont calculés côté serveur (somme des `price_data.unit_amount * quantity` + shipping converti) et stockés sur `orders`. |
| **Justification** | Calculs puis `INSERT INTO orders`. |
| **Si violé** | Totaux internes non alignés avec les line_items envoyés à Stripe. |
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
| **Description** | Un panier absent ou vide produit `EMPTY_CART` (400). |
| **Justification** | Garde après `pickCart`. |
| **Si violé** | Session ou commande sans articles. |
| **Fichiers** | `server/controllers/checkoutController.js` |

---

## Sécurité

### Identité utilisateur depuis cookies httpOnly uniquement

| | |
|---|---|
| **Description** | `customer_id` / `userId` provient exclusivement des JWT dans les cookies `access` / `refresh`. Aucun `userId` du body n’est utilisé. |
| **Justification** | Commentaire d’invariants + lecture `req.cookies` ; échec → 401. |
| **Si violé** | Usurpation d’identité au checkout. |
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
| **Description** | Avant insert item, le checkout résout la référence front (`db_variant_id` / `variant_id`) vers la clé primaire `product_variants.id`. Si non résolu → 400 `VARIANT_NOT_FOUND_FOR_ORDER_ITEM_FK`. |
| **Justification** | Requête map + garde `if (!dbVariantId)`. |
| **Si violé** | Échec FK MySQL ou mauvaise variante fulfillment. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Trois identifiants variante non interchangeables

| | |
|---|---|
| **Description** | Le code distingue `product_variants.id` (FK order_items), `variant_id` métier/front, et `printful_variant_id` (exécution Printful). |
| **Justification** | SELECT map `db_id` / `biz_id` / `pf_id` ; insert utilise `dbVariantId` + `effectivePrintfulId`. |
| **Si violé** | Mauvaise référence Printful ou FK cassée. |
| **Fichiers** | `server/controllers/checkoutController.js`, `server/controllers/webhookController.js` |

### Verrouillage panier après paiement

| | |
|---|---|
| **Description** | Après `paid`, si `metadata.cart_id` est présent, `carts.status` passe de `open` à `ordered` (UPDATE conditionnel `status = 'open'`). |
| **Justification** | Bloc « Verrouiller le panier » du webhook. |
| **Si violé** | Même panier open réutilisable après paiement. |
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
| **Description** | Après résolution, les events Stripe sont associés à `order_id` (upsert / reconcile sur payload JSON). |
| **Justification** | `upsertStripeEvent`, `reconcileStripeEvents`. |
| **Si violé** | Audit chargeback / support sans lien event→commande. |
| **Fichiers** | `server/controllers/webhookController.js` |

---

## Reprise après erreur

### Mode dégradé : items absents uniquement

| | |
|---|---|
| **Description** | Si la commande existe mais n’a aucun `order_items`, le webhook peut les insérer depuis `metadata.cart_items` (après résolution variante DB). Il ne recrée pas une commande absente. |
| **Justification** | Blocs « Fallback d’insertion des order_items » et règle « Pas de création de commande magique si introuvable ». |
| **Si violé** | Soit perte d’items après paiement, soit duplication / commande inventée. |
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
| **Description** | Certaines étapes annexes (customer Stripe, abandoned_carts insert au checkout, historisation, lock panier, Printful) sont dans des `try/catch` qui journalisent sans toujours annuler le flux principal déjà engagé. |
| **Justification** | Patterns `console.warn` / `logWarn` autour de ces blocs. |
| **Si violé** | (Observation) Un échec annexe peut laisser des écarts (panier non locké, Printful non créé) alors que la commande est `paid`. |
| **Fichiers** | `server/controllers/checkoutController.js`, `server/controllers/webhookController.js` |

### Variante introuvable au checkout après insert order

| | |
|---|---|
| **Description** | Si une variante panier ne se résout pas, le checkout répond 400 alors qu’une ligne `orders` `pending` a déjà pu être créée. |
| **Justification** | Ordre du code : insert order → résolution variants → return 400 possible. |
| **Si violé** | (Observation) Commandes `pending` orphelines sans session Stripe / sans items complets. |
| **Fichiers** | `server/controllers/checkoutController.js` |

### Idempotence soft si insert ignore échoue

| | |
|---|---|
| **Description** | Si l’assert d’idempotence (`INSERT IGNORE`) échoue exceptionnellement, le handler log un warning et continue le traitement. |
| **Justification** | `catch` « Unable to assert idempotence » puis poursuite. |
| **Si violé** | Risque de double traitement si la contrainte d’unicité n’a pas pu être appliquée. |
| **Fichiers** | `server/controllers/webhookController.js` |

---

**Fin du document.**
