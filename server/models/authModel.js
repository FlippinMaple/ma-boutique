import { pool } from '../db.js';

export const findCustomerByEmail = async (email) => {
  const [rows] = await pool.query('SELECT id FROM customers WHERE email = ?', [
    email
  ]);
  return rows.length > 0 ? rows[0] : null;
};

export const insertCustomer = async ({
  first_name,
  last_name,
  email,
  password_hash,
  is_subscribed
}) => {
  const [result] = await pool.execute(
    `INSERT INTO customers (
      first_name,
      last_name,
      email,
      password_hash,
      is_subscribed,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [first_name, last_name, email, password_hash, !!is_subscribed]
  );
  return result.insertId;
};

export const getUserByEmail = async (email) => {
  const [rows] = await pool.query(
    'SELECT id, first_name, last_name, password_hash FROM customers WHERE email = ?',
    [email]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const saveRefreshToken = async (userId, refreshToken, expiresAt) => {
  await pool.execute(
    `REPLACE INTO refresh_tokens (user_id, refresh_token, expires_at)
     VALUES (?, ?, ?)`,
    [userId, refreshToken, expiresAt]
  );
};

export const deleteRefreshToken = async (refreshToken) => {
  await pool.execute(`DELETE FROM refresh_tokens WHERE refresh_token = ?`, [
    refreshToken
  ]);
};

export const getRefreshTokenRecord = async (refreshToken) => {
  const [rows] = await pool.query(
    `SELECT * FROM refresh_tokens WHERE refresh_token = ?`,
    [refreshToken]
  );
  return rows.length > 0 ? rows[0] : null;
};
