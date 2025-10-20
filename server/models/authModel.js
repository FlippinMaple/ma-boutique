// server/models/authModel.js

/**
 * Trouve un utilisateur par son adresse email.
 */
export async function findUserByEmail(email, req) {
  const db = req.app.locals.db;
  const [rows] = await db.execute(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] ?? null;
}

/**
 * Récupère un utilisateur (alias possible pour compatibilité avec du code existant).
 */
export async function getUserByEmail(email) {
  return findUserByEmail(email);
}

/**
 * Insère un nouveau client (customer).
 */
export async function insertCustomer({ name, email, passwordHash, req }) {
  const db = req.app.locals.db;
  const [res] = await db.execute(
    `INSERT INTO users (name, email, password_hash, created_at)
     VALUES (?, ?, ?, NOW())`,
    [name, email, passwordHash]
  );
  return res.insertId;
}

/**
 * Sauvegarde un refresh token pour un utilisateur.
 */
export async function saveRefreshToken({ userId, token, req }) {
  const db = req.app.locals.db;
  const [res] = await db.execute(
    `INSERT INTO refresh_tokens (user_id, token, created_at)
     VALUES (?, ?, NOW())`,
    [userId, token]
  );
  return res.insertId ?? 0;
}

/**
 * Supprime un refresh token (par token ou par userId).
 */
export async function deleteRefreshToken({ token, userId, req }) {
  const db = req.app.locals.db;

  if (token) {
    const [res] = await db.execute(
      'DELETE FROM refresh_tokens WHERE token = ?',
      [token]
    );
    return res.affectedRows ?? 0;
  }

  if (userId) {
    const [res] = await db.execute(
      'DELETE FROM refresh_tokens WHERE user_id = ?',
      [userId]
    );
    return res.affectedRows ?? 0;
  }

  return 0;
}

/**
 * Récupère le refresh token d’un utilisateur spécifique.
 */
export async function getRefreshTokenRecord({ token, req }) {
  const db = req.app.locals.db;
  const [rows] = await db.execute(
    'SELECT * FROM refresh_tokens WHERE token = ? LIMIT 1',
    [token]
  );
  return rows[0] ?? null;
}
