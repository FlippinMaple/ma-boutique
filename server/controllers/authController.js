// server/controllers/authController.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getPool } from '../db.js';

const isProd = process.env.NODE_ENV === 'production';

// Garde-fous ENV très tôt (évite "secretOrPrivateKey must have a value")
if (!process.env.JWT_ACCESS_SECRET) {
  throw new Error('[auth] JWT_ACCESS_SECRET manquant (server/.env)');
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('[auth] JWT_REFRESH_SECRET manquant (server/.env)');
}

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '30d';

const cookieOptsAccess = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  maxAge: 1000 * 60 * 60, // 1h (le token lui-même expire plus tôt)
  path: '/'
};

const cookieOptsRefresh = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30j
  path: '/'
};

function signAccess(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TTL
  });
}

function signRefresh(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TTL
  });
}

/**
 * POST /api/auth/login
 * body: { email, password }
 * - Cherche le user dans `customers`
 * - Compare password (bcrypt)
 * - Dépose cookies "access" et "refresh"
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }

    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT id, email, password_hash FROM customers WHERE email = ? LIMIT 1',
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash || '');
    if (!ok) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    const access = signAccess({ sub: user.id, email: user.email });
    const refresh = signRefresh({ sub: user.id });

    return res
      .cookie('access', access, cookieOptsAccess)
      .cookie('refresh', refresh, cookieOptsRefresh)
      .status(200)
      .json({ ok: true });
  } catch (err) {
    console.error('[auth:login] error:', err?.message);
    next(err);
  }
};

/**
 * POST /api/auth/refresh-token
 * - Lit cookie "refresh"
 * - Vérifie et émet un nouveau "access"
 */
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refresh;
    if (!token) {
      return res.status(401).json({ message: 'Aucun cookie refresh.' });
    }

    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const access = signAccess({ sub: payload.sub });

    return res
      .cookie('access', access, cookieOptsAccess)
      .status(200)
      .json({ ok: true });
  } catch (err) {
    console.error('[auth:refreshToken] error:', err?.message);
    return res.status(401).json({ message: 'Refresh invalide ou expiré.' });
  }
};

/**
 * POST /api/auth/logout
 * - Efface les cookies
 */
export const logout = (req, res) => {
  return res
    .clearCookie('access', cookieOptsAccess)
    .clearCookie('refresh', cookieOptsRefresh)
    .status(200)
    .json({ ok: true });
};

// --- REMPLACER EN ENTIER la fonction register par ceci ---
export const register = async (req, res, next) => {
  try {
    const raw = req.body || {};

    // J'accepte tes alias côté front, sans casser ton flux actuel
    const firstName = (raw.first_name ?? raw.firstName ?? '').toString().trim();
    const lastName = (raw.last_name ?? raw.lastName ?? '').toString().trim();

    // Si "name" est fourni, on tente de le splitter "Prénom Nom"
    const fullName = (raw.name ?? '').toString().trim();
    let f = firstName,
      l = lastName;
    if ((!f || !l) && fullName) {
      const parts = fullName.split(/\s+/);
      f = f || parts.shift() || '';
      l = l || parts.join(' ') || '';
    }

    const email = (raw.email ?? raw.userEmail ?? raw.mail ?? '')
      .toString()
      .trim()
      .toLowerCase();

    const password = (raw.password ?? raw.pass ?? raw.pwd ?? '').toString();
    const passwordConfirm = (
      raw.passwordConfirm ??
      raw.confirmPassword ??
      ''
    ).toString();

    // is_subscribed: accepte consentLoi25 de ton form, ou is_subscribed
    const isSubscribedRaw = raw.is_subscribed ?? raw.consentLoi25 ?? false;
    const is_subscribed = isSubscribedRaw ? 1 : 0;

    // Champs requis minimaux
    if (!f || !l) {
      return res.status(400).json({ message: 'Prénom et nom sont requis.' });
    }
    if (!email) {
      return res.status(400).json({ message: 'Courriel requis.' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Mot de passe requis.' });
    }

    // Validation basique côté back (ton front a déjà la regex stricte)
    if (password.length < 8 || password.length > 16) {
      return res
        .status(400)
        .json({ message: 'Mot de passe invalide (8–16 caractères requis).' });
    }
    if (passwordConfirm && password !== passwordConfirm) {
      return res
        .status(422)
        .json({ message: 'Les mots de passe ne correspondent pas.' });
    }

    const pool = await getPool();

    // Unicité du courriel
    const [exists] = await pool.query(
      'SELECT id FROM customers WHERE email = ? LIMIT 1',
      [email]
    );
    if (exists.length) {
      return res
        .status(409)
        .json({ message: 'Un compte existe déjà avec ce courriel.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // INSERT adapté à ta structure exacte
    const role = 'customer'; // ou utilise la valeur par défaut de ta DB si configurée
    const [result] = await pool.query(
      `INSERT INTO customers
        (first_name, last_name, email, password_hash, is_subscribed, role, created_at, updated_at, last_login)
       VALUES
        (?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)`,
      [f, l, email, password_hash, is_subscribed, role]
    );

    const userId = result.insertId;

    // Auto-login (cookies httpOnly) — identique à /login
    const access = signAccess({ sub: userId, email });
    const refresh = signRefresh({ sub: userId });

    return res
      .cookie('access', access, cookieOptsAccess)
      .cookie('refresh', refresh, cookieOptsRefresh)
      .status(201)
      .json({ ok: true, id: userId });
  } catch (err) {
    console.error('[auth:register] error:', err?.message);
    next(err);
  }
};

export { refreshToken as handleRefreshToken };
