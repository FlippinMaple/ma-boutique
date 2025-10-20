// server/controllers/wishlistController.js
import {
  // si le service a l’alias, ça marchera tel quel ;
  // sinon on importe explicitement l’autre nom et on le renomme localement.
  getWishlist as getWishlistFromService,
  getWishlistByCustomerId as _getWishlistByCustomerId,
  toggleWishlist
} from '../services/wishlistService.js';
import { logInfo, logError } from '../utils/logger.js';

// petit helper pour avoir un seul nom local "getWishlist"
const getWishlist = getWishlistFromService || _getWishlistByCustomerId;

/**
 * GET /api/wishlist/:customerId
 * Accès restreint à l'utilisateur authentifié correspondant.
 */
export const getWishlistByCustomer = async (req, res) => {
  try {
    if (!req.user || typeof req.user.id === 'undefined') {
      return res.status(401).json({ error: 'Authentification requise.' });
    }

    const requestedCustomerId = Number(req.params.customerId);
    const authUserId = Number(req.user.id);

    if (Number.isNaN(requestedCustomerId)) {
      return res.status(400).json({ error: 'Paramètre customerId invalide.' });
    }
    if (requestedCustomerId !== authUserId) {
      return res
        .status(403)
        .json({ error: 'Accès refusé à la wishlist d’un autre utilisateur.' });
    }

    const items = await getWishlist(requestedCustomerId);
    await logInfo(
      `Récupération wishlist client ${requestedCustomerId}`,
      'wishlist'
    );
    return res.status(200).json(items);
  } catch (error) {
    await logError(
      `Erreur récupération wishlist client ${req.params?.customerId} : ${
        error?.message || error
      }`,
      'wishlist'
    );
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * POST /api/wishlist/toggle
 * Body: { customer_id, product_id, variant_id?, printful_variant_id? }
 * Accès restreint à l'utilisateur authentifié correspondant.
 */
export const toggleWishlistItem = async (req, res) => {
  try {
    if (!req.user || typeof req.user.id === 'undefined') {
      return res.status(401).json({ error: 'Authentification requise.' });
    }

    let { customer_id, product_id, variant_id, printful_variant_id } =
      req.body || {};
    const authUserId = Number(req.user.id);

    customer_id = Number(customer_id);
    product_id = Number(product_id);
    // ⚠️ variant_id est OPTIONNEL côté modèle/service actuel
    variant_id =
      variant_id === undefined || variant_id === null || variant_id === ''
        ? null
        : Number(variant_id);
    printful_variant_id = printful_variant_id
      ? String(printful_variant_id)
      : null;

    // champs requis MINIMUM
    if (Number.isNaN(customer_id) || Number.isNaN(product_id)) {
      return res
        .status(400)
        .json({ error: 'Champs requis: customer_id, product_id' });
    }
    if (customer_id !== authUserId) {
      return res
        .status(403)
        .json({
          error:
            'Accès refusé : vous ne pouvez modifier que votre propre wishlist.'
        });
    }

    const result = await toggleWishlist({
      customer_id,
      product_id,
      variant_id, // ignoré par le modèle actuel → laissé pour compat
      printful_variant_id // idem
    });

    const action = result.added ? 'ajouté' : 'retiré';
    await logInfo(
      `Item ${product_id}${
        variant_id ? ` (${variant_id})` : ''
      } ${action} pour client ${customer_id}`,
      'wishlist'
    );

    return res.status(result.added ? 201 : 200).json({
      added: result.added,
      message: `Item ${action} de la wishlist`
    });
  } catch (error) {
    await logError(
      `Erreur wishlist client ${req.body?.customer_id} : ${
        error?.message || error
      }`,
      'wishlist'
    );
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
