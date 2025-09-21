import express from 'express';
import { adminDebug } from '../controllers/adminController.js';

const router = express.Router();
// /api/debug-orders
router.get('/api/debug-orders', adminDebug);

export default router;
