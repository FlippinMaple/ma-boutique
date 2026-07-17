// server/routes/webhookRoutes.js
import express from 'express';
import { handleStripeWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// IMPORTANT : on NE remet PAS express.json() ici.
// app.js a déjà monté bodyParser.raw() pour /webhook/* avant.
router.post('/stripe', handleStripeWebhook);

export default router;
