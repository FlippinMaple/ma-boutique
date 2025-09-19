import jwt from 'jsonwebtoken';

/**
 * Middleware JWT standard.
 * - Attend un header "Authorization: Bearer <token>"
 * - Décode via process.env.JWT_SECRET
 * - Pose req.user = { id, email, ... } (selon le payload)
 */
export const verifyToken = (req, res, next) => {
  try {
    const auth = req.headers['authorization'] || '';
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Token manquant.' });
    }

    const token = parts[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Exemple de payload attendu: { id, email, iat, exp }
    if (!payload || typeof payload.id === 'undefined') {
      return res.status(401).json({ error: 'Token invalide.' });
    }

    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role // si tu as des rôles
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
};
