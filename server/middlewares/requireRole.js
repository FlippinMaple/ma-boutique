// server/middlewares/requireRole.js
import jwt from 'jsonwebtoken';
import { logError } from '../utils/logger.js';

/**
 * Middleware auth + role (cookie JWT access, role verifie en DB).
 * Injecte req.auth = { userId, role, email }.
 */
export function requireRole(requiredRole = 'admin') {
  return async function (req, res, next) {
    try {
      const db = req.app.locals.db;
      const access = req.cookies?.access;

      if (!access) {
        return res.status(401).json({ error: 'Auth requise' });
      }

      let payload;
      try {
        payload = jwt.verify(access, process.env.JWT_ACCESS_SECRET);
      } catch (err) {
        await logError(err, 'requireRole.payload');
        return res.status(401).json({ error: 'Session expired' });
      }

      const userId = Number(payload?.sub);
      if (!Number.isFinite(userId)) {
        return res.status(401).json({ error: 'Token invalide' });
      }

      // Role lu en DB (source de verite)
      const [[user]] = await db.query(
        `SELECT id, role, email FROM customers WHERE id = ? LIMIT 1`,
        [userId]
      );
      if (!user)
        return res.status(401).json({ error: 'Utilisateur introuvable' });

      if (requiredRole && String(user.role) !== String(requiredRole)) {
        return res.status(403).json({ error: 'Access forbidden' });
      }

      req.auth = { userId: user.id, role: user.role, email: user.email };
      return next();
    } catch (err) {
      await logError(err, 'requireRole');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}
