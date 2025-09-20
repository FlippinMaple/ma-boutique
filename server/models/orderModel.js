import { pool } from '../db.js';

/**
 * Insère une nouvelle commande complète dans la table orders
 * @param {object} orderData
 * @param {number} orderData.customer_id
 * @param {string} orderData.customer_email
 * @param {number|null} orderData.shipping_address_id
 * @param {number|null} orderData.billing_address_id
 * @param {string} [orderData.status] - (optionnel, défaut: 'pending')
 * @param {number} orderData.total
 * @param {number} orderData.shipping_cost
 * @param {string|null} [orderData.printful_order_id] - (optionnel, défaut: null)
 * @returns {Promise<number>} - ID de la commande insérée
 */
export const insertOrder = async ({
  customer_id,
  customer_email,
  shipping_address_id,
  billing_address_id = null,
  total,
  shipping_cost = 0
}) => {
  const [result] = await pool.query(
    `INSERT INTO orders
     (customer_id, customer_email, shipping_address_id, billing_address_id, total, shipping_cost)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      customer_id,
      customer_email,
      shipping_address_id,
      billing_address_id,
      total,
      shipping_cost
    ]
  );

  return result.insertId;
};

/**
 * Insère un item dans la table order_items
 * @param {number} order_id
 * @param {number} variant_id
 * @param {number} printful_variant_id
 * @param {number} quantity
 * @param {number} price
 * @param {object} meta - Ex: { color: 'Noir', size: 'M' }
 */
export const insertOrderItem = async (
  order_id,
  variant_id,
  printful_variant_id,
  quantity,
  price,
  meta = {}
) => {
  await pool.query(
    `INSERT INTO order_items
     (order_id, variant_id, printful_variant_id, quantity, price_at_purchase, meta)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      order_id,
      variant_id,
      printful_variant_id,
      quantity,
      price,
      JSON.stringify(meta)
    ]
  );
};
