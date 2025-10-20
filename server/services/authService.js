import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  findUserByEmail,
  insertCustomer,
  getUserByEmail,
  saveRefreshToken,
  deleteRefreshToken,
  getRefreshTokenRecord
} from '../models/authModel.js';

export const handleUserRegistration = async ({
  first_name,
  last_name,
  email,
  password,
  is_subscribed
}) => {
  if (!first_name || !last_name || !email || !password)
    throw new Error('Tous les champs sont requis.');

  const existing = await findUserByEmail(email);
  if (existing) throw new Error('Ce courriel est déjà utilisé.');

  const password_hash = await bcrypt.hash(password, 10);
  const id = await insertCustomer({
    first_name,
    last_name,
    email,
    password_hash,
    is_subscribed
  });

  return id;
};

export const login = async (email, password) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await getUserByEmail(normalizedEmail);
  if (!user) throw new Error('Identifiants invalides.');

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new Error('Identifiants invalides.');

  const ACCESS_SECRET = process.env.JWT_SECRET; // garde le même nommage que chez toi
  const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET; // idem
  if (!ACCESS_SECRET || !REFRESH_SECRET) {
    throw new Error('SERVER_MISCONFIGURED'); // secrets manquants
  }

  const accessToken = jwt.sign(
    {
      id: user.id,
      email: normalizedEmail,
      first_name: user.first_name,
      last_name: user.last_name
    },
    -process.env.JWT_SECRET,
    ACCESS_SECRET,
    { expiresIn: '2h' }
  );

  const refreshTokenValue = jwt.sign(
    { id: user.id, email: normalizedEmail },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  const expiresAt = new Date(Date.now(), 7 * 24 * 60 * 60 * 1000);
  await saveRefreshToken(user.id, refreshTokenValue, expiresAt);

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      id: user.id,
      email: normalizedEmail,
      first_name: user.first_name,
      last_name: user.last_name
    }
  };
};

export const logout = async (refreshToken) => {
  await deleteRefreshToken(refreshToken);
};

// ✅ Renommé pour éviter toute collision/ambiguité avec la variable refreshToken
export const refreshAccessToken = async (token) => {
  try {
    if (!token) return { ok: false, status: 401, code: 'NO_REFRESH_TOKEN' };

    const ACCESS_SECRET = process.env.JWT_SECRET;
    const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    if (!ACCESS_SECRET || !REFRESH_SECRET) {
      return { ok: false, status: 500, code: 'SERVER_MISCONFIGURED' };
    }

    const record = await getRefreshTokenRecord(token);
    if (!record) return { ok: false, status: 401, code: 'TOKEN_NOT_FOUND' };
    // Optionnel: vérifier record.expires_at ici

    let payload;
    try {
      payload = jwt.verify(token, REFRESH_SECRET);
    } catch {
      // éventuellement: await deleteRefreshToken(token);
      return { ok: false, status: 401, code: 'INVALID_REFRESH_TOKEN' };
    }

    const accessToken = jwt.sign(
      { id: payload.id, email: payload.email },
      ACCESS_SECRET,
      { expiresIn: '2h' }
    );

    return { ok: true, status: 200, accessToken };
  } catch {
    return { ok: false, status: 500, code: 'REFRESH_FAILED' };
  }
};
