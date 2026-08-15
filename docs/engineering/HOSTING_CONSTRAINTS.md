# Contraintes d’hébergement

**Document :** `docs/engineering/HOSTING_CONSTRAINTS.md`  
**Statut :** actif — migré depuis l’inventaire technique  
**Provenance :** `docs/INVENTAIRE_Flippin_Maple.md` — section `IMPORTANT — Contraintes d’hébergement (Hostinger / prod actuelle)`  
**Date de migration :** 2026-07-16  
**Portée :** contraintes Hostinger / MySQL prod et émulation des règles en code  

---

IMPORTANT — Contraintes d’hébergement (Hostinger / prod actuelle)

La base MySQL en prod (Hostinger) ne nous laisse pas exécuter librement des ALTER TABLE (erreur 1044).

Résultat : certaines contraintes qu’on voudrait mettre directement en base (FK carts.user_id → customers.id ON DELETE SET NULL, FK orders.shipping_address_id → addresses.id, etc.) ne peuvent pas être ajoutées en ce moment.

On émule donc ces contraintes dans le code backend :

Quand on associe un panier à un user, si le user n’existe pas, on force user_id = NULL (équivalent à ON DELETE SET NULL).

Au checkout, on capture des snapshots immuables (adresse, email, prix payé) dans orders et order_items au moment de la création de la commande.

On enregistre immédiatement stripe_session_id dans orders pour pouvoir relier les webhooks Stripe à la commande.

On écrit aussi une ligne initiale dans order_status_history.

Ces règles côté code SONT la vérité opérationnelle tant qu’on n’a pas les droits ALTER TABLE sur l’hébergeur. Le jour où on migre vers une base où on a les droits root, on pourra les traduire en vraies contraintes SQL.

**CREATE TABLE vs ALTER TABLE.** `CREATE TABLE IF NOT EXISTS` reste le mécanisme de schéma le moins risqué observé en prod pour une **table neuve** (ex. `logs`, `checkout_idempotency`, et historiquement `stripe_events`). P3-E1 a donc ajouté une table dédiée plutôt qu’un `ALTER TABLE orders`, précisément à cause de l’erreur 1044.

**Webhook et `stripe_events` (P4-B).** La table `stripe_events` existe déjà en production (y compris `order_id`). Depuis P4-B, le webhook **ne tente plus** de `CREATE TABLE` ni `ALTER TABLE` au runtime : il suppose la table provisionnée. Ce n’est pas une nouvelle capacité Hostinger ; c’est la séparation provisioning / traitement. P4 n’a requis aucune migration ni ALTER.

**Runner de migrations.** `npm run migrate` (`scripts/run-migrations.js`) n’est **pas** un mécanisme opérationnel fiable aujourd’hui : le script importe `{ pool }` depuis `server/db.js`, alors que ce module exporte `getPool()`. Les fichiers sous `db/migrations/` restent la trace versionnée du SQL ; l’application en prod Hostinger se fait hors de ce runner tant qu’il n’est pas corrigé. Ne pas présenter `npm run migrate` comme déjà utilisable.

**Panier `ordered`.** Le checkout ne verrouille plus un panier à la création de session (plus de `cart_id` client). Un passage `open` → `ordered` n’existe que dans le webhook, et seulement si un `metadata.cart_id` historique est encore présent.

**`FRONTEND_URL` (production).** Valeur officielle Hostinger : `FRONTEND_URL=https://flippinmaple.com`. Ne pas y mettre une liste comma-separated contenant des URLs locales : `sanitizeBaseUrl` prend actuellement la première entrée si la variable contient une virgule. Cette base sert notamment aux URLs Stripe `success_url` et `cancel_url`. Les origines localhost nécessaires au développement restent gérées séparément dans la configuration CORS du code ; elles n’ont pas à figurer dans `FRONTEND_URL` production.
