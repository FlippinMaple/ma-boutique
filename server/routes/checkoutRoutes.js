import express from 'express';
import { createCheckoutSession } from '../controllers/checkoutController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, createCheckoutSession);

export default router;
