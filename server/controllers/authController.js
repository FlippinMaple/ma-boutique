// server/controllers/authController.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
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
  maxAge: 1000 * 60 * 15,
  path: '/'
};

const cookieOptsRefresh = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  maxAge: 1000 * 60 * 60 * 24 * 30,
  path: '/'
};

const MARKETING_CONSENT_TEXT =
  'Je souhaite recevoir par courriel des nouvelles, nouveautés et offres de Flippin’ Maple.';

const REGISTER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTER_PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,16}$/;

function pickStringField(raw, keys) {
  for (const key of keys) {
    if (raw[key] !== undefined) {
      if (typeof raw[key] !== 'string') return { invalid: true };
      return { value: raw[key] };
    }
  }
  return { value: undefined };
}

function signAccess(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TTL,
    algorithm: 'HS256'
  });
}
function signRefresh(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TTL,
    algorithm: 'HS256',
    jwtid: randomUUID()
  });
}

function hashRefreshToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function getRefreshTokenExpiresAt(token) {
  const decoded = jwt.decode(token);
  const exp = decoded?.exp;
  if (typeof exp !== 'number' || !Number.isInteger(exp) || exp <= 0) {
    throw new Error('REFRESH_TOKEN_EXP_MISSING');
  }
  return new Date(exp * 1000);
}

async function persistRefreshToken(pool, userId, token) {
  const tokenHash = hashRefreshToken(token);
  const expiresAt = getRefreshTokenExpiresAt(token);
  await pool.query(
    `INSERT INTO refresh_tokens
       (user_id, refresh_token, created_at, expires_at)
     VALUES
       (?, ?, NOW(), ?)`,
    [userId, tokenHash, expiresAt]
  );
}

async function revokeRefreshToken(pool, token) {
  const tokenHash = hashRefreshToken(token);
  const [result] = await pool.query(
    `DELETE FROM refresh_tokens
      WHERE refresh_token = ?`,
    [tokenHash]
  );
  return result.affectedRows;
}

async function rotateManagedRefreshToken(pool, userId, oldToken) {
  const oldTokenHash = hashRefreshToken(oldToken);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [tokenRows] = await connection.query(
      `SELECT id
         FROM refresh_tokens
        WHERE user_id = ?
          AND refresh_token = ?
          AND expires_at IS NOT NULL
          AND expires_at > NOW()
        LIMIT 1
          FOR UPDATE`,
      [userId, oldTokenHash]
    );
    if (!tokenRows.length) {
      await connection.rollback();
      return null;
    }

    const [customerRows] = await connection.query(
      `SELECT email, role FROM customers WHERE id = ? LIMIT 1`,
      [userId]
    );
    if (!customerRows.length) {
      await connection.rollback();
      return null;
    }

    const email = customerRows[0].email;
    const role = customerRows[0].role;

    const newAccess = signAccess({
      sub: userId,
      email,
      role
    });
    const newRefresh = signRefresh({ sub: userId });
    const newTokenHash = hashRefreshToken(newRefresh);
    const newExpiresAt = getRefreshTokenExpiresAt(newRefresh);

    const [upd] = await connection.query(
      `UPDATE refresh_tokens
          SET refresh_token = ?,
              created_at = NOW(),
              expires_at = ?
        WHERE id = ?
          AND user_id = ?
          AND refresh_token = ?`,
      [newTokenHash, newExpiresAt, tokenRows[0].id, userId, oldTokenHash]
    );
    if (upd.affectedRows !== 1) {
      throw new Error('REFRESH_ROTATION_UPDATE_FAILED');
    }

    await connection.commit();
    return {
      access: newAccess,
      refresh: newRefresh
    };
  } catch (err) {
    try {
      await connection.rollback();
    } catch {
      /* keep original error */
    }
    throw err;
  } finally {
    connection.release();
  }
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

    await persistRefreshToken(pool, user.id, refresh);

    res.cookie('access', access, cookieOptsAccess);
    res.cookie('refresh', refresh, cookieOptsRefresh);

    return res.status(200).json({
      ok: true,
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

    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      algorithms: ['HS256']
    });
    const userId = payload?.sub;
    if (userId == null) {
      return res.status(401).json({ message: 'Refresh invalide ou expiré.' });
    }

    const isManagedRefresh =
      typeof payload?.jti === 'string' && payload.jti.trim().length > 0;

    if (!isManagedRefresh) {
      return res
        .status(401)
        .json({ message: 'Refresh invalide ou expiré.' });
    }

    const pool = await getPool();
    const rotated = await rotateManagedRefreshToken(pool, userId, token);
    if (!rotated) {
      return res
        .status(401)
        .json({ message: 'Refresh invalide ou expiré.' });
    }
    return res
      .cookie('access', rotated.access, cookieOptsAccess)
      .cookie('refresh', rotated.refresh, cookieOptsRefresh)
      .status(200)
      .json({ ok: true });
  } catch (err) {
    console.error('[auth:refreshToken] error:', err?.message);
    return res.status(401).json({ message: 'Refresh invalide ou expiré.' });
  }
};

export async function logout(req, res) {
  try {
    const token = req.cookies?.refresh;
    if (token) {
      const pool = await getPool();
      await revokeRefreshToken(pool, token);
    }

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

    const firstNameField = pickStringField(raw, ['first_name', 'firstName']);
    const lastNameField = pickStringField(raw, ['last_name', 'lastName']);
    const fullNameField = pickStringField(raw, ['name']);
    if (
      firstNameField.invalid ||
      lastNameField.invalid ||
      fullNameField.invalid
    ) {
      return res.status(400).json({ message: 'Prénom ou nom invalide.' });
    }

    let f = (firstNameField.value ?? '').trim();
    let l = (lastNameField.value ?? '').trim();
    const fullName = (fullNameField.value ?? '').trim();
    if ((!f || !l) && fullName) {
      const parts = fullName.split(/\s+/);
      f = f || parts.shift() || '';
      l = l || parts.join(' ') || '';
    }

    const emailField = pickStringField(raw, ['email', 'userEmail', 'mail']);
    if (emailField.invalid) {
      return res.status(400).json({ message: 'Adresse courriel invalide.' });
    }

    const passwordField = pickStringField(raw, ['password', 'pass', 'pwd']);
    if (passwordField.invalid) {
      return res.status(400).json({
        message:
          'Le mot de passe doit contenir 8 à 16 caractères, une majuscule, un chiffre et un caractère spécial.'
      });
    }

    const passwordConfirmField = pickStringField(raw, [
      'passwordConfirm',
      'confirmPassword'
    ]);
    if (passwordConfirmField.invalid) {
      return res.status(400).json({
        message: 'La confirmation du mot de passe est requise.'
      });
    }

    if (!f || !l) {
      return res.status(400).json({ message: 'Prénom et nom sont requis.' });
    }
    if (f.length > 50 || l.length > 50) {
      return res.status(400).json({ message: 'Prénom ou nom invalide.' });
    }

    const email = (emailField.value ?? '').trim().toLowerCase();
    if (!email || email.length > 100 || !REGISTER_EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Adresse courriel invalide.' });
    }

    const password = passwordField.value;
    if (!password) {
      return res.status(400).json({ message: 'Mot de passe requis.' });
    }
    if (!REGISTER_PASSWORD_RE.test(password)) {
      return res.status(400).json({
        message:
          'Le mot de passe doit contenir 8 à 16 caractères, une majuscule, un chiffre et un caractère spécial.'
      });
    }

    const passwordConfirm = passwordConfirmField.value;
    if (!passwordConfirm) {
      return res.status(400).json({
        message: 'La confirmation du mot de passe est requise.'
      });
    }
    if (password !== passwordConfirm) {
      return res
        .status(422)
        .json({ message: 'Les mots de passe ne correspondent pas.' });
    }

    let is_subscribed = 0;
    if (raw.marketingConsent !== undefined) {
      if (typeof raw.marketingConsent !== 'boolean') {
        return res
          .status(400)
          .json({ message: 'Consentement marketing invalide.' });
      }
      is_subscribed = raw.marketingConsent ? 1 : 0;
    }

    const pool = await getPool();

    const password_hash = await bcrypt.hash(password, 10);

    const role = 'user';
    const publicRegisterResult = {
      ok: true,
      message: 'Inscription traitée. Vous pouvez maintenant vous connecter.'
    };
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO customers
          (first_name, last_name, email, password_hash, is_subscribed, role, created_at, updated_at, last_login)
         VALUES
          (?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)`,
        [f, l, email, password_hash, is_subscribed, role]
      );

      const userId = result.insertId;

      if (is_subscribed === 1) {
        await connection.query(
          `INSERT INTO consents
            (
              customer_id,
              subject_type,
              subject_id,
              email,
              purpose,
              basis,
              method,
              text_snapshot,
              locale,
              source,
              ip,
              user_agent,
              granted_at
            )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
          [
            userId,
            'user',
            userId,
            email,
            'marketing_email',
            'express',
            'checkbox',
            MARKETING_CONSENT_TEXT,
            'fr-CA',
            'register',
            req.ip || null,
            req.get('user-agent') || null
          ]
        );
      }

      await connection.commit();

      return res.status(200).json(publicRegisterResult);
    } catch (txErr) {
      try {
        await connection.rollback();
      } catch {
        /* keep original error */
      }
      if (txErr?.code === 'ER_DUP_ENTRY' || txErr?.errno === 1062) {
        return res.status(200).json(publicRegisterResult);
      }
      throw txErr;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('[auth:register] error:', err?.message);
    next(err);
  }
};

export { refreshToken as handleRefreshToken };
