// admin.todo.js
// ==============================================================================
// 🗂️ Fichier unique combiné : TODO Admin + Observations + État d’implantation
// Dernière màj : 2025-09-22
// Contexte : backend refactorisé (MVC), logger centralisé, error handler global,
//            webhook Stripe en “strict mode”, routes réorganisées, cron externalisé.
// ==============================================================================

// ==============================================================================
// 🆕 CHANGEMENTS RÉCENTS (2025-09-22)
// ------------------------------------------------------------------------------
// ✅ Séparation bootstrap/app : server/app.js (Express) + server/server.js (listen)
// ✅ Webhook Stripe isolé avec raw body (routes/webhookRoutes.js)
// ✅ Webhook “strict” : réutilise UNIQUEMENT metadata (cart_items, shipping, order_id)
// ✅ Checkout : on crée la commande + items AVANT la session Stripe, puis on passe
//    client_reference_id + metadata (cart_items + shipping + order_id) au checkout.
// ✅ Routes réorganisées :
//    - /api/inventory/printful-stock/:variantId        (ex- /api/printful-stock/:id)
//    - /api/shipping/rates
//    - /api/admin/debug-orders
//    - /health
// ✅ Cron externalisé : jobs/index.js (schedulePrintfulSync + purgeLogs)
// ✅ Logger centralisé : utils/logger.js (logInfo/logWarn/logError) — remplace console.*
// ✅ Error handler global : middlewares/errorHandler.js (utilise logError + JSON propre)
// ✅ Shipping rates : le controller accepte maintenant printful_variant_id (long) OU
//    variant_id (court). Mapping interne via product_variants.
// ✅ Contrats front harmonisés : chaque item transporte BOTH ids
//    { id, variant_id (court), printful_variant_id (long), ... } ; shipping_rate = {name, rate}
// ==============================================================================

// ==============================================================================
// 🧩 ROUTES ADMIN À IMPLÉMENTER
// ------------------------------------------------------------------------------
// 🔐 Middlewares recommandés :
//   - authProtect()  → authentification JWT (EN PLACE, middlewares/authProtect.js)
//   - verifyAdmin()  → autorisation admin (À CRÉER si absent)
// ÉTAT : routes/adminRoutes.js est branché sur /api/admin (contient /debug-orders).
//        Étendre avec de vrais modules admin (orders/products/variants/logs).
//        DB : ajouter colonne `role` dans `customers` si absent.
//        JWT : inclure `role` dans le payload au login.
// ==============================================================================

// 🧾 Commandes (ADMIN)
// ----------------------------------------
/**
 * GET    /api/admin/orders              - Liste des commandes (filters: status, date, email)
 * GET    /api/admin/orders/:id         - Détails d'une commande
 * GET    /api/admin/orders/:id/items   - Items d'une commande
 * PATCH  /api/admin/orders/:id/status  - Modifier le statut
 * DELETE /api/admin/orders/:id         - (rare) supprimer
 *
 * OBSERVATIONS :
 *  - La logique Stripe/checkout+webhook est robuste. Reste l’interface d’admin.
 *  - Créer: controllers/admin/ordersAdminController.js + services/admin/ordersAdminService.js
 *  - Journaliser les changements de statut (table order_status_history déjà utilisée).
 */

// 👕 Produits (ADMIN)
// ----------------------------------------
/**
 * GET    /api/admin/products
 * GET    /api/admin/products/:id           (avec variantes, même brouillons/invisibles)
 * POST   /api/admin/products
 * PATCH  /api/admin/products/:id
 * DELETE /api/admin/products/:id
 *
 * OBSERVATIONS :
 *  - Garder productsController public pour la boutique (visibles).
 *  - Créer un productsAdminController distinct (champ is_visible, brouillons, etc.).
 *  - Validations: nom requis, prix ≥ 0, cohérence variantes (size/color/price/image).
 */

// 🧵 Variantes (ADMIN)
// ----------------------------------------
/**
 * GET    /api/admin/variants
 * GET    /api/admin/products/:id/variants
 * PATCH  /api/admin/variants/:id
 * POST   /api/admin/variants/import        (déclenche une sync Printful → DB)
 *
 * OBSERVATIONS :
 *  - La sync existe (syncVariants.js/importPrintful.js) + services/printfulService.js.
 *  - Exposer via un controller admin pour lancer un import et afficher les anomalies
 *    (variantes sans image/size/price, etc.).
 */

// 🛍️ Promotions (ADMIN)
// ----------------------------------------
/**
 * GET    /api/admin/discount-codes
 * POST   /api/admin/discount-codes
 * DELETE /api/admin/discount-codes/:id
 *
 * OBSERVATIONS :
 *  - À implémenter (model/service/controller)
 *  - Validations : unicité code, date de validité, type (% / montant), `is_active` au lieu de delete dur.
 */

// 👤 Clients (ADMIN)
// ----------------------------------------
/**
 * GET    /api/admin/customers
 * GET    /api/admin/customers/:id
 * GET    /api/admin/customers/:id/orders
 *
 * OBSERVATIONS :
 *  - Auth en place. Manque vues admin lecture seule (pagination + filtre email/date).
 *  - Lien de navigation vers commandes du client.
 */

// ⚙️ Outils & maintenance (ADMIN)
// ----------------------------------------
/**
 * GET    /api/admin/logs/cron
 * GET    /api/admin/errors/api
 * GET    /api/admin/abandoned-carts
 * POST   /api/admin/resend-confirmation/:orderId
 *
 * OBSERVATIONS :
 *  - Abandoned carts : trace front amorcée (/api/log-abandoned-cart à ajouter côté back).
 *  - Exposer logs via utils/logger.js (paginé/filtré) + export CSV.
 */

// 🔧 Tâches techniques (ADMIN strict)
// ----------------------------------------
/**
 * POST /api/admin/force-sync     - Forcer la sync Printful → DB
 * POST /api/admin/clear-cache    - Vider un cache local (si introduit)
 *
 * OBSERVATIONS :
 *  - Appeler des services dédiés (pas des scripts ad hoc).
 *  - Protéger par authProtect + verifyAdmin.
 */
// ==============================================================================

// ==============================================================================
// 🔐 AUTHENTIFICATION JWT — ÉTAT & ACTIONS
// ------------------------------------------------------------------------------
// Objectif : Protéger les routes sensibles et gérer le cycle complet d'auth.
// ÉTAT ACTUEL (2025-09-22) :
//   ✅ Middleware authProtect en place (middlewares/authProtect.js)
//   ✅ Appliqué sur /api/create-checkout-session
//   ✅ Wishlist sécurisée (routes + contrôleur comparent req.user.id)
//   ✅ Endpoint /api/auth/refresh-token présent
//   ⬜ Rotation des refresh tokens + invalidation de l’ancien à chaque refresh
//   ⬜ Application systématique sur /api/admin/*, /api/orders (compte), /api/user/profile
// ------------------------------------------------------------------------------

/* 1) Middleware de vérification du JWT */
// - Fichier : middlewares/authProtect.js
// - Comportement : lit Authorization: Bearer <token>, jwt.verify avec JWT_SECRET,
//   alimente req.user, sinon 401.

/* 2) Appliquer authProtect aux routes sensibles */
// - À FAIRE : /api/admin/* (avec verifyAdmin), /api/orders, /api/user/profile

/* 3) Rafraîchissement accessToken */
// - Front : intercepter 401 → POST /api/auth/refresh-token → stocker nouveau token → rejouer la req
// - Back  : émettre un nouveau refreshToken à chaque refresh + invalider l’ancien

/* 4) Sécurité avancée */
// - DB : table refresh_tokens (si utilisée) avec created_at / expires_at
// - Cron : purge des tokens expirés (jobs/purgeLogs.js montre l’exemple d’un cron)
// ==============================================================================

// ==============================================================================
// 🧯 MIDDLEWARE GLOBAL D’ERREURS — ✅ EN PLACE
// ------------------------------------------------------------------------------
// Fichier : middlewares/errorHandler.js
// - Utilise logError(source='global') et renvoie JSON propre (status 500 par défaut).
// - En dev, on peut inclure stack; en prod, masquer la stack.
// - Penser à next(err) dans les controllers pour centraliser ici.
// ==============================================================================

// ==============================================================================
// 👑 MIDDLEWARE D’ADMINISTRATION — ⚠️ À BRANCHER
// ------------------------------------------------------------------------------
// Objectif : limiter /api/admin/* aux comptes admin.
//
// 1) verifyAdmin.js (à créer si absent)
//    export const verifyAdmin = (req,res,next) => req.user?.role === 'admin' ? next() : res.status(403).json({message:'Forbidden'});
//
// 2) DB : ajouter `role` à `customers` + inclure `role` dans le JWT au login
//    SQL exemple :
//      ALTER TABLE customers ADD COLUMN role ENUM('user','admin') NOT NULL DEFAULT 'user';
// ==============================================================================

// ==============================================================================
// 📦 STRUCTURE MVC / CLEANUP — ÉTAT
// ------------------------------------------------------------------------------
// Objectif : Controllers fins, services pour la logique métier, models pour SQL.
// ÉTAT (2025-09-22) :
// ✅ app.js : déclare toutes les routes + errorHandler + startCronJobs()
// ✅ server.js : bootstrap (listen) + logInfo de démarrage
// ✅ routes/* : webhookRoutes, inventoryRoutes, shippingRoutes, adminRoutes, etc.
// ✅ controllers/* : inventoryController, shippingController, adminController (debug), webhookController, ...
// ✅ services/* : printfulService, orderService, orderSyncService, stripeService
// ✅ jobs/* : printfulSync.js, purgeLogs.js, index.js (agrège les crons)
// ✅ utils/logger.js : remplace console.*, stockage DB + console en dev
// ⚠️ À faire : modules ADMIN dédiés (orders/products/variants/logs) + verifyAdmin partout
// 🗑️ À surveiller : supprimer anciens fichiers obsolètes au fil des ajouts
// ==============================================================================

// ==============================================================================
// 🔍 POINTS DE CONTRÔLE & CONTRATS (BACK/FONT)
// ------------------------------------------------------------------------------
// ✅ Identifiants de variante :
//    - variant_id  = ID COURT (Printful “catalog variant id” / notre champ variant_id)
//    - printful_variant_id = ID LONG (10 chiffres, “sync variant id” côté Printful)
//    - Les items (front → back) transportent les deux lorsqu’ils sont connus.
// ✅ Shipping rates (/api/shipping/rates) : accepte items avec EITHER
//    {variant_id} OU {printful_variant_id}; le serveur traduit au besoin.
// ✅ Endpoints front (changelog) :
//    - /api/printful-stock/:id           →  /api/inventory/printful-stock/:variantId
//    - /api/shippingRates                →  /api/shipping/rates
//    - /api/admin/debug-orders           (ajouté)
//    - /health                           (ajouté)
// ✅ Checkout payload :
//    items: [{ id, variant_id, printful_variant_id, name, price, image, quantity, color, size }]
//    shipping_rate: { name, rate } uniquement
//    (le serveur reconstruit metadata pour le webhook)
// ==============================================================================

// ==============================================================================
// ➕ AJOUTS QUALITÉ DE VIE (À FAIRE / À VÉRIFIER)
// ------------------------------------------------------------------------------

// 1) Paniers abandonnés (endpoint + table)
// ----------------------------------------
// - Route: POST /api/log-abandoned-cart
//   Payload minimal: { customer_email, cart_contents (JSON string), user_agent?, referer? }
// - Table SQL (exemple):
//   CREATE TABLE IF NOT EXISTS abandoned_carts (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     email VARCHAR(255) NOT NULL,
//     cart_json JSON NOT NULL,
//     user_agent VARCHAR(512) NULL,
//     referer VARCHAR(512) NULL,
//     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
//   ) ENGINE=InnoDB;
// - Admin: GET /api/admin/abandoned-carts (paginé + filtre email/date) + export CSV.

// 2) Index DB recommandés (perf & intégrité)
// ------------------------------------------
// - orders                : INDEX (status), INDEX (customer_email), INDEX (created_at)
// - order_items           : INDEX (order_id), INDEX (printful_variant_id), INDEX (variant_id)
// - product_variants      : UNIQUE (variant_id), UNIQUE (printful_variant_id)
// - stripe_events         : PRIMARY KEY(id) (déjà OK)
// - logs (si table)       : INDEX (level), INDEX (created_at)
// - abandoned_carts       : INDEX (email), INDEX (created_at)

// 3) Stabilité API externes (rate-limit / timeouts / retry)
// ---------------------------------------------------------
// - Ajouter un rate-limit sur /api/shipping/rates et /api/inventory/* (ex: 20 req/min/IP).
// - Config Axios par défaut: timeout ~10s, retry/backoff léger (429/5xx).
// - Circuit breaker (optionnel) si Printful répond en erreur persistante.

// 4) Hardening & production
// -------------------------
// - app.use(helmet()) et app.use(compression()) dans app.js.
// - CORS strict en prod (origin = FRONTEND_URL) au lieu de "*".
// - Endpoint /readiness qui ping la DB (SELECT 1) en plus de /health.
// - Désactiver stack trace dans les réponses en prod (errorHandler).

// 5) Observabilité (corrélation & niveaux de logs)
// ------------------------------------------------
// - Générer un requestId (header x-request-id) par requête → inclure dans logInfo/logError.
// - Piloter le niveau de log via variable d’env LOG_LEVEL (debug/info/warn/error).
// - Journaux d’accès (morgan) en dev uniquement (optionnel).

// 6) .env.example (tenir à jour dans le repo)
// -------------------------------------------
// PORT=4242
// FRONTEND_URL=http://localhost:3000
//
// # Stripe
// STRIPE_SECRET_KEY=sk_test_xxx
// STRIPE_WEBHOOK_SECRET=whsec_xxx
//
// # Printful
// PRINTFUL_API_KEY=pf_xxx
// PRINTFUL_STORE_ID=1234567
// PRINTFUL_AUTOMATIC_ORDER=false
//
// # DB
// DB_HOST=localhost
// DB_USER=root
// DB_PASSWORD=yourpass
// DB_NAME=shop
//
// # Cron (exemples)
// CRON_STATUS_SCHEDULE=0 2 * * *
// CRON_PURGE_LOG_SCHEDULE=0 0 * * *
// LOG_RETENTION_DAYS=7
//
// NODE_ENV=development
// LOG_LEVEL=info
// ==============================================================================

// ==============================================================================
// 🧭 PRIORISATION (ADMIN) — PROPOSÉE
// ------------------------------------------------------------------------------
// 1) DB : ajouter `role` à `customers` + inclure `role` dans le JWT
// 2) Middlewares : authProtect + verifyAdmin sur TOUT /api/admin/*
// 3) /api/admin/orders : lecture seule (pagination, filtres, tri) — contrôleur + service
// 4) /api/admin/products : CRUD complet côté admin (séparé du public)
// 5) /api/admin/variants/import : encapsuler la sync dans un service dédié
// 6) Panneau “anomalies d’import” & “logs” (qualité de données / suivi des erreurs)
// 7) Paniers abandonnés : endpoint + vue admin
// 8) Rate-limit/timeout + helmet/compression + readiness
// ==============================================================================

// ==============================================================================
// 🧪 SNIPPETS D’EXEMPLE (À COLLER LORS DE L’IMPLÉMENTATION)
// ------------------------------------------------------------------------------

// Exemple de route admin protégée (orders)
// routes/adminOrdersRoutes.js
/*
import express from 'express';
import { authProtect } from '../middlewares/authProtect.js';
import { verifyAdmin } from '../middlewares/verifyAdmin.js';
import {
  listOrders, getOrder, getOrderItems, updateOrderStatus, deleteOrder
} from '../controllers/admin/ordersAdminController.js';

const router = express.Router();
router.use(authProtect, verifyAdmin);

router.get('/orders', listOrders);
router.get('/orders/:id', getOrder);
router.get('/orders/:id/items', getOrderItems);
router.patch('/orders/:id/status', updateOrderStatus);
router.delete('/orders/:id', deleteOrder);

export default router;
*/

// Exemple d’application dans app.js
/*
import adminOrdersRoutes from './routes/adminOrdersRoutes.js';
app.use('/api/admin', adminOrdersRoutes);
*/
// ==============================================================================

// ==============================================================================
// 🧾 HISTORIQUE DES OBSERVATIONS (2025-09-22)
// ------------------------------------------------------------------------------
// - Migration app/server + routes dédiées : OK
// - Webhook Stripe “strict metadata” : OK (idempotence + order_items propres)
// - Shipping rates : accepte long/court ID, mapping DB avant appel Printful : OK
// - Logger central + error handler : OK
// - Cron (sync statuts Printful + purge logs) externalisés : OK
// - Front : endpoints corrigés + contrats items/shipping_rate alignés
// - Ajouts à venir trackés : abandoned carts, index DB, rate-limit/timeout, hardening, observabilité.
// ==============================================================================
