// server/services/printfulService.js
import axios from 'axios';
import { getDb } from '../utils/db.js';
import { logError } from '../utils/logger.js';

axios.defaults.timeout = 10000; // 10s

// (existant)
export const getPrintfulVariantAvailability = async (printful_variant_id) => {
  try {
    const response = await axios.get(
      `https://api.printful.com/sync/variant/${printful_variant_id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
          'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID
        }
      }
    );
    return response.data?.result?.sync_variant?.availability_status || null;
  } catch (error) {
    const apiKey = process.env.PRINTFUL_API_KEY;
    console.error('Printful variant availability failed:', {
      printful_variant_id,
      hasApiKey: Boolean(apiKey),
      apiKeyLength: apiKey ? apiKey.length : 0,
      hasStoreId: Boolean(process.env.PRINTFUL_STORE_ID),
      storeId: process.env.PRINTFUL_STORE_ID ?? null,
      status: error.response?.status ?? null,
      data: error.response?.data ?? null,
      message: error.message
    });

    await logError('❌ Printful service error', 'printful', error);

    throw new Error('Erreur lors de la communication avec Printful');
  }
};

// 👇 nouveau: map du panier vers variantes Printful (réutilisable)
export const mapCartToPrintfulVariants = async (cart_items) => {
  if (!cart_items || cart_items.length === 0) return [];
  const variantIds = cart_items.map((item) => item.id);
  const [variants] = await getDb.query(
    `SELECT id, printful_variant_id
       FROM product_variants
      WHERE id IN (${variantIds.map(() => '?').join(',')})`,
    variantIds
  );
  return cart_items.map((item) => {
    const v = variants.find((row) => row.id === item.id);
    if (!v) throw new Error(`Aucune variante trouvée pour l'id ${item.id}`);
    return { variant_id: v.printful_variant_id, quantity: item.quantity };
  });
};

// 👇 nouveau: création de commande Printful (on centralise l’appel)
export const createPrintfulOrder = async ({
  recipient,
  items,
  confirm = false
}) => {
  const resp = await axios.post(
    'https://api.printful.com/orders',
    { recipient, items, confirm },
    { headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` } }
  );
  return resp.data.result; // ex: { id, status, ... }
};
