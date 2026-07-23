// server/routes/adminRoutes.js
import express from 'express';
import { requireRole } from '../middlewares/requireRole.js';
import {
  healthPaidWithoutItems,
  listAdminProducts,
  updateProductFeatured,
  listOrders,
  getOrderDetail,
  listStripeEvents
} from '../controllers/adminController.js';

const router = express.Router();

router.use(requireRole('admin')); // Protect all admin routes

router.get('/health/paid-without-items', healthPaidWithoutItems);
router.get('/products', listAdminProducts);
router.patch('/products/:id/featured', updateProductFeatured);
router.get('/orders', listOrders);
router.get('/orders/:id', getOrderDetail);
router.get('/stripe-events', listStripeEvents);

export default router;
