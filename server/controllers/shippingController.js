// server/controllers/shippingController.js
import axios from 'axios';
import { pool } from '../db.js';
import { logWarn, logError } from '../utils/logger.js';

export async function getShippingRates(req, res) {
  const { recipient, items } = req.body;

  if (!recipient || !items?.length) {
    await logWarn(
      'Données incomplètes pour le calcul des tarifs de livraison',
      'shipping',
      {
        hasRecipient: !!recipient,
        itemsCount: items?.length || 0
      }
    );
    return res.status(400).json({ error: 'Données incomplètes.' });
  }

  try {
    const ids = items.map((i) => i.variant_id);
    const [variantRows] = await pool.query(
      `SELECT variant_id
         FROM product_variants
        WHERE variant_id IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    const printfulItems = items.map((i) => {
      const found = variantRows.find((v) => v.variant_id == i.variant_id);
      if (!found) throw new Error(`Variante introuvable: ${i.variant_id}`);
      return { variant_id: i.variant_id, quantity: i.quantity };
    });

    const r = await axios.post(
      'https://api.printful.com/shipping/rates',
      {
        recipient: {
          name: recipient.name,
          address1: recipient.address1,
          city: recipient.city,
          state_code: recipient.state,
          country_code: recipient.country,
          zip: recipient.zip,
          email: recipient.email || ''
        },
        items: printfulItems
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
          'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID
        }
      }
    );

    res.json(r.data.result);
  } catch (error) {
    await logError(
      `❌ Erreur récupération shipping rates: ${
        error?.response?.data?.message || error?.message
      }`,
      'shipping',
      error
    );
    res
      .status(500)
      .json({ error: 'Impossible d’obtenir les options de livraison.' });
  }
}
