import { getWishlist, toggleWishlist } from '../services/wishlistService.js';
import { logInfo, logError } from '../utils/logger.js';

/**
 * GET /api/wishlist/:customerId
 * Accès restreint à l'utilisateur authentifié correspondant.
 */
export const getWishlistByCustomer = async (req, res) => {
  try {
    // 1) S'assurer que l'utilisateur est authentifié (middleware a dû poser req.user)
    if (!req.user || typeof req.user.id === 'undefined') {
      return res.status(401).json({ error: 'Authentification requise.' });
    }

    // 2) Récupérer et normaliser l’ID demandé
    const requestedCustomerId = Number(req.params.customerId);
    const authUserId = Number(req.user.id);

    if (Number.isNaN(requestedCustomerId)) {
      return res.status(400).json({ error: 'Paramètre customerId invalide.' });
    }

    // 3) Interdire l’accès si ce n’est pas la même personne
    if (requestedCustomerId !== authUserId) {
      return res
        .status(403)
        .json({ error: 'Accès refusé à la wishlist d’un autre utilisateur.' });
    }

    // 4) OK → service
    const items = await getWishlist(requestedCustomerId);
    await logInfo(
      `Récupération wishlist client ${requestedCustomerId}`,
      'wishlist'
    );
    return res.status(200).json(items);
  } catch (error) {
    await logError(
      `Erreur récupération wishlist client ${req.params?.customerId} : ${error.message}`,
      'wishlist'
    );
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * POST /api/wishlist/toggle
 * Body: { customer_id, product_id, variant_id, printful_variant_id }
 * Accès restreint à l'utilisateur authentifié correspondant.
 */
export const toggleWishlistItem = async (req, res) => {
  try {
    // 1) S'assurer que l'utilisateur est authentifié
    if (!req.user || typeof req.user.id === 'undefined') {
      return res.status(401).json({ error: 'Authentification requise.' });
    }

    // 2) Lire le body et normaliser
    let { customer_id, product_id, variant_id, printful_variant_id } = req.body;

    customer_id = Number(customer_id);
    product_id = Number(product_id);
    variant_id = Number(variant_id);
    printful_variant_id = printful_variant_id
      ? String(printful_variant_id)
      : null;

    // 3) Valider les champs essentiels
    if (
      Number.isNaN(customer_id) ||
      Number.isNaN(product_id) ||
      Number.isNaN(variant_id)
    ) {
      return res
        .status(400)
        .json({
          error:
            'Champs invalides (customer_id, product_id, variant_id requis).'
        });
    }

    // 4) Interdire la modification si ce n’est pas l’utilisateur lui-même
    const authUserId = Number(req.user.id);
    if (customer_id !== authUserId) {
      return res
        .status(403)
        .json({
          error:
            'Accès refusé : vous ne pouvez modifier que votre propre wishlist.'
        });
    }

    // 5) Appeler le service
    const result = await toggleWishlist({
      customer_id,
      product_id,
      variant_id,
      printful_variant_id
    });

    const action = result.added ? 'ajouté' : 'retiré';
    await logInfo(
      `Item ${product_id} (${variant_id}) ${action} pour client ${customer_id}`,
      'wishlist'
    );

    return res.status(result.added ? 201 : 200).json({
      message: `Item ${action} de la wishlist`
    });
  } catch (error) {
    await logError(
      `Erreur wishlist client ${req.body?.customer_id} : ${error.message}`,
      'wishlist'
    );
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
