import express from 'express';
import { getShippingRates } from '../controllers/shippingController.js';

const router = express.Router();
// /api/shipping-rates
router.post('/api/shipping-rates', getShippingRates);

export default router;
