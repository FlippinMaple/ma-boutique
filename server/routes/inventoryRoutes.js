// routes/inventoryRoutes.js
import { Router } from 'express';
import { getPrintfulStock } from '../controllers/inventoryController.js';
const router = Router();
router.get('/printful-stock/:id', getPrintfulStock);
export default router;
