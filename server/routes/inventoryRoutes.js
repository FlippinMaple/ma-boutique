// routes/inventoryRoutes.js
import { Router } from 'express';
import { getPrintfulStock } from '../controllers/inventoryController.js';
import { inventoryLimiter } from '../middlewares/rateLimiters.js';
const router = Router();
router.get('/printful-stock/:id', inventoryLimiter, getPrintfulStock);
export default router;
