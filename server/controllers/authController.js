// server/controllers/authController.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getPool } from '../db.js';

const isProd = process.env.NODE_ENV === 'production';

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
  maxAge: 1000 * 60 * 60,
  path: '/'
};

const cookieOptsRefresh = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  maxAge: 1000 * 60 * 60 * 24 * 30,
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

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }

    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT id, email, password_hash, role, first_name, last_name FROM customers WHERE LOWER(email) = LOWER(?) LIMIT 1',
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

    const access = signAccess({
      sub: user.id,
      email: user.email,
      role: user.role
    });
    const refresh = signRefresh({ sub: user.id });

    res.cookie('access', access, cookieOptsAccess);
    res.cookie('refresh', refresh, cookieOptsRefresh);

    return res.status(200).json({
      ok: true,
      accessToken: access,
      refreshToken: refresh,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        name:
          [user.first_name, user.last_name].filter(Boolean).join(' ') ||
          user.email
      }
    });
  } catch (err) {
    console.error('[auth:login] error:', err?.message);
    next(err);
  }
};

export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refresh;
    if (!token) {
      return res.status(401).json({ message: 'Aucun cookie refresh.' });
    }

    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const userId = payload?.sub;
    if (userId == null) {
      return res.status(401).json({ message: 'Refresh invalide ou expiré.' });
    }

    let role = payload.role;
    let email = payload.email;

    if (!role) {
      const pool = await getPool();
      const [rows] = await pool.query(
        'SELECT email, role FROM customers WHERE id = ? LIMIT 1',
        [userId]
      );
      if (!rows.length) {
        return res.status(401).json({ message: 'Refresh invalide ou expiré.' });
      }
      role = rows[0].role;
      if (!email) {
        email = rows[0].email;
      }
    }

    const access = signAccess({
      sub: userId,
      email,
      role
    });

    return res
      .cookie('access', access, cookieOptsAccess)
      .status(200)
      .json({ ok: true, accessToken: access });
  } catch (err) {
    console.error('[auth:refreshToken] error:', err?.message);
    return res.status(401).json({ message: 'Refresh invalide ou expiré.' });
  }
};

export async function logout(req, res) {
  try {
    res.clearCookie('access', {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/'
    });
    res.clearCookie('refresh', {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/'
    });
    res.json({ ok: true, message: 'Déconnecté avec succès' });
  } catch (err) {
    console.error('[auth:logout] error:', err?.message);
    res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
}

export const register = async (req, res, next) => {
  try {
    const raw = req.body || {};

    const firstName = (raw.first_name ?? raw.firstName ?? '').toString().trim();
    const lastName = (raw.last_name ?? raw.lastName ?? '').toString().trim();

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

    const isSubscribedRaw = raw.is_subscribed ?? raw.consentLoi25 ?? false;
    const is_subscribed = isSubscribedRaw ? 1 : 0;

    if (!f || !l) {
      return res.status(400).json({ message: 'Prénom et nom sont requis.' });
    }
    if (!email) {
      return res.status(400).json({ message: 'Courriel requis.' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Mot de passe requis.' });
    }

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

    const role = 'customer';
    const [result] = await pool.query(
      `INSERT INTO customers
        (first_name, last_name, email, password_hash, is_subscribed, role, created_at, updated_at, last_login)
       VALUES
        (?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)`,
      [f, l, email, password_hash, is_subscribed, role]
    );

    const userId = result.insertId;

    const access = signAccess({ sub: userId, email, role });
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
