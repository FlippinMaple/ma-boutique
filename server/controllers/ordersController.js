// server/controllers/ordersController.js
import axios from 'axios';
import { pool } from '../db.js';

// POST /api/printful-order
export async function createPrintfulOrder(req, res) {
  try {
    const { customer_email, shipping, cart_items } = req.body;

    if (!Array.isArray(cart_items) || cart_items.length === 0) {
      return res.status(400).json({ error: 'Panier vide.' });
    }
    if (!process.env.PRINTFUL_API_KEY) {
      return res.status(500).json({ error: 'PRINTFUL_API_KEY manquant.' });
    }

    // Récupère les printful_variant_id à partir des IDs locaux
    const localIds = cart_items.map((it) => it.id).filter(Boolean);
    if (localIds.length !== cart_items.length) {
      return res
        .status(400)
        .json({
          error: 'Tous les items doivent contenir un id (variant local).'
        });
    }

    const placeholders = localIds.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT id, printful_variant_id FROM product_variants WHERE id IN (${placeholders})`,
      localIds
    );

    const byId = new Map(
      rows.map((r) => [Number(r.id), Number(r.printful_variant_id)])
    );

    const printfulItems = cart_items.map((it) => {
      const pf = byId.get(Number(it.id));
      if (!pf) {
        throw new Error(`Variante inconnue côté local: id=${it.id}`);
      }
      return { variant_id: pf, quantity: Number(it.quantity || 1) };
    });

    const payload = {
      recipient: {
        name: shipping?.name,
        address1: shipping?.address1,
        city: shipping?.city,
        state_code: shipping?.state,
        country_code: shipping?.country,
        zip: shipping?.zip,
        email: customer_email
      },
      items: printfulItems
    };

    const headers = {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`
    };
    if (process.env.PRINTFUL_STORE_ID) {
      headers['X-PF-Store-Id'] = process.env.PRINTFUL_STORE_ID;
    }

    const { data } = await axios.post(
      'https://api.printful.com/orders',
      payload,
      { headers }
    );

    return res.json({ success: true, printfulOrder: data.result });
  } catch (error) {
    console.error(
      '❌ createPrintfulOrder:',
      error.response?.data || error.message
    );
    return res.status(500).json({
      error:
        error.response?.data ||
        error.message ||
        'Erreur lors de la création Printful.'
    });
  }
}

// GET /api/protected (via authProtect)
export function protectedExample(req, res) {
  return res.json({
    message: 'Accès autorisé',
    user: req.user
  });
}

// GET /api/user-info (via authProtect)
export function userInfo(req, res) {
  return res.json({
    message: 'Informations utilisateur récupérées avec succès',
    user: {
      id: req.user?.id,
      name: req.user?.name,
      email: req.user?.email
    }
  });
}
