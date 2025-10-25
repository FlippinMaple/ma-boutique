import jwt from 'jsonwebtoken';

/**
 * Middleware d'authentification via cookie httpOnly.
 * - Cherche un cookie nommé "access"
 * - Décode avec process.env.JWT_ACCESS_SECRET
 * - Injecte req.user = { sub, email, ... }
 */
export const verifyToken = (req, res, next) => {
  try {
    const token = req.cookies?.access;
    if (!token) {
      return res
        .status(401)
        .json({ error: 'Accès refusé. Aucun token trouvé.' });
    }
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (!payload?.sub) {
      return res.status(401).json({ error: 'Token invalide.' });
    }

    req.user = {
      id: payload.sub,
      email: payload.email || null,
      role: payload.role || null
    };
    return next();
  } catch (err) {
    const msg =
      err?.name === 'TokenExpiredError' ? 'jwt expired' : 'invalid token';
    console.error('❌ Erreur JWT :', msg);
    return res.status(401).json({ error: msg });
  }
};
