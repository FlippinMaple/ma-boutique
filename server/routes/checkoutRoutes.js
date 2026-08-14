import { Router } from 'express';
import { createCheckoutSession } from '../controllers/checkoutController.js';
import { checkoutLimiter } from '../middlewares/rateLimiters.js';

const router = Router();
router.post('/', checkoutLimiter, createCheckoutSession);
export default router;
