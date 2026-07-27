// server/routes/ordersRoutes.js
import express from 'express';
import {
  protectedExample,
  userInfo
} from '../controllers/ordersController.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// ✅ Routes protégées : on remplace "authProtect" par "verifyToken"
router.get('/protected', verifyToken, protectedExample);
router.get('/user-info', verifyToken, userInfo);

export default router;
