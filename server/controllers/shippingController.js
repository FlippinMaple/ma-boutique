// server/controllers/shippingController.js
import axios from 'axios';
import { logError } from '../utils/logger.js';

const MAX_CART_LINES = 20;
const MAX_QUANTITY_PER_LINE = 20;
const MAX_SHIPPING_NAME_LENGTH = 100;
const MAX_SHIPPING_ADDRESS1_LENGTH = 200;
const MAX_SHIPPING_CITY_LENGTH = 100;
const MAX_SHIPPING_STATE_LENGTH = 2;
const MAX_SHIPPING_ZIP_LENGTH = 10;
const PRINTFUL_RATES_TIMEOUT_MS = 10000;

function parsePositiveSafeInteger(value) {
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value <= 0 || !Number.isSafeInteger(value)) {
      return null;
    }
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) return null;
    const n = Number(trimmed);
    if (!Number.isSafeInteger(n) || n <= 0) return null;
    return n;
  }
  return null;
}

function normalizeRequiredString(value, maxLength) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

function parseRecipient(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const name = normalizeRequiredString(raw.name, MAX_SHIPPING_NAME_LENGTH);
  const address1 = normalizeRequiredString(
    raw.address1,
    MAX_SHIPPING_ADDRESS1_LENGTH
  );
  const city = normalizeRequiredString(raw.city, MAX_SHIPPING_CITY_LENGTH);
  const zip = normalizeRequiredString(raw.zip, MAX_SHIPPING_ZIP_LENGTH);
  const stateRaw = raw.state ?? raw.state_code;
  const countryRaw = raw.country ?? raw.country_code;

  if (!name || !address1 || !city || !zip) return null;
  if (stateRaw == null || countryRaw == null) return null;

  const state = String(stateRaw).trim().toUpperCase();
  const country = String(countryRaw).trim().toUpperCase();

  if (state.length !== MAX_SHIPPING_STATE_LENGTH || !/^[A-Z]{2}$/.test(state)) {
    return null;
  }
  if (country !== 'CA' && country !== 'US') return null;

  return { name, address1, city, state, country, zip };
}

function parseItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return null;
  if (rawItems.length > MAX_CART_LINES) return null;

  const parsed = [];
  const seen = new Set();

  for (const it of rawItems) {
    if (!it || typeof it !== 'object' || Array.isArray(it)) return null;

    const printfulVariantId = parsePositiveSafeInteger(it.printful_variant_id);
    const quantity = parsePositiveSafeInteger(it.quantity);
    if (printfulVariantId == null || quantity == null) return null;
    if (quantity > MAX_QUANTITY_PER_LINE) return null;
    if (seen.has(printfulVariantId)) return null;

    seen.add(printfulVariantId);
    parsed.push({ printfulVariantId, quantity });
  }

  return parsed;
}

export async function getRates(req, res) {
  const db = req.app.locals.db;

  try {
    const recipient = parseRecipient(req.body?.recipient);
    if (!recipient) {
      return res.status(400).json({ error: 'Adresse de livraison invalide.' });
    }

    const parsedItems = parseItems(req.body?.items);
    if (!parsedItems) {
      return res.status(400).json({ error: 'Articles de livraison invalides.' });
    }

    const printfulIds = parsedItems.map((line) => line.printfulVariantId);
    const placeholders = printfulIds.map(() => '?').join(',');
    const [variantRows] = await db.query(
      `
      SELECT
        pv.printful_variant_id,
        pv.variant_id
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
      WHERE pv.printful_variant_id IN (${placeholders})
        AND pv.is_active = 1
        AND p.is_visible = 1
      `,
      printfulIds
    );

    const variantByPrintfulId = new Map();
    for (const row of variantRows) {
      const key = Number(row.printful_variant_id);
      if (variantByPrintfulId.has(key)) {
        return res.status(400).json({ error: 'Variante indisponible.' });
      }
      variantByPrintfulId.set(key, row);
    }

    const printfulItems = [];
    for (const line of parsedItems) {
      const row = variantByPrintfulId.get(line.printfulVariantId);
      if (!row || row.variant_id == null) {
        return res.status(400).json({ error: 'Variante indisponible.' });
      }
      printfulItems.push({
        variant_id: Number(row.variant_id),
        quantity: line.quantity
      });
    }

    const payload = {
      recipient: {
        name: recipient.name,
        address1: recipient.address1,
        city: recipient.city,
        state_code: recipient.state,
        country_code: recipient.country,
        zip: recipient.zip
      },
      items: printfulItems
    };

    const resp = await axios.post(
      'https://api.printful.com/shipping/rates',
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
          'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID
        },
        timeout: PRINTFUL_RATES_TIMEOUT_MS
      }
    );

    return res.json(resp.data.result ?? []);
  } catch (err) {
    await logError(
      `Erreur shipping rates: ${
        err.response?.data?.error?.message || err.message
      }`,
      'shipping'
    );
    return res
      .status(500)
      .json({ error: 'Impossible d’obtenir les options de livraison.' });
  }
}
