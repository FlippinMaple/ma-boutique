// server/routes/inventoryRoutes.js
import express from 'express';
import { getPrintfulStock } from '../controllers/inventoryController.js';

const router = express.Router();

// on garde le même chemin qu'avant pour ne rien casser
router.get('/api/printful-stock/:variantId', getPrintfulStock);

export default router;
