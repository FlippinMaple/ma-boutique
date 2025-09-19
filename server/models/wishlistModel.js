import { pool } from '../db.js';

export const getWishlistByCustomerId = async (customerId) => {
  const [rows] = await pool.query(
    'SELECT * FROM wishlists WHERE customer_id = ?',
    [customerId]
  );
  return rows;
};

export const findWishlistItem = async (customer_id, product_id, variant_id) => {
  const [rows] = await pool.query(
    'SELECT * FROM wishlists WHERE customer_id = ? AND product_id = ? AND variant_id = ?',
    [customer_id, product_id, variant_id]
  );
  return rows;
};

export const deleteWishlistItem = async (
  customer_id,
  product_id,
  variant_id
) => {
  await pool.query(
    'DELETE FROM wishlists WHERE customer_id = ? AND product_id = ? AND variant_id = ?',
    [customer_id, product_id, variant_id]
  );
};

export const insertWishlistItem = async (
  customer_id,
  product_id,
  variant_id,
  printful_variant_id
) => {
  await pool.query(
    `INSERT INTO wishlists (customer_id, product_id, variant_id, printful_variant_id)
     VALUES (?, ?, ?, ?)`,
    [customer_id, product_id, variant_id, printful_variant_id]
  );
};
