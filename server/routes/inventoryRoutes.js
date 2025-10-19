import express from 'express';
import { getPrintfulStock } from '../controllers/inventoryController.js';
import { inventoryLimiter } from '../middlewares/rateLimiters.js';

const router = express.Router();

router.get('/printful-stock/:variantId', inventoryLimiter, getPrintfulStock);

export default router;
