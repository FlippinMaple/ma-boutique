import express from 'express';
import { adminDebug } from '../controllers/adminController.js';

const router = express.Router();

// final: GET /api/admin/debug-orders
router.get('/debug-orders', adminDebug);

export default router;
