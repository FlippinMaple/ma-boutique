// routes/complianceEmailRoutes.js
import { Router } from 'express';
import { unsubscribePost } from '../controllers/complianceEmailController.js';
import { unsubscribeLimiter } from '../middlewares/rateLimiters.js';

const router = Router();

// JSON body parser est déjà global dans app.js pour /api/* ; si besoin, on peut ajouter express.json()
router.post('/unsubscribe', unsubscribeLimiter, unsubscribePost);

export default router;
