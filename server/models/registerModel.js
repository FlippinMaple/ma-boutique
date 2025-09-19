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
