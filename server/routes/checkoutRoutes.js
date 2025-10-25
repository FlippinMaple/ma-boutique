import { Router } from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { createCheckoutSession } from '../controllers/checkoutController.js';

const router = Router();
router.post('/', verifyToken, createCheckoutSession);
export default router;
