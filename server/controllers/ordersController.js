// server/controllers/ordersController.js
import axios from 'axios';
import { pool } from '../db.js';
import { logError } from '../utils/logger.js';

export function getProtected(req, res) {
  res.json({ message: 'Accès autorisé', user: req.user });
}

export function getUserInfo(req, res) {
  res.json({
    message: 'Informations utilisateur récupérées avec succès',
    user: { id: req.user.id, name: req.user.name, email: req.user.email }
  });
}

export async function createPrintfulOrderController(req, res) {
  try {
    const { customer_email, shipping, cart_items } = req.body;
    if (!cart_items?.length) {
      return res.status(400).json({ error: 'Panier vide.' });
    }

    const ids = cart_items.map((i) => i.id);
    const [rows] = await pool.query(
      `SELECT id, printful_variant_id
         FROM product_variants
        WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    const items = cart_items.map((i) => {
      const found = rows.find((r) => r.id === i.id);
      if (!found) throw new Error(`Aucune variante trouvée pour l'id ${i.id}`);
      return { variant_id: found.printful_variant_id, quantity: i.quantity };
    });

    const payload = {
      recipient: {
        name: shipping.name,
        address1: shipping.address1,
        city: shipping.city,
        state_code: shipping.state,
        country_code: shipping.country,
        zip: shipping.zip,
        email: customer_email
      },
      items
    };

    const r = await axios.post('https://api.printful.com/orders', payload, {
      headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` }
    });

    res.json({ success: true, printfulOrder: r.data.result });
  } catch (e) {
    await logError(
      `Erreur création commande Printful: ${
        e?.response?.data?.message || e?.message
      }`,
      'orders',
      e
    );
    res.status(500).json({ error: e?.response?.data || e?.message });
  }
}
