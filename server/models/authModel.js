// server/models/authModel.js
import { getDb } from '../utils/db.js';

export async function findUserByEmail(email) {
  const db = await getDb();
  const [rows] = await db.execute(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] ?? null;
}

export async function saveRefreshToken({ userId, token, expiresAt = null }) {
  const db = await getDb();
  await db.execute(
    `INSERT INTO refresh_tokens (user_id, refresh_token, created_at, expires_at)
     VALUES (?, ?, NOW(), ?)`,
    [userId, token, expiresAt]
  );
}

export async function deleteRefreshToken({ token, userId }) {
  const db = await getDb();
  if (token) {
    await db.execute('DELETE FROM refresh_tokens WHERE refresh_token = ?', [
      token
    ]);
    return;
  }
  if (userId) {
    await db.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
  }
}

export async function getRefreshTokenRecord(token) {
  const db = await getDb();
  const [rows] = await db.execute(
    `SELECT id, user_id, refresh_token, created_at, expires_at
       FROM refresh_tokens
      WHERE refresh_token = ?
      LIMIT 1`,
    [token]
  );
  return rows[0] ?? null;
}
