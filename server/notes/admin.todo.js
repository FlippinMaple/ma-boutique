// admin.todo.js
// ==============================================================================
// 🗂️ Fichier unique combiné : TODO Admin + Observations + État d’implantation
// Dernière màj : 2025-08-20
// Contexte : backend refactorisé (MVC), sécurisation wishlist par JWT, correctif checkout,
//            retrait du routeur productDetails fantôme, logs & error handler en place.
// ==============================================================================

// ==============================================================================
// 🧩 ROUTES ADMIN À IMPLÉMENTER
// ------------------------------------------------------------------------------
// 🔐 Middlewares recommandés :
//   - verifyToken()  → authentification JWT (DEJA EN PLACE)
//   - verifyAdmin()  → autorisation admin (EXISTE, À BRANCHER)
// ÉTAT : verifyAdmin.js est présent mais pas encore appliqué aux routes admin.
//        Ajouter colonne `role` dans la table `customers` (default: 'user') si absent.
//        Puis appliquer : verifyToken, verifyAdmin sur toutes les routes /admin/*
// ==============================================================================

// 🧾 Commandes
// ----------------------------------------
/**
 * GET    /admin/orders              - Liste des commandes
 * GET    /admin/orders/:id         - Détail d'une commande
 * GET    /admin/orders/:id/items   - Items d'une commande
 * PATCH  /admin/orders/:id/status  - Modifier le statut de commande
 * DELETE /admin/orders/:id         - Supprimer une commande (rarement utile)
 *
 * OBSERVATIONS :
 *  - La logique Stripe/checkout est en place (webhook, création/maj d’orders) mais
 *    il manque un module d’ADMIN (orderAdminController + orderService + orderModel).
 *  - Prévoir filtres (status, date, email client), pagination, tri.
 *  - Journaliser les changements de statut (table order_status_history si présente).
 */

// 👕 Produits
// ----------------------------------------
/**
 * GET    /admin/products           - Liste des produits
 * GET    /admin/products/:id      - Détail d’un produit (avec variantes même invisibles)
 * POST   /admin/products          - Ajouter un nouveau produit
 * PATCH  /admin/products/:id      - Modifier un produit
 * DELETE /admin/products/:id      - Supprimer un produit
 *
 * OBSERVATIONS :
 *  - Le productsController public sert la boutique (produits visibles).
 *  - Créer un productsAdminController séparé pour éviter la confusion public/admin
 *    (inclure produits non visibles, brouillons, champs internes).
 *  - Ajouter validations (prix ≥ 0, nom requis, images/variantes cohérentes).
 */

// 🧵 Variantes
// ----------------------------------------
/**
 * GET    /admin/variants                      - Liste de toutes les variantes
 * GET    /admin/products/:id/variants         - Variantes pour un produit
 * PATCH  /admin/variants/:id                  - Modifier une variante
 * POST   /admin/variants/import               - Importer depuis Printful
 *
 * OBSERVATIONS :
 *  - La sync Printful existe (syncVariants.js + importPrintful.js).
 *  - Encapsuler en service (printfulService est déjà présent) et exposer un contrôleur admin
 *    pour lancer un import, voir les anomalies (variants sans image/size/price).
 */

// 🛍️ Promotions
// ----------------------------------------
/**
 * GET    /admin/discount-codes      - Liste des codes promo
 * POST   /admin/discount-codes      - Créer un code promo
 * DELETE /admin/discount-codes/:id  - Supprimer un code promo
 *
 * OBSERVATIONS :
 *  - À implémenter (model/service/controller + validations : unicité, date de validité,
 *    type de remise %/montant, champ is_active plutôt que suppression dure).
 */

// 👤 Clients
// ----------------------------------------
/**
 * GET    /admin/customers             - Liste des clients
 * GET    /admin/customers/:id         - Détails d’un client
 * GET    /admin/customers/:id/orders  - Commandes d’un client
 *
 * OBSERVATIONS :
 *  - Auth en place (inscription/connexion/refresh). Manque vue admin lecture seule
 *    avec pagination/filtre (email, date création) et lien vers commandes du client.
 */

// ⚙️ Autres outils utiles
// ----------------------------------------
/**
 * GET    /admin/logs/cron                    - Logs des tâches planifiées
 * GET    /admin/errors/api                   - Logs erreurs API
 * GET    /admin/abandoned-carts              - Voir les paniers abandonnés
 * POST   /admin/resend-confirmation/:orderId - Réenvoyer la confirmation
 *
 * OBSERVATIONS :
 *  - Abandoned carts : logique amorcée côté front (log-abandoned-cart).
 *    Créer une table si besoin + une vue admin pour relances (export CSV).
 *  - Les utils logger existent : exposer une liste paginée & filtrable côté admin.
 */

// 🔧 Tâches techniques (non publiques)
///---------------------------------------
/**
 * POST /admin/force-sync     - Forcer la sync Printful → DB
 * POST /admin/clear-cache    - Vider le cache local (si utilisé)
 *
 * OBSERVATIONS :
 *  - Forcer la sync en appelant un service dédié (pas directement un script).
 *  - Protéger strictement par verifyToken + verifyAdmin.
 */

// ==============================================================================
// 🔐 AUTHENTIFICATION JWT — ÉTAT & ACTIONS
// ------------------------------------------------------------------------------
// Objectif : Protéger les routes sensibles et gérer le cycle complet d'authentification
// ÉTAT ACTUEL (2025-08-20) :
//   ✅ Middleware verifyToken en place (middlewares/authMiddleware.js).
//   ✅ Appliqué sur /api/create-checkout-session.
//   ✅ Wishlist sécurisée (routes + contrôleur comparent req.user.id).
//   ✅ Endpoint /api/auth/refresh-token présent.
//   ⬜ Rotation des refresh tokens + nettoyage périodique.
//   ⬜ Application systématique sur toutes les routes sensibles (/api/orders, /api/user/profile, /admin/*).
// ==============================================================================

/* 1. Middleware de vérification de l'accessToken */
// - [FAIT] Fichier `middlewares/authMiddleware.js`
// - [FAIT] Fonction `verifyToken(req, res, next)`
//       → Vérifie le header Authorization: Bearer <token>
//       → jwt.verify avec `process.env.JWT_SECRET`
//       → Si valide : req.user = payload, next()
//       → Sinon : return 401 Unauthorized

/* 2. Appliquer le middleware aux routes sensibles */
// - [EN COURS] Routes protégées :
//       → `/api/wishlist` ✅ (et contrôleur vérifie l’identité)
//       → `/api/create-checkout-session` ✅
//       → `/admin/*` ⬜ (à faire systématiquement)
//       → `/api/orders` (lecture des commandes personnelles) ⬜
//       → `/api/user/profile` (si applicable) ⬜

/* 3. Rafraîchissement automatique de l'accessToken */
// - [TODO Front] : Intercepter 401 → appeler `/api/auth/refresh-token` avec refreshToken
//                  → stocker le nouveau accessToken → relancer la requête échouée
// - [TODO Back]  : À chaque refresh, générer un nouveau refreshToken et invalider l’ancien

/* 4. Sécurité avancée (recommandé) */
// - [DB] Ajouter `created_at` dans `refresh_tokens` (si absent)
// - [Rotation] Nouveau refreshToken à chaque refresh, suppression de l’ancien
// - [Cron] Nettoyer les tokens expirés (node-cron déjà utilisé dans le projet)

/* 5. Tests à faire (Postman) */
// - [ ] Accès route privée sans token → 401
// - [ ] Accès avec token expiré → 401 → refresh → nouveau token → succès
// - [ ] Logout : suppression du refreshToken → refresh impossible (403/401 attendu)

// ==============================================================================
// 🧯 MIDDLEWARE GLOBAL DE GESTION DES ERREURS — ✅ FAIT
// ------------------------------------------------------------------------------
// Objectif : Centraliser le traitement des erreurs serveur et les logs associés.
//
/* 1. Création */
// ✅ Fichier : `middlewares/errorHandler.js`
// ✅ Fonction `errorHandler(err, req, res, next)`
// ✅ Utilise `logError()` (source 'global') et retourne 500 + message générique

/* 2. Intégration dans le serveur */
// ✅ `app.use(errorHandler)` ajouté dans `server.js` (tout en bas)

/* 3. Tests */
// ✅ Erreur volontaire capturée (OK)

/* 4. Bonus */
// ⬜ Ajouter en PROD un alerting (email/webhook)
// ⬜ Afficher stack trace uniquement en dev

// ==============================================================================
// 👑 MIDDLEWARE D’ADMINISTRATION — ⚠️ À BRANCHER
// ------------------------------------------------------------------------------
// Objectif : Restreindre les routes /admin/* aux comptes admin.
//
/* 1. Création */
// ✅ Fichier : `middlewares/verifyAdmin.js`
// ✅ `verifyAdmin(req, res, next)` : refuse si `req.user.role !== 'admin'`

/* 2. Utilisation */
// ⬜ Exemple : `router.get('/admin/orders', verifyToken, verifyAdmin, getAllOrders)`
// ⬜ Propager verifyAdmin sur toutes les routes admin

/* 3. (Facultatif) Étendre la table `customers` */
// ⬜ Ajouter colonne `role` ENUM('user','admin') DEFAULT 'user'
// ⬜ Alimenter le payload JWT avec `role`

// ==============================================================================
// 📦 STRUCTURE MVC / CLEANUP — ÉTAT
// ------------------------------------------------------------------------------
// Objectif : Controllers fins, services pour la logique métier, models pour SQL.
//
/* État au 2025-08-20 */
// ✅ checkout refactorisé (controller + services : stripeService/printfulService + orderModel)
// ✅ wishlist refactorisée (controller + service + model) + sécurisée JWT/identité
// ✅ productsController public : liste + détail (GET /api/products, GET /api/products/:id)
// ⚠️ `server.js` importait `productDetailsRoutes.js` (fantôme) → À SUPPRIMER (corrigé dans nos notes)
// ⬜ Créer modules ADMIN séparés : ordersAdminController, productsAdminController, variantsAdminController
// ⬜ Nettoyer fichiers obsolètes (ex : anciens *Model/*Service hérités de l’ancienne archi)
// ⬜ Centraliser logs (remplacer console.* par logInfo/logWarn/logError)

// ==============================================================================
// 🔍 POINTS DE CONTRÔLE GÉNÉRAUX À SURVEILLER
// ------------------------------------------------------------------------------
// - ✅ Cohérence des champs : `variant_id` (ID court Printful), `printful_variant_id` (ID interne 10 digits)
// - ⬜ Import Printful : garantir image/size/price sur chaque variante ; reporter anomalies en admin
// - ⬜ Panneau admin : tableau des erreurs d’import (produits sans variantes visibles, images manquantes)
// - ⬜ Promotions : utiliser `is_active` plutôt que DELETE dur, garder historique
// - ⬜ Logs d’actions admin (modif produit, suppression, statut commande…)
// - ⬜ Logs de synchronisation Printful & erreurs API (vue admin filtrable)

// ==============================================================================
// 🧭 PRIORISATION SUGGÉRÉE (ADMIN)
// ------------------------------------------------------------------------------
// 1) DB : ajouter `role` à `customers` (+ alimentation du payload JWT)
// 2) Appliquer verifyToken+verifyAdmin sur un premier module : /admin/orders (lecture seule)
// 3) Créer orderAdminController + orderService (+ pagination/filtre/tri)
// 4) Créer productsAdminController (liste complète + show complet) sans casser le public
// 5) Encapsuler syncVariants dans un service et exposer /admin/variants/import
// 6) Ajouter panneau admin des anomalies d’import (qualité de données)
//
// (Chaque étape est autonome et safe, pas de régression côté front public)

// ==============================================================================
// 🧪 SNIPPETS D’EXEMPLE (À COLLER LORS DE L’IMPLÉMENTATION)
// ------------------------------------------------------------------------------

// Exemple de route admin protégée (orders)
/// routes/adminOrdersRoutes.js
/*
import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { verifyAdmin } from '../middlewares/verifyAdmin.js';
import { listOrders, getOrder, getOrderItems, updateOrderStatus, deleteOrder } from '../controllers/admin/ordersAdminController.js';

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.get('/orders', listOrders);
router.get('/orders/:id', getOrder);
router.get('/orders/:id/items', getOrderItems);
router.patch('/orders/:id/status', updateOrderStatus);
router.delete('/orders/:id', deleteOrder);

export default router;
*/

// Exemple d’application dans server.js
/*
import adminOrdersRoutes from './routes/adminOrdersRoutes.js';
app.use('/admin', adminOrdersRoutes);
*/

// ==============================================================================
// 🧾 HISTORIQUE DES OBSERVATIONS (2025-08-20)
// ------------------------------------------------------------------------------
// - Audit backend MVC : OK globalement. Correctifs proposés/appliqués :
//   • Checkout : remplacer verifyAccessToken (inexistant) → verifyToken (middlewares/authMiddleware.js)
//   • Wishlist : routes protégées + contrôleur compare req.user.id et customerId
//   • Suppression de l’import/routeur fantôme productDetailsRoutes.js (doublon avec /api/products/:id)
// - Notes ajoutées dans NOTES.md (voir commandes du 2025-08-20).
// ==============================================================================
