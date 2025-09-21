// server/controllers/adminController.js
import { pool } from '../db.js';
import { logError } from '../utils/logger.js';

export async function adminDebug(req, res) {
  try {
    const [orders] = await pool.query(
      'SELECT * FROM orders ORDER BY id DESC LIMIT 10'
    );
    const [items] = await pool.query(
      'SELECT * FROM order_items ORDER BY id DESC LIMIT 10'
    );
    const [statuses] = await pool.query(
      'SELECT * FROM order_status_history ORDER BY id DESC LIMIT 10'
    );
    res.json({ orders, order_items: items, order_status_history: statuses });
  } catch (err) {
    await logError(
      `❌ Erreur récupération debug: ${err?.message || err}`,
      'admin',
      err
    );
    res.status(500).json({ error: 'Erreur debug.' });
  }
}
