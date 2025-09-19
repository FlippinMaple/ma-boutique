import {
  getWishlistByCustomerId,
  findWishlistItem,
  insertWishlistItem,
  deleteWishlistItem
} from '../models/wishlistModel.js';

export const getWishlist = async (customerId) => {
  return await getWishlistByCustomerId(customerId);
};

export const toggleWishlist = async ({
  customer_id,
  product_id,
  variant_id,
  printful_variant_id
}) => {
  const existing = await findWishlistItem(customer_id, product_id, variant_id);

  if (existing.length > 0) {
    await deleteWishlistItem(customer_id, product_id, variant_id);
    return { added: false };
  } else {
    await insertWishlistItem(
      customer_id,
      product_id,
      variant_id,
      printful_variant_id
    );
    return { added: true };
  }
};
