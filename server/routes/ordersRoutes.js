// server/routes/ordersRoutes.js
import express from 'express';
import {
  createPrintfulOrder,
  protectedExample,
  userInfo
} from '../controllers/ordersController.js';
import { authProtect } from '../middlewares/authProtect.js';

const router = express.Router();

router.post('/printful-order', createPrintfulOrder);
router.get('/protected', authProtect, protectedExample);
router.get('/user-info', authProtect, userInfo);

export default router;
