# État du projet — Flippin’ Maple

**Document :** `docs/ETAT_DU_PROJET.md`  
**Nature :** index de reprise, pas une source d’autorité  
**Audit :** lecture du dépôt le 2026-11-08  
**Commit observé :** `30c1a4f` (`docs(home): add campaign A-F asset checkpoint`, 2026-10-08), branche `main`, alignée sur `origin/main`  
**Hors portée :** cet audit n’a pas lancé l’application, les tests, les migrations, ni un déploiement. Il n’a pas ouvert les fichiers `.env`.

En cas de contradiction, les documents cités ci-dessous priment. Ce fichier ne remplace pas `docs/00_PROJECT_MASTER.md`.

---

## 1. Identité

| Élément | Fait observé |
|---|---|
| Marque | Flippin’ Maple |
| Nom technique du dépôt | `mon-shop-artofwhere` |
| Dépôt distant | `origin` → `https://github.com/FlippinMaple/ma-boutique.git` |
| Statut produit | Le README §2 indique que le socle e-commerce existe et que le projet n’est pas prêt pour un lancement public |
| Chantier actif documenté | Redesign du storefront. Décision humaine du 2026-09-10, README §2.3 |

---

## 2. Architecture

Monolithe applicatif, une seule application déployable. Direction cible : monolithe modulaire, non réalisée comme plateforme portable. Détail : `docs/engineering/ARCHITECTURE.md`.

```text
Navigateur
  → Vite (dev, port 3000) ou Express qui sert dist/ (prod, même origine)
      → /api  →  Express (port 4242 en local)
                    → MySQL (mysql2)
                    → Stripe (checkout + webhook)
                    → Printful (catalogue, stock, frais, fulfillment)
                    → SMTP (nodemailer)
```

| Couche | Emplacement | Technologie confirmée |
|---|---|---|
| Frontend | `src/` | React 18, Vite 6, React Router 7 |
| Point d’entrée UI | `src/main.jsx`, `src/App.jsx` | `CartProvider` puis routes |
| Client HTTP | `src/utils/api.js` | Axios, `baseURL: '/api'`, cookies (`withCredentials`) |
| Backend | `server/` | Node.js, Express 5, ESM (`"type": "module"`) |
| Amorçage | `server.js` (racine) importe `server/server.js` | Charge `.env` racine puis `server/.env` |
| Application HTTP | `server/app.js` | CORS, cookies, JSON, webhook brut, static `dist/` si présent |
| Données | `server/db.js`, `server/dbConfig.js` | Pool MySQL `mysql2/promise` |
| Schéma | `docs/engineering/DATA_MODEL.md` | Source officielle |
| Migrations | `db/migrations/`, `scripts/run-migrations.js` | Runner dédié, pas au démarrage |
| Jobs | `server/jobs/` | Démarrés par `server/server.js` via `startCronJobs()` |
| Build frontend | `npm run build` → `dist/` | Express sert `dist/` seulement si `dist/index.html` existe |
| Proxy dev | `vite.config.js` | `/api` → `http://localhost:4242` |

Le proxy Vite ne déclare que `/api`. Le webhook Stripe est `POST /webhook/stripe` sur le processus Express, pas sous `/api`.

Deux `package.json` coexistent : la racine (frontend + scripts) et `server/package.json` (backend). Les deux ont un `node_modules` local au moment de l’audit. Les imports de `server/*.js` se résolvent d’abord dans `server/node_modules`.

`pg` est déclaré dans les deux `package.json` et verrouillé en 8.22.0 à la racine. Aucun import `pg` n’a été trouvé dans le code applicatif `.js` / `.jsx`. La base documentée et utilisée par `server/db.js` est MySQL.

---

## 3. Versions réellement verrouillées

Relevées dans `package-lock.json` à la racine, le 2026-11-08. `package.json` ne fixe pas de champ `engines`.

| Outil | Version verrouillée | Note |
|---|---|---|
| Node (machine d’audit) | 22.14.0 | `react-router-dom` 7.6.0 déclare `node >= 20` |
| npm (machine d’audit) | 11.3.0 | |
| React / React DOM | 18.3.1 | plage `^18.2.0` |
| Vite | 6.4.3 | |
| `@vitejs/plugin-react` | 4.7.0 | |
| React Router DOM | 7.6.0 | plage `^7.5.2` |
| Express | 5.1.0 | |
| mysql2 | 3.23.0 | plage `^3.14.0` |
| Stripe | 18.5.0 | plage `^18.0.0` |
| Axios | 1.12.2 | |
| bcrypt | 5.1.1 | |
| jsonwebtoken | 9.0.3 | |
| Helmet | 8.1.0 | CSP désactivée dans `server/app.js` |
| nodemailer | 7.0.9 | |
| node-cron | 4.6.0 | |
| dotenv (racine) | 17.2.3 | |
| dotenv (`server/package-lock.json`) | 16.6.1 | le backend résout ce module depuis `server/` |
| ESLint | 9.27.0 | devDependency, plage `^9.25.1` |
| lucide-react | 0.523.0 | |

Autres dépendances présentes dans le `package.json` racine : `@fontsource-variable/archivo`, `@fontsource/source-sans-3`, `archiver`, `body-parser`, `compression`, `connect-history-api-fallback`, `cookie-parser`, `cors`, `express-rate-limit`, `fs-extra`, `jwt-decode`, `lru-cache`, `react-hot-toast`, `rimraf`, `sweetalert2`, `vite-plugin-mkcert`, `pg`.

---

## 4. Frontend — routes et fichiers

Déclarées dans `src/App.jsx` et `src/admin/AdminRoutes.jsx`.

| Route | Fichier | Rôle observé dans le code |
|---|---|---|
| `/` | `src/pages/Home.jsx` | Accueil, hero campagne, produits vedettes via `GET /api/products/featured` |
| `/shop` | `src/pages/Shop.jsx` | Boutique |
| `/product/:id` | `src/pages/ProductDetail.jsx` | Fiche produit |
| `/checkout` | `src/pages/Checkout.jsx` | Enveloppé par `ProtectedCheckoutRoute` |
| `/checkout/success`, `/success` | `src/pages/Success.jsx` | Retour paiement |
| `/checkout/cancel`, `/cancel` | `src/pages/Cancel.jsx` | Annulation |
| `/login`, `/register` | `src/pages/Login.jsx`, `Register.jsx` | Auth |
| `/dashboard` | `src/pages/Dashboard.jsx` | Réservé aux sessions authentifiées |
| `/unsubscribe` | `src/pages/Unsubscribe.jsx` | Désabonnement |
| `/admin` | `src/admin/pages/Dashboard.jsx` | Garde `AdminGuard`, santé « payées sans items » |
| `/admin/products` | `src/admin/pages/Products.jsx` | Liste et bascule « featured » |
| `/admin/orders`, `/admin/orders/:id` | `Orders.jsx`, `OrderDetail.jsx` | Commandes |
| `/admin/stripe-events` | `src/admin/pages/StripeEvents.jsx` | Placeholder, n’appelle pas l’API |
| `/admin/abandoned-carts` | `AbandonedCarts.jsx` | Placeholder |
| `/admin/logs` | `Logs.jsx` | Placeholder |
| `/admin/users` | `Users.jsx` | Placeholder |

Composants partagés : `src/components/Header.jsx`, `Footer.jsx`, `ProductCard.jsx`, `HomeProductCard.jsx`, `ShippingOptions.jsx`, `src/CartContext.jsx`.

Actifs de marque suivis par Git :

- `src/assets/brand/` — wordmark, compact F’M, mark M (SVG noir et blanc)
- `src/assets/campaign/` — hero Montréal desktop/mobile (png et webp) et `brand-street-movement-4x5` (png et webp)
- `public/favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`

`docs/web/HOMEPAGE_ASSETS.md` §3 est un instantané du 2026-07-22, avec une note du 2026-09-07 qui dit encore que les photographies locales sont absentes. Les fichiers de campagne ci-dessus sont arrivés dans les commits du 2026-09-15, 2026-09-28 et 2026-10-08. Le plan d’actifs n’a pas été réécrit pour cet état.

Styles : `src/index.css`, `src/App.css`, CSS colocalisés sous `src/pages/` et `src/components/styles/`.

Aucun composant chatbot n’a été trouvé dans `src/`. Le sujet vit dans `docs/compliance/PRIVACY_COOKIES_CHATBOT_PLAN.md`.

---

## 5. Backend — montage des routes

Montage dans `server/app.js`.

| Préfixe | Fichier de routes | Endpoints lus dans le code |
|---|---|---|
| `/api` | `server/routes/abandonedCartRoutes.js` | `POST /api/log-abandoned-cart` |
| `/webhook` | `server/routes/webhookRoutes.js` | `POST /webhook/stripe` |
| `/api/auth` | `server/routes/authRoutes.js` | `POST /login`, `/refresh-token`, `/logout`, `/register` ; `GET /whoami` |
| `/api/products` | `server/routes/productsRoutes.js` | `GET /`, `/featured`, `/details/:id`, `/:id` |
| `/api/create-checkout-session` | `server/routes/checkoutRoutes.js` | `POST /` |
| `/api/inventory` | `server/routes/inventoryRoutes.js` | `GET /printful-stock/:id` |
| `/api/shipping` | `server/routes/shippingRoutes.js` | `POST /rates` |
| `/api/admin` | `server/routes/adminRoutes.js` | `requireRole('admin')` puis santé, produits, commandes, `GET /stripe-events` |
| `/api` | `server/routes/ordersRoutes.js` | `GET /protected`, `GET /user-info` |
| `/api` | `server/routes/complianceEmailRoutes.js` | `POST /unsubscribe` |
| `/api` | `server/routes/paymentsRoutes.js` | `GET /payments/verify` |
| `/health`, `/readiness` | `server/app.js` | sondes ; `/` JSON seulement s’il n’y a pas de `dist/` |

Contrôleurs : `server/controllers/`. Services : `server/services/` (`stripeService.js`, `printfulService.js`, `orderService.js`, `orderSyncService.js`, `emailService.js`, `authService.js`, `unsubscribeToken.js`). Modèles : `server/models/`.

Auth : JWT en cookies httpOnly. Secrets lus par le code : `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (`server/controllers/authController.js`). `server/services/authService.js` accepte aussi les noms `JWT_SECRET` / `ACCESS_TOKEN_SECRET` et `REFRESH_TOKEN_SECRET`. Les valeurs ne sont pas dans ce document.

Basic Auth de site, optionnelle : activée seulement si `SITE_BASIC_AUTH_ENABLED=true`. `/health`, `/readiness` et `/webhook*` restent exempts. Détail : `docs/engineering/HOSTING_CONSTRAINTS.md`.

Jobs (`server/jobs/index.js`) :

- sync statuts Printful (`printfulSync.js`) — toujours planifiée au démarrage ;
- purge des logs (`purgeLogs.js`) — toujours planifiée ;
- relance panier abandonné (`abandonedCartJob.js`) — seulement si `ENABLE_ABANDON_CRON=true`.

Scripts hors serveur HTTP : `server/importPrintful.js` (`npm run printful:import`), `server/syncVariants.js`.

---

## 6. Base de données

MySQL. Schéma métier : `docs/engineering/DATA_MODEL.md`. Contraintes Hostinger (erreur 1044, ALTER au cas par cas, runner qui ne crée pas `schema_migrations`) : `docs/engineering/HOSTING_CONSTRAINTS.md`.

Tables documentées dans DATA_MODEL : `customers`, `addresses`, `refresh_tokens`, `user_sessions`, `unsubscribes`, `consents`, `email_events`, `products`, `product_variants`, `product_images`, `product_promotions`, `reviews`, `carts`, `abandoned_carts`, `orders`, `order_items`, `order_status_history`, `checkout_idempotency`, `shipping_logs`, `stripe_events`, `schema_migrations`, `cron_logs`, `logs`. `wishlists` y est marquée retirée.

Migrations versionnées présentes :

- `db/migrations/2025-10-18_stripe_events.sql`
- `db/migrations/2026-08-15_checkout_idempotency.sql`
- `db/migrations/2026-09-03_order_items_order_fk_restrict.sql`
- `db/migrations/2026-09-04_order_items_variant_fk_deduplicate.sql`
- `db/migrations/2026-09-04_order_status_history_fk_deduplicate.sql`
- `db/migrations/2026-09-04_orders_stripe_identifiers_unique.sql`
- `db/migrations/2026-09-04_drop_legacy_wishlists.sql`
- `db/migrations/2026-09-04_drop_stripe_events_p13c_backup.sql`
- `db/migrations/2026-09-04_logs_schema_managed.sql`

`npm run migrate` n’est pas une étape de démarrage. HOSTING_CONSTRAINTS indique de ne pas l’exécuter contre la production sans backup, inspection du SQL et autorisation.

Invariants d’argent : `docs/engineering/CHECKOUT_INVARIANTS.md`. Trois IDs de variante ne sont pas interchangeables : `product_variants.id` (PK), `product_variants.variant_id` (ID métier / front), `product_variants.printful_variant_id` (ID Printful). Cette distinction est répétée dans l’inventaire et dans DATA_MODEL.

---

## 7. Intégrations externes présentes dans le code

| Service | Présence | Fichiers principaux | Ce que le code en fait |
|---|---|---|---|
| Stripe | Oui | `server/services/stripeService.js`, `server/controllers/checkoutController.js`, `server/controllers/webhookController.js` | Session Checkout, webhook signé, vérification de paiement |
| Printful | Oui | `server/services/printfulService.js`, `server/importPrintful.js`, `server/controllers/shippingController.js`, `server/controllers/inventoryController.js`, `server/jobs/printfulSync.js` | Import, stock, tarifs d’expédition, sync de statuts, fulfillment |
| MySQL / Hostinger | Oui | `server/dbConfig.js`, `docs/engineering/HOSTING_CONSTRAINTS.md` | Base de production. Le code accepte `DB_*` et les alias `MYSQL_*` |
| SMTP | Oui | `server/services/emailService.js` | Envoi si `SMTP_HOST` est défini |
| GitHub | Oui | remote `origin` | Hébergement Git, distinct de l’hébergement applicatif |

Noms de variables lues par le code (aucune valeur) : `STRIPE_SECRET_KEY` ou `STRIPE_SK`, `STRIPE_WEBHOOK_SECRET`, `PRINTFUL_API_KEY`, `PRINTFUL_STORE_ID`, `FRONTEND_URL`, `BACKEND_URL`, `CURRENCY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `UNSUB_HMAC_SECRET`, `SITE_BASIC_AUTH_ENABLED`, `SITE_BASIC_AUTH_USERNAME`, `SITE_BASIC_AUTH_PASSWORD`, `PORT`, `HOST`, `NODE_ENV`, `TRUST_PROXY`, `TRUST_PROXY_HOPS`, `ENABLE_ABANDON_CRON`, `LOG_RETENTION_DAYS`, `CRON_PURGE_SCHEDULE`, `CRON_STATUS_SCHEDULE`, `RELANCE_INTERVAL_MIN`, `PROMO_LABEL`, `PROMO_CODE`, `PROMO_EXPIRY`.

Mots de passe base : `DB_PASSWORD`, `DB_PASSWORD_ASCII`, `DB_PASSWORD_B64`, `DB_PASSWORD_OVERRIDE`, `MYSQL_PASSWORD`, `MYSQLPASSWORD`. Hôte, utilisateur et nom : `DB_HOST` / `MYSQL_HOST` / `MYSQLHOST`, `DB_USER` / `MYSQL_USER` / `MYSQLUSER`, `DB_NAME` / `MYSQL_DATABASE` / `MYSQLDATABASE`, plus `DB_PORT`, `DB_SSL`, `DB_CONNECT_TIMEOUT_MS`.

Origines CORS codées en dur dans `server/app.js`, en plus de `FRONTEND_URL` : `http://localhost:3000`, `http://localhost:5173`, `https://flippinmaple.com`, `https://www.flippinmaple.com`. HOSTING_CONSTRAINTS fixe `FRONTEND_URL=https://flippinmaple.com` en production, sans liste locale dans cette variable.

---

## 8. Fonctionnalités et état documenté

Présentes dans le code, sans essai d’exécution lors de cet audit :

- catalogue public, fiche produit, produits vedettes ;
- panier client (`CartContext`) ;
- checkout et retour Stripe ;
- compte : inscription, connexion, rafraîchissement de jeton, tableau de bord, déconnexion ;
- désabonnement courriel ;
- administration partielle (produits vedettes, commandes, sonde « payées sans items ») ;
- journalisation et cron ;
- import / sync Printful.

État produit déjà écrit, non réinventé ici :

- programmes sécurité P3–P24 fermés, aucun P25 ouvert (`README.md` §2.2, journal `docs/compliance/TECHNICAL_SECURITY_REMEDIATION_LOG.md`) ;
- passe storefront de session close à `b80e408` ; ce n’est pas les règles R1–R10 de la Constitution ;
- PASS 1 Header / Home / Footer implémentée selon le README §2.3 ; Shop et Product Detail restent aux passes suivantes ; checkout, auth, APIs, Printful et Stripe sont hors de ce chantier ;
- Phase 1 — Fondation de marque : critères de sortie non déclarés atteints (`docs/00_PROJECT_MASTER.md` §10, README §2.1).

---

## 9. Commandes existantes

Racine (`package.json`) :

| Script | Commande | Effet |
|---|---|---|
| `dev` | `vite` | Frontend, port 3000 |
| `build` | `vite build` | Produit `dist/` |
| `preview` | `vite preview` | Prévisualisation du build |
| `start` | `node server.js` | Démarre le backend via l’amorce racine |
| `lint` | `eslint .` | ESLint, config `eslint.config.js` |
| `migrate` | `node scripts/run-migrations.js` | Migrations MySQL, opération explicite |
| `printful:import` | `node server/importPrintful.js` | Import Printful |

`server/package.json` : `dev` = `node --watch server.js`, `start` = `node server.js`, `jobs` = `node jobs/index.js`, `build` = message « No build required ».

Aucun script `test` n’existe. Aucun fichier de test n’a été trouvé dans le dépôt.

---

## 10. Décisions architecturales justifiées par les fichiers

| Décision | Où c’est écrit |
|---|---|
| La marque prime ; Printful est un moyen de production | `docs/00_PROJECT_MASTER.md` D02, D03, R1, R2 |
| Monolithe modulaire, pas de microservices, pas de refactor sans mandat | `docs/engineering/ARCHITECTURE.md` §3 et §9 ; journal C05 (2026-08-16) |
| Stripe et Printful sont les providers de l’instance actuelle, pas le cœur conceptuel visé | ARCHITECTURE §4–§6. L’interchangeabilité par configuration n’existe pas encore |
| Snapshots de commande immuables ; `paid_at` vient du webhook | `docs/engineering/CHECKOUT_INVARIANTS.md`, HOSTING_CONSTRAINTS |
| ALTER Hostinger au cas par cas ; ne pas lancer `npm run migrate` automatiquement | HOSTING_CONSTRAINTS |
| Auth cookies httpOnly | `NOTES.md` (2025-10-21) et `server/controllers/authController.js`. L’inventaire SEC-004 décrit encore un dualisme localStorage ; ce point n’a pas été revalidé ligne à ligne ici |
| Documents prévus et absents | Constitution §11.2 : `docs/product/CATALOG_RULES.md`, `docs/engineering/INVARIANTS.md`, `docs/engineering/SECURITY.md`, `docs/ops/RUNBOOKS.md`, `docs/backlog/TECH_DEBT.md` |
