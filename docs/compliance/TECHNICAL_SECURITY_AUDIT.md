# Audit technique, sécurité et intégrité transactionnelle

**Statut :** audit exploratoire figé — corrections non commencées

**Projet :** Flippin’ Maple  
**Nature :** rapport technique interne  
**Dernière mise à jour du gel :** 2026-07-26

---

## Complémentarité avec le plan de conformité

Ce document complète :

`docs/compliance/PRIVACY_COOKIES_CHATBOT_PLAN.md`

- **PRIVACY_COOKIES_CHATBOT_PLAN.md** demeure la référence pour la conformité, les communications, les consentements et le futur chatbot.
- **TECHNICAL_SECURITY_AUDIT.md** devient la référence technique principale pour la sécurité, l’intégrité transactionnelle, les priorités de correction et les invariants.

Le but de ce rapport est d’éviter de refaire l’audit et de conserver durablement :

- les constats;
- les preuves techniques;
- les priorités;
- les dépendances;
- les invariants à ne pas casser;
- l’ordre de correction;
- les validations futures.

### Limites du document

Ce document :

- ne prétend **pas** que le site est conforme juridiquement;
- ne prétend **pas** que le site est sécuritaire;
- ne constitue **pas** un avis juridique;
- ne remplace **pas** une revue de sécurité indépendante ni une validation juridique québécoise.

Il distingue clairement :

| Catégorie | Signification |
|---|---|
| Fait confirmé dans le code | Constat vérifié dans le dépôt ou l’application au moment de l’audit |
| Risque technique | Conséquence possible découlant d’un fait confirmé |
| Comportement observé en production | Observation opérationnelle (Hostinger, restauration, boutiques, etc.) |
| Hypothèse / à valider | Élément encore non confirmé de façon non destructive |
| Correction future proposée | Intention de correction; **non appliquée** |

---

## État du projet au moment du gel de l’audit

### Faits opérationnels

- Aucun déploiement n’a été autorisé dans le cadre de l’audit.
- Aucun correctif de sécurité n’a encore été appliqué.
- La boutique fonctionnait après la restauration de la base Hostinger.
- La base a été restaurée depuis une sauvegarde Hostinger datée du **24 juillet 2026 à 23 h**.
- Le site, la boutique et les produits ont ensuite été vérifiés comme fonctionnels.
- L’ancienne application `api.flippinmaple.com` a été supprimée.
- Cette suppression avait également supprimé la base associée, qui a ensuite été restaurée.

### Restrictions opérationnelles figées

- Aucune autre action destructive ne doit être recommandée sur Hostinger sans :
  - vérification explicite;
  - sauvegarde confirmée;
  - procédure réversible;
  - autorisation de Martin.
- Ne jamais inclure de mot de passe, clé API, jeton ou valeur secrète dans la documentation.
- Ne pas toucher aux variables d’environnement, à Hostinger, Stripe, Printful ou MySQL dans le cadre de ce gel.

### Nature de l’audit

Il s’agit d’un **audit exploratoire figé**. Les constats disponibles sont jugés suffisants pour commencer les corrections. De nouvelles explorations ne doivent être faites que lorsqu’un correctif précis l’exige.

---

## Invariants critiques à préserver

1. Seul le webhook Stripe signé peut faire passer une commande de `pending` à `paid`.
2. Une commande ne doit jamais devenir `paid` sans au moins un `order_item` confirmé.
3. Les snapshots de commande ne doivent pas être supprimés ou réécrits sans migration et décision explicites.
4. Le corps brut du webhook Stripe doit rester monté avant `express.json()`.
5. Les routes administratives doivent rester protégées par `requireRole('admin')`.
6. `requireRole` doit continuer à relire le rôle depuis MySQL.
7. Le panier ne doit être vidé côté navigateur qu’après confirmation du paiement par le backend.
8. Aucun prix, frais de livraison, identifiant de panier ou adresse enregistrée provenant du navigateur ne doit être considéré comme une source de vérité.
9. Aucun déploiement, redémarrage, suppression Hostinger ou migration de base ne doit être effectué implicitement.
10. Toute correction doit être petite, validée séparément et commitée séparément.

---

## Résumé exécutif des priorités

| Niveau | Signification |
|---|---|
| **BLOQUANT** | Empêche une posture de production saine; à planifier en premier avec prudence |
| **CRITIQUE** | Atteinte directe à l’intégrité financière, à la surface d’attaque ou à l’idempotence |
| **ÉLEVÉ** | Failles significatives d’auth, de consentement, de courriel ou de paniers |
| **MODÉRÉ** | Risques réels mais plus localisés ou conditionnels |
| **FAIBLE** | Améliorations utiles, impact limité |
| **DETTE TECHNIQUE** | Fragilité structurelle à traiter sans urgence absolue |

### Vue d’ensemble

| ID | Niveau | Titre |
|---|---|---|
| P0 | BLOQUANT | Configuration de production Hostinger (`NODE_ENV`, trust proxy, cookies, debug) |
| P1 | CRITIQUE | Prix et total contrôlés par le navigateur |
| P2 | CRITIQUE | Route Printful publique et orpheline |
| P3 | CRITIQUE | Checkout public sans protections suffisantes |
| P4 | CRITIQUE | Webhook Stripe et idempotence |
| P5 | CRITIQUE | Reconstruction fallback des `order_items` |
| P6 | ÉLEVÉ | Gestionnaire global d’erreurs |
| P7 | ÉLEVÉ | Authentification et sessions |
| P8 | ÉLEVÉ | Inscription et consentement marketing |
| P9 | ÉLEVÉ | Consentements, désabonnement et webhooks courriel |
| P10 | ÉLEVÉ | Secret de désabonnement |
| P11 | ÉLEVÉ | Paniers abandonnés |
| P12 | ÉLEVÉ | Cron des paniers abandonnés |
| P13 | ÉLEVÉ | Données Stripe conservées |
| P14 | MODÉRÉ | Livraison Printful |
| P15 | MODÉRÉ | Inventaire Printful |
| P16 | MODÉRÉ | Page de succès |
| P17 | MODÉRÉ | Produits publics |
| P18 | MODÉRÉ | Wishlist |
| P19 | MODÉRÉ | Printful automatique du webhook |
| P20 | MODÉRÉ | Base de données et migrations |
| P21 | MODÉRÉ | Journaux |
| P22 | FAIBLE | Routes administratives |
| P23 | FAIBLE | API de vérification du paiement |
| P24 | FAIBLE | Interface checkout |

---

## BLOQUANT — Configuration de production Hostinger

### Faits confirmés / observations

- L’application principale fonctionne actuellement avec `NODE_ENV=development`.
- Dans le code, `isProd` dépend strictement de `NODE_ENV === 'production'`.
- Cela maintient `trust proxy` à `false` derrière le proxy Hostinger.
- `express-rate-limit` a déjà détecté la présence de `X-Forwarded-For` avec trust proxy désactivé.
- Les cookies `access` et `refresh` utilisent `secure: isProd` et sont donc actuellement émis **sans** attribut `Secure`.
- `route-debug.js` est chargé dans l’application publique.
- Les traces d’erreurs peuvent être exposées hors mode production.
- Le comportement de développement reste actif sur le site public.

### Risques techniques

- Rate limiting peu fiable ou bruyant derrière le proxy.
- Cookies de session transmis sans `Secure` sur HTTPS public.
- Fuite d’informations via piles d’erreurs et outils de debug.
- Écart durable entre la configuration perçue (production) et le comportement réel (développement).

### Correction future proposée

- Planifier `NODE_ENV=production` avec prudence.
- Valider `TRUST_PROXY` / `TRUST_PROXY_HOPS` avant tout redémarrage.
- Vérifier les cookies `Secure` après redémarrage contrôlé.
- Désactiver `route-debug` en production.
- **Aucune action Hostinger implicite.**

---

## CRITIQUE — Prix et total contrôlés par le navigateur

### Faits confirmés dans le code

- `Checkout.jsx` envoie `item.price`.
- `Checkout.jsx` envoie `shipping_rate.name` et `shipping_rate.rate`.
- `checkoutController` utilise des valeurs de prix provenant du corps de la requête.
- `order_items.price_at_purchase` et `unit_price_cents` utilisent ces valeurs.
- Les métadonnées Stripe `cart_items` conservent également ces prix.
- Le webhook fallback peut reconstruire des `order_items` à partir de ces métadonnées.
- Le serveur ne recharge pas systématiquement le prix officiel depuis `product_variants`.
- Le tarif de livraison provenant du navigateur peut être utilisé.

### Risques techniques

- Manipulation de prix ou de frais de livraison côté client.
- Totaux Stripe et snapshots locaux dérivés de données non fiables.
- Reconstruction post-paiement à partir de métadonnées client.

### Correction future proposée

- Recalculer le prix des articles côté serveur depuis `product_variants`.
- Valider ou recalculer le tarif de livraison côté serveur avant la création de la session Stripe.
- Ne jamais traiter le navigateur comme source de vérité monétaire.

---

## CRITIQUE — Route Printful publique et orpheline

### Faits confirmés dans le code

- `POST /api/printful-order` est publique.
- Elle n’utilise ni authentification, ni rôle, ni rate limiter.
- Elle appelle directement l’API Printful avec `PRINTFUL_API_KEY`.
- Elle accepte une adresse, un courriel, des articles et des quantités.
- Elle n’exige aucune commande locale payée.
- Elle ne vérifie aucun paiement Stripe.
- Elle peut retourner l’objet Printful complet.
- Elle peut retourner des détails d’erreur fournisseur.
- Elle n’est appelée ni par `src` ni par `dist`.
- Elle est entièrement orpheline dans l’application actuelle.

### Risques techniques

- Surface d’attaque directe contre le compte Printful.
- Création de commandes fournisseur sans paiement.
- Fuite d’informations fournisseur.

### Correction future proposée

- Désactiver cette route **en priorité** lors des corrections.
- Ne pas réactiver sans authentification, rattachement à une commande `paid` et validation stricte.

---

## CRITIQUE — Checkout public sans protections suffisantes

### Faits confirmés dans le code

- `POST /api/create-checkout-session` est public.
- Le checkout invité est volontaire, mais la route n’a aucun rate limiter.
- Aucun validateur de schéma centralisé.
- Aucun maximum strict du nombre d’articles.
- Aucune limite stricte des quantités.
- Aucune transaction complète autour de la création `order` + `order_items` + Stripe.
- Une erreur intermédiaire peut laisser une commande `pending` partielle.
- Une ligne `order_items` peut être insérée avant l’échec d’une ligne suivante.
- Un attaquant peut créer des commandes `pending` et des sessions Stripe à répétition.
- `cartId`, `shipping_address_id` et `billing_address_id` peuvent provenir du navigateur.
- Leur propriété n’est pas systématiquement vérifiée.
- `effectivePrintfulId` peut préférer une valeur reçue du client.

### Risques techniques

- Pollution de la base et des sessions Stripe.
- Commandes orphelines ou partielles.
- Usurpation d’identifiants liés au compte.
- Contournement d’identifiants Printful.

### Correction future proposée

- Schéma de validation, limites, recalcul serveur, vraie transaction, expiration des `pending`.
- Conserver le checkout invité volontaire, mais le protéger.

---

## CRITIQUE — Webhook Stripe et idempotence

### Faits confirmés dans le code

- Le raw body Stripe est correctement monté avant `express.json()`.
- `stripe.webhooks.constructEvent` vérifie la signature.
- `STRIPE_WEBHOOK_SECRET` est obligatoire.
- Le webhook accepte `checkout.session.completed` et `checkout.session.async_payment_succeeded`.
- Aucune vérification explicite de `session.payment_status` n’a été trouvée.
- `ensureStripeEventsTable` est exécutée à chaque webhook.
- Elle tente `CREATE TABLE IF NOT EXISTS`.
- Elle tente `ALTER TABLE ADD COLUMN order_id`.
- Toutes les erreurs `ALTER` sont ignorées.
- Le schéma ne devrait pas être modifié pendant une requête webhook.
- `INSERT IGNORE` réserve `event_id` avant la fin du traitement.
- Si le processus s’arrête après l’insertion mais avant la fin, la relivraison peut être considérée comme doublon.
- Aucune colonne `processing`, `completed` ou `failed` ne distingue un événement réservé d’un événement entièrement traité.
- Si l’assertion d’idempotence échoue, le webhook poursuit quand même.
- L’idempotence fonctionne donc en mode **fail-open**.
- Lorsqu’aucune commande n’est trouvée, le webhook retourne HTTP 200.
- Stripe ne retentera donc pas automatiquement.
- Une relivraison peut ensuite être rejetée comme doublon.
- Le fallback de résolution par dernière commande `pending` du même courriel est trop permissif.
- Plusieurs commandes `pending` du même courriel peuvent être confondues.
- Une commande dans un état autre que `pending` ou `paid` peut recevoir un paiement Stripe sans rapprochement local obligatoire.
- Les opérations post-paiement ne sont pas atomiques.
- `payment_intent`, historique, panier, panier abandonné et Printful peuvent échouer après que la commande est déjà `paid`.
- Aucun mécanisme général de reprise ou de rapprochement n’a été identifié.

### Risques techniques

- Perte d’événements Stripe sans nouvelle tentative.
- Paiements non rapprochés.
- Attribution de paiement à la mauvaise commande.
- États partiels post-paiement difficiles à récupérer.
- DDL runtime dangereux en production.

### Correction future proposée

- Retirer le DDL runtime.
- États de traitement d’événement.
- Idempotence fail-closed ou récupérable.
- Vérifier `payment_status`.
- Supprimer le fallback par courriel.
- Mécanisme de reprise et rapprochement.

---

## CRITIQUE — Reconstruction fallback des order_items

### Faits confirmés dans le code

- Les articles peuvent être reconstruits depuis `session.metadata.cart_items`.
- Les prix viennent encore des métadonnées.
- Les quantités doivent seulement être finies et supérieures à zéro.
- Les quantités décimales ou très élevées ne sont pas explicitement refusées.
- La recherche de variante accepte plusieurs espaces d’identifiants.
- Les transactions utilisent `START TRANSACTION`, `COMMIT` et `ROLLBACK` directement sur un pool mysql2.
- Les requêtes ne sont pas garanties d’utiliser la même connexion.
- Une vraie transaction devrait réserver une connexion.
- Le webhook bloque correctement `paid` lorsqu’aucun `order_item` n’est confirmé.
- Dans ce cas précis, il libère `event_id` et retourne HTTP 500 pour permettre une nouvelle tentative.

### Risques techniques

- Reconstruction de lignes avec prix client.
- Transactions apparentes non atomiques.
- Quantités invalides acceptées.

### Point positif confirmé

- L’invariant « pas de `paid` sans `order_item` » est respecté dans ce chemin de fallback, avec libération de l’événement et HTTP 500.

---

## ÉLEVÉ — Gestionnaire global d’erreurs

### Faits confirmés dans le code

- Le commentaire affirme que la signature à quatre paramètres est obligatoire.
- La fonction est toutefois déclarée `errorHandler(err, req, res)`.
- Express peut donc ne pas la reconnaître comme middleware d’erreur.
- La signature future doit être `(err, req, res, next)`.
- Avec `NODE_ENV=development`, la pile est ajoutée au corps de réponse.
- Le gestionnaire par défaut d’Express pourrait aussi intervenir.
- `/readiness` retourne actuellement `e.message` publiquement en cas d’erreur MySQL.

### Correction future proposée

- Signature à quatre paramètres.
- Réponses publiques génériques.
- Détails complets uniquement dans les journaux internes appropriés.

---

## ÉLEVÉ — Authentification et sessions

### Faits confirmés dans le code

- Cookies `httpOnly`.
- `sameSite: lax`.
- `secure` lié à `isProd` et donc actuellement `false`.
- JWT access par défaut de 15 minutes.
- Cookie access conservé 1 heure.
- Refresh JWT et cookie de 30 jours.
- Login retourne `accessToken` et `refreshToken` dans le JSON malgré les cookies `httpOnly`.
- Refresh retourne `accessToken` dans le JSON.
- Le frontend ne semble pas lire ou conserver ces jetons.
- Aucune occurrence `accessToken`, `refreshToken`, `Authorization` ou stockage local de token n’a été trouvée dans `src`.
- Les jetons JSON sont donc probablement inutiles.
- Le refresh token n’est ni rotatif, ni stocké, ni révocable.
- Logout supprime seulement les cookies.
- Une copie d’un refresh token demeure valide jusqu’à expiration.
- `jwt.sign` et `jwt.verify` n’imposent pas explicitement `algorithms`, `issuer` ou `audience`.
- `verifyToken` ne recharge pas le compte en base.
- `requireRole` recharge correctement le rôle depuis MySQL.
- Le refresh recharge actuellement le compte lorsque `payload.role` est absent.
- Cette vérification reste conditionnelle.
- Login utilise un message générique pour un compte absent ou un mauvais mot de passe.
- Register révèle qu’un compte existe déjà avec ce courriel.
- Login, register et refresh n’ont aucun rate limiter.

### Correction future proposée

- Rate limit, ne plus retourner les jetons JSON, harmoniser les TTL, revalidation systématique, rotation/révocation, validation serveur complète.

---

## ÉLEVÉ — Inscription et consentement marketing

### Faits confirmés dans le code

- Le backend vérifie seulement présence prénom, nom, courriel et mot de passe.
- Aucune validation complète du format du courriel.
- Aucune longueur maximale claire des noms et du courriel.
- Mot de passe limité à 8–16 caractères.
- La complexité frontend n’est pas reproduite côté serveur.
- `passwordConfirm` est seulement vérifié s’il est fourni.
- `is_subscribed` est dérivé de `raw.is_subscribed` ou `raw.consentLoi25`.
- La valeur est convertie avec une simple vérification de vérité.
- La chaîne `"false"` devient donc `1`.
- `consentLoi25` est sémantiquement confondu avec un abonnement marketing.
- `customers.is_subscribed` est écrit.
- Aucune preuve complète n’est ajoutée dans `consents`.
- `acceptedCGU` est requis dans l’interface mais n’est pas envoyé ni enregistré.
- Les routes `/cgu` et `/politique-confidentialite` ne sont pas présentes.
- L’inscription crée immédiatement les cookies `access` et `refresh`.
- Le frontend redirige néanmoins vers `login`.
- Cette expérience est incohérente.

### Décision de gel liée à la conformité

- Ne pas modifier `Register.jsx` avant d’avoir défini l’architecture Loi 25 / consentements.
- Voir `PRIVACY_COOKIES_CHATBOT_PLAN.md`.

---

## ÉLEVÉ — Consentements, désabonnement et webhooks courriel

### Faits confirmés dans le code

- `POST /api/consents` est public.
- `POST` et `GET /api/unsubscribe` sont publics.
- `POST /api/email-webhooks/:provider` est public.
- `markCustomerSubscribed` attend `req` mais plusieurs appels ne lui transmettent pas `req`.
- Certaines écritures peuvent donc réussir partiellement avant une erreur.
- `/consents` accepte des champs de preuve provenant directement du navigateur.
- `customer_id`, `purpose`, `basis`, `method`, `text_snapshot`, `source`, `ip` et `user_agent` peuvent être fabriqués.
- IP et user-agent devraient être déterminés côté serveur.
- Aucune validation complète du courriel.
- Aucun rate limiter.
- Les webhooks fournisseurs ne sont pas authentifiés.
- Un faux bounce, complaint ou reject peut provoquer une suppression.
- Unsubscribe ajoute une ligne dans `unsubscribes` et tente `is_subscribed=0`.
- Il ne renseigne pas `consents.revoked_at`.
- `GET unsubscribe` modifie les données.
- Les scanners de courriel pourraient donc déclencher la désinscription.
- Les payloads fournisseurs complets sont conservés dans `email_events.meta`.
- Aucune idempotence provider event claire.
- `message_id` n’est pas unique.
- SendGrid possède une erreur possible de conversion des timestamps.
- Le lien généré pointe vers `/unsubscribe` côté frontend.
- Aucune route React correspondante n’a été trouvée.
- L’API réelle est `/api/unsubscribe`.
- Le lien actuel est donc inopérant.

### Correction future proposée

- Page React de confirmation + `POST` explicite.
- Preuves côté serveur.
- Webhooks authentifiés.
- Révocation des consentements.
- Rétentions définies.

---

## ÉLEVÉ — Secret de désabonnement

### Faits confirmés / à valider

- Le code utilise `UNSUB_HMAC_SECRET || 'change-me'`.
- Aucun `UNSUB_HMAC_SECRET` n’a été trouvé dans les fichiers `.env` locaux inspectés.
- Les variables de production sont gérées dans Hostinger et leur valeur **n’a pas été révélée ni vérifiée**.
- Ne jamais demander ou documenter la valeur du secret.
- L’absence réelle du secret en production reste à vérifier de façon non destructive.
- Le fallback public est bloquant avant l’activation des courriels.
- Le jeton contient un JSON base64url avec courriel et MAC.
- Il est signé, mais non chiffré.
- Le courriel est donc décodable depuis l’URL.
- Aucune expiration, `iat` ou version réellement imposée.
- Aucune `timingSafeEqual` trouvée.
- Aucune validation stricte du courriel dans le jeton.

---

## ÉLEVÉ — Paniers abandonnés

### Faits confirmés dans le code

- Le frontend utilise `localStorage` `cart`.
- Le panier persiste sans expiration.
- `inCheckout` contient `ts` et `ttlMs` de 20 minutes.
- Une clé expirée n’est pas systématiquement supprimée.
- `cart` est parsé sans protection complète contre un JSON corrompu.
- Le panier complet peut être écrit dans la console.
- Le tracking frontend utilise `beforeunload`, `pagehide` et `visibilitychange`.
- `sendBeacon` utilise `text/plain`.
- Le serveur utilise `express.json` et ne semble pas parser `text/plain`.
- Le Beacon principal peut donc être ignoré.
- `/api/log-abandoned-cart` est public.
- CORS accepte les requêtes sans `Origin`.
- Aucun rate limiter.
- Le courriel est seulement vérifié comme non vide.
- Snapshot visible sans limite métier claire.
- Le panier est conservé dans `cart_snapshot` et `cart_contents`.
- Le dédoublonnage par courriel sur dix minutes est sujet aux courses.
- `checkoutController` tente `source checkout_init`.
- L’ENUM `abandoned_carts.source` ne permet que `inactivity`, `beforeunload` et `manual`.
- Cette insertion échoue et l’erreur est avalée.
- Aucune unicité forte ou idempotence.
- Aucune rétention.
- Les données persistent après suppression du client ou du panier en raison des FK `SET NULL`.
- La récupération peut utiliser seulement le courriel sur les 30 derniers jours.
- Une nouvelle commande peut marquer le mauvais panier abandonné comme récupéré.

---

## ÉLEVÉ — Cron des paniers abandonnés

### Faits confirmés dans le code

- `startAbandonedCartCron` appelle les helpers sans `req`.
- Les helpers attendent `req`.
- Le cron échoue lorsque `ENABLE_ABANDON_CRON=true`.
- Le marketing vérifie certains consentements express.
- `expires_at` n’est pas vérifié.
- `revoked_at` est vérifié dans certains chemins seulement.
- Le `JOIN` direct sur `consents` peut dupliquer un panier.
- Aucune protection process-level contre le chevauchement.
- Aucune réservation atomique.
- `last_email_sent_at` est mis à jour seulement après l’envoi.
- Plusieurs workers peuvent envoyer plusieurs fois.
- `setInterval` async peut chevaucher des exécutions.
- Les crons sont lancés par chaque worker Node.
- Des verrous de base partagés seront nécessaires.

---

## ÉLEVÉ — Données Stripe conservées

### Faits confirmés dans le code

- `stripe_events.event_id` est une bonne clé d’idempotence unique.
- `payload` LONGTEXT conserve l’événement Stripe complet.
- Le checkout ajoute dans metadata :
  - `order_id`;
  - `cart_id`;
  - `shipping_rate`;
  - `shipping`;
  - `cart_items`.
- `shipping` contient nom, adresse, ville, province, pays, code postal et courriel.
- `cart_items` contient identifiants, quantités, prix, nom et SKU.
- Stripe Customer reçoit aussi courriel, nom, adresse et shipping.
- Stripe collecte également l’adresse de livraison.
- Il existe donc une duplication importante de renseignements.
- Aucune politique de rétention automatique de `stripe_events` n’a été trouvée.
- La liste admin n’expose pas `payload`.
- `getOrderDetail` utilise toutefois `SELECT *` sur `orders` et `oi.*`.
- Une future colonne sensible serait automatiquement exposée aux administrateurs.

### Correction future proposée

- Remplacer les `SELECT *` par des colonnes explicites.
- Réduire ou purger `payload`.
- Aligner avec la politique de rétention (validation juridique requise).

---

## MODÉRÉ — Livraison Printful

### Faits confirmés dans le code

- `POST /api/shipping/rates` est public.
- `shippingLimiter` est appliqué à 20 appels/minute/IP.
- Sa fiabilité dépend de trust proxy.
- Le frontend déclenche une demande dès que les champs d’adresse sont remplis.
- Chaque modification d’adresse peut provoquer une nouvelle requête.
- Aucun debounce.
- Aucune annulation des requêtes précédentes.
- Une réponse ancienne peut remplacer une réponse plus récente.
- `setShippingRate(null)` est correctement appelé lorsque l’adresse change.
- Le bouton de paiement reste désactivé sans tarif.
- `setShippingRate` transmis directement est une fonction stable.
- Le courriel `userEmail` n’est pas inclus dans l’objet `shipping` actuel.
- Le nom et l’adresse complète sont toutefois envoyés à Printful avant paiement.
- Les variantes et quantités du panier sont envoyées.
- Un `variant_id` court numérique peut être accepté directement sans validation locale.
- Le chemin `printful_variant_id` effectue un lookup.
- Les quantités doivent seulement être finies et positives.
- Les décimales et valeurs très élevées ne sont pas explicitement refusées.
- Les articles invalides peuvent être ignorés.
- Une requête vide peut ensuite atteindre Printful.
- Les champs d’adresse n’ont pas de limites strictes.
- L’objet `item` complet peut être inscrit dans les logs lorsqu’une variante est introuvable.
- Le client reçoit heureusement un message générique en cas d’erreur Printful.

---

## MODÉRÉ — Inventaire Printful

### Faits confirmés dans le code

- `GET /api/inventory/printful-stock/:id` est public.
- `inventoryLimiter` existe à 60 appels/minute/IP.
- Il n’est importé ou utilisé nulle part.
- Chaque appel déclenche un appel direct à Printful.
- Aucun cache.
- Timeout Axios global de 10 secondes.
- L’identifiant n’est pas strictement validé.
- Il n’est pas vérifié qu’il appartient à une variante de la boutique.
- `available 999` signifie seulement disponible.
- Il ne représente pas un stock réel.
- Le service remplace l’erreur Printful par un message générique.
- L’appel actuel à `logError` passe un troisième argument ignoré.
- L’erreur Printful originale n’est donc pas conservée par cet appel précis.

---

## MODÉRÉ — Page de succès

### Faits confirmés dans le code

- `Success.jsx` lit `session_id`.
- Appelle `/payments/verify` une seule fois.
- Le backend vérifie seulement MySQL, pas Stripe directement.
- `paid` est vrai seulement lorsque le webhook a déjà mis la commande à `paid`.
- Le panier est vidé seulement si `paid === true`.
- Cela est correct.
- Mais aucune nouvelle tentative n’est effectuée.
- Si le webhook est retardé, le panier n’est pas vidé.
- `Success.jsx` redirige toujours vers `/shop?flash=merci`.
- Même sans `session_id`.
- Même si la session est introuvable.
- Même si la vérification échoue.
- `Shop.jsx` affiche ensuite « Merci pour ton achat » uniquement selon `flash=merci`.
- Un faux message de réussite est donc possible.
- `window.location.replace` retire correctement `session_id` de l’URL courante.
- `Shop.jsx` nettoie correctement `flash` avec `replace`.

---

## MODÉRÉ — Produits publics

### Faits confirmés dans le code

- Les listes visible et featured filtrent `is_visible=1`.
- Les requêtes utilisent des paramètres.
- Les colonnes sont explicites.
- Aucun appel Printful.
- `getProductDetails` ne filtre pas `is_visible`.
- Un produit masqué reste accessible par son ID.
- Toutes ses variantes sont alors retournées.
- `productId` vérifie seulement `Number.isNaN`.
- Entier positif fini non imposé.
- La recherche `q` utilise `LIKE` avec wildcard initial.
- Longueur de `q` non limitée.
- Le frontend peut déclencher une requête à chaque frappe.
- `printful_variant_id` est public dans le catalogue.
- Ce n’est pas un secret, mais cela facilite l’appel automatisé de l’inventaire.

---

## MODÉRÉ — Wishlist

### Faits confirmés dans le code

- Les routes sont protégées par `verifyToken`.
- Le contrôleur compare correctement le `customerId` demandé au `req.user.id`.
- Un utilisateur ne peut pas simplement accéder à la wishlist d’un autre.
- Le service travaille au niveau produit seulement.
- `variant_id` et `printful_variant_id` sont ignorés.
- Le toggle n’est pas atomique.
- Le modèle attend `req` pour accéder à `req.app.locals.db`.
- Le service n’envoie jamais `req`.
- Les endpoints échouent donc probablement avec une erreur 500.
- Aucun appel wishlist n’a été trouvé dans `src`.
- Aucun appel wishlist n’a été trouvé dans `dist`.
- La fonctionnalité est orpheline et cassée.

### Correction future proposée

- Réparer et réintégrer, **ou** désactiver explicitement.

---

## MODÉRÉ — Printful automatique du webhook

### Faits confirmés dans le code

- Le bloc ne s’exécute que si `usedFallbackItems` est `true`.
- Il ne s’exécute pas pour une commande normale ayant déjà ses `order_items`.
- `PRINTFUL_AUTOMATIC_ORDER` est actuellement désactivé.
- Le bloc construit `variant_id` et `printful_variant_id`.
- `mapCartToPrintfulVariants` cherche `item.id`.
- `mapCartToPrintfulVariants` utilise incorrectement `getDb.query`.
- `getDb` est importé comme fonction.
- `createPrintfulOrder` centralisé n’envoie pas `X-PF-Store-Id`.
- Le chemin échouerait probablement s’il était activé.
- `confirm:false` montre l’intention de créer un brouillon Printful.

### Décision

- Ne pas activer cette automatisation avant correction et validation.

---

## MODÉRÉ — Base de données et migrations

### Faits confirmés dans le code

- Une seule migration visible concernait `stripe_events`.
- `scripts/run-migrations.js` importe `pool` depuis `server/db.js`.
- `server/db.js` n’exporte pas ce symbole.
- Le runner semble donc cassé.
- Le fichier SQL contient plusieurs déclarations.
- mysql2 n’a pas `multipleStatements` activé.
- Le runner attrape les erreurs et continue.
- Aucune table de suivi des migrations.
- Aucune transaction complète.
- Le webhook modifie dynamiquement le schéma.
- Le schéma de production a évolué au-delà de la migration Git.

### Correction future proposée

- Migrations idempotentes, versionnées et exécutées explicitement.
- Aucune migration ne doit être lancée pendant cette phase sans sauvegarde et autorisation.

---

## MODÉRÉ — Journaux

### Faits confirmés dans le code

- La table `logs` conserve `level`, `message` et `created_at`.
- Rétention MySQL par défaut de sept jours.
- `app.log` est utilisé lorsque MySQL est indisponible.
- `app.log` utilise `appendFileSync`.
- Aucune rotation.
- Aucune purge du fichier.
- Il peut croître indéfiniment.
- `logError` conserve la stack lorsqu’un objet `Error` est transmis.
- Plusieurs appels ne transmettent toutefois qu’une string.
- `context` et `details` existent dans la table mais ne sont pas utilisés.
- `purgeOldLogs` retourne `ok:true` même lorsqu’aucune base n’est disponible.
- `engine none` signifie en réalité qu’aucune purge n’a été faite.
- Plusieurs workers peuvent lancer la purge simultanément.

### Règles

- Ne jamais journaliser des secrets.
- Réduire les informations de connexion DB actuellement écrites au démarrage.

---

## FAIBLE — Routes administratives

### Faits confirmés dans le code

- `router.use(requireRole('admin'))` est placé avant toutes les routes admin.
- `requireRole` relit le rôle en base.
- `listOrders` retourne un ensemble limité de colonnes.
- `listStripeEvents` n’expose pas `payload`.
- `getOrderDetail` utilise `SELECT * FROM orders` et `oi.*`.
- La route reste admin seulement.
- Préférer des colonnes explicites.
- `/health/paid-without-items` retourne le courriel, mais reste admin seulement.

---

## FAIBLE — API de vérification du paiement

### Faits confirmés dans le code

- `GET /api/payments/verify` est public.
- Il exige `session_id`.
- Il ne contacte pas Stripe.
- Il cherche `orders.stripe_session_id`.
- Il retourne seulement `paid`, `found` et `orderId`.
- Aucune adresse, aucun courriel et aucun panier.
- Stripe `session_id` est difficile à deviner mais peut circuler dans les URLs ou captures.
- Aucune authentification ou rate limiter.
- Le risque d’exposition est limité, mais le endpoint doit être évalué avec la nouvelle logique de page succès.

---

## FAIBLE — Interface checkout

### Faits confirmés dans le code / interface

- Les boutons « Payer maintenant » et « Continuer comme invité » ont historiquement appelé exactement `handleCheckout` avec le même comportement.
- Le second était marqué TEMP.
- L’interface présentait donc deux choix sans différence fonctionnelle.
- Le nettoyage futur devra conserver le checkout invité sans créer de confusion.

> Note de gel : le bouton temporaire a pu être retiré dans des travaux UI ultérieurs. En cas de doute, vérifier le fichier précis `src/pages/Checkout.jsx` avant correction, sans refaire l’audit complet.

---

## Schémas de production observés

Aucune donnée personnelle réelle n’est reproduite ici.

### Consents

- Objectif `marketing_email` seulement.
- Basis `express` ou `implied`.
- Method `checkbox`, `double_opt_in` ou `import`.
- `text_snapshot` obligatoire.
- `granted_at`, `expires_at` et `revoked_at`.
- Aucune unicité empêchant plusieurs consentements actifs.
- FK `customer_id` `SET NULL` à la suppression.
- Le cron ignore `expires_at`.
- Unsubscribe ne met pas `revoked_at`.
- Les données peuvent rester après suppression du compte.

### Unsubscribes

- `email` unique.
- `customer_id` nullable.
- FK `SET NULL`.
- Le contrôleur ne renseigne pas actuellement `customer_id`.

### Email_events

- Type `delivered`, `bounce`, `complaint`, `open`, `click` ou `reject`.
- `meta` LONGTEXT.
- Aucun identifiant fournisseur unique.
- `message_id` non unique.
- Aucune idempotence forte.
- Payload fournisseur complet potentiellement conservé.

### Abandoned_carts

- Source enum `inactivity`, `beforeunload` ou `manual`.
- `checkout_init` invalide.
- `cart_snapshot` et `cart_contents`.
- `customer_email` obligatoire.
- Aucune unicité forte.
- Plusieurs index simples.
- FK `cart_id` et `user_id` `SET NULL`.
- Aucune rétention observée.

### Stripe_events

- `event_id` clé primaire.
- `event_type`.
- `created_at`.
- `payload` LONGTEXT.
- `received_at`.
- `order_id` nullable.
- Aucun FK `order_id`.
- Payload complet sans purge observée.

### Logs

- Level enum `debug`, `info`, `warn`, `error`.
- `message` TEXT.
- `context` et `details` existent.
- `created_at` indexé.
- Purge MySQL configurée.
- Fichier fallback non purgé.

---

## Plan de correction recommandé

### Phase 0 — Gel, documentation et sauvegardes

- Finaliser le présent audit.
- Vérifier `git status`.
- Conserver une sauvegarde de base valide.
- Aucun changement Hostinger destructif.
- Définir une procédure de retour arrière.

### Phase 1 — Stabilisation de la production

- Planifier `NODE_ENV=production`.
- Confirmer `TRUST_PROXY` et `TRUST_PROXY_HOPS`.
- Corriger `errorHandler` à quatre paramètres.
- Rendre `/readiness` générique.
- Désactiver `route-debug` en production.
- Préparer une CSP compatible avant activation.
- Vérifier les cookies `Secure` après redémarrage contrôlé.

### Phase 2 — Réduction immédiate de la surface

- Désactiver `/api/printful-order`.
- Décider du sort de la wishlist orpheline.
- Brancher les limiteurs nécessaires.
- Ne pas activer Printful automatique.

### Phase 3 — Intégrité du checkout

- Créer un schéma de validation.
- Limiter tailles et quantités.
- Charger les variantes et prix en base.
- Recalculer le sous-total.
- Recalculer ou revalider le transport.
- Vérifier les identifiants liés au compte.
- Utiliser une vraie transaction sur connexion dédiée.
- Traiter les échecs Stripe sans commandes orphelines.
- Ajouter une stratégie d’expiration ou nettoyage des `pending`.

### Phase 4 — Webhook Stripe

- Retirer le DDL runtime.
- Créer une migration explicite.
- Ajouter des états de traitement d’événement.
- Rendre l’idempotence fail-closed ou récupérable.
- Vérifier `payment_status`.
- Supprimer le fallback par courriel.
- Gérer les états non `pending`.
- Créer un mécanisme de reprise et rapprochement.
- Réduire ou purger `payload`.
- Prévoir remboursements et contestations.

### Phase 5 — Authentification

- Rate limit login, register et refresh.
- Ne plus retourner les jetons dans le JSON.
- Harmoniser TTL cookie et JWT.
- Revalider toujours le compte au refresh.
- Rotation ou stockage révocable des refresh tokens.
- Validation serveur complète de l’inscription.
- Séparer compte, CGU, confidentialité et abonnement marketing.

### Phase 6 — Consentements et courriels

- Corriger `markCustomerSubscribed`.
- Reconstruire la preuve côté serveur.
- Sécuriser les webhooks fournisseurs.
- Créer un désabonnement explicite par `POST`.
- Révoquer les consentements.
- Corriger le lien frontend.
- Vérifier `UNSUB_HMAC_SECRET` sans l’exposer.
- Ajouter expiration et comparaison sûre.
- Définir les rétentions.

### Phase 7 — Paniers abandonnés et crons

- Corriger le parser Beacon ou changer le transport.
- Réduire les snapshots.
- Corriger `checkout_init`.
- Corriger `req` / `getDb`.
- Respecter `expires_at` et `revoked_at`.
- Éviter les doublons de `JOIN`.
- Utiliser réservations atomiques et verrous partagés.
- Éviter les crons multiples par worker.
- Définir rétention et suppression.

### Phase 8 — Fonctionnalités et dette

- Corriger `Success.jsx`.
- Cacher les produits non visibles.
- Ajouter cache et limiter l’inventaire.
- Debounce et annulation shipping.
- Réparer ou retirer wishlist.
- Retirer le bouton checkout temporaire s’il est encore présent.
- Remplacer les `SELECT *`.
- Réparer les migrations.
- Rotation `app.log`.

---

## Stratégie de validation

Chaque correctif devra suivre :

1. un seul sujet;
2. une petite modification;
3. inspection du diff;
4. validation locale ciblée;
5. aucune exécution lourde sans autorisation;
6. commit séparé;
7. aucun push sans autorisation;
8. aucun déploiement sans autorisation;
9. validation Hostinger après déploiement;
10. journal des résultats et procédure de rollback.

---

## Éléments restant à confirmer

- Valeur réelle de `NODE_ENV` après future correction.
- Comportement exact de `TRUST_PROXY` chez Hostinger.
- Présence réelle de `UNSUB_HMAC_SECRET` dans les variables Hostinger **sans révéler sa valeur**.
- Comportement exact de Printful pour `POST /orders` sans champ `confirm` dans la route orpheline.
- Besoin réel de `name` pour les tarifs Printful.
- Politique de rétention légale finale à faire valider.
- Fonctionnement futur du chatbot.
- Stratégie de refresh token.
- Stratégie de migration de production.
- Présence de plusieurs workers après montée en charge.
- Destination SMTP réelle et pays de traitement.
- Webhooks Stripe à configurer dans le tableau de bord.
- Le tableau de bord Stripe sandbox ne montrait aucun endpoint webhook configuré lors de l’audit.
- Stripe et Printful utilisaient alors des configurations de test ou désactivées selon les vérifications effectuées.
- Aucune valeur secrète ne doit être inscrite.

---

## Décision de gel de l’audit

- L’exploration fichier par fichier est terminée.
- Les constats disponibles sont suffisants pour commencer les corrections.
- De nouvelles explorations ne doivent être faites que lorsqu’un correctif précis l’exige.
- Il ne faut pas refaire l’audit complet.
- Le présent document devient la **référence technique principale**.
- `PRIVACY_COOKIES_CHATBOT_PLAN.md` demeure la référence pour la conformité, les communications et le futur chatbot.
- En cas de divergence, ne pas deviner : vérifier le fichier précis concerné.

---

## Avertissement final

Ce rapport est un outil interne de planification technique.

Il ne constitue pas :

- un avis juridique;
- une certification de sécurité;
- une déclaration de conformité;
- une autorisation de déploiement;
- une autorisation de migration ou d’action destructive Hostinger.

Toute correction doit respecter les invariants, la stratégie de validation et l’autorisation explicite avant push, redémarrage ou mise en production.
