import express from 'express';
import { rawStripeBody } from '../middlewares/rawStripeBody.js';
import { handleStripeWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// ⚠️ Stripe : raw body uniquement pour cette route
router.post('/webhook', rawStripeBody, handleStripeWebhook);

export default router; // ← export par défaut en bas (routeur)
// à utiliser dans server.js:
// import webhookRoute from './routes/webhookRoute.js';
// app.use('/api', webhookRoute);
// (ou un autre préfixe que tu veux, mais pas /api/payments/webhook car Stripe ne permet pas les sous-répertoires dans l'URL de webhook)
// cf. https://stripe.com/docs/webhooks
