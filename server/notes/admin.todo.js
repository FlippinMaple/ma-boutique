// admin.todo.js

// 🧩 ROUTES ADMIN À IMPLÉMENTER
// ---------------------------------------------------
// 🔐 Middleware recommandé : verifyAdmin()
// À placer dans middleware/verifyAdmin.js plus tard

// 🧾 Commandes
// ----------------------------------------
/**
 * GET    /admin/orders              - Liste des commandes
 * GET    /admin/orders/:id         - Détail d'une commande
 * GET    /admin/orders/:id/items   - Items d'une commande
 * PATCH  /admin/orders/:id/status  - Modifier le statut de commande
 * DELETE /admin/orders/:id         - Supprimer une commande (rarement utile)
 */

// 👕 Produits
// ----------------------------------------
/**
 * GET    /admin/products           - Liste des produits
 * GET    /admin/products/:id      - Détail d’un produit
 * POST   /admin/products          - Ajouter un nouveau produit
 * PATCH  /admin/products/:id      - Modifier un produit
 * DELETE /admin/products/:id      - Supprimer un produit
 */

// 🧵 Variantes
// ----------------------------------------
/**
 * GET    /admin/variants                      - Liste de toutes les variantes
 * GET    /admin/products/:id/variants         - Variantes pour un produit
 * PATCH  /admin/variants/:id                  - Modifier une variante
 * POST   /admin/variants/import               - Importer depuis Printful
 */

// 🛍️ Promotions
// ----------------------------------------
/**
 * GET    /admin/discount-codes      - Liste des codes promo
 * POST   /admin/discount-codes      - Créer un code promo
 * DELETE /admin/discount-codes/:id  - Supprimer un code promo
 */

// 👤 Clients
// ----------------------------------------
/**
 * GET    /admin/customers             - Liste des clients
 * GET    /admin/customers/:id         - Détails d’un client
 * GET    /admin/customers/:id/orders  - Commandes d’un client
 */

// ⚙️ Autres outils utiles
// ----------------------------------------
/**
 * GET    /admin/logs/cron                    - Logs des tâches planifiées
 * GET    /admin/errors/api                   - Logs erreurs API
 * GET    /admin/abandoned-carts              - Voir les paniers abandonnés
 * POST   /admin/resend-confirmation/:orderId - Réenvoyer la confirmation
 */

// 🔧 Tâches techniques (non publiques)
///---------------------------------------
/**
 * POST /admin/force-sync     - Forcer la sync Printful → DB
 * POST /admin/clear-cache    - Vider le cache local (si utilisé)
 */
