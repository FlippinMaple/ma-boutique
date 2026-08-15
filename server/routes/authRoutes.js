import { Router } from 'express';
import {
  login,
  refreshToken,
  logout,
  register
} from '../controllers/authController.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import {
  authLoginLimiter,
  authRegisterLimiter,
  authRefreshLimiter
} from '../middlewares/rateLimiters.js';

const router = Router();

router.post('/login', authLoginLimiter, login);
router.post('/refresh-token', authRefreshLimiter, refreshToken);
router.post('/logout', logout);
router.post('/register', authRegisterLimiter, register);

// 🔎 diag simple : lit le cookie "access" et renvoie l'utilisateur
router.get('/whoami', verifyToken, (req, res) => {
  res.json({ ok: true, user: req.user });
});

export default router;
