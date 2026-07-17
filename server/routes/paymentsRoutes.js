import express from 'express';
import { verifyPaymentStatus } from '../controllers/paymentsController.js';

const router = express.Router();

// GET /payments/verify -> verifyPaymentStatus
router.get('/payments/verify', verifyPaymentStatus);

export default router;
