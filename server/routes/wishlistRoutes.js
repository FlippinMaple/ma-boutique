import express from 'express';
import {
  getWishlistByCustomer,
  toggleWishlistItem
} from '../controllers/wishlistController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/wishlist/:customerId
 * Protégé par JWT. Seul le propriétaire peut consulter sa wishlist.
 */
router.get('/:customerId', verifyToken, getWishlistByCustomer);

/**
 * POST /api/wishlist/toggle
 * Body: { customer_id, product_id, variant_id, printful_variant_id }
 * Protégé par JWT. Seul le propriétaire peut modifier sa wishlist.
 */
router.post('/toggle', verifyToken, toggleWishlistItem);

export default router;
