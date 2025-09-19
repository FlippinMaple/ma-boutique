import express from 'express';
import {
  getVisibleProducts,
  getProductDetails
} from '../controllers/productsController.js';

const router = express.Router();

router.get('/', getVisibleProducts);

// ✅ ALIAS rétro-compatible DOIT être avant "/:id"
router.get('/details/:id', getProductDetails);

// ✅ Route standard
router.get('/:id', getProductDetails);

export default router;
