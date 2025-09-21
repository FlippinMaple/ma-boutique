import { Router } from 'express';
import { authProtect } from '../middlewares/authProtect.js';
import {
  createPrintfulOrderController,
  getProtected,
  getUserInfo
} from '../controllers/ordersController.js';

const router = Router();
router.post('/printful-order', createPrintfulOrderController);
router.get('/protected', authProtect, getProtected);
router.get('/user-info', authProtect, getUserInfo);
export default router;
