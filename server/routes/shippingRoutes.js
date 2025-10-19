// server/routes/shippingRoutes.js
import express from 'express';
import { getRates } from '../controllers/shippingController.js';
import { shippingLimiter } from '../middlewares/rateLimiters.js';

const router = express.Router();

router.post('/rates', shippingLimiter, getRates);

export default router;
