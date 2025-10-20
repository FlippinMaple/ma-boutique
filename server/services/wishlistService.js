// server/services/wishlistService.js
import {
  getWishlist as getWishlistModel,
  addToWishlist,
  removeFromWishlist,
  isInWishlist
} from '../models/wishlistModel.js';

/**
 * Récupère la wishlist d’un utilisateur
 * (alias explicite pour éviter le conflit de nom avec l’import du modèle)
 */
export async function getWishlistByCustomerId(customerId) {
  return await getWishlistModel(customerId);
}

/**
 * Ajout/suppression d’un produit dans la wishlist (toggle)
 * NOTE: Le modèle actuel est au niveau produit (pas de variant_id stocké).
 * Si tu veux gérer les variants, il faudra étendre le schéma + le modèle.
 */
export async function toggleWishlist({
  customer_id,
  product_id /*, variant_id, printful_variant_id */
}) {
  const exists = await isInWishlist(customer_id, product_id);

  if (exists) {
    await removeFromWishlist(customer_id, product_id);
    return { added: false };
  } else {
    await addToWishlist(customer_id, product_id);
    return { added: true };
  }
}

/* -------------------------------------------
   (Optionnel) Aliases de compat si d’autres
   fichiers appellent encore ces noms
-------------------------------------------- */
export const deleteWishlistItem = (userId, productId) =>
  removeFromWishlist(userId, productId);

export const insertWishlistItem = (
  userId,
  productId /*, variant_id, pf_variant_id */
) => addToWishlist(userId, productId);

export const findWishlistItem = async (userId, productId /*, variant_id */) => {
  const exists = await isInWishlist(userId, productId);
  // on retourne un tableau pour être compatible avec l'ancien code (existing.length > 0)
  return exists ? [{ user_id: userId, product_id: productId }] : [];
};

export { getWishlistByCustomerId as getWishlist };
