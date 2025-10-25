// server/routes/ordersRoutes.js
import express from 'express';
import {
  createPrintfulOrder,
  protectedExample,
  userInfo
} from '../controllers/ordersController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// ✅ Route publique (création Printful, pas besoin de token)
router.post('/printful-order', createPrintfulOrder);

// ✅ Routes protégées : on remplace "authProtect" par "verifyToken"
router.get('/protected', verifyToken, protectedExample);
router.get('/user-info', verifyToken, userInfo);

export default router;
