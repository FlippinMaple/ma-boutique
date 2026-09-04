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

**Runner de migrations.** `npm run migrate` (`scripts/run-migrations.js`) a été corrigé en P20-B (`77e0d86` — `fix(db): harden migration runner`). Le runner utilise une connexion MySQL dédiée (`mysql2/promise`), pas le pool applicatif ; `multipleStatements` n’est activé **que** sur cette connexion, **pas** dans `server/dbConfig.js` ni dans le runtime applicatif. Il est fail-fast, calcule un SHA-256 par fichier, compare filename + checksum à `schema_migrations`, et prend un verrou advisory `GET_LOCK` (timeout 10 s, `RELEASE_LOCK` dans le `finally`). Il refuse de fonctionner si `schema_migrations` n’existe pas ; il ne crée **pas** cette table automatiquement. **P20-C :** `schema_migrations` existe maintenant en production (`u601077843_flippinmaple`). Les deux migrations historiques (`2025-10-18_stripe_events.sql`, `2026-08-15_checkout_idempotency.sql`) y sont baselinées avec leurs SHA-256 exacts ; elles ne doivent **jamais** être rejouées. Si les checksums Git restent identiques, le runner doit les considérer comme déjà appliquées ; un checksum divergent reste fail-closed. `npm run migrate` **n’a pas** été exécuté contre la production pendant P20-C. Ne pas transformer `npm run migrate` en opération automatique de démarrage ou de déploiement. Chaque future exécution de migration production reste une opération explicite : backup approprié, inspection du SQL, autorisation, validation après application. Ce paragraphe ne change pas les droits ALTER Hostinger : l’erreur 1044 et l’émulation des contraintes en code restent valides.

**ALTER P20-D1 (cas par cas).** La correction `order_items` (`fk_order_items_order`) a exigé un ALTER manuel contrôlé en production, après backup Hostinger confirmé restaurable et autorisation explicite. La migration versionnée `2026-09-03_order_items_order_fk_restrict.sql` a ensuite été enregistrée dans `schema_migrations` avec son checksum exact. `npm run migrate` n’a pas appliqué cet ALTER. Cela **ne généralise pas** : tous les ALTER ne sont pas devenus fiables ; l’historique d’erreurs 1044 demeure une contrainte Hostinger à considérer au cas par cas.

**ALTER P20-D2 / #1091.** Tentative manuelle `DROP FOREIGN KEY order_items_ibfk_2` suivie d’un #1091 phpMyAdmin/Hostinger (« contrainte introuvable »), alors que les lectures `information_schema` / `SHOW INDEX` montraient ensuite la FK déjà absente, `fk_order_items_product_variant` intacte et `idx_product_variant_id` présent. Ne pas présenter #1091 comme preuve qu’aucune mutation n’a eu lieu. Ne pas prétendre non plus que l’ALTER a réussi explicitement. Après une erreur de ce type, **revalider toujours l’état réel** via `information_schema`. Backup approprié, autorisation, validation post-opération, opérations au cas par cas. `npm run migrate` n’a pas appliqué cet ALTER.

**ALTER P20-D3 (cas par cas).** `DROP FOREIGN KEY order_status_history_ibfk_1` a été exécuté manuellement et validé ensuite via `information_schema.REFERENTIAL_CONSTRAINTS` et `SHOW INDEX` (`fk_status_history_order` intacte, `idx_status_order_id` présent). Pas de nouveau backup manuel distinct (limite Hostinger 24 h) ; le backup de cette séquence reste celui créé avant P20-D1. `npm run migrate` n’a pas appliqué cet ALTER. Cela **ne généralise pas** les droits ALTER Hostinger.

**Panier `ordered`.** Le checkout ne verrouille plus un panier à la création de session (plus de `cart_id` client). Un passage `open` → `ordered` n’existe que dans le webhook, et seulement si un `metadata.cart_id` historique est encore présent.

**`FRONTEND_URL` (production).** Valeur officielle Hostinger : `FRONTEND_URL=https://flippinmaple.com`. Ne pas y mettre une liste comma-separated contenant des URLs locales : `sanitizeBaseUrl` prend actuellement la première entrée si la variable contient une virgule. Cette base sert notamment aux URLs Stripe `success_url` et `cancel_url`. Les origines localhost nécessaires au développement restent gérées séparément dans la configuration CORS du code ; elles n’ont pas à figurer dans `FRONTEND_URL` production.

**`UNSUB_HMAC_SECRET` (production, obligatoire depuis P10-B2).** Variable Hostinger **requise**. L’application échoue au chargement si elle est absente ou vide. Ne jamais documenter, logger ou copier sa valeur. Une rotation du secret invalide les tokens unsubscribe existants. Après P10, aucun fallback public n’existe.

**Basic Auth temporaire (surface publique, avant P20-D).** Noms de variables seulement : `SITE_BASIC_AUTH_ENABLED`, `SITE_BASIC_AUTH_USERNAME`, `SITE_BASIC_AUTH_PASSWORD`. Ne jamais documenter, logger ni copier les valeurs. Si le flag vaut `true`, le frontend et `/api` sont protégés ; `/health`, `/readiness` et `/webhook*` restent exempts (Hostinger + Stripe). Ne jamais activer le flag sans credentials configurés (fail closed 503). Réouverture = désactiver explicitement `SITE_BASIC_AUTH_ENABLED`, puis appliquer / redémarrer ; ne pas retirer username/password tant que le flag est encore `true`. Le webhook Stripe doit rester exempt. Cette mesure ne remplace pas l’audit ni les contrôles de sécurité applicatifs.
