// server/routes/shippingRoutes.js
import express from 'express';
import { getRates } from '../controllers/shippingController.js';

const router = express.Router();

router.post('/rates', getRates);

export default router;
