import express from 'express';
import { paymentsVerifyLimiter } from '../middlewares/rateLimiters.js';
import { verifyPaymentStatus } from '../controllers/paymentsController.js';

const router = express.Router();

// GET /payments/verify -> verifyPaymentStatus
router.get('/payments/verify', paymentsVerifyLimiter, verifyPaymentStatus);

export default router;
