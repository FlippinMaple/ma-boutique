// server/services/authService.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  findUserByEmail,
  saveRefreshToken,
  deleteRefreshToken,
  getRefreshTokenRecord
} from '../models/authModel.js';

function ensureSecrets() {
  const ACCESS_SECRET =
    process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
  const REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET;
  if (!ACCESS_SECRET || !REFRESH_SECRET) {
    throw new Error('SERVER_MISCONFIGURED: JWT secrets manquants');
  }
  return { ACCESS_SECRET, REFRESH_SECRET };
}

export async function login(email, password) {
  const { ACCESS_SECRET, REFRESH_SECRET } = ensureSecrets();
  const normalizedEmail = (email || '').trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);
  if (!user) throw new Error('Identifiants invalides');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error('Identifiants invalides');

  const accessToken = jwt.sign(
    { id: user.id, email: normalizedEmail },
    ACCESS_SECRET,
    { expiresIn: '2h' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: normalizedEmail },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  await saveRefreshToken({ userId: user.id, token: refreshToken, expiresAt });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: normalizedEmail,
      first_name: user.first_name,
      last_name: user.last_name
    }
  };
}

export async function refreshAccessToken(refreshTokenRaw) {
  const { ACCESS_SECRET, REFRESH_SECRET } = ensureSecrets();
  if (!refreshTokenRaw) {
    const err = new Error('NO_REFRESH_TOKEN');
    err.status = 401;
    throw err;
  }

  let payload;
  try {
    payload = jwt.verify(refreshTokenRaw, REFRESH_SECRET);
  } catch {
    const err = new Error('INVALID_REFRESH_TOKEN');
    err.status = 401;
    throw err;
  }

  const record = await getRefreshTokenRecord(refreshTokenRaw);
  if (!record) {
    const err = new Error('REFRESH_TOKEN_NOT_FOUND');
    err.status = 401;
    throw err;
  }
  if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
    await deleteRefreshToken({ token: refreshTokenRaw });
    const err = new Error('REFRESH_TOKEN_EXPIRED');
    err.status = 401;
    throw err;
  }

  const newAccess = jwt.sign(
    { id: payload.id, email: payload.email },
    ACCESS_SECRET,
    { expiresIn: '2h' }
  );
  return { accessToken: newAccess };
}
