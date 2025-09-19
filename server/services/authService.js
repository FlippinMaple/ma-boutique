import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  findCustomerByEmail,
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

  const existing = await findCustomerByEmail(email);
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

  const accessToken = jwt.sign(
    {
      id: user.id,
      email: normalizedEmail,
      first_name: user.first_name,
      last_name: user.last_name
    },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: normalizedEmail },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await saveRefreshToken(user.id, refreshToken, expiresAt);

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
};

export const logout = async (refreshToken) => {
  await deleteRefreshToken(refreshToken);
};

export const refreshToken = async (token) => {
  const record = await getRefreshTokenRecord(token);
  if (!record) throw new Error('Token non trouvé.');

  const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  const accessToken = jwt.sign(
    {
      id: payload.id,
      email: payload.email
    },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  return { accessToken };
};
