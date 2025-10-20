// server/controllers/authController.js
import jwt from 'jsonwebtoken';
import {
  findUserByEmail,
  insertCustomer,
  saveRefreshToken,
  deleteRefreshToken,
  getRefreshTokenRecord
} from '../models/authModel.js';
import { logInfo, logWarn, logError } from '../utils/logger.js';
import bcrypt from 'bcrypt';
import { refreshAccessToken } from '../services/authService.js';

// helpers cookies (dev/prod)
function cookieOptsRefresh() {
  const isProd = process.env.NODE_ENV === 'production';
  // En dev (HTTP): secure=false, sameSite='lax'
  // En prod (HTTPS cross-site): secure=true, sameSite='none'
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30j
  };
}

export async function postRefreshToken(req, res) {
  // On accepte body, header ou cookie (tu utilises body côté client)
  const token =
    req.body?.refreshToken ||
    req.get('x-refresh-token') ||
    req.cookies?.refreshToken;

  const result = await refreshAccessToken(token);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.code });
  }
  return res.json({ accessToken: result.accessToken });
}

/** POST /api/auth/register */
export async function registerUser(req, res) {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email et password requis' });
    }
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'email déjà utilisé' });
    }
    const passwordHash = await bcrypt.hash(String(password), 10);
    const userId = await insertCustomer({
      name: name ?? null,
      email,
      passwordHash
    });
    await logInfo(`register user ${email} (#${userId})`, 'auth');
    return res.status(201).json({ id: userId, email, name: name ?? null });
  } catch (e) {
    await logError(`register error: ${e?.message || e}`, 'auth');
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

/** POST /api/auth/login */
export async function loginUser(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email et password requis' });
    }
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'identifiants invalides' });
    }
    const ok = await bcrypt.compare(String(password), user.password_hash || '');
    if (!ok) {
      return res.status(401).json({ error: 'identifiants invalides' });
    }

    // Access token court
    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );
    // Refresh token long
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '30d' }
    );
    await saveRefreshToken({ userId: user.id, token: refreshToken });

    res.cookie('refresh_token', refreshToken, cookieOptsRefresh());
    await logInfo(`login user #${user.id}`, 'auth');

    return res.status(200).json({
      accessToken, // ✅ camelCase
      refreshToken, // ✅ camelCase (pour ton App.jsx)
      user: { id: user.id, email: user.email, name: user.name ?? null }
    });
  } catch (e) {
    await logError(`login error: ${e?.message || e}`, 'auth');
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

/** POST /api/auth/logout */
export async function logoutUser(req, res) {
  try {
    // On tente de lire le token pour le révoquer, mais on logout même s'il n'existe plus
    const token = req.cookies?.refresh_token || req.body?.refresh_token || null;
    if (token) {
      try {
        await deleteRefreshToken({ token });
      } catch {
        /* noop */
      }
    }
    res.clearCookie('refresh_token', { ...cookieOptsRefresh(), maxAge: 0 });
    await logInfo('logout', 'auth');
    return res.status(200).json({ ok: true });
  } catch (e) {
    await logError(`logout error: ${e?.message || e}`, 'auth');
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function handleRefreshToken(req, res) {
  try {
    // Debug temporaire (regarde la console serveur pendant tes curl)
    console.log('[refresh] content-type:', req.headers['content-type']);
    console.log('[refresh] typeof body:', typeof req.body);
    console.log('[refresh] body raw:', req.body);

    // 1) Extraire le token de la façon la plus tolérante possible
    let token =
      (req.body && (req.body.refreshToken || req.body.refresh_token)) ||
      req.get('x-refresh-token') ||
      req.cookies?.refresh_token ||
      null;

    // Fallback si le body est une string
    if (!token && typeof req.body === 'string') {
      try {
        const asJson = JSON.parse(req.body);
        token = asJson.refreshToken || asJson.refresh_token || token;
      } catch {
        const m =
          req.body.match(/refreshToken=([^&\s]+)/i) ||
          req.body.match(/refresh_token=([^&\s]+)/i);
        if (m) token = m[1];
      }
    }

    if (!token) {
      res.setHeader('X-Refresh-Debug', 'missing_token');
      return res.status(401).json({ error: 'refresh_token manquant' });
    }

    // 2) Vérifier existence en DB (⚠️ chaîne, pas objet)
    const rec = await getRefreshTokenRecord(token);
    if (!rec) {
      res.setHeader('X-Refresh-Debug', 'unknown_token');
      await logWarn('refresh: token inconnu', 'auth');
      return res.status(401).json({ error: 'refresh_token inconnu' });
    }

    // 3) Vérifier signature
    let payload;
    try {
      payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (e) {
      res.setHeader('X-Refresh-Debug', 'invalid_signature');
      await logWarn(`refresh: token invalide (${e?.name})`, 'auth');
      return res.status(401).json({ error: 'refresh_token invalide' });
    }

    // 4) Émettre un nouvel access token
    const accessToken = jwt.sign(
      { id: payload.id, email: payload.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );

    res.setHeader('X-Refresh-Debug', 'ok');
    return res.status(200).json({ accessToken }); // ✅ camelCase
  } catch (e) {
    res.setHeader('X-Refresh-Debug', 'server_error');
    await logError(`refresh error: ${e?.message || e}`, 'auth');
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
