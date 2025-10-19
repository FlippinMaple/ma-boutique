// routes/complianceEmailRoutes.js
import { Router } from 'express';
import {
  recordConsent,
  unsubscribePost,
  unsubscribeLanding,
  emailWebhook
} from '../controllers/complianceEmailController.js';

const router = Router();

// JSON body parser est déjà global dans app.js pour /api/* ; si besoin, on peut ajouter express.json()
router.post('/consents', recordConsent);
router.post('/unsubscribe', unsubscribePost);
router.get('/unsubscribe', unsubscribeLanding);
router.post('/email-webhooks/:provider', emailWebhook);

export default router;
