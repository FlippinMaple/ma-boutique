// server/controllers/shippingController.js
import axios from 'axios';
import { pool } from '../db.js';
import { logWarn, logError } from '../utils/logger.js';

export async function getRates(req, res) {
  try {
    const { recipient, items } = req.body;
    if (!recipient || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Données incomplètes.' });
    }

    // Adresse complète requise pour CA/US
    const cc = (
      recipient.country ||
      recipient.country_code ||
      ''
    ).toUpperCase();
    if (cc === 'CA' || cc === 'US') {
      const missing = [];
      if (!recipient.address1) missing.push('address1');
      if (!recipient.city) missing.push('city');
      if (!recipient.state) missing.push('state');
      if (!recipient.zip) missing.push('zip');
      if (missing.length) {
        return res
          .status(400)
          .json({ error: `Adresse incomplète: ${missing.join(', ')}` });
      }
    }

    // Mapper vers le variant_id **court** attendu par l’API Printful
    const shortItems = [];
    for (const it of items) {
      const qty = Number(it.quantity || 1);
      if (!Number.isFinite(qty) || qty <= 0) continue;

      let shortId = null;

      // Déjà court ?
      if (Number.isFinite(Number(it.variant_id))) {
        shortId = Number(it.variant_id);
      }
      // Sinon: on reçoit le long printful_variant_id → lookup en base
      else if (Number.isFinite(Number(it.printful_variant_id))) {
        const [[row]] = await pool.query(
          'SELECT variant_id FROM product_variants WHERE printful_variant_id = ? LIMIT 1',
          [Number(it.printful_variant_id)]
        );
        if (row?.variant_id) shortId = Number(row.variant_id);
      }

      if (!shortId) {
        await logWarn(
          `Variante introuvable pour l’item ${JSON.stringify(it)}`,
          'shipping'
        );
        return res.status(400).json({
          error: `Variante introuvable pour l’item (${
            it.printful_variant_id ?? it.variant_id
          }).`
        });
      }

      shortItems.push({ variant_id: shortId, quantity: qty });
    }

    const payload = {
      recipient: {
        name: recipient.name || '',
        address1: recipient.address1 || '',
        city: recipient.city || '',
        state_code: recipient.state || recipient.state_code || '',
        country_code: recipient.country || recipient.country_code || '',
        zip: recipient.zip || '',
        email: recipient.email || ''
      },
      items: shortItems
    };

    const resp = await axios.post(
      'https://api.printful.com/shipping/rates',
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
          'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID
        }
      }
    );

    return res.json(resp.data.result ?? []);
  } catch (err) {
    await logError(
      `Erreur shipping rates: ${
        err.response?.data?.error?.message || err.response?.data || err.message
      }`,
      'shipping'
    );
    return res
      .status(500)
      .json({ error: 'Impossible d’obtenir les options de livraison.' });
  }
}
